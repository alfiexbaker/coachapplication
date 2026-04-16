import crypto from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { badRequest, forbidden, notFound } from '../../lib/http-errors.js';
import {
  completeSimulatedInvoicePayment,
  createInvoicePaymentSession,
  createInvoiceReminder,
  generateInvoiceForBooking,
  getBookingInvoiceContext,
  getHostedPaymentPageData,
  getInvoiceDetail,
  getInvoiceRow,
  listAccessibleInvoices,
} from '../../lib/invoice-runtime.js';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { verifySimulatedPaymentToken } from '../../lib/payment-provider.js';
import { assertCanReadAthleteHealth, isPrivilegedAdminAuth } from '../../lib/authz.js';
import { recordAuditEvent } from '../../lib/audit-runtime.js';
import { resolveTrustAccessRepository } from '../../repositories/p0/trust-access-repository.js';
import { createUploadInit } from '../../lib/storage-runtime.js';

type SeedRow = Record<string, unknown>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const asNumber = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);
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

const invoicePaymentRequestSchema = z.object({
  amountMinor: z.number().int().positive().optional(),
  method: z.enum(['bank_transfer', 'card']).default('bank_transfer'),
  idempotencyKey: z.string().trim().min(8).max(120),
  returnUrl: z.string().trim().url().optional(),
  cancelUrl: z.string().trim().url().optional(),
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
    isAdmin
    || asString(invoice.coachUserId) === authUserId
    || asString(invoice.payerUserId) === authUserId
  );
}

function reconcileStateForInvoiceStatus(status: InvoiceStatus): string {
  switch (status) {
    case 'PAID':
      return 'PAID';
    case 'WRITTEN_OFF':
      return 'WRITTEN_OFF';
    case 'VOID':
      return 'VOID';
    case 'DRAFT':
      return 'DRAFT';
    case 'SENT':
    default:
      return 'OUTSTANDING';
  }
}

function appendInvoiceEvent(params: {
  invoiceEvents: SeedRow[];
  invoiceId: string;
  eventType: string;
  actorUserId: string;
  reason: string;
  requestId: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}): void {
  params.invoiceEvents.push({
    id: newId('ine'),
    invoiceId: params.invoiceId,
    eventType: params.eventType,
    actorUserId: params.actorUserId,
    reason: params.reason,
    metadataJson: params.metadata ?? {},
    requestId: params.requestId,
    occurredAt: params.occurredAt,
  });
}

function updateReconcilerEntry(params: {
  reconcilerEntries: SeedRow[];
  invoice: SeedRow;
  actorUserId: string;
  nextStatus: InvoiceStatus;
  note: string;
  now: string;
}): void {
  const invoiceId = asString(params.invoice.id) ?? '';
  const existing = params.reconcilerEntries.find((row) => asString(row.invoiceId) === invoiceId);
  const nextState = reconcileStateForInvoiceStatus(params.nextStatus);

  if (existing) {
    existing.state = nextState;
    existing.internalNote = params.note;
    existing.updatedAt = params.now;
    existing.updatedByUserId = params.actorUserId;
    existing.version = (asNumber(existing.version) ?? 1) + 1;
    return;
  }

  params.reconcilerEntries.push({
    id: newId('rec'),
    invoiceId,
    coachUserId: asString(params.invoice.coachUserId),
    state: nextState,
    internalNote: params.note,
    createdByUserId: params.actorUserId,
    updatedByUserId: params.actorUserId,
    version: 1,
    createdAt: params.now,
    updatedAt: params.now,
  });
}

function matchesInvoiceFilters(
  row: SeedRow,
  query: z.infer<typeof invoiceListQuerySchema>,
): boolean {
  if (query.coachId && asString(row.coachUserId) !== query.coachId) {
    return false;
  }
  if (query.bookingId && asString(row.bookingId) !== query.bookingId) {
    return false;
  }
  if (query.status) {
    const statuses = query.status
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);
    if (statuses.length > 0 && !statuses.includes(toInvoiceStatus(row.status))) {
      return false;
    }
  }

  const sessionDate = Date.parse(asString(row.sessionDate) ?? '');
  if (query.dateFrom) {
    const fromDate = Date.parse(query.dateFrom);
    if (Number.isFinite(fromDate) && (!Number.isFinite(sessionDate) || sessionDate < fromDate)) {
      return false;
    }
  }
  if (query.dateTo) {
    const toDate = Date.parse(query.dateTo);
    if (Number.isFinite(toDate) && (!Number.isFinite(sessionDate) || sessionDate > toDate)) {
      return false;
    }
  }

  return true;
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
    const canAccess = isAdmin
      || asString(detail.invoice.coachId) === authUserId
      || asString(detail.invoice.userId) === authUserId;
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
    const canPay = isAdmin || asString(invoice.payerUserId) === authUserId || asString(invoice.userId) === authUserId;
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
    if (!isAdmin && asString(invoice.coachUserId) !== authUserId && asString(invoice.coachId) !== authUserId) {
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
      subjectUserId: asString(reminder.invoice.payerUserId) ?? asString(reminder.invoice.userId) ?? null,
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
    const token = typeof (request.query as { token?: unknown } | undefined)?.token === 'string'
      ? (request.query as { token: string }).token
      : '';
    if (!attemptId || !token) {
      throw badRequest('Payment attempt token is required');
    }

    const page = await getHostedPaymentPageData(attemptId, token);
    const completeUrl = `/v1/payment-attempts/${attemptId}/simulated-complete`;
    reply.type('text/html; charset=utf-8');
    return reply.send(renderHostedPaymentPage({
      invoiceNumber: asString(page.invoice.invoiceNumber) ?? attemptId,
      amountMinor: asNumber(page.attempt.amountMinor) ?? 0,
      currency: asString(page.attempt.currency) ?? 'GBP',
      completeUrl,
      token: page.token,
      returnUrl: page.returnUrl,
      cancelUrl: page.cancelUrl,
    }));
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
      subjectUserId: asString(completed.invoice.payerUserId) ?? asString(completed.invoice.userId) ?? null,
      result: 'SUCCESS',
      metadata: {
        attemptId,
        alreadyCompleted: completed.alreadyCompleted,
      },
    });

    const acceptsHtml = typeof request.headers.accept === 'string' && request.headers.accept.includes('text/html');
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
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const invoiceId = asString((request.params as { invoiceId?: string }).invoiceId);
    if (!invoiceId) {
      throw notFound('Invoice id is required');
    }

    const body = invoiceTransitionRequestSchema.parse(request.body ?? {});
    const store = getMarketplaceSeedStore();
    const users = asRows(store.tables.users);
    const invoices = getActiveRows(asRows(store.tables.invoices));
    const invoice = invoices.find((row) => asString(row.id) === invoiceId);
    if (!invoice) {
      throw notFound('Invoice not found', { invoiceId });
    }

    const isAdmin = isPrivilegedAdminAuth(request.auth);
    if (!isAdmin && asString(invoice.coachUserId) !== authUserId) {
      throw forbidden('Not allowed to reconcile this invoice');
    }
    if (toInvoiceStatus(invoice.status) === 'VOID') {
      throw badRequest('Voided invoices cannot be marked as paid', { invoiceId });
    }
    if (toInvoiceStatus(invoice.status) !== 'PAID') {
      const invoiceEvents = asRows(store.tables.invoiceEvents);
      const reconcilerEntries = asRows(store.tables.reconcilerEntries);
      const now = nowIso();
      invoice.status = 'PAID';
      invoice.paidAt = now;
      invoice.updatedAt = now;
      invoice.updatedByUserId = authUserId;
      invoice.version = (asNumber(invoice.version) ?? 1) + 1;
      appendInvoiceEvent({
        invoiceEvents,
        invoiceId,
        eventType: 'MARKED_PAID',
        actorUserId: authUserId,
        reason: body.reason ?? 'Marked paid in reconciler.',
        requestId: request.requestId,
        occurredAt: now,
        metadata: { source: 'coach-reconciler' },
      });
      updateReconcilerEntry({
        reconcilerEntries,
        invoice,
        actorUserId: authUserId,
        nextStatus: 'PAID',
        note: 'Marked paid via /v1/invoices/:invoiceId/mark-paid.',
        now,
      });
    }

    await recordAuditEvent({
      request,
      action: 'invoice.mark_paid',
      resourceType: 'invoice',
      resourceId: invoiceId,
      subjectUserId: asString(invoice.payerUserId) ?? null,
      result: 'SUCCESS',
    });

    return reply.send({
      invoice: mapInvoice(invoice, users),
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.post('/invoices/:invoiceId/mark-unpaid', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const invoiceId = asString((request.params as { invoiceId?: string }).invoiceId);
    if (!invoiceId) {
      throw notFound('Invoice id is required');
    }

    const body = invoiceTransitionRequestSchema.parse(request.body ?? {});
    const store = getMarketplaceSeedStore();
    const users = asRows(store.tables.users);
    const invoice = getActiveRows(asRows(store.tables.invoices)).find((row) => asString(row.id) === invoiceId);
    if (!invoice) {
      throw notFound('Invoice not found', { invoiceId });
    }

    const isAdmin = isPrivilegedAdminAuth(request.auth);
    if (!isAdmin && asString(invoice.coachUserId) !== authUserId) {
      throw forbidden('Not allowed to reconcile this invoice');
    }
    if (toInvoiceStatus(invoice.status) !== 'PAID') {
      throw badRequest('Only paid invoices can be moved back to unpaid', { invoiceId });
    }

    const invoiceEvents = asRows(store.tables.invoiceEvents);
    const reconcilerEntries = asRows(store.tables.reconcilerEntries);
    const now = nowIso();
    invoice.status = 'SENT';
    invoice.paidAt = null;
    invoice.updatedAt = now;
    invoice.updatedByUserId = authUserId;
    invoice.version = (asNumber(invoice.version) ?? 1) + 1;
    appendInvoiceEvent({
      invoiceEvents,
      invoiceId,
      eventType: 'MARKED_UNPAID',
      actorUserId: authUserId,
      reason: body.reason ?? 'Moved back to unpaid in reconciler.',
      requestId: request.requestId,
      occurredAt: now,
      metadata: { source: 'coach-reconciler' },
    });
    updateReconcilerEntry({
      reconcilerEntries,
      invoice,
      actorUserId: authUserId,
      nextStatus: 'SENT',
      note: 'Moved back to unpaid via /v1/invoices/:invoiceId/mark-unpaid.',
      now,
    });

    await recordAuditEvent({
      request,
      action: 'invoice.mark_unpaid',
      resourceType: 'invoice',
      resourceId: invoiceId,
      subjectUserId: asString(invoice.payerUserId) ?? null,
      result: 'SUCCESS',
    });

    return reply.send({
      invoice: mapInvoice(invoice, users),
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.post('/invoices/:invoiceId/write-off', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const invoiceId = asString((request.params as { invoiceId?: string }).invoiceId);
    if (!invoiceId) {
      throw notFound('Invoice id is required');
    }

    const body = invoiceTransitionRequestSchema.parse(request.body ?? {});
    const store = getMarketplaceSeedStore();
    const users = asRows(store.tables.users);
    const invoice = getActiveRows(asRows(store.tables.invoices)).find((row) => asString(row.id) === invoiceId);
    if (!invoice) {
      throw notFound('Invoice not found', { invoiceId });
    }

    const isAdmin = isPrivilegedAdminAuth(request.auth);
    if (!isAdmin && asString(invoice.coachUserId) !== authUserId) {
      throw forbidden('Not allowed to reconcile this invoice');
    }
    if (toInvoiceStatus(invoice.status) === 'PAID' || toInvoiceStatus(invoice.status) === 'VOID') {
      throw badRequest('Paid or void invoices cannot be written off', { invoiceId });
    }

    const invoiceEvents = asRows(store.tables.invoiceEvents);
    const reconcilerEntries = asRows(store.tables.reconcilerEntries);
    const now = nowIso();
    invoice.status = 'WRITTEN_OFF';
    invoice.paidAt = null;
    invoice.voidReason = body.reason ?? 'Written off by coach';
    invoice.updatedAt = now;
    invoice.updatedByUserId = authUserId;
    invoice.version = (asNumber(invoice.version) ?? 1) + 1;
    appendInvoiceEvent({
      invoiceEvents,
      invoiceId,
      eventType: 'WRITTEN_OFF',
      actorUserId: authUserId,
      reason: asString(invoice.voidReason) ?? 'Written off by coach',
      requestId: request.requestId,
      occurredAt: now,
      metadata: { source: 'coach-reconciler' },
    });
    updateReconcilerEntry({
      reconcilerEntries,
      invoice,
      actorUserId: authUserId,
      nextStatus: 'WRITTEN_OFF',
      note: 'Written off via /v1/invoices/:invoiceId/write-off.',
      now,
    });

    await recordAuditEvent({
      request,
      action: 'invoice.write_off',
      resourceType: 'invoice',
      resourceId: invoiceId,
      subjectUserId: asString(invoice.payerUserId) ?? null,
      result: 'SUCCESS',
    });

    return reply.send({
      invoice: mapInvoice(invoice, users),
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.post('/invoices/:invoiceId/restore', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const invoiceId = asString((request.params as { invoiceId?: string }).invoiceId);
    if (!invoiceId) {
      throw notFound('Invoice id is required');
    }

    const body = invoiceTransitionRequestSchema.parse(request.body ?? {});
    const store = getMarketplaceSeedStore();
    const users = asRows(store.tables.users);
    const invoice = getActiveRows(asRows(store.tables.invoices)).find((row) => asString(row.id) === invoiceId);
    if (!invoice) {
      throw notFound('Invoice not found', { invoiceId });
    }

    const isAdmin = isPrivilegedAdminAuth(request.auth);
    if (!isAdmin && asString(invoice.coachUserId) !== authUserId) {
      throw forbidden('Not allowed to reconcile this invoice');
    }
    if (toInvoiceStatus(invoice.status) !== 'WRITTEN_OFF') {
      throw badRequest('Only written-off invoices can be restored', { invoiceId });
    }

    const invoiceEvents = asRows(store.tables.invoiceEvents);
    const reconcilerEntries = asRows(store.tables.reconcilerEntries);
    const now = nowIso();
    invoice.status = 'SENT';
    invoice.voidReason = null;
    invoice.updatedAt = now;
    invoice.updatedByUserId = authUserId;
    invoice.version = (asNumber(invoice.version) ?? 1) + 1;
    appendInvoiceEvent({
      invoiceEvents,
      invoiceId,
      eventType: 'RESTORED',
      actorUserId: authUserId,
      reason: body.reason ?? 'Restored from write-off.',
      requestId: request.requestId,
      occurredAt: now,
      metadata: { source: 'coach-reconciler' },
    });
    updateReconcilerEntry({
      reconcilerEntries,
      invoice,
      actorUserId: authUserId,
      nextStatus: 'SENT',
      note: 'Restored via /v1/invoices/:invoiceId/restore.',
      now,
    });

    await recordAuditEvent({
      request,
      action: 'invoice.restore',
      resourceType: 'invoice',
      resourceId: invoiceId,
      subjectUserId: asString(invoice.payerUserId) ?? null,
      result: 'SUCCESS',
    });

    return reply.send({
      invoice: mapInvoice(invoice, users),
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.post('/invoices/:invoiceId/void', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const invoiceId = asString((request.params as { invoiceId?: string }).invoiceId);
    if (!invoiceId) {
      throw notFound('Invoice id is required');
    }

    const body = invoiceTransitionRequestSchema.parse(request.body ?? {});
    const store = getMarketplaceSeedStore();
    const users = asRows(store.tables.users);
    const invoice = getActiveRows(asRows(store.tables.invoices)).find((row) => asString(row.id) === invoiceId);
    if (!invoice) {
      throw notFound('Invoice not found', { invoiceId });
    }

    const isAdmin = isPrivilegedAdminAuth(request.auth);
    if (!isAdmin && asString(invoice.coachUserId) !== authUserId) {
      throw forbidden('Not allowed to void this invoice');
    }
    if (toInvoiceStatus(invoice.status) === 'PAID') {
      throw badRequest('Paid invoices cannot be voided', { invoiceId });
    }
    if (toInvoiceStatus(invoice.status) !== 'VOID') {
      const invoiceEvents = asRows(store.tables.invoiceEvents);
      const reconcilerEntries = asRows(store.tables.reconcilerEntries);
      const now = nowIso();
      invoice.status = 'VOID';
      invoice.paidAt = null;
      invoice.voidedAt = now;
      invoice.voidReason = body.reason ?? 'Voided by coach';
      invoice.updatedAt = now;
      invoice.updatedByUserId = authUserId;
      invoice.version = (asNumber(invoice.version) ?? 1) + 1;
      appendInvoiceEvent({
        invoiceEvents,
        invoiceId,
        eventType: 'VOIDED',
        actorUserId: authUserId,
        reason: asString(invoice.voidReason) ?? 'Voided by coach',
        requestId: request.requestId,
        occurredAt: now,
        metadata: { source: 'coach-reconciler' },
      });
      updateReconcilerEntry({
        reconcilerEntries,
        invoice,
        actorUserId: authUserId,
        nextStatus: 'VOID',
        note: 'Voided via /v1/invoices/:invoiceId/void.',
        now,
      });
    }

    await recordAuditEvent({
      request,
      action: 'invoice.void',
      resourceType: 'invoice',
      resourceId: invoiceId,
      subjectUserId: asString(invoice.payerUserId) ?? null,
      result: 'SUCCESS',
    });

    return reply.send({
      invoice: mapInvoice(invoice, users),
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.get('/athletes/:athleteId/progress', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    await assertCanReadAthleteHealth(request, athleteId);

    const store = getMarketplaceSeedStore();
    const sessionNotes = asRows(store.tables.sessionNotes).filter(
      (row) => asString(row.athleteId) === athleteId,
    );
    const sessionFeedback = asRows(store.tables.sessionFeedback).filter(
      (row) => asString(row.athleteId) === athleteId,
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
      sessionNotes,
      sessionFeedback,
      skillAssessments,
      skillDefinitions,
      seedVersion: store.version,
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
    const store = getMarketplaceSeedStore();
    const drills = asRows(store.tables.drills);
    const assignments = asRows(store.tables.drillAssignments);
    const submissions = asRows(store.tables.assignmentSubmissions);
    const coachUserId = asString((request.query as { coachUserId?: string } | undefined)?.coachUserId);

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
          drillAssignments.some((assignment) => asString(assignment.id) === asString(row.drillAssignmentId)),
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
      status: 'PENDING_SCAN',
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
      status: 'PENDING',
      engine: 'seed-runtime',
      scannedAt: null,
      signatureVersion: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
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

  app.get('/videos/:videoId', async (request, reply) => {
    const videoId = asString((request.params as { videoId?: string }).videoId);
    if (!videoId) {
      throw notFound('Video id is required');
    }

    const store = getMarketplaceSeedStore();
    const videos = asRows(store.tables.videos);
    const annotations = asRows(store.tables.videoAnnotations);
    const video = videos.find((row) => asString(row.id) === videoId);
    if (!video) {
      throw notFound('Video not found', { videoId });
    }

    return reply.send({
      video,
      annotations: annotations.filter((row) => asString(row.videoId) === videoId),
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.get('/community-groups', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const store = getMarketplaceSeedStore();
    const groups = asRows(store.tables.communityGroups);
    const memberships = asRows(store.tables.communityGroupMemberships);
    const myMemberships = memberships.filter((row) => asString(row.userId) === authUserId);
    const groupIds = new Set(
      myMemberships.map((row) => asString(row.communityGroupId)).filter((id): id is string => Boolean(id)),
    );

    return reply.send({
      groups: groups
        .filter((row) => groupIds.has(asString(row.id) ?? ''))
        .map((group) => ({
          ...group,
          memberships: memberships.filter(
            (row) => asString(row.communityGroupId) === asString(group.id),
          ),
        })),
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.get('/posts', async (request, reply) => {
    const store = getMarketplaceSeedStore();
    const posts = asRows(store.tables.posts);
    const comments = asRows(store.tables.postComments);
    const reactions = asRows(store.tables.postReactions);
    const groupId = asString((request.query as { communityGroupId?: string } | undefined)?.communityGroupId);

    const filtered = groupId
      ? posts.filter((row) => asString(row.communityGroupId) === groupId)
      : posts;

    return reply.send({
      posts: filtered.map((post) => {
        const postId = asString(post.id);
        return {
          ...post,
          comments: comments.filter((row) => asString(row.postId) === postId),
          reactions: reactions.filter((row) => asString(row.postId) === postId),
        };
      }),
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.get('/message-threads', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const store = getMarketplaceSeedStore();
    const threads = asRows(store.tables.messageThreads);
    const participants = asRows(store.tables.messageParticipants);
    const messages = asRows(store.tables.messages);
    const receipts = asRows(store.tables.messageReceipts);
    const myThreadIds = new Set(
      participants
        .filter((row) => asString(row.userId) === authUserId)
        .map((row) => asString(row.messageThreadId))
        .filter((id): id is string => Boolean(id)),
    );

    return reply.send({
      threads: threads
        .filter((thread) => myThreadIds.has(asString(thread.id) ?? ''))
        .map((thread) => {
          const threadId = asString(thread.id);
          const threadMessages = messages.filter((row) => asString(row.messageThreadId) === threadId);
          return {
            ...thread,
            participants: participants.filter((row) => asString(row.messageThreadId) === threadId),
            messages: threadMessages.map((message) => ({
              ...message,
              receipts: receipts.filter((row) => asString(row.messageId) === asString(message.id)),
            })),
          };
        }),
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.get('/me/notifications', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const store = getMarketplaceSeedStore();
    const notifications = asRows(store.tables.notifications).filter(
      (row) => asString(row.userId) === authUserId,
    );
    const notificationPreferences = asRows(store.tables.notificationPreferences).find(
      (row) => asString(row.userId) === authUserId,
    ) ?? null;
    const mutedSources = asRows(store.tables.mutedSources).filter(
      (row) => asString(row.userId) === authUserId,
    );
    const quietHours = asRows(store.tables.quietHours).find(
      (row) => asString(row.userId) === authUserId,
    ) ?? null;

    return reply.send({
      notifications,
      preferences: notificationPreferences,
      mutedSources,
      quietHours,
      unreadCount: notifications.filter((row) => asString(row.status) !== 'READ').length,
      seedVersion: store.version,
      requestId: request.requestId,
    });
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
    const requests = asRows(store.tables.dataDeletionRequests).filter((row) =>
      asString(row.requesterUserId) === authUserId,
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
