import crypto from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  canManageClubAssignments,
  createSafeguardingActionRequestSchema,
  createSafeguardingIncidentRequestSchema,
  listSafeguardingIncidentsQuerySchema,
  parseOrganizationRole,
  type SafeguardingIncidentResponse,
  safeguardingIncidentIdSchema,
} from '@clubroom/shared-contracts';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { ApiProblemError, badRequest, forbidden, notFound } from '../../lib/http-errors.js';
import {
  assertCanAccessSafeguardingIncident,
  assertCanCreateSafeguardingIncident,
  assertCanReadSafeguardingForAthlete,
  isPrivilegedAdminAuth,
} from '../../lib/authz.js';
import { recordAuditEvent } from '../../lib/audit-runtime.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { resolveSafeguardingRepository } from '../../repositories/p0/safeguarding-repository.js';
import { resolveBookingRepository } from '../../repositories/p0/booking-repository.js';
import { resolveUserBlockRepository } from '../../repositories/p0/user-block-repository.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const ensureAuthUserId = (userId?: string) => {
  if (!userId) {
    throw forbidden('Authenticated user is required');
  }
  return userId;
};

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asIsoString = (value: unknown): string | undefined =>
  value instanceof Date ? value.toISOString() : asString(value);
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

const blockQuerySchema = z.object({
  targetUserId: z.string().trim().min(1).optional(),
  blockedUserId: z.string().trim().min(1).optional(),
});

const blockBodySchema = z.object({
  blockedUserId: z.string().trim().min(1),
});

const reportTypeSchema = z.enum([
  'inappropriate',
  'safety_concern',
  'fake_profile',
  'spam',
  'other',
]);
const reportContextSchema = z.enum(['profile', 'message', 'review']);
const reportBodySchema = z.object({
  reportedUserId: z.string().trim().min(1),
  type: reportTypeSchema,
  description: z.string().trim().max(2000).optional(),
  context: reportContextSchema,
});
const genericReportDetailsSchema = z.object({
  source: z.literal('generic-report'),
  reportedUserId: z.string().trim().min(1),
  type: reportTypeSchema,
  context: reportContextSchema,
  description: z.string().optional(),
});
const seriousReportTypes = new Set<z.infer<typeof reportTypeSchema>>([
  'inappropriate',
  'safety_concern',
]);

function auditErrorResult(error: unknown): 'DENY' | 'ERROR' {
  return error instanceof ApiProblemError && error.status === 403 ? 'DENY' : 'ERROR';
}

function genericReportStore(): { tables: SeedTables; version: string | null } | null {
  if (getApiDataBackend() === 'db') {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return { tables: store.tables as SeedTables, version: store.version };
    }
    return null;
  }
  const store = getMarketplaceSeedStore();
  return { tables: store.tables as SeedTables, version: store.version };
}

function parseGenericReportDetails(
  details: unknown,
): z.infer<typeof genericReportDetailsSchema> | null {
  if (typeof details !== 'string') {
    return null;
  }
  try {
    return genericReportDetailsSchema.parse(JSON.parse(details));
  } catch {
    return null;
  }
}

function reportStatusFromIncidentStatus(
  value: string | undefined,
): 'pending' | 'reviewed' | 'resolved' {
  switch ((value ?? '').toUpperCase()) {
    case 'IN_REVIEW':
      return 'reviewed';
    case 'CLOSED':
      return 'resolved';
    case 'OPEN':
    default:
      return 'pending';
  }
}

function mapGenericReport(row: SeedRow) {
  const details = parseGenericReportDetails(
    asString(row.detailsEncrypted) ?? asString(row.details),
  );
  if (!details) {
    return null;
  }
  const createdAt = asIsoString(row.createdAt) ?? new Date().toISOString();
  return {
    id: asString(row.id) ?? '',
    reportedUserId: details.reportedUserId,
    reportedByUserId: asString(row.reportedByUserId) ?? '',
    type: details.type,
    ...(details.description ? { description: details.description } : {}),
    context: details.context,
    createdAt,
    status: reportStatusFromIncidentStatus(asString(row.status)),
  };
}

async function assertReportTargetExists(targetUserId: string): Promise<void> {
  const store = genericReportStore();
  if (store) {
    const target = asRows(store.tables.users).find(
      (user) =>
        asString(user.id) === targetUserId &&
        asString(user.accountStatus) !== 'disabled' &&
        !asString(user.deletedAt),
    );
    if (!target) {
      throw notFound('Target user not found', { targetUserId });
    }
    return;
  }

  const prisma = getPrismaClientOrThrow();
  const target = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      accountStatus: 'active',
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });
  if (!target) {
    throw notFound('Target user not found', { targetUserId });
  }
}

async function listGenericReportsForActor(actorUserId: string) {
  const store = genericReportStore();
  if (store) {
    const reports = asRows(store.tables.safeguardingIncidents)
      .filter(
        (row) =>
          asString(row.reportedByUserId) === actorUserId &&
          asString(row.category) === 'other' &&
          !asString(row.deletedAt),
      )
      .flatMap((row) => {
        const report = mapGenericReport(row);
        return report ? [report] : [];
      })
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
    return { reports, dataVersion: store.version };
  }

  const prisma = getPrismaClientOrThrow();
  const rows = await prisma.safeguardingIncident.findMany({
    where: {
      reportedByUserId: actorUserId,
      category: 'other',
      deletedAt: null,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  return {
    reports: (rows as unknown as SeedRow[]).flatMap((row) => {
      const report = mapGenericReport(row);
      return report ? [report] : [];
    }),
    dataVersion: null,
  };
}

function supportNotificationRows(params: {
  incident: SafeguardingIncidentResponse;
  reporterUserId: string;
  recipientIds: string[];
  now: Date;
}) {
  const title =
    params.incident.severity === 'critical' ? 'Critical support issue' : 'New support issue';
  const body = params.incident.bookingId
    ? `A ${params.incident.category} report was opened for a booking.`
    : `A ${params.incident.category} report was opened.`;
  return params.recipientIds
    .filter((recipientId) => recipientId !== params.reporterUserId)
    .map((recipientId) => ({
      id: newId('nfn'),
      userId: recipientId,
      type: 'SUPPORT_UPDATE',
      title,
      body,
      status: 'UNREAD' as const,
      sourceType: 'safeguarding_incident',
      sourceId: params.incident.id,
      deepLink: `/safeguarding/incidents/${params.incident.id}`,
      metadataJson: {
        incidentId: params.incident.id,
        bookingId: params.incident.bookingId,
        athleteId: params.incident.athleteId,
        category: params.incident.category,
        severity: params.incident.severity,
      },
      createdAt: params.now,
      updatedAt: params.now,
    }));
}

function supportRecipientsFromTables(
  tables: SeedTables,
  incident: SafeguardingIncidentResponse,
): string[] {
  const recipients = new Set<string>();
  const booking = incident.bookingId
    ? asRows(tables.bookings).find(
        (row) => asString(row.id) === incident.bookingId && !asString(row.deletedAt),
      )
    : undefined;
  const coachUserId = asString(booking?.coachUserId);
  if (coachUserId) {
    recipients.add(coachUserId);
  }

  const clubId = asString(booking?.clubId);
  if (clubId) {
    for (const membership of asRows(tables.clubMemberships)) {
      if (
        asString(membership.clubId) !== clubId ||
        membership.active !== true ||
        asString(membership.deletedAt)
      ) {
        continue;
      }
      if (canManageClubAssignments(parseOrganizationRole(asString(membership.role)))) {
        const userId = asString(membership.userId);
        if (userId) {
          recipients.add(userId);
        }
      }
    }
  }

  return [...recipients];
}

async function createSeedSupportNotifications(
  tables: SeedTables,
  incident: SafeguardingIncidentResponse,
  reporterUserId: string,
): Promise<number> {
  const rows = supportNotificationRows({
    incident,
    reporterUserId,
    recipientIds: supportRecipientsFromTables(tables, incident),
    now: new Date(),
  });
  if (rows.length === 0) {
    return 0;
  }
  const notifications = (tables.notifications ??= []);
  notifications.push(
    ...rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  );
  return rows.length;
}

async function createDbSupportNotifications(
  incident: SafeguardingIncidentResponse,
  reporterUserId: string,
): Promise<number> {
  const prisma = getPrismaClientOrThrow();
  const booking = incident.bookingId
    ? await prisma.booking.findFirst({
        where: {
          id: incident.bookingId,
          deletedAt: null,
        },
        select: {
          coachUserId: true,
          clubId: true,
        },
      })
    : null;
  const recipientIds = new Set<string>();
  if (booking?.coachUserId) {
    recipientIds.add(booking.coachUserId);
  }
  if (booking?.clubId) {
    const memberships = await prisma.clubMembership.findMany({
      where: {
        clubId: booking.clubId,
        active: true,
        deletedAt: null,
      },
      select: {
        userId: true,
        role: true,
      },
    });
    for (const membership of memberships) {
      if (canManageClubAssignments(parseOrganizationRole(membership.role))) {
        recipientIds.add(membership.userId);
      }
    }
  }

  const rows = supportNotificationRows({
    incident,
    reporterUserId,
    recipientIds: [...recipientIds],
    now: new Date(),
  });
  if (rows.length === 0) {
    return 0;
  }
  await prisma.notification.createMany({
    data: rows.map((row) => ({
      ...row,
      metadataJson: row.metadataJson as never,
    })),
  });
  return rows.length;
}

async function createSupportIssueNotifications(
  incident: SafeguardingIncidentResponse,
  reporterUserId: string,
): Promise<number> {
  if (!incident.bookingId) {
    return 0;
  }
  if (getApiDataBackend() === 'db') {
    if (!shouldUseDbFixtureFallback()) {
      return createDbSupportNotifications(incident, reporterUserId);
    }
    return createSeedSupportNotifications(
      getDbFixtureStore().tables as SeedTables,
      incident,
      reporterUserId,
    );
  }
  return createSeedSupportNotifications(
    getMarketplaceSeedStore().tables as SeedTables,
    incident,
    reporterUserId,
  );
}

const trustOpsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/reports', async (request, reply) => {
    const actorUserId = ensureAuthUserId(request.auth?.userId);
    try {
      const result = await listGenericReportsForActor(actorUserId);
      await recordAuditEvent({
        request,
        action: 'reports.read',
        resourceType: 'report',
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          resultCount: result.reports.length,
        },
      });
      return reply.send({
        reports: result.reports,
        total: result.reports.length,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'reports.read',
        resourceType: 'report',
        result: auditErrorResult(error),
        sensitiveRead: true,
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'UNKNOWN',
        },
      });
      throw error;
    }
  });

  app.post('/reports', async (request, reply) => {
    const actorUserId = ensureAuthUserId(request.auth?.userId);
    const body = reportBodySchema.parse(request.body ?? {});
    let reportId: string | undefined;
    try {
      if (body.reportedUserId === actorUserId) {
        throw badRequest('Users cannot report themselves');
      }
      await assertReportTargetExists(body.reportedUserId);

      const incident = await resolveSafeguardingRepository().createIncident(
        {
          category: 'other',
          severity: seriousReportTypes.has(body.type) ? 'high' : 'medium',
          summary: `User report: ${body.context} ${body.type}`,
          details: JSON.stringify({
            source: 'generic-report',
            reportedUserId: body.reportedUserId,
            type: body.type,
            context: body.context,
            ...(body.description ? { description: body.description } : {}),
          }),
        },
        actorUserId,
      );
      reportId = incident.id;

      let autoBlocked = false;
      if (seriousReportTypes.has(body.type)) {
        await resolveUserBlockRepository().blockUser(actorUserId, body.reportedUserId);
        autoBlocked = true;
        await recordAuditEvent({
          request,
          action: 'users.block.create',
          resourceType: 'user_block',
          resourceId: body.reportedUserId,
          result: 'SUCCESS',
          metadata: {
            source: 'report',
            reportId,
          },
        });
      }

      const report = mapGenericReport({
        id: incident.id,
        category: 'other',
        reportedByUserId: incident.reportedByUserId,
        status: incident.status.toUpperCase(),
        details: incident.details ?? '',
        createdAt: incident.createdAt,
      });
      if (!report) {
        throw new Error('Created report could not be projected');
      }

      await recordAuditEvent({
        request,
        action: 'reports.create',
        resourceType: 'report',
        resourceId: report.id,
        subjectUserId: body.reportedUserId,
        result: 'SUCCESS',
        metadata: {
          type: body.type,
          context: body.context,
          autoBlocked,
        },
      });
      return reply.status(201).send({
        report,
        autoBlocked,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'reports.create',
        resourceType: 'report',
        resourceId: reportId,
        subjectUserId: body.reportedUserId,
        result: auditErrorResult(error),
        metadata: {
          type: body.type,
          context: body.context,
          errorCode: error instanceof ApiProblemError ? error.code : 'UNKNOWN',
        },
      });
      throw error;
    }
  });

  app.get('/blocks', async (request, reply) => {
    const actorUserId = ensureAuthUserId(request.auth?.userId);
    const query = blockQuerySchema.parse(request.query ?? {});
    const repository = resolveUserBlockRepository();
    try {
      const [list, status] = await Promise.all([
        repository.listBlockedUsers(actorUserId),
        query.targetUserId
          ? repository.getBlockStatus(actorUserId, query.targetUserId)
          : Promise.resolve(null),
      ]);
      await recordAuditEvent({
        request,
        action: 'users.block.read',
        resourceType: 'user_block',
        resourceId: query.targetUserId ?? null,
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          mode: query.targetUserId ? 'status' : 'list',
          resultCount: list.total,
        },
      });
      return reply.send({
        blocks: list.blocks,
        blockedUserIds: list.blockedUserIds,
        blockedUsers: list.blockedUsers,
        total: list.total,
        status,
        seedVersion: list.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'users.block.read',
        resourceType: 'user_block',
        resourceId: query.targetUserId ?? null,
        result: auditErrorResult(error),
        sensitiveRead: true,
        metadata: {
          mode: query.targetUserId ? 'status' : 'list',
          errorCode: error instanceof ApiProblemError ? error.code : 'UNKNOWN',
        },
      });
      throw error;
    }
  });

  app.post('/blocks', async (request, reply) => {
    const actorUserId = ensureAuthUserId(request.auth?.userId);
    const body = blockBodySchema.parse(request.body ?? {});
    const repository = resolveUserBlockRepository();
    try {
      const status = await repository.blockUser(actorUserId, body.blockedUserId);
      await recordAuditEvent({
        request,
        action: 'users.block.create',
        resourceType: 'user_block',
        resourceId: body.blockedUserId,
        result: 'SUCCESS',
        metadata: {
          relationship: status.relationship,
        },
      });
      return reply.status(201).send({
        status,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'users.block.create',
        resourceType: 'user_block',
        resourceId: body.blockedUserId,
        result: auditErrorResult(error),
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'UNKNOWN',
        },
      });
      throw error;
    }
  });

  app.delete('/blocks', async (request, reply) => {
    const actorUserId = ensureAuthUserId(request.auth?.userId);
    const query = blockQuerySchema.parse(request.query ?? {});
    const blockedUserId = query.blockedUserId ?? query.targetUserId;
    if (!blockedUserId) {
      throw badRequest('Blocked user id is required');
    }
    const repository = resolveUserBlockRepository();
    try {
      const status = await repository.unblockUser(actorUserId, blockedUserId);
      await recordAuditEvent({
        request,
        action: 'users.block.remove',
        resourceType: 'user_block',
        resourceId: blockedUserId,
        result: 'SUCCESS',
        metadata: {
          relationship: status.relationship,
        },
      });
      return reply.send({
        status,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'users.block.remove',
        resourceType: 'user_block',
        resourceId: blockedUserId,
        result: auditErrorResult(error),
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'UNKNOWN',
        },
      });
      throw error;
    }
  });

  app.post('/safeguarding/incidents', async (request, reply) => {
    let athleteId: string | null = null;
    let bookingId: string | null = null;
    let category: string | undefined;
    try {
      const body = createSafeguardingIncidentRequestSchema.parse(request.body);
      athleteId = body.athleteId ?? null;
      bookingId = body.bookingId ?? null;
      category = body.category;
      const reportedByUserId = ensureAuthUserId(request.auth?.userId);
      await assertCanCreateSafeguardingIncident(request, bookingId ? null : athleteId);
      if (bookingId) {
        const booking = await resolveBookingRepository().getVisibleBookingById({
          authUserId: reportedByUserId,
          bookingId,
        });
        if (
          athleteId &&
          !booking.participants.some((participant) => participant.athleteId === athleteId)
        ) {
          throw forbidden('Athlete is not part of this booking');
        }
      }

      const repository = resolveSafeguardingRepository();
      const incident = await repository.createIncident(body, reportedByUserId);
      let notificationCount = 0;
      let notificationStatus: 'sent' | 'not_required' | 'failed' = 'not_required';
      try {
        notificationCount = await createSupportIssueNotifications(incident, reportedByUserId);
        notificationStatus = notificationCount > 0 ? 'sent' : 'not_required';
      } catch (notificationError) {
        notificationStatus = 'failed';
        request.log.error(
          { err: notificationError, incidentId: incident.id },
          'Safeguarding incident saved but support notification routing failed',
        );
        try {
          await recordAuditEvent({
            request,
            action: 'safeguarding_incident.notification',
            resourceType: 'safeguarding_incident',
            resourceId: incident.id,
            result: 'ERROR',
            metadata: {
              errorCode: 'NOTIFICATION_DELIVERY_FAILED',
            },
          });
        } catch (auditError) {
          request.log.error(
            { err: auditError, incidentId: incident.id },
            'Failed to audit safeguarding notification routing error',
          );
        }
      }
      await recordAuditEvent({
        request,
        action: 'safeguarding_incident.create',
        resourceType: 'safeguarding_incident',
        resourceId: incident.id,
        result: 'SUCCESS',
        metadata: {
          hasAthlete: Boolean(incident.athleteId),
          hasBooking: Boolean(incident.bookingId),
          category: incident.category,
          notificationCount,
          notificationStatus,
        },
      });

      return reply.status(201).send(incident);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'safeguarding_incident.create',
        resourceType: 'safeguarding_incident',
        result: auditErrorResult(error),
        metadata: {
          hasAthlete: Boolean(athleteId),
          hasBooking: Boolean(bookingId),
          category,
          errorCode: error instanceof ApiProblemError ? error.code : 'UNKNOWN',
        },
      });
      throw error;
    }
  });

  app.get('/safeguarding/incidents', async (request, reply) => {
    const actorUserId = ensureAuthUserId(request.auth?.userId);
    const query = listSafeguardingIncidentsQuerySchema.parse(request.query ?? {});
    try {
      if (query.athleteId) {
        await assertCanReadSafeguardingForAthlete(request, query.athleteId);
      }
      if (
        query.reportedBy === 'any' &&
        !query.athleteId &&
        !isPrivilegedAdminAuth(request.auth)
      ) {
        throw forbidden('Privileged admin scope is required to list all safeguarding incidents');
      }

      const repository = resolveSafeguardingRepository();
      const candidates = await repository.listIncidents({
        athleteId: query.athleteId,
        statuses: query.status,
        reportedByUserId: query.reportedBy === 'me' ? actorUserId : undefined,
        limit: query.limit,
      });
      await Promise.all(
        candidates.map((incident) => assertCanAccessSafeguardingIncident(request, incident)),
      );
      const incidents: SafeguardingIncidentResponse[] = candidates;

      await recordAuditEvent({
        request,
        action: 'safeguarding_incident.list',
        resourceType: 'safeguarding_incident',
        resourceId: query.athleteId ?? null,
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          athleteId: query.athleteId ?? null,
          status: query.status ?? [],
          reportedBy: query.reportedBy,
          resultCount: incidents.length,
        },
      });
      return reply.send({
        incidents,
        total: incidents.length,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'safeguarding_incident.list',
        resourceType: 'safeguarding_incident',
        resourceId: query.athleteId ?? null,
        result: auditErrorResult(error),
        sensitiveRead: true,
        metadata: {
          athleteId: query.athleteId ?? null,
          status: query.status ?? [],
          reportedBy: query.reportedBy,
          errorCode: error instanceof ApiProblemError ? error.code : 'UNKNOWN',
        },
      });
      throw error;
    }
  });

  app.get('/safeguarding/incidents/:incidentId', async (request, reply) => {
    const incidentId = safeguardingIncidentIdSchema.parse(
      (request.params as { incidentId: string }).incidentId,
    );
    let athleteId: string | null = null;
    try {
      const repository = resolveSafeguardingRepository();
      const incident = await repository.getIncidentById(incidentId);
      if (!incident) {
        throw notFound('Safeguarding incident not found', { incidentId });
      }
      athleteId = incident.athleteId;
      await assertCanAccessSafeguardingIncident(request, incident);
      await recordAuditEvent({
        request,
        action: 'safeguarding_incident.read',
        resourceType: 'safeguarding_incident',
        resourceId: incident.id,
        result: 'SUCCESS',
        sensitiveRead: true,
        metadata: {
          athleteId,
        },
      });
      return reply.send(incident);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'safeguarding_incident.read',
        resourceType: 'safeguarding_incident',
        resourceId: incidentId,
        result: auditErrorResult(error),
        sensitiveRead: true,
        metadata: {
          athleteId,
          errorCode: error instanceof ApiProblemError ? error.code : 'UNKNOWN',
        },
      });
      throw error;
    }
  });

  app.post('/safeguarding/incidents/:incidentId/actions', async (request, reply) => {
    const incidentId = safeguardingIncidentIdSchema.parse(
      (request.params as { incidentId: string }).incidentId,
    );
    let athleteId: string | null = null;
    let actionType: string | undefined;
    try {
      const repository = resolveSafeguardingRepository();
      const incident = await repository.getIncidentById(incidentId);
      if (!incident) {
        throw notFound('Safeguarding incident not found', { incidentId });
      }
      athleteId = incident.athleteId;
      await assertCanAccessSafeguardingIncident(request, incident);

      const body = createSafeguardingActionRequestSchema.parse(request.body);
      actionType = body.actionType;
      const performedByUserId = ensureAuthUserId(request.auth?.userId);
      const result = await repository.addAction(incidentId, body, performedByUserId);
      await recordAuditEvent({
        request,
        action: 'safeguarding_incident.action',
        resourceType: 'safeguarding_incident',
        resourceId: result.incident.id,
        result: 'SUCCESS',
        metadata: {
          actionId: result.action.id,
          actionType: result.action.actionType,
          status: result.incident.status,
        },
      });

      return reply.status(201).send(result.action);
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'safeguarding_incident.action',
        resourceType: 'safeguarding_incident',
        resourceId: incidentId,
        result: auditErrorResult(error),
        metadata: {
          athleteId,
          actionType,
          errorCode: error instanceof ApiProblemError ? error.code : 'UNKNOWN',
        },
      });
      throw error;
    }
  });
};

export default trustOpsRoutes;
