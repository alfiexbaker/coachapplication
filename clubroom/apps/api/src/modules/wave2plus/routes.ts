import crypto from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { badRequest, forbidden, notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { assertCanReadAthleteHealth } from '../../lib/authz.js';

type SeedRow = Record<string, unknown>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const asNumber = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);
const nowIso = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

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
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const wave2PlusRoutes: FastifyPluginAsync = async (app) => {
  app.get('/invoices/:invoiceId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const invoiceId = asString((request.params as { invoiceId?: string }).invoiceId);
    if (!invoiceId) {
      throw notFound('Invoice id is required');
    }

    const store = getMarketplaceSeedStore();
    const invoice = asRows(store.tables.invoices).find((row) => asString(row.id) === invoiceId);
    if (!invoice) {
      throw notFound('Invoice not found', { invoiceId });
    }
    const isAdmin =
      request.auth?.roles.includes('club_admin') || request.auth?.roles.includes('security_admin');
    const canAccess =
      isAdmin
      || asString(invoice.coachUserId) === authUserId
      || asString(invoice.payerUserId) === authUserId;
    if (!canAccess) {
      throw forbidden('Not allowed to access this invoice');
    }

    const lineItems = asRows(store.tables.invoiceLineItems).filter(
      (row) => asString(row.invoiceId) === invoiceId,
    );
    const events = asRows(store.tables.invoiceEvents).filter((row) => asString(row.invoiceId) === invoiceId);
    const reconcilerEntry = asRows(store.tables.reconcilerEntries).find(
      (row) => asString(row.invoiceId) === invoiceId,
    ) ?? null;
    const reminders = asRows(store.tables.paymentReminders).filter(
      (row) => asString(row.invoiceId) === invoiceId,
    );
    const paymentInstructionTemplates = asRows(store.tables.paymentInstructionTemplates).filter(
      (row) => asString(row.coachUserId) === asString(invoice.coachUserId),
    );

    return reply.send({
      invoice,
      lineItems,
      events,
      reconcilerEntry,
      reminders,
      paymentInstructionTemplates,
      seedVersion: store.version,
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
    const body = invoicePaymentRequestSchema.parse(request.body);

    const store = getMarketplaceSeedStore();
    const invoice = asRows(store.tables.invoices).find((row) => asString(row.id) === invoiceId);
    if (!invoice) {
      throw notFound('Invoice not found', { invoiceId });
    }

    const isAdmin =
      request.auth?.roles.includes('club_admin') || request.auth?.roles.includes('security_admin');
    const canPay = isAdmin || asString(invoice.payerUserId) === authUserId;
    if (!canPay) {
      throw forbidden('Not allowed to pay this invoice');
    }

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

    const invoiceEvents = asRows(store.tables.invoiceEvents);
    const reconcilerEntries = asRows(store.tables.reconcilerEntries);
    const now = nowIso();
    const alreadyPaid = asString(invoice.status) === 'PAID';

    if (!alreadyPaid) {
      invoice.status = 'PAID';
      invoice.paidAt = now;
      invoice.updatedAt = now;
      invoice.updatedByUserId = authUserId;
      invoice.version = (asNumber(invoice.version) ?? 1) + 1;

      invoiceEvents.push({
        id: newId('ine'),
        invoiceId,
        eventType: 'MARKED_PAID',
        actorUserId: authUserId,
        reason: 'Payment simulated via API runtime endpoint.',
        metadataJson: {
          source: 'api-runtime',
          method: body.method,
          amountMinor,
          idempotencyKey: body.idempotencyKey ?? null,
          ...(body.metadata ? { metadata: body.metadata } : {}),
        },
        requestId: request.requestId,
        occurredAt: now,
      });

      const reconcilerEntry = reconcilerEntries.find((row) => asString(row.invoiceId) === invoiceId);
      if (reconcilerEntry) {
        reconcilerEntry.state = 'PAID';
        reconcilerEntry.updatedAt = now;
        reconcilerEntry.updatedByUserId = authUserId;
        reconcilerEntry.version = (asNumber(reconcilerEntry.version) ?? 1) + 1;
        reconcilerEntry.internalNote = 'Marked paid via /v1/invoices/:invoiceId/payments.';
      } else {
        reconcilerEntries.push({
          id: newId('rec'),
          invoiceId,
          coachUserId: asString(invoice.coachUserId),
          state: 'PAID',
          internalNote: 'Created by payment simulation endpoint.',
          createdByUserId: authUserId,
          updatedByUserId: authUserId,
          version: 1,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return reply.send({
      invoiceId,
      paid: true,
      alreadyPaid,
      invoiceStatus: asString(invoice.status) ?? 'PAID',
      payment: {
        amountMinor,
        currency: asString(invoice.currency) ?? 'GBP',
        method: body.method,
        processedAt: now,
        actorUserId: authUserId,
      },
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.get('/athletes/:athleteId/progress', async (request, reply) => {
    const athleteId = asString((request.params as { athleteId?: string }).athleteId);
    if (!athleteId) {
      throw notFound('Athlete id is required');
    }
    assertCanReadAthleteHealth(request, athleteId);

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
    assertCanReadAthleteHealth(request, athleteId);

    const store = getMarketplaceSeedStore();
    const goals = asRows(store.tables.goals).filter((row) => asString(row.athleteId) === athleteId);
    const milestones = asRows(store.tables.goalMilestones).filter((row) =>
      goals.some((goal) => asString(goal.id) === asString(row.goalId)),
    );

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
    assertCanReadAthleteHealth(request, athleteId);

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
    const isAdmin =
      request.auth?.roles.includes('club_admin') || request.auth?.roles.includes('security_admin');
    if (!isAdmin) {
      throw forbidden('Admin role required');
    }

    const store = getMarketplaceSeedStore();
    const grants = asRows(store.tables.accessGrants);
    const scopes = asRows(store.tables.accessGrantScopes);
    const auditEvents = asRows(store.tables.auditEvents);
    const securityEvents = asRows(store.tables.securityEvents);
    const retentionPolicies = asRows(store.tables.retentionPolicies);
    const legalHolds = asRows(store.tables.legalHolds);

    return reply.send({
      grants: grants.map((grant) => ({
        ...grant,
        scopes: scopes.filter((scope) => asString(scope.accessGrantId) === asString(grant.id)),
      })),
      auditEvents,
      securityEvents,
      retentionPolicies,
      legalHolds,
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.get('/admin/retention-runs', async (request, reply) => {
    const isAdmin = request.auth?.roles.includes('club_admin') || request.auth?.roles.includes('security_admin');
    if (!isAdmin) {
      throw forbidden('Admin role required');
    }

    const store = getMarketplaceSeedStore();
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
