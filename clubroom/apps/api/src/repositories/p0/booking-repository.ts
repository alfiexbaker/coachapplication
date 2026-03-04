import crypto from 'node:crypto';
import {
  bookingResponseSchema,
  bookingStatusSchema,
  type BookingResponse,
  type CreateBookingRequest,
} from '@clubroom/shared-contracts';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { normalizeForJson } from './normalize.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const asNumber = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);
const isoNow = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
type BookingStatusCode = 'PENDING' | 'AWAITING_CONFIRMATION' | 'CONFIRMED' | 'AWAITING_COMPLETION' | 'COMPLETED' | 'CANCELLED';

export interface ListBookingsParams {
  authUserId: string;
  statusFilter?: string;
}

export interface CreateBookingParams {
  authUserId: string;
  requestId: string;
  body: CreateBookingRequest;
}

export interface ListBookingsResult {
  bookings: BookingResponse[];
  dataVersion: string | null;
}

export interface BookingRepository {
  listVisibleBookings(params: ListBookingsParams): Promise<ListBookingsResult>;
  createBooking(params: CreateBookingParams): Promise<BookingResponse>;
}

function isSupportedBookingStatus(status: string): boolean {
  return bookingStatusSchema.safeParse(status).success;
}

function mapSeedBookingsFromTables(
  tables: SeedTables,
  authUserId: string,
  statusFilter?: string,
): BookingResponse[] {
  const bookings = asRows(tables.bookings);
  const participants = asRows(tables.bookingParticipants);
  const objectives = asRows(tables.bookingObjectives);
  const athletes = asRows(tables.athletes);
  const normalizedStatus = statusFilter?.toUpperCase();
  if (normalizedStatus && !isSupportedBookingStatus(normalizedStatus)) {
    return [];
  }

  const athleteUserIdsByAthleteId = new Map(
    athletes
      .map((row) => [asString(row.id), asString(row.userId)] as const)
      .filter(([id]) => Boolean(id))
      .map(([id, userId]) => [id as string, userId]),
  );

  const participantRowsByBooking = new Map<string, SeedRow[]>();
  for (const participant of participants) {
    const bookingId = asString(participant.bookingId);
    if (!bookingId) {
      continue;
    }
    const existing = participantRowsByBooking.get(bookingId) ?? [];
    existing.push(participant);
    participantRowsByBooking.set(bookingId, existing);
  }

  const visible = bookings.filter((booking) => {
    const bookingStatus = asString(booking.status)?.toUpperCase();
    if (normalizedStatus && bookingStatus !== normalizedStatus) {
      return false;
    }

    if (asString(booking.coachUserId) === authUserId || asString(booking.bookedByUserId) === authUserId) {
      return true;
    }

    const bookingParticipants = participantRowsByBooking.get(asString(booking.id) ?? '') ?? [];
    return bookingParticipants.some((participant) => {
      if (asString(participant.guardianUserId) === authUserId) {
        return true;
      }
      const athleteId = asString(participant.athleteId);
      return Boolean(athleteId && athleteUserIdsByAthleteId.get(athleteId) === authUserId);
    });
  });

  return visible.map((booking) => {
    const bookingId = asString(booking.id) ?? '';
    const bookingParticipants = (participantRowsByBooking.get(bookingId) ?? []).map((participant) => ({
      athleteId: asString(participant.athleteId) ?? '',
      guardianUserId: asString(participant.guardianUserId),
      status: (asString(participant.status) ?? 'pending').toLowerCase(),
    }));
    const bookingObjectives = objectives
      .filter((objective) => asString(objective.bookingId) === bookingId)
      .sort((a, b) => (asNumber(a.sortOrder) ?? 0) - (asNumber(b.sortOrder) ?? 0))
      .map((objective) => asString(objective.objective))
      .filter((objective): objective is string => Boolean(objective));

    return bookingResponseSchema.parse({
      id: bookingId,
      coachUserId: asString(booking.coachUserId),
      bookedByUserId: asString(booking.bookedByUserId),
      status: asString(booking.status),
      scheduledAt: asString(booking.scheduledAt),
      durationMinutes: asNumber(booking.durationMinutes) ?? 60,
      location: asString(booking.location) ?? 'TBD',
      serviceType: asString(booking.serviceType) ?? 'one_to_one',
      sessionTemplateId: null,
      objectives: bookingObjectives,
      notes: asString(booking.notes) ?? null,
      priceMinor: asNumber(booking.priceMinor) ?? null,
      currency: asString(booking.currency) ?? 'GBP',
      participants: bookingParticipants,
      version: asNumber(booking.version) ?? 1,
      createdAt: asString(booking.createdAt) ?? isoNow(),
      updatedAt: asString(booking.updatedAt) ?? isoNow(),
      cancelledAt: asString(booking.cancelledAt) ?? null,
    });
  });
}

function createBookingInSeedTables(params: {
  tables: SeedTables;
  authUserId: string;
  requestId: string;
  body: CreateBookingRequest;
}): BookingResponse {
  const { tables, authUserId, requestId, body } = params;
  const bookings = asRows(tables.bookings);
  const participants = asRows(tables.bookingParticipants);
  const objectives = asRows(tables.bookingObjectives);
  const statusEvents = asRows(tables.bookingStatusEvents);
  const guardianChildLinks = asRows(tables.guardianChildLinks);
  const now = isoNow();
  const bookingId = newId('bok');

  bookings.push({
    id: bookingId,
    coachUserId: body.coachUserId,
    bookedByUserId: body.bookedByUserId,
    clubId: null,
    coachingOfferingId: null,
    status: 'CONFIRMED',
    scheduledAt: body.scheduledAt,
    durationMinutes: body.durationMinutes,
    location: body.location,
    serviceType: body.serviceType,
    notes: body.notes ?? null,
    objectivesJson: {
      primary: body.objectives[0] ?? null,
      secondary: body.objectives[1] ?? null,
    },
    priceMinor: body.priceMinor ?? null,
    currency: body.currency,
    confirmationMode: 'manual',
    confirmedAt: now,
    cancelledByUserId: null,
    cancelledAt: null,
    cancelReason: null,
    cancellationFeeMinor: null,
    groupSessionId: null,
    recurringSeriesId: null,
    seriesIndex: null,
    createdByUserId: authUserId,
    updatedByUserId: authUserId,
    version: 1,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedByUserId: null,
  });

  const participantRows = body.athleteIds.map((athleteId) => {
    const guardianLink = guardianChildLinks.find((row) => asString(row.athleteId) === athleteId);
    const guardianUserId = asString(guardianLink?.guardianUserId) ?? body.bookedByUserId;
    participants.push({
      id: newId('bkp'),
      bookingId,
      athleteId,
      guardianUserId,
      status: 'confirmed',
      createdByUserId: authUserId,
      updatedByUserId: authUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    });
    return {
      athleteId,
      guardianUserId,
      status: 'confirmed' as const,
    };
  });

  for (const [index, objective] of body.objectives.entries()) {
    objectives.push({
      id: newId('boj'),
      bookingId,
      objective,
      sortOrder: index + 1,
      createdAt: now,
    });
  }

  statusEvents.push({
    id: newId('bse'),
    bookingId,
    fromStatus: 'PENDING',
    toStatus: 'CONFIRMED',
    actorUserId: authUserId,
    reason: 'Created via API booking endpoint.',
    metadataJson: {
      source: 'api-runtime',
    },
    requestId,
    occurredAt: now,
  });

  return bookingResponseSchema.parse({
    id: bookingId,
    coachUserId: body.coachUserId,
    bookedByUserId: body.bookedByUserId,
    status: 'CONFIRMED',
    scheduledAt: body.scheduledAt,
    durationMinutes: body.durationMinutes,
    location: body.location,
    serviceType: body.serviceType,
    sessionTemplateId: body.sessionTemplateId ?? null,
    objectives: body.objectives,
    notes: body.notes ?? null,
    priceMinor: body.priceMinor ?? null,
    currency: body.currency,
    participants: participantRows,
    version: 1,
    createdAt: now,
    updatedAt: now,
    cancelledAt: null,
  });
}

class SeedBookingRepository implements BookingRepository {
  async listVisibleBookings(params: ListBookingsParams): Promise<ListBookingsResult> {
    const store = getMarketplaceSeedStore();
    return {
      bookings: mapSeedBookingsFromTables(store.tables, params.authUserId, params.statusFilter),
      dataVersion: store.version,
    };
  }

  async createBooking(params: CreateBookingParams): Promise<BookingResponse> {
    const store = getMarketplaceSeedStore();
    return createBookingInSeedTables({
      tables: store.tables,
      authUserId: params.authUserId,
      requestId: params.requestId,
      body: params.body,
    });
  }
}

class DbBookingRepository implements BookingRepository {
  async listVisibleBookings(params: ListBookingsParams): Promise<ListBookingsResult> {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return {
        bookings: mapSeedBookingsFromTables(store.tables, params.authUserId, params.statusFilter),
        dataVersion: null,
      };
    }

    const prisma = getPrismaClientOrThrow();
    const normalizedStatus = params.statusFilter?.toUpperCase();
    if (normalizedStatus && !isSupportedBookingStatus(normalizedStatus)) {
      return { bookings: [], dataVersion: null };
    }
    const statusValue = normalizedStatus ? (normalizedStatus as BookingStatusCode) : undefined;

    const bookings = await prisma.booking.findMany({
      where: {
        ...(statusValue ? { status: statusValue } : {}),
        OR: [
          { coachUserId: params.authUserId },
          { bookedByUserId: params.authUserId },
          { participants: { some: { guardianUserId: params.authUserId } } },
          { participants: { some: { athlete: { userId: params.authUserId } } } },
        ],
      },
      include: {
        participants: {
          include: {
            athlete: {
              select: { userId: true },
            },
          },
        },
        objectives: true,
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    const normalizedBookings = normalizeForJson(bookings) as Array<Record<string, unknown>>;
    const rows = normalizedBookings.map((booking) => {
      const participantRows = asRows(booking.participants).map((participant) => ({
        athleteId: asString(participant.athleteId) ?? '',
        guardianUserId: asString(participant.guardianUserId),
        status: (asString(participant.status) ?? 'pending').toLowerCase(),
      }));
      const objectiveRows = asRows(booking.objectives)
        .sort((a, b) => (asNumber(a.sortOrder) ?? 0) - (asNumber(b.sortOrder) ?? 0))
        .map((objective) => asString(objective.objective))
        .filter((objective): objective is string => Boolean(objective));

      return bookingResponseSchema.parse({
        id: asString(booking.id),
        coachUserId: asString(booking.coachUserId),
        bookedByUserId: asString(booking.bookedByUserId) ?? undefined,
        status: asString(booking.status),
        scheduledAt: asString(booking.scheduledAt),
        durationMinutes: asNumber(booking.durationMinutes) ?? 60,
        location: asString(booking.location) ?? 'TBD',
        serviceType: asString(booking.serviceType) ?? undefined,
        sessionTemplateId: null,
        objectives: objectiveRows,
        notes: asString(booking.notes) ?? null,
        priceMinor: asNumber(booking.priceMinor) ?? null,
        currency: asString(booking.currency) ?? 'GBP',
        participants: participantRows,
        version: asNumber(booking.version) ?? 1,
        createdAt: asString(booking.createdAt) ?? isoNow(),
        updatedAt: asString(booking.updatedAt) ?? isoNow(),
        cancelledAt: asString(booking.cancelledAt) ?? null,
      });
    });
    return {
      bookings: rows,
      dataVersion: null,
    };
  }

  async createBooking(params: CreateBookingParams): Promise<BookingResponse> {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return createBookingInSeedTables({
        tables: store.tables,
        authUserId: params.authUserId,
        requestId: params.requestId,
        body: params.body,
      });
    }

    const prisma = getPrismaClientOrThrow();
    const now = new Date();
    const nowIsoString = now.toISOString();
    const bookingId = newId('bok');
    const body = params.body;
    const guardianLinks = await prisma.guardianChildLink.findMany({
      where: {
        athleteId: {
          in: body.athleteIds,
        },
      },
    });
    const guardianByAthlete = new Map(guardianLinks.map((row) => [row.athleteId, row.guardianUserId]));

    await prisma.booking.create({
      data: {
        id: bookingId,
        coachUserId: body.coachUserId,
        bookedByUserId: body.bookedByUserId,
        status: 'CONFIRMED',
        scheduledAt: new Date(body.scheduledAt),
        durationMinutes: body.durationMinutes,
        location: body.location,
        serviceType: body.serviceType,
        notes: body.notes ?? null,
        objectivesJson: {
          primary: body.objectives[0] ?? null,
          secondary: body.objectives[1] ?? null,
        },
        priceMinor: body.priceMinor ?? null,
        currency: body.currency,
        confirmationMode: 'manual',
        confirmedAt: now,
        createdByUserId: params.authUserId,
        updatedByUserId: params.authUserId,
      },
    });

    const participantRows = body.athleteIds.map((athleteId) => ({
      id: newId('bkp'),
      bookingId,
      athleteId,
      guardianUserId: guardianByAthlete.get(athleteId) ?? body.bookedByUserId,
      status: 'confirmed',
      createdByUserId: params.authUserId,
      updatedByUserId: params.authUserId,
    }));

    await prisma.bookingParticipant.createMany({
      data: participantRows,
    });

    await prisma.bookingObjective.createMany({
      data: body.objectives.map((objective, index) => ({
        id: newId('boj'),
        bookingId,
        objective,
        sortOrder: index + 1,
        createdAt: now,
      })),
    });

    await prisma.bookingStatusEvent.create({
      data: {
        id: newId('bse'),
        bookingId,
        fromStatus: 'PENDING',
        toStatus: 'CONFIRMED',
        actorUserId: params.authUserId,
        reason: 'Created via API booking endpoint.',
        metadataJson: {
          source: 'api-db-runtime',
        },
        requestId: params.requestId,
        occurredAt: now,
      },
    });

    const result = participantRows.map((participant) => ({
      athleteId: participant.athleteId,
      guardianUserId: participant.guardianUserId ?? undefined,
      status: participant.status as 'confirmed',
    }));

    return normalizeForJson(
      bookingResponseSchema.parse({
        id: bookingId,
        coachUserId: body.coachUserId,
        bookedByUserId: body.bookedByUserId,
        status: 'CONFIRMED',
        scheduledAt: body.scheduledAt,
        durationMinutes: body.durationMinutes,
        location: body.location,
        serviceType: body.serviceType,
        sessionTemplateId: body.sessionTemplateId ?? null,
        objectives: body.objectives,
        notes: body.notes ?? null,
        priceMinor: body.priceMinor ?? null,
        currency: body.currency,
        participants: result,
        version: 1,
        createdAt: nowIsoString,
        updatedAt: nowIsoString,
        cancelledAt: null,
      }),
    );
  }
}

const seedBookingRepository = new SeedBookingRepository();
const dbBookingRepository = new DbBookingRepository();

export function resolveBookingRepository(): BookingRepository {
  return getApiDataBackend() === 'db' ? dbBookingRepository : seedBookingRepository;
}
