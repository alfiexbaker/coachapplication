import crypto from 'node:crypto';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ApiProblemError, badRequest, forbidden, notFound } from '../../lib/http-errors.js';
import {
  type InvoiceTransitionAction,
  completeSimulatedInvoicePayment,
  createInvoicePaymentSession,
  createInvoiceReminder,
  generateInvoiceForBooking,
  getBookingInvoiceContext,
  getHostedPaymentPageData,
  getInvoiceDetail,
  getInvoiceRow,
  listAccessibleInvoices,
  requestInvoiceRefund,
  transitionInvoiceStatus,
} from '../../lib/invoice-runtime.js';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { verifySimulatedPaymentToken } from '../../lib/payment-provider.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { assertCanReadAthleteHealth, isPrivilegedAdminAuth } from '../../lib/authz.js';
import { recordAuditEvent } from '../../lib/audit-runtime.js';
import { resolveTrustAccessRepository } from '../../repositories/p0/trust-access-repository.js';
import { resolveCommunityMediaRepository } from '../../repositories/p0/community-media-repository.js';
import { resolveVideoAuthorityRepository } from '../../repositories/p0/video-authority-repository.js';
import { normalizeForJson } from '../../repositories/p0/normalize.js';
import { completeUploadSession, createSignedReadUrl, createUploadInit } from '../../lib/storage-runtime.js';

type SeedRow = Record<string, unknown>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;
const coerceMetadata = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
const nowIso = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const INVOICE_STATUSES = ['DRAFT', 'SENT', 'PAID', 'VOID', 'WRITTEN_OFF'] as const;

type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

const invoiceListQuerySchema = z.object({
  status: z.string().trim().optional(),
  coachId: z.string().trim().optional(),
  bookingId: z.string().trim().optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
});

const invoiceTransitionRequestSchema = z.object({
  reason: z.string().trim().max(400).optional(),
});

const uploadInitRequestSchema = z.object({
  kind: z.enum(['VIDEO', 'IMAGE', 'DOCUMENT']).default('VIDEO'),
  contentType: z.string().min(3).max(120),
  fileName: z.string().min(1).max(260),
  sizeBytes: z.number().int().positive().max(2_000_000_000),
  metadata: z.record(z.unknown()).optional(),
});

const uploadCompleteParamsSchema = z.object({
  uploadSessionId: z.string().trim().min(1),
});

const uploadCompleteRequestSchema = z.object({
  mediaObjectId: z.string().trim().min(1),
  sha256Hex: z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{64}$/)
    .optional(),
});

const videoListQuerySchema = z
  .object({
    coachId: z.string().trim().min(1).optional(),
    athleteId: z.string().trim().min(1).optional(),
  })
  .refine((value) => Boolean(value.coachId) !== Boolean(value.athleteId), {
    message: 'Provide exactly one of coachId or athleteId',
  });

const videoCreateRequestSchema = z
  .object({
    mediaObjectId: z.string().trim().min(1),
    athleteIds: z.array(z.string().trim().min(1)).max(1).default([]),
    title: z.string().trim().max(120).optional(),
    description: z.string().trim().max(1000).optional(),
    sessionId: z.string().trim().min(1).optional(),
    bookingId: z.string().trim().min(1).optional(),
    durationSeconds: z
      .number()
      .int()
      .min(0)
      .max(60 * 60)
      .optional(),
  })
  .refine((value) => !(value.sessionId && value.bookingId), {
    message: 'Provide either sessionId or bookingId, not both',
  });

const videoUpdateRequestSchema = z.object({
  title: z.string().trim().max(120).optional(),
  description: z.string().trim().max(1000).optional(),
});

const videoVisibilityRequestSchema = z.object({
  visibility: z.enum(['PRIVATE', 'SHARED']),
  recipientUserIds: z.array(z.string().trim().min(1)).max(20).optional(),
});

const videoAnnotationRequestSchema = z.object({
  timestamp: z
    .number()
    .int()
    .min(0)
    .max(60 * 60),
  label: z.string().trim().min(1).max(120),
  note: z.string().trim().max(500).optional(),
  type: z.enum(['HIGHLIGHT', 'IMPROVEMENT', 'TECHNIQUE', 'GENERAL']),
});

const invoicePaymentRequestSchema = z.object({
  amountMinor: z.number().int().positive().optional(),
  method: z.enum(['bank_transfer', 'card']).default('bank_transfer'),
  idempotencyKey: z.string().trim().min(8).max(120),
  returnUrl: z.string().trim().url().optional(),
  cancelUrl: z.string().trim().url().optional(),
});

const invoiceRefundRequestSchema = z.object({
  reason: z.string().trim().min(1).max(400),
  verificationCode: z.string().trim().min(6).max(12),
  idempotencyKey: z.string().trim().min(8).max(120),
  amountMinor: z.number().int().positive().optional(),
});

const generateInvoiceRequestSchema = z.object({
  bookingId: z.string().trim().min(1),
  notes: z.string().trim().max(1000).optional(),
  dueDate: z.string().trim().datetime().optional(),
  taxRate: z.number().int().min(0).max(100).optional(),
});

const invoiceReminderRequestSchema = z.object({
  recipientEmail: z.string().trim().email().optional(),
  message: z.string().trim().max(2000).optional(),
});

const communityGroupParamsSchema = z.object({
  groupId: z.string().trim().min(1),
});

const notificationParamsSchema = z.object({
  notificationId: z.string().trim().min(1),
});

const notificationChannelSettingsSchema = z
  .object({
    push: z.boolean().optional(),
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
  })
  .strict();

const notificationQuietHoursSchema = z
  .object({
    enabled: z.boolean().optional(),
    startTime: z.string().trim().regex(/^\d{2}:\d{2}$/).optional(),
    endTime: z.string().trim().regex(/^\d{2}:\d{2}$/).optional(),
    timezone: z.string().trim().min(1).max(80).optional(),
  })
  .strict();

const notificationTypePreferenceSchema = z
  .object({
    enabled: z.boolean().optional(),
    channels: z.array(z.enum(['PUSH', 'EMAIL', 'SMS'])).max(3).optional(),
  })
  .strict();

const notificationPreferenceUpdateSchema = z
  .object({
    channels: notificationChannelSettingsSchema.optional(),
    quietHours: notificationQuietHoursSchema.optional(),
    typePreferences: z.record(notificationTypePreferenceSchema).optional(),
    mutedCoaches: z
      .array(
        z
          .object({
            coachId: z.string().trim().min(1),
            reason: z.string().trim().max(240).nullable().optional(),
          })
          .strict(),
      )
      .max(200)
      .optional(),
  })
  .strict();

const groupMessageCreateRequestSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
  attachments: z.array(z.unknown()).max(0, 'Message attachments require backend media proof before send').optional(),
});

const simulatedCompleteRequestSchema = z.object({
  token: z.string().trim().min(20),
});

function getActiveRows(rows: SeedRow[]): SeedRow[] {
  return rows.filter((row) => row.deletedAt == null);
}

function moneyFromMinor(value: unknown): number {
  return Math.round((Number(value ?? 0) / 100) * 100) / 100;
}

function formatSessionType(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  switch (value) {
    case 'one_to_one':
      return '1-on-1 Training';
    case 'group':
      return 'Group Session';
    default:
      return value
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
  }
}

function toInvoiceStatus(value: unknown): InvoiceStatus {
  const status = asString(value)?.toUpperCase();
  if (status && INVOICE_STATUSES.includes(status as InvoiceStatus)) {
    return status as InvoiceStatus;
  }
  return 'SENT';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderHostedPaymentPage(params: {
  invoiceNumber: string;
  amountMinor: number;
  currency: string;
  completeUrl: string;
  token: string;
  returnUrl?: string | null;
  cancelUrl?: string | null;
}): string {
  const formattedAmount = `£${(params.amountMinor / 100).toFixed(2)} ${params.currency}`;
  const safeReturnUrl = params.returnUrl ? escapeHtml(params.returnUrl) : '';
  const safeCancelUrl = params.cancelUrl ? escapeHtml(params.cancelUrl) : '';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Clubroom Payment</title>
    <style>
      :root { color-scheme: light; }
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5f1e8; color: #1a1f1d; }
      main { max-width: 420px; margin: 0 auto; min-height: 100vh; display: grid; place-items: center; padding: 24px; }
      section { width: 100%; background: #fffaf2; border: 1px solid #d9cfbb; border-radius: 24px; padding: 24px; box-shadow: 0 14px 40px rgba(26, 31, 29, 0.08); }
      h1 { margin: 0 0 8px; font-size: 28px; line-height: 1.1; }
      p { margin: 0; color: #5a645d; }
      dl { margin: 24px 0; display: grid; gap: 12px; }
      dt { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #6c766e; }
      dd { margin: 4px 0 0; font-size: 18px; font-weight: 600; color: #1a1f1d; }
      form { display: grid; gap: 12px; margin-top: 24px; }
      button, a { appearance: none; border: 0; border-radius: 14px; padding: 14px 16px; font-size: 16px; font-weight: 700; text-align: center; text-decoration: none; cursor: pointer; }
      button { background: #0a7f5a; color: white; }
      a.secondary { background: #ece4d2; color: #1a1f1d; }
      small { display: block; margin-top: 16px; color: #6c766e; line-height: 1.4; }
    </style>
  </head>
  <body>
    <main>
      <section>
        <p>Hosted payment session</p>
        <h1>${escapeHtml(params.invoiceNumber)}</h1>
        <dl>
          <div>
            <dt>Amount</dt>
            <dd>${escapeHtml(formattedAmount)}</dd>
          </div>
          <div>
            <dt>Mode</dt>
            <dd>Simulated secure checkout</dd>
          </div>
        </dl>
        <form id="payment-form">
          <button type="submit">Complete simulated payment</button>
          ${safeCancelUrl ? `<a class="secondary" href="${safeCancelUrl}">Cancel and return</a>` : ''}
        </form>
        <small>
          This is the temporary hosted payment boundary. The app never marks an invoice paid directly.
          In production, this page is replaced by the real provider checkout.
          ${safeReturnUrl ? ` After success you can return to <strong>${safeReturnUrl}</strong>.` : ''}
        </small>
      </section>
    </main>
    <script>
      const form = document.getElementById('payment-form');
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const response = await fetch(${JSON.stringify(params.completeUrl)}, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'accept': 'text/html' },
          body: JSON.stringify({ token: ${JSON.stringify(params.token)} }),
        });
        const html = await response.text();
        document.open();
        document.write(html);
        document.close();
      });
    </script>
  </body>
</html>`;
}

function findUserEmail(users: SeedRow[], userId: string | undefined): string | undefined {
  if (!userId) {
    return undefined;
  }
  const user = users.find((row) => asString(row.id) === userId);
  return asString(user?.email);
}

function mapInvoice(row: SeedRow, users: SeedRow[]) {
  const payerUserId = asString(row.payerUserId) ?? '';
  return {
    id: asString(row.id) ?? '',
    invoiceNumber: asString(row.invoiceNumber) ?? '',
    userId: payerUserId,
    bookingId: asString(row.bookingId) ?? '',
    coachId: asString(row.coachUserId) ?? '',
    athleteId: asString(row.athleteId),
    sessionDate: asString(row.sessionDate) ?? nowIso(),
    sessionType: formatSessionType(asString(row.sessionType)),
    sessionLocation: asString(row.sessionLocation),
    sessionDuration: asNumber(row.sessionDurationMinutes),
    amount: moneyFromMinor(row.subtotalMinor),
    tax: moneyFromMinor(row.taxMinor),
    taxRate: asNumber(row.taxRatePercent) ?? 0,
    total: moneyFromMinor(row.totalMinor),
    currency: asString(row.currency) ?? 'GBP',
    status: toInvoiceStatus(row.status),
    createdAt: asString(row.createdAt) ?? nowIso(),
    updatedAt: asString(row.updatedAt),
    sentAt: asString(row.sentAt),
    sentTo: findUserEmail(users, payerUserId),
    paidAt: asString(row.paidAt),
    voidedAt: asString(row.voidedAt) ?? undefined,
    voidReason: asString(row.voidReason) ?? undefined,
    dueDate: asString(row.dueDate),
    notes: asString(row.notes),
    coachBusinessName: asString(row.coachBusinessName),
    coachBusinessEmail: asString(row.coachBusinessEmail),
    billingAddress: asString(row.billingAddress),
  };
}

function canAccessInvoice(authUserId: string, isAdmin: boolean, invoice: SeedRow): boolean {
  return (
    isAdmin ||
    asString(invoice.coachUserId) === authUserId ||
    asString(invoice.payerUserId) === authUserId
  );
}

function normalizeVideoUploadStatus(
  value: unknown,
): 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED' {
  switch (String(value ?? '').toUpperCase()) {
    case 'PENDING_UPLOAD':
      return 'UPLOADING';
    case 'UPLOADED_UNSCANNED':
    case 'PENDING_SCAN':
      return 'PROCESSING';
    case 'REJECTED':
    case 'FAILED':
    case 'QUARANTINED':
      return 'FAILED';
    default:
      return 'READY';
  }
}

function normalizeVideoVisibility(value: unknown): 'PRIVATE' | 'SHARED' {
  return String(value ?? '').toUpperCase() === 'SHARED' ? 'SHARED' : 'PRIVATE';
}

function mapVideoAnnotation(row: SeedRow) {
  return {
    id: asString(row.id) ?? '',
    timestamp: Math.round((asNumber(row.timestampMs) ?? 0) / 1000),
    label: asString(row.text) ?? '',
    note: asString(row.note) ?? undefined,
    type: (asString(row.annotationType) ?? 'GENERAL') as
      | 'HIGHLIGHT'
      | 'IMPROVEMENT'
      | 'TECHNIQUE'
      | 'GENERAL',
    createdBy: asString(row.authorUserId) ?? undefined,
    createdAt: asString(row.createdAt) ?? undefined,
    updatedAt: asString(row.updatedAt) ?? undefined,
  };
}

function mapVideoRecord(bundle: {
  video: SeedRow;
  mediaObject: SeedRow;
  annotations: SeedRow[];
  shares: SeedRow[];
}) {
  const playback = createSignedReadUrl({
    bucketName: asString(bundle.mediaObject.bucketName),
    storageKey: asString(bundle.mediaObject.storageKey) ?? '',
  });

  return {
    id: asString(bundle.video.id) ?? '',
    coachUserId: asString(bundle.video.coachUserId) ?? undefined,
    athleteId: asString(bundle.video.athleteId) ?? undefined,
    title: asString(bundle.video.title) ?? '',
    description: asString(bundle.video.description) ?? undefined,
    visibility: normalizeVideoVisibility(bundle.video.visibility),
    sharedWithUserIds: bundle.shares
      .map((row) => asString(row.sharedWithUserId))
      .filter((userId): userId is string => Boolean(userId)),
    sourceContextType: asString(bundle.video.sourceContextType) ?? undefined,
    sourceContextId: asString(bundle.video.sourceContextId) ?? undefined,
    mediaObjectId: asString(bundle.video.mediaObjectId) ?? '',
    uploadStatus: normalizeVideoUploadStatus(bundle.mediaObject.status),
    playbackUrl: playback.url,
    playbackExpiresAt: playback.expiresAt,
    thumbnailUrl: playback.url,
    durationMs: asNumber(bundle.mediaObject.durationMs) ?? 0,
    fileSizeBytes: asNumber(bundle.mediaObject.sizeBytes) ?? 0,
    contentType: asString(bundle.mediaObject.contentType) ?? 'video/mp4',
    createdAt: asString(bundle.video.createdAt) ?? nowIso(),
    updatedAt: asString(bundle.video.updatedAt) ?? undefined,
    annotations: bundle.annotations.map(mapVideoAnnotation),
  };
}

async function getAthleteProgressPayload(athleteId: string) {
  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      const sessionNotes = asRows(store.tables.sessionNotes).filter(
        (row) => asString(row.athleteId) === athleteId && !asString(row.deletedAt),
      );
      const sessionFeedback = asRows(store.tables.sessionFeedback).filter(
        (row) => asString(row.athleteId) === athleteId && !asString(row.deletedAt),
      );
      const skillAssessments = asRows(store.tables.athleteSkillAssessments).filter(
        (row) => asString(row.athleteId) === athleteId,
      );
      const skillDefinitionIds = new Set(
        skillAssessments
          .map((row) => asString(row.skillDefinitionId))
          .filter((id): id is string => Boolean(id)),
      );
      const skillDefinitions = asRows(store.tables.skillDefinitions).filter((row) =>
        skillDefinitionIds.has(asString(row.id) ?? ''),
      );
      return {
        sessionNotes,
        sessionFeedback,
        skillAssessments,
        skillDefinitions,
        seedVersion: store.version,
      };
    }

    const prisma = getPrismaClientOrThrow();
    const [sessionNotes, sessionFeedback, skillAssessments] = await Promise.all([
      prisma.sessionNote.findMany({
        where: { athleteId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.sessionFeedback.findMany({
        where: { athleteId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.athleteSkillAssessment.findMany({
        where: { athleteId },
        orderBy: { assessedAt: 'desc' },
      }),
    ]);
    const skillDefinitionIds = [
      ...new Set(skillAssessments.map((assessment) => assessment.skillDefinitionId)),
    ];
    const skillDefinitions = skillDefinitionIds.length
      ? await prisma.skillDefinition.findMany({
          where: { id: { in: skillDefinitionIds } },
        })
      : [];

    return normalizeForJson({
      sessionNotes,
      sessionFeedback,
      skillAssessments,
      skillDefinitions,
      seedVersion: null,
    });
  }

  const store = getMarketplaceSeedStore();
  const sessionNotes = asRows(store.tables.sessionNotes).filter(
    (row) => asString(row.athleteId) === athleteId && !asString(row.deletedAt),
  );
  const sessionFeedback = asRows(store.tables.sessionFeedback).filter(
    (row) => asString(row.athleteId) === athleteId && !asString(row.deletedAt),
  );
  const skillAssessments = asRows(store.tables.athleteSkillAssessments).filter(
    (row) => asString(row.athleteId) === athleteId,
  );
  const skillDefinitionIds = new Set(
    skillAssessments
      .map((row) => asString(row.skillDefinitionId))
      .filter((id): id is string => Boolean(id)),
  );
  const skillDefinitions = asRows(store.tables.skillDefinitions).filter((row) =>
    skillDefinitionIds.has(asString(row.id) ?? ''),
  );

  return {
    sessionNotes,
    sessionFeedback,
    skillAssessments,
    skillDefinitions,
    seedVersion: store.version,
  };
}

async function handleInvoiceTransitionRoute(
  request: FastifyRequest,
  reply: FastifyReply,
  params: {
    action: InvoiceTransitionAction;
    auditAction: string;
    accessDeniedMessage: string;
  },
) {
  const authUserId = request.auth?.userId;
  if (!authUserId) {
    throw forbidden('Authenticated user is required');
  }

  const invoiceId = asString((request.params as { invoiceId?: string }).invoiceId);
  if (!invoiceId) {
    throw notFound('Invoice id is required');
  }

  const body = invoiceTransitionRequestSchema.parse(request.body ?? {});
  const invoice = await getInvoiceRow(invoiceId);
  if (!invoice) {
    throw notFound('Invoice not found', { invoiceId });
  }

  const isAdmin = isPrivilegedAdminAuth(request.auth);
  if (!isAdmin && asString(invoice.coachUserId) !== authUserId) {
    throw forbidden(params.accessDeniedMessage);
  }

  await transitionInvoiceStatus({
    invoiceId,
    actorUserId: authUserId,
    action: params.action,
    reason: body.reason,
    requestId: request.requestId,
  });
  const detail = await getInvoiceDetail(invoiceId);
  if (!detail) {
    throw notFound('Invoice not found', { invoiceId });
  }

  await recordAuditEvent({
    request,
    action: params.auditAction,
    resourceType: 'invoice',
    resourceId: invoiceId,
    subjectUserId: asString(detail.invoice.userId) ?? null,
    result: 'SUCCESS',
  });

  return reply.send({
    invoice: detail.invoice,
    events: detail.events,
    reconcilerEntry: detail.reconcilerEntry,
    requestId: request.requestId,
  });
}

const wave2PlusRoutes: FastifyPluginAsync = async (app) => {
  app.get('/invoices', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const query = invoiceListQuerySchema.parse(request.query ?? {});
    const isAdmin = isPrivilegedAdminAuth(request.auth);
    const invoices = await listAccessibleInvoices(authUserId, isAdmin, query);
    await recordAuditEvent({
      request,
      action: 'invoice.list',
      resourceType: 'invoice',
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        total: invoices.length,
        status: query.status ?? null,
      },
    });

    return reply.send({
      invoices,
      total: invoices.length,
      requestId: request.requestId,
    });
  });

  app.get('/invoices/:invoiceId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const invoiceId = asString((request.params as { invoiceId?: string }).invoiceId);
    if (!invoiceId) {
      throw notFound('Invoice id is required');
    }

    const detail = await getInvoiceDetail(invoiceId);
    if (!detail) {
      throw notFound('Invoice not found', { invoiceId });
    }
    const isAdmin = isPrivilegedAdminAuth(request.auth);
    const canAccess =
      isAdmin ||
      asString(detail.invoice.coachId) === authUserId ||
      asString(detail.invoice.userId) === authUserId;
    if (!canAccess) {
      throw forbidden('Not allowed to access this invoice');
    }

    await recordAuditEvent({
      request,
      action: 'invoice.read',
      resourceType: 'invoice',
      resourceId: invoiceId,
      subjectUserId: asString(detail.invoice.userId) ?? null,
      result: 'SUCCESS',
      sensitiveRead: true,
    });

    return reply.send({
      invoice: detail.invoice,
      lineItems: detail.lineItems,
      events: detail.events,
      reconcilerEntry: detail.reconcilerEntry,
      reminders: detail.reminders,
      paymentInstructionTemplates: detail.paymentInstructionTemplates,
      paymentAttempts: detail.paymentAttempts,
      requestId: request.requestId,
    });
  });

  app.post('/invoices/generate', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const body = generateInvoiceRequestSchema.parse(request.body ?? {});
    const booking = await getBookingInvoiceContext(body.bookingId);
    if (!booking) {
      throw notFound('Booking not found', { bookingId: body.bookingId });
    }
    const isAdmin = isPrivilegedAdminAuth(request.auth);
    if (!isAdmin && booking.coachUserId !== authUserId) {
      throw forbidden('Not allowed to generate an invoice for this booking');
    }

    const generated = await generateInvoiceForBooking({
      bookingId: body.bookingId,
      actorUserId: authUserId,
      notes: body.notes,
      dueDate: body.dueDate,
      taxRatePercent: body.taxRate,
    });
    const detail = await getInvoiceDetail(asString(generated.invoice.id) ?? '');
    if (!detail) {
      throw notFound('Generated invoice not found', { bookingId: body.bookingId });
    }

    await recordAuditEvent({
      request,
      action: 'invoice.generate',
      resourceType: 'invoice',
      resourceId: asString(generated.invoice.id) ?? null,
      subjectUserId: asString(detail.invoice.userId) ?? null,
      result: 'SUCCESS',
      metadata: {
        bookingId: body.bookingId,
        created: generated.created,
      },
    });

    reply.code(generated.created ? 201 : 200);
    return reply.send({
      invoice: detail.invoice,
      lineItems: detail.lineItems,
      events: detail.events,
      requestId: request.requestId,
    });
  });

  app.post('/invoices/:invoiceId/payments', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const invoiceId = asString((request.params as { invoiceId?: string }).invoiceId);
    if (!invoiceId) {
      throw notFound('Invoice id is required');
    }
    const invoice = await getInvoiceRow(invoiceId);
    if (!invoice) {
      throw notFound('Invoice not found', { invoiceId });
    }

    const isAdmin = isPrivilegedAdminAuth(request.auth);
    const canPay =
      isAdmin ||
      asString(invoice.payerUserId) === authUserId ||
      asString(invoice.userId) === authUserId;
    if (!canPay) {
      throw forbidden('Not allowed to pay this invoice');
    }
    const body = invoicePaymentRequestSchema.parse(request.body);

    const totalMinor = asNumber(invoice.totalMinor);
    if (!totalMinor || totalMinor <= 0) {
      throw badRequest('Invoice total is invalid for payment processing', { invoiceId });
    }
    const amountMinor = body.amountMinor ?? totalMinor;
    if (amountMinor !== totalMinor) {
      throw badRequest('Payment amount must match invoice total', {
        invoiceId,
        totalMinor,
        amountMinor,
      });
    }

    const paymentSession = await createInvoicePaymentSession({
      invoiceId,
      actorUserId: authUserId,
      idempotencyKey: body.idempotencyKey,
      returnUrl: body.returnUrl,
      cancelUrl: body.cancelUrl,
    });

    await recordAuditEvent({
      request,
      action: 'invoice.payment_session_create',
      resourceType: 'invoice',
      resourceId: invoiceId,
      subjectUserId: asString(invoice.payerUserId) ?? null,
      result: 'SUCCESS',
      metadata: {
        reused: paymentSession.reused,
        amountMinor,
        method: body.method,
        attemptId: asString(paymentSession.attempt.id) ?? null,
        provider: paymentSession.hostedSession.provider,
      },
    });

    reply.code(paymentSession.reused ? 200 : 201);
    return reply.send({
      invoiceId,
      invoiceStatus: asString(paymentSession.invoice.status) ?? 'SENT',
      paymentSession: {
        attemptId: asString(paymentSession.attempt.id) ?? '',
        provider: paymentSession.hostedSession.provider,
        status: paymentSession.hostedSession.status,
        amountMinor,
        currency: asString(paymentSession.invoice.currency) ?? 'GBP',
        expiresAt: paymentSession.hostedSession.expiresAt,
        nextAction: paymentSession.hostedSession.nextAction,
      },
      requestId: request.requestId,
    });
  });

  app.post('/invoices/:invoiceId/refunds', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const invoiceId = asString((request.params as { invoiceId?: string }).invoiceId);
    if (!invoiceId) {
      throw notFound('Invoice id is required');
    }
    const invoice = await getInvoiceRow(invoiceId);
    if (!invoice) {
      throw notFound('Invoice not found', { invoiceId });
    }

    const isAdmin = isPrivilegedAdminAuth(request.auth);
    if (!isAdmin && asString(invoice.coachUserId) !== authUserId) {
      throw forbidden('Not allowed to refund this invoice');
    }

    const body = invoiceRefundRequestSchema.parse(request.body ?? {});
    const refund = await requestInvoiceRefund({
      invoiceId,
      actorUserId: authUserId,
      reason: body.reason,
      verificationCode: body.verificationCode,
      idempotencyKey: body.idempotencyKey,
      amountMinor: body.amountMinor,
      requestId: request.requestId,
    });

    const detail = await getInvoiceDetail(invoiceId);
    if (!detail) {
      throw notFound('Invoice not found', { invoiceId });
    }

    await recordAuditEvent({
      request,
      action: 'invoice.refund_approve',
      resourceType: 'invoice',
      resourceId: invoiceId,
      subjectUserId: asString(detail.invoice.userId) ?? null,
      result: 'SUCCESS',
      metadata: {
        reused: refund.reused,
        amountMinor: body.amountMinor ?? asNumber(invoice.totalMinor) ?? null,
        refundId: asString(coerceMetadata(refund.refund.metadataJson).refundId) ?? null,
      },
    });

    reply.code(refund.reused ? 200 : 201);
    return reply.send({
      invoice: detail.invoice,
      refund: refund.refund,
      events: detail.events,
      reconcilerEntry: detail.reconcilerEntry,
      reused: refund.reused,
      requestId: request.requestId,
    });
  });

  app.post('/invoices/:invoiceId/reminders', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const invoiceId = asString((request.params as { invoiceId?: string }).invoiceId);
    if (!invoiceId) {
      throw notFound('Invoice id is required');
    }
    const body = invoiceReminderRequestSchema.parse(request.body ?? {});
    const invoice = await getInvoiceRow(invoiceId);
    if (!invoice) {
      throw notFound('Invoice not found', { invoiceId });
    }

    const isAdmin = isPrivilegedAdminAuth(request.auth);
    if (
      !isAdmin &&
      asString(invoice.coachUserId) !== authUserId &&
      asString(invoice.coachId) !== authUserId
    ) {
      throw forbidden('Not allowed to send reminders for this invoice');
    }

    const reminder = await createInvoiceReminder({
      invoiceId,
      actorUserId: authUserId,
      recipientEmail: body.recipientEmail,
      message: body.message,
    });

    await recordAuditEvent({
      request,
      action: 'invoice.reminder',
      resourceType: 'invoice',
      resourceId: invoiceId,
      subjectUserId:
        asString(reminder.invoice.payerUserId) ?? asString(reminder.invoice.userId) ?? null,
      result: 'SUCCESS',
      metadata: {
        sentAt: reminder.sentAt,
      },
    });

    const detail = await getInvoiceDetail(invoiceId);
    return reply.send({
      invoice: detail?.invoice ?? reminder.invoice,
      reminder: reminder.reminder,
      sentAt: reminder.sentAt,
      requestId: request.requestId,
    });
  });

  app.get('/payment-attempts/:attemptId/hosted', async (request, reply) => {
    const attemptId = asString((request.params as { attemptId?: string }).attemptId);
    const token =
      typeof (request.query as { token?: unknown } | undefined)?.token === 'string'
        ? (request.query as { token: string }).token
        : '';
    if (!attemptId || !token) {
      throw badRequest('Payment attempt token is required');
    }

    const page = await getHostedPaymentPageData(attemptId, token);
    const completeUrl = `/v1/payment-attempts/${attemptId}/simulated-complete`;
    reply.type('text/html; charset=utf-8');
    return reply.send(
      renderHostedPaymentPage({
        invoiceNumber: asString(page.invoice.invoiceNumber) ?? attemptId,
        amountMinor: asNumber(page.attempt.amountMinor) ?? 0,
        currency: asString(page.attempt.currency) ?? 'GBP',
        completeUrl,
        token: page.token,
        returnUrl: page.returnUrl,
        cancelUrl: page.cancelUrl,
      }),
    );
  });

  app.post('/payment-attempts/:attemptId/simulated-complete', async (request, reply) => {
    const attemptId = asString((request.params as { attemptId?: string }).attemptId);
    if (!attemptId) {
      throw badRequest('Payment attempt id is required');
    }

    const body = simulatedCompleteRequestSchema.parse(request.body ?? {});
    const completed = await completeSimulatedInvoicePayment({
      attemptId,
      token: body.token,
    });

    await recordAuditEvent({
      request,
      action: 'invoice.payment_confirm',
      resourceType: 'invoice',
      resourceId: asString(completed.invoice.id) ?? null,
      subjectUserId:
        asString(completed.invoice.payerUserId) ?? asString(completed.invoice.userId) ?? null,
      result: 'SUCCESS',
      metadata: {
        attemptId,
        alreadyCompleted: completed.alreadyCompleted,
      },
    });

    const acceptsHtml =
      typeof request.headers.accept === 'string' && request.headers.accept.includes('text/html');
    if (acceptsHtml) {
      const payload = verifySimulatedPaymentToken(body.token);
      const returnUrl = payload.returnUrl ? escapeHtml(payload.returnUrl) : '';
      reply.type('text/html; charset=utf-8');
      return reply.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Payment complete</title>
    <style>
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5f1e8; color: #1a1f1d; display: grid; place-items: center; min-height: 100vh; padding: 24px; }
      section { max-width: 420px; background: #fffaf2; border: 1px solid #d9cfbb; border-radius: 24px; padding: 24px; text-align: center; }
      a { display: inline-block; margin-top: 16px; padding: 14px 16px; border-radius: 14px; background: #0a7f5a; color: white; text-decoration: none; font-weight: 700; }
    </style>
  </head>
  <body>
    <section>
      <h1>Payment confirmed</h1>
      <p>The invoice is now marked as paid in Clubroom.</p>
      ${returnUrl ? `<a href="${returnUrl}">Return to Clubroom</a>` : ''}
    </section>
  </body>
</html>`);
    }

    return reply.send({
      invoiceId: asString(completed.invoice.id) ?? null,
      invoiceStatus: asString(completed.invoice.status) ?? 'PAID',
      attemptId,
      alreadyCompleted: completed.alreadyCompleted,
      requestId: request.requestId,
    });
  });

  app.post('/invoices/:invoiceId/mark-paid', async (request, reply) => {
    return handleInvoiceTransitionRoute(request, reply, {
      action: 'mark-paid',
      auditAction: 'invoice.mark_paid',
      accessDeniedMessage: 'Not allowed to reconcile this invoice',
    });
  });

  app.post('/invoices/:invoiceId/mark-unpaid', async (request, reply) => {
    return handleInvoiceTransitionRoute(request, reply, {
      action: 'mark-unpaid',
      auditAction: 'invoice.mark_unpaid',
      accessDeniedMessage: 'Not allowed to reconcile this invoice',
    });
  });

  app.post('/invoices/:invoiceId/write-off', async (request, reply) => {
    return handleInvoiceTransitionRoute(request, reply, {
      action: 'write-off',
      auditAction: 'invoice.write_off',
      accessDeniedMessage: 'Not allowed to reconcile this invoice',
    });
  });

  app.post('/invoices/:invoiceId/restore', async (request, reply) => {
    return handleInvoiceTransitionRoute(request, reply, {
      action: 'restore',
      auditAction: 'invoice.restore',
      accessDeniedMessage: 'Not allowed to reconcile this invoice',
    });
  });

  app.post('/invoices/:invoiceId/void', async (request, reply) => {
    return handleInvoiceTransitionRoute(request, reply, {
      action: 'void',
      auditAction: 'invoice.void',
      accessDeniedMessage: 'Not allowed to void this invoice',
    });
  });

  app.get('/athletes/:athleteId/progress', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    await assertCanReadAthleteHealth(request, athleteId);

    const progress = await getAthleteProgressPayload(athleteId);

    await recordAuditEvent({
      request,
      action: 'athlete_progress.read',
      resourceType: 'athlete_progress',
      resourceId: athleteId,
      result: 'SUCCESS',
      sensitiveRead: true,
    });

    return reply.send({
      athleteId,
      sessionNotes: progress.sessionNotes,
      sessionFeedback: progress.sessionFeedback,
      skillAssessments: progress.skillAssessments,
      skillDefinitions: progress.skillDefinitions,
      seedVersion: progress.seedVersion,
      requestId: request.requestId,
    });
  });

  app.get('/athletes/:athleteId/goals', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    await assertCanReadAthleteHealth(request, athleteId);

    const store = getMarketplaceSeedStore();
    const goals = asRows(store.tables.goals).filter((row) => asString(row.athleteId) === athleteId);
    const milestones = asRows(store.tables.goalMilestones).filter((row) =>
      goals.some((goal) => asString(goal.id) === asString(row.goalId)),
    );

    await recordAuditEvent({
      request,
      action: 'athlete_goals.read',
      resourceType: 'goal',
      resourceId: athleteId,
      result: 'SUCCESS',
      sensitiveRead: true,
    });

    return reply.send({
      athleteId,
      goals,
      milestones,
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.get('/athletes/:athleteId/badges', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    await assertCanReadAthleteHealth(request, athleteId);

    const store = getMarketplaceSeedStore();
    const athleteBadges = asRows(store.tables.athleteBadges).filter(
      (row) => asString(row.athleteId) === athleteId,
    );
    const badgeDefinitionIds = new Set(
      athleteBadges
        .map((row) => asString(row.badgeDefinitionId))
        .filter((id): id is string => Boolean(id)),
    );
    const badgeDefinitions = asRows(store.tables.badgeDefinitions).filter((row) =>
      badgeDefinitionIds.has(asString(row.id) ?? ''),
    );

    await recordAuditEvent({
      request,
      action: 'athlete_badges.read',
      resourceType: 'badge',
      resourceId: athleteId,
      result: 'SUCCESS',
      sensitiveRead: true,
    });

    return reply.send({
      athleteId,
      badges: athleteBadges,
      badgeDefinitions,
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.get('/drills', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const store = getMarketplaceSeedStore();
    const drills = asRows(store.tables.drills);
    const assignments = asRows(store.tables.drillAssignments);
    const submissions = asRows(store.tables.assignmentSubmissions);
    const coachUserId = asString(
      (request.query as { coachUserId?: string } | undefined)?.coachUserId,
    );
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    if (!coachUserId && !isPrivilegedAdmin) {
      throw forbidden('coachUserId is required for non-admin drill reads');
    }
    if (coachUserId && coachUserId !== authUserId && !isPrivilegedAdmin) {
      throw forbidden('coachUserId must match authenticated user');
    }

    const filtered = coachUserId
      ? drills.filter((row) => asString(row.authorUserId) === coachUserId)
      : drills;

    const enriched = filtered.map((drill) => {
      const drillId = asString(drill.id);
      const drillAssignments = assignments.filter((row) => asString(row.drillId) === drillId);
      return {
        ...drill,
        assignments: drillAssignments,
        submissions: submissions.filter((row) =>
          drillAssignments.some(
            (assignment) => asString(assignment.id) === asString(row.drillAssignmentId),
          ),
        ),
      };
    });

    return reply.send({
      drills: enriched,
      total: enriched.length,
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.post('/uploads/init', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const body = uploadInitRequestSchema.parse(request.body);

    if (getApiDataBackend() === 'db') {
      const initialized = await createUploadInit({
        requesterUserId: authUserId,
        kind: body.kind,
        contentType: body.contentType,
        fileName: body.fileName,
        sizeBytes: body.sizeBytes,
        metadata: body.metadata,
      });
      await recordAuditEvent({
        request,
        action: 'upload.init',
        resourceType: 'media_object',
        resourceId: initialized.mediaObjectId,
        result: 'SUCCESS',
        metadata: {
          uploadSessionId: initialized.uploadSessionId,
          kind: body.kind,
          contentType: body.contentType,
          sizeBytes: body.sizeBytes,
        },
      });
      return reply.status(201).send({
        ...initialized,
        requestId: request.requestId,
      });
    }

    const store = getMarketplaceSeedStore();
    const uploadSessions = asRows(store.tables.uploadSessions);
    const malwareScanResults = asRows(store.tables.malwareScanResults);
    const mediaObjects = asRows(store.tables.mediaObjects);
    const now = nowIso();
    const uploadSessionId = newId('ups');
    const mediaObjectId = newId('med');

    const uploadSessionRow: SeedRow = {
      id: uploadSessionId,
      ownerUserId: authUserId,
      mediaObjectId,
      kind: body.kind,
      contentType: body.contentType,
      fileName: body.fileName,
      sizeBytes: body.sizeBytes,
      status: 'INITIATED',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      metadataJson: body.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };
    uploadSessions.push(uploadSessionRow);

    mediaObjects.push({
      id: mediaObjectId,
      ownerUserId: authUserId,
      kind: body.kind,
      status: 'PENDING_UPLOAD',
      storageKey: `uploads/${authUserId}/${uploadSessionId}/${body.fileName}`,
      bucketName: 'clubroom-private',
      contentType: body.contentType,
      sizeBytes: body.sizeBytes,
      sha256Hex: null,
      originalFileName: body.fileName,
      widthPx: null,
      heightPx: null,
      durationMs: null,
      visibilityScope: 'private',
      consentRequired: false,
      metadataJson: body.metadata ?? {},
      createdByUserId: authUserId,
      updatedByUserId: authUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    });

    malwareScanResults.push({
      id: newId('msr'),
      uploadSessionId,
      mediaObjectId,
      verdict: 'PENDING',
      status: 'PENDING',
      scanner: 'seed-runtime',
      engine: 'seed-runtime',
      scannedAt: null,
      detailsJson: {},
      signatureVersion: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
    });

    await recordAuditEvent({
      request,
      action: 'upload.init',
      resourceType: 'media_object',
      resourceId: mediaObjectId,
      result: 'SUCCESS',
      metadata: {
        uploadSessionId,
        kind: body.kind,
        contentType: body.contentType,
        sizeBytes: body.sizeBytes,
      },
    });

    return reply.status(201).send({
      uploadSessionId,
      mediaObjectId,
      uploadUrl: `https://uploads.clubroom.local/${uploadSessionId}`,
      expiresAt: asString(uploadSessionRow.expiresAt),
      requestId: request.requestId,
      seedVersion: store.version,
    });
  });

  app.post('/uploads/:uploadSessionId/complete', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const params = uploadCompleteParamsSchema.parse(request.params ?? {});
    const body = uploadCompleteRequestSchema.parse(request.body ?? {});

    try {
      const completed = await completeUploadSession({
        requesterUserId: authUserId,
        uploadSessionId: params.uploadSessionId,
        mediaObjectId: body.mediaObjectId,
        sha256Hex: body.sha256Hex,
      });

      await recordAuditEvent({
        request,
        action: 'upload.complete',
        resourceType: 'media_object',
        resourceId: completed.mediaObjectId,
        result: 'SUCCESS',
        metadata: {
          uploadSessionId: completed.uploadSessionId,
          scanVerdict: completed.scanVerdict,
          scanner: completed.scanner,
        },
      });

      return reply.send({
        uploadSessionId: completed.uploadSessionId,
        mediaObjectId: completed.mediaObjectId,
        mediaStatus: completed.mediaStatus,
        scanVerdict: completed.scanVerdict,
        scanner: completed.scanner,
        scannedAt: completed.scannedAt,
        seedVersion: completed.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'upload.complete',
        resourceType: 'media_object',
        resourceId: body.mediaObjectId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          uploadSessionId: params.uploadSessionId,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.get('/videos', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const query = videoListQuerySchema.parse(request.query ?? {});
    const result = await resolveVideoAuthorityRepository().listVideos({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      coachId: query.coachId,
      athleteId: query.athleteId,
    });

    if (query.athleteId) {
      await recordAuditEvent({
        request,
        action: 'video.list',
        resourceType: 'video',
        resourceId: query.athleteId,
        result: 'SUCCESS',
        sensitiveRead: true,
      });
    }

    return reply.send({
      videos: result.items.map(mapVideoRecord),
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.post('/videos', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const body = videoCreateRequestSchema.parse(request.body);
    try {
      const result = await resolveVideoAuthorityRepository().createVideo({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        mediaObjectId: body.mediaObjectId,
        athleteId: body.athleteIds[0],
        title: body.title,
        description: body.description,
        sourceContextType: body.bookingId ? 'booking' : body.sessionId ? 'session' : undefined,
        sourceContextId: body.bookingId ?? body.sessionId,
        durationMs:
          typeof body.durationSeconds === 'number' ? body.durationSeconds * 1000 : undefined,
      });

      await recordAuditEvent({
        request,
        action: 'video.create',
        resourceType: 'video',
        resourceId: asString(result.video.id) ?? undefined,
        result: 'SUCCESS',
        metadata: {
          mediaObjectId: body.mediaObjectId,
          athleteId: body.athleteIds[0] ?? null,
        },
      });

      return reply.status(201).send({
        video: mapVideoRecord(result),
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'video.create',
        resourceType: 'media_object',
        resourceId: body.mediaObjectId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          athleteId: body.athleteIds[0] ?? null,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.get('/videos/:videoId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const videoId = asString((request.params as { videoId?: string }).videoId);
    if (!videoId) {
      throw notFound('Video id is required');
    }

    const result = await resolveVideoAuthorityRepository().getVideoDetail({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      videoId,
    });

    await recordAuditEvent({
      request,
      action: 'video.read',
      resourceType: 'video',
      resourceId: videoId,
      result: 'SUCCESS',
      sensitiveRead: true,
    });

    return reply.send({
      video: mapVideoRecord(result),
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.patch('/videos/:videoId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const videoId = asString((request.params as { videoId?: string }).videoId);
    if (!videoId) {
      throw notFound('Video id is required');
    }

    const body = videoUpdateRequestSchema.parse(request.body ?? {});
    const result = await resolveVideoAuthorityRepository().updateVideo({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      videoId,
      title: body.title,
      description: body.description,
    });

    await recordAuditEvent({
      request,
      action: 'video.update',
      resourceType: 'video',
      resourceId: videoId,
      result: 'SUCCESS',
    });

    return reply.send({
      video: mapVideoRecord(result),
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.patch('/videos/:videoId/share', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const videoId = asString((request.params as { videoId?: string }).videoId);
    if (!videoId) {
      throw notFound('Video id is required');
    }

    const body = videoVisibilityRequestSchema.parse(request.body ?? {});
    const result = await resolveVideoAuthorityRepository().setVideoVisibility({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      videoId,
      visibility: body.visibility,
      recipientUserIds: body.recipientUserIds,
    });

    await recordAuditEvent({
      request,
      action: 'video.visibility.update',
      resourceType: 'video',
      resourceId: videoId,
      result: 'SUCCESS',
      metadata: {
        visibility: body.visibility,
        sharedWithUserIds: mapVideoRecord(result).sharedWithUserIds,
      },
    });

    return reply.send({
      video: mapVideoRecord(result),
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.post('/videos/:videoId/annotations', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const videoId = asString((request.params as { videoId?: string }).videoId);
    if (!videoId) {
      throw notFound('Video id is required');
    }

    const body = videoAnnotationRequestSchema.parse(request.body ?? {});
    const result = await resolveVideoAuthorityRepository().addVideoAnnotation({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      videoId,
      timestampMs: body.timestamp * 1000,
      label: body.label,
      note: body.note,
      annotationType: body.type,
    });

    await recordAuditEvent({
      request,
      action: 'video.annotation.create',
      resourceType: 'video_annotation',
      resourceId: asString(result.annotation.id) ?? undefined,
      result: 'SUCCESS',
      metadata: { videoId },
    });

    return reply.status(201).send({
      annotation: mapVideoAnnotation(result.annotation),
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.patch('/videos/:videoId/annotations/:annotationId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const params = request.params as { videoId?: string; annotationId?: string };
    const videoId = asString(params.videoId);
    const annotationId = asString(params.annotationId);
    if (!videoId || !annotationId) {
      throw notFound('Video annotation id is required');
    }

    const body = videoAnnotationRequestSchema.parse(request.body ?? {});
    const result = await resolveVideoAuthorityRepository().updateVideoAnnotation({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      videoId,
      annotationId,
      timestampMs: body.timestamp * 1000,
      label: body.label,
      note: body.note,
      annotationType: body.type,
    });

    await recordAuditEvent({
      request,
      action: 'video.annotation.update',
      resourceType: 'video_annotation',
      resourceId: annotationId,
      result: 'SUCCESS',
      metadata: { videoId },
    });

    return reply.send({
      annotation: mapVideoAnnotation(result.annotation),
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.delete('/videos/:videoId/annotations/:annotationId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const params = request.params as { videoId?: string; annotationId?: string };
    const videoId = asString(params.videoId);
    const annotationId = asString(params.annotationId);
    if (!videoId || !annotationId) {
      throw notFound('Video annotation id is required');
    }

    await resolveVideoAuthorityRepository().deleteVideoAnnotation({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      videoId,
      annotationId,
    });

    await recordAuditEvent({
      request,
      action: 'video.annotation.delete',
      resourceType: 'video_annotation',
      resourceId: annotationId,
      result: 'SUCCESS',
      metadata: { videoId },
    });

    return reply.status(204).send();
  });

  app.delete('/videos/:videoId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const videoId = asString((request.params as { videoId?: string }).videoId);
    if (!videoId) {
      throw notFound('Video id is required');
    }

    await resolveVideoAuthorityRepository().deleteVideo({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      videoId,
    });

    await recordAuditEvent({
      request,
      action: 'video.delete',
      resourceType: 'video',
      resourceId: videoId,
      result: 'SUCCESS',
    });

    return reply.status(204).send();
  });

  app.get('/community-groups', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const result = await resolveCommunityMediaRepository().listCommunityGroups({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
    });

    return reply.send({
      groups: result.groups,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.get('/posts', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const groupId = asString(
      (request.query as { communityGroupId?: string } | undefined)?.communityGroupId,
    );
    const result = await resolveCommunityMediaRepository().listPosts({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      communityGroupId: groupId,
    });

    return reply.send({
      posts: result.posts,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.post('/community-groups/:groupId/messages', async (request, reply) => {
    const authUserId = request.auth?.userId;
    const params = communityGroupParamsSchema.parse(request.params ?? {});
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const body = groupMessageCreateRequestSchema.parse(request.body ?? {});

    try {
      const result = await resolveCommunityMediaRepository().createGroupMessage({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        communityGroupId: params.groupId,
        body: body.body,
        idempotencyKey: body.idempotencyKey,
      });

      await recordAuditEvent({
        request,
        action: 'community.message.create',
        resourceType: 'message',
        resourceId: asString(result.message.id),
        result: 'SUCCESS',
        metadata: {
          communityGroupId: params.groupId,
          messageThreadId: asString(result.message.messageThreadId),
          idempotencyKey: body.idempotencyKey,
        },
      });

      return reply.status(201).send({
        message: result.message,
        thread: result.thread,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.message.create',
        resourceType: 'community_group',
        resourceId: params.groupId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          idempotencyKey: body.idempotencyKey,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.post('/community-groups/:groupId/messages/read', async (request, reply) => {
    const authUserId = request.auth?.userId;
    const params = communityGroupParamsSchema.parse(request.params ?? {});
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    try {
      const result = await resolveCommunityMediaRepository().markGroupMessagesRead({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        communityGroupId: params.groupId,
      });

      await recordAuditEvent({
        request,
        action: 'community.message.read',
        resourceType: 'community_group',
        resourceId: params.groupId,
        result: 'SUCCESS',
      });

      return reply.send({
        thread: result.thread,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'community.message.read',
        resourceType: 'community_group',
        resourceId: params.groupId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.get('/message-threads', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const result = await resolveCommunityMediaRepository().listMessageThreads({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
    });

    return reply.send({
      threads: result.threads,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.get('/me/notifications', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const result = await resolveCommunityMediaRepository().listNotifications({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
    });

    return reply.send({
      notifications: result.notifications,
      preferences: result.preferences,
      mutedSources: result.mutedSources,
      quietHours: result.quietHours,
      unreadCount: result.unreadCount,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.patch('/me/notifications/preferences', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }
    const body = notificationPreferenceUpdateSchema.parse(request.body ?? {});

    try {
      const result = await resolveCommunityMediaRepository().updateNotificationPreferences({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        channels: body.channels,
        quietHours: body.quietHours,
        typePreferences: body.typePreferences,
        mutedCoaches: body.mutedCoaches,
      });

      await recordAuditEvent({
        request,
        action: 'notification.preferences.update',
        resourceType: 'notification_preference',
        resourceId: authUserId,
        result: 'SUCCESS',
        metadata: {
          channels: body.channels ? Object.keys(body.channels) : [],
          quietHours: Boolean(body.quietHours),
          typePreferenceCount: body.typePreferences ? Object.keys(body.typePreferences).length : 0,
          mutedCoachCount: body.mutedCoaches?.length ?? 0,
        },
      });

      return reply.send({
        preferences: result.preferences,
        mutedSources: result.mutedSources,
        quietHours: result.quietHours,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'notification.preferences.update',
        resourceType: 'notification_preference',
        resourceId: authUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.post('/me/notifications/read-all', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const result = await resolveCommunityMediaRepository().markAllNotificationsRead({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
    });

    await recordAuditEvent({
      request,
      action: 'notification.read_all',
      resourceType: 'notification',
      result: 'SUCCESS',
      metadata: {
        count: result.notifications.length,
      },
    });

    return reply.send({
      notifications: result.notifications,
      unreadCount: result.unreadCount,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.post('/me/notifications/dismiss-all', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const result = await resolveCommunityMediaRepository().dismissAllNotifications({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
    });

    await recordAuditEvent({
      request,
      action: 'notification.dismiss_all',
      resourceType: 'notification',
      result: 'SUCCESS',
      metadata: {
        count: result.notifications.length,
      },
    });

    return reply.send({
      notifications: result.notifications,
      unreadCount: result.unreadCount,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.post('/me/notifications/:notificationId/read', async (request, reply) => {
    const authUserId = request.auth?.userId;
    const params = notificationParamsSchema.parse(request.params ?? {});
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    try {
      const result = await resolveCommunityMediaRepository().markNotificationRead({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        notificationId: params.notificationId,
      });

      await recordAuditEvent({
        request,
        action: 'notification.read',
        resourceType: 'notification',
        resourceId: params.notificationId,
        result: 'SUCCESS',
      });

      return reply.send({
        notification: result.notification,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'notification.read',
        resourceType: 'notification',
        resourceId: params.notificationId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.post('/me/notifications/:notificationId/dismiss', async (request, reply) => {
    const authUserId = request.auth?.userId;
    const params = notificationParamsSchema.parse(request.params ?? {});
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    try {
      const result = await resolveCommunityMediaRepository().dismissNotification({
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        notificationId: params.notificationId,
      });

      await recordAuditEvent({
        request,
        action: 'notification.dismiss',
        resourceType: 'notification',
        resourceId: params.notificationId,
        result: 'SUCCESS',
      });

      return reply.send({
        notification: result.notification,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'notification.dismiss',
        resourceType: 'notification',
        resourceId: params.notificationId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.get('/access-grants', async (request, reply) => {
    const isAdmin = isPrivilegedAdminAuth(request.auth);
    if (!isAdmin) {
      throw forbidden('Admin role required');
    }

    const overview = await resolveTrustAccessRepository().getTrustAdminOverview();
    await recordAuditEvent({
      request,
      action: 'access_grants.read',
      resourceType: 'access_grant',
      result: 'SUCCESS',
      sensitiveRead: true,
      metadata: {
        grantCount: overview.grants.length,
      },
    });

    return reply.send({
      grants: overview.grants,
      auditEvents: overview.auditEvents,
      securityEvents: overview.securityEvents,
      retentionPolicies: overview.retentionPolicies,
      legalHolds: overview.legalHolds,
      seedVersion: overview.dataVersion,
      requestId: request.requestId,
    });
  });

  app.get('/admin/retention-runs', async (request, reply) => {
    const isAdmin = isPrivilegedAdminAuth(request.auth);
    if (!isAdmin) {
      throw forbidden('Admin role required');
    }

    const store = getMarketplaceSeedStore();
    await recordAuditEvent({
      request,
      action: 'retention_runs.read',
      resourceType: 'retention_run',
      result: 'SUCCESS',
      sensitiveRead: true,
    });
    return reply.send({
      runs: asRows(store.tables.retentionRuns),
      requestId: request.requestId,
      seedVersion: store.version,
    });
  });

  app.get('/me/data-deletion-requests', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const store = getMarketplaceSeedStore();
    const requests = asRows(store.tables.dataDeletionRequests).filter(
      (row) => asString(row.requesterUserId) === authUserId,
    );
    return reply.send({
      requests,
      total: requests.length,
      requestId: request.requestId,
      seedVersion: store.version,
    });
  });
};

export default wave2PlusRoutes;
