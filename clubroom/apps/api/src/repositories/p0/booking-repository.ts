import crypto from 'node:crypto';
import {
  bookingResponseSchema,
  bookingStatusSchema,
  type BookingResponse,
  type CancelBookingRequest,
  type CreateBookingRequest,
  type ReopenBookingRequest,
} from '@clubroom/shared-contracts';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { normalizeForJson } from './normalize.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/http-errors.js';

export type SeedRow = Record<string, unknown>;
export type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;
const isoNow = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
type BookingStatusCode =
  | 'PENDING'
  | 'AWAITING_CONFIRMATION'
  | 'CONFIRMED'
  | 'AWAITING_COMPLETION'
  | 'COMPLETED'
  | 'CANCELLED';
const BOOKING_CREATE_ENDPOINT_KEY = 'POST:/v1/bookings';
const IDEMPOTENCY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const bookingLifecycleEndpointKey = (bookingId: string, action: 'cancel' | 'reopen') =>
  `POST:/v1/bookings/${bookingId}/${action}`;

export interface ListBookingsParams {
  authUserId: string;
  statusFilter?: string;
}

export interface CreateBookingParams {
  authUserId: string;
  requestId: string;
  body: CreateBookingRequest;
}

export interface GetBookingParams {
  authUserId: string;
  bookingId: string;
}

export interface CancelBookingParams {
  authUserId: string;
  requestId: string;
  bookingId: string;
  body: CancelBookingRequest;
}

export interface ReopenBookingParams {
  authUserId: string;
  requestId: string;
  bookingId: string;
  body: ReopenBookingRequest;
}

export interface ListBookingsResult {
  bookings: BookingResponse[];
  dataVersion: string | null;
}

export interface BookingRepository {
  listVisibleBookings(params: ListBookingsParams): Promise<ListBookingsResult>;
  getVisibleBookingById(params: GetBookingParams): Promise<BookingResponse>;
  createBooking(params: CreateBookingParams): Promise<BookingResponse>;
  cancelBooking(params: CancelBookingParams): Promise<BookingResponse>;
  reopenBooking(params: ReopenBookingParams): Promise<BookingResponse>;
}

function isSupportedBookingStatus(status: string): boolean {
  return bookingStatusSchema.safeParse(status).success;
}

function getMutableRows(tables: SeedTables, key: string): SeedRow[] {
  if (!Array.isArray(tables[key])) {
    tables[key] = [];
  }
  return tables[key];
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

function hashCreateBookingRequest(body: CreateBookingRequest): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalizeJson(body)))
    .digest('hex');
}

function hashBookingLifecycleRequest(params: {
  bookingId: string;
  body: CancelBookingRequest | ReopenBookingRequest;
}): string {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify(
        canonicalizeJson({
          bookingId: params.bookingId,
          body: params.body,
        }),
      ),
    )
    .digest('hex');
}

function assertMatchingIdempotencyRequest(entry: SeedRow, requestHash: string): void {
  if (asString(entry.requestHash) !== requestHash) {
    throw conflict('Idempotency key was already used with a different booking payload');
  }
}

function parseIdempotentBookingResponse(value: unknown): BookingResponse | null {
  const parsed = bookingResponseSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function isCreateBookingIdempotencyRace(error: unknown): boolean {
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

function findSeedCreateBookingIdempotency(params: {
  tables: SeedTables;
  authUserId: string;
  body: CreateBookingRequest;
}): BookingResponse | null {
  const idempotencyKey = params.body.idempotencyKey;
  if (!idempotencyKey) {
    return null;
  }

  const requestHash = hashCreateBookingRequest(params.body);
  const entry = asRows(params.tables.idempotencyKeys).find(
    (row) =>
      asString(row.userId) === params.authUserId &&
      asString(row.endpointKey) === BOOKING_CREATE_ENDPOINT_KEY &&
      asString(row.idempotencyKey) === idempotencyKey,
  );
  if (!entry) {
    return null;
  }

  assertMatchingIdempotencyRequest(entry, requestHash);
  const response = parseIdempotentBookingResponse(entry.responseBodyJson);
  if (response) {
    return response;
  }

  const legacyBookingId = asString((entry.responseBodyJson as SeedRow | undefined)?.bookingId);
  if (!legacyBookingId) {
    return null;
  }

  return getVisibleSeedBookingById(params.tables, params.authUserId, legacyBookingId);
}

function recordSeedCreateBookingIdempotency(params: {
  tables: SeedTables;
  authUserId: string;
  body: CreateBookingRequest;
  response: BookingResponse;
  now: string;
}): void {
  if (!params.body.idempotencyKey) {
    return;
  }

  getMutableRows(params.tables, 'idempotencyKeys').push({
    id: newId('idk'),
    userId: params.authUserId,
    endpointKey: BOOKING_CREATE_ENDPOINT_KEY,
    idempotencyKey: params.body.idempotencyKey,
    requestHash: hashCreateBookingRequest(params.body),
    responseStatus: 201,
    responseBodyJson: params.response,
    createdAt: params.now,
    expiresAt: new Date(Date.parse(params.now) + IDEMPOTENCY_TTL_MS).toISOString(),
  });
}

function findSeedLifecycleBookingIdempotency(params: {
  tables: SeedTables;
  authUserId: string;
  endpointKey: string;
  idempotencyKey?: string;
  requestHash: string;
}): BookingResponse | null {
  if (!params.idempotencyKey) {
    return null;
  }

  const entry = asRows(params.tables.idempotencyKeys).find(
    (row) =>
      asString(row.userId) === params.authUserId &&
      asString(row.endpointKey) === params.endpointKey &&
      asString(row.idempotencyKey) === params.idempotencyKey,
  );
  if (!entry) {
    return null;
  }

  assertMatchingIdempotencyRequest(entry, params.requestHash);
  return parseIdempotentBookingResponse(entry.responseBodyJson);
}

function recordSeedLifecycleBookingIdempotency(params: {
  tables: SeedTables;
  authUserId: string;
  endpointKey: string;
  idempotencyKey?: string;
  requestHash: string;
  response: BookingResponse;
  now: string;
}): void {
  if (!params.idempotencyKey) {
    return;
  }

  getMutableRows(params.tables, 'idempotencyKeys').push({
    id: newId('idk'),
    userId: params.authUserId,
    endpointKey: params.endpointKey,
    idempotencyKey: params.idempotencyKey,
    requestHash: params.requestHash,
    responseStatus: 200,
    responseBodyJson: params.response,
    createdAt: params.now,
    expiresAt: new Date(Date.parse(params.now) + IDEMPOTENCY_TTL_MS).toISOString(),
  });
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

function assertSeedBookingAthleteAccess(
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

    throw forbidden('Authenticated user cannot create bookings for this athlete', {
      athleteId,
    });
  }
}

function getParticipantRowsByBooking(tables: SeedTables): Map<string, SeedRow[]> {
  const participants = asRows(tables.bookingParticipants);
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

  return participantRowsByBooking;
}

function getObjectiveValuesForBooking(tables: SeedTables, bookingId: string): string[] {
  return asRows(tables.bookingObjectives)
    .filter((objective) => asString(objective.bookingId) === bookingId)
    .sort((a, b) => (asNumber(a.sortOrder) ?? 0) - (asNumber(b.sortOrder) ?? 0))
    .map((objective) => asString(objective.objective))
    .filter((objective): objective is string => Boolean(objective));
}

function canUserAccessSeedBooking(
  tables: SeedTables,
  booking: SeedRow,
  authUserId: string,
  participantRowsByBooking = getParticipantRowsByBooking(tables),
  athleteUserIdsByAthleteId = getAthleteUserIdsByAthleteId(tables),
): boolean {
  if (
    asString(booking.coachUserId) === authUserId ||
    asString(booking.bookedByUserId) === authUserId
  ) {
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
}

function mapSeedBookingRow(
  tables: SeedTables,
  booking: SeedRow,
  participantRowsByBooking = getParticipantRowsByBooking(tables),
): BookingResponse {
  const bookingId = asString(booking.id) ?? '';
  const bookingParticipants = (participantRowsByBooking.get(bookingId) ?? []).map(
    (participant) => ({
      athleteId: asString(participant.athleteId) ?? '',
      guardianUserId: asString(participant.guardianUserId),
      status: (asString(participant.status) ?? 'pending').toLowerCase(),
    }),
  );

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
    objectives: getObjectiveValuesForBooking(tables, bookingId),
    notes: asString(booking.notes) ?? null,
    priceMinor: asNumber(booking.priceMinor) ?? null,
    currency: asString(booking.currency) ?? 'GBP',
    participants: bookingParticipants,
    version: asNumber(booking.version) ?? 1,
    createdAt: asString(booking.createdAt) ?? isoNow(),
    updatedAt: asString(booking.updatedAt) ?? isoNow(),
    cancelledAt: asString(booking.cancelledAt) ?? null,
  });
}

function mapSeedBookingsFromTables(
  tables: SeedTables,
  authUserId: string,
  statusFilter?: string,
): BookingResponse[] {
  const bookings = asRows(tables.bookings);
  const normalizedStatus = statusFilter?.toUpperCase();
  if (normalizedStatus && !isSupportedBookingStatus(normalizedStatus)) {
    return [];
  }

  const athleteUserIdsByAthleteId = getAthleteUserIdsByAthleteId(tables);
  const participantRowsByBooking = getParticipantRowsByBooking(tables);

  const visible = bookings.filter((booking) => {
    const bookingStatus = asString(booking.status)?.toUpperCase();
    if (normalizedStatus && bookingStatus !== normalizedStatus) {
      return false;
    }
    return canUserAccessSeedBooking(
      tables,
      booking,
      authUserId,
      participantRowsByBooking,
      athleteUserIdsByAthleteId,
    );
  });

  return visible.map((booking) => mapSeedBookingRow(tables, booking, participantRowsByBooking));
}

function getVisibleSeedBookingById(
  tables: SeedTables,
  authUserId: string,
  bookingId: string,
): BookingResponse {
  const bookings = asRows(tables.bookings);
  const participantRowsByBooking = getParticipantRowsByBooking(tables);
  const athleteUserIdsByAthleteId = getAthleteUserIdsByAthleteId(tables);
  const booking = bookings.find((row) => asString(row.id) === bookingId);

  if (!booking) {
    throw notFound('Booking not found', { bookingId });
  }

  if (
    !canUserAccessSeedBooking(
      tables,
      booking,
      authUserId,
      participantRowsByBooking,
      athleteUserIdsByAthleteId,
    )
  ) {
    throw forbidden('Booking does not belong to authenticated user');
  }

  return mapSeedBookingRow(tables, booking, participantRowsByBooking);
}

function normalizeReopenStatus(status: string | undefined): BookingStatusCode {
  if (status) {
    const normalized = status.toUpperCase();
    if (
      normalized !== 'CANCELLED' &&
      normalized !== 'COMPLETED' &&
      isSupportedBookingStatus(normalized)
    ) {
      return normalized as BookingStatusCode;
    }
  }
  return 'CONFIRMED';
}

function assertExpectedBookingVersion(currentVersion: number, expectedVersion?: number): void {
  if (expectedVersion === undefined) {
    return;
  }
  if (currentVersion !== expectedVersion) {
    throw conflict('Booking version changed since it was loaded', {
      currentVersion,
      expectedVersion,
    });
  }
}

function resolveSeedReopenStatus(tables: SeedTables, bookingId: string): BookingStatusCode {
  const latestCancelEvent = asRows(tables.bookingStatusEvents)
    .filter(
      (event) =>
        asString(event.bookingId) === bookingId &&
        asString(event.toStatus)?.toUpperCase() === 'CANCELLED',
    )
    .sort(
      (a, b) => Date.parse(asString(b.occurredAt) ?? '') - Date.parse(asString(a.occurredAt) ?? ''),
    )[0];

  return normalizeReopenStatus(asString(latestCancelEvent?.fromStatus));
}

export function createBookingInSeedTables(params: {
  tables: SeedTables;
  authUserId: string;
  requestId: string;
  body: CreateBookingRequest;
  bookingRowOverrides?: Partial<SeedRow>;
}): BookingResponse {
  const { tables, authUserId, requestId, body, bookingRowOverrides } = params;
  const idempotentResponse = findSeedCreateBookingIdempotency({ tables, authUserId, body });
  if (idempotentResponse) {
    return idempotentResponse;
  }

  const bookings = asRows(tables.bookings);
  const participants = asRows(tables.bookingParticipants);
  const objectives = asRows(tables.bookingObjectives);
  const statusEvents = asRows(tables.bookingStatusEvents);
  const guardianChildLinks = asRows(tables.guardianChildLinks);
  const now = isoNow();
  const bookingId = newId('bok');

  assertSeedBookingAthleteAccess(tables, authUserId, body.athleteIds);

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
    ...bookingRowOverrides,
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

  const response = bookingResponseSchema.parse({
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

  recordSeedCreateBookingIdempotency({ tables, authUserId, body, response, now });

  return response;
}

class SeedBookingRepository implements BookingRepository {
  async listVisibleBookings(params: ListBookingsParams): Promise<ListBookingsResult> {
    const store = getMarketplaceSeedStore();
    return {
      bookings: mapSeedBookingsFromTables(store.tables, params.authUserId, params.statusFilter),
      dataVersion: store.version,
    };
  }

  async getVisibleBookingById(params: GetBookingParams): Promise<BookingResponse> {
    const store = getMarketplaceSeedStore();
    return getVisibleSeedBookingById(store.tables, params.authUserId, params.bookingId);
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

  async cancelBooking(params: CancelBookingParams): Promise<BookingResponse> {
    const store = getMarketplaceSeedStore();
    const bookings = asRows(store.tables.bookings);
    const statusEvents = asRows(store.tables.bookingStatusEvents);
    const participantRowsByBooking = getParticipantRowsByBooking(store.tables);
    const athleteUserIdsByAthleteId = getAthleteUserIdsByAthleteId(store.tables);
    const endpointKey = bookingLifecycleEndpointKey(params.bookingId, 'cancel');
    const requestHash = hashBookingLifecycleRequest({
      bookingId: params.bookingId,
      body: params.body,
    });
    const idempotentResponse = findSeedLifecycleBookingIdempotency({
      tables: store.tables,
      authUserId: params.authUserId,
      endpointKey,
      idempotencyKey: params.body.idempotencyKey,
      requestHash,
    });
    if (idempotentResponse) {
      return idempotentResponse;
    }

    const booking = bookings.find((row) => asString(row.id) === params.bookingId);

    if (!booking) {
      throw notFound('Booking not found', { bookingId: params.bookingId });
    }
    if (
      !canUserAccessSeedBooking(
        store.tables,
        booking,
        params.authUserId,
        participantRowsByBooking,
        athleteUserIdsByAthleteId,
      )
    ) {
      throw forbidden('Booking does not belong to authenticated user');
    }

    const currentStatus = asString(booking.status)?.toUpperCase();
    if (currentStatus === 'CANCELLED') {
      return mapSeedBookingRow(store.tables, booking, participantRowsByBooking);
    }
    assertExpectedBookingVersion(asNumber(booking.version) ?? 1, params.body.expectedVersion);
    if (currentStatus === 'COMPLETED') {
      throw badRequest('Completed bookings cannot be cancelled');
    }

    const scheduledAt = Date.parse(asString(booking.scheduledAt) ?? '');
    if (!Number.isFinite(scheduledAt) || scheduledAt <= Date.now()) {
      throw badRequest('Only upcoming bookings can be cancelled');
    }

    const now = isoNow();
    booking.status = 'CANCELLED';
    booking.cancelledByUserId = params.authUserId;
    booking.cancelledAt = now;
    booking.cancelReason = params.body.reason;
    booking.updatedByUserId = params.authUserId;
    booking.updatedAt = now;
    booking.version = (asNumber(booking.version) ?? 1) + 1;

    statusEvents.push({
      id: newId('bse'),
      bookingId: params.bookingId,
      fromStatus: currentStatus,
      toStatus: 'CANCELLED',
      actorUserId: params.authUserId,
      reason: params.body.reason,
      metadataJson: {
        note: params.body.note ?? null,
        source: 'api-runtime',
      },
      requestId: params.requestId,
      occurredAt: now,
    });

    const response = mapSeedBookingRow(store.tables, booking, participantRowsByBooking);
    recordSeedLifecycleBookingIdempotency({
      tables: store.tables,
      authUserId: params.authUserId,
      endpointKey,
      idempotencyKey: params.body.idempotencyKey,
      requestHash,
      response,
      now,
    });

    return response;
  }

  async reopenBooking(params: ReopenBookingParams): Promise<BookingResponse> {
    const store = getMarketplaceSeedStore();
    const bookings = asRows(store.tables.bookings);
    const statusEvents = asRows(store.tables.bookingStatusEvents);
    const participantRowsByBooking = getParticipantRowsByBooking(store.tables);
    const athleteUserIdsByAthleteId = getAthleteUserIdsByAthleteId(store.tables);
    const endpointKey = bookingLifecycleEndpointKey(params.bookingId, 'reopen');
    const requestHash = hashBookingLifecycleRequest({
      bookingId: params.bookingId,
      body: params.body,
    });
    const idempotentResponse = findSeedLifecycleBookingIdempotency({
      tables: store.tables,
      authUserId: params.authUserId,
      endpointKey,
      idempotencyKey: params.body.idempotencyKey,
      requestHash,
    });
    if (idempotentResponse) {
      return idempotentResponse;
    }

    const booking = bookings.find((row) => asString(row.id) === params.bookingId);

    if (!booking) {
      throw notFound('Booking not found', { bookingId: params.bookingId });
    }
    if (
      !canUserAccessSeedBooking(
        store.tables,
        booking,
        params.authUserId,
        participantRowsByBooking,
        athleteUserIdsByAthleteId,
      )
    ) {
      throw forbidden('Booking does not belong to authenticated user');
    }

    const currentStatus = asString(booking.status)?.toUpperCase();
    if (currentStatus !== 'CANCELLED') {
      throw badRequest('Only cancelled bookings can be reopened');
    }
    assertExpectedBookingVersion(asNumber(booking.version) ?? 1, params.body.expectedVersion);

    const scheduledAt = Date.parse(asString(booking.scheduledAt) ?? '');
    if (!Number.isFinite(scheduledAt) || scheduledAt <= Date.now()) {
      throw badRequest('Only upcoming cancelled bookings can be reopened');
    }

    const restoredStatus = resolveSeedReopenStatus(store.tables, params.bookingId);
    const now = isoNow();
    booking.status = restoredStatus;
    booking.cancelledByUserId = null;
    booking.cancelledAt = null;
    booking.cancelReason = null;
    booking.updatedByUserId = params.authUserId;
    booking.updatedAt = now;
    booking.version = (asNumber(booking.version) ?? 1) + 1;

    statusEvents.push({
      id: newId('bse'),
      bookingId: params.bookingId,
      fromStatus: 'CANCELLED',
      toStatus: restoredStatus,
      actorUserId: params.authUserId,
      reason: 'Booking reopened',
      metadataJson: {
        note: params.body.note ?? null,
        source: 'api-runtime',
      },
      requestId: params.requestId,
      occurredAt: now,
    });

    const response = mapSeedBookingRow(store.tables, booking, participantRowsByBooking);
    recordSeedLifecycleBookingIdempotency({
      tables: store.tables,
      authUserId: params.authUserId,
      endpointKey,
      idempotencyKey: params.body.idempotencyKey,
      requestHash,
      response,
      now,
    });

    return response;
  }
}

export async function resolveCreateBookingIdempotency(params: {
  authUserId: string;
  body: CreateBookingRequest;
}): Promise<{ responseStatus: number; response: BookingResponse } | null> {
  if (!params.body.idempotencyKey) {
    return null;
  }

  if (getApiDataBackend() !== 'db' || shouldUseDbFixtureFallback()) {
    const tables =
      getApiDataBackend() === 'db' ? getDbFixtureStore().tables : getMarketplaceSeedStore().tables;
    const response = findSeedCreateBookingIdempotency({
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
        endpointKey: BOOKING_CREATE_ENDPOINT_KEY,
        idempotencyKey: params.body.idempotencyKey,
      },
    },
  });
  if (!entry) {
    return null;
  }

  const requestHash = hashCreateBookingRequest(params.body);
  if (entry.requestHash !== requestHash) {
    throw conflict('Idempotency key was already used with a different booking payload');
  }

  const response = parseIdempotentBookingResponse(entry.responseBodyJson);
  if (!response) {
    throw conflict('Stored idempotency response is no longer valid');
  }

  return { responseStatus: entry.responseStatus, response };
}

async function resolveLifecycleBookingIdempotency(params: {
  authUserId: string;
  bookingId: string;
  action: 'cancel' | 'reopen';
  body: CancelBookingRequest | ReopenBookingRequest;
}): Promise<{ responseStatus: number; response: BookingResponse } | null> {
  if (!params.body.idempotencyKey) {
    return null;
  }

  const endpointKey = bookingLifecycleEndpointKey(params.bookingId, params.action);
  const requestHash = hashBookingLifecycleRequest({
    bookingId: params.bookingId,
    body: params.body,
  });

  if (getApiDataBackend() !== 'db' || shouldUseDbFixtureFallback()) {
    const tables =
      getApiDataBackend() === 'db' ? getDbFixtureStore().tables : getMarketplaceSeedStore().tables;
    const response = findSeedLifecycleBookingIdempotency({
      tables,
      authUserId: params.authUserId,
      endpointKey,
      idempotencyKey: params.body.idempotencyKey,
      requestHash,
    });
    return response ? { responseStatus: 200, response } : null;
  }

  const prisma = getPrismaClientOrThrow();
  const entry = await prisma.idempotencyKey.findUnique({
    where: {
      userId_endpointKey_idempotencyKey: {
        userId: params.authUserId,
        endpointKey,
        idempotencyKey: params.body.idempotencyKey,
      },
    },
  });
  if (!entry) {
    return null;
  }

  if (entry.requestHash !== requestHash) {
    throw conflict('Idempotency key was already used with a different booking payload');
  }

  const response = parseIdempotentBookingResponse(entry.responseBodyJson);
  if (!response) {
    throw conflict('Stored idempotency response is no longer valid');
  }

  return { responseStatus: entry.responseStatus, response };
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

    const normalizedBookings = normalizeForJson(bookings) as Record<string, unknown>[];
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

  async getVisibleBookingById(params: GetBookingParams): Promise<BookingResponse> {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return getVisibleSeedBookingById(store.tables, params.authUserId, params.bookingId);
    }

    const prisma = getPrismaClientOrThrow();
    const booking = await prisma.booking.findUnique({
      where: { id: params.bookingId },
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
    });

    if (!booking) {
      throw notFound('Booking not found', { bookingId: params.bookingId });
    }

    const hasAccess =
      booking.coachUserId === params.authUserId ||
      booking.bookedByUserId === params.authUserId ||
      booking.participants.some(
        (participant) =>
          participant.guardianUserId === params.authUserId ||
          participant.athlete.userId === params.authUserId,
      );
    if (!hasAccess) {
      throw forbidden('Booking does not belong to authenticated user');
    }

    return normalizeForJson(
      bookingResponseSchema.parse({
        id: booking.id,
        coachUserId: booking.coachUserId,
        bookedByUserId: booking.bookedByUserId ?? undefined,
        status: booking.status,
        scheduledAt: booking.scheduledAt.toISOString(),
        durationMinutes: booking.durationMinutes,
        location: booking.location,
        serviceType: booking.serviceType ?? undefined,
        sessionTemplateId: null,
        objectives: booking.objectives
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((objective) => objective.objective),
        notes: booking.notes ?? null,
        priceMinor: booking.priceMinor ?? null,
        currency: booking.currency,
        participants: booking.participants.map((participant) => ({
          athleteId: participant.athleteId,
          guardianUserId: participant.guardianUserId ?? undefined,
          status: participant.status as 'confirmed' | 'pending' | 'cancelled',
        })),
        version: Number(booking.version),
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt.toISOString(),
        cancelledAt: booking.cancelledAt?.toISOString() ?? null,
      }),
    );
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
    const idempotentResponse = await resolveCreateBookingIdempotency({
      authUserId: params.authUserId,
      body: params.body,
    });
    if (idempotentResponse) {
      return idempotentResponse.response;
    }

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

      throw forbidden('Authenticated user cannot create bookings for this athlete', {
        athleteId,
      });
    }
    const guardianByAthlete = new Map(
      guardianLinks.map((row) => [row.athleteId, row.guardianUserId]),
    );

    const participantRows = body.athleteIds.map((athleteId) => ({
      id: newId('bkp'),
      bookingId,
      athleteId,
      guardianUserId: guardianByAthlete.get(athleteId) ?? body.bookedByUserId,
      status: 'confirmed',
      createdByUserId: params.authUserId,
      updatedByUserId: params.authUserId,
    }));

    const result = participantRows.map((participant) => ({
      athleteId: participant.athleteId,
      guardianUserId: participant.guardianUserId ?? undefined,
      status: participant.status as 'confirmed',
    }));

    const response = bookingResponseSchema.parse({
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
    });

    try {
      await prisma.$transaction(async (tx) => {
        await tx.booking.create({
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

        if (participantRows.length > 0) {
          await tx.bookingParticipant.createMany({
            data: participantRows,
          });
        }

        if (body.objectives.length > 0) {
          await tx.bookingObjective.createMany({
            data: body.objectives.map((objective, index) => ({
              id: newId('boj'),
              bookingId,
              objective,
              sortOrder: index + 1,
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
            reason: 'Created via API booking endpoint.',
            metadataJson: {
              source: 'api-db-runtime',
            },
            requestId: params.requestId,
            occurredAt: now,
          },
        });

        if (body.idempotencyKey) {
          await tx.idempotencyKey.create({
            data: {
              id: newId('idk'),
              userId: params.authUserId,
              endpointKey: BOOKING_CREATE_ENDPOINT_KEY,
              idempotencyKey: body.idempotencyKey,
              requestHash: hashCreateBookingRequest(body),
              responseStatus: 201,
              responseBodyJson: response as never,
              expiresAt: new Date(now.getTime() + IDEMPOTENCY_TTL_MS),
            },
          });
        }
      });
    } catch (error) {
      if (body.idempotencyKey && isCreateBookingIdempotencyRace(error)) {
        const replay = await resolveCreateBookingIdempotency({
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

  async cancelBooking(params: CancelBookingParams): Promise<BookingResponse> {
    if (shouldUseDbFixtureFallback()) {
      const seedRepository = new SeedBookingRepository();
      return seedRepository.cancelBooking({
        ...params,
        requestId: params.requestId,
        authUserId: params.authUserId,
        body: params.body,
      });
    }

    const prisma = getPrismaClientOrThrow();
    const idempotentResponse = await resolveLifecycleBookingIdempotency({
      authUserId: params.authUserId,
      bookingId: params.bookingId,
      action: 'cancel',
      body: params.body,
    });
    if (idempotentResponse) {
      return idempotentResponse.response;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.bookingId },
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
    });

    if (!booking) {
      throw notFound('Booking not found', { bookingId: params.bookingId });
    }

    const hasAccess =
      booking.coachUserId === params.authUserId ||
      booking.bookedByUserId === params.authUserId ||
      booking.participants.some(
        (participant) =>
          participant.guardianUserId === params.authUserId ||
          participant.athlete.userId === params.authUserId,
      );
    if (!hasAccess) {
      throw forbidden('Booking does not belong to authenticated user');
    }

    assertExpectedBookingVersion(Number(booking.version), params.body.expectedVersion);

    if (booking.status === 'CANCELLED') {
      return normalizeForJson(
        bookingResponseSchema.parse({
          id: booking.id,
          coachUserId: booking.coachUserId,
          bookedByUserId: booking.bookedByUserId ?? undefined,
          status: booking.status,
          scheduledAt: booking.scheduledAt.toISOString(),
          durationMinutes: booking.durationMinutes,
          location: booking.location,
          serviceType: booking.serviceType ?? undefined,
          sessionTemplateId: null,
          objectives: booking.objectives
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((objective) => objective.objective),
          notes: booking.notes ?? null,
          priceMinor: booking.priceMinor ?? null,
          currency: booking.currency,
          participants: booking.participants.map((participant) => ({
            athleteId: participant.athleteId,
            guardianUserId: participant.guardianUserId ?? undefined,
            status: participant.status as 'confirmed' | 'pending' | 'cancelled',
          })),
          version: Number(booking.version),
          createdAt: booking.createdAt.toISOString(),
          updatedAt: booking.updatedAt.toISOString(),
          cancelledAt: booking.cancelledAt?.toISOString() ?? null,
        }),
      );
    }

    if (booking.status === 'COMPLETED') {
      throw badRequest('Completed bookings cannot be cancelled');
    }
    if (booking.scheduledAt.getTime() <= Date.now()) {
      throw badRequest('Only upcoming bookings can be cancelled');
    }

    const now = new Date();
    const endpointKey = bookingLifecycleEndpointKey(params.bookingId, 'cancel');
    const requestHash = hashBookingLifecycleRequest({
      bookingId: params.bookingId,
      body: params.body,
    });

    try {
      const response = await prisma.$transaction(async (tx) => {
        const updateResult = await tx.booking.updateMany({
          where: { id: params.bookingId, version: booking.version },
          data: {
            status: 'CANCELLED',
            cancelledByUserId: params.authUserId,
            cancelledAt: now,
            cancelReason: params.body.reason,
            updatedByUserId: params.authUserId,
            version: {
              increment: 1,
            },
          },
        });
        if (updateResult.count !== 1) {
          throw conflict('Booking version changed since it was loaded', {
            currentVersion: Number(booking.version),
          });
        }

        const updated = await tx.booking.findUniqueOrThrow({
          where: { id: params.bookingId },
        });

        await tx.bookingStatusEvent.create({
          data: {
            id: newId('bse'),
            bookingId: params.bookingId,
            fromStatus: booking.status,
            toStatus: 'CANCELLED',
            actorUserId: params.authUserId,
            reason: params.body.reason,
            metadataJson: {
              note: params.body.note ?? null,
              source: 'api-db-runtime',
            },
            requestId: params.requestId,
            occurredAt: now,
          },
        });

        const nextResponse = bookingResponseSchema.parse({
          id: updated.id,
          coachUserId: updated.coachUserId,
          bookedByUserId: updated.bookedByUserId ?? undefined,
          status: updated.status,
          scheduledAt: updated.scheduledAt.toISOString(),
          durationMinutes: updated.durationMinutes,
          location: updated.location,
          serviceType: updated.serviceType ?? undefined,
          sessionTemplateId: null,
          objectives: booking.objectives
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((objective) => objective.objective),
          notes: updated.notes ?? null,
          priceMinor: updated.priceMinor ?? null,
          currency: updated.currency,
          participants: booking.participants.map((participant) => ({
            athleteId: participant.athleteId,
            guardianUserId: participant.guardianUserId ?? undefined,
            status: participant.status as 'confirmed' | 'pending' | 'cancelled',
          })),
          version: Number(updated.version),
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
          cancelledAt: updated.cancelledAt?.toISOString() ?? null,
        });

        if (params.body.idempotencyKey) {
          await tx.idempotencyKey.create({
            data: {
              id: newId('idk'),
              userId: params.authUserId,
              endpointKey,
              idempotencyKey: params.body.idempotencyKey,
              requestHash,
              responseStatus: 200,
              responseBodyJson: nextResponse as never,
              expiresAt: new Date(now.getTime() + IDEMPOTENCY_TTL_MS),
            },
          });
        }

        return nextResponse;
      });

      return normalizeForJson(response);
    } catch (error) {
      if (params.body.idempotencyKey && isCreateBookingIdempotencyRace(error)) {
        const replay = await resolveLifecycleBookingIdempotency({
          authUserId: params.authUserId,
          bookingId: params.bookingId,
          action: 'cancel',
          body: params.body,
        });
        if (replay) {
          return replay.response;
        }
      }
      throw error;
    }
  }

  async reopenBooking(params: ReopenBookingParams): Promise<BookingResponse> {
    if (shouldUseDbFixtureFallback()) {
      const seedRepository = new SeedBookingRepository();
      return seedRepository.reopenBooking({
        ...params,
        requestId: params.requestId,
        authUserId: params.authUserId,
        body: params.body,
      });
    }

    const prisma = getPrismaClientOrThrow();
    const idempotentResponse = await resolveLifecycleBookingIdempotency({
      authUserId: params.authUserId,
      bookingId: params.bookingId,
      action: 'reopen',
      body: params.body,
    });
    if (idempotentResponse) {
      return idempotentResponse.response;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: params.bookingId },
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
    });

    if (!booking) {
      throw notFound('Booking not found', { bookingId: params.bookingId });
    }

    const hasAccess =
      booking.coachUserId === params.authUserId ||
      booking.bookedByUserId === params.authUserId ||
      booking.participants.some(
        (participant) =>
          participant.guardianUserId === params.authUserId ||
          participant.athlete.userId === params.authUserId,
      );
    if (!hasAccess) {
      throw forbidden('Booking does not belong to authenticated user');
    }

    assertExpectedBookingVersion(Number(booking.version), params.body.expectedVersion);

    if (booking.status !== 'CANCELLED') {
      throw badRequest('Only cancelled bookings can be reopened');
    }
    if (booking.scheduledAt.getTime() <= Date.now()) {
      throw badRequest('Only upcoming cancelled bookings can be reopened');
    }

    const latestCancelEvent = await prisma.bookingStatusEvent.findFirst({
      where: {
        bookingId: params.bookingId,
        toStatus: 'CANCELLED',
      },
      orderBy: {
        occurredAt: 'desc',
      },
    });
    const restoredStatus = normalizeReopenStatus(latestCancelEvent?.fromStatus ?? undefined);
    const now = new Date();
    const endpointKey = bookingLifecycleEndpointKey(params.bookingId, 'reopen');
    const requestHash = hashBookingLifecycleRequest({
      bookingId: params.bookingId,
      body: params.body,
    });

    try {
      const response = await prisma.$transaction(async (tx) => {
        const updateResult = await tx.booking.updateMany({
          where: { id: params.bookingId, version: booking.version },
          data: {
            status: restoredStatus,
            cancelledByUserId: null,
            cancelledAt: null,
            cancelReason: null,
            updatedByUserId: params.authUserId,
            version: {
              increment: 1,
            },
          },
        });
        if (updateResult.count !== 1) {
          throw conflict('Booking version changed since it was loaded', {
            currentVersion: Number(booking.version),
          });
        }

        const updated = await tx.booking.findUniqueOrThrow({
          where: { id: params.bookingId },
        });

        await tx.bookingStatusEvent.create({
          data: {
            id: newId('bse'),
            bookingId: params.bookingId,
            fromStatus: 'CANCELLED',
            toStatus: restoredStatus,
            actorUserId: params.authUserId,
            reason: 'Booking reopened',
            metadataJson: {
              note: params.body.note ?? null,
              source: 'api-db-runtime',
            },
            requestId: params.requestId,
            occurredAt: now,
          },
        });

        const nextResponse = bookingResponseSchema.parse({
          id: updated.id,
          coachUserId: updated.coachUserId,
          bookedByUserId: updated.bookedByUserId ?? undefined,
          status: updated.status,
          scheduledAt: updated.scheduledAt.toISOString(),
          durationMinutes: updated.durationMinutes,
          location: updated.location,
          serviceType: updated.serviceType ?? undefined,
          sessionTemplateId: null,
          objectives: booking.objectives
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((objective) => objective.objective),
          notes: updated.notes ?? null,
          priceMinor: updated.priceMinor ?? null,
          currency: updated.currency,
          participants: booking.participants.map((participant) => ({
            athleteId: participant.athleteId,
            guardianUserId: participant.guardianUserId ?? undefined,
            status: participant.status as 'confirmed' | 'pending' | 'cancelled',
          })),
          version: Number(updated.version),
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
          cancelledAt: updated.cancelledAt?.toISOString() ?? null,
        });

        if (params.body.idempotencyKey) {
          await tx.idempotencyKey.create({
            data: {
              id: newId('idk'),
              userId: params.authUserId,
              endpointKey,
              idempotencyKey: params.body.idempotencyKey,
              requestHash,
              responseStatus: 200,
              responseBodyJson: nextResponse as never,
              expiresAt: new Date(now.getTime() + IDEMPOTENCY_TTL_MS),
            },
          });
        }

        return nextResponse;
      });

      return normalizeForJson(response);
    } catch (error) {
      if (params.body.idempotencyKey && isCreateBookingIdempotencyRace(error)) {
        const replay = await resolveLifecycleBookingIdempotency({
          authUserId: params.authUserId,
          bookingId: params.bookingId,
          action: 'reopen',
          body: params.body,
        });
        if (replay) {
          return replay.response;
        }
      }
      throw error;
    }
  }
}

const seedBookingRepository = new SeedBookingRepository();
const dbBookingRepository = new DbBookingRepository();

export function resolveBookingRepository(): BookingRepository {
  return getApiDataBackend() === 'db' ? dbBookingRepository : seedBookingRepository;
}
