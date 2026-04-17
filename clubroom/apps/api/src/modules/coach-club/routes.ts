import type { FastifyPluginAsync } from 'fastify';
import {
  getClubGovernanceSnapshot,
  parseOrganizationRole,
} from '@clubroom/shared-contracts';
import { canUseStaffInviteLinks, isPrivilegedAdminAuth } from '../../lib/authz.js';
import { forbidden, notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import {
  resetClubAuthorityRepositoryForTests,
  resolveClubAuthorityRepository,
} from '../../repositories/p0/club-authority-repository.js';
import { resolveCoachSelfRepository } from '../../repositories/p0/coach-self-repository.js';
import {
  parseAvailabilitySlotQuery,
  resolveCoachAvailabilitySlots,
} from './availability.js';
import { buildClubScheduleActivities, findClubScheduleActivity } from './schedule.js';

type SeedRow = Record<string, unknown>;

interface RefundTier {
  hoursBeforeSession: number;
  refundPercentage: number;
  description: string;
}

interface CancellationPolicyPayload {
  name: string;
  description: string;
  tiers: RefundTier[];
  minimumNoticeHours: number;
  allowCancellations: boolean;
  isDefault: boolean;
}

interface SchedulingRulesPatchBody {
  minimumAdvanceBookingHours?: number;
  maxAdvanceBookingDays?: number;
  bufferMinutesDefault?: number;
  maxConcurrentDefault?: number;
  allowSameDayBookings?: boolean;
  cancellationPolicy?: CancellationPolicyPayload | null;
}

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

export function resetCoachClubRouteStateForTests(): void {
  resetClubAuthorityRepositoryForTests();
}

function toContractRole(role: string | undefined): string {
  return parseOrganizationRole(role) ?? 'MEMBER';
}

function getActiveMemberships(clubMemberships: SeedRow[]): SeedRow[] {
  return clubMemberships.filter((row) => row.active !== false && !asString(row.deletedAt));
}

function getActiveRows(rows: SeedRow[]): SeedRow[] {
  return rows.filter((row) => row.active !== false && !asString(row.deletedAt));
}

function getViewerMembership(clubMemberships: SeedRow[], clubId: string, userId: string): SeedRow | null {
  return (
    getActiveMemberships(clubMemberships).find(
      (row) => asString(row.clubId) === clubId && asString(row.userId) === userId,
    ) ?? null
  );
}

function requireAuthUserId(authUserId: string | undefined): string {
  if (!authUserId) {
    throw forbidden('Authenticated user is required');
  }
  return authUserId;
}

function toDateOnly(value: string | undefined): string {
  if (!value) {
    return '';
  }
  return value.includes('T') ? value.slice(0, 10) : value;
}

function normalizeTime(value: string | undefined): string {
  return value?.slice(0, 5) ?? '00:00';
}

function mapAvailabilityTemplate(row: SeedRow) {
  return {
    id: asString(row.id) ?? '',
    coachId: asString(row.coachUserId) ?? '',
    dayOfWeek: Number(row.dayOfWeek ?? 0) as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    startTime: normalizeTime(asString(row.startTimeLocal)),
    endTime: normalizeTime(asString(row.endTimeLocal)),
    isRecurring: true,
    maxConcurrent: Number(row.maxConcurrent ?? 1),
    bufferMinutes: Number(row.bufferMinutes ?? row.bufferMinutesDefault ?? 15),
    location: asString(row.location),
    sessionTemplateId: asString(row.sessionTemplateId),
  };
}

function mapAvailabilityOverride(row: SeedRow) {
  const startTime = asString(row.startTimeLocal);
  const endTime = asString(row.endTimeLocal);
  const location = asString(row.location);
  return {
    id: asString(row.id) ?? '',
    coachId: asString(row.coachUserId) ?? '',
    date: toDateOnly(asString(row.overrideDate)),
    isBlocked: row.isBlocked === true,
    reason: asString(row.reason),
    customSlots:
      startTime && endTime
        ? [
            {
              date: toDateOnly(asString(row.overrideDate)),
              startTime: normalizeTime(startTime),
              endTime: normalizeTime(endTime),
              location,
            },
          ]
        : undefined,
    repeatUntil: toDateOnly(asString(row.repeatUntil)),
    repeatDayOfWeek: typeof row.repeatDayOfWeek === 'number'
      ? (row.repeatDayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6)
      : undefined,
    repeatGroupId: asString(row.repeatGroupId),
  };
}

function mapCoachSchedulingRules(row: SeedRow | undefined, coachUserId: string) {
  const now = new Date().toISOString();
  return {
    id: asString(row?.id) ?? `rules_${coachUserId}`,
    coachId: coachUserId,
    minimumAdvanceBookingHours: Number(row?.minimumAdvanceBookingHours ?? 24),
    maxAdvanceBookingDays: Number(row?.maxAdvanceBookingDays ?? 30),
    bufferMinutesDefault: Number(row?.bufferMinutesDefault ?? 15),
    maxConcurrentDefault: Number(row?.maxConcurrentDefault ?? 1),
    allowSameDayBookings: row?.allowSameDayBookings === true,
    cancellationPolicyId: asString(row?.cancellationPolicyId),
    createdAt: asString(row?.createdAt) ?? now,
    updatedAt: asString(row?.updatedAt) ?? now,
  };
}

function mapCancellationPolicy(rows: SeedRow[], coachUserId: string) {
  const activeRows = getActiveRows(rows)
    .filter((row) => asString(row.coachUserId) === coachUserId)
    .sort((left, right) => Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0));
  if (activeRows.length === 0) {
    return null;
  }

  const first = activeRows[0];
  return {
    id: asString(first.id) ?? `policy_${coachUserId}`,
    coachId: coachUserId,
    name: asString(first.name) ?? 'Cancellation policy',
    description: asString(first.description) ?? 'Coach-defined cancellation policy',
    tiers: activeRows
      .map((row) => ({
        hoursBeforeSession: Number(row.noticeHoursMin ?? 0),
        refundPercentage: Number(row.refundPercent ?? 0),
        description:
          asString(row.description)
          ?? `${Number(row.refundPercent ?? 0)}% refund if cancelled ${Number(row.noticeHoursMin ?? 0)}+ hours before`,
      }))
      .sort((left, right) => right.hoursBeforeSession - left.hoursBeforeSession),
    minimumNoticeHours: Math.min(...activeRows.map((row) => Number(row.noticeHoursMin ?? 0))),
    allowCancellations: activeRows.some((row) => Number(row.refundPercent ?? 0) > 0) || activeRows.length > 0,
    isDefault: activeRows[0]?.isDefault === true,
    createdAt: asString(first.createdAt) ?? new Date().toISOString(),
    updatedAt: asString(first.updatedAt) ?? asString(first.createdAt) ?? new Date().toISOString(),
  };
}

function canViewClubSchedule(params: {
  club: SeedRow;
  viewerMembership: SeedRow | null;
  isPrivilegedAdmin: boolean;
}): boolean {
  if (params.isPrivilegedAdmin || params.viewerMembership) {
    return true;
  }

  return asString(params.club.visibility) === 'public';
}

function requireClubScheduleAccess(params: {
  clubId: string | undefined;
  authUserId: string;
  isPrivilegedAdmin: boolean;
  store: ReturnType<typeof getMarketplaceSeedStore>;
}) {
  if (!params.clubId) {
    throw notFound('Club not found');
  }

  const clubs = asRows(params.store.tables.clubs);
  const clubMemberships = asRows(params.store.tables.clubMemberships);
  const club = clubs.find((row) => asString(row.id) === params.clubId);
  if (!club) {
    throw notFound('Club not found');
  }

  const viewerMembership = getViewerMembership(clubMemberships, params.clubId, params.authUserId);
  if (!canViewClubSchedule({ club, viewerMembership, isPrivilegedAdmin: params.isPrivilegedAdmin })) {
    throw forbidden('You do not have permission to view this club schedule');
  }

  return { club, viewerMembership };
}

const coachClubRoutes: FastifyPluginAsync = async (app) => {
  app.get('/coaches/me/profile', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const repository = resolveCoachSelfRepository();
    const result = await repository.getProfileBundle(authUserId);

    return reply.send({
      profile: result.profile,
      locations: result.locations,
      availabilityTemplates: result.availabilityTemplates,
      availabilityOverrides: result.availabilityOverrides,
      schedulingRules: result.schedulingRules,
      cancellationPolicyRules: result.cancellationPolicyRules,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.get('/coaches/me/offerings', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const repository = resolveCoachSelfRepository();
    const result = await repository.listOfferings(authUserId);

    return reply.send({
      offerings: result.offerings,
      total: result.offerings.length,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.get('/coaches/me/availability/templates', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const repository = resolveCoachSelfRepository();
    const result = await repository.listAvailabilityTemplateRows(authUserId);
    const templates = result.templates
      .map(mapAvailabilityTemplate);

    return reply.send({
      templates,
      total: templates.length,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.post('/coaches/me/availability/templates', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const body = request.body as {
      id?: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isRecurring?: boolean;
      maxConcurrent?: number;
      bufferMinutes?: number;
      location?: string;
      sessionTemplateId?: string;
    };
    const repository = resolveCoachSelfRepository();
    const { row, dataVersion } = await repository.createAvailabilityTemplate(authUserId, body);

    return reply.code(201).send({
      ...mapAvailabilityTemplate(row),
      seedVersion: dataVersion,
    });
  });

  app.patch('/coaches/me/availability/templates/:templateId', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const templateId = asString((request.params as { templateId?: string }).templateId) ?? '';
    const body = request.body as {
      dayOfWeek?: number;
      startTime?: string;
      endTime?: string;
      maxConcurrent?: number;
      bufferMinutes?: number;
      location?: string;
      sessionTemplateId?: string;
    };
    const repository = resolveCoachSelfRepository();
    const { row } = await repository.updateAvailabilityTemplate(authUserId, templateId, body);

    return reply.send(mapAvailabilityTemplate(row));
  });

  app.delete('/coaches/me/availability/templates/:templateId', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const templateId = asString((request.params as { templateId?: string }).templateId) ?? '';
    const repository = resolveCoachSelfRepository();
    await repository.deleteAvailabilityTemplate(authUserId, templateId);

    return reply.code(204).send();
  });

  app.get('/coaches/me/availability/overrides', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const query = request.query as { start?: string; end?: string };
    const repository = resolveCoachSelfRepository();
    const result = await repository.listAvailabilityOverrideRows(authUserId, query);
    const overrides = result.overrides
      .map(mapAvailabilityOverride)
      .filter((row) => (!query.start || row.date >= query.start) && (!query.end || row.date <= query.end));

    return reply.send({
      overrides,
      total: overrides.length,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.post('/coaches/me/availability/overrides', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const body = request.body as {
      id?: string;
      date: string;
      isBlocked: boolean;
      reason?: string;
      customSlots?: Array<{ startTime: string; endTime: string; location?: string }>;
      repeatUntil?: string;
      repeatDayOfWeek?: number;
      repeatGroupId?: string;
    };
    const repository = resolveCoachSelfRepository();
    const { row } = await repository.createAvailabilityOverride(authUserId, body);

    return reply.code(201).send(mapAvailabilityOverride(row));
  });

  app.patch('/coaches/me/availability/overrides/:overrideId', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const overrideId = asString((request.params as { overrideId?: string }).overrideId) ?? '';
    const body = request.body as {
      date?: string;
      isBlocked?: boolean;
      reason?: string;
      customSlots?: Array<{ startTime: string; endTime: string; location?: string }>;
      repeatUntil?: string;
      repeatDayOfWeek?: number;
      repeatGroupId?: string;
    };
    const repository = resolveCoachSelfRepository();
    const { row } = await repository.updateAvailabilityOverride(authUserId, overrideId, body);

    return reply.send(mapAvailabilityOverride(row));
  });

  app.delete('/coaches/me/availability/overrides/:overrideId', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const overrideId = asString((request.params as { overrideId?: string }).overrideId) ?? '';
    const repository = resolveCoachSelfRepository();
    await repository.deleteAvailabilityOverride(authUserId, overrideId);

    return reply.code(204).send();
  });

  app.get('/coaches/me/scheduling-rules', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const repository = resolveCoachSelfRepository();
    const result = await repository.getSchedulingRows(authUserId);
    const policy = mapCancellationPolicy(result.policyRows, authUserId);

    return reply.send({
      rules: mapCoachSchedulingRules(result.rulesRow, authUserId),
      cancellationPolicy: policy,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.patch('/coaches/me/scheduling-rules', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const body = (request.body as SchedulingRulesPatchBody) ?? {};
    const repository = resolveCoachSelfRepository();
    const result = await repository.patchSchedulingRows(authUserId, body);

    return reply.send({
      rules: mapCoachSchedulingRules(result.rulesRow, authUserId),
      cancellationPolicy: mapCancellationPolicy(result.policyRows, authUserId),
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.get('/coaches/me/verifications/:type/documents', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);

    const requestedType = asString((request.params as { type?: string }).type)?.toLowerCase();
    if (!requestedType) {
      throw notFound('Verification type is required');
    }

    const store = getMarketplaceSeedStore();
    const coachVerifications = asRows(store.tables.coachVerifications).filter((row) => {
      const owner = asString(row.coachUserId);
      const verificationType = asString(row.verificationType)?.toLowerCase();
      return owner === authUserId && verificationType === requestedType;
    });

    const verificationDocuments = asRows(store.tables.verificationDocuments);
    const mediaObjects = asRows(store.tables.mediaObjects);

    const documents = coachVerifications.map((verification) => {
      const verificationId = asString(verification.id);
      const linkedDocuments = verificationDocuments
        .filter((row) => asString(row.coachVerificationId) === verificationId)
        .map((row) => {
          const mediaObjectId = asString(row.mediaObjectId);
          const media = mediaObjects.find((item) => asString(item.id) === mediaObjectId) ?? null;
          return {
            ...row,
            mediaObject: media,
          };
        });

      return {
        verification,
        documents: linkedDocuments,
      };
    });

    return reply.send({
      type: requestedType,
      items: documents,
      total: documents.length,
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.get('/coaches/:coachId/availability/slots', async (request, reply) => {
    requireAuthUserId(request.auth?.userId);
    const coachUserId = asString((request.params as { coachId?: string }).coachId);
    if (!coachUserId) {
      throw notFound('Coach not found');
    }

    const query = parseAvailabilitySlotQuery(request.query as Record<string, unknown>);
    const store = getMarketplaceSeedStore();
    const slots = resolveCoachAvailabilitySlots({
      tables: store.tables,
      coachUserId,
      startDate: query.startDate,
      endDate: query.endDate,
      durationMinutes: query.durationMinutes,
      sessionTemplateId: query.sessionTemplateId,
      excludePendingInvites: query.excludePendingInvites,
      applySchedulingRules: query.applySchedulingRules,
    });

    return reply.send({
      coachId: coachUserId,
      slots,
      total: slots.length,
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.get('/clubs', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    const repository = resolveClubAuthorityRepository();
    const clubs = await repository.listVisibleClubs({ authUserId, isPrivilegedAdmin });
    const payload = clubs.map((club) => ({
      ...club,
      viewerGovernance: getClubGovernanceSnapshot(parseOrganizationRole(club.viewerMembership?.role)),
    }));

    return reply.send({
      clubs: payload,
      total: payload.length,
      requestId: request.requestId,
    });
  });

  app.get('/clubs/:clubId/schedule', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const clubId = asString((request.params as { clubId?: string }).clubId);
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    const store = getMarketplaceSeedStore();
    requireClubScheduleAccess({ clubId, authUserId, isPrivilegedAdmin, store });
    const resolvedClubId = clubId as string;

    const activities = buildClubScheduleActivities(store.tables, resolvedClubId);

    return reply.send({
      clubId: resolvedClubId,
      activities,
      total: activities.length,
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.get('/clubs/:clubId/schedule/:activityId', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const { clubId, activityId } = request.params as { clubId?: string; activityId?: string };
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    const store = getMarketplaceSeedStore();
    requireClubScheduleAccess({ clubId, authUserId, isPrivilegedAdmin, store });
    const resolvedClubId = clubId as string;

    const activity = activityId ? findClubScheduleActivity(store.tables, resolvedClubId, activityId) : null;
    if (!activity) {
      throw notFound('Club activity not found', { clubId: resolvedClubId, activityId });
    }

    return reply.send({
      clubId: resolvedClubId,
      activity,
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.get('/clubs/:clubId/invite-codes', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const clubId = asString((request.params as { clubId?: string }).clubId);
    if (!clubId) {
      throw notFound('Club not found');
    }
    const repository = resolveClubAuthorityRepository();
    const inviteCodes = await repository.listInviteCodes({ clubId, authUserId });

    return reply.send({
      inviteCodes,
      requestId: request.requestId,
    });
  });

  app.post('/clubs/:clubId/invite-codes', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const clubId = asString((request.params as { clubId?: string }).clubId);
    const role = toContractRole(asString((request.body as { role?: string }).role));
    if (!clubId) {
      throw notFound('Club not found');
    }
    const repository = resolveClubAuthorityRepository();
    const inviteCode = await repository.createInviteCode({ clubId, authUserId, role });

    return reply.code(201).send({
      inviteCode,
      requestId: request.requestId,
    });
  });

  app.delete('/clubs/:clubId/invite-codes/:code', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = request.params as { clubId?: string; code?: string };
    const clubId = asString(params.clubId);
    const code = asString(params.code) ?? '';
    if (!clubId || !code) {
      throw notFound('Invite code not found');
    }
    const repository = resolveClubAuthorityRepository();
    await repository.deleteInviteCode({ clubId, authUserId, code });

    return reply.code(204).send();
  });

  app.get('/clubs/join/resolve', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const code = asString((request.query as { code?: string }).code) ?? '';
    const repository = resolveClubAuthorityRepository();
    const preview = await repository.resolveJoinCode({ authUserId, code });

    return reply.send({
      preview,
      requestId: request.requestId,
    });
  });

  app.post('/clubs/join', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const code = asString((request.body as { code?: string }).code) ?? '';
    const repository = resolveClubAuthorityRepository();
    const result = await repository.joinWithCode({
      authUserId,
      code,
      actingAuthCanUseStaffLinks: canUseStaffInviteLinks(request.auth),
    });

    return reply.code(result.outcome === 'invite_pending' ? 202 : result.outcome === 'joined' ? 201 : 200).send({
      ...result,
      requestId: request.requestId,
    });
  });

  app.get('/clubs/invites', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const repository = resolveClubAuthorityRepository();
    const invites = await repository.listPendingInvites({ authUserId });

    return reply.send({
      invites,
      requestId: request.requestId,
    });
  });

  app.post('/clubs/invites/:inviteId/respond', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const inviteId = asString((request.params as { inviteId?: string }).inviteId);
    const response = asString((request.body as { response?: string }).response)?.toLowerCase();
    if (!inviteId || (response !== 'accepted' && response !== 'declined')) {
      throw notFound('Club invite not found');
    }
    const repository = resolveClubAuthorityRepository();
    const result = await repository.respondToInvite({ authUserId, inviteId, response });

    return reply.send({
      ...result,
      requestId: request.requestId,
    });
  });
};

export default coachClubRoutes;
