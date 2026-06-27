import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  isClubOversightRole,
  isClubStaffRole,
  parseOrganizationRole,
  type ClubRole,
} from '@clubroom/shared-contracts';
import { recordAuditEvent } from '../../lib/audit-runtime.js';
import { isPrivilegedAdminAuth } from '../../lib/authz.js';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { ApiProblemError, forbidden, notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;
type HeadCoachScopeType = 'club' | 'assigned_squads';

interface ClubProjection {
  id: string;
  name: string;
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
  coachUserId: string;
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

interface ProjectionInput {
  club: ClubProjection;
  viewerMembership: MembershipProjection | null;
  memberships: MembershipProjection[];
  squads: SquadProjection[];
  squadMembers: SquadMemberProjection[];
  sessions: SessionProjection[];
  bookings: BookingProjection[];
  bookingParticipants: BookingParticipantProjection[];
  authUserId: string;
  isPrivilegedAdmin: boolean;
}

const paramsSchema = z.object({
  clubId: z.string().min(1),
});

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

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
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
    .map((entry) => ({ startsAt: asString(entry.startsAt) }));
}

function pickSessionStart(session: SessionProjection): string | null {
  return parseScheduleEntries(session.scheduleJson)
    .map((entry) => entry.startsAt)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0] ?? null;
}

function maxIso(values: Array<string | null | undefined>): string | null {
  const sorted = values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime());
  return sorted[0] ?? null;
}

function readAuditResult(error: unknown): 'DENY' | 'ERROR' {
  return error instanceof z.ZodError ||
    (error instanceof ApiProblemError && error.status < 500)
    ? 'DENY'
    : 'ERROR';
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

function makeClubPayload(input: ProjectionInput) {
  const activeStaff = input.memberships.filter((membership) => isClubStaffRole(membership.role));
  const ownerId =
    input.memberships.find((membership) => membership.role === 'OWNER')?.userId ??
    input.club.createdByUserId ??
    '';
  return {
    id: input.club.id,
    name: input.club.name,
    city: 'Club',
    ...(input.club.badgeUrl ? { badge: input.club.badgeUrl } : {}),
    ...(input.club.coverPhotoUrl ? { photoUrl: input.club.coverPhotoUrl } : {}),
    ...(input.club.badgeUrl ? { profilePhotoUrl: input.club.badgeUrl } : {}),
    ...(input.club.coverPhotoUrl ? { coverPhotoUrl: input.club.coverPhotoUrl } : {}),
    ...(input.club.tagline ? { tagline: input.club.tagline } : {}),
    memberCount: input.memberships.length,
    coachCount: activeStaff.length,
    squadCount: input.squads.length,
    ownerId,
    inviteCode: '',
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
    level: params.squad.ageBandLabel ?? 'Squad',
    memberCount: params.squadMembers.filter((member) => member.squadId === params.squad.id).length,
    primaryCoach: params.squad.ownerCoachUserId
      ? (params.userNames.get(params.squad.ownerCoachUserId) ?? 'Assigned coach')
      : 'Unassigned',
    meetLocation: 'Club training ground',
    ...(nextSession ? { nextSession } : {}),
  };
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

  const userNames = new Map(input.memberships.map((membership) => [membership.userId, membership.label]));
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
    return scopeType === 'club' || Boolean(booking.groupSessionId && visibleSessionIds.has(booking.groupSessionId));
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
      const linkedSession = booking.groupSessionId ? sessionById.get(booking.groupSessionId) : undefined;
      const squad = linkedSession?.squadId ? squadById.get(linkedSession.squadId) : undefined;
      const dueAt = addHoursIso(booking.scheduledAt, 24);
      const athleteName = participantsByBooking.get(booking.id)?.[0]?.athleteName ?? 'Athlete';
      return {
        bookingId: booking.id,
        ...(booking.groupSessionId ?? booking.coachingOfferingId
          ? { offeringId: booking.groupSessionId ?? booking.coachingOfferingId ?? undefined }
          : {}),
        coachId: booking.coachUserId,
        coachName: userNames.get(booking.coachUserId) ?? 'Club coach',
        athleteName,
        service: linkedSession?.title ?? booking.serviceType ?? 'Club session',
        scheduledAt: booking.scheduledAt,
        dueAt,
        overdue: new Date(dueAt).getTime() < Date.now(),
        ...(squad ? { squadId: squad.id, squadName: squad.name } : {}),
      };
    })
    .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime());

  const staffWithVisibleWork = new Set<string>();
  for (const session of visibleSessions) {
    staffWithVisibleWork.add(session.coachUserId);
  }
  for (const booking of visibleBookings) {
    staffWithVisibleWork.add(booking.coachUserId);
  }
  for (const squad of visibleSquads) {
    if (squad.ownerCoachUserId) {
      staffWithVisibleWork.add(squad.ownerCoachUserId);
    }
  }

  const visibleStaff = input.memberships.filter((membership) => {
    if (!isClubStaffRole(membership.role)) {
      return false;
    }
    return scopeType === 'club' || staffWithVisibleWork.has(membership.userId);
  });
  const coachHealth = visibleStaff
    .map((membership) => {
      const coachSessions = visibleSessions.filter((session) => session.coachUserId === membership.userId);
      const coachBookings = visibleBookings.filter((booking) => booking.coachUserId === membership.userId);
      const coachCompletionQueue = completionQueue.filter((item) => item.coachId === membership.userId);
      const squadNames = Array.from(
        new Set(
          [
            ...coachSessions.flatMap((session) =>
              session.squadId && squadById.has(session.squadId) ? [squadById.get(session.squadId)?.name] : [],
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
        completionCount: coachBookings.filter((booking) => booking.status.toUpperCase() === 'COMPLETED').length,
        overdueCompletionCount: coachCompletionQueue.filter((item) => item.overdue).length,
        watchAthleteCount: 0,
        overdueFollowUpCount: 0,
        openTaskCount: 0,
        sessionNoteExpectationCount: 0,
        requiredFollowUpCount: 0,
        latestCoachActionAt: maxIso([
          ...coachSessions.map((session) => session.updatedAt),
          ...coachBookings.map((booking) => booking.updatedAt),
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

  return {
    club: makeClubPayload(input),
    viewerMembership: {
      clubId: input.club.id,
      userId: input.authUserId,
      role: viewerRole,
      status: 'active',
      joinSource: 'created',
      squadIds: scopeSquadIds,
    },
    scope: {
      type: scopeType,
      squadIds: scopeSquadIds,
      label: scopeType === 'club' ? 'Full club oversight' : 'Assigned squads',
    },
    squads,
    coachHealth,
    completionQueue,
    watchlist: [],
    tasks: [],
    standards: [],
    summary: {
      coachCount: coachHealth.length,
      squadCount: squads.length,
      awaitingCompletionCount: completionQueue.length,
      overdueCompletionCount: completionQueue.filter((item) => item.overdue).length,
      watchAthleteCount: 0,
      overdueFollowUpCount: 0,
      openTaskCount: 0,
      activeStandardCount: 0,
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
        asString(row.clubId) === params.clubId &&
        row.active !== false &&
        !asString(row.deletedAt),
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
  const viewerMembership = memberships.find((membership) => membership.userId === params.authUserId) ?? null;
  if (!params.isPrivilegedAdmin && !viewerMembership) {
    throw forbidden('You do not have permission to view head coach oversight', {
      clubId: params.clubId,
    });
  }
  const squads = asRows(params.tables.squads)
    .filter((row) => asString(row.clubId) === params.clubId && !asString(row.deletedAt))
    .map((row): SquadProjection => ({
      id: asString(row.id) ?? '',
      clubId: params.clubId,
      name: asString(row.name) ?? 'Squad',
      ageBandLabel: asString(row.ageBandLabel) ?? null,
      ownerCoachUserId: asString(row.ownerCoachUserId) ?? null,
    }));
  const sessions = asRows(params.tables.groupSessions)
    .filter((row) => asString(row.clubId) === params.clubId && !asString(row.deletedAt))
    .map((row): SessionProjection => ({
      id: asString(row.id) ?? '',
      clubId: asString(row.clubId) ?? null,
      coachUserId: asString(row.coachUserId) ?? '',
      squadId: asString(row.squadId) ?? null,
      title: asString(row.title) ?? 'Club session',
      sessionType: asString(row.sessionType) ?? null,
      scheduleJson: row.scheduleJson,
      status: asString(row.status) ?? null,
      updatedAt: asString(row.updatedAt) ?? null,
    }));
  const bookings = asRows(params.tables.bookings)
    .filter((row) => asString(row.clubId) === params.clubId && !asString(row.deletedAt))
    .map((row): BookingProjection => ({
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
    }));
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

  return buildOversightFromProjection({
    club: {
      id: params.clubId,
      name: asString(club.name) ?? 'Club',
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
      createdByUserId: true,
      tagline: true,
      badgeUrl: true,
      coverPhotoUrl: true,
    },
  });
  if (!club) {
    throw notFound('Club not found');
  }
  const [membershipsRaw, squadsRaw, squadMembersRaw, sessionsRaw, bookingsRaw] = await Promise.all([
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
  const viewerMembership = memberships.find((membership) => membership.userId === params.authUserId) ?? null;
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

export function registerClubHeadCoachRoutes(app: FastifyInstance): void {
  app.get('/clubs/:clubId/head-coach/oversight', async (request, reply) => {
    const authUserId = requireAuthUserId(request.auth?.userId);
    const params = paramsSchema.parse(request.params ?? {});
    try {
      const data = await resolveHeadCoachOversight({
        clubId: params.clubId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      await recordOversightAudit({
        request,
        clubId: params.clubId,
        result: 'SUCCESS',
        metadata: {
          scopeType: data.scope.type,
          squadIds: data.scope.squadIds,
          coachCount: data.summary.coachCount,
          awaitingCompletionCount: data.summary.awaitingCompletionCount,
        },
      });
      return reply.send({
        ...data,
        clubId: params.clubId,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordOversightAudit({
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
}
