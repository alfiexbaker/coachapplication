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
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';

type SeedRow = Record<string, unknown>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const asNumber = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);
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

function isClubAdminAuth(auth: { roles?: string[]; actingRole?: string } | undefined): boolean {
  return Boolean(auth?.roles?.includes('club_admin') || auth?.actingRole === 'club_admin');
}

function normalizeSessionStatusForCapacity(current: number, max: number): 'PUBLISHED' | 'FULL' {
  return current >= max ? 'FULL' : 'PUBLISHED';
}

function resolveAthleteUserId(sessionTables: SeedTables, athleteId: string): string | null {
  const athlete = asRows(sessionTables.athletes).find(
    (row) => asString(row.id) === athleteId,
  );
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
      asString(row.athleteId) === params.athleteId
      && asString(row.guardianUserId) === params.authUserId,
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
      asString(row.groupSessionId) === sessionId
      && asString(row.athleteId) === athleteId
      && asString(row.status) !== 'CANCELLED',
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

  app.post('/bookings', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const body = createBookingRequestSchema.parse(request.body);
    const isClubAdmin =
      request.auth?.roles.includes('club_admin') || request.auth?.actingRole === 'club_admin';

    if (!isClubAdmin && body.bookedByUserId !== authUserId) {
      throw forbidden('bookedByUserId must match authenticated user');
    }

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
    const isClubAdmin =
      request.auth?.roles.includes('club_admin') || request.auth?.actingRole === 'club_admin';

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
      if (isClubAdmin || asString(session.coachUserId) === authUserId) {
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
      return inviteTargets.some((target) =>
        sessionInviteIds.includes(asString(target.inviteId) ?? '')
        && asString(target.targetUserId) === authUserId,
      );
    });

    const rows = visible.map((session) => {
      const sessionId = asString(session.id);
      const sessionRegistrations = registrations.filter((row) => asString(row.groupSessionId) === sessionId);
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
    const isClubAdmin = isClubAdminAuth(request.auth);
    if (!isClubAdmin && body.parentUserId && body.parentUserId !== authUserId) {
      throw forbidden('parentUserId must match authenticated user');
    }

    const store = getMarketplaceSeedStore();
    const session = asRows(store.tables.groupSessions).find((row) => asString(row.id) === sessionId);
    if (!session) {
      throw notFound('Group session not found', { sessionId });
    }

    if (!canRegisterAthlete({
      tables: store.tables,
      authUserId,
      athleteId: body.athleteId,
      isClubAdmin,
    })) {
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

    const target = targets.find(
      (row) => asString(row.inviteId) === inviteId && asString(row.targetUserId) === authUserId,
    );
    if (!target) {
      throw forbidden('Invite does not belong to authenticated user');
    }

    const now = isoNow();
    let registrationId: string | null = null;
    let registrationStatus: 'REGISTERED' | 'WAITLISTED' | null = null;
    let booking = null;
    const groupSessionId = asString(invite.groupSessionId);
    const targetAthleteId = asString(target.targetAthleteId);
    if (body.response === 'ACCEPTED' && groupSessionId && targetAthleteId) {
      const session = asRows(store.tables.groupSessions).find(
        (row) => asString(row.id) === groupSessionId,
      );
      if (!session) {
        throw notFound('Linked group session not found', { groupSessionId });
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

      registrationId = asString(registrationResult.registration.id) ?? null;
      registrationStatus =
        (asString(registrationResult.registration.status) as 'REGISTERED' | 'WAITLISTED' | undefined)
        ?? null;
      booking = registrationResult.booking;
      invite.bookingId = booking?.id ?? null;
    }

    target.status = body.response;
    target.respondedAt = now;
    target.responsePayloadJson = {
      response: body.response.toLowerCase(),
      source: 'api-runtime',
      ...(body.selectedSlot ? { selectedSlot: body.selectedSlot } : {}),
    };
    target.updatedAt = now;
    invite.status = body.response;
    invite.updatedAt = now;

    return reply.send({
      inviteId,
      response: body.response,
      status: asString(invite.status) ?? body.response,
      targetStatus: asString(target.status) ?? body.response,
      respondedAt: now,
      selectedSlot: body.selectedSlot,
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
    const isClubAdmin =
      request.auth?.roles.includes('club_admin') || request.auth?.actingRole === 'club_admin';
    const hasClubMembership = memberships.some(
      (row) => asString(row.clubId) === eventClubId && asString(row.userId) === authUserId,
    );
    if (!isClubAdmin && !hasClubMembership) {
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
      row.guestCount = body.guestCount ?? (asNumber(row.guestCount) ?? 0);
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
