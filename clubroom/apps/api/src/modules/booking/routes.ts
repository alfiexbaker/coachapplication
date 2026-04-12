import crypto from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  bookingIdSchema,
  cancelBookingRequestSchema,
  createBookingRequestSchema,
  inviteResponseRequestSchema,
  reopenBookingRequestSchema,
  registerGroupSessionRequestSchema,
} from '@clubroom/shared-contracts';
import { badRequest, forbidden, notFound } from '../../lib/http-errors.js';
import {
  createBookingInSeedTables,
  resolveBookingRepository,
  type SeedTables,
} from '../../repositories/p0/booking-repository.js';
import { isPrivilegedAdminAuth } from '../../lib/authz.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';

type SeedRow = Record<string, unknown>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;
const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;
const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
const asObject = (value: unknown): SeedRow | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as SeedRow) : undefined;
const isoNow = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

const eventRsvpRequestSchema = z.object({
  status: z.enum(['GOING', 'MAYBE', 'NOT_GOING']),
  guestCount: z.number().int().min(0).max(10).optional(),
  notes: z.string().max(500).nullable().optional(),
});

const groupSessionQuerySchema = z.object({
  status: z.string().optional(),
});

const inviteAudienceTypeSchema = z.enum(['OPEN', 'CLOSED', 'SQUAD_ONLY']);

const invitesQuerySchema = z.object({
  coachUserId: z.string().optional(),
  parentUserId: z.string().optional(),
  groupId: z.string().optional(),
  inviteType: inviteAudienceTypeSchema.optional(),
  squadIds: z.string().optional(),
});

function normalizeSessionStatusForCapacity(current: number, max: number): 'PUBLISHED' | 'FULL' {
  return current >= max ? 'FULL' : 'PUBLISHED';
}

function resolveAthleteUserId(sessionTables: SeedTables, athleteId: string): string | null {
  const athlete = asRows(sessionTables.athletes).find((row) => asString(row.id) === athleteId);
  return asString(athlete?.userId) ?? null;
}

function canRegisterAthlete(params: {
  tables: SeedTables;
  authUserId: string;
  athleteId: string;
  isClubAdmin: boolean;
}): boolean {
  if (params.isClubAdmin) {
    return true;
  }

  const athleteUserId = resolveAthleteUserId(params.tables, params.athleteId);
  if (athleteUserId === params.authUserId) {
    return true;
  }

  return asRows(params.tables.guardianChildLinks).some(
    (row) =>
      asString(row.athleteId) === params.athleteId &&
      asString(row.guardianUserId) === params.authUserId,
  );
}

function getScheduleWindow(session: SeedRow): { startsAt: string; durationMinutes: number } {
  const schedule = asRows(session.scheduleJson);
  const firstWindow = schedule[0];
  const startsAt = asString(firstWindow?.startsAt);
  const endsAt = asString(firstWindow?.endsAt);
  const startTime = startsAt ? Date.parse(startsAt) : Number.NaN;
  const endTime = endsAt ? Date.parse(endsAt) : Number.NaN;
  const durationMinutes =
    Number.isFinite(startTime) && Number.isFinite(endTime) && endTime > startTime
      ? Math.max(15, Math.round((endTime - startTime) / 60000))
      : 60;

  return {
    startsAt: startsAt ?? isoNow(),
    durationMinutes,
  };
}

function humanizeSessionValue(value: string | undefined, fallback: string): string {
  if (!value) {
    return fallback;
  }

  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeInviteAudienceType(
  value: string | undefined,
): 'OPEN' | 'CLOSED' | 'SQUAD_ONLY' | undefined {
  const normalized = value?.trim().toUpperCase();
  if (normalized === 'OPEN') {
    return 'OPEN';
  }
  if (normalized === 'CLOSED') {
    return 'CLOSED';
  }
  if (normalized === 'SQUAD' || normalized === 'SQUAD_ONLY') {
    return 'SQUAD_ONLY';
  }
  return undefined;
}

function mapSessionInviteAudienceType(
  session: SeedRow | undefined,
): 'OPEN' | 'CLOSED' | 'SQUAD_ONLY' | undefined {
  return normalizeInviteAudienceType(asString(session?.inviteType));
}

function buildInviteProposedSlots(session: SeedRow | undefined): Array<{
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
}> {
  const location = asString(session?.location);

  return asRows(session?.scheduleJson)
    .map((entry) => {
      const startsAt = asString(entry.startsAt);
      const endsAt = asString(entry.endsAt);
      if (!startsAt || !endsAt) {
        return null;
      }

      const start = new Date(startsAt);
      const end = new Date(endsAt);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return null;
      }

      return {
        date: start.toISOString().slice(0, 10),
        startTime: start.toISOString().slice(11, 16),
        endTime: end.toISOString().slice(11, 16),
        ...(location ? { location } : {}),
      };
    })
    .filter(
      (
        slot,
      ): slot is {
        date: string;
        startTime: string;
        endTime: string;
        location?: string;
      } => Boolean(slot),
    );
}

function buildInviteProposedSlotsFromMetadata(metadata: SeedRow | undefined): Array<{
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
}> {
  return asRows(metadata?.proposedSlots)
    .map((entry) => {
      const date = asString(entry.date);
      const startTime = asString(entry.startTime);
      const endTime = asString(entry.endTime);
      const location = asString(entry.location);
      if (!date || !startTime || !endTime) {
        return null;
      }

      return {
        date,
        startTime,
        endTime,
        ...(location ? { location } : {}),
      };
    })
    .filter(
      (
        slot,
      ): slot is {
        date: string;
        startTime: string;
        endTime: string;
        location?: string;
      } => Boolean(slot),
    );
}

function buildInviteLocationCoordinates(
  metadata: SeedRow | undefined,
): { latitude: number; longitude: number } | undefined {
  const locationCoordinates = asObject(metadata?.locationCoordinates);
  const latitude = asNumber(locationCoordinates?.latitude);
  const longitude = asNumber(locationCoordinates?.longitude);
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return undefined;
  }

  return { latitude, longitude };
}

function splitCsvQueryValue(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function calculateSlotDurationMinutes(slot: {
  startTime: string;
  endTime: string;
}): number | undefined {
  const [startHour, startMinute] = slot.startTime.split(':').map(Number);
  const [endHour, endMinute] = slot.endTime.split(':').map(Number);
  if (
    !Number.isFinite(startHour) ||
    !Number.isFinite(startMinute) ||
    !Number.isFinite(endHour) ||
    !Number.isFinite(endMinute)
  ) {
    return undefined;
  }

  const duration = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  return duration > 0 ? duration : undefined;
}

function toInviteScheduledAt(slot: { date: string; startTime: string }): string {
  const parsed = new Date(`${slot.date}T${slot.startTime}:00.000Z`);
  return Number.isNaN(parsed.getTime())
    ? `${slot.date}T${slot.startTime}:00.000Z`
    : parsed.toISOString();
}

function isInviteDismissed(target: SeedRow | undefined): boolean {
  const responsePayload = asObject(target?.responsePayloadJson);
  return asBoolean(responsePayload?.dismissed) === true;
}

function buildSessionInviteView(params: {
  tables: SeedTables;
  invite: SeedRow;
  targets: SeedRow[];
}) {
  const { tables, invite, targets } = params;
  const primaryTarget = targets[0];
  const metadata = asObject(invite.metadataJson);
  const inviteId = asString(invite.id) ?? '';
  const linkedSession = asRows(tables.groupSessions).find(
    (row) => asString(row.id) === asString(invite.groupSessionId),
  );
  const clubId = asString(invite.clubId) ?? asString(linkedSession?.clubId);
  const club = asRows(tables.clubs).find((row) => asString(row.id) === clubId);
  const focusParts = asStringArray(linkedSession?.focusJson);
  const proposedSlots = buildInviteProposedSlots(linkedSession);
  const metadataProposedSlots = buildInviteProposedSlotsFromMetadata(metadata);
  const durationMinutes = linkedSession
    ? getScheduleWindow(linkedSession).durationMinutes
    : (asNumber(metadata?.durationMinutes) ?? 60);
  const selectedSlotPayload = asObject(primaryTarget?.responsePayloadJson)?.selectedSlot;
  const selectedSlot = asObject(selectedSlotPayload);
  const athleteIds = Array.from(
    new Set(
      targets
        .map((target) => asString(target.targetAthleteId))
        .filter((athleteId): athleteId is string => Boolean(athleteId)),
    ),
  );
  const squadId = asString(linkedSession?.squadId) ?? asString(metadata?.squadId);
  const targetStatus = asString(invite.revokedAt)
    ? 'EXPIRED'
    : (asString(primaryTarget?.status) ?? asString(invite.status) ?? 'PENDING');
  const inviteAudienceType =
    mapSessionInviteAudienceType(linkedSession) ??
    normalizeInviteAudienceType(asString(metadata?.inviteAudienceType));
  const locationCoordinates = buildInviteLocationCoordinates(metadata);

  return {
    id: inviteId,
    coachId: asString(invite.senderUserId) ?? '',
    ...((asString(metadata?.clubName) ?? asString(club?.name))
      ? { clubName: asString(metadata?.clubName) ?? asString(club?.name) }
      : {}),
    ...(inviteAudienceType ? { inviteType: inviteAudienceType } : {}),
    ...(squadId ? { squadIds: [squadId] } : {}),
    athleteIds,
    parentId: asString(primaryTarget?.targetUserId) ?? '',
    proposedSlots: proposedSlots.length > 0 ? proposedSlots : metadataProposedSlots,
    sessionType:
      asString(metadata?.sessionType) ??
      humanizeSessionValue(
        asString(linkedSession?.sessionType) ?? asString(invite.inviteType),
        'Session',
      ),
    ...(asString(metadata?.sessionTemplateId)
      ? { sessionTemplateId: asString(metadata?.sessionTemplateId) }
      : {}),
    focus:
      focusParts.length > 0
        ? focusParts.join(', ')
        : (asString(metadata?.focus) ?? asString(invite.message) ?? 'Session'),
    notes:
      asString(metadata?.notes) ??
      asString(invite.message) ??
      asString(linkedSession?.description) ??
      null,
    ...(typeof asNumber(linkedSession?.pricePerParticipantMinor) === 'number'
      ? { price: (asNumber(linkedSession?.pricePerParticipantMinor) ?? 0) / 100 }
      : typeof asNumber(metadata?.priceMinor) === 'number'
        ? { price: (asNumber(metadata?.priceMinor) ?? 0) / 100 }
        : {}),
    duration: durationMinutes,
    status: targetStatus,
    expiresAt: asString(invite.expiresAt) ?? isoNow(),
    createdAt: asString(invite.createdAt) ?? isoNow(),
    ...(asString(primaryTarget?.respondedAt)
      ? { respondedAt: asString(primaryTarget?.respondedAt) }
      : {}),
    ...(selectedSlot
      ? {
          selectedSlot: {
            date: asString(selectedSlot.date) ?? '',
            startTime: asString(selectedSlot.startTime) ?? '',
            endTime: asString(selectedSlot.endTime) ?? '',
            ...(asString(selectedSlot.location)
              ? { location: asString(selectedSlot.location) }
              : {}),
          },
        }
      : {}),
    ...(asString(invite.groupSessionId) || asString(metadata?.existingSessionId)
      ? {
          existingSessionId:
            asString(invite.groupSessionId) ?? asString(metadata?.existingSessionId),
        }
      : {}),
    ...(asString(metadata?.groupId) ? { groupId: asString(metadata?.groupId) } : {}),
    ...(asString(invite.bookingId) ? { bookingId: asString(invite.bookingId) } : {}),
    ...(isInviteDismissed(primaryTarget) ? { dismissed: true } : {}),
    ...(asBoolean(metadata?.isRecurring) === true ? { isRecurring: true } : {}),
    ...(typeof asNumber(metadata?.recurrenceWeeks) === 'number'
      ? { recurrenceWeeks: asNumber(metadata?.recurrenceWeeks) }
      : {}),
    ...(asString(metadata?.coverImageUrl)
      ? { coverImageUrl: asString(metadata?.coverImageUrl) }
      : {}),
    ...(locationCoordinates ? { locationCoordinates } : {}),
  };
}

const inviteProposedSlotSchema = z.object({
  date: z.string().trim().min(1),
  startTime: z.string().trim().min(1),
  endTime: z.string().trim().min(1),
  location: z.string().trim().min(1).optional(),
});

const createInviteRequestSchema = z.object({
  coachUserId: z.string().trim().min(1),
  clubName: z.string().trim().min(1).max(160).optional(),
  inviteType: inviteAudienceTypeSchema.optional(),
  squadIds: z.array(z.string().trim().min(1)).optional(),
  athleteIds: z.array(z.string().trim().min(1)).min(1),
  parentUserId: z.string().trim().min(1),
  proposedSlots: z.array(inviteProposedSlotSchema).min(1),
  sessionType: z.string().trim().min(1).max(120),
  sessionTemplateId: z.string().trim().min(1).optional(),
  focus: z.string().trim().min(1).max(500),
  notes: z.string().trim().max(4000).optional(),
  priceMinor: z.number().int().min(0).optional(),
  durationMinutes: z.number().int().min(1).max(1440).optional(),
  expiresInDays: z.number().int().min(1).max(90).optional(),
  groupId: z.string().trim().min(1).optional(),
  existingSessionId: z.string().trim().min(1).optional(),
  isRecurring: z.boolean().optional(),
  recurrenceWeeks: z.number().int().min(1).max(52).optional(),
  coverImageUrl: z.string().trim().url().optional(),
  locationCoordinates: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
  currency: z.string().trim().length(3).optional(),
});

function registerAthleteInSeedGroupSession(params: {
  tables: SeedTables;
  session: SeedRow;
  athleteId: string;
  authUserId: string;
  bookedByUserId: string;
  requestId: string;
  note: string;
}) {
  const { tables, session, athleteId, authUserId, bookedByUserId, requestId, note } = params;
  const registrations = asRows(tables.groupSessionRegistrations);
  const sessionId = asString(session.id);
  if (!sessionId) {
    throw notFound('Group session is missing an id');
  }

  const activeRegistration = registrations.find(
    (row) =>
      asString(row.groupSessionId) === sessionId &&
      asString(row.athleteId) === athleteId &&
      asString(row.status) !== 'CANCELLED',
  );

  if (activeRegistration) {
    return {
      registration: activeRegistration,
      booking: null,
    };
  }

  const currentParticipants = asNumber(session.currentParticipants) ?? 0;
  const maxParticipants = asNumber(session.maxParticipants) ?? 0;
  const waitlistEnabled = Boolean(session.waitlistEnabled);
  const isFull = maxParticipants > 0 && currentParticipants >= maxParticipants;

  if (isFull && !waitlistEnabled) {
    throw badRequest('Group session is full');
  }

  const now = isoNow();
  const status = isFull ? 'WAITLISTED' : 'REGISTERED';
  const registration: SeedRow = {
    id: newId('gsr'),
    groupSessionId: sessionId,
    athleteId,
    parentUserId: bookedByUserId,
    status,
    paidAt: isFull ? null : now,
    notes: note,
    createdByUserId: authUserId,
    updatedByUserId: authUserId,
    version: 1,
    registeredAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedByUserId: null,
  };
  registrations.push(registration);

  let booking = null;
  if (isFull) {
    session.waitlistCount = (asNumber(session.waitlistCount) ?? 0) + 1;
  } else {
    const updatedParticipants = currentParticipants + 1;
    session.currentParticipants = updatedParticipants;
    session.status = normalizeSessionStatusForCapacity(updatedParticipants, maxParticipants);
    const { startsAt, durationMinutes } = getScheduleWindow(session);
    booking = createBookingInSeedTables({
      tables,
      authUserId,
      requestId,
      body: createBookingRequestSchema.parse({
        coachUserId: asString(session.coachUserId),
        athleteIds: [athleteId],
        bookedByUserId,
        scheduledAt: startsAt,
        durationMinutes,
        location: asString(session.location) ?? 'Club training ground',
        serviceType: asString(session.sessionType) ?? 'group_session',
        objectives: asRows(session.focusJson)
          .map((value) => asString(value))
          .filter((value): value is string => Boolean(value)),
        notes: note,
        priceMinor: asNumber(session.pricePerParticipantMinor) ?? 0,
        currency: asString(session.currency) ?? 'GBP',
      }),
      bookingRowOverrides: {
        groupSessionId: sessionId,
        clubId: asString(session.clubId) ?? null,
      },
    });
  }

  return {
    registration,
    booking,
  };
}

const bookingRoutes: FastifyPluginAsync = async (app) => {
  app.get('/bookings', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const repository = resolveBookingRepository();
    const statusFilter = asString((request.query as { status?: string } | undefined)?.status);
    const result = await repository.listVisibleBookings({
      authUserId,
      statusFilter,
    });

    return reply.send({
      bookings: result.bookings,
      total: result.bookings.length,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.get('/bookings/:bookingId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const bookingId = bookingIdSchema.parse(
      (request.params as { bookingId?: string } | undefined)?.bookingId,
    );

    const repository = resolveBookingRepository();
    const booking = await repository.getVisibleBookingById({
      authUserId,
      bookingId,
    });

    return reply.send(booking);
  });

  app.post('/bookings', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const body = createBookingRequestSchema.parse(request.body);
    const repository = resolveBookingRepository();
    const response = await repository.createBooking({
      authUserId,
      requestId: request.requestId,
      body,
    });
    return reply.status(201).send(response);
  });

  app.post('/bookings/:bookingId/cancel', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const bookingId = bookingIdSchema.parse(
      (request.params as { bookingId?: string } | undefined)?.bookingId,
    );
    const body = cancelBookingRequestSchema.parse(request.body);

    const repository = resolveBookingRepository();
    const response = await repository.cancelBooking({
      authUserId,
      requestId: request.requestId,
      bookingId,
      body,
    });

    return reply.send(response);
  });

  app.post('/bookings/:bookingId/reopen', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const bookingId = bookingIdSchema.parse(
      (request.params as { bookingId?: string } | undefined)?.bookingId,
    );
    const body = reopenBookingRequestSchema.parse(request.body ?? {});

    const repository = resolveBookingRepository();
    const response = await repository.reopenBooking({
      authUserId,
      requestId: request.requestId,
      bookingId,
      body,
    });

    return reply.send(response);
  });

  app.get('/group-sessions', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const query = groupSessionQuerySchema.parse(request.query ?? {});
    const statusFilter = query.status?.toUpperCase();
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);

    const store = getMarketplaceSeedStore();
    const sessions = asRows(store.tables.groupSessions);
    const registrations = asRows(store.tables.groupSessionRegistrations);
    const inviteTargets = asRows(store.tables.inviteTargets);
    const invites = asRows(store.tables.invites);
    const athletes = asRows(store.tables.athletes);

    const athleteUserIdsByAthleteId = new Map(
      athletes
        .map((row) => [asString(row.id), asString(row.userId)] as const)
        .filter(([id]) => Boolean(id))
        .map(([id, userId]) => [id as string, userId]),
    );

    const visible = sessions.filter((session) => {
      const sessionId = asString(session.id);
      if (!sessionId) {
        return false;
      }
      if (statusFilter && asString(session.status)?.toUpperCase() !== statusFilter) {
        return false;
      }
      if (isPrivilegedAdmin || asString(session.coachUserId) === authUserId) {
        return true;
      }

      const hasRegistration = registrations.some((row) => {
        if (asString(row.groupSessionId) !== sessionId) {
          return false;
        }
        if (asString(row.parentUserId) === authUserId) {
          return true;
        }
        const athleteId = asString(row.athleteId);
        return Boolean(athleteId && athleteUserIdsByAthleteId.get(athleteId) === authUserId);
      });
      if (hasRegistration) {
        return true;
      }

      const sessionInviteIds = invites
        .filter((row) => asString(row.groupSessionId) === sessionId)
        .map((row) => asString(row.id))
        .filter((id): id is string => Boolean(id));
      return inviteTargets.some(
        (target) =>
          sessionInviteIds.includes(asString(target.inviteId) ?? '') &&
          asString(target.targetUserId) === authUserId,
      );
    });

    const rows = visible.map((session) => {
      const sessionId = asString(session.id);
      const sessionRegistrations = registrations.filter(
        (row) => asString(row.groupSessionId) === sessionId,
      );
      return {
        ...session,
        registrations: sessionRegistrations,
      };
    });

    return reply.send({
      groupSessions: rows,
      total: rows.length,
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.post('/group-sessions/:sessionId/register', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const sessionId = asString((request.params as { sessionId?: string } | undefined)?.sessionId);
    if (!sessionId) {
      throw notFound('Group session id is required');
    }

    const body = registerGroupSessionRequestSchema.parse(request.body);
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    if (!isPrivilegedAdmin && body.parentUserId && body.parentUserId !== authUserId) {
      throw forbidden('parentUserId must match authenticated user');
    }

    const store = getMarketplaceSeedStore();
    const session = asRows(store.tables.groupSessions).find(
      (row) => asString(row.id) === sessionId,
    );
    if (!session) {
      throw notFound('Group session not found', { sessionId });
    }

    if (
      !canRegisterAthlete({
        tables: store.tables,
        authUserId,
        athleteId: body.athleteId,
        isClubAdmin: isPrivilegedAdmin,
      })
    ) {
      throw forbidden('Authenticated user cannot register this athlete');
    }

    const result = registerAthleteInSeedGroupSession({
      tables: store.tables,
      session,
      athleteId: body.athleteId,
      authUserId,
      bookedByUserId: body.parentUserId ?? authUserId,
      requestId: request.requestId,
      note: 'Registered via /v1/group-sessions/:sessionId/register',
    });

    return reply.send({
      registration: {
        id: asString(result.registration.id),
        sessionId,
        athleteId: asString(result.registration.athleteId),
        parentUserId: asString(result.registration.parentUserId),
        status: asString(result.registration.status),
        registeredAt: asString(result.registration.registeredAt),
        paidAt: asString(result.registration.paidAt) ?? null,
        notes: asString(result.registration.notes) ?? null,
      },
      booking: result.booking,
      sessionStatus: asString(session.status) ?? 'PUBLISHED',
      requestId: request.requestId,
    });
  });

  app.get('/invites', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const query = invitesQuerySchema.parse(request.query ?? {});
    const requestedCoachUserId = asString(query.coachUserId);
    const requestedParentUserId = asString(query.parentUserId);
    const requestedGroupId = asString(query.groupId);
    const requestedInviteType = normalizeInviteAudienceType(asString(query.inviteType));
    const requestedSquadIds = splitCsvQueryValue(asString(query.squadIds));
    if (
      !requestedCoachUserId &&
      !requestedParentUserId &&
      !requestedGroupId &&
      !requestedInviteType
    ) {
      throw badRequest('coachUserId, parentUserId, groupId, or inviteType is required');
    }
    if (requestedCoachUserId && requestedParentUserId) {
      throw badRequest('coachUserId and parentUserId cannot be combined');
    }

    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    const store = getMarketplaceSeedStore();
    const invites = asRows(store.tables.invites);
    const targets = asRows(store.tables.inviteTargets);

    if (requestedCoachUserId) {
      if (!isPrivilegedAdmin && requestedCoachUserId !== authUserId) {
        throw forbidden('coachUserId must match authenticated user');
      }

      const rows = invites
        .filter((invite) => asString(invite.senderUserId) === requestedCoachUserId)
        .map((invite) => {
          const inviteId = asString(invite.id);
          const inviteTargets = targets.filter((target) => asString(target.inviteId) === inviteId);
          return buildSessionInviteView({
            tables: store.tables,
            invite,
            targets: inviteTargets,
          });
        })
        .filter((invite) => invite.id)
        .filter((invite) => !requestedGroupId || invite.groupId === requestedGroupId)
        .filter((invite) => !requestedInviteType || invite.inviteType === requestedInviteType)
        .filter(
          (invite) =>
            requestedSquadIds.length === 0 ||
            invite.squadIds?.some((squadId) => requestedSquadIds.includes(squadId)),
        )
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

      return reply.send({
        invites: rows,
        total: rows.length,
        seedVersion: store.version,
        requestId: request.requestId,
      });
    }

    if (requestedParentUserId && !isPrivilegedAdmin && requestedParentUserId !== authUserId) {
      throw forbidden('parentUserId must match authenticated user');
    }

    const rowMap = new Map<string, ReturnType<typeof buildSessionInviteView>>();
    const addInviteRow = (params: {
      invite: SeedRow;
      inviteTargets: SeedRow[];
      overrideParentUserId?: string;
    }) => {
      const row = buildSessionInviteView({
        tables: store.tables,
        invite: params.invite,
        targets: params.inviteTargets,
      });
      if (!row.id) {
        return;
      }
      if (requestedGroupId && row.groupId !== requestedGroupId) {
        return;
      }
      if (requestedInviteType && row.inviteType !== requestedInviteType) {
        return;
      }
      if (
        requestedSquadIds.length > 0 &&
        (!row.squadIds || !row.squadIds.some((squadId) => requestedSquadIds.includes(squadId)))
      ) {
        return;
      }

      rowMap.set(
        row.id,
        params.overrideParentUserId
          ? {
              ...row,
              parentId: params.overrideParentUserId,
              dismissed: undefined,
            }
          : row,
      );
    };

    const visibleParentUserId = requestedParentUserId ?? authUserId;
    for (const invite of invites) {
      const inviteId = asString(invite.id);
      if (!inviteId) {
        continue;
      }

      const inviteTargets = targets.filter((target) => asString(target.inviteId) === inviteId);
      const targetedRows = inviteTargets.filter(
        (target) => asString(target.targetUserId) === visibleParentUserId,
      );
      const inviteView = buildSessionInviteView({
        tables: store.tables,
        invite,
        targets: inviteTargets,
      });

      if (requestedParentUserId) {
        if (targetedRows.length > 0) {
          if (!isInviteDismissed(targetedRows[0])) {
            addInviteRow({
              invite,
              inviteTargets: targetedRows,
            });
          }
          continue;
        }

        if (
          requestedInviteType === 'SQUAD_ONLY' &&
          requestedSquadIds.length > 0 &&
          inviteView.squadIds?.some((squadId) => requestedSquadIds.includes(squadId))
        ) {
          addInviteRow({
            invite,
            inviteTargets:
              inviteTargets.length > 0 ? inviteTargets : [{ targetUserId: visibleParentUserId }],
            overrideParentUserId: visibleParentUserId,
          });
        }
        continue;
      }

      const isOwner = asString(invite.senderUserId) === authUserId;
      if (isOwner) {
        addInviteRow({
          invite,
          inviteTargets,
        });
        continue;
      }

      if (targetedRows.length > 0) {
        if (!isInviteDismissed(targetedRows[0])) {
          addInviteRow({
            invite,
            inviteTargets: targetedRows,
          });
        }
        continue;
      }

      if (requestedInviteType === 'OPEN') {
        addInviteRow({
          invite,
          inviteTargets: inviteTargets.length > 0 ? inviteTargets : [{ targetUserId: authUserId }],
          overrideParentUserId: authUserId,
        });
      }
    }

    const rows = Array.from(rowMap.values()).sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );

    return reply.send({
      invites: rows,
      total: rows.length,
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.post('/invites', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const body = createInviteRequestSchema.parse(request.body ?? {});
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    if (!isPrivilegedAdmin && body.coachUserId !== authUserId) {
      throw forbidden('coachUserId must match authenticated user');
    }

    const store = getMarketplaceSeedStore();
    const users = asRows(store.tables.users);
    const coachExists = users.some((row) => asString(row.id) === body.coachUserId);
    if (!coachExists) {
      throw notFound('Coach user not found', { coachUserId: body.coachUserId });
    }

    const parentExists = users.some((row) => asString(row.id) === body.parentUserId);
    if (!parentExists) {
      throw notFound('Parent user not found', { parentUserId: body.parentUserId });
    }

    const now = isoNow();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (body.expiresInDays ?? 7));

    const guardianLinks = asRows(store.tables.guardianChildLinks);
    const linkedGroupSession = body.existingSessionId
      ? asRows(store.tables.groupSessions).find(
          (row) => asString(row.id) === body.existingSessionId,
        )
      : undefined;

    const targetsToCreate = body.athleteIds.map((athleteId) => {
      const guardianLink = guardianLinks.find(
        (row) =>
          asString(row.athleteId) === athleteId &&
          asString(row.guardianUserId) === body.parentUserId,
      );
      if (!guardianLink) {
        throw badRequest('Each athleteId must belong to the provided parentUserId');
      }

      return {
        athleteId,
        familyId: asString(guardianLink.familyId) ?? null,
      };
    });

    const inviteId = newId('inv');
    const inviteRow: SeedRow = {
      id: inviteId,
      senderUserId: body.coachUserId,
      clubId: asString(linkedGroupSession?.clubId) ?? null,
      eventId: null,
      groupSessionId: linkedGroupSession ? body.existingSessionId : null,
      bookingId: null,
      inviteType: 'session_invite',
      message: body.notes ?? body.focus,
      metadataJson: {
        clubName: body.clubName,
        inviteAudienceType: body.inviteType ?? 'OPEN',
        squadIds: body.squadIds ?? [],
        proposedSlots: body.proposedSlots,
        sessionType: body.sessionType,
        sessionTemplateId: body.sessionTemplateId ?? null,
        focus: body.focus,
        notes: body.notes ?? null,
        priceMinor: body.priceMinor ?? null,
        durationMinutes: body.durationMinutes ?? null,
        groupId: body.groupId ?? null,
        existingSessionId: body.existingSessionId ?? null,
        isRecurring: body.isRecurring ?? false,
        recurrenceWeeks: body.recurrenceWeeks ?? null,
        coverImageUrl: body.coverImageUrl ?? null,
        locationCoordinates: body.locationCoordinates ?? null,
        currency: body.currency ?? 'GBP',
      },
      status: 'PENDING',
      revokedAt: null,
      expiresAt: expiresAt.toISOString(),
      createdAt: now,
      updatedAt: now,
    };
    asRows(store.tables.invites).push(inviteRow);

    const inviteTargets = asRows(store.tables.inviteTargets);
    const createdTargets = targetsToCreate.map(({ athleteId, familyId }) => {
      const targetRow: SeedRow = {
        id: newId('ivt'),
        inviteId,
        targetUserId: body.parentUserId,
        targetAthleteId: athleteId,
        targetFamilyId: familyId,
        status: 'PENDING',
        respondedAt: null,
        responsePayloadJson: null,
        createdAt: now,
        updatedAt: now,
      };
      inviteTargets.push(targetRow);
      return targetRow;
    });

    return reply.status(201).send({
      invite: buildSessionInviteView({
        tables: store.tables,
        invite: inviteRow,
        targets: createdTargets,
      }),
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.get('/invites/:inviteId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const inviteId = asString((request.params as { inviteId?: string } | undefined)?.inviteId);
    if (!inviteId) {
      throw notFound('Invite id is required');
    }

    const store = getMarketplaceSeedStore();
    const invites = asRows(store.tables.invites);
    const targets = asRows(store.tables.inviteTargets);
    const invite = invites.find((row) => asString(row.id) === inviteId);
    if (!invite) {
      throw notFound('Invite not found', { inviteId });
    }

    const inviteTargets = targets.filter((row) => asString(row.inviteId) === inviteId);
    const isOwner = asString(invite.senderUserId) === authUserId;
    const visibleTargets = inviteTargets.filter((row) => asString(row.targetUserId) === authUserId);
    if (!isOwner && visibleTargets.length === 0) {
      throw forbidden('Invite does not belong to authenticated user');
    }

    return reply.send({
      invite: buildSessionInviteView({
        tables: store.tables,
        invite,
        targets: isOwner ? inviteTargets : visibleTargets,
      }),
      seedVersion: store.version,
      requestId: request.requestId,
    });
  });

  app.delete('/invites/:inviteId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const inviteId = asString((request.params as { inviteId?: string } | undefined)?.inviteId);
    if (!inviteId) {
      throw notFound('Invite id is required');
    }

    const store = getMarketplaceSeedStore();
    const invites = asRows(store.tables.invites);
    const targets = asRows(store.tables.inviteTargets);
    const invite = invites.find((row) => asString(row.id) === inviteId);
    if (!invite) {
      throw notFound('Invite not found', { inviteId });
    }

    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    const isOwner = asString(invite.senderUserId) === authUserId;
    if (!isOwner && !isPrivilegedAdmin) {
      throw forbidden('Invite does not belong to authenticated user');
    }

    const now = isoNow();
    invite.status = 'EXPIRED';
    invite.revokedAt = now;
    invite.updatedAt = now;

    targets
      .filter((target) => asString(target.inviteId) === inviteId)
      .forEach((target) => {
        if (asString(target.status) === 'PENDING') {
          target.status = 'EXPIRED';
        }
        target.updatedAt = now;
      });

    return reply.status(204).send();
  });

  app.post('/invites/:inviteId/remind', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const inviteId = asString((request.params as { inviteId?: string } | undefined)?.inviteId);
    if (!inviteId) {
      throw notFound('Invite id is required');
    }

    const store = getMarketplaceSeedStore();
    const invites = asRows(store.tables.invites);
    const invite = invites.find((row) => asString(row.id) === inviteId);
    if (!invite) {
      throw notFound('Invite not found', { inviteId });
    }

    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    const isOwner = asString(invite.senderUserId) === authUserId;
    if (!isOwner && !isPrivilegedAdmin) {
      throw forbidden('Invite does not belong to authenticated user');
    }
    if (asString(invite.revokedAt) || asString(invite.status) !== 'PENDING') {
      throw badRequest('Only pending invites can be reminded');
    }

    const now = isoNow();
    const metadata = asObject(invite.metadataJson) ?? {};
    invite.metadataJson = {
      ...metadata,
      lastRemindedAt: now,
      reminderCount: (asNumber(metadata.reminderCount) ?? 0) + 1,
    };
    invite.updatedAt = now;

    return reply.status(204).send();
  });

  app.post('/invites/:inviteId/dismiss', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const inviteId = asString((request.params as { inviteId?: string } | undefined)?.inviteId);
    if (!inviteId) {
      throw notFound('Invite id is required');
    }

    const store = getMarketplaceSeedStore();
    const invite = asRows(store.tables.invites).find((row) => asString(row.id) === inviteId);
    if (!invite) {
      throw notFound('Invite not found', { inviteId });
    }

    const visibleTargets = asRows(store.tables.inviteTargets).filter(
      (row) => asString(row.inviteId) === inviteId && asString(row.targetUserId) === authUserId,
    );
    if (visibleTargets.length === 0) {
      throw forbidden('Invite does not belong to authenticated user');
    }

    const now = isoNow();
    visibleTargets.forEach((target) => {
      const responsePayload = asObject(target.responsePayloadJson) ?? {};
      target.responsePayloadJson = {
        ...responsePayload,
        dismissed: true,
        dismissedAt: now,
      };
      target.updatedAt = now;
    });

    return reply.status(204).send();
  });

  app.post('/invites/:inviteId/respond', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const inviteId = asString((request.params as { inviteId?: string }).inviteId);
    if (!inviteId) {
      throw notFound('Invite id is required');
    }
    const body = inviteResponseRequestSchema.parse(request.body);

    const store = getMarketplaceSeedStore();
    const invites = asRows(store.tables.invites);
    const targets = asRows(store.tables.inviteTargets);
    const invite = invites.find((row) => asString(row.id) === inviteId);
    if (!invite) {
      throw notFound('Invite not found', { inviteId });
    }
    if (asString(invite.revokedAt) || asString(invite.status) === 'EXPIRED') {
      throw badRequest('Invite has expired');
    }

    const visibleTargets = targets.filter(
      (row) => asString(row.inviteId) === inviteId && asString(row.targetUserId) === authUserId,
    );
    if (visibleTargets.length === 0) {
      throw forbidden('Invite does not belong to authenticated user');
    }

    const now = isoNow();
    let registrationId: string | null = null;
    let registrationStatus: 'REGISTERED' | 'WAITLISTED' | null = null;
    let booking = null;
    const groupSessionId = asString(invite.groupSessionId);
    const metadata = asObject(invite.metadataJson);
    if (body.response === 'ACCEPTED') {
      if (groupSessionId) {
        const session = asRows(store.tables.groupSessions).find(
          (row) => asString(row.id) === groupSessionId,
        );
        if (!session) {
          throw notFound('Linked group session not found', { groupSessionId });
        }

        for (const visibleTarget of visibleTargets) {
          const targetAthleteId = asString(visibleTarget.targetAthleteId);
          if (!targetAthleteId) {
            continue;
          }

          const registrationResult = registerAthleteInSeedGroupSession({
            tables: store.tables,
            session,
            athleteId: targetAthleteId,
            authUserId,
            bookedByUserId: authUserId,
            requestId: request.requestId,
            note: 'Accepted via /v1/invites/:inviteId/respond',
          });

          if (!registrationId) {
            registrationId = asString(registrationResult.registration.id) ?? null;
            registrationStatus =
              (asString(registrationResult.registration.status) as
                | 'REGISTERED'
                | 'WAITLISTED'
                | undefined) ?? null;
          }
          booking = booking ?? registrationResult.booking;
        }

        invite.bookingId = booking?.id ?? null;
      } else {
        const athleteIds = visibleTargets
          .map((target) => asString(target.targetAthleteId))
          .filter((athleteId): athleteId is string => Boolean(athleteId));
        if (athleteIds.length === 0) {
          throw badRequest('Invite is missing athlete targets');
        }

        const selectedSlot = body.selectedSlot ?? buildInviteProposedSlotsFromMetadata(metadata)[0];
        if (!selectedSlot) {
          throw badRequest('A selected slot is required to accept an invite');
        }

        const durationMinutes =
          calculateSlotDurationMinutes(selectedSlot) ?? asNumber(metadata?.durationMinutes) ?? 60;
        booking = createBookingInSeedTables({
          tables: store.tables,
          authUserId,
          requestId: request.requestId,
          body: createBookingRequestSchema.parse({
            coachUserId: asString(invite.senderUserId),
            athleteIds,
            bookedByUserId: authUserId,
            scheduledAt: toInviteScheduledAt(selectedSlot),
            durationMinutes,
            location: asString(selectedSlot.location) ?? 'Coach preferred location',
            serviceType: asString(metadata?.sessionType) ?? 'Session',
            objectives: [asString(metadata?.focus) ?? asString(invite.message) ?? 'Session'],
            notes: asString(metadata?.notes) ?? null,
            priceMinor: asNumber(metadata?.priceMinor) ?? 0,
            currency: asString(metadata?.currency) ?? 'GBP',
          }),
          bookingRowOverrides: {
            clubId: asString(invite.clubId) ?? null,
          },
        });
        invite.bookingId = booking.id;
      }
    }

    visibleTargets.forEach((target) => {
      const responsePayload = asObject(target.responsePayloadJson) ?? {};
      target.status = body.response;
      target.respondedAt = now;
      target.responsePayloadJson = {
        ...responsePayload,
        response: body.response.toLowerCase(),
        source: 'api-runtime',
        dismissed: false,
        ...(body.selectedSlot ? { selectedSlot: body.selectedSlot } : {}),
      };
      target.updatedAt = now;
    });
    invite.status = body.response;
    invite.updatedAt = now;

    return reply.send({
      invite: buildSessionInviteView({
        tables: store.tables,
        invite,
        targets: visibleTargets,
      }),
      inviteId,
      response: body.response,
      status: asString(invite.status) ?? body.response,
      targetStatus: asString(visibleTargets[0]?.status) ?? body.response,
      respondedAt: now,
      selectedSlot: body.selectedSlot,
      bookingId: asString(invite.bookingId) ?? booking?.id ?? null,
      registrationId,
      registrationStatus,
      booking,
      requestId: request.requestId,
    });
  });

  app.post('/events/:eventId/rsvp', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const eventId = asString((request.params as { eventId?: string }).eventId);
    if (!eventId) {
      throw notFound('Event id is required');
    }
    const body = eventRsvpRequestSchema.parse(request.body);

    const store = getMarketplaceSeedStore();
    const events = asRows(store.tables.clubEvents);
    const rsvps = asRows(store.tables.eventRsvps);
    const memberships = asRows(store.tables.clubMemberships);
    const event = events.find((row) => asString(row.id) === eventId);
    if (!event) {
      throw notFound('Club event not found', { eventId });
    }

    const eventClubId = asString(event.clubId);
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    const hasClubMembership = memberships.some(
      (row) =>
        asString(row.clubId) === eventClubId &&
        asString(row.userId) === authUserId &&
        row.active !== false,
    );
    if (!isPrivilegedAdmin && !hasClubMembership) {
      throw forbidden('User is not a member of event club');
    }

    const now = isoNow();
    let row = rsvps.find(
      (item) => asString(item.clubEventId) === eventId && asString(item.userId) === authUserId,
    );
    if (!row) {
      row = {
        id: newId('rsv'),
        clubEventId: eventId,
        userId: authUserId,
        status: body.status,
        guestCount: body.guestCount ?? 0,
        notes: body.notes ?? null,
        respondedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      rsvps.push(row);
    } else {
      row.status = body.status;
      row.guestCount = body.guestCount ?? asNumber(row.guestCount) ?? 0;
      row.notes = body.notes ?? row.notes ?? null;
      row.respondedAt = now;
      row.updatedAt = now;
    }

    return reply.send({
      rsvp: row,
      requestId: request.requestId,
      seedVersion: store.version,
    });
  });
};

export default bookingRoutes;
