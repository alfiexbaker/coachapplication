import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  canUseClubCapability,
  isClubStaffRole,
  parseOrganizationRole,
  type ClubRole,
} from '@clubroom/shared-contracts';
import { recordAuditEvent } from '../../lib/audit-runtime.js';
import { isPrivilegedAdminAuth } from '../../lib/authz.js';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { ApiProblemError, badRequest, forbidden, notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

type StaffingStatus = 'active' | 'cancelled' | 'completed' | 'full';
type StaffingSessionType = '1on1' | 'group';

interface StaffingClub {
  id: string;
  name: string;
  city: string;
  memberCount: number;
  coachCount: number;
  squadCount: number;
  ownerId: string;
  inviteCode: string;
  tagline?: string;
  photoUrl?: string;
  profilePhotoUrl?: string;
  coverPhotoUrl?: string;
}

interface StaffingMembership {
  clubId: string;
  userId: string;
  role: ClubRole;
  status: 'active' | 'pending';
  joinSource: 'invite' | 'created';
  squadIds?: string[];
  canPostAsClub?: boolean;
}

interface StaffingStaffMember {
  userId: string;
  label: string;
  role: ClubRole;
  status: 'active' | 'pending';
  canTakeAssignments: boolean;
  assignedToday: number;
  upcomingLoad: number;
  nextSessionAt?: string;
}

interface StaffingWorkItem {
  offeringId: string;
  title: string;
  scheduledAt: string;
  location: string;
  status: StaffingStatus;
  sessionType: StaffingSessionType;
  currentParticipants: number;
  maxParticipants: number;
  createdByName?: string;
  createdByRole?: string;
  ownerCoachId?: string;
  ownerCoachName?: string;
  assigneeCoachId?: string;
  assigneeCoachName?: string;
  linkedBookingCount: number;
  isRecurring: boolean;
}

export interface StaffingConsoleData {
  club: StaffingClub;
  viewerMembership: StaffingMembership;
  canManageAssignments: boolean;
  canPostAsClub: boolean;
  staff: StaffingStaffMember[];
  unassignedWork: StaffingWorkItem[];
  assignedWork: StaffingWorkItem[];
  summary: {
    activeOrgSessions: number;
    assignedToday: number;
    upcomingAssignedLoad: number;
    unassignedCount: number;
  };
}

interface AssignmentOffering {
  id: string;
  source: 'group';
  sourceEntityId: string;
  coachId: string;
  clubId: string;
  actingAs: 'club';
  ownerCoachId: string;
  assigneeCoachId: string;
  title: string;
  description?: string;
  sessionType: StaffingSessionType;
  maxParticipants: number;
  location: string;
  scheduledAt: string;
  isRecurring: boolean;
  recurrenceType: 'none' | 'weekly';
  status: StaffingStatus;
  registrations: [];
  createdAt: string;
}

interface AssignmentMutationResult {
  offering: AssignmentOffering;
  updatedBookingIds: string[];
  previousCoachUserId: string | null;
  assigneeCoachId: string;
}

interface SessionProjection {
  id: string;
  coachUserId?: string | null;
  clubId?: string | null;
  createdByUserId?: string | null;
  description?: string | null;
  title: string;
  sessionType?: string | null;
  maxParticipants: number;
  currentParticipants: number;
  location?: string | null;
  isVirtual?: boolean | null;
  status?: string | null;
  scheduleJson?: unknown;
  createdAt?: string | Date | null;
}

interface ScheduleEntry {
  startsAt?: string;
  endsAt?: string;
}

const clubParamsSchema = z.object({
  clubId: z.string().min(1),
});

const workAssignmentParamsSchema = z.object({
  clubId: z.string().min(1),
  assignmentId: z.string().min(1),
});

const workAssignmentBodySchema = z
  .object({
    assigneeCoachId: z.string().min(1),
  })
  .strict();

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

function requireAuthUserId(authUserId: string | undefined): string {
  if (!authUserId) {
    throw forbidden('Authenticated user is required');
  }
  return authUserId;
}

function toIso(value: unknown): string | undefined {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return asString(value);
}

function toRole(value: unknown): ClubRole {
  return parseOrganizationRole(value) ?? 'MEMBER';
}

function canReadStaffing(role: ClubRole | null): boolean {
  return Boolean(
    role &&
      (canUseClubCapability(role, 'view_org_dashboard') ||
        canUseClubCapability(role, 'create_org_sessions', { hasGrant: role === 'COACH' })),
  );
}

function canManageAssignments(role: ClubRole | null): boolean {
  return Boolean(role && canUseClubCapability(role, 'assign_session_coach'));
}

function canChangeAssignment(
  role: ClubRole | null,
  currentCoachUserId: string | undefined | null,
  nextCoachUserId: string,
): boolean {
  if (!role) {
    return false;
  }
  const isReassignment = Boolean(currentCoachUserId && currentCoachUserId !== nextCoachUserId);
  return canUseClubCapability(
    role,
    isReassignment ? 'reassign_session_coach' : 'assign_session_coach',
  );
}

function canPostAsClub(role: ClubRole | null): boolean {
  return Boolean(
    role && canUseClubCapability(role, 'post_as_org', { hasGrant: role === 'COACH' }),
  );
}

function isActiveSession(status: string | undefined | null): boolean {
  const normalized = status?.toUpperCase();
  return normalized !== 'CANCELLED' && normalized !== 'COMPLETED';
}

function mapSessionStatus(status: string | undefined | null): StaffingStatus {
  const normalized = status?.toUpperCase();
  if (normalized === 'CANCELLED') return 'cancelled';
  if (normalized === 'COMPLETED') return 'completed';
  if (normalized === 'FULL') return 'full';
  return 'active';
}

function parseScheduleEntries(value: unknown): ScheduleEntry[] {
  return Array.isArray(value)
    ? value.flatMap((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
          return [];
        }
        return [entry as ScheduleEntry];
      })
    : [];
}

function pickScheduledAt(session: SessionProjection): string {
  const entries = parseScheduleEntries(session.scheduleJson)
    .flatMap((entry) => {
      const startsAt = asString(entry.startsAt);
      if (!startsAt) return [];
      const time = new Date(startsAt).getTime();
      return Number.isFinite(time) ? [{ startsAt, time }] : [];
    })
    .sort((left, right) => left.time - right.time);
  const now = Date.now();
  return (
    entries.find((entry) => entry.time >= now)?.startsAt ??
    entries[0]?.startsAt ??
    toIso(session.createdAt) ??
    new Date(0).toISOString()
  );
}

function isToday(iso: string): boolean {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  const now = new Date();
  return date.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
}

function isUpcoming(iso: string): boolean {
  const time = new Date(iso).getTime();
  return Number.isFinite(time) && time >= Date.now();
}

function readAuditResult(error: unknown): 'DENY' | 'ERROR' {
  return error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR';
}

async function recordStaffingReadAudit(params: {
  request: FastifyRequest;
  clubId: string;
  result: 'SUCCESS' | 'DENY' | 'ERROR';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: 'club_staffing_console.read',
    resourceType: 'club',
    resourceId: params.clubId,
    subjectUserId: params.request.auth?.userId ?? null,
    result: params.result,
    metadata: params.metadata,
  });
}

async function recordAssignmentAudit(params: {
  request: FastifyRequest;
  clubId: string;
  assignmentId: string;
  subjectUserId?: string | null;
  result: 'SUCCESS' | 'DENY' | 'ERROR';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: 'club_work_assignment.update',
    resourceType: 'group_session',
    resourceId: params.assignmentId,
    subjectUserId: params.subjectUserId ?? params.request.auth?.userId ?? null,
    result: params.result,
    metadata: {
      clubId: params.clubId,
      ...params.metadata,
    },
  });
}

function toWorkItem(params: {
  session: SessionProjection;
  scheduledAt: string;
  labelByUserId: Map<string, string>;
  linkedBookingCount: number;
}): StaffingWorkItem {
  const coachUserId = params.session.coachUserId ?? undefined;
  const createdByUserId = params.session.createdByUserId ?? undefined;
  const scheduleCount = parseScheduleEntries(params.session.scheduleJson).length;
  const coachName = coachUserId ? params.labelByUserId.get(coachUserId) : undefined;
  return {
    offeringId: params.session.id,
    title: params.session.title,
    scheduledAt: params.scheduledAt,
    location: params.session.isVirtual
      ? 'Online'
      : (params.session.location ?? 'Club training ground'),
    status: mapSessionStatus(params.session.status),
    sessionType: 'group',
    currentParticipants: params.session.currentParticipants,
    maxParticipants: params.session.maxParticipants,
    ...(createdByUserId && params.labelByUserId.get(createdByUserId)
      ? {
          createdByName: params.labelByUserId.get(createdByUserId),
        }
      : {}),
    ...(coachUserId
      ? {
          ownerCoachId: coachUserId,
          ownerCoachName: coachName,
          assigneeCoachId: coachUserId,
          assigneeCoachName: coachName,
        }
      : {}),
    linkedBookingCount: params.linkedBookingCount,
    isRecurring: scheduleCount > 1,
  };
}

function toAssignmentOffering(params: {
  session: SessionProjection & { description?: string | null };
  scheduledAt?: string;
}): AssignmentOffering {
  const scheduledAt = params.scheduledAt ?? pickScheduledAt(params.session);
  const scheduleCount = parseScheduleEntries(params.session.scheduleJson).length;
  const coachId = params.session.coachUserId ?? '';
  return {
    id: params.session.id,
    source: 'group',
    sourceEntityId: params.session.id,
    coachId,
    clubId: params.session.clubId ?? '',
    actingAs: 'club',
    ownerCoachId: coachId,
    assigneeCoachId: coachId,
    title: params.session.title,
    ...(params.session.description ? { description: params.session.description } : {}),
    sessionType: 'group',
    maxParticipants: params.session.maxParticipants,
    location: params.session.isVirtual
      ? 'Online'
      : (params.session.location ?? 'Club training ground'),
    scheduledAt,
    isRecurring: scheduleCount > 1,
    recurrenceType: scheduleCount > 1 ? 'weekly' : 'none',
    status: mapSessionStatus(params.session.status),
    registrations: [],
    createdAt: toIso(params.session.createdAt) ?? new Date(0).toISOString(),
  };
}

function buildConsole(params: {
  club: StaffingClub;
  viewerMembership: StaffingMembership;
  viewerRole: ClubRole;
  staffMemberships: Array<{
    userId: string;
    userName: string;
    role: ClubRole;
    status: 'active' | 'pending';
    joinedAt: string;
  }>;
  sessions: SessionProjection[];
  linkedBookingCounts: Map<string, number>;
}): StaffingConsoleData {
  const labelByUserId = new Map(
    params.staffMemberships.map((membership) => [membership.userId, membership.userName] as const),
  );
  const activeSessions = params.sessions.filter((session) => isActiveSession(session.status));
  const sessionsWithSchedule = activeSessions
    .map((session) => ({
      session,
      scheduledAt: pickScheduledAt(session),
    }))
    .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
  const workItems = sessionsWithSchedule.map((entry) =>
    toWorkItem({
      session: entry.session,
      scheduledAt: entry.scheduledAt,
      labelByUserId,
      linkedBookingCount: params.linkedBookingCounts.get(entry.session.id) ?? 0,
    }),
  );
  const assignedWork = workItems
    .filter((item) => Boolean(item.assigneeCoachId))
    .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
  const unassignedWork = workItems
    .filter((item) => !item.assigneeCoachId)
    .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
  const staff = params.staffMemberships.map((membership) => {
    const assignedSessions = sessionsWithSchedule.filter(
      (entry) => entry.session.coachUserId === membership.userId,
    );
    const upcomingAssigned = assignedSessions.filter((entry) => isUpcoming(entry.scheduledAt));
    return {
      userId: membership.userId,
      label: membership.userName,
      role: membership.role,
      status: membership.status,
      canTakeAssignments: membership.status === 'active' && isClubStaffRole(membership.role),
      assignedToday: assignedSessions.filter((entry) => isToday(entry.scheduledAt)).length,
      upcomingLoad: upcomingAssigned.length,
      ...(upcomingAssigned[0]?.scheduledAt ? { nextSessionAt: upcomingAssigned[0].scheduledAt } : {}),
    };
  });
  return {
    club: params.club,
    viewerMembership: params.viewerMembership,
    canManageAssignments: canManageAssignments(params.viewerRole),
    canPostAsClub: canPostAsClub(params.viewerRole),
    staff,
    unassignedWork,
    assignedWork,
    summary: {
      activeOrgSessions: activeSessions.length,
      assignedToday: sessionsWithSchedule.filter(
        (entry) => Boolean(entry.session.coachUserId) && isToday(entry.scheduledAt),
      ).length,
      upcomingAssignedLoad: sessionsWithSchedule.filter(
        (entry) => Boolean(entry.session.coachUserId) && isUpcoming(entry.scheduledAt),
      ).length,
      unassignedCount: unassignedWork.length,
    },
  };
}

function getSeedUserName(tables: SeedTables, userId: string): string {
  const user = asRows(tables.users).find((row) => asString(row.id) === userId);
  return (
    asString(user?.name) ??
    asString(user?.fullName) ??
    asString(user?.email) ??
    userId
  );
}

function buildSeedClubPayload(params: {
  tables: SeedTables;
  club: SeedRow;
  memberships: SeedRow[];
}): StaffingClub {
  const ownerMembership = params.memberships.find((membership) => toRole(membership.role) === 'OWNER');
  const staffCount = params.memberships.filter((membership) => isClubStaffRole(toRole(membership.role))).length;
  return {
    id: asString(params.club.id) ?? '',
    name: asString(params.club.name) ?? 'Club',
    city: asString(params.club.city) ?? '',
    tagline: asString(params.club.tagline),
    photoUrl: asString(params.club.badgeUrl),
    profilePhotoUrl: asString(params.club.badgeUrl),
    coverPhotoUrl: asString(params.club.coverPhotoUrl),
    memberCount: params.memberships.length,
    coachCount: staffCount,
    squadCount: asRows(params.tables.squads).filter(
      (row) => asString(row.clubId) === asString(params.club.id) && !asString(row.deletedAt),
    ).length,
    ownerId:
      asString(ownerMembership?.userId) ??
      asString(params.club.createdByUserId) ??
      '',
    inviteCode: asString(params.club.inviteCode) ?? '',
  };
}

function buildSeedStaffingConsole(params: {
  tables: SeedTables;
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): StaffingConsoleData {
  const club = asRows(params.tables.clubs).find(
    (row) => asString(row.id) === params.clubId && !asString(row.deletedAt),
  );
  if (!club) {
    throw notFound('Club not found');
  }
  const activeMemberships = asRows(params.tables.clubMemberships).filter(
    (row) =>
      asString(row.clubId) === params.clubId &&
      row.active !== false &&
      !asString(row.deletedAt),
  );
  const viewerMembershipRow = activeMemberships.find(
    (membership) => asString(membership.userId) === params.authUserId,
  );
  const viewerRole = params.isPrivilegedAdmin ? 'OWNER' : toRole(viewerMembershipRow?.role);
  if (!params.isPrivilegedAdmin && (!viewerMembershipRow || !canReadStaffing(viewerRole))) {
    throw forbidden('You do not have permission to view club staffing');
  }
  const staffMemberships = activeMemberships.flatMap((membership) => {
    const role = toRole(membership.role);
    const userId = asString(membership.userId);
    if (!userId || !isClubStaffRole(role)) {
      return [];
    }
    return [
      {
        userId,
        userName: getSeedUserName(params.tables, userId),
        role,
        status: 'active' as const,
        joinedAt: toIso(membership.createdAt) ?? new Date(0).toISOString(),
      },
    ];
  });
  const sessions = asRows(params.tables.groupSessions).flatMap((session) => {
    const id = asString(session.id);
    if (!id || asString(session.clubId) !== params.clubId || asString(session.deletedAt)) {
      return [];
    }
    return [
      {
        id,
        coachUserId: asString(session.coachUserId) ?? null,
        createdByUserId: asString(session.createdByUserId) ?? null,
        title: asString(session.title) ?? 'Training session',
        sessionType: asString(session.sessionType),
        maxParticipants: asNumber(session.maxParticipants) ?? 0,
        currentParticipants: asNumber(session.currentParticipants) ?? 0,
        location: asString(session.location),
        isVirtual: asBoolean(session.isVirtual),
        status: asString(session.status),
        scheduleJson: session.scheduleJson,
        createdAt: asString(session.createdAt),
      },
    ];
  });
  const linkedBookingCounts = new Map<string, number>();
  for (const booking of asRows(params.tables.bookings)) {
    if (asString(booking.deletedAt) || asString(booking.status)?.toUpperCase() === 'CANCELLED') {
      continue;
    }
    const sessionId = asString(booking.groupSessionId) ?? asString(booking.sessionSourceEntityId);
    if (!sessionId) {
      continue;
    }
    linkedBookingCounts.set(sessionId, (linkedBookingCounts.get(sessionId) ?? 0) + 1);
  }
  const viewerMembership: StaffingMembership = {
    clubId: params.clubId,
    userId: params.authUserId,
    role: viewerRole,
    status: 'active',
    joinSource: viewerMembershipRow ? 'invite' : 'created',
    canPostAsClub: canPostAsClub(viewerRole),
  };
  return buildConsole({
    club: buildSeedClubPayload({
      tables: params.tables,
      club,
      memberships: activeMemberships,
    }),
    viewerMembership,
    viewerRole,
    staffMemberships,
    sessions,
    linkedBookingCounts,
  });
}

function requireSeedActiveStaffMembership(params: {
  tables: SeedTables;
  clubId: string;
  userId: string;
}): SeedRow {
  const membership = asRows(params.tables.clubMemberships).find(
    (row) =>
      asString(row.clubId) === params.clubId &&
      asString(row.userId) === params.userId &&
      row.active !== false &&
      !asString(row.deletedAt),
  );
  if (!membership || !isClubStaffRole(toRole(membership.role))) {
    throw forbidden('Assigned coach must be active club staff', {
      clubId: params.clubId,
      targetCoachUserId: params.userId,
    });
  }
  return membership;
}

function assertSeedAssignmentActor(params: {
  tables: SeedTables;
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
  currentCoachUserId: string | undefined | null;
  nextCoachUserId: string;
}): void {
  if (params.isPrivilegedAdmin) {
    return;
  }
  const membership = asRows(params.tables.clubMemberships).find(
    (row) =>
      asString(row.clubId) === params.clubId &&
      asString(row.userId) === params.authUserId &&
      row.active !== false &&
      !asString(row.deletedAt),
  );
  const role = membership ? toRole(membership.role) : null;
  if (!canChangeAssignment(role, params.currentCoachUserId, params.nextCoachUserId)) {
    throw forbidden('You do not have permission to reassign club work', {
      clubId: params.clubId,
    });
  }
}

function mutateSeedWorkAssignment(params: {
  tables: SeedTables;
  clubId: string;
  assignmentId: string;
  assigneeCoachId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): AssignmentMutationResult {
  const club = asRows(params.tables.clubs).find(
    (row) => asString(row.id) === params.clubId && !asString(row.deletedAt),
  );
  if (!club) {
    throw notFound('Club not found');
  }
  const session = asRows(params.tables.groupSessions).find(
    (row) =>
      asString(row.id) === params.assignmentId &&
      asString(row.clubId) === params.clubId &&
      !asString(row.deletedAt),
  );
  if (!session) {
    throw notFound('Club work assignment not found', {
      clubId: params.clubId,
      assignmentId: params.assignmentId,
    });
  }
  if (!isActiveSession(asString(session.status))) {
    throw badRequest('Cannot reassign cancelled or completed club work', {
      assignmentId: params.assignmentId,
    });
  }
  requireSeedActiveStaffMembership({
    tables: params.tables,
    clubId: params.clubId,
    userId: params.assigneeCoachId,
  });
  const currentCoachUserId = asString(session.coachUserId);
  assertSeedAssignmentActor({
    tables: params.tables,
    clubId: params.clubId,
    authUserId: params.authUserId,
    isPrivilegedAdmin: params.isPrivilegedAdmin,
    currentCoachUserId,
    nextCoachUserId: params.assigneeCoachId,
  });

  const now = new Date().toISOString();
  const targetLabel = getSeedUserName(params.tables, params.assigneeCoachId);
  const updatedBookingIds: string[] = [];
  if (currentCoachUserId !== params.assigneeCoachId) {
    session.coachUserId = params.assigneeCoachId;
    session.updatedAt = now;
    session.updatedByUserId = params.authUserId;
    session.version = (asNumber(session.version) ?? 1) + 1;
  }
  for (const booking of asRows(params.tables.bookings)) {
    if (
      asString(booking.deletedAt) ||
      asString(booking.status)?.toUpperCase() === 'CANCELLED'
    ) {
      continue;
    }
    const linkedSessionId = asString(booking.groupSessionId) ?? asString(booking.sessionSourceEntityId);
    if (linkedSessionId !== params.assignmentId) {
      continue;
    }
    if (asString(booking.coachUserId) === params.assigneeCoachId) {
      continue;
    }
    booking.coachUserId = params.assigneeCoachId;
    if (asString(booking.coachName)) {
      booking.coachName = targetLabel;
    }
    booking.updatedAt = now;
    booking.updatedByUserId = params.authUserId;
    booking.version = (asNumber(booking.version) ?? 1) + 1;
    const bookingId = asString(booking.id);
    if (bookingId) {
      updatedBookingIds.push(bookingId);
    }
  }

  return {
    offering: toAssignmentOffering({
      session: {
        id: asString(session.id) ?? '',
        coachUserId: asString(session.coachUserId) ?? null,
        clubId: asString(session.clubId) ?? null,
        createdByUserId: asString(session.createdByUserId) ?? null,
        description: asString(session.description) ?? null,
        title: asString(session.title) ?? 'Training session',
        sessionType: asString(session.sessionType),
        maxParticipants: asNumber(session.maxParticipants) ?? 0,
        currentParticipants: asNumber(session.currentParticipants) ?? 0,
        location: asString(session.location),
        isVirtual: asBoolean(session.isVirtual),
        status: asString(session.status),
        scheduleJson: session.scheduleJson,
        createdAt: asString(session.createdAt),
      },
    }),
    updatedBookingIds,
    previousCoachUserId: currentCoachUserId ?? null,
    assigneeCoachId: params.assigneeCoachId,
  };
}

async function buildDbStaffingConsole(params: {
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): Promise<StaffingConsoleData> {
  const prisma = getPrismaClientOrThrow();
  const club = await prisma.club.findFirst({
    where: {
      id: params.clubId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      tagline: true,
      badgeUrl: true,
      coverPhotoUrl: true,
      createdByUserId: true,
      memberships: {
        where: {
          active: true,
          deletedAt: null,
        },
        select: {
          userId: true,
          role: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
      squads: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
        },
      },
    },
  });
  if (!club) {
    throw notFound('Club not found');
  }
  const viewerMembership = club.memberships.find(
    (membership) => membership.userId === params.authUserId,
  );
  const viewerRole = params.isPrivilegedAdmin ? 'OWNER' : toRole(viewerMembership?.role);
  if (!params.isPrivilegedAdmin && (!viewerMembership || !canReadStaffing(viewerRole))) {
    throw forbidden('You do not have permission to view club staffing');
  }
  const sessions = await prisma.groupSession.findMany({
    where: {
      clubId: params.clubId,
      deletedAt: null,
    },
    select: {
      id: true,
      coachUserId: true,
      createdByUserId: true,
      title: true,
      sessionType: true,
      maxParticipants: true,
      currentParticipants: true,
      location: true,
      isVirtual: true,
      status: true,
      scheduleJson: true,
      createdAt: true,
    },
  });
  const sessionIds = sessions.map((session) => session.id);
  const bookingCounts =
    sessionIds.length > 0
      ? await prisma.booking.groupBy({
          by: ['groupSessionId'],
          where: {
            groupSessionId: {
              in: sessionIds,
            },
            deletedAt: null,
            NOT: {
              status: 'CANCELLED',
            },
          },
          _count: {
            _all: true,
          },
        })
      : [];
  const linkedBookingCounts = new Map(
    bookingCounts.flatMap((row) =>
      row.groupSessionId ? [[row.groupSessionId, row._count._all] as const] : [],
    ),
  );
  const staffMemberships = club.memberships.flatMap((membership) => {
    const role = toRole(membership.role);
    if (!isClubStaffRole(role)) {
      return [];
    }
    return [
      {
        userId: membership.userId,
        userName: membership.user.name || membership.user.email || membership.userId,
        role,
        status: 'active' as const,
        joinedAt: membership.createdAt.toISOString(),
      },
    ];
  });
  return buildConsole({
    club: {
      id: club.id,
      name: club.name,
      city: '',
      tagline: club.tagline ?? undefined,
      photoUrl: club.badgeUrl ?? undefined,
      profilePhotoUrl: club.badgeUrl ?? undefined,
      coverPhotoUrl: club.coverPhotoUrl ?? undefined,
      memberCount: club.memberships.length,
      coachCount: staffMemberships.length,
      squadCount: club.squads.length,
      ownerId:
        club.memberships.find((membership) => toRole(membership.role) === 'OWNER')?.userId ??
        club.createdByUserId,
      inviteCode: '',
    },
    viewerMembership: {
      clubId: club.id,
      userId: params.authUserId,
      role: viewerRole,
      status: 'active',
      joinSource: viewerMembership ? 'invite' : 'created',
      canPostAsClub: canPostAsClub(viewerRole),
    },
    viewerRole,
    staffMemberships,
    sessions: sessions.map((session) => ({
      id: session.id,
      coachUserId: session.coachUserId,
      createdByUserId: session.createdByUserId,
      title: session.title,
      sessionType: session.sessionType,
      maxParticipants: session.maxParticipants,
      currentParticipants: session.currentParticipants,
      location: session.location,
      isVirtual: session.isVirtual,
      status: String(session.status),
      scheduleJson: session.scheduleJson,
      createdAt: session.createdAt,
    })),
    linkedBookingCounts,
  });
}

async function mutateDbWorkAssignment(params: {
  clubId: string;
  assignmentId: string;
  assigneeCoachId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): Promise<AssignmentMutationResult> {
  const prisma = getPrismaClientOrThrow();
  return await prisma.$transaction(async (tx) => {
    const club = await tx.club.findFirst({
      where: {
        id: params.clubId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
    if (!club) {
      throw notFound('Club not found');
    }
    const session = await tx.groupSession.findFirst({
      where: {
        id: params.assignmentId,
        clubId: params.clubId,
        deletedAt: null,
      },
      select: {
        id: true,
        coachUserId: true,
        clubId: true,
        createdByUserId: true,
        title: true,
        description: true,
        sessionType: true,
        maxParticipants: true,
        currentParticipants: true,
        location: true,
        isVirtual: true,
        status: true,
        scheduleJson: true,
        createdAt: true,
      },
    });
    if (!session) {
      throw notFound('Club work assignment not found', {
        clubId: params.clubId,
        assignmentId: params.assignmentId,
      });
    }
    if (!isActiveSession(String(session.status))) {
      throw badRequest('Cannot reassign cancelled or completed club work', {
        assignmentId: params.assignmentId,
      });
    }
    const targetMembership = await tx.clubMembership.findUnique({
      where: {
        clubId_userId: {
          clubId: params.clubId,
          userId: params.assigneeCoachId,
        },
      },
      select: {
        role: true,
        active: true,
        deletedAt: true,
      },
    });
    if (
      !targetMembership?.active ||
      targetMembership.deletedAt ||
      !isClubStaffRole(toRole(targetMembership.role))
    ) {
      throw forbidden('Assigned coach must be active club staff', {
        clubId: params.clubId,
        targetCoachUserId: params.assigneeCoachId,
      });
    }
    if (!params.isPrivilegedAdmin) {
      const actorMembership = await tx.clubMembership.findUnique({
        where: {
          clubId_userId: {
            clubId: params.clubId,
            userId: params.authUserId,
          },
        },
        select: {
          role: true,
          active: true,
          deletedAt: true,
        },
      });
      const actorRole =
        actorMembership?.active && !actorMembership.deletedAt ? toRole(actorMembership.role) : null;
      if (!canChangeAssignment(actorRole, session.coachUserId, params.assigneeCoachId)) {
        throw forbidden('You do not have permission to reassign club work', {
          clubId: params.clubId,
        });
      }
    }

    const linkedBookings = await tx.booking.findMany({
      where: {
        groupSessionId: params.assignmentId,
        deletedAt: null,
        NOT: {
          status: 'CANCELLED',
        },
      },
      select: {
        id: true,
        coachUserId: true,
      },
    });
    const updatedBookingIds = linkedBookings.flatMap((booking) =>
      booking.coachUserId === params.assigneeCoachId ? [] : [booking.id],
    );
    if (session.coachUserId !== params.assigneeCoachId) {
      await tx.groupSession.update({
        where: {
          id: params.assignmentId,
        },
        data: {
          coachUserId: params.assigneeCoachId,
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
      });
    }
    if (updatedBookingIds.length > 0) {
      await tx.booking.updateMany({
        where: {
          id: {
            in: updatedBookingIds,
          },
        },
        data: {
          coachUserId: params.assigneeCoachId,
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
      });
    }

    return {
      offering: toAssignmentOffering({
        session: {
          ...session,
          coachUserId: params.assigneeCoachId,
          status: String(session.status),
        },
      }),
      updatedBookingIds,
      previousCoachUserId: session.coachUserId,
      assigneeCoachId: params.assigneeCoachId,
    };
  });
}

export async function resolveStaffingConsole(params: {
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): Promise<StaffingConsoleData> {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    return buildDbStaffingConsole(params);
  }
  const store = getApiDataBackend() === 'db' ? getDbFixtureStore() : getMarketplaceSeedStore();
  return buildSeedStaffingConsole({
    tables: store.tables as SeedTables,
    ...params,
  });
}

async function mutateWorkAssignment(params: {
  clubId: string;
  assignmentId: string;
  assigneeCoachId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): Promise<AssignmentMutationResult> {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    return mutateDbWorkAssignment(params);
  }
  const store = getApiDataBackend() === 'db' ? getDbFixtureStore() : getMarketplaceSeedStore();
  return mutateSeedWorkAssignment({
    tables: store.tables as SeedTables,
    ...params,
  });
}

export function registerClubStaffingRoutes(app: FastifyInstance): void {
  app.get('/clubs/:clubId/staffing-console', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = clubParamsSchema.parse(request.params ?? {});
    try {
      const consoleData = await resolveStaffingConsole({
        clubId: params.clubId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      await recordStaffingReadAudit({
        request,
        clubId: params.clubId,
        result: 'SUCCESS',
      });
      return reply.send({
        ...consoleData,
        clubId: params.clubId,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordStaffingReadAudit({
        request,
        clubId: params.clubId,
        result: readAuditResult(error),
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.patch('/clubs/:clubId/work-assignments/:assignmentId', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = workAssignmentParamsSchema.parse(request.params ?? {});
    const body = workAssignmentBodySchema.parse(request.body ?? {});
    try {
      const result = await mutateWorkAssignment({
        clubId: params.clubId,
        assignmentId: params.assignmentId,
        assigneeCoachId: body.assigneeCoachId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      await recordAssignmentAudit({
        request,
        clubId: params.clubId,
        assignmentId: params.assignmentId,
        subjectUserId: body.assigneeCoachId,
        result: 'SUCCESS',
        metadata: {
          previousCoachUserId: result.previousCoachUserId,
          assigneeCoachId: body.assigneeCoachId,
          updatedBookingIds: result.updatedBookingIds,
        },
      });
      return reply.send({
        ...result,
        clubId: params.clubId,
        assignmentId: params.assignmentId,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAssignmentAudit({
        request,
        clubId: params.clubId,
        assignmentId: params.assignmentId,
        subjectUserId: body.assigneeCoachId,
        result: readAuditResult(error),
        metadata: {
          assigneeCoachId: body.assigneeCoachId,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });
}
