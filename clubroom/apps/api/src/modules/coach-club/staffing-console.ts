import crypto from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  canUseClubCapability,
  isClubStaffRole,
  parseOrganizationRole,
  staffingConsoleResponseSchema,
  workAssignmentUpdateRequestSchema,
  workAssignmentUpdateResponseSchema,
  type ClubRole,
  type StaffingClub,
  type StaffingConsoleData,
  type StaffingMembership,
  type StaffingStatus,
  type StaffingStaffMember,
  type StaffingWorkItem,
  type WorkAssignmentUpdateResponse,
} from '@clubroom/shared-contracts';
import { recordAuditEvent } from '../../lib/audit-runtime.js';
import { isPrivilegedAdminAuth } from '../../lib/authz.js';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import {
  ApiProblemError,
  badRequest,
  forbidden,
  isZodValidationError,
  notFound,
} from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

type AssignmentMutationResult = Omit<
  WorkAssignmentUpdateResponse,
  'clubId' | 'assignmentId' | 'requestId'
>;

type OwnershipHistoryAction = 'ASSIGNED' | 'REASSIGNED' | 'UPDATED';
type OwnershipHistoryActorRole = 'COACH' | 'USER' | 'PARENT' | 'ADMIN';

interface OwnershipHistoryEvent {
  id: string;
  action: OwnershipHistoryAction;
  timestamp: string;
  actorUserId?: string;
  actorName?: string;
  actorRole?: OwnershipHistoryActorRole;
  fromCoachId?: string;
  toCoachId: string;
}

export interface WorkAssignmentHistory {
  clubId: string;
  assignmentId: string;
  events: OwnershipHistoryEvent[];
  total: number;
  truncated: boolean;
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

const clubParamsSchema = z.object({ clubId: z.string().min(1) }).strict();

const workAssignmentParamsSchema = z
  .object({
    clubId: z.string().min(1),
    assignmentId: z.string().min(1),
  })
  .strict();

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
function getMutableRows(tables: SeedTables, key: string): SeedRow[] {
  if (!Array.isArray(tables[key])) {
    tables[key] = [];
  }
  return tables[key];
}
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;
const asRecord = (value: unknown): SeedRow | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as SeedRow) : undefined;
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const ownershipHistoryLimit = 100;

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

function toOwnershipActorRole(value: unknown): OwnershipHistoryActorRole | undefined {
  switch (asString(value)?.trim().toLowerCase()) {
    case 'admin':
    case 'club_admin':
    case 'security_admin':
    case 'super_admin':
      return 'ADMIN';
    case 'coach':
    case 'owner':
    case 'head_coach':
    case 'assistant':
      return 'COACH';
    case 'parent':
    case 'guardian':
      return 'PARENT';
    case 'athlete':
    case 'user':
      return 'USER';
    default:
      return undefined;
  }
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

function isActiveSession(status: string | undefined | null): boolean {
  const normalized = status?.toUpperCase();
  return normalized !== 'CANCELLED' && normalized !== 'COMPLETED';
}

function isMutableAssignmentLinkedBooking(status: string | undefined | null): boolean {
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

function pickScheduledAt(session: SessionProjection): string | null {
  const entries = parseScheduleEntries(session.scheduleJson)
    .flatMap((entry) => {
      const startsAt = asString(entry.startsAt);
      if (!startsAt) return [];
      const time = new Date(startsAt).getTime();
      return Number.isFinite(time) ? [{ startsAt, time }] : [];
    })
    .sort((left, right) => left.time - right.time);
  const now = Date.now();
  return entries.find((entry) => entry.time >= now)?.startsAt ?? entries[0]?.startsAt ?? null;
}

function isUpcoming(iso: string | null): boolean {
  if (!iso) return false;
  const time = new Date(iso).getTime();
  return Number.isFinite(time) && time >= Date.now();
}

function compareScheduledAt(left: string | null, right: string | null): number {
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left.localeCompare(right);
}

function readAuditResult(error: unknown): 'DENY' | 'ERROR' {
  return isZodValidationError(error) || (error instanceof ApiProblemError && error.status < 500)
    ? 'DENY'
    : 'ERROR';
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
    sensitiveRead: true,
    metadata: params.metadata,
  });
}

function parseStaffingConsoleResponse(payload: unknown) {
  const parsed = staffingConsoleResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiProblemError(500, 'INTERNAL_ERROR', 'Staffing console response invalid');
  }
  return parsed.data;
}

function parseWorkAssignmentUpdateResponse(payload: unknown) {
  const parsed = workAssignmentUpdateResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiProblemError(500, 'INTERNAL_ERROR', 'Work assignment response invalid');
  }
  return parsed.data;
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

async function recordAssignmentHistoryReadAudit(params: {
  request: FastifyRequest;
  clubId: string;
  assignmentId: string;
  result: 'SUCCESS' | 'DENY' | 'ERROR';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: 'club_work_assignment.history.read',
    resourceType: 'group_session',
    resourceId: params.assignmentId,
    subjectUserId: params.request.auth?.userId ?? null,
    result: params.result,
    sensitiveRead: true,
    metadata: {
      clubId: params.clubId,
      ...params.metadata,
    },
  });
}

function mapOwnershipHistoryEvent(
  row: SeedRow,
  actorNameByUserId: Map<string, string>,
): OwnershipHistoryEvent | null {
  const id = asString(row.id);
  const timestamp = toIso(row.occurredAt);
  const metadata = asRecord(row.metadataJson);
  const toCoachId = asString(metadata?.assigneeCoachId);
  if (!id || !timestamp || !toCoachId) {
    return null;
  }
  const fromCoachId = asString(metadata?.previousCoachUserId);
  const actorUserId = asString(row.actorUserId);
  const actorRole = toOwnershipActorRole(row.actingRole);
  const action: OwnershipHistoryAction = !fromCoachId
    ? 'ASSIGNED'
    : fromCoachId === toCoachId
      ? 'UPDATED'
      : 'REASSIGNED';
  return {
    id,
    action,
    timestamp,
    ...(actorUserId ? { actorUserId } : {}),
    ...(actorUserId && actorNameByUserId.has(actorUserId)
      ? { actorName: actorNameByUserId.get(actorUserId) }
      : {}),
    ...(actorRole ? { actorRole } : {}),
    ...(fromCoachId ? { fromCoachId } : {}),
    toCoachId,
  };
}

function toWorkItem(params: {
  session: SessionProjection;
  scheduledAt: string | null;
  labelByUserId: Map<string, string>;
  linkedBookingCount: number;
}): StaffingWorkItem {
  const coachUserId = params.session.coachUserId ?? null;
  const createdByUserId = params.session.createdByUserId;
  if (!createdByUserId) {
    throw new ApiProblemError(500, 'INTERNAL_ERROR', 'Staffing work creator is missing');
  }
  const scheduleCount = parseScheduleEntries(params.session.scheduleJson).length;
  const coachName = coachUserId ? (params.labelByUserId.get(coachUserId) ?? null) : null;
  return {
    offeringId: params.session.id,
    title: params.session.title,
    scheduledAt: params.scheduledAt,
    location: params.session.location ?? null,
    isVirtual: params.session.isVirtual === true,
    status: mapSessionStatus(params.session.status),
    sessionType: 'group',
    currentParticipants: params.session.currentParticipants,
    maxParticipants: params.session.maxParticipants,
    createdByUserId,
    createdByName: params.labelByUserId.get(createdByUserId) ?? null,
    assigneeCoachId: coachUserId,
    assigneeCoachName: coachName,
    linkedBookingCount: params.linkedBookingCount,
    isRecurring: scheduleCount > 1,
  };
}

function buildConsole(params: {
  club: StaffingClub;
  viewerMembership: StaffingMembership | null;
  viewerRole: ClubRole | null;
  privilegedAdminAccess: boolean;
  staffMemberships: Array<{
    userId: string;
    userName: string;
    role: ClubRole;
    status: 'active';
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
    .sort((left, right) => compareScheduledAt(left.scheduledAt, right.scheduledAt));
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
    .sort((left, right) => compareScheduledAt(left.scheduledAt, right.scheduledAt));
  const unassignedWork = workItems
    .filter((item) => !item.assigneeCoachId)
    .sort((left, right) => compareScheduledAt(left.scheduledAt, right.scheduledAt));
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
      upcomingLoad: upcomingAssigned.length,
      nextSessionAt: upcomingAssigned[0]?.scheduledAt ?? null,
    } satisfies StaffingStaffMember;
  });
  return {
    club: params.club,
    viewerMembership: params.viewerMembership,
    privilegedAdminAccess: params.privilegedAdminAccess,
    canManageAssignments:
      params.privilegedAdminAccess || canManageAssignments(params.viewerRole),
    staff,
    unassignedWork,
    assignedWork,
    summary: {
      activeOrgSessions: activeSessions.length,
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
  club: SeedRow;
}): StaffingClub {
  return {
    id: asString(params.club.id) ?? '',
    name: asString(params.club.name) ?? 'Club',
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
  const viewerRole = viewerMembershipRow ? toRole(viewerMembershipRow.role) : null;
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
  const viewerMembership: StaffingMembership | null = viewerMembershipRow
    ? {
        clubId: params.clubId,
        userId: params.authUserId,
        role: viewerRole ?? 'MEMBER',
        status: 'active',
      }
    : null;
  return buildConsole({
    club: buildSeedClubPayload({
      club,
    }),
    viewerMembership,
    viewerRole,
    privilegedAdminAccess: params.isPrivilegedAdmin,
    staffMemberships,
    sessions,
    linkedBookingCounts,
  });
}

function buildSeedWorkAssignmentHistory(params: {
  tables: SeedTables;
  clubId: string;
  assignmentId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): WorkAssignmentHistory {
  const club = asRows(params.tables.clubs).find(
    (row) => asString(row.id) === params.clubId && !asString(row.deletedAt),
  );
  if (!club) {
    throw notFound('Club not found');
  }
  const viewerMembership = asRows(params.tables.clubMemberships).find(
    (row) =>
      asString(row.clubId) === params.clubId &&
      asString(row.userId) === params.authUserId &&
      row.active !== false &&
      !asString(row.deletedAt),
  );
  const viewerRole = params.isPrivilegedAdmin ? 'OWNER' : toRole(viewerMembership?.role);
  if (!params.isPrivilegedAdmin && (!viewerMembership || !canReadStaffing(viewerRole))) {
    throw forbidden('You do not have permission to view club work assignment history');
  }
  const assignment = asRows(params.tables.groupSessions).find(
    (row) =>
      asString(row.id) === params.assignmentId &&
      asString(row.clubId) === params.clubId &&
      !asString(row.deletedAt),
  );
  if (!assignment) {
    throw notFound('Club work assignment not found', {
      clubId: params.clubId,
      assignmentId: params.assignmentId,
    });
  }

  const matchingEvents = asRows(params.tables.auditEvents)
    .filter(
      (row) =>
        asString(row.action) === 'club_work_assignment.update' &&
        asString(row.resourceType) === 'group_session' &&
        asString(row.resourceId) === params.assignmentId &&
        asString(row.result) === 'SUCCESS',
    )
    .sort((left, right) => {
      const occurredAtOrder =
        (toIso(right.occurredAt) ?? '').localeCompare(toIso(left.occurredAt) ?? '');
      return occurredAtOrder || (asString(right.id) ?? '').localeCompare(asString(left.id) ?? '');
    });
  const selectedEvents = matchingEvents.slice(0, ownershipHistoryLimit);
  const actorNameByUserId = new Map<string, string>();
  for (const row of selectedEvents) {
    const actorUserId = asString(row.actorUserId);
    if (actorUserId) {
      actorNameByUserId.set(actorUserId, getSeedUserName(params.tables, actorUserId));
    }
  }
  const events = selectedEvents
    .map((row) => mapOwnershipHistoryEvent(row, actorNameByUserId))
    .filter((event): event is OwnershipHistoryEvent => Boolean(event))
    .reverse();
  return {
    clubId: params.clubId,
    assignmentId: params.assignmentId,
    events,
    total: events.length,
    truncated: matchingEvents.length > ownershipHistoryLimit,
  };
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
  requestId: string;
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
  const bookingStatusEvents = getMutableRows(params.tables, 'bookingStatusEvents');
  if (currentCoachUserId !== params.assigneeCoachId) {
    session.coachUserId = params.assigneeCoachId;
    session.updatedAt = now;
    session.updatedByUserId = params.authUserId;
    session.version = (asNumber(session.version) ?? 1) + 1;
  }
  for (const booking of asRows(params.tables.bookings)) {
    if (
      asString(booking.deletedAt) ||
      !isMutableAssignmentLinkedBooking(asString(booking.status))
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
    const previousCoachUserId = asString(booking.coachUserId) ?? null;
    const currentStatus = asString(booking.status)?.toUpperCase() ?? 'CONFIRMED';
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
      bookingStatusEvents.push({
        id: newId('bse'),
        bookingId,
        fromStatus: currentStatus,
        toStatus: currentStatus,
        actorUserId: params.authUserId,
        reason: 'Group session delivery coach reassigned.',
        metadataJson: {
          source: 'club-work-assignment',
          clubId: params.clubId,
          groupSessionId: params.assignmentId,
          previousCoachUserId,
          assigneeCoachId: params.assigneeCoachId,
        },
        requestId: params.requestId,
        occurredAt: now,
      });
    }
  }
  const updatedBookingIdSet = new Set(updatedBookingIds);
  for (const invoice of asRows(params.tables.invoices)) {
    if (asString(invoice.deletedAt) || asString(invoice.coachUserId) === params.assigneeCoachId) {
      continue;
    }
    const bookingId = asString(invoice.bookingId);
    if (!bookingId || !updatedBookingIdSet.has(bookingId)) {
      continue;
    }
    invoice.coachUserId = params.assigneeCoachId;
    invoice.updatedAt = now;
    invoice.updatedByUserId = params.authUserId;
    invoice.version = (asNumber(invoice.version) ?? 1) + 1;
  }

  return {
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
    },
  });
  if (!club) {
    throw notFound('Club not found');
  }
  const viewerMembership = club.memberships.find(
    (membership) => membership.userId === params.authUserId,
  );
  const viewerRole = viewerMembership ? toRole(viewerMembership.role) : null;
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
    },
    viewerMembership: viewerMembership
      ? {
          clubId: club.id,
          userId: params.authUserId,
          role: viewerRole ?? 'MEMBER',
          status: 'active',
        }
      : null,
    viewerRole,
    privilegedAdminAccess: params.isPrivilegedAdmin,
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

async function buildDbWorkAssignmentHistory(params: {
  clubId: string;
  assignmentId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): Promise<WorkAssignmentHistory> {
  const prisma = getPrismaClientOrThrow();
  const club = await prisma.club.findFirst({
    where: {
      id: params.clubId,
      deletedAt: null,
    },
    select: {
      id: true,
      memberships: {
        where: {
          userId: params.authUserId,
          active: true,
          deletedAt: null,
        },
        select: {
          role: true,
        },
        take: 1,
      },
    },
  });
  if (!club) {
    throw notFound('Club not found');
  }
  const viewerMembership = club.memberships[0];
  const viewerRole = params.isPrivilegedAdmin ? 'OWNER' : toRole(viewerMembership?.role);
  if (!params.isPrivilegedAdmin && (!viewerMembership || !canReadStaffing(viewerRole))) {
    throw forbidden('You do not have permission to view club work assignment history');
  }
  const assignment = await prisma.groupSession.findFirst({
    where: {
      id: params.assignmentId,
      clubId: params.clubId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });
  if (!assignment) {
    throw notFound('Club work assignment not found', {
      clubId: params.clubId,
      assignmentId: params.assignmentId,
    });
  }

  const matchingEvents = await prisma.auditEvent.findMany({
    where: {
      action: 'club_work_assignment.update',
      resourceType: 'group_session',
      resourceId: params.assignmentId,
      result: 'SUCCESS',
    },
    select: {
      id: true,
      occurredAt: true,
      actorUserId: true,
      actingRole: true,
      metadataJson: true,
    },
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    take: ownershipHistoryLimit + 1,
  });
  const selectedEvents = matchingEvents.slice(0, ownershipHistoryLimit);
  const actorUserIds = Array.from(
    new Set(selectedEvents.flatMap((row) => (row.actorUserId ? [row.actorUserId] : []))),
  );
  const actors =
    actorUserIds.length > 0
      ? await prisma.user.findMany({
          where: {
            id: {
              in: actorUserIds,
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : [];
  const actorNameByUserId = new Map(
    actors.map((actor) => [actor.id, actor.name || actor.email || actor.id] as const),
  );
  const events = selectedEvents
    .map((row) =>
      mapOwnershipHistoryEvent(row as unknown as SeedRow, actorNameByUserId),
    )
    .filter((event): event is OwnershipHistoryEvent => Boolean(event))
    .reverse();
  return {
    clubId: params.clubId,
    assignmentId: params.assignmentId,
    events,
    total: events.length,
    truncated: matchingEvents.length > ownershipHistoryLimit,
  };
}

async function mutateDbWorkAssignment(params: {
  clubId: string;
  assignmentId: string;
  assigneeCoachId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
  requestId: string;
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
        status: true,
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

    const now = new Date();
    const linkedBookings = await tx.booking.findMany({
      where: {
        groupSessionId: params.assignmentId,
        deletedAt: null,
        NOT: {
          status: {
            in: ['CANCELLED', 'COMPLETED'],
          },
        },
      },
      select: {
        id: true,
        coachUserId: true,
        status: true,
      },
    });
    const changedLinkedBookings = linkedBookings.filter(
      (booking) => booking.coachUserId !== params.assigneeCoachId,
    );
    const updatedBookingIds = changedLinkedBookings.map((booking) => booking.id);
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
      await tx.bookingStatusEvent.createMany({
        data: changedLinkedBookings.map((booking) => ({
          id: newId('bse'),
          bookingId: booking.id,
          fromStatus: booking.status,
          toStatus: booking.status,
          actorUserId: params.authUserId,
          reason: 'Group session delivery coach reassigned.',
          metadataJson: {
            source: 'club-work-assignment',
            clubId: params.clubId,
            groupSessionId: params.assignmentId,
            previousCoachUserId: booking.coachUserId,
            assigneeCoachId: params.assigneeCoachId,
          },
          requestId: params.requestId,
          occurredAt: now,
        })),
      });
    }
    if (updatedBookingIds.length > 0) {
      await tx.invoice.updateMany({
        where: {
          bookingId: {
            in: updatedBookingIds,
          },
          deletedAt: null,
          NOT: {
            coachUserId: params.assigneeCoachId,
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

export async function resolveWorkAssignmentHistory(params: {
  clubId: string;
  assignmentId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): Promise<WorkAssignmentHistory> {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    return buildDbWorkAssignmentHistory(params);
  }
  const store = getApiDataBackend() === 'db' ? getDbFixtureStore() : getMarketplaceSeedStore();
  return buildSeedWorkAssignmentHistory({
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
  requestId: string;
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
    const rawClubId = asString((request.params as { clubId?: unknown } | undefined)?.clubId) ?? '';
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const params = clubParamsSchema.parse(request.params ?? {});
      const consoleData = await resolveStaffingConsole({
        clubId: params.clubId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      const payload = parseStaffingConsoleResponse({
        ...consoleData,
        clubId: params.clubId,
        requestId: request.requestId,
      });
      await recordStaffingReadAudit({
        request,
        clubId: params.clubId,
        result: 'SUCCESS',
        metadata: {
          activeStaffCount: payload.staff.length,
          activeOrgSessions: payload.summary.activeOrgSessions,
          unassignedCount: payload.summary.unassignedCount,
        },
      });
      return reply.send(payload);
    } catch (error) {
      await recordStaffingReadAudit({
        request,
        clubId: rawClubId,
        result: readAuditResult(error),
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.get(
    '/clubs/:clubId/work-assignments/:assignmentId/history',
    async (request, reply) => {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const params = workAssignmentParamsSchema.parse(request.params ?? {});
      try {
        const history = await resolveWorkAssignmentHistory({
          clubId: params.clubId,
          assignmentId: params.assignmentId,
          authUserId,
          isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        });
        await recordAssignmentHistoryReadAudit({
          request,
          clubId: params.clubId,
          assignmentId: params.assignmentId,
          result: 'SUCCESS',
        });
        return reply.send({
          ...history,
          requestId: request.requestId,
        });
      } catch (error) {
        await recordAssignmentHistoryReadAudit({
          request,
          clubId: params.clubId,
          assignmentId: params.assignmentId,
          result: readAuditResult(error),
          metadata: {
            errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          },
        });
        throw error;
      }
    },
  );

  app.patch('/clubs/:clubId/work-assignments/:assignmentId', async (request, reply) => {
    const rawParams = request.params as
      | { clubId?: unknown; assignmentId?: unknown }
      | undefined;
    const rawBody = request.body as { assigneeCoachId?: unknown } | undefined;
    const rawClubId = asString(rawParams?.clubId) ?? '';
    const rawAssignmentId = asString(rawParams?.assignmentId) ?? '';
    const rawAssigneeCoachId = asString(rawBody?.assigneeCoachId) ?? null;
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const params = workAssignmentParamsSchema.parse(request.params ?? {});
      const body = workAssignmentUpdateRequestSchema.parse(request.body ?? {});
      const result = await mutateWorkAssignment({
        clubId: params.clubId,
        assignmentId: params.assignmentId,
        assigneeCoachId: body.assigneeCoachId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        requestId: request.requestId,
      });
      const payload = parseWorkAssignmentUpdateResponse({
        ...result,
        clubId: params.clubId,
        assignmentId: params.assignmentId,
        requestId: request.requestId,
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
      return reply.send(payload);
    } catch (error) {
      await recordAssignmentAudit({
        request,
        clubId: rawClubId,
        assignmentId: rawAssignmentId,
        subjectUserId: rawAssigneeCoachId,
        result: readAuditResult(error),
        metadata: {
          assigneeCoachId: rawAssigneeCoachId,
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });
}
