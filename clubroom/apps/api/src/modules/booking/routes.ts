import crypto from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  bookingIdSchema,
  cancelBookingRequestSchema,
  createBookingRequestSchema,
  reopenBookingRequestSchema,
} from '@clubroom/shared-contracts';
import { forbidden, notFound } from '../../lib/http-errors.js';
import { resolveBookingRepository } from '../../repositories/p0/booking-repository.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';

type SeedRow = Record<string, unknown>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const asNumber = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);
const isoNow = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

const inviteResponseRequestSchema = z.object({
  response: z.enum(['ACCEPTED', 'DECLINED']),
});

const eventRsvpRequestSchema = z.object({
  status: z.enum(['GOING', 'MAYBE', 'NOT_GOING']),
  guestCount: z.number().int().min(0).max(10).optional(),
  notes: z.string().max(500).nullable().optional(),
});

const groupSessionQuerySchema = z.object({
  status: z.string().optional(),
});

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
    const registrations = asRows(store.tables.groupSessionRegistrations);
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
    target.status = body.response;
    target.respondedAt = now;
    target.responsePayloadJson = {
      response: body.response.toLowerCase(),
      source: 'api-runtime',
    };
    target.updatedAt = now;
    invite.status = body.response;
    invite.updatedAt = now;

    let registrationId: string | null = null;
    const groupSessionId = asString(invite.groupSessionId);
    const targetAthleteId = asString(target.targetAthleteId);
    if (body.response === 'ACCEPTED' && groupSessionId && targetAthleteId) {
      const existingRegistration = registrations.find(
        (row) =>
          asString(row.groupSessionId) === groupSessionId
          && asString(row.athleteId) === targetAthleteId
          && asString(row.parentUserId) === authUserId,
      );
      if (existingRegistration) {
        registrationId = asString(existingRegistration.id) ?? null;
      } else {
        registrationId = newId('gsr');
        registrations.push({
          id: registrationId,
          groupSessionId,
          athleteId: targetAthleteId,
          parentUserId: authUserId,
          status: 'REGISTERED',
          paidAt: null,
          notes: 'Accepted via /v1/invites/:inviteId/respond',
          createdByUserId: authUserId,
          updatedByUserId: authUserId,
          version: 1,
          registeredAt: now,
          updatedAt: now,
          deletedAt: null,
          deletedByUserId: null,
        });
      }
    }

    return reply.send({
      inviteId,
      response: body.response,
      status: asString(invite.status) ?? body.response,
      targetStatus: asString(target.status) ?? body.response,
      respondedAt: now,
      registrationId,
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
