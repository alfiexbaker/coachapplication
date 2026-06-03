import crypto from 'node:crypto';
import {
  bookingResponseSchema,
  bookingSeriesListResponseSchema,
  bookingSeriesResponseSchema,
  cancelBookingSeriesResponseSchema,
  createBookingSeriesResponseSchema,
  pauseBookingSeriesResponseSchema,
  resumeBookingSeriesResponseSchema,
  updateBookingSeriesResponseSchema,
  type BookingResponse,
  type BookingSeriesListResponse,
  type BookingSeriesResponse,
  type CancelBookingSeriesRequest,
  type CancelBookingSeriesResponse,
  type CreateBookingRequest,
  type CreateBookingSeriesRequest,
  type CreateBookingSeriesResponse,
  type PauseBookingSeriesRequest,
  type PauseBookingSeriesResponse,
  type ResumeBookingSeriesRequest,
  type ResumeBookingSeriesResponse,
  type UpdateBookingSeriesRequest,
  type UpdateBookingSeriesResponse,
} from '@clubroom/shared-contracts';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { badRequest, conflict, forbidden } from '../../lib/http-errors.js';
import {
  applyBookingCancellationInvoiceEffects,
  applyBookingCancellationInvoiceEffectsInDbTransaction,
  applyBookingInvoiceAdjustments,
  applyBookingInvoiceAdjustmentsInDbTransaction,
} from '../../lib/invoice-runtime.js';
import { normalizeForJson } from './normalize.js';
import { createBookingInSeedTables, type SeedRow, type SeedTables } from './booking-repository.js';
const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;
const isoNow = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const BOOKING_SERIES_CREATE_ENDPOINT_KEY = 'POST:/v1/booking-series';
type BookingSeriesLifecycleAction = 'cancel' | 'pause' | 'resume' | 'update';
type BookingSeriesLifecycleRequest =
  | CancelBookingSeriesRequest
  | PauseBookingSeriesRequest
  | ResumeBookingSeriesRequest
  | UpdateBookingSeriesRequest;
type BookingSeriesLifecycleResponse =
  | CancelBookingSeriesResponse
  | PauseBookingSeriesResponse
  | ResumeBookingSeriesResponse
  | UpdateBookingSeriesResponse;
const bookingSeriesLifecycleEndpointKey = (
  seriesId: string,
  action: BookingSeriesLifecycleAction,
) => `POST:/v1/booking-series/${seriesId}/${action}`;
const IDEMPOTENCY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export interface CreateBookingSeriesParams {
  authUserId: string;
  requestId: string;
  body: CreateBookingSeriesRequest;
}
export interface ListBookingSeriesParams {
  authUserId: string;
}
export interface GetBookingSeriesParams {
  authUserId: string;
  seriesId: string;
}
export interface CancelBookingSeriesParams {
  authUserId: string;
  requestId: string;
  seriesId: string;
  body: CancelBookingSeriesRequest;
}
export interface PauseBookingSeriesParams {
  authUserId: string;
  requestId: string;
  seriesId: string;
  body: PauseBookingSeriesRequest;
}
export interface ResumeBookingSeriesParams {
  authUserId: string;
  requestId: string;
  seriesId: string;
  body: ResumeBookingSeriesRequest;
}
export interface UpdateBookingSeriesParams {
  authUserId: string;
  requestId: string;
  seriesId: string;
  body: UpdateBookingSeriesRequest;
}
export interface BookingSeriesRepository {
  listVisibleBookingSeries(params: ListBookingSeriesParams): Promise<BookingSeriesListResponse>;
  getVisibleBookingSeriesById(params: GetBookingSeriesParams): Promise<BookingSeriesResponse>;
  createBookingSeries(params: CreateBookingSeriesParams): Promise<CreateBookingSeriesResponse>;
  cancelBookingSeries(params: CancelBookingSeriesParams): Promise<CancelBookingSeriesResponse>;
  pauseBookingSeries(params: PauseBookingSeriesParams): Promise<PauseBookingSeriesResponse>;
  resumeBookingSeries(params: ResumeBookingSeriesParams): Promise<ResumeBookingSeriesResponse>;
  updateBookingSeries(params: UpdateBookingSeriesParams): Promise<UpdateBookingSeriesResponse>;
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
function hashBookingSeriesLifecycleRequest(params: {
  seriesId: string;
  body: BookingSeriesLifecycleRequest;
}): string {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify(
        canonicalizeJson({
          seriesId: params.seriesId,
          body: params.body,
        }),
      ),
    )
    .digest('hex');
}
function assertMatchingIdempotencyRequest(entry: SeedRow, requestHash: string): void {
  if (asString(entry.requestHash) !== requestHash) {
    throw conflict('Idempotency key was already used with a different booking series payload');
  }
}
function parseIdempotentBookingSeriesResponse(value: unknown): CreateBookingSeriesResponse | null {
  const parsed = createBookingSeriesResponseSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
function parseIdempotentCancelBookingSeriesResponse(
  value: unknown,
): CancelBookingSeriesResponse | null {
  const parsed = cancelBookingSeriesResponseSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
function parseIdempotentPauseBookingSeriesResponse(
  value: unknown,
): PauseBookingSeriesResponse | null {
  const parsed = pauseBookingSeriesResponseSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
function parseIdempotentResumeBookingSeriesResponse(
  value: unknown,
): ResumeBookingSeriesResponse | null {
  const parsed = resumeBookingSeriesResponseSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
function parseIdempotentUpdateBookingSeriesResponse(
  value: unknown,
): UpdateBookingSeriesResponse | null {
  const parsed = updateBookingSeriesResponseSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
function assertExpectedSeriesVersion(currentVersion: number, expectedVersion?: number): void {
  if (expectedVersion === undefined) {
    return;
  }
  if (currentVersion !== expectedVersion) {
    throw conflict('Booking series version changed since it was loaded', {
      currentVersion,
      expectedVersion,
    });
  }
}
function getMutableRows(tables: SeedTables, key: string): SeedRow[] {
  if (!Array.isArray(tables[key])) {
    tables[key] = [];
  }
  return tables[key];
}
function getAthleteUserIdsByAthleteId(tables: SeedTables): Map<string, string | undefined> {
  const athletes = asRows(tables.athletes);
  return new Map(
    athletes.flatMap((item) => {
      const mapped = ((row) => [asString(row.id), asString(row.userId)] as const)(item);
      return ((item) =>
        (([id]) => Boolean(id))(item) ? [(([id, userId]) => [id as string, userId])(item)] : [])(
        mapped,
      );
    }),
  );
}
function getParticipantRowsByBooking(tables: SeedTables): Map<string, SeedRow[]> {
  const participantRowsByBooking = new Map<string, SeedRow[]>();
  for (const participant of asRows(tables.bookingParticipants)) {
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
    .sort((left, right) => (asNumber(left.sortOrder) ?? 0) - (asNumber(right.sortOrder) ?? 0))
    .flatMap((objective) => {
      const mapped = asString(objective.objective);
      return mapped ? [mapped] : [];
    });
}
function canUserAccessSeedSeriesBooking(
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
    participants: (participantRowsByBooking.get(bookingId) ?? []).map((participant) => ({
      athleteId: asString(participant.athleteId) ?? '',
      guardianUserId: asString(participant.guardianUserId),
      status: (asString(participant.status) ?? 'pending').toLowerCase(),
    })),
    version: asNumber(booking.version) ?? 1,
    createdAt: asString(booking.createdAt) ?? isoNow(),
    updatedAt: asString(booking.updatedAt) ?? isoNow(),
    cancelledAt: asString(booking.cancelledAt) ?? null,
  });
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
function findSeedCancelBookingSeriesIdempotency(params: {
  tables: SeedTables;
  authUserId: string;
  endpointKey: string;
  idempotencyKey?: string;
  requestHash: string;
}): CancelBookingSeriesResponse | null {
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
  return parseIdempotentCancelBookingSeriesResponse(entry.responseBodyJson);
}
function findSeedPauseBookingSeriesIdempotency(params: {
  tables: SeedTables;
  authUserId: string;
  endpointKey: string;
  idempotencyKey?: string;
  requestHash: string;
}): PauseBookingSeriesResponse | null {
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
  return parseIdempotentPauseBookingSeriesResponse(entry.responseBodyJson);
}
function findSeedResumeBookingSeriesIdempotency(params: {
  tables: SeedTables;
  authUserId: string;
  endpointKey: string;
  idempotencyKey?: string;
  requestHash: string;
}): ResumeBookingSeriesResponse | null {
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
  return parseIdempotentResumeBookingSeriesResponse(entry.responseBodyJson);
}
function findSeedUpdateBookingSeriesIdempotency(params: {
  tables: SeedTables;
  authUserId: string;
  endpointKey: string;
  idempotencyKey?: string;
  requestHash: string;
}): UpdateBookingSeriesResponse | null {
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
  return parseIdempotentUpdateBookingSeriesResponse(entry.responseBodyJson);
}
function recordSeedCancelBookingSeriesIdempotency(params: {
  tables: SeedTables;
  authUserId: string;
  endpointKey: string;
  idempotencyKey?: string;
  requestHash: string;
  response: CancelBookingSeriesResponse;
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
function recordSeedBookingSeriesLifecycleIdempotency(params: {
  tables: SeedTables;
  authUserId: string;
  endpointKey: string;
  idempotencyKey?: string;
  requestHash: string;
  response: BookingSeriesLifecycleResponse;
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
function isBookingSeriesIdempotencyRace(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const prismaError = error as {
    code?: unknown;
    meta?: {
      target?: unknown;
    };
  };
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
function getSeedBookingsForSeries(tables: SeedTables, seriesId: string): SeedRow[] {
  return asRows(tables.bookings)
    .filter((booking) => asString(booking.recurringSeriesId) === seriesId)
    .sort((left, right) => {
      const leftIndex = asNumber(left.seriesIndex);
      const rightIndex = asNumber(right.seriesIndex);
      if (typeof leftIndex === 'number' && typeof rightIndex === 'number') {
        return leftIndex - rightIndex;
      }
      return (
        Date.parse(asString(left.scheduledAt) ?? '') - Date.parse(asString(right.scheduledAt) ?? '')
      );
    });
}
function getSeriesStatusFromBookings(bookings: BookingResponse[]): BookingSeriesResponse['status'] {
  if (bookings.length === 0) {
    return 'ACTIVE';
  }
  const cancelledCount = bookings.filter((booking) => booking.status === 'CANCELLED').length;
  const completedCount = bookings.filter((booking) => booking.status === 'COMPLETED').length;
  if (cancelledCount === bookings.length) {
    return 'CANCELLED';
  }
  if (completedCount === bookings.length) {
    return 'COMPLETED';
  }
  if (cancelledCount > 0 || completedCount > 0) {
    return 'PARTIAL';
  }
  return 'ACTIVE';
}
function getSeriesResponseStatus(params: {
  storedStatus?: string;
  bookings: BookingResponse[];
}): BookingSeriesResponse['status'] {
  if (params.storedStatus === 'PAUSED') {
    return 'PAUSED';
  }
  return getSeriesStatusFromBookings(params.bookings);
}
function assertSeriesCanPause(status: BookingSeriesResponse['status']): void {
  if (status === 'ACTIVE' || status === 'PARTIAL') {
    return;
  }
  throw conflict(`Cannot pause a booking series that is ${status.toLowerCase()}`, {
    status,
  });
}
function assertSeriesCanResume(status: BookingSeriesResponse['status']): void {
  if (status === 'PAUSED') {
    return;
  }
  throw conflict(`Cannot resume a booking series that is ${status.toLowerCase()}`, {
    status,
  });
}
function assertSeriesCanUpdate(status: BookingSeriesResponse['status']): void {
  if (status === 'ACTIVE' || status === 'PARTIAL' || status === 'PAUSED') {
    return;
  }
  throw conflict(`Cannot update a booking series that is ${status.toLowerCase()}`, {
    status,
  });
}
function applyTimeToDate(dateValue: string, timeLocal: string): string {
  const [hoursValue, minutesValue] = timeLocal.split(':').map(Number);
  const date = new Date(dateValue);
  if (
    Number.isNaN(date.getTime()) ||
    !Number.isInteger(hoursValue) ||
    !Number.isInteger(minutesValue) ||
    hoursValue < 0 ||
    hoursValue > 23 ||
    minutesValue < 0 ||
    minutesValue > 59
  ) {
    throw badRequest('Booking series update has an invalid time value', {
      time: timeLocal,
    });
  }
  date.setUTCHours(hoursValue, minutesValue, 0, 0);
  return date.toISOString();
}
function getMutableSeedBookingsForSeriesUpdate(params: {
  linkedBookings: SeedRow[];
  nowMs: number;
}): SeedRow[] {
  return params.linkedBookings.filter((booking) => {
    const status = asString(booking.status)?.toUpperCase();
    const scheduledAtMs = Date.parse(asString(booking.scheduledAt) ?? '');
    return (
      status !== 'CANCELLED' &&
      status !== 'COMPLETED' &&
      Number.isFinite(scheduledAtMs) &&
      scheduledAtMs > params.nowMs
    );
  });
}
function assertSeedInvoicesAdjustableForBookingUpdate(
  tables: SeedTables,
  bookingIds: string[],
): void {
  const invoice = asRows(tables.invoices).find(
    (row) =>
      !asString(row.deletedAt) &&
      bookingIds.includes(asString(row.bookingId) ?? '') &&
      !['DRAFT', 'SENT'].includes(asString(row.status)?.toUpperCase() ?? ''),
  );
  if (invoice) {
    throw badRequest(
      'Booking series updates require explicit invoice adjustment for settled invoices',
      {
        bookingId: asString(invoice.bookingId),
        invoiceId: asString(invoice.id),
        invoiceStatus: asString(invoice.status),
      },
    );
  }
}
function getUpdatedSeriesEndDate(params: {
  body: UpdateBookingSeriesRequest;
  bookings: BookingResponse[];
}): string {
  const lastScheduledAt = params.bookings[params.bookings.length - 1]?.scheduledAt;
  if (!params.body.endDate) {
    return lastScheduledAt ?? isoNow();
  }
  const endDateMs = Date.parse(params.body.endDate);
  const lastMs = Date.parse(lastScheduledAt ?? '');
  if (!Number.isFinite(endDateMs)) {
    throw badRequest('Booking series update has an invalid endDate value');
  }
  if (Number.isFinite(lastMs) && endDateMs < lastMs) {
    throw badRequest('Booking series endDate cannot exclude existing linked bookings', {
      endDate: params.body.endDate,
      lastScheduledAt,
    });
  }
  return new Date(endDateMs).toISOString();
}
function mapSeedBookingSeriesRow(params: {
  tables: SeedTables;
  series: SeedRow;
  bookings?: SeedRow[];
}): BookingSeriesResponse {
  const participantRowsByBooking = getParticipantRowsByBooking(params.tables);
  const linkedBookingRows =
    params.bookings ?? getSeedBookingsForSeries(params.tables, asString(params.series.id) ?? '');
  const bookings = linkedBookingRows.map((booking) =>
    mapSeedBookingRow(params.tables, booking, participantRowsByBooking),
  );
  const firstBooking = bookings[0];
  const lastBooking = bookings[bookings.length - 1];
  const athleteIds = Array.from(
    new Set(
      bookings.flatMap((booking) =>
        booking.participants.map((participant) => participant.athleteId),
      ),
    ),
  );
  const fallbackAthleteId = asString(params.series.athleteId);
  if (athleteIds.length === 0 && fallbackAthleteId) {
    athleteIds.push(fallbackAthleteId);
  }
  const priceValues = bookings.flatMap((booking) => {
    const mapped = booking.priceMinor;
    return typeof mapped === 'number' ? [mapped] : [];
  });
  const scheduledDates = bookings.map((booking) => booking.scheduledAt);
  return bookingSeriesResponseSchema.parse({
    id: asString(params.series.id),
    coachUserId: asString(params.series.coachUserId),
    bookedByUserId: asString(params.series.bookedByUserId),
    athleteIds,
    frequency: asString(params.series.frequency) ?? 'CUSTOM',
    patternLabel: asString(params.series.notes) ?? null,
    status: getSeriesResponseStatus({
      storedStatus: asString(params.series.status),
      bookings,
    }),
    startDate: firstBooking?.scheduledAt ?? asString(params.series.startDate),
    endDate:
      asString(params.series.endDate) ??
      lastBooking?.scheduledAt ??
      asString(params.series.startDate),
    bookingIds: bookings.map((booking) => booking.id),
    scheduledDates,
    durationMinutes: firstBooking?.durationMinutes ?? null,
    location: firstBooking?.location ?? null,
    serviceType: firstBooking?.serviceType ?? null,
    objectives: firstBooking?.objectives ?? [],
    priceMinor: firstBooking?.priceMinor ?? null,
    totalPriceMinor:
      priceValues.length > 0 ? priceValues.reduce((sum, price) => sum + price, 0) : null,
    currency: firstBooking?.currency ?? 'GBP',
    version: asNumber(params.series.version) ?? 1,
    createdAt: asString(params.series.createdAt) ?? isoNow(),
    updatedAt: asString(params.series.updatedAt) ?? isoNow(),
  });
}
function canUserAccessSeedSeries(params: {
  tables: SeedTables;
  series: SeedRow;
  authUserId: string;
  linkedBookings?: SeedRow[];
}): boolean {
  if (
    asString(params.series.coachUserId) === params.authUserId ||
    asString(params.series.bookedByUserId) === params.authUserId
  ) {
    return true;
  }
  const athleteId = asString(params.series.athleteId);
  if (athleteId) {
    const athleteUserId = getAthleteUserIdsByAthleteId(params.tables).get(athleteId);
    if (athleteUserId === params.authUserId) {
      return true;
    }
    if (
      asRows(params.tables.guardianChildLinks).some(
        (link) =>
          asString(link.athleteId) === athleteId &&
          asString(link.guardianUserId) === params.authUserId,
      )
    ) {
      return true;
    }
  }
  const participantRowsByBooking = getParticipantRowsByBooking(params.tables);
  const athleteUserIdsByAthleteId = getAthleteUserIdsByAthleteId(params.tables);
  return (
    params.linkedBookings ??
    getSeedBookingsForSeries(params.tables, asString(params.series.id) ?? '')
  ).some((booking) =>
    canUserAccessSeedSeriesBooking(
      params.tables,
      booking,
      params.authUserId,
      participantRowsByBooking,
      athleteUserIdsByAthleteId,
    ),
  );
}
function getVisibleSeedBookingSeriesById(params: {
  tables: SeedTables;
  authUserId: string;
  seriesId: string;
}): BookingSeriesResponse {
  const series = asRows(params.tables.recurringSeries).find(
    (row) => asString(row.id) === params.seriesId && !asString(row.deletedAt),
  );
  if (!series) {
    throw badRequest('Booking series not found', {
      seriesId: params.seriesId,
    });
  }
  const linkedBookings = getSeedBookingsForSeries(params.tables, params.seriesId);
  if (
    !canUserAccessSeedSeries({
      ...params,
      series,
      linkedBookings,
    })
  ) {
    throw forbidden('Booking series does not belong to authenticated user');
  }
  return mapSeedBookingSeriesRow({
    tables: params.tables,
    series,
    bookings: linkedBookings,
  });
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
  const [guardianLinks, athleteRows] = await Promise.all([
    prisma.guardianChildLink.findMany({
      where: {
        athleteId: {
          in: params.body.athleteIds,
        },
      },
    }),
    prisma.athlete.findMany({
      where: {
        id: {
          in: params.body.athleteIds,
        },
      },
      select: {
        id: true,
        userId: true,
      },
    }),
  ]);
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
      ? {
          sessionTemplateId: params.body.sessionTemplateId,
        }
      : {}),
    objectives: params.body.objectives,
    ...(params.body.notes
      ? {
          notes: params.body.notes,
        }
      : {}),
    ...(typeof params.body.priceMinor === 'number'
      ? {
          priceMinor: params.body.priceMinor,
        }
      : {}),
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
      scheduledDates: params.bookings.map((booking) => booking.scheduledAt),
      durationMinutes: params.bookings[0]?.durationMinutes ?? null,
      location: params.bookings[0]?.location ?? null,
      serviceType: params.body.serviceType,
      objectives: params.body.objectives,
      priceMinor: params.body.priceMinor ?? null,
      totalPriceMinor:
        typeof params.body.priceMinor === 'number'
          ? params.body.priceMinor * params.bookings.length
          : null,
      currency: params.body.currency,
      version: 1,
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
  async listVisibleBookingSeries(
    params: ListBookingSeriesParams,
  ): Promise<BookingSeriesListResponse> {
    const store = this.loadStore();
    const visibleSeries = asRows(store.tables.recurringSeries)
      .flatMap((series) => {
        if (!!asString(series.deletedAt)) return [];
        return canUserAccessSeedSeries({
          tables: store.tables,
          series,
          authUserId: params.authUserId,
        })
          ? [
              mapSeedBookingSeriesRow({
                tables: store.tables,
                series,
              }),
            ]
          : [];
      })
      .sort((left, right) => Date.parse(left.startDate) - Date.parse(right.startDate));
    return bookingSeriesListResponseSchema.parse({
      series: visibleSeries,
      total: visibleSeries.length,
      seedVersion: store.version,
      requestId: 'seed',
    });
  }
  async getVisibleBookingSeriesById(
    params: GetBookingSeriesParams,
  ): Promise<BookingSeriesResponse> {
    const store = this.loadStore();
    return getVisibleSeedBookingSeriesById({
      tables: store.tables,
      authUserId: params.authUserId,
      seriesId: params.seriesId,
    });
  }
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
  async cancelBookingSeries(
    params: CancelBookingSeriesParams,
  ): Promise<CancelBookingSeriesResponse> {
    const store = this.loadStore();
    const seriesRows = asRows(store.tables.recurringSeries);
    const bookings = asRows(store.tables.bookings);
    const statusEvents = getMutableRows(store.tables, 'bookingStatusEvents');
    const series = seriesRows.find(
      (row) => asString(row.id) === params.seriesId && !asString(row.deletedAt),
    );
    if (!series) {
      throw badRequest('Booking series not found', {
        seriesId: params.seriesId,
      });
    }
    const linkedBookings = getSeedBookingsForSeries(store.tables, params.seriesId);
    if (
      !canUserAccessSeedSeries({
        tables: store.tables,
        series,
        authUserId: params.authUserId,
        linkedBookings,
      })
    ) {
      throw forbidden('Booking series does not belong to authenticated user');
    }
    const endpointKey = bookingSeriesLifecycleEndpointKey(params.seriesId, 'cancel');
    const requestHash = hashBookingSeriesLifecycleRequest({
      seriesId: params.seriesId,
      body: params.body,
    });
    const idempotentResponse = findSeedCancelBookingSeriesIdempotency({
      tables: store.tables,
      authUserId: params.authUserId,
      endpointKey,
      idempotencyKey: params.body.idempotencyKey,
      requestHash,
    });
    if (idempotentResponse) {
      return idempotentResponse;
    }
    assertExpectedSeriesVersion(asNumber(series.version) ?? 1, params.body.expectedVersion);
    const now = isoNow();
    const nowMs = Date.parse(now);
    const cancelReason = params.body.reason;
    const cancellableBookings = linkedBookings.filter((booking) => {
      const currentStatus = asString(booking.status)?.toUpperCase();
      const scheduledAtMs = Date.parse(asString(booking.scheduledAt) ?? '');
      return !(
        currentStatus === 'CANCELLED' ||
        currentStatus === 'COMPLETED' ||
        !Number.isFinite(scheduledAtMs) ||
        scheduledAtMs <= nowMs
      );
    });
    await Promise.all(
      cancellableBookings.map((booking) =>
        applyBookingCancellationInvoiceEffects({
          bookingId: asString(booking.id) ?? '',
          actorUserId: params.authUserId,
          reason: cancelReason,
          requestId: params.requestId,
        }),
      ),
    );
    for (const booking of cancellableBookings) {
      const currentStatus = asString(booking.status)?.toUpperCase();
      booking.status = 'CANCELLED';
      booking.cancelledByUserId = params.authUserId;
      booking.cancelledAt = now;
      booking.cancelReason = cancelReason;
      booking.updatedByUserId = params.authUserId;
      booking.updatedAt = now;
      booking.version = (asNumber(booking.version) ?? 1) + 1;
      statusEvents.push({
        id: newId('bse'),
        bookingId: asString(booking.id) ?? '',
        fromStatus: currentStatus,
        toStatus: 'CANCELLED',
        actorUserId: params.authUserId,
        reason: cancelReason,
        metadataJson: {
          note: params.body.note ?? null,
          source: 'api-runtime',
          recurringSeriesId: params.seriesId,
        },
        requestId: params.requestId,
        occurredAt: now,
      });
    }
    const updatedLinkedBookings = bookings.filter(
      (booking) => asString(booking.recurringSeriesId) === params.seriesId,
    );
    const responseBookings = updatedLinkedBookings
      .sort((left, right) => {
        const leftIndex = asNumber(left.seriesIndex);
        const rightIndex = asNumber(right.seriesIndex);
        if (typeof leftIndex === 'number' && typeof rightIndex === 'number') {
          return leftIndex - rightIndex;
        }
        return (
          Date.parse(asString(left.scheduledAt) ?? '') -
          Date.parse(asString(right.scheduledAt) ?? '')
        );
      })
      .map((booking) => mapSeedBookingRow(store.tables, booking));
    series.status = getSeriesStatusFromBookings(responseBookings);
    series.updatedByUserId = params.authUserId;
    series.updatedAt = now;
    series.version = (asNumber(series.version) ?? 1) + 1;
    const response = cancelBookingSeriesResponseSchema.parse({
      series: mapSeedBookingSeriesRow({
        tables: store.tables,
        series,
        bookings: updatedLinkedBookings,
      }),
      bookings: responseBookings,
      requestId: params.requestId,
    });
    recordSeedCancelBookingSeriesIdempotency({
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
  async pauseBookingSeries(params: PauseBookingSeriesParams): Promise<PauseBookingSeriesResponse> {
    const store = this.loadStore();
    const series = asRows(store.tables.recurringSeries).find(
      (row) => asString(row.id) === params.seriesId && !asString(row.deletedAt),
    );
    if (!series) {
      throw badRequest('Booking series not found', {
        seriesId: params.seriesId,
      });
    }
    const linkedBookings = getSeedBookingsForSeries(store.tables, params.seriesId);
    if (
      !canUserAccessSeedSeries({
        tables: store.tables,
        series,
        authUserId: params.authUserId,
        linkedBookings,
      })
    ) {
      throw forbidden('Booking series does not belong to authenticated user');
    }
    const endpointKey = bookingSeriesLifecycleEndpointKey(params.seriesId, 'pause');
    const requestHash = hashBookingSeriesLifecycleRequest({
      seriesId: params.seriesId,
      body: params.body,
    });
    const idempotentResponse = findSeedPauseBookingSeriesIdempotency({
      tables: store.tables,
      authUserId: params.authUserId,
      endpointKey,
      idempotencyKey: params.body.idempotencyKey,
      requestHash,
    });
    if (idempotentResponse) {
      return idempotentResponse;
    }
    const responseBookings = linkedBookings.map((booking) =>
      mapSeedBookingRow(store.tables, booking),
    );
    assertExpectedSeriesVersion(asNumber(series.version) ?? 1, params.body.expectedVersion);
    assertSeriesCanPause(
      getSeriesResponseStatus({
        storedStatus: asString(series.status),
        bookings: responseBookings,
      }),
    );
    const now = isoNow();
    series.status = 'PAUSED';
    series.updatedByUserId = params.authUserId;
    series.updatedAt = now;
    series.version = (asNumber(series.version) ?? 1) + 1;
    const response = pauseBookingSeriesResponseSchema.parse({
      series: mapSeedBookingSeriesRow({
        tables: store.tables,
        series,
        bookings: linkedBookings,
      }),
      bookings: responseBookings,
      requestId: params.requestId,
    });
    recordSeedBookingSeriesLifecycleIdempotency({
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
  async resumeBookingSeries(
    params: ResumeBookingSeriesParams,
  ): Promise<ResumeBookingSeriesResponse> {
    const store = this.loadStore();
    const series = asRows(store.tables.recurringSeries).find(
      (row) => asString(row.id) === params.seriesId && !asString(row.deletedAt),
    );
    if (!series) {
      throw badRequest('Booking series not found', {
        seriesId: params.seriesId,
      });
    }
    const linkedBookings = getSeedBookingsForSeries(store.tables, params.seriesId);
    if (
      !canUserAccessSeedSeries({
        tables: store.tables,
        series,
        authUserId: params.authUserId,
        linkedBookings,
      })
    ) {
      throw forbidden('Booking series does not belong to authenticated user');
    }
    const endpointKey = bookingSeriesLifecycleEndpointKey(params.seriesId, 'resume');
    const requestHash = hashBookingSeriesLifecycleRequest({
      seriesId: params.seriesId,
      body: params.body,
    });
    const idempotentResponse = findSeedResumeBookingSeriesIdempotency({
      tables: store.tables,
      authUserId: params.authUserId,
      endpointKey,
      idempotencyKey: params.body.idempotencyKey,
      requestHash,
    });
    if (idempotentResponse) {
      return idempotentResponse;
    }
    const responseBookings = linkedBookings.map((booking) =>
      mapSeedBookingRow(store.tables, booking),
    );
    assertExpectedSeriesVersion(asNumber(series.version) ?? 1, params.body.expectedVersion);
    assertSeriesCanResume(
      getSeriesResponseStatus({
        storedStatus: asString(series.status),
        bookings: responseBookings,
      }),
    );
    const now = isoNow();
    series.status = getSeriesStatusFromBookings(responseBookings);
    series.updatedByUserId = params.authUserId;
    series.updatedAt = now;
    series.version = (asNumber(series.version) ?? 1) + 1;
    const response = resumeBookingSeriesResponseSchema.parse({
      series: mapSeedBookingSeriesRow({
        tables: store.tables,
        series,
        bookings: linkedBookings,
      }),
      bookings: responseBookings,
      requestId: params.requestId,
    });
    recordSeedBookingSeriesLifecycleIdempotency({
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
  async updateBookingSeries(
    params: UpdateBookingSeriesParams,
  ): Promise<UpdateBookingSeriesResponse> {
    const store = this.loadStore();
    const series = asRows(store.tables.recurringSeries).find(
      (row) => asString(row.id) === params.seriesId && !asString(row.deletedAt),
    );
    if (!series) {
      throw badRequest('Booking series not found', {
        seriesId: params.seriesId,
      });
    }
    const linkedBookings = getSeedBookingsForSeries(store.tables, params.seriesId);
    if (
      !canUserAccessSeedSeries({
        tables: store.tables,
        series,
        authUserId: params.authUserId,
        linkedBookings,
      })
    ) {
      throw forbidden('Booking series does not belong to authenticated user');
    }
    const endpointKey = bookingSeriesLifecycleEndpointKey(params.seriesId, 'update');
    const requestHash = hashBookingSeriesLifecycleRequest({
      seriesId: params.seriesId,
      body: params.body,
    });
    const idempotentResponse = findSeedUpdateBookingSeriesIdempotency({
      tables: store.tables,
      authUserId: params.authUserId,
      endpointKey,
      idempotencyKey: params.body.idempotencyKey,
      requestHash,
    });
    if (idempotentResponse) {
      return idempotentResponse;
    }
    const responseBookingsBefore = linkedBookings.map((booking) =>
      mapSeedBookingRow(store.tables, booking),
    );
    assertExpectedSeriesVersion(asNumber(series.version) ?? 1, params.body.expectedVersion);
    assertSeriesCanUpdate(
      getSeriesResponseStatus({
        storedStatus: asString(series.status),
        bookings: responseBookingsBefore,
      }),
    );
    const now = isoNow();
    const mutableBookings = getMutableSeedBookingsForSeriesUpdate({
      linkedBookings,
      nowMs: Date.parse(now),
    });
    if (mutableBookings.length === 0) {
      throw badRequest('Booking series has no future bookings that can be updated', {
        seriesId: params.seriesId,
      });
    }
    const mutableBookingIds = mutableBookings.flatMap((booking) => {
      const mapped = asString(booking.id);
      return mapped ? [mapped] : [];
    });
    assertSeedInvoicesAdjustableForBookingUpdate(store.tables, mutableBookingIds);
    for (const booking of mutableBookings) {
      if (params.body.time) {
        booking.scheduledAt = applyTimeToDate(
          asString(booking.scheduledAt) ?? '',
          params.body.time,
        );
      }
      if (params.body.durationMinutes !== undefined) {
        booking.durationMinutes = params.body.durationMinutes;
      }
      if (params.body.location !== undefined) {
        booking.location = params.body.location;
      }
      if (params.body.notes !== undefined) {
        booking.notes = params.body.notes;
      }
      booking.updatedByUserId = params.authUserId;
      booking.updatedAt = now;
      booking.version = (asNumber(booking.version) ?? 1) + 1;
    }
    await applyBookingInvoiceAdjustments({
      bookingIds: mutableBookingIds,
      actorUserId: params.authUserId,
      reason: 'Linked booking series was updated.',
      requestId: params.requestId,
    });
    if (params.body.time) {
      series.timeLocal = params.body.time;
    }
    if (params.body.notes !== undefined) {
      series.notes = params.body.notes;
    }
    series.updatedByUserId = params.authUserId;
    series.updatedAt = now;
    series.version = (asNumber(series.version) ?? 1) + 1;
    const responseBookings = linkedBookings.map((booking) =>
      mapSeedBookingRow(store.tables, booking),
    );
    if (params.body.endDate) {
      series.endDate = getUpdatedSeriesEndDate({
        body: params.body,
        bookings: responseBookings,
      });
    } else {
      series.endDate =
        responseBookings[responseBookings.length - 1]?.scheduledAt ?? asString(series.endDate);
    }
    const response = updateBookingSeriesResponseSchema.parse({
      series: mapSeedBookingSeriesRow({
        tables: store.tables,
        series,
        bookings: linkedBookings,
      }),
      bookings: responseBookings,
      requestId: params.requestId,
    });
    recordSeedBookingSeriesLifecycleIdempotency({
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
export async function resolveCreateBookingSeriesIdempotency(params: {
  authUserId: string;
  body: CreateBookingSeriesRequest;
}): Promise<{
  responseStatus: number;
  response: CreateBookingSeriesResponse;
} | null> {
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
    return response
      ? {
          responseStatus: 201,
          response,
        }
      : null;
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
  return {
    responseStatus: entry.responseStatus,
    response,
  };
}
async function resolveCancelBookingSeriesIdempotency(params: {
  authUserId: string;
  seriesId: string;
  body: CancelBookingSeriesRequest;
}): Promise<{
  responseStatus: number;
  response: CancelBookingSeriesResponse;
} | null> {
  if (!params.body.idempotencyKey) {
    return null;
  }
  const endpointKey = bookingSeriesLifecycleEndpointKey(params.seriesId, 'cancel');
  const requestHash = hashBookingSeriesLifecycleRequest({
    seriesId: params.seriesId,
    body: params.body,
  });
  if (getApiDataBackend() !== 'db' || shouldUseDbFixtureFallback()) {
    const tables =
      getApiDataBackend() === 'db' ? getDbFixtureStore().tables : getMarketplaceSeedStore().tables;
    const response = findSeedCancelBookingSeriesIdempotency({
      tables,
      authUserId: params.authUserId,
      endpointKey,
      idempotencyKey: params.body.idempotencyKey,
      requestHash,
    });
    return response
      ? {
          responseStatus: 200,
          response,
        }
      : null;
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
    throw conflict('Idempotency key was already used with a different booking series payload');
  }
  const response = parseIdempotentCancelBookingSeriesResponse(entry.responseBodyJson);
  if (!response) {
    throw conflict('Stored idempotency response is no longer valid');
  }
  return {
    responseStatus: entry.responseStatus,
    response,
  };
}
async function resolvePauseBookingSeriesIdempotency(params: {
  authUserId: string;
  seriesId: string;
  body: PauseBookingSeriesRequest;
}): Promise<{
  responseStatus: number;
  response: PauseBookingSeriesResponse;
} | null> {
  if (!params.body.idempotencyKey) {
    return null;
  }
  const endpointKey = bookingSeriesLifecycleEndpointKey(params.seriesId, 'pause');
  const requestHash = hashBookingSeriesLifecycleRequest({
    seriesId: params.seriesId,
    body: params.body,
  });
  if (getApiDataBackend() !== 'db' || shouldUseDbFixtureFallback()) {
    const tables =
      getApiDataBackend() === 'db' ? getDbFixtureStore().tables : getMarketplaceSeedStore().tables;
    const response = findSeedPauseBookingSeriesIdempotency({
      tables,
      authUserId: params.authUserId,
      endpointKey,
      idempotencyKey: params.body.idempotencyKey,
      requestHash,
    });
    return response
      ? {
          responseStatus: 200,
          response,
        }
      : null;
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
    throw conflict('Idempotency key was already used with a different booking series payload');
  }
  const response = parseIdempotentPauseBookingSeriesResponse(entry.responseBodyJson);
  if (!response) {
    throw conflict('Stored idempotency response is no longer valid');
  }
  return {
    responseStatus: entry.responseStatus,
    response,
  };
}
async function resolveResumeBookingSeriesIdempotency(params: {
  authUserId: string;
  seriesId: string;
  body: ResumeBookingSeriesRequest;
}): Promise<{
  responseStatus: number;
  response: ResumeBookingSeriesResponse;
} | null> {
  if (!params.body.idempotencyKey) {
    return null;
  }
  const endpointKey = bookingSeriesLifecycleEndpointKey(params.seriesId, 'resume');
  const requestHash = hashBookingSeriesLifecycleRequest({
    seriesId: params.seriesId,
    body: params.body,
  });
  if (getApiDataBackend() !== 'db' || shouldUseDbFixtureFallback()) {
    const tables =
      getApiDataBackend() === 'db' ? getDbFixtureStore().tables : getMarketplaceSeedStore().tables;
    const response = findSeedResumeBookingSeriesIdempotency({
      tables,
      authUserId: params.authUserId,
      endpointKey,
      idempotencyKey: params.body.idempotencyKey,
      requestHash,
    });
    return response
      ? {
          responseStatus: 200,
          response,
        }
      : null;
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
    throw conflict('Idempotency key was already used with a different booking series payload');
  }
  const response = parseIdempotentResumeBookingSeriesResponse(entry.responseBodyJson);
  if (!response) {
    throw conflict('Stored idempotency response is no longer valid');
  }
  return {
    responseStatus: entry.responseStatus,
    response,
  };
}
async function resolveUpdateBookingSeriesIdempotency(params: {
  authUserId: string;
  seriesId: string;
  body: UpdateBookingSeriesRequest;
}): Promise<{
  responseStatus: number;
  response: UpdateBookingSeriesResponse;
} | null> {
  if (!params.body.idempotencyKey) {
    return null;
  }
  const endpointKey = bookingSeriesLifecycleEndpointKey(params.seriesId, 'update');
  const requestHash = hashBookingSeriesLifecycleRequest({
    seriesId: params.seriesId,
    body: params.body,
  });
  if (getApiDataBackend() !== 'db' || shouldUseDbFixtureFallback()) {
    const tables =
      getApiDataBackend() === 'db' ? getDbFixtureStore().tables : getMarketplaceSeedStore().tables;
    const response = findSeedUpdateBookingSeriesIdempotency({
      tables,
      authUserId: params.authUserId,
      endpointKey,
      idempotencyKey: params.body.idempotencyKey,
      requestHash,
    });
    return response
      ? {
          responseStatus: 200,
          response,
        }
      : null;
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
    throw conflict('Idempotency key was already used with a different booking series payload');
  }
  const response = parseIdempotentUpdateBookingSeriesResponse(entry.responseBodyJson);
  if (!response) {
    throw conflict('Stored idempotency response is no longer valid');
  }
  return {
    responseStatus: entry.responseStatus,
    response,
  };
}
function mapDbBookingRecord(booking: Record<string, unknown>): BookingResponse {
  const participants = asRows(booking.participants);
  const objectives = asRows(booking.objectives);
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
    objectives: objectives
      .sort((left, right) => (asNumber(left.sortOrder) ?? 0) - (asNumber(right.sortOrder) ?? 0))
      .flatMap((objective) => {
        const mapped = asString(objective.objective);
        return Boolean(mapped) ? [mapped] : [];
      }),
    notes: asString(booking.notes) ?? null,
    priceMinor: asNumber(booking.priceMinor) ?? null,
    currency: asString(booking.currency) ?? 'GBP',
    participants: participants.map((participant) => ({
      athleteId: asString(participant.athleteId) ?? '',
      guardianUserId: asString(participant.guardianUserId),
      status: (asString(participant.status) ?? 'pending').toLowerCase(),
    })),
    version: asNumber(booking.version) ?? 1,
    createdAt: asString(booking.createdAt) ?? isoNow(),
    updatedAt: asString(booking.updatedAt) ?? isoNow(),
    cancelledAt: asString(booking.cancelledAt) ?? null,
  });
}
function mapDbBookingSeriesRecord(params: {
  series: Record<string, unknown>;
  bookings: BookingResponse[];
}): BookingSeriesResponse {
  const firstBooking = params.bookings[0];
  const lastBooking = params.bookings[params.bookings.length - 1];
  const athleteIds = Array.from(
    new Set(
      params.bookings.flatMap((booking) =>
        booking.participants.map((participant) => participant.athleteId),
      ),
    ),
  );
  const fallbackAthleteId = asString(params.series.athleteId);
  if (athleteIds.length === 0 && fallbackAthleteId) {
    athleteIds.push(fallbackAthleteId);
  }
  const priceValues = params.bookings.flatMap((booking) => {
    const mapped = booking.priceMinor;
    return typeof mapped === 'number' ? [mapped] : [];
  });
  return bookingSeriesResponseSchema.parse({
    id: asString(params.series.id),
    coachUserId: asString(params.series.coachUserId),
    bookedByUserId: asString(params.series.bookedByUserId),
    athleteIds,
    frequency: asString(params.series.frequency) ?? 'CUSTOM',
    patternLabel: asString(params.series.notes) ?? null,
    status: getSeriesResponseStatus({
      storedStatus: asString(params.series.status),
      bookings: params.bookings,
    }),
    startDate: firstBooking?.scheduledAt ?? asString(params.series.startDate),
    endDate:
      asString(params.series.endDate) ??
      lastBooking?.scheduledAt ??
      asString(params.series.startDate),
    bookingIds: params.bookings.map((booking) => booking.id),
    scheduledDates: params.bookings.map((booking) => booking.scheduledAt),
    durationMinutes: firstBooking?.durationMinutes ?? null,
    location: firstBooking?.location ?? null,
    serviceType: firstBooking?.serviceType ?? null,
    objectives: firstBooking?.objectives ?? [],
    priceMinor: firstBooking?.priceMinor ?? null,
    totalPriceMinor:
      priceValues.length > 0 ? priceValues.reduce((sum, price) => sum + price, 0) : null,
    currency: firstBooking?.currency ?? 'GBP',
    version: asNumber(params.series.version) ?? 1,
    createdAt: asString(params.series.createdAt) ?? isoNow(),
    updatedAt: asString(params.series.updatedAt) ?? isoNow(),
  });
}
function canUserAccessDbSeries(params: {
  series: {
    coachUserId: string;
    bookedByUserId: string;
  };
  bookings: Array<{
    participants: Array<{
      guardianUserId: string | null;
      athlete: {
        userId: string | null;
      };
    }>;
  }>;
  authUserId: string;
}): boolean {
  return (
    params.series.coachUserId === params.authUserId ||
    params.series.bookedByUserId === params.authUserId ||
    params.bookings.some((booking) =>
      booking.participants.some(
        (participant) =>
          participant.guardianUserId === params.authUserId ||
          participant.athlete.userId === params.authUserId,
      ),
    )
  );
}
class DbBookingSeriesRepository implements BookingSeriesRepository {
  async listVisibleBookingSeries(
    params: ListBookingSeriesParams,
  ): Promise<BookingSeriesListResponse> {
    if (shouldUseDbFixtureFallback()) {
      const seedRepository = new SeedBookingSeriesRepository(getDbFixtureStore);
      return seedRepository.listVisibleBookingSeries(params);
    }
    const prisma = getPrismaClientOrThrow();
    const bookingSeriesIds = await prisma.booking.findMany({
      where: {
        recurringSeriesId: {
          not: null,
        },
        OR: [
          {
            coachUserId: params.authUserId,
          },
          {
            bookedByUserId: params.authUserId,
          },
          {
            participants: {
              some: {
                guardianUserId: params.authUserId,
              },
            },
          },
          {
            participants: {
              some: {
                athlete: {
                  userId: params.authUserId,
                },
              },
            },
          },
        ],
      },
      select: {
        recurringSeriesId: true,
      },
    });
    const visibleSeriesIds = Array.from(
      new Set(
        bookingSeriesIds.flatMap((row) => {
          const mapped = row.recurringSeriesId;
          return typeof mapped === 'string' ? [mapped] : [];
        }),
      ),
    );
    const seriesRows = await prisma.recurringSeries.findMany({
      where: {
        deletedAt: null,
        OR: [
          {
            coachUserId: params.authUserId,
          },
          {
            bookedByUserId: params.authUserId,
          },
          ...(visibleSeriesIds.length > 0
            ? [
                {
                  id: {
                    in: visibleSeriesIds,
                  },
                },
              ]
            : []),
        ],
      },
      orderBy: {
        startDate: 'asc',
      },
    });
    const seriesIds = seriesRows.map((series) => series.id);
    const bookings = await prisma.booking.findMany({
      where: {
        recurringSeriesId: {
          in: seriesIds,
        },
      },
      include: {
        participants: {
          include: {
            athlete: {
              select: {
                userId: true,
              },
            },
          },
        },
        objectives: true,
      },
      orderBy: [
        {
          seriesIndex: 'asc',
        },
        {
          scheduledAt: 'asc',
        },
      ],
    });
    const normalizedBookings = normalizeForJson(bookings) as Record<string, unknown>[];
    const bookingsBySeries = new Map<string, BookingResponse[]>();
    for (const booking of normalizedBookings) {
      const seriesId = asString(booking.recurringSeriesId);
      if (!seriesId) {
        continue;
      }
      const existing = bookingsBySeries.get(seriesId) ?? [];
      existing.push(mapDbBookingRecord(booking));
      bookingsBySeries.set(seriesId, existing);
    }
    const normalizedSeries = normalizeForJson(seriesRows) as Record<string, unknown>[];
    const responseSeries = normalizedSeries.map((series) =>
      mapDbBookingSeriesRecord({
        series,
        bookings: bookingsBySeries.get(asString(series.id) ?? '') ?? [],
      }),
    );
    return bookingSeriesListResponseSchema.parse({
      series: responseSeries,
      total: responseSeries.length,
      seedVersion: null,
      requestId: 'db',
    });
  }
  async getVisibleBookingSeriesById(
    params: GetBookingSeriesParams,
  ): Promise<BookingSeriesResponse> {
    if (shouldUseDbFixtureFallback()) {
      const seedRepository = new SeedBookingSeriesRepository(getDbFixtureStore);
      return seedRepository.getVisibleBookingSeriesById(params);
    }
    const prisma = getPrismaClientOrThrow();
    const series = await prisma.recurringSeries.findFirst({
      where: {
        id: params.seriesId,
        deletedAt: null,
      },
    });
    if (!series) {
      throw badRequest('Booking series not found', {
        seriesId: params.seriesId,
      });
    }
    const bookings = await prisma.booking.findMany({
      where: {
        recurringSeriesId: params.seriesId,
      },
      include: {
        participants: {
          include: {
            athlete: {
              select: {
                userId: true,
              },
            },
          },
        },
        objectives: true,
      },
      orderBy: [
        {
          seriesIndex: 'asc',
        },
        {
          scheduledAt: 'asc',
        },
      ],
    });
    if (
      !canUserAccessDbSeries({
        series,
        bookings,
        authUserId: params.authUserId,
      })
    ) {
      throw forbidden('Booking series does not belong to authenticated user');
    }
    return normalizeForJson(
      mapDbBookingSeriesRecord({
        series: normalizeForJson(series) as Record<string, unknown>,
        bookings: (normalizeForJson(bookings) as Record<string, unknown>[]).map(mapDbBookingRecord),
      }),
    );
  }
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
    const [guardianLinks, athleteRows] = await Promise.all([
      prisma.guardianChildLink.findMany({
        where: {
          athleteId: {
            in: body.athleteIds,
          },
        },
      }),
      prisma.athlete.findMany({
        where: {
          id: {
            in: body.athleteIds,
          },
        },
        select: {
          id: true,
          userId: true,
        },
      }),
    ]);
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
        await Promise.all(
          body.occurrences.map(async (occurrence, index) => {
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
            await Promise.all([
              body.athleteIds.length > 0
                ? tx.bookingParticipant.createMany({
                    data: body.athleteIds.map((athleteId) => ({
                      id: newId('bkp'),
                      bookingId,
                      athleteId,
                      guardianUserId: guardianByAthlete.get(athleteId) ?? body.bookedByUserId,
                      status: 'confirmed',
                      createdByUserId: params.authUserId,
                      updatedByUserId: params.authUserId,
                    })),
                  })
                : Promise.resolve(),
              body.objectives.length > 0
                ? tx.bookingObjective.createMany({
                    data: body.objectives.map((objective, objectiveIndex) => ({
                      id: newId('boj'),
                      bookingId,
                      objective,
                      sortOrder: objectiveIndex + 1,
                      createdAt: now,
                    })),
                  })
                : Promise.resolve(),
              tx.bookingStatusEvent.create({
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
              }),
            ]);
          }),
        );
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
      if (body.idempotencyKey && isBookingSeriesIdempotencyRace(error)) {
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
  async cancelBookingSeries(
    params: CancelBookingSeriesParams,
  ): Promise<CancelBookingSeriesResponse> {
    if (shouldUseDbFixtureFallback()) {
      const seedRepository = new SeedBookingSeriesRepository(getDbFixtureStore);
      return seedRepository.cancelBookingSeries(params);
    }
    const idempotentResponse = await resolveCancelBookingSeriesIdempotency({
      authUserId: params.authUserId,
      seriesId: params.seriesId,
      body: params.body,
    });
    if (idempotentResponse) {
      return idempotentResponse.response;
    }
    const prisma = getPrismaClientOrThrow();
    const series = await prisma.recurringSeries.findFirst({
      where: {
        id: params.seriesId,
        deletedAt: null,
      },
    });
    if (!series) {
      throw badRequest('Booking series not found', {
        seriesId: params.seriesId,
      });
    }
    const bookings = await prisma.booking.findMany({
      where: {
        recurringSeriesId: params.seriesId,
      },
      include: {
        participants: {
          include: {
            athlete: {
              select: {
                userId: true,
              },
            },
          },
        },
        objectives: true,
      },
      orderBy: [
        {
          seriesIndex: 'asc',
        },
        {
          scheduledAt: 'asc',
        },
      ],
    });
    if (
      !canUserAccessDbSeries({
        series,
        bookings,
        authUserId: params.authUserId,
      })
    ) {
      throw forbidden('Booking series does not belong to authenticated user');
    }
    assertExpectedSeriesVersion(Number(series.version), params.body.expectedVersion);
    const now = new Date();
    const endpointKey = bookingSeriesLifecycleEndpointKey(params.seriesId, 'cancel');
    const requestHash = hashBookingSeriesLifecycleRequest({
      seriesId: params.seriesId,
      body: params.body,
    });
    try {
      const response = await prisma.$transaction(async (tx) => {
        const seriesUpdate = await tx.recurringSeries.updateMany({
          where: {
            id: params.seriesId,
            version: series.version,
          },
          data: {
            updatedByUserId: params.authUserId,
            version: {
              increment: 1,
            },
          },
        });
        if (seriesUpdate.count !== 1) {
          throw conflict('Booking series version changed since it was loaded', {
            currentVersion: Number(series.version),
          });
        }
        const cancelReason = params.body.reason;
        const cancellableBookings = bookings.filter(
          (booking) =>
            booking.status !== 'CANCELLED' &&
            booking.status !== 'COMPLETED' &&
            booking.scheduledAt.getTime() > now.getTime(),
        );
        await Promise.all(
          cancellableBookings.map(async (booking) => {
            await applyBookingCancellationInvoiceEffectsInDbTransaction(tx, {
              bookingId: booking.id,
              actorUserId: params.authUserId,
              reason: cancelReason,
              requestId: params.requestId,
            });
            await Promise.all([
              tx.booking.update({
                where: {
                  id: booking.id,
                },
                data: {
                  status: 'CANCELLED',
                  cancelledByUserId: params.authUserId,
                  cancelledAt: now,
                  cancelReason,
                  updatedByUserId: params.authUserId,
                  version: {
                    increment: 1,
                  },
                },
              }),
              tx.bookingStatusEvent.create({
                data: {
                  id: newId('bse'),
                  bookingId: booking.id,
                  fromStatus: booking.status,
                  toStatus: 'CANCELLED',
                  actorUserId: params.authUserId,
                  reason: params.body.reason,
                  metadataJson: {
                    note: params.body.note ?? null,
                    source: 'api-db-runtime',
                    recurringSeriesId: params.seriesId,
                  },
                  requestId: params.requestId,
                  occurredAt: now,
                },
              }),
            ]);
          }),
        );
        const updatedBookings = await tx.booking.findMany({
          where: {
            recurringSeriesId: params.seriesId,
          },
          include: {
            participants: {
              include: {
                athlete: {
                  select: {
                    userId: true,
                  },
                },
              },
            },
            objectives: true,
          },
          orderBy: [
            {
              seriesIndex: 'asc',
            },
            {
              scheduledAt: 'asc',
            },
          ],
        });
        const responseBookings = (
          normalizeForJson(updatedBookings) as Record<string, unknown>[]
        ).map(mapDbBookingRecord);
        const nextStatus = getSeriesStatusFromBookings(responseBookings);
        const updatedSeries = await tx.recurringSeries.update({
          where: {
            id: params.seriesId,
          },
          data: {
            status: nextStatus,
            updatedByUserId: params.authUserId,
          },
        });
        const nextResponse = cancelBookingSeriesResponseSchema.parse({
          series: mapDbBookingSeriesRecord({
            series: normalizeForJson(updatedSeries) as Record<string, unknown>,
            bookings: responseBookings,
          }),
          bookings: responseBookings,
          requestId: params.requestId,
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
      if (params.body.idempotencyKey && isBookingSeriesIdempotencyRace(error)) {
        const replay = await resolveCancelBookingSeriesIdempotency({
          authUserId: params.authUserId,
          seriesId: params.seriesId,
          body: params.body,
        });
        if (replay) {
          return replay.response;
        }
      }
      throw error;
    }
  }
  async pauseBookingSeries(params: PauseBookingSeriesParams): Promise<PauseBookingSeriesResponse> {
    if (shouldUseDbFixtureFallback()) {
      const seedRepository = new SeedBookingSeriesRepository(getDbFixtureStore);
      return seedRepository.pauseBookingSeries(params);
    }
    const idempotentResponse = await resolvePauseBookingSeriesIdempotency({
      authUserId: params.authUserId,
      seriesId: params.seriesId,
      body: params.body,
    });
    if (idempotentResponse) {
      return idempotentResponse.response;
    }
    const prisma = getPrismaClientOrThrow();
    const series = await prisma.recurringSeries.findFirst({
      where: {
        id: params.seriesId,
        deletedAt: null,
      },
    });
    if (!series) {
      throw badRequest('Booking series not found', {
        seriesId: params.seriesId,
      });
    }
    const bookings = await prisma.booking.findMany({
      where: {
        recurringSeriesId: params.seriesId,
      },
      include: {
        participants: {
          include: {
            athlete: {
              select: {
                userId: true,
              },
            },
          },
        },
        objectives: true,
      },
      orderBy: [
        {
          seriesIndex: 'asc',
        },
        {
          scheduledAt: 'asc',
        },
      ],
    });
    if (
      !canUserAccessDbSeries({
        series,
        bookings,
        authUserId: params.authUserId,
      })
    ) {
      throw forbidden('Booking series does not belong to authenticated user');
    }
    const responseBookings = (normalizeForJson(bookings) as Record<string, unknown>[]).map(
      mapDbBookingRecord,
    );
    assertExpectedSeriesVersion(Number(series.version), params.body.expectedVersion);
    assertSeriesCanPause(
      getSeriesResponseStatus({
        storedStatus: series.status,
        bookings: responseBookings,
      }),
    );
    const now = new Date();
    const endpointKey = bookingSeriesLifecycleEndpointKey(params.seriesId, 'pause');
    const requestHash = hashBookingSeriesLifecycleRequest({
      seriesId: params.seriesId,
      body: params.body,
    });
    try {
      const response = await prisma.$transaction(async (tx) => {
        const seriesUpdate = await tx.recurringSeries.updateMany({
          where: {
            id: params.seriesId,
            version: series.version,
          },
          data: {
            status: 'PAUSED',
            updatedByUserId: params.authUserId,
            version: {
              increment: 1,
            },
          },
        });
        if (seriesUpdate.count !== 1) {
          throw conflict('Booking series version changed since it was loaded', {
            currentVersion: Number(series.version),
          });
        }
        const updatedSeries = await tx.recurringSeries.findUniqueOrThrow({
          where: {
            id: params.seriesId,
          },
        });
        const nextResponse = pauseBookingSeriesResponseSchema.parse({
          series: mapDbBookingSeriesRecord({
            series: normalizeForJson(updatedSeries) as Record<string, unknown>,
            bookings: responseBookings,
          }),
          bookings: responseBookings,
          requestId: params.requestId,
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
      if (params.body.idempotencyKey && isBookingSeriesIdempotencyRace(error)) {
        const replay = await resolvePauseBookingSeriesIdempotency({
          authUserId: params.authUserId,
          seriesId: params.seriesId,
          body: params.body,
        });
        if (replay) {
          return replay.response;
        }
      }
      throw error;
    }
  }
  async resumeBookingSeries(
    params: ResumeBookingSeriesParams,
  ): Promise<ResumeBookingSeriesResponse> {
    if (shouldUseDbFixtureFallback()) {
      const seedRepository = new SeedBookingSeriesRepository(getDbFixtureStore);
      return seedRepository.resumeBookingSeries(params);
    }
    const idempotentResponse = await resolveResumeBookingSeriesIdempotency({
      authUserId: params.authUserId,
      seriesId: params.seriesId,
      body: params.body,
    });
    if (idempotentResponse) {
      return idempotentResponse.response;
    }
    const prisma = getPrismaClientOrThrow();
    const series = await prisma.recurringSeries.findFirst({
      where: {
        id: params.seriesId,
        deletedAt: null,
      },
    });
    if (!series) {
      throw badRequest('Booking series not found', {
        seriesId: params.seriesId,
      });
    }
    const bookings = await prisma.booking.findMany({
      where: {
        recurringSeriesId: params.seriesId,
      },
      include: {
        participants: {
          include: {
            athlete: {
              select: {
                userId: true,
              },
            },
          },
        },
        objectives: true,
      },
      orderBy: [
        {
          seriesIndex: 'asc',
        },
        {
          scheduledAt: 'asc',
        },
      ],
    });
    if (
      !canUserAccessDbSeries({
        series,
        bookings,
        authUserId: params.authUserId,
      })
    ) {
      throw forbidden('Booking series does not belong to authenticated user');
    }
    const responseBookings = (normalizeForJson(bookings) as Record<string, unknown>[]).map(
      mapDbBookingRecord,
    );
    assertExpectedSeriesVersion(Number(series.version), params.body.expectedVersion);
    assertSeriesCanResume(
      getSeriesResponseStatus({
        storedStatus: series.status,
        bookings: responseBookings,
      }),
    );
    const now = new Date();
    const nextStatus = getSeriesStatusFromBookings(responseBookings);
    const endpointKey = bookingSeriesLifecycleEndpointKey(params.seriesId, 'resume');
    const requestHash = hashBookingSeriesLifecycleRequest({
      seriesId: params.seriesId,
      body: params.body,
    });
    try {
      const response = await prisma.$transaction(async (tx) => {
        const seriesUpdate = await tx.recurringSeries.updateMany({
          where: {
            id: params.seriesId,
            version: series.version,
          },
          data: {
            status: nextStatus,
            updatedByUserId: params.authUserId,
            version: {
              increment: 1,
            },
          },
        });
        if (seriesUpdate.count !== 1) {
          throw conflict('Booking series version changed since it was loaded', {
            currentVersion: Number(series.version),
          });
        }
        const updatedSeries = await tx.recurringSeries.findUniqueOrThrow({
          where: {
            id: params.seriesId,
          },
        });
        const nextResponse = resumeBookingSeriesResponseSchema.parse({
          series: mapDbBookingSeriesRecord({
            series: normalizeForJson(updatedSeries) as Record<string, unknown>,
            bookings: responseBookings,
          }),
          bookings: responseBookings,
          requestId: params.requestId,
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
      if (params.body.idempotencyKey && isBookingSeriesIdempotencyRace(error)) {
        const replay = await resolveResumeBookingSeriesIdempotency({
          authUserId: params.authUserId,
          seriesId: params.seriesId,
          body: params.body,
        });
        if (replay) {
          return replay.response;
        }
      }
      throw error;
    }
  }
  async updateBookingSeries(
    params: UpdateBookingSeriesParams,
  ): Promise<UpdateBookingSeriesResponse> {
    if (shouldUseDbFixtureFallback()) {
      const seedRepository = new SeedBookingSeriesRepository(getDbFixtureStore);
      return seedRepository.updateBookingSeries(params);
    }
    const idempotentResponse = await resolveUpdateBookingSeriesIdempotency({
      authUserId: params.authUserId,
      seriesId: params.seriesId,
      body: params.body,
    });
    if (idempotentResponse) {
      return idempotentResponse.response;
    }
    const prisma = getPrismaClientOrThrow();
    const series = await prisma.recurringSeries.findFirst({
      where: {
        id: params.seriesId,
        deletedAt: null,
      },
    });
    if (!series) {
      throw badRequest('Booking series not found', {
        seriesId: params.seriesId,
      });
    }
    const bookings = await prisma.booking.findMany({
      where: {
        recurringSeriesId: params.seriesId,
      },
      include: {
        participants: {
          include: {
            athlete: {
              select: {
                userId: true,
              },
            },
          },
        },
        objectives: true,
      },
      orderBy: [
        {
          seriesIndex: 'asc',
        },
        {
          scheduledAt: 'asc',
        },
      ],
    });
    if (
      !canUserAccessDbSeries({
        series,
        bookings,
        authUserId: params.authUserId,
      })
    ) {
      throw forbidden('Booking series does not belong to authenticated user');
    }
    const responseBookingsBefore = (normalizeForJson(bookings) as Record<string, unknown>[]).map(
      mapDbBookingRecord,
    );
    assertExpectedSeriesVersion(Number(series.version), params.body.expectedVersion);
    assertSeriesCanUpdate(
      getSeriesResponseStatus({
        storedStatus: series.status,
        bookings: responseBookingsBefore,
      }),
    );
    const now = new Date();
    const mutableBookings = bookings.filter(
      (booking) =>
        booking.status !== 'CANCELLED' &&
        booking.status !== 'COMPLETED' &&
        booking.scheduledAt.getTime() > now.getTime(),
    );
    if (mutableBookings.length === 0) {
      throw badRequest('Booking series has no future bookings that can be updated', {
        seriesId: params.seriesId,
      });
    }
    const mutableBookingIds = mutableBookings.map((booking) => booking.id);
    const blockingInvoice = await prisma.invoice.findFirst({
      where: {
        bookingId: {
          in: mutableBookingIds,
        },
        deletedAt: null,
        status: {
          notIn: ['DRAFT', 'SENT'],
        },
      },
    });
    if (blockingInvoice) {
      throw badRequest(
        'Booking series updates require explicit invoice adjustment for settled invoices',
        {
          bookingId: blockingInvoice.bookingId,
          invoiceId: blockingInvoice.id,
          invoiceStatus: blockingInvoice.status,
        },
      );
    }
    const endpointKey = bookingSeriesLifecycleEndpointKey(params.seriesId, 'update');
    const requestHash = hashBookingSeriesLifecycleRequest({
      seriesId: params.seriesId,
      body: params.body,
    });
    try {
      const response = await prisma.$transaction(async (tx) => {
        const updateData = {
          ...(params.body.durationMinutes !== undefined
            ? {
                durationMinutes: params.body.durationMinutes,
              }
            : {}),
          ...(params.body.location !== undefined
            ? {
                location: params.body.location,
              }
            : {}),
          ...(params.body.notes !== undefined
            ? {
                notes: params.body.notes,
              }
            : {}),
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        };
        await Promise.all(
          mutableBookings.map((booking) =>
            tx.booking.update({
              where: {
                id: booking.id,
              },
              data: {
                ...updateData,
                ...(params.body.time
                  ? {
                      scheduledAt: new Date(
                        applyTimeToDate(booking.scheduledAt.toISOString(), params.body.time),
                      ),
                    }
                  : {}),
              },
            }),
          ),
        ).then(() =>
          applyBookingInvoiceAdjustmentsInDbTransaction(tx, {
            bookingIds: mutableBookingIds,
            actorUserId: params.authUserId,
            reason: 'Linked booking series was updated.',
            requestId: params.requestId,
          }),
        );
        const updatedBookings = await tx.booking.findMany({
          where: {
            recurringSeriesId: params.seriesId,
          },
          include: {
            participants: {
              include: {
                athlete: {
                  select: {
                    userId: true,
                  },
                },
              },
            },
            objectives: true,
          },
          orderBy: [
            {
              seriesIndex: 'asc',
            },
            {
              scheduledAt: 'asc',
            },
          ],
        });
        const responseBookings = (
          normalizeForJson(updatedBookings) as Record<string, unknown>[]
        ).map(mapDbBookingRecord);
        const nextEndDate = getUpdatedSeriesEndDate({
          body: params.body,
          bookings: responseBookings,
        });
        const seriesUpdate = await tx.recurringSeries.updateMany({
          where: {
            id: params.seriesId,
            version: series.version,
          },
          data: {
            ...(params.body.time
              ? {
                  timeLocal: params.body.time,
                }
              : {}),
            ...(params.body.notes !== undefined
              ? {
                  notes: params.body.notes,
                }
              : {}),
            endDate: new Date(nextEndDate),
            updatedByUserId: params.authUserId,
            version: {
              increment: 1,
            },
          },
        });
        if (seriesUpdate.count !== 1) {
          throw conflict('Booking series version changed since it was loaded', {
            currentVersion: Number(series.version),
          });
        }
        const updatedSeries = await tx.recurringSeries.findUniqueOrThrow({
          where: {
            id: params.seriesId,
          },
        });
        const nextResponse = updateBookingSeriesResponseSchema.parse({
          series: mapDbBookingSeriesRecord({
            series: normalizeForJson(updatedSeries) as Record<string, unknown>,
            bookings: responseBookings,
          }),
          bookings: responseBookings,
          requestId: params.requestId,
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
      if (params.body.idempotencyKey && isBookingSeriesIdempotencyRace(error)) {
        const replay = await resolveUpdateBookingSeriesIdempotency({
          authUserId: params.authUserId,
          seriesId: params.seriesId,
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
const seedBookingSeriesRepository = new SeedBookingSeriesRepository();
const dbBookingSeriesRepository = new DbBookingSeriesRepository();
export function resolveBookingSeriesRepository(): BookingSeriesRepository {
  return getApiDataBackend() === 'db' ? dbBookingSeriesRepository : seedBookingSeriesRepository;
}
