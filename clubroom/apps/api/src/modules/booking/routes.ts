import crypto from 'node:crypto';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  bookingIdSchema,
  cancelBookingSeriesRequestSchema,
  cancelBookingRequestSchema,
  completeBookingRequestSchema,
  createBookingRequestSchema,
  createBookingSeriesRequestSchema,
  inviteResponseRequestSchema,
  pauseBookingSeriesRequestSchema,
  reopenBookingRequestSchema,
  registerGroupSessionRequestSchema,
  resumeBookingSeriesRequestSchema,
  updateBookingSeriesRequestSchema,
} from '@clubroom/shared-contracts';
import { ApiProblemError, badRequest, forbidden, notFound } from '../../lib/http-errors.js';
import {
  resolveCreateBookingIdempotency,
  resolveBookingRepository,
  type SeedTables,
} from '../../repositories/p0/booking-repository.js';
import { resolveBookingReviewRepository } from '../../repositories/p0/booking-review-repository.js';
import {
  assertBookingSeriesCreateAccess,
  assertBookingSeriesOccurrencesValid,
  resolveCreateBookingSeriesIdempotency,
  resolveBookingSeriesRepository,
} from '../../repositories/p0/booking-series-repository.js';
import { resolveGroupSessionRepository } from '../../repositories/p0/group-session-repository.js';
import { isPrivilegedAdminAuth } from '../../lib/authz.js';
import { recordAuditEvent } from '../../lib/audit-runtime.js';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import {
  generateInvoiceForBooking,
  getBookingInvoiceContext,
} from '../../lib/invoice-runtime.js';
import {
  assertCoachAvailabilitySlotOpen,
  resolveCoachAvailabilityTables,
  slotToScheduledAt,
} from '../coach-club/availability.js';

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
const bookingSeriesIdSchema = z.string().regex(/^rec_[A-Za-z0-9-]+$/);
const coachIdSchema = z.string().trim().min(1);

async function recordInviteAudit(params: {
  request: FastifyRequest;
  action: 'invite.create' | 'invite.cancel' | 'invite.remind' | 'invite.dismiss' | 'invite.respond';
  resourceId?: string | null;
  subjectUserId?: string | null;
  result: 'SUCCESS' | 'DENY' | 'ERROR';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: params.action,
    resourceType: 'invite',
    resourceId: params.resourceId ?? null,
    subjectUserId: params.subjectUserId ?? null,
    result: params.result,
    metadata: params.metadata,
  });
}

async function generateRegistrationInvoiceIfBillable(params: {
  bookingId?: string | null;
  actorUserId: string;
}): Promise<SeedRow | null> {
  if (!params.bookingId) {
    return null;
  }
  const context = await getBookingInvoiceContext(params.bookingId);
  if (!context || context.totalMinor <= 0) {
    return null;
  }
  const generated = await generateInvoiceForBooking({
    bookingId: params.bookingId,
    actorUserId: params.actorUserId,
    notes: 'Generated from group session registration.',
  });
  return generated.invoice;
}

function getInviteRuntimeStore(): { version: string | null; tables: SeedTables } {
  if (getApiDataBackend() === 'db' && shouldUseDbFixtureFallback()) {
    return getDbFixtureStore();
  }
  return getMarketplaceSeedStore();
}

const eventRsvpRequestSchema = z.object({
  status: z.enum(['GOING', 'MAYBE', 'NOT_GOING']),
  guestCount: z.number().int().min(0).max(10).optional(),
  notes: z.string().max(500).nullable().optional(),
});

const groupSessionQuerySchema = z.object({
  status: z.string().optional(),
  coachUserId: z.string().optional(),
  clubId: z.string().optional(),
  squadId: z.string().optional(),
  athleteId: z.string().optional(),
  sessionType: z.string().optional(),
  skillLevel: z.string().optional(),
  discover: z.coerce.boolean().optional(),
});

const groupSessionScheduleEntrySchema = z.object({
  date: z.string().trim().min(1),
  startTime: z.string().trim().min(1),
  endTime: z.string().trim().min(1),
});

const inviteAudienceTypeSchema = z.enum(['OPEN', 'CLOSED', 'SQUAD_ONLY']);

const createGroupSessionRequestSchema = z.object({
  coachId: z.string().trim().min(1),
  clubId: z.string().trim().min(1).optional(),
  squadId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(4000).optional(),
  sessionType: z.enum(['CAMP', 'CLINIC', 'TEAM_TRAINING', 'OPEN_SESSION', 'TRIAL', 'TRAINING']),
  schedule: z.array(groupSessionScheduleEntrySchema).min(1),
  maxParticipants: z.number().int().min(1).max(500),
  pricePerParticipant: z.number().min(0).optional(),
  currency: z.string().trim().length(3).optional(),
  ageMin: z.number().int().min(0).max(99).optional(),
  ageMax: z.number().int().min(0).max(99).optional(),
  skillLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL']).optional(),
  location: z.string().trim().min(1).max(200).optional(),
  isVirtual: z.boolean().optional(),
  focus: z.array(z.string().trim().min(1)).optional(),
  equipment: z.array(z.string().trim().min(1)).optional(),
  waitlistEnabled: z.boolean().optional(),
  inviteType: inviteAudienceTypeSchema.optional(),
  registrationDeadline: z.string().datetime().optional(),
});

const bookingReviewRequestSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).nullable().optional(),
  categories: z.record(z.number().min(1).max(5)).optional(),
});

const markGroupSessionAttendanceRequestSchema = z.object({
  date: z.string().trim().min(1),
  attended: z.boolean(),
});

const groupSessionRegistrationsQuerySchema = z.object({
  athleteIds: z.string().optional(),
});

const invitesQuerySchema = z.object({
  coachUserId: z.string().optional(),
  parentUserId: z.string().optional(),
  groupId: z.string().optional(),
  inviteType: inviteAudienceTypeSchema.optional(),
  squadIds: z.string().optional(),
});

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

function buildInviteProposedSlots(session: SeedRow | undefined): {
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
}[] {
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

function buildInviteProposedSlotsFromMetadata(metadata: SeedRow | undefined): {
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
}[] {
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

function areMatchingInviteSlots(
  left: { date: string; startTime: string; endTime: string },
  right: { date: string; startTime: string; endTime: string },
): boolean {
  return (
    left.date === right.date && left.startTime === right.startTime && left.endTime === right.endTime
  );
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

const bookingRoutes: FastifyPluginAsync = async (app) => {
  app.get('/coaches/:coachId/reviews', async (request, reply) => {
    const coachId = coachIdSchema.parse(
      (request.params as { coachId?: string } | undefined)?.coachId,
    );
    const repository = resolveBookingReviewRepository();
    const result = await repository.listCoachReviews({ coachUserId: coachId });

    return reply.send({
      reviews: result.reviews,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

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

  app.get('/bookings/:bookingId/rebook-context', async (request, reply) => {
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

    const actorIsBookedFamily =
      booking.bookedByUserId === authUserId ||
      booking.participants.some((participant) => participant.guardianUserId === authUserId);
    const actorIsCoachOnly = booking.coachUserId === authUserId && !actorIsBookedFamily;
    if (actorIsCoachOnly) {
      throw forbidden('Only the booked family or athlete can rebook from this booking context');
    }

    return reply.send({
      sourceBookingId: booking.id,
      coachId: booking.coachUserId,
      bookedByUserId: booking.bookedByUserId ?? null,
      status: booking.status,
      serviceType: booking.serviceType ?? null,
      sessionTemplateId: booking.sessionTemplateId ?? null,
      durationMinutes: booking.durationMinutes,
      location: booking.location,
      objectives: booking.objectives,
      priceMinor: booking.priceMinor ?? null,
      currency: booking.currency,
      athleteIds: booking.participants
        .filter((participant) => participant.status !== 'cancelled')
        .map((participant) => participant.athleteId),
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
    const idempotentResponse = await resolveCreateBookingIdempotency({ authUserId, body });
    if (idempotentResponse) {
      return reply.status(idempotentResponse.responseStatus).send(idempotentResponse.response);
    }

    const availability = await resolveCoachAvailabilityTables(body.coachUserId);
    assertCoachAvailabilitySlotOpen({
      tables: availability.tables,
      coachUserId: body.coachUserId,
      scheduledAt: body.scheduledAt,
      durationMinutes: body.durationMinutes,
      applySchedulingRules: true,
    });
    const repository = resolveBookingRepository();
    const response = await repository.createBooking({
      authUserId,
      requestId: request.requestId,
      body,
    });
    return reply.status(201).send(response);
  });

  app.get('/booking-series', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const repository = resolveBookingSeriesRepository();
    const result = await repository.listVisibleBookingSeries({ authUserId });

    return reply.send({
      series: result.series,
      total: result.series.length,
      seedVersion: result.seedVersion,
      requestId: request.requestId,
    });
  });

  app.get('/booking-series/:seriesId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const seriesId = bookingSeriesIdSchema.parse(
      (request.params as { seriesId?: string } | undefined)?.seriesId,
    );
    const repository = resolveBookingSeriesRepository();
    const series = await repository.getVisibleBookingSeriesById({
      authUserId,
      seriesId,
    });

    return reply.send(series);
  });

  app.post('/booking-series', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const body = createBookingSeriesRequestSchema.parse(request.body);
    const idempotentResponse = await resolveCreateBookingSeriesIdempotency({ authUserId, body });
    if (idempotentResponse) {
      return reply.status(idempotentResponse.responseStatus).send(idempotentResponse.response);
    }

    assertBookingSeriesOccurrencesValid(body);
    await assertBookingSeriesCreateAccess({ authUserId, body });

    const availability = await resolveCoachAvailabilityTables(body.coachUserId);
    for (const occurrence of body.occurrences) {
      assertCoachAvailabilitySlotOpen({
        tables: availability.tables,
        coachUserId: body.coachUserId,
        scheduledAt: occurrence.scheduledAt,
        durationMinutes: occurrence.durationMinutes,
        applySchedulingRules: true,
      });
    }

    const repository = resolveBookingSeriesRepository();
    const response = await repository.createBookingSeries({
      authUserId,
      requestId: request.requestId,
      body,
    });
    return reply.status(201).send(response);
  });

  app.post('/booking-series/:seriesId/cancel', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const seriesId = bookingSeriesIdSchema.parse(
      (request.params as { seriesId?: string } | undefined)?.seriesId,
    );
    const body = cancelBookingSeriesRequestSchema.parse(request.body);

    const repository = resolveBookingSeriesRepository();
    const response = await repository.cancelBookingSeries({
      authUserId,
      requestId: request.requestId,
      seriesId,
      body,
    });

    return reply.send(response);
  });

  app.post('/booking-series/:seriesId/pause', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const seriesId = bookingSeriesIdSchema.parse(
      (request.params as { seriesId?: string } | undefined)?.seriesId,
    );
    const body = pauseBookingSeriesRequestSchema.parse(request.body);

    const repository = resolveBookingSeriesRepository();
    const response = await repository.pauseBookingSeries({
      authUserId,
      requestId: request.requestId,
      seriesId,
      body,
    });

    return reply.send(response);
  });

  app.post('/booking-series/:seriesId/resume', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const seriesId = bookingSeriesIdSchema.parse(
      (request.params as { seriesId?: string } | undefined)?.seriesId,
    );
    const body = resumeBookingSeriesRequestSchema.parse(request.body);

    const repository = resolveBookingSeriesRepository();
    const response = await repository.resumeBookingSeries({
      authUserId,
      requestId: request.requestId,
      seriesId,
      body,
    });

    return reply.send(response);
  });

  app.patch('/booking-series/:seriesId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const seriesId = bookingSeriesIdSchema.parse(
      (request.params as { seriesId?: string } | undefined)?.seriesId,
    );
    const body = updateBookingSeriesRequestSchema.parse(request.body);

    const repository = resolveBookingSeriesRepository();
    const response = await repository.updateBookingSeries({
      authUserId,
      requestId: request.requestId,
      seriesId,
      body,
    });

    return reply.send(response);
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

  app.post('/bookings/:bookingId/complete', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const bookingId = bookingIdSchema.parse(
      (request.params as { bookingId?: string } | undefined)?.bookingId,
    );
    const body = completeBookingRequestSchema.parse(request.body ?? {});

    const repository = resolveBookingRepository();
    const response = await repository.completeBooking({
      authUserId,
      requestId: request.requestId,
      bookingId,
      body,
    });

    return reply.send(response);
  });

  app.get('/bookings/:bookingId/reviews/me', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const bookingId = bookingIdSchema.parse(
      (request.params as { bookingId?: string } | undefined)?.bookingId,
    );
    const repository = resolveBookingReviewRepository();
    const result = await repository.getBookingReviewForActor({
      authUserId,
      bookingId,
    });

    return reply.send({
      hasReviewed: Boolean(result.review),
      review: result.review,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.post('/bookings/:bookingId/reviews', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const bookingId = bookingIdSchema.parse(
      (request.params as { bookingId?: string } | undefined)?.bookingId,
    );
    const body = bookingReviewRequestSchema.parse(request.body ?? {});
    const repository = resolveBookingReviewRepository();

    try {
      const result = await repository.createBookingReview({
        authUserId,
        bookingId,
        input: body,
      });

      await recordAuditEvent({
        request,
        action: 'booking_review.create',
        resourceType: 'booking',
        resourceId: bookingId,
        subjectUserId: authUserId,
        result: 'SUCCESS',
        metadata: {
          reviewId: result.review.id,
          reused: result.reused,
          rating: result.review.rating,
          verifiedBooking: result.review.isVerifiedBooking,
        },
      });

      reply.code(result.reused ? 200 : 201);
      return reply.send({
        review: result.review,
        reused: result.reused,
        seedVersion: result.dataVersion,
        requestId: request.requestId,
      });
    } catch (error) {
      await recordAuditEvent({
        request,
        action: 'booking_review.create',
        resourceType: 'booking',
        resourceId: bookingId,
        subjectUserId: authUserId,
        result: error instanceof ApiProblemError && error.status < 500 ? 'DENY' : 'ERROR',
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
          status: error instanceof ApiProblemError ? error.status : 500,
        },
      });
      throw error;
    }
  });

  app.get('/group-sessions', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const query = groupSessionQuerySchema.parse(request.query ?? {});
    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    const repository = resolveGroupSessionRepository();
    const result = await repository.listVisibleSessions({
      authUserId,
      isPrivilegedAdmin,
      statusFilter: query.status?.toUpperCase(),
      coachUserId: asString(query.coachUserId),
      clubId: asString(query.clubId),
      squadId: asString(query.squadId),
      athleteId: asString(query.athleteId),
      sessionType: asString(query.sessionType),
      skillLevel: asString(query.skillLevel),
      discover: query.discover,
    });

    return reply.send({
      groupSessions: result.sessions,
      total: result.sessions.length,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.get('/group-sessions/:sessionId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const sessionId = asString((request.params as { sessionId?: string } | undefined)?.sessionId);
    if (!sessionId) {
      throw notFound('Group session id is required');
    }

    const result = await resolveGroupSessionRepository().getVisibleSessionById({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      sessionId,
    });

    return reply.send({
      groupSession: result.session,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.post('/group-sessions', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const result = await resolveGroupSessionRepository().createSession({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      body: createGroupSessionRequestSchema.parse(request.body ?? {}),
    });

    return reply.status(201).send({
      groupSession: result.session,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.patch('/group-sessions/:sessionId/publish', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const sessionId = asString((request.params as { sessionId?: string } | undefined)?.sessionId);
    if (!sessionId) {
      throw notFound('Group session id is required');
    }

    const result = await resolveGroupSessionRepository().publishSession({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      sessionId,
    });

    return reply.send({
      groupSession: result.session,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.patch('/group-sessions/:sessionId/cancel', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const sessionId = asString((request.params as { sessionId?: string } | undefined)?.sessionId);
    if (!sessionId) {
      throw notFound('Group session id is required');
    }

    const result = await resolveGroupSessionRepository().cancelSession({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      sessionId,
      requestId: request.requestId,
    });

    return reply.send({
      groupSession: result.session,
      seedVersion: result.dataVersion,
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
    const result = await resolveGroupSessionRepository().registerAthlete({
      authUserId,
      isPrivilegedAdmin,
      requestId: request.requestId,
      sessionId,
      athleteId: body.athleteId,
      bookedByUserId: body.parentUserId ?? authUserId,
      note: 'Registered via /v1/group-sessions/:sessionId/register',
    });
    const invoice = await generateRegistrationInvoiceIfBillable({
      bookingId: result.booking?.id,
      actorUserId: authUserId,
    });

    return reply.send({
      registration: {
        id: result.registration.id,
        sessionId: result.registration.sessionId,
        athleteId: result.registration.athleteId,
        parentUserId: result.registration.parentId,
        status: result.registration.status,
        registeredAt: result.registration.registeredAt,
        paidAt: result.registration.paidAt ?? null,
        notes: result.registration.notes ?? null,
      },
      booking: result.booking,
      invoice: invoice
        ? {
            id: asString(invoice.id) ?? '',
            bookingId: asString(invoice.bookingId) ?? null,
            status: asString(invoice.status) ?? 'SENT',
            totalMinor: asNumber(invoice.totalMinor) ?? null,
            currency: asString(invoice.currency) ?? 'GBP',
          }
        : null,
      sessionStatus: result.sessionStatus,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.get('/group-sessions/:sessionId/roster', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const sessionId = asString((request.params as { sessionId?: string } | undefined)?.sessionId);
    if (!sessionId) {
      throw notFound('Group session id is required');
    }

    const result = await resolveGroupSessionRepository().listSessionRoster({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      sessionId,
    });

    return reply.send({
      session: result.session,
      registrations: result.registrations,
      total: result.registrations.length,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.delete('/group-session-registrations/:registrationId', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const registrationId = asString(
      (request.params as { registrationId?: string } | undefined)?.registrationId,
    );
    if (!registrationId) {
      throw notFound('Registration id is required');
    }

    await resolveGroupSessionRepository().cancelRegistration({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      registrationId,
    });

    return reply.status(204).send();
  });

  app.patch('/group-session-registrations/:registrationId/attendance', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const registrationId = asString(
      (request.params as { registrationId?: string } | undefined)?.registrationId,
    );
    if (!registrationId) {
      throw notFound('Registration id is required');
    }

    const body = markGroupSessionAttendanceRequestSchema.parse(request.body ?? {});
    const result = await resolveGroupSessionRepository().markAttendance({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      registrationId,
      date: body.date,
      attended: body.attended,
    });
    await recordAuditEvent({
      request,
      action: body.attended
        ? 'group_session.attendance_marked'
        : 'group_session.attendance_cleared',
      resourceType: 'group_session_registration',
      resourceId: registrationId,
      result: 'SUCCESS',
      metadata: {
        sessionId: result.registration.sessionId,
        athleteId: result.registration.athleteId,
        attendanceDate: body.date,
        attended: body.attended,
        registrationStatus: result.registration.status,
      },
    });

    return reply.send({
      registration: result.registration,
      seedVersion: result.dataVersion,
      requestId: request.requestId,
    });
  });

  app.get('/group-session-registrations', async (request, reply) => {
    const authUserId = request.auth?.userId;
    if (!authUserId) {
      throw forbidden('Authenticated user is required');
    }

    const query = groupSessionRegistrationsQuerySchema.parse(request.query ?? {});
    const athleteIds = splitCsvQueryValue(asString(query.athleteIds));
    if (athleteIds.length === 0) {
      throw badRequest('athleteIds is required');
    }

    const result = await resolveGroupSessionRepository().listRegistrationsForAthleteIds({
      authUserId,
      isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      athleteIds,
    });

    return reply.send({
      registrations: result.registrations,
      total: result.registrations.length,
      seedVersion: result.dataVersion,
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
    const store = getInviteRuntimeStore();
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
      await recordInviteAudit({
        request,
        action: 'invite.create',
        result: 'DENY',
        subjectUserId: body.parentUserId,
        metadata: {
          reason: 'coachUserId_mismatch',
          coachUserId: body.coachUserId,
          parentUserId: body.parentUserId,
          athleteIds: body.athleteIds,
        },
      });
      throw forbidden('coachUserId must match authenticated user');
    }

    const store = getInviteRuntimeStore();
    const groupSessionRepository = resolveGroupSessionRepository();
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
      ? await groupSessionRepository.findSessionById(body.existingSessionId)
      : null;

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

    const seenSlots = new Set<string>();
    for (const slot of body.proposedSlots) {
      const slotKey = `${slot.date}_${slot.startTime}_${slot.endTime}`;
      if (seenSlots.has(slotKey)) {
        throw badRequest('proposedSlots must not contain duplicate slots');
      }
      seenSlots.add(slotKey);
    }

    if (!linkedGroupSession) {
      for (const slot of body.proposedSlots) {
        const durationMinutes = calculateSlotDurationMinutes(slot) ?? body.durationMinutes ?? 60;
        assertCoachAvailabilitySlotOpen({
          tables: store.tables,
          coachUserId: body.coachUserId,
          scheduledAt: slotToScheduledAt(slot),
          durationMinutes,
          sessionTemplateId: body.sessionTemplateId ?? undefined,
          excludePendingInvites: true,
          applySchedulingRules: true,
        });
      }
    }

    const inviteId = newId('inv');
    const inviteRow: SeedRow = {
      id: inviteId,
      senderUserId: body.coachUserId,
      clubId: linkedGroupSession?.clubId ?? null,
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

    await recordInviteAudit({
      request,
      action: 'invite.create',
      resourceId: inviteId,
      subjectUserId: body.parentUserId,
      result: 'SUCCESS',
      metadata: {
        coachUserId: body.coachUserId,
        parentUserId: body.parentUserId,
        athleteIds: body.athleteIds,
        inviteAudienceType: body.inviteType ?? 'OPEN',
        groupId: body.groupId ?? null,
        existingSessionId: body.existingSessionId ?? null,
        targetIds: createdTargets.map((target) => asString(target.id)).filter(Boolean),
      },
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

    const store = getInviteRuntimeStore();
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

    const store = getInviteRuntimeStore();
    const invites = asRows(store.tables.invites);
    const targets = asRows(store.tables.inviteTargets);
    const invite = invites.find((row) => asString(row.id) === inviteId);
    if (!invite) {
      throw notFound('Invite not found', { inviteId });
    }

    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    const isOwner = asString(invite.senderUserId) === authUserId;
    if (!isOwner && !isPrivilegedAdmin) {
      await recordInviteAudit({
        request,
        action: 'invite.cancel',
        resourceId: inviteId,
        subjectUserId: asString(targets.find((target) => asString(target.inviteId) === inviteId)?.targetUserId),
        result: 'DENY',
        metadata: {
          reason: 'not_owner_or_admin',
          senderUserId: asString(invite.senderUserId) ?? null,
          status: asString(invite.status) ?? null,
        },
      });
      throw forbidden('Invite does not belong to authenticated user');
    }

    const now = isoNow();
    const previousStatus = asString(invite.status) ?? null;
    invite.status = 'EXPIRED';
    invite.revokedAt = now;
    invite.updatedAt = now;

    const inviteTargets = targets.filter((target) => asString(target.inviteId) === inviteId);
    inviteTargets
      .forEach((target) => {
        if (asString(target.status) === 'PENDING') {
          target.status = 'EXPIRED';
        }
        target.updatedAt = now;
      });

    await recordInviteAudit({
      request,
      action: 'invite.cancel',
      resourceId: inviteId,
      subjectUserId: asString(inviteTargets[0]?.targetUserId) ?? null,
      result: 'SUCCESS',
      metadata: {
        previousStatus,
        status: asString(invite.status) ?? null,
        targetIds: inviteTargets.map((target) => asString(target.id)).filter(Boolean),
        targetUserIds: inviteTargets.map((target) => asString(target.targetUserId)).filter(Boolean),
      },
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

    const store = getInviteRuntimeStore();
    const invites = asRows(store.tables.invites);
    const invite = invites.find((row) => asString(row.id) === inviteId);
    if (!invite) {
      throw notFound('Invite not found', { inviteId });
    }

    const isPrivilegedAdmin = isPrivilegedAdminAuth(request.auth);
    const isOwner = asString(invite.senderUserId) === authUserId;
    if (!isOwner && !isPrivilegedAdmin) {
      await recordInviteAudit({
        request,
        action: 'invite.remind',
        resourceId: inviteId,
        result: 'DENY',
        metadata: {
          reason: 'not_owner_or_admin',
          senderUserId: asString(invite.senderUserId) ?? null,
          status: asString(invite.status) ?? null,
        },
      });
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

    await recordInviteAudit({
      request,
      action: 'invite.remind',
      resourceId: inviteId,
      result: 'SUCCESS',
      metadata: {
        status: asString(invite.status) ?? null,
        reminderCount: asNumber((asObject(invite.metadataJson) ?? {}).reminderCount) ?? null,
        lastRemindedAt: now,
      },
    });

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

    const store = getInviteRuntimeStore();
    const invite = asRows(store.tables.invites).find((row) => asString(row.id) === inviteId);
    if (!invite) {
      throw notFound('Invite not found', { inviteId });
    }

    const visibleTargets = asRows(store.tables.inviteTargets).filter(
      (row) => asString(row.inviteId) === inviteId && asString(row.targetUserId) === authUserId,
    );
    if (visibleTargets.length === 0) {
      await recordInviteAudit({
        request,
        action: 'invite.dismiss',
        resourceId: inviteId,
        result: 'DENY',
        metadata: {
          reason: 'not_invite_target',
          status: asString(invite.status) ?? null,
        },
      });
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

    await recordInviteAudit({
      request,
      action: 'invite.dismiss',
      resourceId: inviteId,
      subjectUserId: authUserId,
      result: 'SUCCESS',
      metadata: {
        status: asString(invite.status) ?? null,
        targetIds: visibleTargets.map((target) => asString(target.id)).filter(Boolean),
      },
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

    const store = getInviteRuntimeStore();
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
      await recordInviteAudit({
        request,
        action: 'invite.respond',
        resourceId: inviteId,
        result: 'DENY',
        metadata: {
          reason: 'not_invite_target',
          requestedResponse: body.response,
          status: asString(invite.status) ?? null,
        },
      });
      throw forbidden('Invite does not belong to authenticated user');
    }

    const now = isoNow();
    const existingBookingId = asString(invite.bookingId);
    if (
      body.response === 'ACCEPTED' &&
      asString(invite.status) === 'ACCEPTED' &&
      existingBookingId
    ) {
      const existingBooking = await resolveBookingRepository().getVisibleBookingById({
        authUserId,
        bookingId: existingBookingId,
      });
      await recordInviteAudit({
        request,
        action: 'invite.respond',
        resourceId: inviteId,
        subjectUserId: authUserId,
        result: 'SUCCESS',
        metadata: {
          replay: true,
          response: body.response,
          status: asString(invite.status) ?? 'ACCEPTED',
          targetStatus: asString(visibleTargets[0]?.status) ?? 'ACCEPTED',
          bookingId: existingBooking.id,
        },
      });
      return reply.send({
        invite: buildSessionInviteView({
          tables: store.tables,
          invite,
          targets: visibleTargets,
        }),
        inviteId,
        response: 'ACCEPTED',
        status: asString(invite.status) ?? 'ACCEPTED',
        targetStatus: asString(visibleTargets[0]?.status) ?? 'ACCEPTED',
        respondedAt: asString(visibleTargets[0]?.respondedAt) ?? now,
        selectedSlot: body.selectedSlot,
        bookingId: existingBooking.id,
        registrationId: null,
        registrationStatus: null,
        booking: existingBooking,
        requestId: request.requestId,
      });
    }

    let registrationId: string | null = null;
    let registrationStatus:
      | 'REGISTERED'
      | 'WAITLISTED'
      | 'CANCELLED'
      | 'ATTENDED'
      | 'NO_SHOW'
      | null = null;
    let booking = null;
    const groupSessionId = asString(invite.groupSessionId);
    const metadata = asObject(invite.metadataJson);
    if (body.response === 'ACCEPTED') {
      if (groupSessionId) {
        const linkedSession = await resolveGroupSessionRepository().findSessionById(groupSessionId);
        if (!linkedSession) {
          throw notFound('Linked group session not found', { groupSessionId });
        }

        for (const visibleTarget of visibleTargets) {
          const targetAthleteId = asString(visibleTarget.targetAthleteId);
          if (!targetAthleteId) {
            continue;
          }

          const registrationResult = await resolveGroupSessionRepository().registerAthlete({
            authUserId,
            isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
            requestId: request.requestId,
            sessionId: groupSessionId,
            athleteId: targetAthleteId,
            bookedByUserId: authUserId,
            note: 'Accepted via /v1/invites/:inviteId/respond',
          });

          if (!registrationId) {
            registrationId = registrationResult.registration.id;
            registrationStatus = registrationResult.registration.status;
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
        const proposedSlots = buildInviteProposedSlotsFromMetadata(metadata);
        if (
          proposedSlots.length > 0 &&
          !proposedSlots.some((candidate) => areMatchingInviteSlots(candidate, selectedSlot))
        ) {
          throw badRequest('Selected slot must match one of the invite proposed slots');
        }

        const durationMinutes =
          calculateSlotDurationMinutes(selectedSlot) ?? asNumber(metadata?.durationMinutes) ?? 60;
        assertCoachAvailabilitySlotOpen({
          tables: store.tables,
          coachUserId: asString(invite.senderUserId) ?? '',
          scheduledAt: slotToScheduledAt(selectedSlot),
          durationMinutes,
          applySchedulingRules: true,
        });
        booking = await resolveBookingRepository().createBooking({
          authUserId,
          requestId: request.requestId,
          body: createBookingRequestSchema.parse({
            coachUserId: asString(invite.senderUserId),
            athleteIds,
            bookedByUserId: authUserId,
            scheduledAt: slotToScheduledAt(selectedSlot),
            durationMinutes,
            location: asString(selectedSlot.location) ?? 'Coach preferred location',
            serviceType: asString(metadata?.sessionType) ?? 'Session',
            objectives: [asString(metadata?.focus) ?? asString(invite.message) ?? 'Session'],
            notes: asString(metadata?.notes) ?? null,
            priceMinor: asNumber(metadata?.priceMinor) ?? 0,
            currency: asString(metadata?.currency) ?? 'GBP',
            idempotencyKey: `invite-accept-${inviteId}-${authUserId}`,
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

    await recordInviteAudit({
      request,
      action: 'invite.respond',
      resourceId: inviteId,
      subjectUserId: authUserId,
      result: 'SUCCESS',
      metadata: {
        replay: false,
        response: body.response,
        status: asString(invite.status) ?? body.response,
        targetStatus: asString(visibleTargets[0]?.status) ?? body.response,
        selectedSlot: body.selectedSlot ?? null,
        bookingId: asString(invite.bookingId) ?? booking?.id ?? null,
        registrationId,
        registrationStatus,
        targetIds: visibleTargets.map((target) => asString(target.id)).filter(Boolean),
      },
    });

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
