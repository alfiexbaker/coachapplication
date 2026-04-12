import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import {
  canUseClubCapability,
  getClubGovernanceSnapshot,
  parseOrganizationRole,
} from '@clubroom/shared-contracts';
import { canUseStaffInviteLinks, isPrivilegedAdminAuth } from '../../lib/authz.js';
import { forbidden, notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { buildClubScheduleActivities } from './schedule.js';

type SeedRow = Record<string, unknown>;

interface ClubInviteCodeRow {
  id: string;
  clubId: string;
  code: string;
  role: string;
  createdByUserId: string;
  createdAt: string;
  expiresAt: string;
  remainingUses: number;
}

interface PendingClubInviteRow {
  id: string;
  clubId: string;
  targetUserId: string;
  inviteCode: string;
  role: string;
  invitedByUserId: string;
  invitedByLabel: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  expiresAt: string;
  respondedAt?: string | null;
}

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
const isTruthy = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;

let inviteCodesStore: ClubInviteCodeRow[] | null = null;
let pendingClubInvitesStore: PendingClubInviteRow[] = [];

export function resetCoachClubRouteStateForTests(): void {
  inviteCodesStore = null;
  pendingClubInvitesStore = [];
}

function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

function toStoreRole(role: string): string {
  if (role === 'ADMIN') {
    return 'club_admin';
  }
  return role.toLowerCase();
}

function toContractRole(role: string | undefined): string {
  return parseOrganizationRole(role) ?? 'MEMBER';
}

function buildCodePrefix(clubName: string): string {
  const normalized = clubName.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return normalized.slice(0, 5) || 'CLUB';
}

function buildInviteCode(clubName: string, role: string): string {
  const suffix = role === 'MEMBER' ? 'JOIN' : role.replace(/[^A-Za-z]/g, '').slice(0, 4) || 'TEAM';
  return `${buildCodePrefix(clubName)}-${suffix}`;
}

function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function ensureInviteCodesStore(): ClubInviteCodeRow[] {
  if (inviteCodesStore) {
    return inviteCodesStore;
  }

  const store = getMarketplaceSeedStore();
  const clubs = asRows(store.tables.clubs);

  inviteCodesStore = clubs.flatMap((club) => {
    const clubId = asString(club.id);
    const clubName = asString(club.name);
    const createdByUserId = asString(club.createdByUserId);
    if (!clubId || !clubName || !createdByUserId) {
      return [];
    }

    const createdAt = asString(club.createdAt) ?? new Date().toISOString();
    return [
      {
        id: `cinv_${randomUUID()}`,
        clubId,
        code: buildInviteCode(clubName, 'MEMBER'),
        role: 'MEMBER',
        createdByUserId,
        createdAt,
        expiresAt: addDaysIso(365),
        remainingUses: 999,
      },
      {
        id: `cinv_${randomUUID()}`,
        clubId,
        code: buildInviteCode(clubName, 'COACH'),
        role: 'COACH',
        createdByUserId,
        createdAt,
        expiresAt: addDaysIso(30),
        remainingUses: 25,
      },
    ];
  });

  return inviteCodesStore;
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

function toIsoDate(date: string): string {
  return `${date}T00:00:00.000Z`;
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

function findOwnedTemplate(rows: SeedRow[], coachUserId: string, templateId: string): SeedRow | null {
  return getActiveRows(rows).find(
    (row) => asString(row.id) === templateId && asString(row.coachUserId) === coachUserId,
  ) ?? null;
}

function findOwnedOverride(rows: SeedRow[], coachUserId: string, overrideId: string): SeedRow | null {
  return getActiveRows(rows).find(
    (row) => asString(row.id) === overrideId && asString(row.coachUserId) === coachUserId,
  ) ?? null;
}

function requireManageInvites(membershipRole: string | undefined): void {
  const viewerRole = parseOrganizationRole(membershipRole);
  if (!viewerRole || !canUseClubCapability(viewerRole, 'manage_staff_and_invites')) {
    throw forbidden('You do not have permission to manage club invites');
  }
}

function mapMembershipSummary(row: SeedRow) {
  return {
    id: asString(row.id) ?? '',
    clubId: asString(row.clubId) ?? '',
    userId: asString(row.userId) ?? '',
    role: toContractRole(asString(row.role)),
    active: row.active !== false,
    createdAt: asString(row.createdAt) ?? new Date().toISOString(),
    updatedAt: asString(row.updatedAt) ?? asString(row.createdAt) ?? new Date().toISOString(),
  };
}

function mapClubSummary(club: SeedRow, inviteCode: string) {
  return {
    id: asString(club.id) ?? '',
    name: asString(club.name) ?? 'Club',
    slug: asString(club.slug),
    visibility: asString(club.visibility),
    inviteCode,
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

function getInviteCodeForRole(clubId: string, role: string): ClubInviteCodeRow | undefined {
  return ensureInviteCodesStore().find(
    (invite) =>
      invite.clubId === clubId
      && invite.role === role
      && invite.remainingUses > 0
      && new Date(invite.expiresAt).getTime() > Date.now(),
  );
}

function getInviteByCode(code: string): ClubInviteCodeRow | undefined {
  const normalized = normalizeInviteCode(code);
  return ensureInviteCodesStore().find(
    (invite) =>
      normalizeInviteCode(invite.code) === normalized
      && invite.remainingUses > 0
      && new Date(invite.expiresAt).getTime() > Date.now(),
  );
}

function createMembership(clubId: string, userId: string, role: string, createdByUserId: string): SeedRow {
  const now = new Date().toISOString();
  return {
    id: `cmb_${randomUUID()}`,
    clubId,
    userId,
    role: toStoreRole(role),
    active: true,
    createdAt: now,
    updatedAt: now,
    createdByUserId,
    updatedByUserId: createdByUserId,
    version: 1,
    deletedAt: null,
    deletedByUserId: null,
  };
}

const coachClubRoutes: FastifyPluginAsync = async (app) => {
  app.get('/coaches/me/profile', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);

    const store = getMarketplaceSeedStore();
    const coachProfiles = asRows(store.tables.coachProfiles);
    const coachLocations = asRows(store.tables.coachLocations);
    const availabilityTemplates = asRows(store.tables.availabilityTemplates);
    const availabilityOverrides = asRows(store.tables.availabilityOverrides);
    const schedulingRules = asRows(store.tables.schedulingRules);
    const cancellationPolicyRules = asRows(store.tables.cancellationPolicyRules);

    const profile = coachProfiles.find((row) => asString(row.userId) === authUserId);
    if (!profile) {
      throw notFound('Coach profile not found', { userId: authUserId });
    }

    const cancellationPolicyId = asString(
      schedulingRules.find((row) => asString(row.coachUserId) === authUserId)?.cancellationPolicyId,
    );

    return reply.send({
      profile,
      locations: coachLocations.filter((row) => asString(row.coachUserId) === authUserId),
      availabilityTemplates: availabilityTemplates.filter((row) => asString(row.coachUserId) === authUserId),
      availabilityOverrides: availabilityOverrides.filter((row) => asString(row.coachUserId) === authUserId),
      schedulingRules: schedulingRules.filter((row) => asString(row.coachUserId) === authUserId),
      cancellationPolicyRules: cancellationPolicyRules.filter((row) =>
        asString(row.coachUserId) === authUserId
        || (cancellationPolicyId && asString(row.id) === cancellationPolicyId)
      ),
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.get('/coaches/me/offerings', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);

    const store = getMarketplaceSeedStore();
    const offerings = asRows(store.tables.coachingOfferings).filter(
      (row) => asString(row.coachUserId) === authUserId,
    );

    return reply.send({
      offerings,
      total: offerings.length,
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.get('/coaches/me/availability/templates', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const store = getMarketplaceSeedStore();
    const templates = getActiveRows(asRows(store.tables.availabilityTemplates))
      .filter((row) => asString(row.coachUserId) === authUserId)
      .map(mapAvailabilityTemplate);

    return reply.send({
      templates,
      total: templates.length,
      seedVersion: store.version,
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
    const now = new Date().toISOString();
    const store = getMarketplaceSeedStore();
    const templates = asRows(store.tables.availabilityTemplates);

    const row: SeedRow = {
      id: body.id ?? `avt_${randomUUID()}`,
      coachUserId: authUserId,
      dayOfWeek: body.dayOfWeek,
      startTimeLocal: normalizeTime(body.startTime),
      endTimeLocal: normalizeTime(body.endTime),
      maxConcurrent: Number(body.maxConcurrent ?? 1),
      bufferMinutes: Number(body.bufferMinutes ?? 15),
      location: body.location ?? null,
      sessionTemplateId: body.sessionTemplateId ?? null,
      active: true,
      createdAt: now,
      updatedAt: now,
      createdByUserId: authUserId,
      updatedByUserId: authUserId,
      version: 1,
      deletedAt: null,
      deletedByUserId: null,
    };
    templates.push(row);

    return reply.code(201).send(mapAvailabilityTemplate(row));
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
    const store = getMarketplaceSeedStore();
    const templates = asRows(store.tables.availabilityTemplates);
    const existing = findOwnedTemplate(templates, authUserId, templateId);
    if (!existing) {
      throw notFound('Availability template not found', { templateId });
    }

    if (body.dayOfWeek !== undefined) existing.dayOfWeek = body.dayOfWeek;
    if (body.startTime !== undefined) existing.startTimeLocal = normalizeTime(body.startTime);
    if (body.endTime !== undefined) existing.endTimeLocal = normalizeTime(body.endTime);
    if (body.maxConcurrent !== undefined) existing.maxConcurrent = Number(body.maxConcurrent);
    if (body.bufferMinutes !== undefined) existing.bufferMinutes = Number(body.bufferMinutes);
    if (body.location !== undefined) existing.location = body.location || null;
    if (body.sessionTemplateId !== undefined) existing.sessionTemplateId = body.sessionTemplateId || null;
    existing.updatedAt = new Date().toISOString();
    existing.updatedByUserId = authUserId;
    existing.version = Number(existing.version ?? 1) + 1;

    return reply.send(mapAvailabilityTemplate(existing));
  });

  app.delete('/coaches/me/availability/templates/:templateId', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const templateId = asString((request.params as { templateId?: string }).templateId) ?? '';
    const store = getMarketplaceSeedStore();
    const templates = asRows(store.tables.availabilityTemplates);
    const existing = findOwnedTemplate(templates, authUserId, templateId);
    if (!existing) {
      throw notFound('Availability template not found', { templateId });
    }

    existing.active = false;
    existing.deletedAt = new Date().toISOString();
    existing.deletedByUserId = authUserId;
    existing.updatedAt = existing.deletedAt;
    existing.updatedByUserId = authUserId;

    return reply.code(204).send();
  });

  app.get('/coaches/me/availability/overrides', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const query = request.query as { start?: string; end?: string };
    const store = getMarketplaceSeedStore();
    const overrides = getActiveRows(asRows(store.tables.availabilityOverrides))
      .filter((row) => asString(row.coachUserId) === authUserId)
      .map(mapAvailabilityOverride)
      .filter((row) => (!query.start || row.date >= query.start) && (!query.end || row.date <= query.end));

    return reply.send({
      overrides,
      total: overrides.length,
      seedVersion: store.version,
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
    const customSlot = body.customSlots?.[0];
    const now = new Date().toISOString();
    const store = getMarketplaceSeedStore();
    const overrides = asRows(store.tables.availabilityOverrides);
    const row: SeedRow = {
      id: body.id ?? `avo_${randomUUID()}`,
      coachUserId: authUserId,
      overrideDate: toIsoDate(body.date),
      isBlocked: body.isBlocked,
      reason: body.reason ?? null,
      startTimeLocal: customSlot ? normalizeTime(customSlot.startTime) : null,
      endTimeLocal: customSlot ? normalizeTime(customSlot.endTime) : null,
      location: customSlot?.location ?? null,
      repeatUntil: body.repeatUntil ? toIsoDate(body.repeatUntil) : null,
      repeatDayOfWeek: body.repeatDayOfWeek ?? null,
      repeatGroupId: body.repeatGroupId ?? null,
      active: true,
      createdAt: now,
      updatedAt: now,
      createdByUserId: authUserId,
      updatedByUserId: authUserId,
      version: 1,
      deletedAt: null,
      deletedByUserId: null,
    };
    overrides.push(row);

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
    const store = getMarketplaceSeedStore();
    const overrides = asRows(store.tables.availabilityOverrides);
    const existing = findOwnedOverride(overrides, authUserId, overrideId);
    if (!existing) {
      throw notFound('Availability override not found', { overrideId });
    }

    const customSlot = body.customSlots?.[0];
    if (body.date !== undefined) existing.overrideDate = toIsoDate(body.date);
    if (body.isBlocked !== undefined) existing.isBlocked = body.isBlocked;
    if (body.reason !== undefined) existing.reason = body.reason || null;
    if (body.customSlots !== undefined) {
      existing.startTimeLocal = customSlot ? normalizeTime(customSlot.startTime) : null;
      existing.endTimeLocal = customSlot ? normalizeTime(customSlot.endTime) : null;
      existing.location = customSlot?.location ?? null;
    }
    if (body.repeatUntil !== undefined) existing.repeatUntil = body.repeatUntil ? toIsoDate(body.repeatUntil) : null;
    if (body.repeatDayOfWeek !== undefined) existing.repeatDayOfWeek = body.repeatDayOfWeek;
    if (body.repeatGroupId !== undefined) existing.repeatGroupId = body.repeatGroupId || null;
    existing.updatedAt = new Date().toISOString();
    existing.updatedByUserId = authUserId;
    existing.version = Number(existing.version ?? 1) + 1;

    return reply.send(mapAvailabilityOverride(existing));
  });

  app.delete('/coaches/me/availability/overrides/:overrideId', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const overrideId = asString((request.params as { overrideId?: string }).overrideId) ?? '';
    const store = getMarketplaceSeedStore();
    const overrides = asRows(store.tables.availabilityOverrides);
    const existing = findOwnedOverride(overrides, authUserId, overrideId);
    if (!existing) {
      throw notFound('Availability override not found', { overrideId });
    }

    existing.active = false;
    existing.deletedAt = new Date().toISOString();
    existing.deletedByUserId = authUserId;
    existing.updatedAt = existing.deletedAt;
    existing.updatedByUserId = authUserId;

    return reply.code(204).send();
  });

  app.get('/coaches/me/scheduling-rules', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const store = getMarketplaceSeedStore();
    const rulesRow = asRows(store.tables.schedulingRules).find((row) => asString(row.coachUserId) === authUserId);
    const policy = mapCancellationPolicy(asRows(store.tables.cancellationPolicyRules), authUserId);

    return reply.send({
      rules: mapCoachSchedulingRules(rulesRow, authUserId),
      cancellationPolicy: policy,
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.patch('/coaches/me/scheduling-rules', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const body = (request.body as SchedulingRulesPatchBody) ?? {};
    const store = getMarketplaceSeedStore();
    const rulesRows = asRows(store.tables.schedulingRules);
    const policyRows = asRows(store.tables.cancellationPolicyRules);
    const now = new Date().toISOString();

    let rulesRow = rulesRows.find((row) => asString(row.coachUserId) === authUserId);
    if (!rulesRow) {
      rulesRow = {
        id: `csr_${randomUUID()}`,
        coachUserId: authUserId,
        createdAt: now,
        updatedAt: now,
        minimumAdvanceBookingHours: 24,
        maxAdvanceBookingDays: 30,
        bufferMinutesDefault: 15,
        maxConcurrentDefault: 1,
        allowSameDayBookings: false,
      };
      rulesRows.push(rulesRow);
    }

    if (body.minimumAdvanceBookingHours !== undefined) {
      rulesRow.minimumAdvanceBookingHours = Number(body.minimumAdvanceBookingHours);
    }
    if (body.maxAdvanceBookingDays !== undefined) {
      rulesRow.maxAdvanceBookingDays = Number(body.maxAdvanceBookingDays);
    }
    if (body.bufferMinutesDefault !== undefined) {
      rulesRow.bufferMinutesDefault = Number(body.bufferMinutesDefault);
    }
    if (body.maxConcurrentDefault !== undefined) {
      rulesRow.maxConcurrentDefault = Number(body.maxConcurrentDefault);
    }
    if (body.allowSameDayBookings !== undefined) {
      rulesRow.allowSameDayBookings = body.allowSameDayBookings;
    }
    rulesRow.updatedAt = now;

    if (body.cancellationPolicy !== undefined) {
      for (const row of policyRows) {
        if (asString(row.coachUserId) === authUserId && !asString(row.deletedAt)) {
          row.active = false;
          row.deletedAt = now;
          row.deletedByUserId = authUserId;
          row.updatedAt = now;
          row.updatedByUserId = authUserId;
        }
      }

      if (body.cancellationPolicy) {
        const nextPolicyId = `cpr_${randomUUID()}`;
        body.cancellationPolicy.tiers.forEach((tier, index) => {
          policyRows.push({
            id: index === 0 ? nextPolicyId : `cpr_${randomUUID()}`,
            coachUserId: authUserId,
            name: body.cancellationPolicy?.name ?? 'Cancellation policy',
            description: body.cancellationPolicy?.description ?? null,
            noticeHoursMin: Number(tier.hoursBeforeSession),
            refundPercent: Number(tier.refundPercentage),
            active: true,
            appliesToNoShow: Number(tier.hoursBeforeSession) === 0,
            feeMinor: null,
            currency: 'GBP',
            sortOrder: index + 1,
            isDefault: body.cancellationPolicy?.isDefault ?? false,
            createdAt: now,
            updatedAt: now,
            createdByUserId: authUserId,
            updatedByUserId: authUserId,
            version: 1,
            deletedAt: null,
            deletedByUserId: null,
          });
        });
        rulesRow.cancellationPolicyId = nextPolicyId;
      }
    }

    return reply.send({
      rules: mapCoachSchedulingRules(rulesRow, authUserId),
      cancellationPolicy: mapCancellationPolicy(policyRows, authUserId),
      seedVersion: store.version,
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

  app.get('/clubs', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);

    const store = getMarketplaceSeedStore();
    const clubs = asRows(store.tables.clubs);
    const clubMemberships = asRows(store.tables.clubMemberships);
    const squads = asRows(store.tables.squads);

    const allowedClubIds = new Set(
      getActiveMemberships(clubMemberships)
        .filter((row) => asString(row.userId) === authUserId)
        .map((row) => asString(row.clubId))
        .filter(isTruthy),
    );

    const visibleClubs = clubs.filter((club) => {
      if (isPrivilegedAdmin) {
        return true;
      }
      const clubId = asString(club.id);
      return Boolean(clubId && allowedClubIds.has(clubId));
    });

    const payload = visibleClubs.map((club) => {
      const clubId = asString(club.id);
      const memberships = getActiveMemberships(clubMemberships).filter(
        (row) => asString(row.clubId) === clubId,
      );
      const clubSquads = squads.filter((row) => asString(row.clubId) === clubId);
      const viewerMembership = memberships.find((row) => asString(row.userId) === authUserId) ?? null;
      const viewerRole = parseOrganizationRole(asString(viewerMembership?.role));
      const primaryInviteCode = getInviteCodeForRole(clubId ?? '', 'MEMBER');
      return {
        ...club,
        inviteCode: primaryInviteCode?.code ?? null,
        memberships,
        viewerMembership,
        viewerGovernance: getClubGovernanceSnapshot(viewerRole),
        squads: clubSquads,
      };
    });

    return reply.send({
      clubs: payload,
      total: payload.length,
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.get('/clubs/:clubId/schedule', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const clubId = asString((request.params as { clubId?: string }).clubId);
    if (!clubId) {
      throw notFound('Club not found');
    }

    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    const store = getMarketplaceSeedStore();
    const clubs = asRows(store.tables.clubs);
    const clubMemberships = asRows(store.tables.clubMemberships);
    const club = clubs.find((row) => asString(row.id) === clubId);
    if (!club) {
      throw notFound('Club not found');
    }

    const viewerMembership = getViewerMembership(clubMemberships, clubId, authUserId);
    if (!canViewClubSchedule({ club, viewerMembership, isPrivilegedAdmin })) {
      throw forbidden('You do not have permission to view this club schedule');
    }

    const activities = buildClubScheduleActivities(store.tables, clubId);

    return reply.send({
      clubId,
      activities,
      total: activities.length,
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

    const store = getMarketplaceSeedStore();
    const clubMemberships = asRows(store.tables.clubMemberships);
    const viewerMembership = getViewerMembership(clubMemberships, clubId, authUserId);
    requireManageInvites(asString(viewerMembership?.role));

    return reply.send({
      inviteCodes: ensureInviteCodesStore().filter((invite) => invite.clubId === clubId),
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

    const store = getMarketplaceSeedStore();
    const clubs = asRows(store.tables.clubs);
    const clubMemberships = asRows(store.tables.clubMemberships);
    const club = clubs.find((row) => asString(row.id) === clubId);
    if (!club) {
      throw notFound('Club not found');
    }

    const viewerMembership = getViewerMembership(clubMemberships, clubId, authUserId);
    requireManageInvites(asString(viewerMembership?.role));

    const inviteCode: ClubInviteCodeRow = {
      id: `cinv_${randomUUID()}`,
      clubId,
      code: `${buildInviteCode(asString(club.name) ?? 'Club', role)}-${randomUUID().slice(0, 4).toUpperCase()}`,
      role,
      createdByUserId: authUserId,
      createdAt: new Date().toISOString(),
      expiresAt: addDaysIso(role === 'MEMBER' ? 365 : 30),
      remainingUses: role === 'MEMBER' ? 999 : 25,
    };

    inviteCodesStore = [
      ...ensureInviteCodesStore().filter(
        (invite) => !(invite.clubId === clubId && invite.role === role && role !== 'MEMBER'),
      ),
      inviteCode,
    ];

    return reply.code(201).send({
      inviteCode,
      requestId: request.requestId,
    });
  });

  app.delete('/clubs/:clubId/invite-codes/:code', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = request.params as { clubId?: string; code?: string };
    const clubId = asString(params.clubId);
    const code = normalizeInviteCode(asString(params.code) ?? '');
    if (!clubId || !code) {
      throw notFound('Invite code not found');
    }

    const store = getMarketplaceSeedStore();
    const clubMemberships = asRows(store.tables.clubMemberships);
    const viewerMembership = getViewerMembership(clubMemberships, clubId, authUserId);
    requireManageInvites(asString(viewerMembership?.role));

    inviteCodesStore = ensureInviteCodesStore().filter(
      (invite) => !(invite.clubId === clubId && normalizeInviteCode(invite.code) === code),
    );

    return reply.code(204).send();
  });

  app.get('/clubs/join/resolve', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const code = normalizeInviteCode(asString((request.query as { code?: string }).code) ?? '');
    const inviteCode = getInviteByCode(code);
    if (!inviteCode) {
      throw notFound('Invite code not found');
    }

    const store = getMarketplaceSeedStore();
    const clubs = asRows(store.tables.clubs);
    const clubMemberships = asRows(store.tables.clubMemberships);
    const club = clubs.find((row) => asString(row.id) === inviteCode.clubId);
    if (!club) {
      throw notFound('Club not found');
    }

    const existingMembership = getViewerMembership(clubMemberships, inviteCode.clubId, authUserId);

    return reply.send({
      preview: {
        clubId: inviteCode.clubId,
        clubName: asString(club.name) ?? 'Club',
        clubSlug: asString(club.slug),
        visibility: asString(club.visibility),
        inviteCode: inviteCode.code,
        role: inviteCode.role,
        joinFlow: inviteCode.role === 'MEMBER' ? 'direct_join' : 'invite_review',
        expiresAt: inviteCode.expiresAt,
        alreadyMember: Boolean(existingMembership),
      },
      requestId: request.requestId,
    });
  });

  app.post('/clubs/join', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const code = normalizeInviteCode(asString((request.body as { code?: string }).code) ?? '');
    const inviteCode = getInviteByCode(code);
    if (!inviteCode) {
      throw notFound('Invite code not found');
    }

    const store = getMarketplaceSeedStore();
    const clubs = asRows(store.tables.clubs);
    const clubMemberships = asRows(store.tables.clubMemberships);
    const club = clubs.find((row) => asString(row.id) === inviteCode.clubId);
    if (!club) {
      throw notFound('Club not found');
    }

    const existingMembership = getViewerMembership(clubMemberships, inviteCode.clubId, authUserId);
    if (existingMembership) {
      return reply.send({
        outcome: 'already_member',
        club: mapClubSummary(club, inviteCode.code),
        membership: mapMembershipSummary(existingMembership),
        invite: null,
        requestId: request.requestId,
      });
    }

    const isStaffInvite = inviteCode.role !== 'MEMBER';
    if (isStaffInvite && !canUseStaffInviteLinks(request.auth)) {
      throw forbidden('Only coach or admin accounts can use staff invite links');
    }

    if (!isStaffInvite) {
      const membership = createMembership(inviteCode.clubId, authUserId, inviteCode.role, inviteCode.createdByUserId);
      clubMemberships.push(membership);
      inviteCode.remainingUses = Math.max(0, inviteCode.remainingUses - 1);

      return reply.code(201).send({
        outcome: 'joined',
        club: mapClubSummary(club, inviteCode.code),
        membership: mapMembershipSummary(membership),
        invite: null,
        requestId: request.requestId,
      });
    }

    const existingPending = pendingClubInvitesStore.find(
      (invite) =>
        invite.clubId === inviteCode.clubId
        && invite.targetUserId === authUserId
        && invite.role === inviteCode.role
        && invite.status === 'pending',
    );

    const pendingInvite =
      existingPending
      ?? {
        id: `cpi_${randomUUID()}`,
        clubId: inviteCode.clubId,
        targetUserId: authUserId,
        inviteCode: inviteCode.code,
        role: inviteCode.role,
        invitedByUserId: inviteCode.createdByUserId,
        invitedByLabel: 'Club staff',
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        expiresAt: inviteCode.expiresAt,
        respondedAt: null,
      };

    if (!existingPending) {
      pendingClubInvitesStore.push(pendingInvite);
    }

    return reply.code(202).send({
      outcome: 'invite_pending',
      club: mapClubSummary(club, inviteCode.code),
      membership: null,
      invite: {
        ...pendingInvite,
        clubName: asString(club.name) ?? 'Club',
      },
      requestId: request.requestId,
    });
  });

  app.get('/clubs/invites', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const store = getMarketplaceSeedStore();
    const clubs = asRows(store.tables.clubs);

    const invites = pendingClubInvitesStore
      .filter(
        (invite) =>
          invite.targetUserId === authUserId
          && invite.status === 'pending'
          && new Date(invite.expiresAt).getTime() > Date.now(),
      )
      .map((invite) => ({
        ...invite,
        clubName:
          asString(clubs.find((club) => asString(club.id) === invite.clubId)?.name) ?? 'Club',
      }));

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

    const store = getMarketplaceSeedStore();
    const clubs = asRows(store.tables.clubs);
    const clubMemberships = asRows(store.tables.clubMemberships);
    const invite = pendingClubInvitesStore.find((row) => row.id === inviteId && row.targetUserId === authUserId);
    if (!invite) {
      throw notFound('Club invite not found');
    }

    const club = clubs.find((row) => asString(row.id) === invite.clubId);
    if (!club) {
      throw notFound('Club not found');
    }

    invite.status = response;
    invite.respondedAt = new Date().toISOString();

    let membership: SeedRow | null = getViewerMembership(clubMemberships, invite.clubId, authUserId);
    if (response === 'accepted' && !membership) {
      membership = createMembership(invite.clubId, authUserId, invite.role, invite.invitedByUserId);
      clubMemberships.push(membership);
    }

    return reply.send({
      invite: {
        ...invite,
        clubName: asString(club.name) ?? 'Club',
      },
      membership: membership ? mapMembershipSummary(membership) : null,
      club: mapClubSummary(club, invite.inviteCode),
      requestId: request.requestId,
    });
  });
};

export default coachClubRoutes;
