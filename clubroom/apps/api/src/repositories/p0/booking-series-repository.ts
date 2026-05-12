import crypto from 'node:crypto';
import {
  bookingResponseSchema,
  createBookingSeriesResponseSchema,
  type BookingResponse,
  type CreateBookingRequest,
  type CreateBookingSeriesRequest,
  type CreateBookingSeriesResponse,
} from '@clubroom/shared-contracts';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { badRequest, conflict, forbidden } from '../../lib/http-errors.js';
import { normalizeForJson } from './normalize.js';
import {
  createBookingInSeedTables,
  type SeedRow,
  type SeedTables,
} from './booking-repository.js';

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const isoNow = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const BOOKING_SERIES_CREATE_ENDPOINT_KEY = 'POST:/v1/booking-series';
const IDEMPOTENCY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface CreateBookingSeriesParams {
  authUserId: string;
  requestId: string;
  body: CreateBookingSeriesRequest;
}

export interface BookingSeriesRepository {
  createBookingSeries(params: CreateBookingSeriesParams): Promise<CreateBookingSeriesResponse>;
}

function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJson);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalizeJson(entry)]),
    );
  }
  return value;
}

function hashCreateBookingSeriesRequest(body: CreateBookingSeriesRequest): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalizeJson(body)))
    .digest('hex');
}

function assertMatchingIdempotencyRequest(entry: SeedRow, requestHash: string): void {
  if (asString(entry.requestHash) !== requestHash) {
    throw conflict('Idempotency key was already used with a different booking series payload');
  }
}

function parseIdempotentBookingSeriesResponse(
  value: unknown,
): CreateBookingSeriesResponse | null {
  const parsed = createBookingSeriesResponseSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function getAthleteUserIdsByAthleteId(tables: SeedTables): Map<string, string | undefined> {
  const athletes = asRows(tables.athletes);
  return new Map(
    athletes
      .map((row) => [asString(row.id), asString(row.userId)] as const)
      .filter(([id]) => Boolean(id))
      .map(([id, userId]) => [id as string, userId]),
  );
}

function assertSeedBookingSeriesAthleteAccess(
  tables: SeedTables,
  authUserId: string,
  athleteIds: string[],
): void {
  const athleteUserIdsByAthleteId = getAthleteUserIdsByAthleteId(tables);
  const guardianLinks = asRows(tables.guardianChildLinks);

  for (const athleteId of athleteIds) {
    const athleteUserId = athleteUserIdsByAthleteId.get(athleteId);
    if (athleteUserId === authUserId) {
      continue;
    }

    const linkedGuardian = guardianLinks.some(
      (row) => asString(row.athleteId) === athleteId && asString(row.guardianUserId) === authUserId,
    );
    if (linkedGuardian) {
      continue;
    }

    throw forbidden('Authenticated user cannot create booking series for this athlete', {
      athleteId,
    });
  }
}

function findSeedCreateBookingSeriesIdempotency(params: {
  tables: SeedTables;
  authUserId: string;
  body: CreateBookingSeriesRequest;
}): CreateBookingSeriesResponse | null {
  const idempotencyKey = params.body.idempotencyKey;
  if (!idempotencyKey) {
    return null;
  }

  const requestHash = hashCreateBookingSeriesRequest(params.body);
  const entry = asRows(params.tables.idempotencyKeys).find(
    (row) =>
      asString(row.userId) === params.authUserId &&
      asString(row.endpointKey) === BOOKING_SERIES_CREATE_ENDPOINT_KEY &&
      asString(row.idempotencyKey) === idempotencyKey,
  );
  if (!entry) {
    return null;
  }

  assertMatchingIdempotencyRequest(entry, requestHash);
  return parseIdempotentBookingSeriesResponse(entry.responseBodyJson);
}

function recordSeedCreateBookingSeriesIdempotency(params: {
  tables: SeedTables;
  authUserId: string;
  body: CreateBookingSeriesRequest;
  response: CreateBookingSeriesResponse;
  now: string;
}): void {
  if (!params.body.idempotencyKey) {
    return;
  }

  if (!Array.isArray(params.tables.idempotencyKeys)) {
    params.tables.idempotencyKeys = [];
  }

  params.tables.idempotencyKeys.push({
    id: newId('idk'),
    userId: params.authUserId,
    endpointKey: BOOKING_SERIES_CREATE_ENDPOINT_KEY,
    idempotencyKey: params.body.idempotencyKey,
    requestHash: hashCreateBookingSeriesRequest(params.body),
    responseStatus: 201,
    responseBodyJson: params.response,
    createdAt: params.now,
    expiresAt: new Date(Date.parse(params.now) + IDEMPOTENCY_TTL_MS).toISOString(),
  });
}

function isCreateBookingSeriesIdempotencyRace(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const prismaError = error as { code?: unknown; meta?: { target?: unknown } };
  if (prismaError.code !== 'P2002') {
    return false;
  }

  const target = prismaError.meta?.target;
  if (!Array.isArray(target)) {
    return false;
  }

  return ['userId', 'endpointKey', 'idempotencyKey'].every((field) => target.includes(field));
}

function getSortedOccurrenceDates(body: CreateBookingSeriesRequest): Date[] {
  return body.occurrences
    .map((occurrence) => new Date(occurrence.scheduledAt))
    .sort((left, right) => left.getTime() - right.getTime());
}

export function assertBookingSeriesOccurrencesValid(body: CreateBookingSeriesRequest): void {
  const windows = body.occurrences
    .map((occurrence, index) => {
      const startsAt = new Date(occurrence.scheduledAt);
      if (Number.isNaN(startsAt.getTime())) {
        throw badRequest('Booking series occurrence has an invalid scheduledAt value', {
          index,
        });
      }
      return {
        index,
        startsAt: startsAt.getTime(),
        endsAt: startsAt.getTime() + occurrence.durationMinutes * 60_000,
      };
    })
    .sort((left, right) => left.startsAt - right.startsAt);

  for (let index = 1; index < windows.length; index += 1) {
    const previous = windows[index - 1];
    const current = windows[index];
    if (current.startsAt < previous.endsAt) {
      throw badRequest('Booking series occurrences cannot overlap', {
        previousIndex: previous.index,
        currentIndex: current.index,
      });
    }
  }
}

export async function assertBookingSeriesCreateAccess(params: {
  authUserId: string;
  body: CreateBookingSeriesRequest;
}): Promise<void> {
  if (getApiDataBackend() !== 'db' || shouldUseDbFixtureFallback()) {
    const tables =
      getApiDataBackend() === 'db' ? getDbFixtureStore().tables : getMarketplaceSeedStore().tables;
    assertSeedBookingSeriesAthleteAccess(tables, params.authUserId, params.body.athleteIds);
    return;
  }

  const prisma = getPrismaClientOrThrow();
  const guardianLinks = await prisma.guardianChildLink.findMany({
    where: {
      athleteId: {
        in: params.body.athleteIds,
      },
    },
  });
  const athleteRows = await prisma.athlete.findMany({
    where: {
      id: {
        in: params.body.athleteIds,
      },
    },
    select: {
      id: true,
      userId: true,
    },
  });
  const athleteUserIdByAthleteId = new Map(
    athleteRows.map((row) => [row.id, row.userId ?? undefined]),
  );

  for (const athleteId of params.body.athleteIds) {
    const athleteUserId = athleteUserIdByAthleteId.get(athleteId);
    if (athleteUserId === params.authUserId) {
      continue;
    }

    const linkedGuardian = guardianLinks.some(
      (row) => row.athleteId === athleteId && row.guardianUserId === params.authUserId,
    );
    if (linkedGuardian) {
      continue;
    }

    throw forbidden('Authenticated user cannot create booking series for this athlete', {
      athleteId,
    });
  }
}

function buildOccurrenceBookingRequest(params: {
  body: CreateBookingSeriesRequest;
  occurrenceIndex: number;
}): CreateBookingRequest {
  const occurrence = params.body.occurrences[params.occurrenceIndex];
  return {
    coachUserId: params.body.coachUserId,
    athleteIds: params.body.athleteIds,
    bookedByUserId: params.body.bookedByUserId,
    scheduledAt: occurrence.scheduledAt,
    durationMinutes: occurrence.durationMinutes,
    location: occurrence.location ?? params.body.location,
    serviceType: params.body.serviceType,
    ...(params.body.sessionTemplateId
      ? { sessionTemplateId: params.body.sessionTemplateId }
      : {}),
    objectives: params.body.objectives,
    ...(params.body.notes ? { notes: params.body.notes } : {}),
    ...(typeof params.body.priceMinor === 'number' ? { priceMinor: params.body.priceMinor } : {}),
    currency: params.body.currency,
  };
}

function buildBookingSeriesResponse(params: {
  body: CreateBookingSeriesRequest;
  seriesId: string;
  bookings: BookingResponse[];
  requestId: string;
  createdAt: string;
  updatedAt: string;
}): CreateBookingSeriesResponse {
  const occurrenceDates = getSortedOccurrenceDates(params.body);
  const startDate = occurrenceDates[0]?.toISOString();
  const endDate = occurrenceDates[occurrenceDates.length - 1]?.toISOString();
  if (!startDate || !endDate) {
    throw badRequest('Booking series requires at least one occurrence');
  }

  return createBookingSeriesResponseSchema.parse({
    series: {
      id: params.seriesId,
      coachUserId: params.body.coachUserId,
      bookedByUserId: params.body.bookedByUserId,
      athleteIds: params.body.athleteIds,
      frequency: params.body.frequency,
      patternLabel: params.body.patternLabel ?? null,
      status: 'ACTIVE',
      startDate,
      endDate,
      bookingIds: params.bookings.map((booking) => booking.id),
      totalPriceMinor:
        typeof params.body.priceMinor === 'number'
          ? params.body.priceMinor * params.bookings.length
          : null,
      currency: params.body.currency,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    },
    bookings: params.bookings,
    requestId: params.requestId,
  });
}

function createSeedRecurringSeriesRow(params: {
  body: CreateBookingSeriesRequest;
  authUserId: string;
  seriesId: string;
  now: string;
}): SeedRow {
  const occurrenceDates = getSortedOccurrenceDates(params.body);
  const firstOccurrence = occurrenceDates[0];
  const lastOccurrence = occurrenceDates[occurrenceDates.length - 1];
  const firstScheduledAt = firstOccurrence.toISOString();

  return {
    id: params.seriesId,
    coachUserId: params.body.coachUserId,
    bookedByUserId: params.body.bookedByUserId,
    athleteId: params.body.athleteIds[0] ?? null,
    frequency: params.body.frequency,
    dayOfWeek: firstOccurrence.getUTCDay(),
    timeLocal: firstScheduledAt.slice(11, 16),
    startDate: firstScheduledAt,
    endDate: lastOccurrence.toISOString(),
    status: 'ACTIVE',
    notes: params.body.notes ?? params.body.patternLabel ?? null,
    createdByUserId: params.authUserId,
    updatedByUserId: params.authUserId,
    version: 1,
    createdAt: params.now,
    updatedAt: params.now,
    deletedAt: null,
    deletedByUserId: null,
  };
}

class SeedBookingSeriesRepository implements BookingSeriesRepository {
  constructor(
    private readonly loadStore: () => {
      version: string | null;
      tables: SeedTables;
    } = getMarketplaceSeedStore,
  ) {}

  async createBookingSeries(
    params: CreateBookingSeriesParams,
  ): Promise<CreateBookingSeriesResponse> {
    const store = this.loadStore();
    const idempotentResponse = findSeedCreateBookingSeriesIdempotency({
      tables: store.tables,
      authUserId: params.authUserId,
      body: params.body,
    });
    if (idempotentResponse) {
      return idempotentResponse;
    }

    assertBookingSeriesOccurrencesValid(params.body);
    assertSeedBookingSeriesAthleteAccess(store.tables, params.authUserId, params.body.athleteIds);

    if (!Array.isArray(store.tables.recurringSeries)) {
      store.tables.recurringSeries = [];
    }

    const now = isoNow();
    const seriesId = newId('rec');
    store.tables.recurringSeries.push(
      createSeedRecurringSeriesRow({
        body: params.body,
        authUserId: params.authUserId,
        seriesId,
        now,
      }),
    );

    const bookings = params.body.occurrences.map((_, index) =>
      createBookingInSeedTables({
        tables: store.tables,
        authUserId: params.authUserId,
        requestId: params.requestId,
        body: buildOccurrenceBookingRequest({
          body: params.body,
          occurrenceIndex: index,
        }),
        bookingRowOverrides: {
          recurringSeriesId: seriesId,
          seriesIndex: index,
        },
      }),
    );

    const response = buildBookingSeriesResponse({
      body: params.body,
      seriesId,
      bookings,
      requestId: params.requestId,
      createdAt: now,
      updatedAt: now,
    });
    recordSeedCreateBookingSeriesIdempotency({
      tables: store.tables,
      authUserId: params.authUserId,
      body: params.body,
      response,
      now,
    });

    return response;
  }
}

export async function resolveCreateBookingSeriesIdempotency(params: {
  authUserId: string;
  body: CreateBookingSeriesRequest;
}): Promise<{ responseStatus: number; response: CreateBookingSeriesResponse } | null> {
  if (!params.body.idempotencyKey) {
    return null;
  }

  if (getApiDataBackend() !== 'db' || shouldUseDbFixtureFallback()) {
    const tables =
      getApiDataBackend() === 'db' ? getDbFixtureStore().tables : getMarketplaceSeedStore().tables;
    const response = findSeedCreateBookingSeriesIdempotency({
      tables,
      authUserId: params.authUserId,
      body: params.body,
    });
    return response ? { responseStatus: 201, response } : null;
  }

  const prisma = getPrismaClientOrThrow();
  const entry = await prisma.idempotencyKey.findUnique({
    where: {
      userId_endpointKey_idempotencyKey: {
        userId: params.authUserId,
        endpointKey: BOOKING_SERIES_CREATE_ENDPOINT_KEY,
        idempotencyKey: params.body.idempotencyKey,
      },
    },
  });
  if (!entry) {
    return null;
  }

  const requestHash = hashCreateBookingSeriesRequest(params.body);
  if (entry.requestHash !== requestHash) {
    throw conflict('Idempotency key was already used with a different booking series payload');
  }

  const response = parseIdempotentBookingSeriesResponse(entry.responseBodyJson);
  if (!response) {
    throw conflict('Stored idempotency response is no longer valid');
  }

  return { responseStatus: entry.responseStatus, response };
}

class DbBookingSeriesRepository implements BookingSeriesRepository {
  async createBookingSeries(
    params: CreateBookingSeriesParams,
  ): Promise<CreateBookingSeriesResponse> {
    if (shouldUseDbFixtureFallback()) {
      const seedRepository = new SeedBookingSeriesRepository(getDbFixtureStore);
      return seedRepository.createBookingSeries(params);
    }

    const idempotentResponse = await resolveCreateBookingSeriesIdempotency({
      authUserId: params.authUserId,
      body: params.body,
    });
    if (idempotentResponse) {
      return idempotentResponse.response;
    }

    assertBookingSeriesOccurrencesValid(params.body);

    const prisma = getPrismaClientOrThrow();
    const body = params.body;
    const guardianLinks = await prisma.guardianChildLink.findMany({
      where: {
        athleteId: {
          in: body.athleteIds,
        },
      },
    });
    const athleteRows = await prisma.athlete.findMany({
      where: {
        id: {
          in: body.athleteIds,
        },
      },
      select: {
        id: true,
        userId: true,
      },
    });
    const athleteUserIdByAthleteId = new Map(
      athleteRows.map((row) => [row.id, row.userId ?? undefined]),
    );

    for (const athleteId of body.athleteIds) {
      const athleteUserId = athleteUserIdByAthleteId.get(athleteId);
      if (athleteUserId === params.authUserId) {
        continue;
      }

      const linkedGuardian = guardianLinks.some(
        (row) => row.athleteId === athleteId && row.guardianUserId === params.authUserId,
      );
      if (linkedGuardian) {
        continue;
      }

      throw forbidden('Authenticated user cannot create booking series for this athlete', {
        athleteId,
      });
    }

    const guardianByAthlete = new Map(
      guardianLinks.map((row) => [row.athleteId, row.guardianUserId]),
    );
    const now = new Date();
    const nowIsoString = now.toISOString();
    const seriesId = newId('rec');
    const bookingIds = body.occurrences.map(() => newId('bok'));
    const occurrenceDates = getSortedOccurrenceDates(body);
    const bookings = body.occurrences.map((occurrence, index) =>
      bookingResponseSchema.parse({
        id: bookingIds[index],
        coachUserId: body.coachUserId,
        bookedByUserId: body.bookedByUserId,
        status: 'CONFIRMED',
        scheduledAt: occurrence.scheduledAt,
        durationMinutes: occurrence.durationMinutes,
        location: occurrence.location ?? body.location,
        serviceType: body.serviceType,
        sessionTemplateId: body.sessionTemplateId ?? null,
        objectives: body.objectives,
        notes: body.notes ?? null,
        priceMinor: body.priceMinor ?? null,
        currency: body.currency,
        participants: body.athleteIds.map((athleteId) => ({
          athleteId,
          guardianUserId: guardianByAthlete.get(athleteId) ?? body.bookedByUserId,
          status: 'confirmed',
        })),
        version: 1,
        createdAt: nowIsoString,
        updatedAt: nowIsoString,
        cancelledAt: null,
      }),
    );
    const response = buildBookingSeriesResponse({
      body,
      seriesId,
      bookings,
      requestId: params.requestId,
      createdAt: nowIsoString,
      updatedAt: nowIsoString,
    });

    try {
      await prisma.$transaction(async (tx) => {
        await tx.recurringSeries.create({
          data: {
            id: seriesId,
            coachUserId: body.coachUserId,
            bookedByUserId: body.bookedByUserId,
            athleteId: body.athleteIds[0] ?? null,
            frequency: body.frequency,
            dayOfWeek: occurrenceDates[0].getUTCDay(),
            timeLocal: occurrenceDates[0].toISOString().slice(11, 16),
            startDate: occurrenceDates[0],
            endDate: occurrenceDates[occurrenceDates.length - 1],
            status: 'ACTIVE',
            notes: body.notes ?? body.patternLabel ?? null,
            createdByUserId: params.authUserId,
            updatedByUserId: params.authUserId,
          },
        });

        for (const [index, occurrence] of body.occurrences.entries()) {
          const bookingId = bookingIds[index];
          await tx.booking.create({
            data: {
              id: bookingId,
              coachUserId: body.coachUserId,
              bookedByUserId: body.bookedByUserId,
              status: 'CONFIRMED',
              scheduledAt: new Date(occurrence.scheduledAt),
              durationMinutes: occurrence.durationMinutes,
              location: occurrence.location ?? body.location,
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
              recurringSeriesId: seriesId,
              seriesIndex: index,
              createdByUserId: params.authUserId,
              updatedByUserId: params.authUserId,
            },
          });

          if (body.athleteIds.length > 0) {
            await tx.bookingParticipant.createMany({
              data: body.athleteIds.map((athleteId) => ({
                id: newId('bkp'),
                bookingId,
                athleteId,
                guardianUserId: guardianByAthlete.get(athleteId) ?? body.bookedByUserId,
                status: 'confirmed',
                createdByUserId: params.authUserId,
                updatedByUserId: params.authUserId,
              })),
            });
          }

          if (body.objectives.length > 0) {
            await tx.bookingObjective.createMany({
              data: body.objectives.map((objective, objectiveIndex) => ({
                id: newId('boj'),
                bookingId,
                objective,
                sortOrder: objectiveIndex + 1,
                createdAt: now,
              })),
            });
          }

          await tx.bookingStatusEvent.create({
            data: {
              id: newId('bse'),
              bookingId,
              fromStatus: 'PENDING',
              toStatus: 'CONFIRMED',
              actorUserId: params.authUserId,
              reason: 'Created via API booking series endpoint.',
              metadataJson: {
                source: 'api-db-runtime',
                recurringSeriesId: seriesId,
                seriesIndex: index,
              },
              requestId: params.requestId,
              occurredAt: now,
            },
          });
        }

        if (body.idempotencyKey) {
          await tx.idempotencyKey.create({
            data: {
              id: newId('idk'),
              userId: params.authUserId,
              endpointKey: BOOKING_SERIES_CREATE_ENDPOINT_KEY,
              idempotencyKey: body.idempotencyKey,
              requestHash: hashCreateBookingSeriesRequest(body),
              responseStatus: 201,
              responseBodyJson: response as never,
              expiresAt: new Date(now.getTime() + IDEMPOTENCY_TTL_MS),
            },
          });
        }
      });
    } catch (error) {
      if (body.idempotencyKey && isCreateBookingSeriesIdempotencyRace(error)) {
        const replay = await resolveCreateBookingSeriesIdempotency({
          authUserId: params.authUserId,
          body,
        });
        if (replay) {
          return replay.response;
        }
      }
      throw error;
    }

    return normalizeForJson(response);
  }
}

const seedBookingSeriesRepository = new SeedBookingSeriesRepository();
const dbBookingSeriesRepository = new DbBookingSeriesRepository();

export function resolveBookingSeriesRepository(): BookingSeriesRepository {
  return getApiDataBackend() === 'db' ? dbBookingSeriesRepository : seedBookingSeriesRepository;
}
