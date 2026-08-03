import type { FastifyInstance, FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  createHeadCoachStandardRequestSchema,
  createHeadCoachTaskRequestSchema,
  headCoachOversightResponseSchema,
  headCoachStandardResponseSchema,
  headCoachTaskResponseSchema,
  isClubOversightRole,
  isClubStaffRole,
  parseOrganizationRole,
  updateHeadCoachStandardRequestSchema,
  updateHeadCoachTaskRequestSchema,
  type ClubRole,
  type HeadCoachStandardCategory,
  type HeadCoachTaskStatus,
  type HeadCoachTaskType,
} from '@clubroom/shared-contracts';
import { recordAuditEvent } from '../../lib/audit-runtime.js';
import { isPrivilegedAdminAuth } from '../../lib/authz.js';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { ApiProblemError, forbidden, isZodValidationError, notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;
type HeadCoachScopeType = 'club' | 'assigned_squads';

interface ClubProjection {
  id: string;
  name: string;
  city?: string | null;
  createdByUserId?: string | null;
  tagline?: string | null;
  badgeUrl?: string | null;
  coverPhotoUrl?: string | null;
}

interface MembershipProjection {
  clubId: string;
  userId: string;
  role: ClubRole;
  label: string;
  squadIds: string[];
}

interface SquadProjection {
  id: string;
  clubId: string;
  name: string;
  ageBandLabel?: string | null;
  ownerCoachUserId?: string | null;
}

interface SquadMemberProjection {
  squadId: string;
  athleteId: string;
}

interface SessionProjection {
  id: string;
  clubId?: string | null;
  coachUserId?: string | null;
  squadId?: string | null;
  title: string;
  sessionType?: string | null;
  scheduleJson?: unknown;
  status?: string | null;
  updatedAt?: string | null;
}

interface BookingProjection {
  id: string;
  clubId?: string | null;
  coachUserId: string;
  groupSessionId?: string | null;
  coachingOfferingId?: string | null;
  status: string;
  scheduledAt: string;
  durationMinutes: number;
  location: string;
  serviceType?: string | null;
  updatedAt?: string | null;
}

interface BookingParticipantProjection {
  bookingId: string;
  athleteId: string;
  athleteName: string;
}

interface HeadCoachTaskProjection {
  id: string;
  clubId: string;
  coachId: string;
  coachName?: string | null;
  type: HeadCoachTaskType;
  status: HeadCoachTaskStatus;
  title: string;
  details?: string | null;
  dueAt?: string | null;
  athleteId?: string | null;
  athleteName?: string | null;
  bookingId?: string | null;
  offeringId?: string | null;
  squadId?: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  completedAt?: string | null;
  completedByUserId?: string | null;
}

interface HeadCoachStandardProjection {
  id: string;
  clubId: string;
  category: HeadCoachStandardCategory;
  title: string;
  description?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
}

interface HeadCoachWatchlistProjection {
  athleteId: string;
  athleteName: string;
  coachId: string;
  coachName: string;
  risk: 'high' | 'watch' | 'stable';
  pendingCount: number;
  overdueCount: number;
  dueSoonCount: number;
  recommendedAction: string;
  nextDueAt: string | null;
  latestCoachActionAt: string | null;
  attentionScore: number;
  taskIds: string[];
  squadId?: string;
  squadName?: string;
}

interface ProjectionInput {
  club: ClubProjection;
  viewerMembership: MembershipProjection | null;
  memberships: MembershipProjection[];
  squads: SquadProjection[];
  squadMembers: SquadMemberProjection[];
  sessions: SessionProjection[];
  bookings: BookingProjection[];
  bookingParticipants: BookingParticipantProjection[];
  tasks: HeadCoachTaskProjection[];
  standards: HeadCoachStandardProjection[];
  authUserId: string;
  isPrivilegedAdmin: boolean;
}

const paramsSchema = z.object({ clubId: z.string().min(1) }).strict();
const taskParamsSchema = z
  .object({
    clubId: z.string().min(1),
    taskId: z.string().min(1),
  })
  .strict();
const standardParamsSchema = z
  .object({
    clubId: z.string().min(1),
    standardId: z.string().min(1),
  })
  .strict();

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const newId = (prefix: string): string => `${prefix}_${randomUUID()}`;

function requireAuthUserId(authUserId: string | undefined): string {
  if (!authUserId) {
    throw forbidden('Authenticated user is required');
  }
  return authUserId;
}

function toRole(value: unknown): ClubRole | null {
  return parseOrganizationRole(value);
}

function addHoursIso(iso: string, hours: number): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  date.setUTCHours(date.getUTCHours() + hours);
  return date.toISOString();
}

function addDaysIso(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function normalizeTaskType(value: unknown): HeadCoachTaskType {
  return value === 'session_note_expectation' ? 'session_note_expectation' : 'required_follow_up';
}

function normalizeTaskStatus(value: unknown): HeadCoachTaskStatus {
  return value === 'done' ? 'done' : 'open';
}

function normalizeStandardCategory(value: unknown): HeadCoachStandardCategory {
  if (value === 'follow_up' || value === 'program') {
    return value;
  }
  return 'session_notes';
}

function parseOptionalDate(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ApiProblemError(400, 'VALIDATION_FAILED', 'dueAt must be a valid ISO date.');
  }
  return date;
}

function parseScheduleEntries(value: unknown): Array<{ startsAt?: string }> {
  const parsed =
    typeof value === 'string'
      ? (() => {
          try {
            return JSON.parse(value) as unknown;
          } catch {
            return [];
          }
        })()
      : value;
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed
    .filter((entry): entry is Record<string, unknown> =>
      Boolean(entry && typeof entry === 'object'),
    )
    .map((entry) => ({ startsAt: asString(entry.startsAt) }));
}

function pickSessionStart(session: SessionProjection): string | null {
  return (
    parseScheduleEntries(session.scheduleJson)
      .map((entry) => entry.startsAt)
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0] ?? null
  );
}

function maxIso(values: Array<string | null | undefined>): string | null {
  const sorted = values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime());
  return sorted[0] ?? null;
}

function readAuditResult(error: unknown): 'DENY' | 'ERROR' {
  return isZodValidationError(error) || (error instanceof ApiProblemError && error.status < 500)
    ? 'DENY'
    : 'ERROR';
}

function parseHeadCoachResponse<T>(schema: z.ZodType<T>, payload: unknown, detail: string): T {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiProblemError(500, 'INTERNAL_ERROR', detail);
  }
  return parsed.data;
}

async function recordOversightAudit(params: {
  request: FastifyRequest;
  clubId: string;
  result: 'SUCCESS' | 'DENY' | 'ERROR';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: 'club_head_coach_oversight.read',
    resourceType: 'club',
    resourceId: params.clubId,
    subjectUserId: params.request.auth?.userId ?? null,
    result: params.result,
    sensitiveRead: true,
    metadata: params.metadata,
  });
}

async function recordHeadCoachMutationAudit(params: {
  request: FastifyRequest;
  action: string;
  clubId: string;
  resourceType: string;
  resourceId?: string | null;
  result: 'SUCCESS' | 'DENY' | 'ERROR';
  subjectUserId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId ?? params.clubId,
    subjectUserId: params.subjectUserId ?? params.request.auth?.userId ?? null,
    result: params.result,
    metadata: {
      clubId: params.clubId,
      ...(params.metadata ?? {}),
    },
  });
}

function makeClubPayload(input: ProjectionInput) {
  const activeStaff = input.memberships.filter((membership) => isClubStaffRole(membership.role));
  const ownerId =
    input.memberships.find((membership) => membership.role === 'OWNER')?.userId ??
    input.club.createdByUserId ??
    '';
  return {
    id: input.club.id,
    name: input.club.name,
    city: input.club.city ?? null,
    tagline: input.club.tagline ?? null,
    badgeUrl: input.club.badgeUrl ?? null,
    coverPhotoUrl: input.club.coverPhotoUrl ?? null,
    memberCount: input.memberships.length,
    coachCount: activeStaff.length,
    squadCount: input.squads.length,
    ownerId: ownerId || null,
  };
}

function buildSquadPayload(params: {
  squad: SquadProjection;
  squadMembers: SquadMemberProjection[];
  sessions: SessionProjection[];
  userNames: Map<string, string>;
}) {
  const squadSessions = params.sessions.filter((session) => session.squadId === params.squad.id);
  const nextSession = squadSessions
    .map(pickSessionStart)
    .filter((value): value is string => Boolean(value))
    .filter((value) => new Date(value).getTime() >= Date.now())
    .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0];
  return {
    id: params.squad.id,
    clubId: params.squad.clubId,
    name: params.squad.name,
    ageBandLabel: params.squad.ageBandLabel ?? null,
    memberCount: params.squadMembers.filter((member) => member.squadId === params.squad.id).length,
    ownerCoachId: params.squad.ownerCoachUserId ?? null,
    ownerCoachName: params.squad.ownerCoachUserId
      ? (params.userNames.get(params.squad.ownerCoachUserId) ?? params.squad.ownerCoachUserId)
      : null,
    nextSessionAt: nextSession ?? null,
  };
}

function buildTaskPayload(task: HeadCoachTaskProjection, userNames: Map<string, string>) {
  return {
    id: task.id,
    clubId: task.clubId,
    coachId: task.coachId,
    coachName: task.coachName ?? userNames.get(task.coachId) ?? task.coachId,
    type: task.type,
    status: task.status,
    title: task.title,
    ...(task.details ? { details: task.details } : {}),
    dueAt: task.dueAt ?? null,
    ...(task.athleteId ? { athleteId: task.athleteId } : {}),
    ...(task.athleteName ? { athleteName: task.athleteName } : {}),
    ...(task.bookingId ? { bookingId: task.bookingId } : {}),
    ...(task.offeringId ? { offeringId: task.offeringId } : {}),
    ...(task.squadId ? { squadId: task.squadId } : {}),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    createdByUserId: task.createdByUserId,
    ...(task.completedAt ? { completedAt: task.completedAt } : {}),
    ...(task.completedByUserId ? { completedByUserId: task.completedByUserId } : {}),
  };
}

function buildStandardPayload(standard: HeadCoachStandardProjection) {
  return {
    id: standard.id,
    clubId: standard.clubId,
    category: standard.category,
    title: standard.title,
    ...(standard.description ? { description: standard.description } : {}),
    active: standard.active,
    createdAt: standard.createdAt,
    updatedAt: standard.updatedAt,
    createdByUserId: standard.createdByUserId,
  };
}

function buildWatchlistFromTasks(params: {
  tasks: HeadCoachTaskProjection[];
  userNames: Map<string, string>;
  squadById: Map<string, SquadProjection>;
}): HeadCoachWatchlistProjection[] {
  const now = Date.now();
  const dueSoonCutoff = now + 72 * 60 * 60 * 1000;
  const grouped = new Map<string, HeadCoachTaskProjection[]>();

  for (const task of params.tasks) {
    if (task.status !== 'open' || task.type !== 'required_follow_up' || !task.athleteId) {
      continue;
    }
    const key = `${task.coachId}:${task.athleteId}`;
    const current = grouped.get(key);
    if (current) {
      current.push(task);
    } else {
      grouped.set(key, [task]);
    }
  }

  return Array.from(grouped.values())
    .map((tasks) => {
      const first = tasks[0] as HeadCoachTaskProjection;
      const datedTasks = tasks
        .filter((task) => task.dueAt)
        .sort(
          (left, right) =>
            new Date(left.dueAt as string).getTime() - new Date(right.dueAt as string).getTime(),
        );
      const overdueCount = datedTasks.filter(
        (task) => new Date(task.dueAt as string).getTime() < now,
      ).length;
      const dueSoonCount = datedTasks.filter((task) => {
        const dueAt = new Date(task.dueAt as string).getTime();
        return dueAt >= now && dueAt <= dueSoonCutoff;
      }).length;
      const nextDueAt = datedTasks[0]?.dueAt ?? null;
      const squad = first.squadId ? params.squadById.get(first.squadId) : undefined;
      const risk: HeadCoachWatchlistProjection['risk'] =
        overdueCount > 0 ? 'high' : dueSoonCount > 0 || tasks.length > 1 ? 'watch' : 'stable';
      const attentionScore = overdueCount * 3 + dueSoonCount * 2 + tasks.length;
      const recommendedAction =
        overdueCount > 0
          ? 'Overdue follow-up needs coach action now.'
          : dueSoonCount > 0
            ? 'Follow-up is due soon; confirm the coach action plan.'
            : 'Confirm the assigned coach has completed the required follow-up.';

      return {
        athleteId: first.athleteId as string,
        athleteName: first.athleteName ?? (first.athleteId as string),
        coachId: first.coachId,
        coachName: first.coachName ?? params.userNames.get(first.coachId) ?? first.coachId,
        risk,
        pendingCount: tasks.length,
        overdueCount,
        dueSoonCount,
        recommendedAction,
        nextDueAt,
        latestCoachActionAt: maxIso(tasks.map((task) => task.updatedAt)),
        attentionScore,
        taskIds: tasks.map((task) => task.id),
        ...(squad ? { squadId: squad.id, squadName: squad.name } : {}),
      };
    })
    .sort(
      (left, right) =>
        right.attentionScore - left.attentionScore ||
        left.athleteName.localeCompare(right.athleteName),
    );
}

function buildOversightFromProjection(input: ProjectionInput) {
  const viewerRole = input.isPrivilegedAdmin
    ? (input.viewerMembership?.role ?? 'ADMIN')
    : input.viewerMembership?.role;
  if (!viewerRole || !isClubOversightRole(viewerRole)) {
    throw forbidden('You do not have permission to view head coach oversight', {
      clubId: input.club.id,
    });
  }

  const userNames = new Map(
    input.memberships.map((membership) => [membership.userId, membership.label]),
  );
  const assignedSquadIds = Array.from(
    new Set([
      ...(input.viewerMembership?.squadIds ?? []),
      ...input.squads
        .filter((squad) => squad.ownerCoachUserId === input.authUserId)
        .map((squad) => squad.id),
    ]),
  );
  const scopeType: HeadCoachScopeType =
    viewerRole === 'HEAD_COACH' && !input.isPrivilegedAdmin ? 'assigned_squads' : 'club';
  const visibleSquadIds =
    scopeType === 'assigned_squads'
      ? new Set(assignedSquadIds)
      : new Set(input.squads.map((squad) => squad.id));
  const visibleSquads = input.squads.filter((squad) => visibleSquadIds.has(squad.id));
  const visibleSessions = input.sessions.filter((session) => {
    if (session.clubId !== input.club.id) {
      return false;
    }
    return scopeType === 'club' || (session.squadId ? visibleSquadIds.has(session.squadId) : false);
  });
  const visibleSessionIds = new Set(visibleSessions.map((session) => session.id));
  const sessionById = new Map(visibleSessions.map((session) => [session.id, session]));
  const squadById = new Map(visibleSquads.map((squad) => [squad.id, squad]));
  const visibleBookings = input.bookings.filter((booking) => {
    if (booking.clubId !== input.club.id || booking.status.toUpperCase() === 'CANCELLED') {
      return false;
    }
    return (
      scopeType === 'club' ||
      Boolean(booking.groupSessionId && visibleSessionIds.has(booking.groupSessionId))
    );
  });
  const participantsByBooking = new Map<string, BookingParticipantProjection[]>();
  for (const participant of input.bookingParticipants) {
    const current = participantsByBooking.get(participant.bookingId) ?? [];
    current.push(participant);
    participantsByBooking.set(participant.bookingId, current);
  }

  const completionQueue = visibleBookings
    .filter((booking) => booking.status.toUpperCase() === 'AWAITING_COMPLETION')
    .map((booking) => {
      const linkedSession = booking.groupSessionId
        ? sessionById.get(booking.groupSessionId)
        : undefined;
      const squad = linkedSession?.squadId ? squadById.get(linkedSession.squadId) : undefined;
      const dueAt = addHoursIso(booking.scheduledAt, 24);
      const athleteName = participantsByBooking.get(booking.id)?.[0]?.athleteName ?? booking.id;
      return {
        bookingId: booking.id,
        ...((booking.groupSessionId ?? booking.coachingOfferingId)
          ? { offeringId: booking.groupSessionId ?? booking.coachingOfferingId ?? undefined }
          : {}),
        coachId: booking.coachUserId,
        coachName: userNames.get(booking.coachUserId) ?? booking.coachUserId,
        athleteName,
        service: linkedSession?.title ?? booking.serviceType ?? booking.location,
        scheduledAt: booking.scheduledAt,
        dueAt,
        overdue: new Date(dueAt).getTime() < Date.now(),
        ...(squad ? { squadId: squad.id, squadName: squad.name } : {}),
      };
    })
    .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime());

  const staffWithVisibleWork = new Set<string>();
  for (const session of visibleSessions) {
    if (session.coachUserId) {
      staffWithVisibleWork.add(session.coachUserId);
    }
  }
  for (const booking of visibleBookings) {
    staffWithVisibleWork.add(booking.coachUserId);
  }
  for (const squad of visibleSquads) {
    if (squad.ownerCoachUserId) {
      staffWithVisibleWork.add(squad.ownerCoachUserId);
    }
  }
  const visibleBookingIds = new Set(visibleBookings.map((booking) => booking.id));
  const visibleTasks = input.tasks
    .filter((task) => {
      if (task.clubId !== input.club.id) {
        return false;
      }
      if (scopeType === 'club') {
        return true;
      }
      if (task.squadId && visibleSquadIds.has(task.squadId)) {
        return true;
      }
      if (task.bookingId && visibleBookingIds.has(task.bookingId)) {
        return true;
      }
      return staffWithVisibleWork.has(task.coachId);
    })
    .sort((left, right) => {
      const leftDue = left.dueAt ? new Date(left.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const rightDue = right.dueAt ? new Date(right.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      return (
        leftDue - rightDue ||
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    });

  const visibleStaff = input.memberships.filter((membership) => {
    if (!isClubStaffRole(membership.role)) {
      return false;
    }
    return scopeType === 'club' || staffWithVisibleWork.has(membership.userId);
  });
  const coachHealth = visibleStaff
    .map((membership) => {
      const coachSessions = visibleSessions.filter(
        (session) => session.coachUserId === membership.userId,
      );
      const coachBookings = visibleBookings.filter(
        (booking) => booking.coachUserId === membership.userId,
      );
      const coachCompletionQueue = completionQueue.filter(
        (item) => item.coachId === membership.userId,
      );
      const coachOpenTasks = visibleTasks.filter(
        (task) => task.coachId === membership.userId && task.status === 'open',
      );
      const coachOverdueTasks = coachOpenTasks.filter(
        (task) => task.dueAt && new Date(task.dueAt).getTime() < Date.now(),
      );
      const squadNames = Array.from(
        new Set(
          [
            ...coachSessions.flatMap((session) =>
              session.squadId && squadById.has(session.squadId)
                ? [squadById.get(session.squadId)?.name]
                : [],
            ),
            ...visibleSquads.flatMap((squad) =>
              squad.ownerCoachUserId === membership.userId ? [squad.name] : [],
            ),
          ].filter((value): value is string => Boolean(value)),
        ),
      );
      return {
        coachId: membership.userId,
        coachName: membership.label,
        role: membership.role,
        squadNames,
        completionCount: coachBookings.filter(
          (booking) => booking.status.toUpperCase() === 'COMPLETED',
        ).length,
        overdueCompletionCount: coachCompletionQueue.filter((item) => item.overdue).length,
        watchAthleteCount: 0,
        overdueFollowUpCount: coachOverdueTasks.filter((task) => task.type === 'required_follow_up')
          .length,
        openTaskCount: coachOpenTasks.length,
        sessionNoteExpectationCount: coachOpenTasks.filter(
          (task) => task.type === 'session_note_expectation',
        ).length,
        requiredFollowUpCount: coachOpenTasks.filter((task) => task.type === 'required_follow_up')
          .length,
        latestCoachActionAt: maxIso([
          ...coachSessions.map((session) => session.updatedAt),
          ...coachBookings.map((booking) => booking.updatedAt),
          ...visibleTasks
            .filter((task) => task.coachId === membership.userId)
            .map((task) => task.updatedAt),
        ]),
      };
    })
    .sort((left, right) => left.coachName.localeCompare(right.coachName));

  const squads = visibleSquads.map((squad) =>
    buildSquadPayload({
      squad,
      squadMembers: input.squadMembers,
      sessions: visibleSessions,
      userNames,
    }),
  );
  const scopeSquadIds = scopeType === 'assigned_squads' ? assignedSquadIds : [];
  const watchlist = buildWatchlistFromTasks({
    tasks: visibleTasks,
    userNames,
    squadById,
  });
  const watchAthleteCount = new Set(watchlist.map((item) => item.athleteId)).size;

  return {
    club: makeClubPayload(input),
    viewerMembership: {
      clubId: input.club.id,
      userId: input.authUserId,
      role: viewerRole,
      status: 'active',
      squadIds: scopeSquadIds,
    },
    scope: {
      type: scopeType,
      squadIds: scopeSquadIds,
      label: scopeType === 'club' ? 'Full club oversight' : 'Assigned squads',
    },
    squads,
    coachHealth: coachHealth.map((coach) => ({
      ...coach,
      watchAthleteCount: new Set(
        watchlist.filter((item) => item.coachId === coach.coachId).map((item) => item.athleteId),
      ).size,
    })),
    completionQueue,
    watchlist,
    tasks: visibleTasks.map((task) => buildTaskPayload(task, userNames)),
    standards: input.standards
      .filter((standard) => standard.clubId === input.club.id)
      .sort((left, right) => left.title.localeCompare(right.title))
      .map(buildStandardPayload),
    summary: {
      coachCount: coachHealth.length,
      squadCount: squads.length,
      awaitingCompletionCount: completionQueue.length,
      overdueCompletionCount: completionQueue.filter((item) => item.overdue).length,
      watchAthleteCount,
      overdueFollowUpCount: visibleTasks.filter(
        (task) =>
          task.status === 'open' &&
          task.type === 'required_follow_up' &&
          task.dueAt &&
          new Date(task.dueAt).getTime() < Date.now(),
      ).length,
      openTaskCount: visibleTasks.filter((task) => task.status === 'open').length,
      activeStandardCount: input.standards.filter(
        (standard) => standard.clubId === input.club.id && standard.active,
      ).length,
    },
  };
}

function seedUserName(tables: SeedTables, userId: string): string {
  const user = asRows(tables.users).find((row) => asString(row.id) === userId);
  return asString(user?.name) ?? asString(user?.fullName) ?? asString(user?.email) ?? userId;
}

function buildSeedOversight(params: {
  tables: SeedTables;
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}) {
  const club = asRows(params.tables.clubs).find(
    (row) => asString(row.id) === params.clubId && !asString(row.deletedAt),
  );
  if (!club) {
    throw notFound('Club not found');
  }
  const memberships = asRows(params.tables.clubMemberships)
    .filter(
      (row) =>
        asString(row.clubId) === params.clubId && row.active !== false && !asString(row.deletedAt),
    )
    .flatMap((row): MembershipProjection[] => {
      const role = toRole(row.role);
      const userId = asString(row.userId);
      return role && userId
        ? [
            {
              clubId: params.clubId,
              userId,
              role,
              label: seedUserName(params.tables, userId),
              squadIds: asStringArray(row.squadIds),
            },
          ]
        : [];
    });
  const viewerMembership =
    memberships.find((membership) => membership.userId === params.authUserId) ?? null;
  if (!params.isPrivilegedAdmin && !viewerMembership) {
    throw forbidden('You do not have permission to view head coach oversight', {
      clubId: params.clubId,
    });
  }
  const squads = asRows(params.tables.squads)
    .filter((row) => asString(row.clubId) === params.clubId && !asString(row.deletedAt))
    .map(
      (row): SquadProjection => ({
        id: asString(row.id) ?? '',
        clubId: params.clubId,
        name: asString(row.name) ?? 'Squad',
        ageBandLabel: asString(row.ageBandLabel) ?? null,
        ownerCoachUserId: asString(row.ownerCoachUserId) ?? null,
      }),
    );
  const sessions = asRows(params.tables.groupSessions)
    .filter((row) => asString(row.clubId) === params.clubId && !asString(row.deletedAt))
    .map(
      (row): SessionProjection => ({
        id: asString(row.id) ?? '',
        clubId: asString(row.clubId) ?? null,
        coachUserId: asString(row.coachUserId) ?? '',
        squadId: asString(row.squadId) ?? null,
        title: asString(row.title) ?? 'Club session',
        sessionType: asString(row.sessionType) ?? null,
        scheduleJson: row.scheduleJson,
        status: asString(row.status) ?? null,
        updatedAt: asString(row.updatedAt) ?? null,
      }),
    );
  const bookings = asRows(params.tables.bookings)
    .filter((row) => asString(row.clubId) === params.clubId && !asString(row.deletedAt))
    .map(
      (row): BookingProjection => ({
        id: asString(row.id) ?? '',
        clubId: asString(row.clubId) ?? null,
        coachUserId: asString(row.coachUserId) ?? '',
        groupSessionId: asString(row.groupSessionId) ?? null,
        coachingOfferingId: asString(row.coachingOfferingId) ?? null,
        status: asString(row.status) ?? 'PENDING',
        scheduledAt: asString(row.scheduledAt) ?? new Date(0).toISOString(),
        durationMinutes: asNumber(row.durationMinutes) ?? 60,
        location: asString(row.location) ?? 'Club training ground',
        serviceType: asString(row.serviceType) ?? null,
        updatedAt: asString(row.updatedAt) ?? null,
      }),
    );
  const athletesById = new Map(
    asRows(params.tables.athletes).map((row) => [
      asString(row.id) ?? '',
      asString(row.displayName) ?? 'Athlete',
    ]),
  );
  const bookingParticipants = asRows(params.tables.bookingParticipants)
    .filter((row) => !asString(row.deletedAt))
    .flatMap((row): BookingParticipantProjection[] => {
      const bookingId = asString(row.bookingId);
      const athleteId = asString(row.athleteId);
      return bookingId && athleteId
        ? [
            {
              bookingId,
              athleteId,
              athleteName: athletesById.get(athleteId) ?? 'Athlete',
            },
          ]
        : [];
    });
  const tasks = asRows(params.tables.headCoachTasks)
    .filter((row) => asString(row.clubId) === params.clubId && !asString(row.deletedAt))
    .flatMap((row): HeadCoachTaskProjection[] => {
      const id = asString(row.id);
      const coachId = asString(row.coachId) ?? asString(row.coachUserId);
      const title = asString(row.title);
      if (!id || !coachId || !title) {
        return [];
      }
      return [
        {
          id,
          clubId: params.clubId,
          coachId,
          coachName: seedUserName(params.tables, coachId),
          type: normalizeTaskType(row.type),
          status: normalizeTaskStatus(row.status),
          title,
          details: asString(row.details) ?? null,
          dueAt: asString(row.dueAt) ?? null,
          athleteId: asString(row.athleteId) ?? null,
          athleteName:
            asString(row.athleteName) ??
            (asString(row.athleteId)
              ? athletesById.get(asString(row.athleteId) as string)
              : undefined) ??
            null,
          bookingId: asString(row.bookingId) ?? null,
          offeringId: asString(row.offeringId) ?? null,
          squadId: asString(row.squadId) ?? null,
          createdAt: asString(row.createdAt) ?? new Date(0).toISOString(),
          updatedAt: asString(row.updatedAt) ?? new Date(0).toISOString(),
          createdByUserId: asString(row.createdByUserId) ?? '',
          completedAt: asString(row.completedAt) ?? null,
          completedByUserId: asString(row.completedByUserId) ?? null,
        },
      ];
    });
  const standards = asRows(params.tables.headCoachStandards)
    .filter((row) => asString(row.clubId) === params.clubId && !asString(row.deletedAt))
    .flatMap((row): HeadCoachStandardProjection[] => {
      const id = asString(row.id);
      const title = asString(row.title);
      if (!id || !title) {
        return [];
      }
      return [
        {
          id,
          clubId: params.clubId,
          category: normalizeStandardCategory(row.category),
          title,
          description: asString(row.description) ?? null,
          active: row.active !== false,
          createdAt: asString(row.createdAt) ?? new Date(0).toISOString(),
          updatedAt: asString(row.updatedAt) ?? new Date(0).toISOString(),
          createdByUserId: asString(row.createdByUserId) ?? '',
        },
      ];
    });

  return buildOversightFromProjection({
    club: {
      id: params.clubId,
      name: asString(club.name) ?? 'Club',
      city: asString(club.city) ?? null,
      createdByUserId: asString(club.createdByUserId) ?? null,
      tagline: asString(club.tagline) ?? null,
      badgeUrl: asString(club.badgeUrl) ?? null,
      coverPhotoUrl: asString(club.coverPhotoUrl) ?? null,
    },
    viewerMembership,
    memberships,
    squads,
    squadMembers: asRows(params.tables.squadMemberships)
      .filter((row) => !asString(row.deletedAt))
      .flatMap((row): SquadMemberProjection[] => {
        const squadId = asString(row.squadId);
        const athleteId = asString(row.athleteId);
        return squadId && athleteId ? [{ squadId, athleteId }] : [];
      }),
    sessions,
    bookings,
    bookingParticipants,
    tasks,
    standards,
    authUserId: params.authUserId,
    isPrivilegedAdmin: params.isPrivilegedAdmin,
  });
}

async function buildDbOversight(params: {
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}) {
  const prisma = getPrismaClientOrThrow();
  const club = await prisma.club.findFirst({
    where: {
      id: params.clubId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      city: true,
      createdByUserId: true,
      tagline: true,
      badgeUrl: true,
      coverPhotoUrl: true,
    },
  });
  if (!club) {
    throw notFound('Club not found');
  }
  const [
    membershipsRaw,
    squadsRaw,
    squadMembersRaw,
    sessionsRaw,
    bookingsRaw,
    tasksRaw,
    standardsRaw,
  ] = await Promise.all([
    prisma.clubMembership.findMany({
      where: {
        clubId: params.clubId,
        active: true,
        deletedAt: null,
      },
      select: {
        userId: true,
        role: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.squad.findMany({
      where: {
        clubId: params.clubId,
        deletedAt: null,
      },
      select: {
        id: true,
        clubId: true,
        name: true,
        ageBandLabel: true,
        ownerCoachUserId: true,
      },
    }),
    prisma.squadMembership.findMany({
      where: {
        squad: {
          clubId: params.clubId,
          deletedAt: null,
        },
        deletedAt: null,
      },
      select: {
        squadId: true,
        athleteId: true,
      },
    }),
    prisma.groupSession.findMany({
      where: {
        clubId: params.clubId,
        deletedAt: null,
      },
      select: {
        id: true,
        clubId: true,
        coachUserId: true,
        squadId: true,
        title: true,
        sessionType: true,
        scheduleJson: true,
        status: true,
        updatedAt: true,
      },
    }),
    prisma.booking.findMany({
      where: {
        clubId: params.clubId,
        deletedAt: null,
        status: {
          in: ['AWAITING_COMPLETION', 'COMPLETED', 'CONFIRMED'],
        },
      },
      select: {
        id: true,
        clubId: true,
        coachUserId: true,
        groupSessionId: true,
        coachingOfferingId: true,
        status: true,
        scheduledAt: true,
        durationMinutes: true,
        location: true,
        serviceType: true,
        updatedAt: true,
        participants: {
          where: {
            deletedAt: null,
          },
          select: {
            athleteId: true,
            athlete: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: {
        scheduledAt: 'desc',
      },
      take: 250,
    }),
    prisma.headCoachTask.findMany({
      where: {
        clubId: params.clubId,
        deletedAt: null,
      },
      select: {
        id: true,
        clubId: true,
        coachUserId: true,
        type: true,
        status: true,
        title: true,
        details: true,
        dueAt: true,
        athleteId: true,
        athleteName: true,
        bookingId: true,
        offeringId: true,
        squadId: true,
        createdAt: true,
        updatedAt: true,
        createdByUserId: true,
        completedAt: true,
        completedByUserId: true,
        coach: {
          select: {
            name: true,
            email: true,
          },
        },
        athlete: {
          select: {
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.headCoachStandard.findMany({
      where: {
        clubId: params.clubId,
        deletedAt: null,
      },
      select: {
        id: true,
        clubId: true,
        category: true,
        title: true,
        description: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        createdByUserId: true,
      },
      orderBy: {
        title: 'asc',
      },
    }),
  ]);
  const memberships = membershipsRaw.flatMap((membership): MembershipProjection[] => {
    const role = toRole(membership.role);
    return role
      ? [
          {
            clubId: params.clubId,
            userId: membership.userId,
            role,
            label: membership.user.name ?? membership.user.email ?? membership.userId,
            squadIds: [],
          },
        ]
      : [];
  });
  const viewerMembership =
    memberships.find((membership) => membership.userId === params.authUserId) ?? null;
  if (!params.isPrivilegedAdmin && !viewerMembership) {
    throw forbidden('You do not have permission to view head coach oversight', {
      clubId: params.clubId,
    });
  }

  return buildOversightFromProjection({
    club,
    viewerMembership,
    memberships,
    squads: squadsRaw.map((squad) => ({
      id: squad.id,
      clubId: squad.clubId,
      name: squad.name,
      ageBandLabel: squad.ageBandLabel,
      ownerCoachUserId: squad.ownerCoachUserId,
    })),
    squadMembers: squadMembersRaw,
    sessions: sessionsRaw.map((session) => ({
      ...session,
      clubId: session.clubId ?? null,
      squadId: session.squadId ?? null,
      status: String(session.status),
      updatedAt: session.updatedAt.toISOString(),
    })),
    bookings: bookingsRaw.map((booking) => ({
      id: booking.id,
      clubId: booking.clubId ?? null,
      coachUserId: booking.coachUserId,
      groupSessionId: booking.groupSessionId ?? null,
      coachingOfferingId: booking.coachingOfferingId ?? null,
      status: String(booking.status),
      scheduledAt: booking.scheduledAt.toISOString(),
      durationMinutes: booking.durationMinutes,
      location: booking.location,
      serviceType: booking.serviceType,
      updatedAt: booking.updatedAt.toISOString(),
    })),
    bookingParticipants: bookingsRaw.flatMap((booking) =>
      booking.participants.map((participant) => ({
        bookingId: booking.id,
        athleteId: participant.athleteId,
        athleteName: participant.athlete.displayName,
      })),
    ),
    tasks: tasksRaw.map((task) => ({
      id: task.id,
      clubId: task.clubId,
      coachId: task.coachUserId,
      coachName: task.coach.name ?? task.coach.email ?? task.coachUserId,
      type: normalizeTaskType(task.type),
      status: normalizeTaskStatus(task.status),
      title: task.title,
      details: task.details,
      dueAt: task.dueAt?.toISOString() ?? null,
      athleteId: task.athleteId,
      athleteName: task.athleteName ?? task.athlete?.displayName ?? null,
      bookingId: task.bookingId,
      offeringId: task.offeringId,
      squadId: task.squadId,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      createdByUserId: task.createdByUserId,
      completedAt: task.completedAt?.toISOString() ?? null,
      completedByUserId: task.completedByUserId,
    })),
    standards: standardsRaw.map((standard) => ({
      id: standard.id,
      clubId: standard.clubId,
      category: normalizeStandardCategory(standard.category),
      title: standard.title,
      description: standard.description,
      active: standard.active,
      createdAt: standard.createdAt.toISOString(),
      updatedAt: standard.updatedAt.toISOString(),
      createdByUserId: standard.createdByUserId,
    })),
    authUserId: params.authUserId,
    isPrivilegedAdmin: params.isPrivilegedAdmin,
  });
}

export async function resolveHeadCoachOversight(params: {
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}) {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    return buildDbOversight(params);
  }
  const store = getApiDataBackend() === 'db' ? getDbFixtureStore() : getMarketplaceSeedStore();
  return buildSeedOversight({
    tables: store.tables as SeedTables,
    ...params,
  });
}

function ensureMutableTable(tables: SeedTables, key: string): SeedRow[] {
  if (!Array.isArray(tables[key])) {
    tables[key] = [];
  }
  return tables[key];
}

function resolveMutableHeadCoachTables(): SeedTables | null {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    return null;
  }
  const store = getApiDataBackend() === 'db' ? getDbFixtureStore() : getMarketplaceSeedStore();
  return store.tables as SeedTables;
}

async function resolveMutationContext(params: {
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}) {
  return resolveHeadCoachOversight(params);
}

function assertVisibleCoach(
  oversight: Awaited<ReturnType<typeof resolveHeadCoachOversight>>,
  coachId: string,
) {
  const coach = oversight.coachHealth.find((item) => item.coachId === coachId);
  if (!coach) {
    throw forbidden('Target coach is outside your head-coach oversight scope', { coachId });
  }
  return coach;
}

function resolveCreateTaskPayload(params: {
  oversight: Awaited<ReturnType<typeof resolveHeadCoachOversight>>;
  body: z.infer<typeof createHeadCoachTaskRequestSchema>;
}) {
  const coach = assertVisibleCoach(params.oversight, params.body.coachId);
  const bookingContext = params.body.bookingId
    ? params.oversight.completionQueue.find((item) => item.bookingId === params.body.bookingId)
    : undefined;
  if (params.body.bookingId && !bookingContext) {
    throw forbidden('Booking is outside your head-coach oversight scope', {
      bookingId: params.body.bookingId,
    });
  }
  const dueAt =
    parseOptionalDate(params.body.dueAt ?? bookingContext?.dueAt)?.toISOString() ?? addDaysIso(7);
  const title =
    params.body.title ??
    (params.body.type === 'session_note_expectation'
      ? `Submit session notes for ${bookingContext?.athleteName ?? coach.coachName}`
      : `Follow up with ${params.body.athleteName ?? coach.coachName}`);

  return {
    coach,
    task: {
      coachId: params.body.coachId,
      type: params.body.type,
      dueAt,
      athleteId: params.body.athleteId,
      athleteName: params.body.athleteName ?? bookingContext?.athleteName,
      bookingId: params.body.bookingId,
      offeringId: params.body.offeringId ?? bookingContext?.offeringId,
      squadId: params.body.squadId ?? bookingContext?.squadId,
      title,
      details: params.body.details,
    },
  };
}

function seedTaskProjection(row: SeedRow, tables: SeedTables): HeadCoachTaskProjection {
  const coachId = asString(row.coachId) ?? asString(row.coachUserId) ?? '';
  const athleteId = asString(row.athleteId);
  const athleteName =
    asString(row.athleteName) ??
    asRows(tables.athletes)
      .map((athlete) => ({
        id: asString(athlete.id),
        name: asString(athlete.displayName),
      }))
      .find((athlete) => athlete.id === athleteId)?.name ??
    null;
  return {
    id: asString(row.id) ?? '',
    clubId: asString(row.clubId) ?? '',
    coachId,
    coachName: coachId ? seedUserName(tables, coachId) : null,
    type: normalizeTaskType(row.type),
    status: normalizeTaskStatus(row.status),
    title: asString(row.title) ?? 'Head-coach task',
    details: asString(row.details) ?? null,
    dueAt: asString(row.dueAt) ?? null,
    athleteId: athleteId ?? null,
    athleteName,
    bookingId: asString(row.bookingId) ?? null,
    offeringId: asString(row.offeringId) ?? null,
    squadId: asString(row.squadId) ?? null,
    createdAt: asString(row.createdAt) ?? new Date().toISOString(),
    updatedAt: asString(row.updatedAt) ?? new Date().toISOString(),
    createdByUserId: asString(row.createdByUserId) ?? '',
    completedAt: asString(row.completedAt) ?? null,
    completedByUserId: asString(row.completedByUserId) ?? null,
  };
}

function seedStandardProjection(row: SeedRow): HeadCoachStandardProjection {
  return {
    id: asString(row.id) ?? '',
    clubId: asString(row.clubId) ?? '',
    category: normalizeStandardCategory(row.category),
    title: asString(row.title) ?? 'Head-coach standard',
    description: asString(row.description) ?? null,
    active: row.active !== false,
    createdAt: asString(row.createdAt) ?? new Date().toISOString(),
    updatedAt: asString(row.updatedAt) ?? new Date().toISOString(),
    createdByUserId: asString(row.createdByUserId) ?? '',
  };
}

async function createHeadCoachTask(params: {
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
  body: z.infer<typeof createHeadCoachTaskRequestSchema>;
}) {
  const oversight = await resolveMutationContext(params);
  const payload = resolveCreateTaskPayload({ oversight, body: params.body });
  const now = new Date().toISOString();
  const taskId = newId('hct');
  const tables = resolveMutableHeadCoachTables();
  if (tables) {
    const row = {
      id: taskId,
      clubId: params.clubId,
      coachId: payload.task.coachId,
      coachUserId: payload.task.coachId,
      type: payload.task.type,
      status: 'open',
      title: payload.task.title,
      details: payload.task.details ?? null,
      dueAt: payload.task.dueAt,
      athleteId: payload.task.athleteId ?? null,
      athleteName: payload.task.athleteName ?? null,
      bookingId: payload.task.bookingId ?? null,
      offeringId: payload.task.offeringId ?? null,
      squadId: payload.task.squadId ?? null,
      createdByUserId: params.authUserId,
      updatedByUserId: params.authUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
      completedAt: null,
      completedByUserId: null,
    };
    ensureMutableTable(tables, 'headCoachTasks').push(row);
    return buildTaskPayload(seedTaskProjection(row, tables), new Map());
  }

  const prisma = getPrismaClientOrThrow();
  const created = await prisma.headCoachTask.create({
    data: {
      id: taskId,
      clubId: params.clubId,
      coachUserId: payload.task.coachId,
      type: payload.task.type,
      status: 'open',
      title: payload.task.title,
      details: payload.task.details ?? null,
      dueAt: new Date(payload.task.dueAt),
      athleteId: payload.task.athleteId ?? null,
      athleteName: payload.task.athleteName ?? null,
      bookingId: payload.task.bookingId ?? null,
      offeringId: payload.task.offeringId ?? null,
      squadId: payload.task.squadId ?? null,
      createdByUserId: params.authUserId,
      updatedByUserId: params.authUserId,
    },
    include: {
      coach: {
        select: {
          name: true,
          email: true,
        },
      },
      athlete: {
        select: {
          displayName: true,
        },
      },
    },
  });
  return buildTaskPayload(
    {
      id: created.id,
      clubId: created.clubId,
      coachId: created.coachUserId,
      coachName: created.coach.name ?? created.coach.email ?? created.coachUserId,
      type: normalizeTaskType(created.type),
      status: normalizeTaskStatus(created.status),
      title: created.title,
      details: created.details,
      dueAt: created.dueAt?.toISOString() ?? null,
      athleteId: created.athleteId,
      athleteName: created.athleteName ?? created.athlete?.displayName ?? null,
      bookingId: created.bookingId,
      offeringId: created.offeringId,
      squadId: created.squadId,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      createdByUserId: created.createdByUserId,
      completedAt: created.completedAt?.toISOString() ?? null,
      completedByUserId: created.completedByUserId,
    },
    new Map(),
  );
}

async function updateHeadCoachTaskStatus(params: {
  clubId: string;
  taskId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
  status: HeadCoachTaskStatus;
}) {
  const oversight = await resolveMutationContext(params);
  const visibleTask = oversight.tasks.find((task) => task.id === params.taskId);
  if (!visibleTask) {
    throw forbidden('Task is outside your head-coach oversight scope', { taskId: params.taskId });
  }
  const now = new Date().toISOString();
  const tables = resolveMutableHeadCoachTables();
  if (tables) {
    const row = asRows(tables.headCoachTasks).find(
      (task) =>
        asString(task.id) === params.taskId &&
        asString(task.clubId) === params.clubId &&
        !asString(task.deletedAt),
    );
    if (!row) {
      throw notFound('Head-coach task not found');
    }
    row.status = params.status;
    row.updatedByUserId = params.authUserId;
    row.updatedAt = now;
    row.version = asNumber(row.version) ?? 1;
    row.completedAt = params.status === 'done' ? now : null;
    row.completedByUserId = params.status === 'done' ? params.authUserId : null;
    return buildTaskPayload(seedTaskProjection(row, tables), new Map());
  }

  const prisma = getPrismaClientOrThrow();
  const updated = await prisma.headCoachTask.update({
    where: {
      id: params.taskId,
    },
    data: {
      status: params.status,
      updatedByUserId: params.authUserId,
      completedAt: params.status === 'done' ? new Date(now) : null,
      completedByUserId: params.status === 'done' ? params.authUserId : null,
      version: {
        increment: 1,
      },
    },
    include: {
      coach: {
        select: {
          name: true,
          email: true,
        },
      },
      athlete: {
        select: {
          displayName: true,
        },
      },
    },
  });
  return buildTaskPayload(
    {
      id: updated.id,
      clubId: updated.clubId,
      coachId: updated.coachUserId,
      coachName: updated.coach.name ?? updated.coach.email ?? updated.coachUserId,
      type: normalizeTaskType(updated.type),
      status: normalizeTaskStatus(updated.status),
      title: updated.title,
      details: updated.details,
      dueAt: updated.dueAt?.toISOString() ?? null,
      athleteId: updated.athleteId,
      athleteName: updated.athleteName ?? updated.athlete?.displayName ?? null,
      bookingId: updated.bookingId,
      offeringId: updated.offeringId,
      squadId: updated.squadId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      createdByUserId: updated.createdByUserId,
      completedAt: updated.completedAt?.toISOString() ?? null,
      completedByUserId: updated.completedByUserId,
    },
    new Map(),
  );
}

async function createHeadCoachStandard(params: {
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
  body: z.infer<typeof createHeadCoachStandardRequestSchema>;
}) {
  await resolveMutationContext(params);
  const now = new Date().toISOString();
  const standardId = newId('hcs');
  const category = params.body.category ?? 'session_notes';
  const tables = resolveMutableHeadCoachTables();
  if (tables) {
    const row = {
      id: standardId,
      clubId: params.clubId,
      category,
      title: params.body.title,
      description: params.body.description ?? null,
      active: true,
      createdByUserId: params.authUserId,
      updatedByUserId: params.authUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    };
    ensureMutableTable(tables, 'headCoachStandards').push(row);
    return buildStandardPayload(seedStandardProjection(row));
  }

  const prisma = getPrismaClientOrThrow();
  const created = await prisma.headCoachStandard.create({
    data: {
      id: standardId,
      clubId: params.clubId,
      category,
      title: params.body.title,
      description: params.body.description ?? null,
      active: true,
      createdByUserId: params.authUserId,
      updatedByUserId: params.authUserId,
    },
  });
  return buildStandardPayload({
    id: created.id,
    clubId: created.clubId,
    category: normalizeStandardCategory(created.category),
    title: created.title,
    description: created.description,
    active: created.active,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
    createdByUserId: created.createdByUserId,
  });
}

async function updateHeadCoachStandard(params: {
  clubId: string;
  standardId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
  active?: boolean;
}) {
  const oversight = await resolveMutationContext(params);
  const visibleStandard = oversight.standards.find((standard) => standard.id === params.standardId);
  if (!visibleStandard) {
    throw forbidden('Standard is outside your head-coach oversight scope', {
      standardId: params.standardId,
    });
  }
  const nextActive = params.active ?? !visibleStandard.active;
  const now = new Date().toISOString();
  const tables = resolveMutableHeadCoachTables();
  if (tables) {
    const row = asRows(tables.headCoachStandards).find(
      (standard) =>
        asString(standard.id) === params.standardId &&
        asString(standard.clubId) === params.clubId &&
        !asString(standard.deletedAt),
    );
    if (!row) {
      throw notFound('Head-coach standard not found');
    }
    row.active = nextActive;
    row.updatedByUserId = params.authUserId;
    row.updatedAt = now;
    row.version = asNumber(row.version) ?? 1;
    return buildStandardPayload(seedStandardProjection(row));
  }

  const prisma = getPrismaClientOrThrow();
  const updated = await prisma.headCoachStandard.update({
    where: {
      id: params.standardId,
    },
    data: {
      active: nextActive,
      updatedByUserId: params.authUserId,
      version: {
        increment: 1,
      },
    },
  });
  return buildStandardPayload({
    id: updated.id,
    clubId: updated.clubId,
    category: normalizeStandardCategory(updated.category),
    title: updated.title,
    description: updated.description,
    active: updated.active,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    createdByUserId: updated.createdByUserId,
  });
}

export function registerClubHeadCoachRoutes(app: FastifyInstance): void {
  app.get('/clubs/:clubId/head-coach/oversight', async (request, reply) => {
    const rawParams = (request.params ?? {}) as SeedRow;
    const clubId = asString(rawParams.clubId) ?? '';
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const params = paramsSchema.parse(rawParams);
      const data = await resolveHeadCoachOversight({
        clubId: params.clubId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      const response = parseHeadCoachResponse(
        headCoachOversightResponseSchema,
        {
          ...data,
          clubId: params.clubId,
          requestId: request.requestId,
        },
        'Head-coach oversight response invalid',
      );
      await recordOversightAudit({
        request,
        clubId: params.clubId,
        result: 'SUCCESS',
        metadata: {
          scopeType: response.scope.type,
          squadIds: response.scope.squadIds,
          coachCount: response.summary.coachCount,
          awaitingCompletionCount: response.summary.awaitingCompletionCount,
        },
      });
      return reply.send(response);
    } catch (error) {
      await recordOversightAudit({
        request,
        clubId,
        result: readAuditResult(error),
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });

  app.post('/clubs/:clubId/head-coach/tasks', async (request, reply) => {
    const rawParams = (request.params ?? {}) as SeedRow;
    const rawBody = (request.body ?? {}) as SeedRow;
    const clubId = asString(rawParams.clubId) ?? '';
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const params = paramsSchema.parse(rawParams);
      const body = createHeadCoachTaskRequestSchema.parse(rawBody);
      const task = await createHeadCoachTask({
        clubId: params.clubId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        body,
      });
      const response = parseHeadCoachResponse(
        headCoachTaskResponseSchema,
        {
          ...task,
          requestId: request.requestId,
        },
        'Head-coach task response invalid',
      );
      await recordHeadCoachMutationAudit({
        request,
        action: 'club_head_coach_task.create',
        clubId: params.clubId,
        resourceType: 'head_coach_task',
        resourceId: response.id,
        result: 'SUCCESS',
        subjectUserId: body.coachId,
        metadata: {
          taskType: response.type,
          coachId: body.coachId,
          athleteId: body.athleteId ?? null,
          bookingId: body.bookingId ?? null,
          dueAt: response.dueAt,
        },
      });
      return reply.code(201).send(response);
    } catch (error) {
      await recordHeadCoachMutationAudit({
        request,
        action: 'club_head_coach_task.create',
        clubId,
        resourceType: 'head_coach_task',
        result: readAuditResult(error),
        subjectUserId: asString(rawBody.coachId) ?? null,
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          taskType: asString(rawBody.type) ?? null,
          bookingId: asString(rawBody.bookingId) ?? null,
        },
      });
      throw error;
    }
  });

  app.patch('/clubs/:clubId/head-coach/tasks/:taskId', async (request, reply) => {
    const rawParams = (request.params ?? {}) as SeedRow;
    const rawBody = (request.body ?? {}) as SeedRow;
    const clubId = asString(rawParams.clubId) ?? '';
    const taskId = asString(rawParams.taskId) ?? '';
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const params = taskParamsSchema.parse(rawParams);
      const body = updateHeadCoachTaskRequestSchema.parse(rawBody);
      const task = await updateHeadCoachTaskStatus({
        clubId: params.clubId,
        taskId: params.taskId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        status: body.status,
      });
      const response = parseHeadCoachResponse(
        headCoachTaskResponseSchema,
        {
          ...task,
          requestId: request.requestId,
        },
        'Head-coach task response invalid',
      );
      await recordHeadCoachMutationAudit({
        request,
        action: 'club_head_coach_task.update',
        clubId: params.clubId,
        resourceType: 'head_coach_task',
        resourceId: params.taskId,
        result: 'SUCCESS',
        subjectUserId: response.coachId,
        metadata: {
          status: response.status,
          completedAt: response.completedAt ?? null,
        },
      });
      return reply.send(response);
    } catch (error) {
      await recordHeadCoachMutationAudit({
        request,
        action: 'club_head_coach_task.update',
        clubId,
        resourceType: 'head_coach_task',
        resourceId: taskId,
        result: readAuditResult(error),
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: asString(rawBody.status) ?? null,
        },
      });
      throw error;
    }
  });

  app.post('/clubs/:clubId/head-coach/standards', async (request, reply) => {
    const rawParams = (request.params ?? {}) as SeedRow;
    const rawBody = (request.body ?? {}) as SeedRow;
    const clubId = asString(rawParams.clubId) ?? '';
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const params = paramsSchema.parse(rawParams);
      const body = createHeadCoachStandardRequestSchema.parse(rawBody);
      const standard = await createHeadCoachStandard({
        clubId: params.clubId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        body,
      });
      const response = parseHeadCoachResponse(
        headCoachStandardResponseSchema,
        {
          ...standard,
          requestId: request.requestId,
        },
        'Head-coach standard response invalid',
      );
      await recordHeadCoachMutationAudit({
        request,
        action: 'club_head_coach_standard.create',
        clubId: params.clubId,
        resourceType: 'head_coach_standard',
        resourceId: response.id,
        result: 'SUCCESS',
        metadata: {
          category: response.category,
          active: response.active,
        },
      });
      return reply.code(201).send(response);
    } catch (error) {
      await recordHeadCoachMutationAudit({
        request,
        action: 'club_head_coach_standard.create',
        clubId,
        resourceType: 'head_coach_standard',
        result: readAuditResult(error),
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          category: asString(rawBody.category) ?? null,
        },
      });
      throw error;
    }
  });

  app.patch('/clubs/:clubId/head-coach/standards/:standardId', async (request, reply) => {
    const rawParams = (request.params ?? {}) as SeedRow;
    const rawBody = (request.body ?? {}) as SeedRow;
    const clubId = asString(rawParams.clubId) ?? '';
    const standardId = asString(rawParams.standardId) ?? '';
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const params = standardParamsSchema.parse(rawParams);
      const body = updateHeadCoachStandardRequestSchema.parse(rawBody);
      const standard = await updateHeadCoachStandard({
        clubId: params.clubId,
        standardId: params.standardId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
        active: body.active,
      });
      const response = parseHeadCoachResponse(
        headCoachStandardResponseSchema,
        {
          ...standard,
          requestId: request.requestId,
        },
        'Head-coach standard response invalid',
      );
      await recordHeadCoachMutationAudit({
        request,
        action: 'club_head_coach_standard.update',
        clubId: params.clubId,
        resourceType: 'head_coach_standard',
        resourceId: params.standardId,
        result: 'SUCCESS',
        metadata: {
          active: response.active,
        },
      });
      return reply.send(response);
    } catch (error) {
      await recordHeadCoachMutationAudit({
        request,
        action: 'club_head_coach_standard.update',
        clubId,
        resourceType: 'head_coach_standard',
        resourceId: standardId,
        result: readAuditResult(error),
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          active: typeof rawBody.active === 'boolean' ? rawBody.active : null,
        },
      });
      throw error;
    }
  });
}
