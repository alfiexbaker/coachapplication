import crypto from 'node:crypto';
import { Prisma } from '@clubroom/db';
import {
  bookingResponseSchema,
  bookingStatusSchema,
  type BookingResponse,
  type CancelBookingRequest,
  type ConfirmBookingRequest,
  type CompleteBookingRequest,
  type CreateBookingRequest,
  type ReopenBookingRequest,
  type ResolveBookingRequest,
  type UpdateBookingRequest,
} from '@clubroom/shared-contracts';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import {
  API_DB_TRANSACTION_OPTIONS,
  getPrismaClientOrThrow,
  shouldUseDbFixtureFallback,
} from '../../lib/prisma-runtime.js';
import {
  applyBookingCancellationInvoiceEffects,
  applyBookingCancellationInvoiceEffectsInDbTransaction,
  applyBookingReopenInvoiceEffects,
  applyBookingReopenInvoiceEffectsInDbTransaction,
} from '../../lib/invoice-runtime.js';
import { normalizeForJson } from './normalize.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/http-errors.js';
import {
  assertCoachAvailabilitySlotOpen,
  resolveCoachAvailabilityTables,
} from '../../modules/coach-club/availability.js';
export type SeedRow = Record<string, unknown>;
export type SeedTables = Record<string, SeedRow[]>;
const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;
const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
const asObject = (value: unknown): SeedRow =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as SeedRow) : {};
const isoNow = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
type BookingStatusCode =
  | 'PENDING'
  | 'AWAITING_CONFIRMATION'
  | 'CONFIRMED'
  | 'AWAITING_COMPLETION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DECLINED'
  | 'WITHDRAWN'
  | 'EXPIRED';
type BookingRequestResolutionAction = 'decline' | 'withdraw';
type BookingCompletionAttendance = NonNullable<CompleteBookingRequest['attendance']>[number];
type NormalizedCompletionAttendance = {
  athleteId: string;
  status: BookingCompletionAttendance['status'];
  notes: string | null;
  effortRating: number | null;
};
type CompletionAttendanceRecordRef = {
  athleteId: string;
  id: string;
  status: BookingCompletionAttendance['status'];
};
const BOOKING_CREATE_ENDPOINT_KEY = 'POST:/v1/bookings';
const IDEMPOTENCY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BOOKING_REQUEST_TTL_MS = 24 * 60 * 60 * 1000;
const BOOKING_REQUEST_EXPIRY_ACTOR_ID = 'system_booking_request_expiry';
const bookingLifecycleEndpointKey = (
  bookingId: string,
  action: 'cancel' | 'confirm' | 'reopen' | 'complete' | 'update' | BookingRequestResolutionAction,
) => `POST:/v1/bookings/${bookingId}/${action}`;
const bookingUpdateEndpointKey = (bookingId: string) => `PATCH:/v1/bookings/${bookingId}`;
const BOOKING_CANCELLED_NOTIFICATION_SOURCE_TYPE = 'booking_cancelled';
const BOOKING_CONFIRMED_NOTIFICATION_SOURCE_TYPE = 'booking_confirmed';
const BOOKING_REQUEST_DECLINED_NOTIFICATION_SOURCE_TYPE = 'booking_request_declined';
const BOOKING_REQUEST_WITHDRAWN_NOTIFICATION_SOURCE_TYPE = 'booking_request_withdrawn';
const BOOKING_REQUEST_EXPIRED_NOTIFICATION_SOURCE_TYPE = 'booking_request_expired';
export const BOOKING_COMPLETED_NOTIFICATION_SOURCE_TYPE = 'booking_completed';
export const BOOKING_REVIEW_PROMPT_NOTIFICATION_SOURCE_TYPE = 'booking_review_prompt';
export interface ListBookingsParams {
  authUserId: string;
  statusFilter?: string;
}
export interface CreateBookingParams {
  authUserId: string;
  requestId: string;
  body: CreateBookingRequest;
  bookingRowOverrides?: {
    clubId?: string | null;
  };
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
export interface UpdateBookingParams {
  authUserId: string;
  requestId: string;
  bookingId: string;
  body: UpdateBookingRequest;
}
export interface ReopenBookingParams {
  authUserId: string;
  requestId: string;
  bookingId: string;
  body: ReopenBookingRequest;
}
export interface ConfirmBookingParams {
  authUserId: string;
  requestId: string;
  bookingId: string;
  body: ConfirmBookingRequest;
}
export interface ResolveBookingRequestParams {
  authUserId: string;
  requestId: string;
  bookingId: string;
  action: BookingRequestResolutionAction;
  body: ResolveBookingRequest;
}
export interface CompleteBookingParams {
  authUserId: string;
  requestId: string;
  bookingId: string;
  body: CompleteBookingRequest;
}
export interface BookingSessionNoteFields {
  summary: string;
  focus: string[];
  improvements: string;
  homework: string;
  effort: number;
  attendance: string;
  videoUrls?: string[];
  imageUrls?: string[];
}
export interface BookingSessionNoteRecord extends BookingSessionNoteFields {
  id: string;
  bookingId: string;
  athleteId: string;
  updatedAt: string;
}
export interface BookingSessionNoteResult {
  note: BookingSessionNoteRecord | null;
  dataVersion: string | null;
}
export interface SaveBookingSessionNoteParams {
  authUserId: string;
  bookingId: string;
  input: BookingSessionNoteFields;
}
export interface ListBookingsResult {
  bookings: BookingResponse[];
  dataVersion: string | null;
}
export interface BookingRepository {
  listVisibleBookings(params: ListBookingsParams): Promise<ListBookingsResult>;
  getVisibleBookingById(params: GetBookingParams): Promise<BookingResponse>;
  getBookingSessionNote(params: GetBookingParams): Promise<BookingSessionNoteResult>;
  saveBookingSessionNote(params: SaveBookingSessionNoteParams): Promise<BookingSessionNoteResult>;
  createBooking(params: CreateBookingParams): Promise<BookingResponse>;
  updateBooking(params: UpdateBookingParams): Promise<BookingResponse>;
  cancelBooking(params: CancelBookingParams): Promise<BookingResponse>;
  resolveBookingRequest(params: ResolveBookingRequestParams): Promise<BookingResponse>;
  confirmBooking(params: ConfirmBookingParams): Promise<BookingResponse>;
  reopenBooking(params: ReopenBookingParams): Promise<BookingResponse>;
  completeBooking(params: CompleteBookingParams): Promise<BookingResponse>;
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
function bookingReservationLockKey(coachUserId: string): bigint {
  return crypto
    .createHash('sha256')
    .update(`clubroom:booking:${coachUserId}`)
    .digest()
    .readBigInt64BE(0);
}
function bookingRequestExpiresAt(scheduledAt: string | Date, createdAt: Date): Date {
  const scheduledAtMs = new Date(scheduledAt).getTime();
  const createdAtMs = Number.isFinite(createdAt.getTime()) ? createdAt.getTime() : Date.now();
  return new Date(
    Math.min(
      Number.isFinite(scheduledAtMs) ? scheduledAtMs : createdAtMs + BOOKING_REQUEST_TTL_MS,
      createdAtMs + BOOKING_REQUEST_TTL_MS,
    ),
  );
}
function isAwaitingBookingRequest(status: string | undefined): boolean {
  return status === 'PENDING' || status === 'AWAITING_CONFIRMATION';
}
function isTerminalBookingStatus(status: string | undefined): boolean {
  return (
    status === 'COMPLETED' ||
    status === 'CANCELLED' ||
    status === 'DECLINED' ||
    status === 'WITHDRAWN' ||
    status === 'EXPIRED'
  );
}
function hashBookingLifecycleRequest(params: {
  bookingId: string;
  body:
    | CancelBookingRequest
    | ConfirmBookingRequest
    | ReopenBookingRequest
    | ResolveBookingRequest
    | CompleteBookingRequest
    | UpdateBookingRequest;
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
    athletes.flatMap((item) => {
      const mapped = ((row) => [asString(row.id), asString(row.userId)] as const)(item);
      return ((item) =>
        (([id]) => Boolean(id))(item) ? [(([id, userId]) => [id as string, userId])(item)] : [])(
        mapped,
      );
    }),
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
  const participants = asRows(tables.bookingParticipants).filter(
    (participant) => !asString(participant.deletedAt),
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
  return participantRowsByBooking;
}
function bookingCancellationRecipientIds(params: {
  actorUserId: string;
  coachUserId?: string | null;
  bookedByUserId?: string | null;
  participants: Array<{
    guardianUserId?: string | null;
    athleteUserId?: string | null;
  }>;
}): string[] {
  const recipients = new Set<string>();
  if (params.coachUserId && params.actorUserId !== params.coachUserId) {
    recipients.add(params.coachUserId);
  } else {
    if (params.bookedByUserId) {
      recipients.add(params.bookedByUserId);
    }
    for (const participant of params.participants) {
      if (participant.guardianUserId) {
        recipients.add(participant.guardianUserId);
      }
      if (participant.athleteUserId) {
        recipients.add(participant.athleteUserId);
      }
    }
  }
  recipients.delete(params.actorUserId);
  return [...recipients].sort();
}
function bookingCancellationNotificationRows(params: {
  bookingId: string;
  actorUserId: string;
  recipientUserIds: string[];
  reason?: string;
  scheduledAt?: string | null;
  now: string;
}): SeedRow[] {
  const scheduledAt = params.scheduledAt ? Date.parse(params.scheduledAt) : NaN;
  const dateLabel = Number.isFinite(scheduledAt)
    ? new Date(scheduledAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      })
    : 'an upcoming date';
  return params.recipientUserIds.map((userId) => ({
    id: newId('nfn'),
    userId,
    type: 'BOOKING_CANCELLED',
    title: 'Booking cancelled',
    body: `A booking on ${dateLabel} has been cancelled.`,
    status: 'UNREAD',
    sourceType: BOOKING_CANCELLED_NOTIFICATION_SOURCE_TYPE,
    sourceId: params.bookingId,
    deepLink: `/bookings/${params.bookingId}`,
    metadataJson: {
      bookingId: params.bookingId,
      cancelledByUserId: params.actorUserId,
      reason: params.reason ?? null,
    },
    createdAt: params.now,
    updatedAt: params.now,
    readAt: null,
    dismissedAt: null,
  }));
}
function createSeedBookingCancellationNotifications(params: {
  tables: SeedTables;
  booking: SeedRow;
  actorUserId: string;
  participantRowsByBooking: Map<string, SeedRow[]>;
  athleteUserIdsByAthleteId: Map<string, string | undefined>;
  reason?: string;
  now: string;
}): number {
  const bookingId = asString(params.booking.id);
  if (!bookingId) {
    return 0;
  }
  const participants = (params.participantRowsByBooking.get(bookingId) ?? []).map((participant) => {
    const athleteId = asString(participant.athleteId);
    return {
      guardianUserId: asString(participant.guardianUserId),
      athleteUserId: athleteId ? params.athleteUserIdsByAthleteId.get(athleteId) : undefined,
    };
  });
  const candidateRecipientIds = bookingCancellationRecipientIds({
    actorUserId: params.actorUserId,
    coachUserId: asString(params.booking.coachUserId),
    bookedByUserId: asString(params.booking.bookedByUserId),
    participants,
  });
  if (candidateRecipientIds.length === 0) {
    return 0;
  }
  const notifications = getMutableRows(params.tables, 'notifications');
  const existingRecipientIds = new Set(
    notifications
      .filter(
        (row) =>
          asString(row.sourceType) === BOOKING_CANCELLED_NOTIFICATION_SOURCE_TYPE &&
          asString(row.sourceId) === bookingId,
      )
      .map((row) => asString(row.userId))
      .filter((userId): userId is string => Boolean(userId)),
  );
  const missingRecipientIds = candidateRecipientIds.filter(
    (userId) => !existingRecipientIds.has(userId),
  );
  if (missingRecipientIds.length === 0) {
    return 0;
  }
  notifications.push(
    ...bookingCancellationNotificationRows({
      bookingId,
      actorUserId: params.actorUserId,
      recipientUserIds: missingRecipientIds,
      reason: params.reason,
      scheduledAt: asString(params.booking.scheduledAt),
      now: params.now,
    }),
  );
  return missingRecipientIds.length;
}
type BookingRequestResolutionOutcome = BookingRequestResolutionAction | 'expire';
function bookingRequestResolutionDescriptor(action: BookingRequestResolutionOutcome): {
  status: 'DECLINED' | 'WITHDRAWN' | 'EXPIRED';
  notificationType: string;
  sourceType: string;
  title: string;
  bodyVerb: string;
} {
  if (action === 'decline') {
    return {
      status: 'DECLINED',
      notificationType: 'BOOKING_REQUEST_DECLINED',
      sourceType: BOOKING_REQUEST_DECLINED_NOTIFICATION_SOURCE_TYPE,
      title: 'Booking request declined',
      bodyVerb: 'was declined',
    };
  }
  if (action === 'withdraw') {
    return {
      status: 'WITHDRAWN',
      notificationType: 'BOOKING_REQUEST_WITHDRAWN',
      sourceType: BOOKING_REQUEST_WITHDRAWN_NOTIFICATION_SOURCE_TYPE,
      title: 'Booking request withdrawn',
      bodyVerb: 'was withdrawn',
    };
  }
  return {
    status: 'EXPIRED',
    notificationType: 'BOOKING_REQUEST_EXPIRED',
    sourceType: BOOKING_REQUEST_EXPIRED_NOTIFICATION_SOURCE_TYPE,
    title: 'Booking request expired',
    bodyVerb: 'expired before confirmation',
  };
}
function bookingRequestResolutionRecipientIds(params: {
  action: BookingRequestResolutionOutcome;
  actorUserId?: string | null;
  coachUserId?: string | null;
  bookedByUserId?: string | null;
  participants: Array<{
    guardianUserId?: string | null;
    athleteUserId?: string | null;
  }>;
}): string[] {
  const familyRecipients = bookingFamilyRecipientIds({
    actorUserId: params.actorUserId ?? '',
    bookedByUserId: params.bookedByUserId,
    participants: params.participants,
  });
  const recipients = new Set<string>();
  if (params.action !== 'decline' && params.coachUserId) {
    recipients.add(params.coachUserId);
  }
  if (params.action !== 'withdraw') {
    for (const userId of familyRecipients) {
      recipients.add(userId);
    }
  }
  if (params.actorUserId) {
    recipients.delete(params.actorUserId);
  }
  return [...recipients].sort();
}
function bookingRequestResolutionNotificationRows(params: {
  action: BookingRequestResolutionOutcome;
  bookingId: string;
  actorUserId?: string | null;
  recipientUserIds: string[];
  reason: string;
  scheduledAt?: string | null;
  now: string;
}): SeedRow[] {
  const descriptor = bookingRequestResolutionDescriptor(params.action);
  const scheduledAt = params.scheduledAt ? Date.parse(params.scheduledAt) : NaN;
  const dateLabel = Number.isFinite(scheduledAt)
    ? new Date(scheduledAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      })
    : 'an upcoming date';
  return params.recipientUserIds.map((userId) => ({
    id: newId('nfn'),
    userId,
    type: descriptor.notificationType,
    title: descriptor.title,
    body: `The booking request for ${dateLabel} ${descriptor.bodyVerb}.`,
    status: 'UNREAD',
    sourceType: descriptor.sourceType,
    sourceId: params.bookingId,
    deepLink: `/bookings/${params.bookingId}`,
    metadataJson: {
      bookingId: params.bookingId,
      outcome: descriptor.status,
      resolvedByUserId: params.actorUserId ?? null,
      reason: params.reason,
    },
    createdAt: params.now,
    updatedAt: params.now,
    readAt: null,
    dismissedAt: null,
  }));
}
function createSeedBookingRequestResolutionNotifications(params: {
  tables: SeedTables;
  booking: SeedRow;
  action: BookingRequestResolutionOutcome;
  actorUserId?: string | null;
  participantRowsByBooking: Map<string, SeedRow[]>;
  athleteUserIdsByAthleteId: Map<string, string | undefined>;
  reason: string;
  now: string;
}): number {
  const bookingId = asString(params.booking.id);
  if (!bookingId) {
    return 0;
  }
  const descriptor = bookingRequestResolutionDescriptor(params.action);
  const candidateRecipientIds = bookingRequestResolutionRecipientIds({
    action: params.action,
    actorUserId: params.actorUserId,
    coachUserId: asString(params.booking.coachUserId),
    bookedByUserId: asString(params.booking.bookedByUserId),
    participants: (params.participantRowsByBooking.get(bookingId) ?? []).map((participant) => {
      const athleteId = asString(participant.athleteId);
      return {
        guardianUserId: asString(participant.guardianUserId),
        athleteUserId: athleteId ? params.athleteUserIdsByAthleteId.get(athleteId) : undefined,
      };
    }),
  });
  const notifications = getMutableRows(params.tables, 'notifications');
  const existingRecipientIds = new Set(
    notifications
      .filter(
        (row) =>
          asString(row.sourceType) === descriptor.sourceType &&
          asString(row.sourceId) === bookingId,
      )
      .map((row) => asString(row.userId))
      .filter((userId): userId is string => Boolean(userId)),
  );
  const rows = bookingRequestResolutionNotificationRows({
    action: params.action,
    bookingId,
    actorUserId: params.actorUserId,
    recipientUserIds: candidateRecipientIds.filter((userId) => !existingRecipientIds.has(userId)),
    reason: params.reason,
    scheduledAt: asString(params.booking.scheduledAt),
    now: params.now,
  });
  notifications.push(...rows);
  return rows.length;
}
export function bookingFamilyRecipientIds(params: {
  actorUserId: string;
  bookedByUserId?: string | null;
  participants: Array<{
    guardianUserId?: string | null;
    athleteUserId?: string | null;
  }>;
}): string[] {
  const recipients = new Set<string>();
  if (params.bookedByUserId) {
    recipients.add(params.bookedByUserId);
  }
  for (const participant of params.participants) {
    if (participant.guardianUserId) {
      recipients.add(participant.guardianUserId);
    }
    if (participant.athleteUserId) {
      recipients.add(participant.athleteUserId);
    }
  }
  recipients.delete(params.actorUserId);
  return [...recipients].sort();
}
function bookingConfirmationNotificationRows(params: {
  bookingId: string;
  actorUserId: string;
  recipientUserIds: string[];
  scheduledAt?: string | null;
  now: string;
}): SeedRow[] {
  const scheduledAt = params.scheduledAt ? Date.parse(params.scheduledAt) : NaN;
  const dateLabel = Number.isFinite(scheduledAt)
    ? new Date(scheduledAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      })
    : 'an upcoming date';
  return params.recipientUserIds.map((userId) => ({
    id: newId('nfn'),
    userId,
    type: 'BOOKING_CONFIRMED',
    title: 'Booking confirmed',
    body: `Your booking on ${dateLabel} has been confirmed.`,
    status: 'UNREAD',
    sourceType: BOOKING_CONFIRMED_NOTIFICATION_SOURCE_TYPE,
    sourceId: params.bookingId,
    deepLink: `/bookings/${params.bookingId}`,
    metadataJson: {
      bookingId: params.bookingId,
      confirmedByUserId: params.actorUserId,
    },
    createdAt: params.now,
    updatedAt: params.now,
    readAt: null,
    dismissedAt: null,
  }));
}
function createSeedBookingConfirmationNotifications(params: {
  tables: SeedTables;
  booking: SeedRow;
  actorUserId: string;
  participantRowsByBooking: Map<string, SeedRow[]>;
  now: string;
}): number {
  const bookingId = asString(params.booking.id);
  if (!bookingId) {
    return 0;
  }
  const candidateRecipientIds = bookingFamilyRecipientIds({
    actorUserId: params.actorUserId,
    bookedByUserId: asString(params.booking.bookedByUserId),
    participants: (params.participantRowsByBooking.get(bookingId) ?? []).map((participant) => ({
      guardianUserId: asString(participant.guardianUserId),
    })),
  });
  const notifications = getMutableRows(params.tables, 'notifications');
  const existingRecipientIds = new Set(
    notifications
      .filter(
        (row) =>
          asString(row.sourceType) === BOOKING_CONFIRMED_NOTIFICATION_SOURCE_TYPE &&
          asString(row.sourceId) === bookingId,
      )
      .map((row) => asString(row.userId))
      .filter((userId): userId is string => Boolean(userId)),
  );
  const missingRecipientIds = candidateRecipientIds.filter(
    (userId) => !existingRecipientIds.has(userId),
  );
  notifications.push(
    ...bookingConfirmationNotificationRows({
      bookingId,
      actorUserId: params.actorUserId,
      recipientUserIds: missingRecipientIds,
      scheduledAt: asString(params.booking.scheduledAt),
      now: params.now,
    }),
  );
  return missingRecipientIds.length;
}
export function bookingCompletionNotificationRows(params: {
  bookingId: string;
  actorUserId: string;
  recipientUserIds: string[];
  attendanceSummary?: {
    attended: number;
    noShow: number;
  };
  now: string;
}): SeedRow[] {
  return params.recipientUserIds.flatMap((userId) => [
    {
      id: newId('nfn'),
      userId,
      type: 'BOOKING_COMPLETED',
      title: 'Session completed',
      body: 'Your booking has been marked complete.',
      status: 'UNREAD',
      sourceType: BOOKING_COMPLETED_NOTIFICATION_SOURCE_TYPE,
      sourceId: params.bookingId,
      deepLink: `/bookings/${params.bookingId}`,
      metadataJson: {
        bookingId: params.bookingId,
        completedByUserId: params.actorUserId,
        attendanceSummary: params.attendanceSummary ?? null,
      },
      createdAt: params.now,
      updatedAt: params.now,
      readAt: null,
      dismissedAt: null,
    },
    {
      id: newId('nfn'),
      userId,
      type: 'REVIEW_REQUEST',
      title: 'How was the session?',
      body: 'Rate your completed session.',
      status: 'UNREAD',
      sourceType: BOOKING_REVIEW_PROMPT_NOTIFICATION_SOURCE_TYPE,
      sourceId: params.bookingId,
      deepLink: `/bookings/${params.bookingId}`,
      metadataJson: {
        bookingId: params.bookingId,
        completedByUserId: params.actorUserId,
        attendanceSummary: params.attendanceSummary ?? null,
      },
      createdAt: params.now,
      updatedAt: params.now,
      readAt: null,
      dismissedAt: null,
    },
  ]);
}
function createSeedBookingCompletionNotifications(params: {
  tables: SeedTables;
  booking: SeedRow;
  actorUserId: string;
  participantRowsByBooking: Map<string, SeedRow[]>;
  athleteUserIdsByAthleteId: Map<string, string | undefined>;
  attendanceSummary?: {
    attended: number;
    noShow: number;
  };
  now: string;
}): number {
  const bookingId = asString(params.booking.id);
  if (!bookingId) {
    return 0;
  }
  const participants = (params.participantRowsByBooking.get(bookingId) ?? []).map((participant) => {
    const athleteId = asString(participant.athleteId);
    return {
      guardianUserId: asString(participant.guardianUserId),
      athleteUserId: athleteId ? params.athleteUserIdsByAthleteId.get(athleteId) : undefined,
    };
  });
  const candidateRecipientIds = bookingFamilyRecipientIds({
    actorUserId: params.actorUserId,
    bookedByUserId: asString(params.booking.bookedByUserId),
    participants,
  });
  if (candidateRecipientIds.length === 0) {
    return 0;
  }
  const notifications = getMutableRows(params.tables, 'notifications');
  const existingKeys = new Set(
    notifications
      .filter(
        (row) =>
          (asString(row.sourceType) === BOOKING_COMPLETED_NOTIFICATION_SOURCE_TYPE ||
            asString(row.sourceType) === BOOKING_REVIEW_PROMPT_NOTIFICATION_SOURCE_TYPE) &&
          asString(row.sourceId) === bookingId,
      )
      .map((row) => `${asString(row.sourceType) ?? ''}:${asString(row.userId) ?? ''}`),
  );
  const rows = bookingCompletionNotificationRows({
    bookingId,
    actorUserId: params.actorUserId,
    recipientUserIds: candidateRecipientIds,
    attendanceSummary: params.attendanceSummary,
    now: params.now,
  }).filter(
    (row) => !existingKeys.has(`${asString(row.sourceType) ?? ''}:${asString(row.userId) ?? ''}`),
  );
  if (rows.length === 0) {
    return 0;
  }
  notifications.push(...rows);
  return rows.length;
}
function getObjectiveValuesForBooking(tables: SeedTables, bookingId: string): string[] {
  return asRows(tables.bookingObjectives)
    .filter((objective) => asString(objective.bookingId) === bookingId)
    .sort((a, b) => (asNumber(a.sortOrder) ?? 0) - (asNumber(b.sortOrder) ?? 0))
    .flatMap((objective) => {
      const mapped = asString(objective.objective);
      return mapped ? [mapped] : [];
    });
}
function normalizeCompletionAttendance(params: {
  participantAthleteIds: string[];
  attendance?: CompleteBookingRequest['attendance'];
  fallbackNote?: string | null;
}): NormalizedCompletionAttendance[] {
  const participantAthleteIds = Array.from(new Set(params.participantAthleteIds));
  const participantAthleteIdSet = new Set(participantAthleteIds);
  const attendanceByAthleteId = new Map<string, BookingCompletionAttendance>();

  for (const row of params.attendance ?? []) {
    if (attendanceByAthleteId.has(row.athleteId)) {
      throw badRequest('Duplicate booking completion attendance entry', {
        athleteId: row.athleteId,
      });
    }
    if (!participantAthleteIdSet.has(row.athleteId)) {
      throw badRequest('Booking completion attendance athlete is not a booking participant', {
        athleteId: row.athleteId,
      });
    }
    attendanceByAthleteId.set(row.athleteId, row);
  }

  return participantAthleteIds.map((athleteId) => {
    const explicit = attendanceByAthleteId.get(athleteId);
    return {
      athleteId,
      status: explicit?.status ?? 'ATTENDED',
      notes: explicit?.notes ?? params.fallbackNote ?? null,
      effortRating: explicit?.effortRating ?? null,
    };
  });
}
function summarizeCompletionAttendance(attendance: NormalizedCompletionAttendance[]): {
  attended: number;
  noShow: number;
} {
  return attendance.reduce(
    (summary, row) => {
      if (row.status === 'NO_SHOW') {
        summary.noShow += 1;
      } else {
        summary.attended += 1;
      }
      return summary;
    },
    { attended: 0, noShow: 0 },
  );
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
function canUserWriteSeedBooking(
  tables: SeedTables,
  booking: SeedRow,
  authUserId: string,
  participantRowsByBooking = getParticipantRowsByBooking(tables),
): boolean {
  if (
    asString(booking.coachUserId) === authUserId ||
    asString(booking.bookedByUserId) === authUserId
  ) {
    return true;
  }
  const bookingId = asString(booking.id) ?? '';
  const participantRows = participantRowsByBooking.get(bookingId) ?? [];
  const athleteIds = Array.from(
    new Set(
      participantRows.flatMap((participant) => {
        const athleteId = asString(participant.athleteId);
        return athleteId ? [athleteId] : [];
      }),
    ),
  );
  if (athleteIds.length === 0) {
    return false;
  }
  return athleteIds.every((athleteId) =>
    participantRows.some(
      (participant) =>
        asString(participant.athleteId) === athleteId &&
        asString(participant.guardianUserId) === authUserId,
    ),
  );
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
    clubId: asString(booking.clubId) ?? null,
    bookedByUserId: asString(booking.bookedByUserId),
    recurringSeriesId: asString(booking.recurringSeriesId) ?? null,
    groupSessionId: asString(booking.groupSessionId) ?? null,
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
    requestExpiresAt: asString(booking.requestExpiresAt) ?? null,
    requestResolvedAt: asString(booking.requestResolvedAt) ?? null,
    requestResolutionReason: asString(booking.requestResolutionReason) ?? null,
  });
}
function mapNormalizedDbBookingRow(booking: SeedRow): BookingResponse {
  const objectives = asRows(booking.objectives)
    .sort((a, b) => (asNumber(a.sortOrder) ?? 0) - (asNumber(b.sortOrder) ?? 0))
    .flatMap((objective) => {
      const value = asString(objective.objective);
      return value ? [value] : [];
    });
  return bookingResponseSchema.parse({
    id: asString(booking.id),
    coachUserId: asString(booking.coachUserId),
    clubId: asString(booking.clubId) ?? null,
    bookedByUserId: asString(booking.bookedByUserId) ?? undefined,
    recurringSeriesId: asString(booking.recurringSeriesId) ?? null,
    groupSessionId: asString(booking.groupSessionId) ?? null,
    status: asString(booking.status),
    scheduledAt: asString(booking.scheduledAt),
    durationMinutes: asNumber(booking.durationMinutes) ?? 60,
    location: asString(booking.location) ?? 'TBD',
    serviceType: asString(booking.serviceType) ?? undefined,
    sessionTemplateId: null,
    objectives,
    notes: asString(booking.notes) ?? null,
    priceMinor: asNumber(booking.priceMinor) ?? null,
    currency: asString(booking.currency) ?? 'GBP',
    participants: asRows(booking.participants).map((participant) => ({
      athleteId: asString(participant.athleteId) ?? '',
      guardianUserId: asString(participant.guardianUserId),
      status: (asString(participant.status) ?? 'pending').toLowerCase(),
    })),
    version: asNumber(booking.version) ?? 1,
    createdAt: asString(booking.createdAt) ?? isoNow(),
    updatedAt: asString(booking.updatedAt) ?? isoNow(),
    cancelledAt: asString(booking.cancelledAt) ?? null,
    requestExpiresAt: asString(booking.requestExpiresAt) ?? null,
    requestResolvedAt: asString(booking.requestResolvedAt) ?? null,
    requestResolutionReason: asString(booking.requestResolutionReason) ?? null,
  });
}
function expireSeedBookingRequests(
  tables: SeedTables,
  options: { bookingId?: string; now?: Date } = {},
): number {
  const now = options.now ?? new Date();
  const nowIso = now.toISOString();
  const participantRowsByBooking = getParticipantRowsByBooking(tables);
  const athleteUserIdsByAthleteId = getAthleteUserIdsByAthleteId(tables);
  let expiredCount = 0;
  for (const booking of asRows(tables.bookings)) {
    const bookingId = asString(booking.id);
    const status = asString(booking.status)?.toUpperCase();
    if (
      !bookingId ||
      (options.bookingId && bookingId !== options.bookingId) ||
      asString(booking.deletedAt) ||
      !isAwaitingBookingRequest(status)
    ) {
      continue;
    }
    const storedCreatedAt = new Date(asString(booking.createdAt) ?? nowIso);
    const createdAt = Number.isFinite(storedCreatedAt.getTime()) ? storedCreatedAt : now;
    const storedRequestExpiresAt = asString(booking.requestExpiresAt);
    const parsedRequestExpiresAt = storedRequestExpiresAt ? new Date(storedRequestExpiresAt) : null;
    const expiresAt =
      parsedRequestExpiresAt && Number.isFinite(parsedRequestExpiresAt.getTime())
        ? parsedRequestExpiresAt
        : bookingRequestExpiresAt(asString(booking.scheduledAt) ?? nowIso, createdAt);
    booking.requestExpiresAt = expiresAt.toISOString();
    if (expiresAt.getTime() > now.getTime()) {
      continue;
    }
    const reason = 'Coach confirmation window expired';
    booking.status = 'EXPIRED';
    booking.requestResolvedAt = nowIso;
    booking.requestResolutionReason = reason;
    booking.updatedByUserId = BOOKING_REQUEST_EXPIRY_ACTOR_ID;
    booking.updatedAt = nowIso;
    booking.version = (asNumber(booking.version) ?? 1) + 1;
    getMutableRows(tables, 'bookingStatusEvents').push({
      id: newId('bse'),
      bookingId,
      fromStatus: status,
      toStatus: 'EXPIRED',
      actorUserId: null,
      reason,
      metadataJson: {
        source: 'api-runtime',
        requestExpiresAt: expiresAt.toISOString(),
      },
      requestId: null,
      occurredAt: nowIso,
    });
    createSeedBookingRequestResolutionNotifications({
      tables,
      booking,
      action: 'expire',
      actorUserId: null,
      participantRowsByBooking,
      athleteUserIdsByAthleteId,
      reason,
      now: nowIso,
    });
    getMutableRows(tables, 'auditEvents').push({
      id: newId('aud'),
      occurredAt: nowIso,
      requestId: null,
      actorUserId: null,
      actingRole: 'system',
      action: 'booking.request.expire',
      resourceType: 'booking',
      resourceId: bookingId,
      subjectUserId: asString(booking.bookedByUserId) ?? null,
      result: 'SUCCESS',
      sensitiveRead: false,
      ipHash: null,
      metadataJson: {
        previousStatus: status,
        requestExpiresAt: expiresAt.toISOString(),
      },
    });
    expiredCount += 1;
  }
  return expiredCount;
}
function mapSeedBookingsFromTables(
  tables: SeedTables,
  authUserId: string,
  statusFilter?: string,
): BookingResponse[] {
  expireSeedBookingRequests(tables);
  const bookings = asRows(tables.bookings);
  const normalizedStatus = statusFilter?.toUpperCase();
  if (normalizedStatus && !isSupportedBookingStatus(normalizedStatus)) {
    return [];
  }
  const athleteUserIdsByAthleteId = getAthleteUserIdsByAthleteId(tables);
  const participantRowsByBooking = getParticipantRowsByBooking(tables);
  const visible = bookings.filter((booking) => {
    if (asString(booking.deletedAt)) {
      return false;
    }
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
function upsertSeedBookingAttendanceRecords(params: {
  tables: SeedTables;
  booking: SeedRow;
  completionAttendance: NormalizedCompletionAttendance[];
  actorUserId: string;
  recordedAt: string;
}): CompletionAttendanceRecordRef[] {
  const attendanceRecords = getMutableRows(params.tables, 'attendanceRecords');
  const bookingId = asString(params.booking.id) ?? '';
  const focusAreas = getObjectiveValuesForBooking(params.tables, bookingId);
  const attendanceRecordRefs: CompletionAttendanceRecordRef[] = [];
  const attendanceByAthleteId = new Map(
    attendanceRecords.flatMap((row) => {
      if (asString(row.bookingId) !== bookingId) {
        return [];
      }
      const athleteId = asString(row.athleteId);
      return athleteId ? [[athleteId, row] as const] : [];
    }),
  );
  for (const attendance of params.completionAttendance) {
    const existing = attendanceByAthleteId.get(attendance.athleteId);
    if (existing) {
      existing.status = attendance.status;
      existing.notes = attendance.notes;
      existing.effortRating = attendance.effortRating;
      existing.focusAreasJson = focusAreas;
      existing.recordedByUserId = params.actorUserId;
      existing.recordedAt = params.recordedAt;
      existing.updatedAt = params.recordedAt;
      const existingId = asString(existing.id);
      if (existingId) {
        attendanceRecordRefs.push({
          athleteId: attendance.athleteId,
          id: existingId,
          status: attendance.status,
        });
      }
      continue;
    }
    const recordId = newId('att');
    const createdRecord = {
      id: recordId,
      bookingId,
      groupSessionId: asString(params.booking.groupSessionId) ?? null,
      athleteId: attendance.athleteId,
      status: attendance.status,
      notes: attendance.notes,
      effortRating: attendance.effortRating,
      focusAreasJson: focusAreas,
      recordedByUserId: params.actorUserId,
      recordedAt: params.recordedAt,
      createdAt: params.recordedAt,
      updatedAt: params.recordedAt,
    };
    attendanceRecords.push(createdRecord);
    attendanceByAthleteId.set(attendance.athleteId, createdRecord);
    attendanceRecordRefs.push({
      athleteId: attendance.athleteId,
      id: recordId,
      status: attendance.status,
    });
  }
  return attendanceRecordRefs;
}
function upsertSeedBookingCompletionSessionNotes(params: {
  tables: SeedTables;
  booking: SeedRow;
  attendanceRecordRefs: CompletionAttendanceRecordRef[];
  actorUserId: string;
  recordedAt: string;
  note?: string | null;
}): string[] {
  const noteText = params.note?.trim();
  if (!noteText) {
    return [];
  }
  const sessionNotes = getMutableRows(params.tables, 'sessionNotes');
  const bookingId = asString(params.booking.id) ?? '';
  const focusAreas = getObjectiveValuesForBooking(params.tables, bookingId);
  const sessionNoteIds: string[] = [];
  params.attendanceRecordRefs.forEach((attendanceRecordRef) => {
    if (attendanceRecordRef.status !== 'ATTENDED') {
      return;
    }
    const metadataJson = {
      source: 'booking-completion',
      proofSource: 'attendance-record',
      attendanceRecordId: attendanceRecordRef.id,
      attendanceRecordIds: [attendanceRecordRef.id],
      focus: focusAreas,
      completedAt: params.recordedAt,
    };
    const existing = sessionNotes.find(
      (row) =>
        asString(row.bookingId) === bookingId &&
        asString(row.athleteId) === attendanceRecordRef.athleteId &&
        asString(row.createdByUserId) === params.actorUserId &&
        !asString(row.deletedAt),
    );
    if (existing) {
      existing.groupSessionId = asString(params.booking.groupSessionId) ?? null;
      existing.coachUserId = params.actorUserId;
      existing.visibility = 'PUBLIC';
      existing.noteText = noteText;
      existing.metadataJson = metadataJson;
      existing.updatedByUserId = params.actorUserId;
      existing.updatedAt = params.recordedAt;
      existing.version = (asNumber(existing.version) ?? 1) + 1;
      sessionNoteIds.push(asString(existing.id) ?? '');
      return;
    }
    const sessionNoteId = newId('snt');
    sessionNotes.push({
      id: sessionNoteId,
      bookingId,
      groupSessionId: asString(params.booking.groupSessionId) ?? null,
      athleteId: attendanceRecordRef.athleteId,
      coachUserId: params.actorUserId,
      visibility: 'PUBLIC',
      noteText,
      privateNotesEncrypted: null,
      metadataJson,
      createdByUserId: params.actorUserId,
      updatedByUserId: params.actorUserId,
      version: 1,
      createdAt: params.recordedAt,
      updatedAt: params.recordedAt,
      deletedAt: null,
      deletedByUserId: null,
    });
    sessionNoteIds.push(sessionNoteId);
  });
  return sessionNoteIds.filter(Boolean);
}
function sessionNoteMetadata(input: BookingSessionNoteFields): SeedRow {
  return {
    source: 'session-notes-screen',
    focus: input.focus,
    improvements: input.improvements,
    homework: input.homework,
    effort: input.effort,
    attendance: input.attendance,
    videoUrls: input.videoUrls ?? [],
    imageUrls: input.imageUrls ?? [],
  };
}
function mapSessionNoteRow(row: SeedRow): BookingSessionNoteRecord {
  const metadata = asObject(row.metadataJson);
  return {
    id: asString(row.id) ?? '',
    bookingId: asString(row.bookingId) ?? '',
    athleteId: asString(row.athleteId) ?? '',
    summary: asString(row.noteText) ?? '',
    focus: asStringArray(metadata.focus),
    improvements: asString(metadata.improvements) ?? '',
    homework: asString(metadata.homework) ?? '',
    effort: asNumber(metadata.effort) ?? 3,
    attendance: asString(metadata.attendance) ?? '',
    videoUrls: asStringArray(metadata.videoUrls),
    imageUrls: asStringArray(metadata.imageUrls),
    updatedAt: asString(row.updatedAt) ?? asString(row.createdAt) ?? isoNow(),
  };
}
function canReadSessionNote(booking: BookingResponse, note: SeedRow, authUserId: string): boolean {
  return asString(note.visibility) !== 'COACH_ONLY' || booking.coachUserId === authUserId;
}
function getVisibleSeedBookingById(
  tables: SeedTables,
  authUserId: string,
  bookingId: string,
): BookingResponse {
  expireSeedBookingRequests(tables, { bookingId });
  const bookings = asRows(tables.bookings);
  const participantRowsByBooking = getParticipantRowsByBooking(tables);
  const athleteUserIdsByAthleteId = getAthleteUserIdsByAthleteId(tables);
  const booking = bookings.find(
    (row) => asString(row.id) === bookingId && !asString(row.deletedAt),
  );
  if (!booking) {
    throw notFound('Booking not found', {
      bookingId,
    });
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
    if (!isTerminalBookingStatus(normalized) && isSupportedBookingStatus(normalized)) {
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
  const latestCancelEvent = asRows(tables.bookingStatusEvents).reduce<SeedRow | undefined>(
    (latest, event) => {
      if (
        asString(event.bookingId) !== bookingId ||
        asString(event.toStatus)?.toUpperCase() !== 'CANCELLED'
      ) {
        return latest;
      }
      if (!latest) {
        return event;
      }
      return Date.parse(asString(event.occurredAt) ?? '') >
        Date.parse(asString(latest.occurredAt) ?? '')
        ? event
        : latest;
    },
    undefined,
  );
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
  const idempotentResponse = findSeedCreateBookingIdempotency({
    tables,
    authUserId,
    body,
  });
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
  const bookingClubId = asString(bookingRowOverrides?.clubId) ?? body.clubId ?? null;
  const overrideStatus = asString(bookingRowOverrides?.status)?.toUpperCase();
  const initialStatus =
    overrideStatus && isSupportedBookingStatus(overrideStatus)
      ? (overrideStatus as BookingStatusCode)
      : 'AWAITING_CONFIRMATION';
  const initialConfirmedAt =
    initialStatus === 'CONFIRMED' ? (asString(bookingRowOverrides?.confirmedAt) ?? now) : null;
  const requestExpiresAt = isAwaitingBookingRequest(initialStatus)
    ? (asString(bookingRowOverrides?.requestExpiresAt) ??
      bookingRequestExpiresAt(body.scheduledAt, new Date(now)).toISOString())
    : null;
  assertSeedBookingAthleteAccess(tables, authUserId, body.athleteIds);
  bookings.push({
    id: bookingId,
    coachUserId: body.coachUserId,
    bookedByUserId: body.bookedByUserId,
    clubId: bookingClubId,
    coachingOfferingId: null,
    status: initialStatus,
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
    confirmedAt: initialConfirmedAt,
    requestExpiresAt,
    requestResolvedAt: initialStatus === 'CONFIRMED' ? now : null,
    requestResolutionReason: null,
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
    fromStatus: null,
    toStatus: initialStatus,
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
    clubId: bookingClubId,
    bookedByUserId: body.bookedByUserId,
    recurringSeriesId: asString(bookingRowOverrides?.recurringSeriesId) ?? null,
    groupSessionId: asString(bookingRowOverrides?.groupSessionId) ?? null,
    status: initialStatus,
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
    requestExpiresAt,
    requestResolvedAt: initialStatus === 'CONFIRMED' ? now : null,
    requestResolutionReason: null,
  });
  recordSeedCreateBookingIdempotency({
    tables,
    authUserId,
    body,
    response,
    now,
  });
  return response;
}
class SeedBookingRepository implements BookingRepository {
  constructor(
    private readonly loadStore: () => {
      version: string | null;
      tables: SeedTables;
    } = getMarketplaceSeedStore,
  ) {}
  async listVisibleBookings(params: ListBookingsParams): Promise<ListBookingsResult> {
    const store = this.loadStore();
    return {
      bookings: mapSeedBookingsFromTables(store.tables, params.authUserId, params.statusFilter),
      dataVersion: store.version,
    };
  }
  async getVisibleBookingById(params: GetBookingParams): Promise<BookingResponse> {
    const store = this.loadStore();
    return getVisibleSeedBookingById(store.tables, params.authUserId, params.bookingId);
  }
  async getBookingSessionNote(params: GetBookingParams): Promise<BookingSessionNoteResult> {
    const store = this.loadStore();
    const booking = getVisibleSeedBookingById(store.tables, params.authUserId, params.bookingId);
    const note = asRows(store.tables.sessionNotes).find(
      (row) => asString(row.bookingId) === params.bookingId && !asString(row.deletedAt),
    );
    return {
      note:
        note && canReadSessionNote(booking, note, params.authUserId)
          ? mapSessionNoteRow(note)
          : null,
      dataVersion: store.version,
    };
  }
  async saveBookingSessionNote(
    params: SaveBookingSessionNoteParams,
  ): Promise<BookingSessionNoteResult> {
    const store = this.loadStore();
    const booking = getVisibleSeedBookingById(store.tables, params.authUserId, params.bookingId);
    if (booking.coachUserId !== params.authUserId) {
      throw forbidden('Only the assigned coach can submit session notes');
    }
    const participantRows = getParticipantRowsByBooking(store.tables).get(params.bookingId) ?? [];
    if (participantRows.length === 0) {
      throw badRequest('Booking has no athlete participants', {
        bookingId: params.bookingId,
      });
    }
    const sessionNotes = getMutableRows(store.tables, 'sessionNotes');
    const now = isoNow();
    const metadataJson = sessionNoteMetadata(params.input);
    const savedNotes: SeedRow[] = [];
    for (const participant of participantRows) {
      const athleteId = asString(participant.athleteId);
      if (!athleteId) {
        continue;
      }
      const existing = sessionNotes.find(
        (row) =>
          asString(row.bookingId) === params.bookingId &&
          asString(row.athleteId) === athleteId &&
          asString(row.createdByUserId) === params.authUserId &&
          !asString(row.deletedAt),
      );
      if (existing) {
        existing.coachUserId = params.authUserId;
        existing.visibility = 'PUBLIC';
        existing.noteText = params.input.summary;
        existing.metadataJson = metadataJson;
        existing.updatedByUserId = params.authUserId;
        existing.updatedAt = now;
        existing.version = (asNumber(existing.version) ?? 1) + 1;
        savedNotes.push(existing);
        continue;
      }
      const created = {
        id: newId('snt'),
        bookingId: params.bookingId,
        groupSessionId: null,
        athleteId,
        coachUserId: params.authUserId,
        visibility: 'PUBLIC',
        noteText: params.input.summary,
        privateNotesEncrypted: null,
        metadataJson,
        createdByUserId: params.authUserId,
        updatedByUserId: params.authUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      };
      sessionNotes.push(created);
      savedNotes.push(created);
    }
    return {
      note: savedNotes[0] ? mapSessionNoteRow(savedNotes[0]) : null,
      dataVersion: store.version,
    };
  }
  async createBooking(params: CreateBookingParams): Promise<BookingResponse> {
    const store = this.loadStore();
    return createBookingInSeedTables({
      tables: store.tables,
      authUserId: params.authUserId,
      requestId: params.requestId,
      body: params.body,
      bookingRowOverrides: params.bookingRowOverrides,
    });
  }
  async updateBooking(params: UpdateBookingParams): Promise<BookingResponse> {
    const store = this.loadStore();
    const bookings = asRows(store.tables.bookings);
    const participantRowsByBooking = getParticipantRowsByBooking(store.tables);
    const athleteUserIdsByAthleteId = getAthleteUserIdsByAthleteId(store.tables);
    const endpointKey = bookingUpdateEndpointKey(params.bookingId);
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
    expireSeedBookingRequests(store.tables, { bookingId: params.bookingId });
    const booking = bookings.find(
      (row) => asString(row.id) === params.bookingId && !asString(row.deletedAt),
    );
    if (!booking) {
      throw notFound('Booking not found', {
        bookingId: params.bookingId,
      });
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
    if (
      !canUserWriteSeedBooking(store.tables, booking, params.authUserId, participantRowsByBooking)
    ) {
      throw forbidden(
        'Only the assigned coach, booking owner, or linked guardian can update this booking',
      );
    }
    const currentStatus = asString(booking.status)?.toUpperCase();
    if (!currentStatus || !isSupportedBookingStatus(currentStatus)) {
      throw badRequest('Booking has an unsupported status', {
        bookingId: params.bookingId,
        status: currentStatus ?? null,
      });
    }
    if (isTerminalBookingStatus(currentStatus)) {
      throw badRequest('Only active bookings can be updated');
    }
    assertExpectedBookingVersion(asNumber(booking.version) ?? 1, params.body.expectedVersion);
    if (params.body.scheduledAt && Date.parse(params.body.scheduledAt) <= Date.now()) {
      throw badRequest('Booking scheduledAt must be in the future');
    }

    const changedFields: string[] = [];
    const setIfChanged = (field: string, value: unknown): void => {
      if (value === undefined || booking[field] === value) {
        return;
      }
      booking[field] = value;
      changedFields.push(field);
    };
    setIfChanged('scheduledAt', params.body.scheduledAt);
    setIfChanged('durationMinutes', params.body.durationMinutes);
    setIfChanged('location', params.body.location);
    setIfChanged('serviceType', params.body.serviceType);
    setIfChanged('notes', params.body.notes);
    setIfChanged('priceMinor', params.body.priceMinor);
    setIfChanged('currency', params.body.currency);

    if (params.body.objectives !== undefined) {
      const objectiveRows = getMutableRows(store.tables, 'bookingObjectives');
      for (let index = objectiveRows.length - 1; index >= 0; index -= 1) {
        if (asString(objectiveRows[index]?.bookingId) === params.bookingId) {
          objectiveRows.splice(index, 1);
        }
      }
      params.body.objectives.forEach((objective, index) => {
        objectiveRows.push({
          id: newId('bobj'),
          bookingId: params.bookingId,
          objective,
          sortOrder: index,
          createdAt: isoNow(),
        });
      });
      changedFields.push('objectives');
    }

    const now = isoNow();
    booking.updatedByUserId = params.authUserId;
    booking.updatedAt = now;
    booking.version = (asNumber(booking.version) ?? 1) + 1;
    getMutableRows(store.tables, 'bookingStatusEvents').push({
      id: newId('bse'),
      bookingId: params.bookingId,
      fromStatus: currentStatus,
      toStatus: currentStatus,
      actorUserId: params.authUserId,
      reason: 'Booking details updated',
      metadataJson: {
        changedFields,
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
  async cancelBooking(params: CancelBookingParams): Promise<BookingResponse> {
    const store = this.loadStore();
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
    const booking = bookings.find(
      (row) => asString(row.id) === params.bookingId && !asString(row.deletedAt),
    );
    if (!booking) {
      throw notFound('Booking not found', {
        bookingId: params.bookingId,
      });
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
    if (isAwaitingBookingRequest(currentStatus)) {
      throw conflict('Awaiting requests must be declined or withdrawn, not cancelled');
    }
    if (isTerminalBookingStatus(currentStatus)) {
      throw badRequest('Terminal bookings cannot be cancelled');
    }
    const scheduledAt = Date.parse(asString(booking.scheduledAt) ?? '');
    if (!Number.isFinite(scheduledAt) || scheduledAt <= Date.now()) {
      throw badRequest('Only upcoming bookings can be cancelled');
    }
    await applyBookingCancellationInvoiceEffects({
      bookingId: params.bookingId,
      actorUserId: params.authUserId,
      reason: params.body.reason,
      requestId: params.requestId,
    });
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
    createSeedBookingCancellationNotifications({
      tables: store.tables,
      booking,
      actorUserId: params.authUserId,
      participantRowsByBooking,
      athleteUserIdsByAthleteId,
      reason: params.body.reason,
      now,
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
  async resolveBookingRequest(params: ResolveBookingRequestParams): Promise<BookingResponse> {
    const store = this.loadStore();
    const endpointKey = bookingLifecycleEndpointKey(params.bookingId, params.action);
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
    expireSeedBookingRequests(store.tables, { bookingId: params.bookingId });
    const bookings = asRows(store.tables.bookings);
    const booking = bookings.find(
      (row) => asString(row.id) === params.bookingId && !asString(row.deletedAt),
    );
    if (!booking) {
      throw notFound('Booking not found', { bookingId: params.bookingId });
    }
    const participantRowsByBooking = getParticipantRowsByBooking(store.tables);
    const athleteUserIdsByAthleteId = getAthleteUserIdsByAthleteId(store.tables);
    const participantRows = participantRowsByBooking.get(params.bookingId) ?? [];
    if (params.action === 'decline') {
      if (asString(booking.coachUserId) !== params.authUserId) {
        throw forbidden('Only the assigned coach can decline this booking request');
      }
    } else {
      const isGuardianForEveryParticipant =
        participantRows.length > 0 &&
        participantRows.every(
          (participant) => asString(participant.guardianUserId) === params.authUserId,
        );
      const canWithdraw =
        asString(booking.bookedByUserId) === params.authUserId ||
        isGuardianForEveryParticipant;
      if (!canWithdraw) {
        throw forbidden('Only the requester or an assigned guardian can withdraw this request');
      }
    }
    const descriptor = bookingRequestResolutionDescriptor(params.action);
    const currentStatus = asString(booking.status)?.toUpperCase();
    if (currentStatus === descriptor.status) {
      return mapSeedBookingRow(store.tables, booking, participantRowsByBooking);
    }
    assertExpectedBookingVersion(asNumber(booking.version) ?? 1, params.body.expectedVersion);
    if (!isAwaitingBookingRequest(currentStatus)) {
      throw conflict('Only awaiting booking requests can be resolved', {
        bookingId: params.bookingId,
        status: currentStatus,
      });
    }
    const now = isoNow();
    booking.status = descriptor.status;
    booking.requestResolvedAt = now;
    booking.requestResolutionReason = params.body.reason;
    booking.updatedByUserId = params.authUserId;
    booking.updatedAt = now;
    booking.version = (asNumber(booking.version) ?? 1) + 1;
    getMutableRows(store.tables, 'bookingStatusEvents').push({
      id: newId('bse'),
      bookingId: params.bookingId,
      fromStatus: currentStatus,
      toStatus: descriptor.status,
      actorUserId: params.authUserId,
      reason: params.body.reason,
      metadataJson: {
        action: params.action,
        note: params.body.note ?? null,
        source: 'api-runtime',
      },
      requestId: params.requestId,
      occurredAt: now,
    });
    createSeedBookingRequestResolutionNotifications({
      tables: store.tables,
      booking,
      action: params.action,
      actorUserId: params.authUserId,
      participantRowsByBooking,
      athleteUserIdsByAthleteId,
      reason: params.body.reason,
      now,
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
  async confirmBooking(params: ConfirmBookingParams): Promise<BookingResponse> {
    const store = this.loadStore();
    const bookings = asRows(store.tables.bookings);
    const statusEvents = asRows(store.tables.bookingStatusEvents);
    const participantRowsByBooking = getParticipantRowsByBooking(store.tables);
    const endpointKey = bookingLifecycleEndpointKey(params.bookingId, 'confirm');
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
    expireSeedBookingRequests(store.tables, { bookingId: params.bookingId });
    const booking = bookings.find(
      (row) => asString(row.id) === params.bookingId && !asString(row.deletedAt),
    );
    if (!booking) {
      throw notFound('Booking not found', {
        bookingId: params.bookingId,
      });
    }
    if (asString(booking.coachUserId) !== params.authUserId) {
      throw forbidden('Only the assigned coach can confirm this booking');
    }
    const currentStatus = asString(booking.status)?.toUpperCase();
    if (currentStatus === 'CONFIRMED') {
      return mapSeedBookingRow(store.tables, booking, participantRowsByBooking);
    }
    assertExpectedBookingVersion(asNumber(booking.version) ?? 1, params.body.expectedVersion);
    if (isTerminalBookingStatus(currentStatus)) {
      throw badRequest('Terminal bookings cannot be confirmed', {
        bookingId: params.bookingId,
        status: currentStatus,
      });
    }
    if (currentStatus !== 'PENDING' && currentStatus !== 'AWAITING_CONFIRMATION') {
      throw badRequest('Only pending bookings can be confirmed', {
        bookingId: params.bookingId,
        status: currentStatus,
      });
    }
    const scheduledAt = Date.parse(asString(booking.scheduledAt) ?? '');
    if (!Number.isFinite(scheduledAt) || scheduledAt <= Date.now()) {
      throw badRequest('Only upcoming booking requests can be confirmed', {
        bookingId: params.bookingId,
      });
    }
    const now = isoNow();
    booking.status = 'CONFIRMED';
    booking.confirmedAt = now;
    booking.requestResolvedAt = now;
    booking.requestResolutionReason = null;
    booking.updatedByUserId = params.authUserId;
    booking.updatedAt = now;
    booking.version = (asNumber(booking.version) ?? 1) + 1;
    statusEvents.push({
      id: newId('bse'),
      bookingId: params.bookingId,
      fromStatus: currentStatus,
      toStatus: 'CONFIRMED',
      actorUserId: params.authUserId,
      reason: 'Booking confirmed',
      metadataJson: {
        note: params.body.note ?? null,
        source: 'api-runtime',
      },
      requestId: params.requestId,
      occurredAt: now,
    });
    createSeedBookingConfirmationNotifications({
      tables: store.tables,
      booking,
      actorUserId: params.authUserId,
      participantRowsByBooking,
      now,
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
    const store = this.loadStore();
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
      throw notFound('Booking not found', {
        bookingId: params.bookingId,
      });
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
    await applyBookingReopenInvoiceEffects({
      bookingId: params.bookingId,
      actorUserId: params.authUserId,
      reason: 'Booking reopened',
      requestId: params.requestId,
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
  async completeBooking(params: CompleteBookingParams): Promise<BookingResponse> {
    const store = this.loadStore();
    const bookings = asRows(store.tables.bookings);
    const statusEvents = asRows(store.tables.bookingStatusEvents);
    const participantRowsByBooking = getParticipantRowsByBooking(store.tables);
    const athleteUserIdsByAthleteId = getAthleteUserIdsByAthleteId(store.tables);
    const endpointKey = bookingLifecycleEndpointKey(params.bookingId, 'complete');
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
      throw notFound('Booking not found', {
        bookingId: params.bookingId,
      });
    }
    if (asString(booking.coachUserId) !== params.authUserId) {
      throw forbidden('Only the assigned coach can complete this booking');
    }
    const currentStatus = asString(booking.status)?.toUpperCase();
    if (currentStatus === 'COMPLETED') {
      return mapSeedBookingRow(store.tables, booking, participantRowsByBooking);
    }
    assertExpectedBookingVersion(asNumber(booking.version) ?? 1, params.body.expectedVersion);
    if (currentStatus === 'CANCELLED') {
      throw badRequest('Cancelled bookings cannot be completed');
    }
    if (currentStatus !== 'CONFIRMED' && currentStatus !== 'AWAITING_COMPLETION') {
      throw badRequest('Only confirmed bookings can be completed', {
        bookingId: params.bookingId,
        status: currentStatus,
      });
    }
    const completedAt = params.body.completedAt ?? isoNow();
    const completedAtMs = Date.parse(completedAt);
    if (!Number.isFinite(completedAtMs)) {
      throw badRequest('Completed-at timestamp is invalid', {
        completedAt,
      });
    }
    const scheduledAt = Date.parse(asString(booking.scheduledAt) ?? '');
    if (!Number.isFinite(scheduledAt) || scheduledAt > completedAtMs) {
      throw badRequest('Bookings cannot be completed before their scheduled start time', {
        bookingId: params.bookingId,
      });
    }
    const participantRows = participantRowsByBooking.get(params.bookingId) ?? [];
    const completionAttendance = normalizeCompletionAttendance({
      participantAthleteIds: participantRows.flatMap((participant) => {
        const athleteId = asString(participant.athleteId);
        return athleteId ? [athleteId] : [];
      }),
      attendance: params.body.attendance,
      fallbackNote: params.body.note ?? null,
    });
    const attendanceRecordRefs = upsertSeedBookingAttendanceRecords({
      tables: store.tables,
      booking,
      completionAttendance,
      actorUserId: params.authUserId,
      recordedAt: completedAt,
    });
    const attendanceRecordIds = attendanceRecordRefs.map((ref) => ref.id);
    const sessionNoteIds = upsertSeedBookingCompletionSessionNotes({
      tables: store.tables,
      booking,
      attendanceRecordRefs,
      actorUserId: params.authUserId,
      recordedAt: completedAt,
      note: params.body.note ?? null,
    });
    const attendanceSummary = summarizeCompletionAttendance(completionAttendance);
    booking.status = 'COMPLETED';
    booking.updatedByUserId = params.authUserId;
    booking.updatedAt = completedAt;
    booking.version = (asNumber(booking.version) ?? 1) + 1;
    statusEvents.push({
      id: newId('bse'),
      bookingId: params.bookingId,
      fromStatus: currentStatus,
      toStatus: 'COMPLETED',
      actorUserId: params.authUserId,
      reason: 'Booking completed',
      metadataJson: {
        note: params.body.note ?? null,
        source: 'api-runtime',
        attendanceRecordIds,
        sessionNoteIds,
        attendanceSummary,
        proofSource: 'attendance-record',
        proofSources: sessionNoteIds.length
          ? ['attendance-record', 'session-note']
          : ['attendance-record'],
      },
      requestId: params.requestId,
      occurredAt: completedAt,
    });
    createSeedBookingCompletionNotifications({
      tables: store.tables,
      booking,
      actorUserId: params.authUserId,
      participantRowsByBooking,
      athleteUserIdsByAthleteId,
      attendanceSummary,
      now: completedAt,
    });
    const response = mapSeedBookingRow(store.tables, booking, participantRowsByBooking);
    recordSeedLifecycleBookingIdempotency({
      tables: store.tables,
      authUserId: params.authUserId,
      endpointKey,
      idempotencyKey: params.body.idempotencyKey,
      requestHash,
      response,
      now: completedAt,
    });
    return response;
  }
}
export async function resolveCreateBookingIdempotency(params: {
  authUserId: string;
  body: CreateBookingRequest;
}): Promise<{
  responseStatus: number;
  response: BookingResponse;
} | null> {
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
  return {
    responseStatus: entry.responseStatus,
    response,
  };
}
async function resolveLifecycleBookingIdempotency(params: {
  authUserId: string;
  bookingId: string;
  action: 'cancel' | 'confirm' | 'reopen' | 'complete' | 'update' | BookingRequestResolutionAction;
  body:
    | CancelBookingRequest
    | ConfirmBookingRequest
    | ReopenBookingRequest
    | ResolveBookingRequest
    | CompleteBookingRequest
    | UpdateBookingRequest;
}): Promise<{
  responseStatus: number;
  response: BookingResponse;
} | null> {
  if (!params.body.idempotencyKey) {
    return null;
  }
  const endpointKey =
    params.action === 'update'
      ? bookingUpdateEndpointKey(params.bookingId)
      : bookingLifecycleEndpointKey(params.bookingId, params.action);
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
    throw conflict('Idempotency key was already used with a different booking payload');
  }
  const response = parseIdempotentBookingResponse(entry.responseBodyJson);
  if (!response) {
    throw conflict('Stored idempotency response is no longer valid');
  }
  return {
    responseStatus: entry.responseStatus,
    response,
  };
}
function canUserWriteDbBooking(params: {
  authUserId: string;
  booking: {
    coachUserId: string;
    bookedByUserId: string | null;
    participants: Array<{
      athleteId: string;
      guardianUserId: string | null;
    }>;
  };
}): boolean {
  if (
    params.booking.coachUserId === params.authUserId ||
    params.booking.bookedByUserId === params.authUserId
  ) {
    return true;
  }
  const athleteIds = Array.from(new Set(params.booking.participants.map((row) => row.athleteId)));
  if (athleteIds.length === 0) {
    return false;
  }
  return athleteIds.every((athleteId) =>
    params.booking.participants.some(
      (participant) =>
        participant.athleteId === athleteId && participant.guardianUserId === params.authUserId,
    ),
  );
}
async function expireDbBookingRequests(
  prisma: ReturnType<typeof getPrismaClientOrThrow>,
  params: { authUserId: string; bookingId?: string; now?: Date },
): Promise<number> {
  const now = params.now ?? new Date();
  const candidates = await prisma.booking.findMany({
    where: {
      ...(params.bookingId ? { id: params.bookingId } : {}),
      deletedAt: null,
      status: { in: ['PENDING', 'AWAITING_CONFIRMATION'] },
      requestExpiresAt: { lte: now },
      OR: [
        { coachUserId: params.authUserId },
        { bookedByUserId: params.authUserId },
        {
          participants: {
            some: { guardianUserId: params.authUserId, deletedAt: null },
          },
        },
        {
          participants: {
            some: {
              deletedAt: null,
              athlete: { userId: params.authUserId },
            },
          },
        },
      ],
    },
    include: {
      participants: {
        where: { deletedAt: null },
        include: { athlete: { select: { userId: true } } },
      },
    },
    orderBy: { requestExpiresAt: 'asc' },
    take: params.bookingId ? 1 : 200,
  });
  let expiredCount = 0;
  for (const booking of candidates) {
    const reason = 'Coach confirmation window expired';
    const committed = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.booking.updateMany({
        where: {
          id: booking.id,
          version: booking.version,
          deletedAt: null,
          status: { in: ['PENDING', 'AWAITING_CONFIRMATION'] },
          requestExpiresAt: { lte: now },
        },
        data: {
          status: 'EXPIRED',
          requestResolvedAt: now,
          requestResolutionReason: reason,
          updatedByUserId: BOOKING_REQUEST_EXPIRY_ACTOR_ID,
          updatedAt: now,
          version: { increment: 1 },
        },
      });
      if (updateResult.count !== 1) {
        return false;
      }
      await tx.bookingStatusEvent.create({
        data: {
          id: newId('bse'),
          bookingId: booking.id,
          fromStatus: booking.status,
          toStatus: 'EXPIRED',
          actorUserId: null,
          reason,
          metadataJson: {
            source: 'api-db-runtime',
            requestExpiresAt: booking.requestExpiresAt?.toISOString() ?? null,
          },
          requestId: null,
          occurredAt: now,
        },
      });
      const recipientUserIds = bookingRequestResolutionRecipientIds({
        action: 'expire',
        actorUserId: null,
        coachUserId: booking.coachUserId,
        bookedByUserId: booking.bookedByUserId,
        participants: booking.participants.map((participant) => ({
          guardianUserId: participant.guardianUserId,
          athleteUserId: participant.athlete.userId,
        })),
      });
      if (recipientUserIds.length > 0) {
        const existingNotifications = await tx.notification.findMany({
          where: {
            userId: { in: recipientUserIds },
            sourceType: BOOKING_REQUEST_EXPIRED_NOTIFICATION_SOURCE_TYPE,
            sourceId: booking.id,
          },
          select: { userId: true },
        });
        const existingRecipientIds = new Set(
          existingNotifications.map((notification) => notification.userId),
        );
        const missingRecipientIds = recipientUserIds.filter(
          (userId) => !existingRecipientIds.has(userId),
        );
        const rows = bookingRequestResolutionNotificationRows({
          action: 'expire',
          bookingId: booking.id,
          actorUserId: null,
          recipientUserIds: missingRecipientIds,
          reason,
          scheduledAt: booking.scheduledAt.toISOString(),
          now: now.toISOString(),
        });
        if (rows.length > 0) {
          await tx.notification.createMany({
            data: rows.map((row) => ({
              id: asString(row.id) ?? newId('nfn'),
              userId: asString(row.userId) ?? '',
              type: asString(row.type) ?? 'BOOKING_REQUEST_EXPIRED',
              title: asString(row.title) ?? 'Booking request expired',
              body: asString(row.body) ?? null,
              status: 'UNREAD',
              sourceType: BOOKING_REQUEST_EXPIRED_NOTIFICATION_SOURCE_TYPE,
              sourceId: booking.id,
              deepLink: asString(row.deepLink) ?? `/bookings/${booking.id}`,
              metadataJson: row.metadataJson as never,
              createdAt: now,
              updatedAt: now,
            })),
          });
        }
      }
      await tx.auditEvent.create({
        data: {
          id: newId('aud'),
          occurredAt: now,
          requestId: null,
          actorUserId: null,
          actingRole: 'system',
          action: 'booking.request.expire',
          resourceType: 'booking',
          resourceId: booking.id,
          subjectUserId: booking.bookedByUserId,
          result: 'SUCCESS',
          sensitiveRead: false,
          metadataJson: {
            previousStatus: booking.status,
            requestExpiresAt: booking.requestExpiresAt?.toISOString() ?? null,
          },
        },
      });
      return true;
    }, API_DB_TRANSACTION_OPTIONS);
    if (committed) {
      expiredCount += 1;
    }
  }
  return expiredCount;
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
    await expireDbBookingRequests(prisma, { authUserId: params.authUserId });
    const normalizedStatus = params.statusFilter?.toUpperCase();
    if (normalizedStatus && !isSupportedBookingStatus(normalizedStatus)) {
      return {
        bookings: [],
        dataVersion: null,
      };
    }
    const statusValue = normalizedStatus ? (normalizedStatus as BookingStatusCode) : undefined;
    const bookings = await prisma.booking.findMany({
      where: {
        deletedAt: null,
        ...(statusValue
          ? {
              status: statusValue,
            }
          : {}),
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
                deletedAt: null,
              },
            },
          },
          {
            participants: {
              some: {
                deletedAt: null,
                athlete: {
                  userId: params.authUserId,
                },
              },
            },
          },
        ],
      },
      include: {
        participants: {
          where: {
            deletedAt: null,
          },
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
        .flatMap((objective) => {
          const mapped = asString(objective.objective);
          return Boolean(mapped) ? [mapped] : [];
        });
      return bookingResponseSchema.parse({
        id: asString(booking.id),
        coachUserId: asString(booking.coachUserId),
        clubId: asString(booking.clubId) ?? null,
        bookedByUserId: asString(booking.bookedByUserId) ?? undefined,
        recurringSeriesId: asString(booking.recurringSeriesId) ?? null,
        groupSessionId: asString(booking.groupSessionId) ?? null,
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
        requestExpiresAt: asString(booking.requestExpiresAt) ?? null,
        requestResolvedAt: asString(booking.requestResolvedAt) ?? null,
        requestResolutionReason: asString(booking.requestResolutionReason) ?? null,
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
    await expireDbBookingRequests(prisma, {
      authUserId: params.authUserId,
      bookingId: params.bookingId,
    });
    const booking = await prisma.booking.findFirst({
      where: {
        id: params.bookingId,
        deletedAt: null,
      },
      include: {
        participants: {
          where: {
            deletedAt: null,
          },
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
    });
    if (!booking) {
      throw notFound('Booking not found', {
        bookingId: params.bookingId,
      });
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
        clubId: booking.clubId ?? null,
        bookedByUserId: booking.bookedByUserId ?? undefined,
        recurringSeriesId: booking.recurringSeriesId ?? null,
        groupSessionId: booking.groupSessionId ?? null,
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
        requestExpiresAt: booking.requestExpiresAt?.toISOString() ?? null,
        requestResolvedAt: booking.requestResolvedAt?.toISOString() ?? null,
        requestResolutionReason: booking.requestResolutionReason ?? null,
      }),
    );
  }
  async getBookingSessionNote(params: GetBookingParams): Promise<BookingSessionNoteResult> {
    if (shouldUseDbFixtureFallback()) {
      const seedRepository = new SeedBookingRepository(getDbFixtureStore);
      return seedRepository.getBookingSessionNote(params);
    }
    const booking = await this.getVisibleBookingById(params);
    const prisma = getPrismaClientOrThrow();
    const note = await prisma.sessionNote.findFirst({
      where: {
        bookingId: params.bookingId,
        deletedAt: null,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    const normalizedNote = note ? (normalizeForJson(note) as SeedRow) : null;
    return {
      note:
        normalizedNote && canReadSessionNote(booking, normalizedNote, params.authUserId)
          ? mapSessionNoteRow(normalizedNote)
          : null,
      dataVersion: null,
    };
  }
  async saveBookingSessionNote(
    params: SaveBookingSessionNoteParams,
  ): Promise<BookingSessionNoteResult> {
    if (shouldUseDbFixtureFallback()) {
      const seedRepository = new SeedBookingRepository(getDbFixtureStore);
      return seedRepository.saveBookingSessionNote(params);
    }
    const bookingResponse = await this.getVisibleBookingById(params);
    if (bookingResponse.coachUserId !== params.authUserId) {
      throw forbidden('Only the assigned coach can submit session notes');
    }
    const prisma = getPrismaClientOrThrow();
    const booking = await prisma.booking.findUnique({
      where: {
        id: params.bookingId,
      },
      include: {
        participants: {
          where: {
            deletedAt: null,
          },
        },
      },
    });
    if (!booking) {
      throw notFound('Booking not found', {
        bookingId: params.bookingId,
      });
    }
    if (booking.participants.length === 0) {
      throw badRequest('Booking has no athlete participants', {
        bookingId: params.bookingId,
      });
    }
    const metadataJson = sessionNoteMetadata(params.input);
    const savedNotes = await prisma.$transaction(async (tx) => {
      const rows = [];
      for (const participant of booking.participants) {
        const existing = await tx.sessionNote.findFirst({
          where: {
            bookingId: params.bookingId,
            athleteId: participant.athleteId,
            createdByUserId: params.authUserId,
            deletedAt: null,
          },
        });
        if (existing) {
          rows.push(
            await tx.sessionNote.update({
              where: {
                id: existing.id,
              },
              data: {
                groupSessionId: booking.groupSessionId ?? null,
                coachUserId: params.authUserId,
                visibility: 'PUBLIC',
                noteText: params.input.summary,
                metadataJson: metadataJson as never,
                updatedByUserId: params.authUserId,
                version: {
                  increment: 1,
                },
              },
            }),
          );
          continue;
        }
        rows.push(
          await tx.sessionNote.create({
            data: {
              id: newId('snt'),
              bookingId: params.bookingId,
              groupSessionId: booking.groupSessionId ?? null,
              athleteId: participant.athleteId,
              coachUserId: params.authUserId,
              visibility: 'PUBLIC',
              noteText: params.input.summary,
              privateNotesEncrypted: null,
              metadataJson: metadataJson as never,
              createdByUserId: params.authUserId,
              updatedByUserId: params.authUserId,
            },
          }),
        );
      }
      return rows;
    }, API_DB_TRANSACTION_OPTIONS);
    return {
      note: savedNotes[0] ? mapSessionNoteRow(normalizeForJson(savedNotes[0]) as SeedRow) : null,
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
        bookingRowOverrides: params.bookingRowOverrides,
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
    const requestExpiresAt = bookingRequestExpiresAt(body.scheduledAt, now);
    const bookingClubId = params.bookingRowOverrides?.clubId ?? body.clubId ?? null;
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
      clubId: bookingClubId,
      bookedByUserId: body.bookedByUserId,
      recurringSeriesId: null,
      groupSessionId: null,
      status: 'AWAITING_CONFIRMATION',
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
      requestExpiresAt: requestExpiresAt.toISOString(),
      requestResolvedAt: null,
      requestResolutionReason: null,
    });
    try {
      const persistedResponse = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw(
          Prisma.sql`SELECT TRUE AS "locked" FROM pg_advisory_xact_lock(${bookingReservationLockKey(body.coachUserId)})`,
        );
        if (body.idempotencyKey) {
          const lockedReplay = await tx.idempotencyKey.findUnique({
            where: {
              userId_endpointKey_idempotencyKey: {
                userId: params.authUserId,
                endpointKey: BOOKING_CREATE_ENDPOINT_KEY,
                idempotencyKey: body.idempotencyKey,
              },
            },
          });
          if (lockedReplay) {
            assertMatchingIdempotencyRequest(lockedReplay, hashCreateBookingRequest(body));
            const parsedReplay = parseIdempotentBookingResponse(lockedReplay.responseBodyJson);
            if (!parsedReplay) {
              throw conflict('Stored idempotency response is no longer valid');
            }
            return parsedReplay;
          }
        }
        const availability = await resolveCoachAvailabilityTables(body.coachUserId, tx);
        assertCoachAvailabilitySlotOpen({
          tables: availability.tables,
          coachUserId: body.coachUserId,
          scheduledAt: body.scheduledAt,
          durationMinutes: body.durationMinutes,
          sessionTemplateId: body.sessionTemplateId,
          applySchedulingRules: true,
          conflictOnUnavailable: true,
          now,
        });
        await tx.booking.create({
          data: {
            id: bookingId,
            coachUserId: body.coachUserId,
            bookedByUserId: body.bookedByUserId,
            clubId: bookingClubId,
            status: 'AWAITING_CONFIRMATION',
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
            confirmedAt: null,
            requestExpiresAt,
            requestResolvedAt: null,
            requestResolutionReason: null,
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
            fromStatus: null,
            toStatus: 'AWAITING_CONFIRMATION',
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
        return response;
      }, API_DB_TRANSACTION_OPTIONS);
      return normalizeForJson(persistedResponse);
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
  }
  async updateBooking(params: UpdateBookingParams): Promise<BookingResponse> {
    if (shouldUseDbFixtureFallback()) {
      const seedRepository = new SeedBookingRepository(getDbFixtureStore);
      return seedRepository.updateBooking(params);
    }
    const prisma = getPrismaClientOrThrow();
    const idempotentResponse = await resolveLifecycleBookingIdempotency({
      authUserId: params.authUserId,
      bookingId: params.bookingId,
      action: 'update',
      body: params.body,
    });
    if (idempotentResponse) {
      return idempotentResponse.response;
    }
    await expireDbBookingRequests(prisma, {
      authUserId: params.authUserId,
      bookingId: params.bookingId,
    });
    const booking = await prisma.booking.findUnique({
      where: {
        id: params.bookingId,
      },
      include: {
        participants: {
          where: {
            deletedAt: null,
          },
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
    });
    if (!booking || booking.deletedAt) {
      throw notFound('Booking not found', {
        bookingId: params.bookingId,
      });
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
    if (
      !canUserWriteDbBooking({
        authUserId: params.authUserId,
        booking,
      })
    ) {
      throw forbidden(
        'Only the assigned coach, booking owner, or participant guardian can update this booking',
      );
    }
    if (isTerminalBookingStatus(booking.status)) {
      throw badRequest('Only active bookings can be updated');
    }
    assertExpectedBookingVersion(Number(booking.version), params.body.expectedVersion);
    const updateData: {
      scheduledAt?: Date;
      durationMinutes?: number;
      location?: string;
      serviceType?: string;
      notes?: string;
      priceMinor?: number;
      currency?: 'GBP';
      objectivesJson?: Record<string, string | null>;
      requestExpiresAt?: Date;
    } = {};
    const changedFields: string[] = [];
    if (params.body.scheduledAt !== undefined) {
      const scheduledAt = new Date(params.body.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime())) {
        throw badRequest('Booking scheduledAt must be a valid ISO datetime');
      }
      if (scheduledAt.getTime() <= Date.now()) {
        throw badRequest('Booking scheduledAt must be in the future');
      }
      if (booking.scheduledAt.toISOString() !== scheduledAt.toISOString()) {
        updateData.scheduledAt = scheduledAt;
        if (
          isAwaitingBookingRequest(booking.status) &&
          (!booking.requestExpiresAt || scheduledAt < booking.requestExpiresAt)
        ) {
          updateData.requestExpiresAt = scheduledAt;
        }
        changedFields.push('scheduledAt');
      }
    }
    if (
      params.body.durationMinutes !== undefined &&
      booking.durationMinutes !== params.body.durationMinutes
    ) {
      updateData.durationMinutes = params.body.durationMinutes;
      changedFields.push('durationMinutes');
    }
    if (params.body.location !== undefined && booking.location !== params.body.location) {
      updateData.location = params.body.location;
      changedFields.push('location');
    }
    if (params.body.serviceType !== undefined && booking.serviceType !== params.body.serviceType) {
      updateData.serviceType = params.body.serviceType;
      changedFields.push('serviceType');
    }
    if (params.body.notes !== undefined && (booking.notes ?? '') !== params.body.notes) {
      updateData.notes = params.body.notes;
      changedFields.push('notes');
    }
    if (params.body.priceMinor !== undefined && booking.priceMinor !== params.body.priceMinor) {
      updateData.priceMinor = params.body.priceMinor;
      changedFields.push('priceMinor');
    }
    if (params.body.currency !== undefined && booking.currency !== params.body.currency) {
      updateData.currency = params.body.currency;
      changedFields.push('currency');
    }
    const currentObjectives = [...booking.objectives]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((objective) => objective.objective);
    const objectivesChanged =
      params.body.objectives !== undefined &&
      JSON.stringify(currentObjectives) !== JSON.stringify(params.body.objectives);
    if (objectivesChanged) {
      updateData.objectivesJson = {
        primary: params.body.objectives?.[0] ?? null,
        secondary: params.body.objectives?.[1] ?? null,
      };
      changedFields.push('objectives');
    }
    const now = new Date();
    const endpointKey = bookingUpdateEndpointKey(params.bookingId);
    const requestHash = hashBookingLifecycleRequest({
      bookingId: params.bookingId,
      body: params.body,
    });
    try {
      const response = await prisma.$transaction(async (tx) => {
        if (changedFields.length > 0) {
          const updateResult = await tx.booking.updateMany({
            where: {
              id: params.bookingId,
              version: booking.version,
            },
            data: {
              ...updateData,
              updatedByUserId: params.authUserId,
              updatedAt: now,
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
          if (objectivesChanged) {
            await tx.bookingObjective.deleteMany({
              where: {
                bookingId: params.bookingId,
              },
            });
            if (params.body.objectives && params.body.objectives.length > 0) {
              await tx.bookingObjective.createMany({
                data: params.body.objectives.map((objective, index) => ({
                  id: newId('boj'),
                  bookingId: params.bookingId,
                  objective,
                  sortOrder: index + 1,
                  createdAt: now,
                })),
              });
            }
          }
          await tx.bookingStatusEvent.create({
            data: {
              id: newId('bse'),
              bookingId: params.bookingId,
              fromStatus: booking.status,
              toStatus: booking.status,
              actorUserId: params.authUserId,
              reason: 'Booking details updated',
              metadataJson: {
                changedFields,
                source: 'api-db-runtime',
              },
              requestId: params.requestId,
              occurredAt: now,
            },
          });
        }
        const updated = await tx.booking.findUniqueOrThrow({
          where: {
            id: params.bookingId,
          },
          include: {
            participants: {
              where: {
                deletedAt: null,
              },
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
        });
        const nextResponse = mapNormalizedDbBookingRow(normalizeForJson(updated) as SeedRow);
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
      }, API_DB_TRANSACTION_OPTIONS);
      return normalizeForJson(response);
    } catch (error) {
      if (params.body.idempotencyKey && isCreateBookingIdempotencyRace(error)) {
        const replay = await resolveLifecycleBookingIdempotency({
          authUserId: params.authUserId,
          bookingId: params.bookingId,
          action: 'update',
          body: params.body,
        });
        if (replay) {
          return replay.response;
        }
      }
      throw error;
    }
  }
  async cancelBooking(params: CancelBookingParams): Promise<BookingResponse> {
    if (shouldUseDbFixtureFallback()) {
      const seedRepository = new SeedBookingRepository(getDbFixtureStore);
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
      where: {
        id: params.bookingId,
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
    });
    if (!booking) {
      throw notFound('Booking not found', {
        bookingId: params.bookingId,
      });
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
          clubId: booking.clubId ?? null,
          bookedByUserId: booking.bookedByUserId ?? undefined,
          recurringSeriesId: booking.recurringSeriesId ?? null,
          groupSessionId: booking.groupSessionId ?? null,
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
          requestExpiresAt: booking.requestExpiresAt?.toISOString() ?? null,
          requestResolvedAt: booking.requestResolvedAt?.toISOString() ?? null,
          requestResolutionReason: booking.requestResolutionReason ?? null,
        }),
      );
    }
    if (isAwaitingBookingRequest(booking.status)) {
      throw conflict('Awaiting requests must be declined or withdrawn, not cancelled');
    }
    if (isTerminalBookingStatus(booking.status)) {
      throw badRequest('Terminal bookings cannot be cancelled');
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
        await applyBookingCancellationInvoiceEffectsInDbTransaction(tx, {
          bookingId: params.bookingId,
          actorUserId: params.authUserId,
          reason: params.body.reason,
          requestId: params.requestId,
        });
        const updateResult = await tx.booking.updateMany({
          where: {
            id: params.bookingId,
            version: booking.version,
          },
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
          where: {
            id: params.bookingId,
          },
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
        const candidateRecipientIds = bookingCancellationRecipientIds({
          actorUserId: params.authUserId,
          coachUserId: booking.coachUserId,
          bookedByUserId: booking.bookedByUserId,
          participants: booking.participants.map((participant) => ({
            guardianUserId: participant.guardianUserId,
            athleteUserId: participant.athlete.userId,
          })),
        });
        if (candidateRecipientIds.length > 0) {
          const existingNotifications = await tx.notification.findMany({
            where: {
              userId: {
                in: candidateRecipientIds,
              },
              sourceType: BOOKING_CANCELLED_NOTIFICATION_SOURCE_TYPE,
              sourceId: params.bookingId,
            },
            select: {
              userId: true,
            },
          });
          const existingRecipientIds = new Set(
            existingNotifications.map((notification) => notification.userId),
          );
          const missingRecipientIds = candidateRecipientIds.filter(
            (userId) => !existingRecipientIds.has(userId),
          );
          if (missingRecipientIds.length > 0) {
            const notificationRows = bookingCancellationNotificationRows({
              bookingId: params.bookingId,
              actorUserId: params.authUserId,
              recipientUserIds: missingRecipientIds,
              reason: params.body.reason,
              scheduledAt: booking.scheduledAt.toISOString(),
              now: now.toISOString(),
            });
            await tx.notification.createMany({
              data: notificationRows.map((row, index) => ({
                id: asString(row.id) ?? newId('nfn'),
                userId: missingRecipientIds[index],
                type: 'BOOKING_CANCELLED',
                title: 'Booking cancelled',
                body: asString(row.body) ?? null,
                status: 'UNREAD',
                sourceType: BOOKING_CANCELLED_NOTIFICATION_SOURCE_TYPE,
                sourceId: params.bookingId,
                deepLink: asString(row.deepLink) ?? `/bookings/${params.bookingId}`,
                metadataJson: row.metadataJson as never,
                createdAt: now,
                updatedAt: now,
              })),
            });
          }
        }
        const nextResponse = bookingResponseSchema.parse({
          id: updated.id,
          coachUserId: updated.coachUserId,
          clubId: updated.clubId ?? null,
          bookedByUserId: updated.bookedByUserId ?? undefined,
          recurringSeriesId: updated.recurringSeriesId ?? null,
          groupSessionId: updated.groupSessionId ?? null,
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
          requestExpiresAt: updated.requestExpiresAt?.toISOString() ?? null,
          requestResolvedAt: updated.requestResolvedAt?.toISOString() ?? null,
          requestResolutionReason: updated.requestResolutionReason ?? null,
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
      }, API_DB_TRANSACTION_OPTIONS);
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
  async resolveBookingRequest(params: ResolveBookingRequestParams): Promise<BookingResponse> {
    if (shouldUseDbFixtureFallback()) {
      const seedRepository = new SeedBookingRepository(getDbFixtureStore);
      return seedRepository.resolveBookingRequest(params);
    }
    const prisma = getPrismaClientOrThrow();
    const idempotentResponse = await resolveLifecycleBookingIdempotency({
      authUserId: params.authUserId,
      bookingId: params.bookingId,
      action: params.action,
      body: params.body,
    });
    if (idempotentResponse) {
      return idempotentResponse.response;
    }
    await expireDbBookingRequests(prisma, {
      authUserId: params.authUserId,
      bookingId: params.bookingId,
    });
    const booking = await prisma.booking.findFirst({
      where: { id: params.bookingId, deletedAt: null },
      include: {
        participants: {
          where: { deletedAt: null },
          include: { athlete: { select: { userId: true } } },
        },
        objectives: true,
      },
    });
    if (!booking) {
      throw notFound('Booking not found', { bookingId: params.bookingId });
    }
    if (params.action === 'decline') {
      if (booking.coachUserId !== params.authUserId) {
        throw forbidden('Only the assigned coach can decline this booking request');
      }
    } else {
      const isGuardianForEveryParticipant =
        booking.participants.length > 0 &&
        booking.participants.every(
          (participant) => participant.guardianUserId === params.authUserId,
        );
      const canWithdraw =
        booking.bookedByUserId === params.authUserId || isGuardianForEveryParticipant;
      if (!canWithdraw) {
        throw forbidden('Only the requester or an assigned guardian can withdraw this request');
      }
    }
    const descriptor = bookingRequestResolutionDescriptor(params.action);
    if (booking.status === descriptor.status) {
      return normalizeForJson(mapNormalizedDbBookingRow(normalizeForJson(booking) as SeedRow));
    }
    assertExpectedBookingVersion(Number(booking.version), params.body.expectedVersion);
    if (!isAwaitingBookingRequest(booking.status)) {
      throw conflict('Only awaiting booking requests can be resolved', {
        bookingId: params.bookingId,
        status: booking.status,
      });
    }
    const now = new Date();
    const endpointKey = bookingLifecycleEndpointKey(params.bookingId, params.action);
    const requestHash = hashBookingLifecycleRequest({
      bookingId: params.bookingId,
      body: params.body,
    });
    try {
      const response = await prisma.$transaction(async (tx) => {
        const updateResult = await tx.booking.updateMany({
          where: {
            id: params.bookingId,
            version: booking.version,
            deletedAt: null,
            status: { in: ['PENDING', 'AWAITING_CONFIRMATION'] },
            requestExpiresAt: { gt: now },
          },
          data: {
            status: descriptor.status,
            requestResolvedAt: now,
            requestResolutionReason: params.body.reason,
            updatedByUserId: params.authUserId,
            updatedAt: now,
            version: { increment: 1 },
          },
        });
        if (updateResult.count !== 1) {
          throw conflict('Booking request changed or expired before it was resolved', {
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
            toStatus: descriptor.status,
            actorUserId: params.authUserId,
            reason: params.body.reason,
            metadataJson: {
              action: params.action,
              note: params.body.note ?? null,
              source: 'api-db-runtime',
            },
            requestId: params.requestId,
            occurredAt: now,
          },
        });
        const recipientUserIds = bookingRequestResolutionRecipientIds({
          action: params.action,
          actorUserId: params.authUserId,
          coachUserId: booking.coachUserId,
          bookedByUserId: booking.bookedByUserId,
          participants: booking.participants.map((participant) => ({
            guardianUserId: participant.guardianUserId,
            athleteUserId: participant.athlete.userId,
          })),
        });
        if (recipientUserIds.length > 0) {
          const existingNotifications = await tx.notification.findMany({
            where: {
              userId: { in: recipientUserIds },
              sourceType: descriptor.sourceType,
              sourceId: params.bookingId,
            },
            select: { userId: true },
          });
          const existingRecipientIds = new Set(
            existingNotifications.map((notification) => notification.userId),
          );
          const rows = bookingRequestResolutionNotificationRows({
            action: params.action,
            bookingId: params.bookingId,
            actorUserId: params.authUserId,
            recipientUserIds: recipientUserIds.filter(
              (userId) => !existingRecipientIds.has(userId),
            ),
            reason: params.body.reason,
            scheduledAt: booking.scheduledAt.toISOString(),
            now: now.toISOString(),
          });
          if (rows.length > 0) {
            await tx.notification.createMany({
              data: rows.map((row) => ({
                id: asString(row.id) ?? newId('nfn'),
                userId: asString(row.userId) ?? '',
                type: asString(row.type) ?? descriptor.notificationType,
                title: asString(row.title) ?? descriptor.title,
                body: asString(row.body) ?? null,
                status: 'UNREAD',
                sourceType: descriptor.sourceType,
                sourceId: params.bookingId,
                deepLink: asString(row.deepLink) ?? `/bookings/${params.bookingId}`,
                metadataJson: row.metadataJson as never,
                createdAt: now,
                updatedAt: now,
              })),
            });
          }
        }
        const nextResponse = mapNormalizedDbBookingRow(
          normalizeForJson({
            ...updated,
            participants: booking.participants,
            objectives: booking.objectives,
          }) as SeedRow,
        );
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
      }, API_DB_TRANSACTION_OPTIONS);
      return normalizeForJson(response);
    } catch (error) {
      if (params.body.idempotencyKey && isCreateBookingIdempotencyRace(error)) {
        const replay = await resolveLifecycleBookingIdempotency({
          authUserId: params.authUserId,
          bookingId: params.bookingId,
          action: params.action,
          body: params.body,
        });
        if (replay) {
          return replay.response;
        }
      }
      throw error;
    }
  }
  async confirmBooking(params: ConfirmBookingParams): Promise<BookingResponse> {
    if (shouldUseDbFixtureFallback()) {
      const seedRepository = new SeedBookingRepository(getDbFixtureStore);
      return seedRepository.confirmBooking({
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
      action: 'confirm',
      body: params.body,
    });
    if (idempotentResponse) {
      return idempotentResponse.response;
    }
    await expireDbBookingRequests(prisma, {
      authUserId: params.authUserId,
      bookingId: params.bookingId,
    });
    const booking = await prisma.booking.findFirst({
      where: {
        id: params.bookingId,
        deletedAt: null,
      },
      include: {
        participants: {
          where: {
            deletedAt: null,
          },
        },
        objectives: true,
      },
    });
    if (!booking) {
      throw notFound('Booking not found', {
        bookingId: params.bookingId,
      });
    }
    if (booking.coachUserId !== params.authUserId) {
      throw forbidden('Only the assigned coach can confirm this booking');
    }
    if (booking.status === 'CONFIRMED') {
      return normalizeForJson(
        bookingResponseSchema.parse({
          id: booking.id,
          coachUserId: booking.coachUserId,
          clubId: booking.clubId ?? null,
          bookedByUserId: booking.bookedByUserId ?? undefined,
          recurringSeriesId: booking.recurringSeriesId ?? null,
          groupSessionId: booking.groupSessionId ?? null,
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
          requestExpiresAt: booking.requestExpiresAt?.toISOString() ?? null,
          requestResolvedAt: booking.requestResolvedAt?.toISOString() ?? null,
          requestResolutionReason: booking.requestResolutionReason ?? null,
        }),
      );
    }
    assertExpectedBookingVersion(Number(booking.version), params.body.expectedVersion);
    if (isTerminalBookingStatus(booking.status)) {
      throw badRequest('Terminal bookings cannot be confirmed', {
        bookingId: params.bookingId,
        status: booking.status,
      });
    }
    if (booking.status !== 'PENDING' && booking.status !== 'AWAITING_CONFIRMATION') {
      throw badRequest('Only pending bookings can be confirmed', {
        bookingId: params.bookingId,
        status: booking.status,
      });
    }
    const now = new Date();
    if (booking.scheduledAt <= now) {
      throw badRequest('Only upcoming booking requests can be confirmed', {
        bookingId: params.bookingId,
      });
    }
    const endpointKey = bookingLifecycleEndpointKey(params.bookingId, 'confirm');
    const requestHash = hashBookingLifecycleRequest({
      bookingId: params.bookingId,
      body: params.body,
    });
    try {
      const response = await prisma.$transaction(async (tx) => {
        const updateResult = await tx.booking.updateMany({
          where: {
            id: params.bookingId,
            version: booking.version,
            deletedAt: null,
            scheduledAt: {
              gt: now,
            },
            status: {
              in: ['PENDING', 'AWAITING_CONFIRMATION'],
            },
            requestExpiresAt: {
              gt: now,
            },
          },
          data: {
            status: 'CONFIRMED',
            confirmedAt: now,
            requestResolvedAt: now,
            requestResolutionReason: null,
            updatedByUserId: params.authUserId,
            updatedAt: now,
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
          where: {
            id: params.bookingId,
          },
        });
        await tx.bookingStatusEvent.create({
          data: {
            id: newId('bse'),
            bookingId: params.bookingId,
            fromStatus: booking.status,
            toStatus: 'CONFIRMED',
            actorUserId: params.authUserId,
            reason: 'Booking confirmed',
            metadataJson: {
              note: params.body.note ?? null,
              source: 'api-db-runtime',
            },
            requestId: params.requestId,
            occurredAt: now,
          },
        });
        const candidateRecipientIds = bookingFamilyRecipientIds({
          actorUserId: params.authUserId,
          bookedByUserId: booking.bookedByUserId,
          participants: booking.participants.map((participant) => ({
            guardianUserId: participant.guardianUserId,
          })),
        });
        if (candidateRecipientIds.length > 0) {
          const existingNotifications = await tx.notification.findMany({
            where: {
              userId: {
                in: candidateRecipientIds,
              },
              sourceType: BOOKING_CONFIRMED_NOTIFICATION_SOURCE_TYPE,
              sourceId: params.bookingId,
            },
            select: {
              userId: true,
            },
          });
          const existingRecipientIds = new Set(
            existingNotifications.map((notification) => notification.userId),
          );
          const missingRecipientIds = candidateRecipientIds.filter(
            (userId) => !existingRecipientIds.has(userId),
          );
          if (missingRecipientIds.length > 0) {
            const notificationRows = bookingConfirmationNotificationRows({
              bookingId: params.bookingId,
              actorUserId: params.authUserId,
              recipientUserIds: missingRecipientIds,
              scheduledAt: booking.scheduledAt.toISOString(),
              now: now.toISOString(),
            });
            await tx.notification.createMany({
              data: notificationRows.map((row, index) => ({
                id: asString(row.id) ?? newId('nfn'),
                userId: missingRecipientIds[index],
                type: 'BOOKING_CONFIRMED',
                title: 'Booking confirmed',
                body: asString(row.body) ?? null,
                status: 'UNREAD',
                sourceType: BOOKING_CONFIRMED_NOTIFICATION_SOURCE_TYPE,
                sourceId: params.bookingId,
                deepLink: asString(row.deepLink) ?? `/bookings/${params.bookingId}`,
                metadataJson: row.metadataJson as never,
                createdAt: now,
                updatedAt: now,
              })),
            });
          }
        }
        const nextResponse = bookingResponseSchema.parse({
          id: updated.id,
          coachUserId: updated.coachUserId,
          clubId: updated.clubId ?? null,
          bookedByUserId: updated.bookedByUserId ?? undefined,
          recurringSeriesId: updated.recurringSeriesId ?? null,
          groupSessionId: updated.groupSessionId ?? null,
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
          requestExpiresAt: updated.requestExpiresAt?.toISOString() ?? null,
          requestResolvedAt: updated.requestResolvedAt?.toISOString() ?? null,
          requestResolutionReason: updated.requestResolutionReason ?? null,
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
      }, API_DB_TRANSACTION_OPTIONS);
      return normalizeForJson(response);
    } catch (error) {
      if (params.body.idempotencyKey && isCreateBookingIdempotencyRace(error)) {
        const replay = await resolveLifecycleBookingIdempotency({
          authUserId: params.authUserId,
          bookingId: params.bookingId,
          action: 'confirm',
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
      const seedRepository = new SeedBookingRepository(getDbFixtureStore);
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
      where: {
        id: params.bookingId,
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
    });
    if (!booking) {
      throw notFound('Booking not found', {
        bookingId: params.bookingId,
      });
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
          where: {
            id: params.bookingId,
            version: booking.version,
          },
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
        const [updated] = await Promise.all([
          tx.booking.findUniqueOrThrow({
            where: {
              id: params.bookingId,
            },
          }),
          tx.bookingStatusEvent.create({
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
          }),
          applyBookingReopenInvoiceEffectsInDbTransaction(tx, {
            bookingId: params.bookingId,
            actorUserId: params.authUserId,
            reason: 'Booking reopened',
            requestId: params.requestId,
          }),
        ]);
        const nextResponse = bookingResponseSchema.parse({
          id: updated.id,
          coachUserId: updated.coachUserId,
          clubId: updated.clubId ?? null,
          bookedByUserId: updated.bookedByUserId ?? undefined,
          recurringSeriesId: updated.recurringSeriesId ?? null,
          groupSessionId: updated.groupSessionId ?? null,
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
          requestExpiresAt: updated.requestExpiresAt?.toISOString() ?? null,
          requestResolvedAt: updated.requestResolvedAt?.toISOString() ?? null,
          requestResolutionReason: updated.requestResolutionReason ?? null,
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
      }, API_DB_TRANSACTION_OPTIONS);
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
  async completeBooking(params: CompleteBookingParams): Promise<BookingResponse> {
    if (shouldUseDbFixtureFallback()) {
      const seedRepository = new SeedBookingRepository(getDbFixtureStore);
      return seedRepository.completeBooking({
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
      action: 'complete',
      body: params.body,
    });
    if (idempotentResponse) {
      return idempotentResponse.response;
    }
    const booking = await prisma.booking.findUnique({
      where: {
        id: params.bookingId,
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
    });
    if (!booking) {
      throw notFound('Booking not found', {
        bookingId: params.bookingId,
      });
    }
    if (booking.coachUserId !== params.authUserId) {
      throw forbidden('Only the assigned coach can complete this booking');
    }
    if (booking.status === 'COMPLETED') {
      return normalizeForJson(
        bookingResponseSchema.parse({
          id: booking.id,
          coachUserId: booking.coachUserId,
          clubId: booking.clubId ?? null,
          bookedByUserId: booking.bookedByUserId ?? undefined,
          recurringSeriesId: booking.recurringSeriesId ?? null,
          groupSessionId: booking.groupSessionId ?? null,
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
          requestExpiresAt: booking.requestExpiresAt?.toISOString() ?? null,
          requestResolvedAt: booking.requestResolvedAt?.toISOString() ?? null,
          requestResolutionReason: booking.requestResolutionReason ?? null,
        }),
      );
    }
    assertExpectedBookingVersion(Number(booking.version), params.body.expectedVersion);
    if (booking.status === 'CANCELLED') {
      throw badRequest('Cancelled bookings cannot be completed');
    }
    if (booking.status !== 'CONFIRMED' && booking.status !== 'AWAITING_COMPLETION') {
      throw badRequest('Only confirmed bookings can be completed', {
        bookingId: params.bookingId,
        status: booking.status,
      });
    }
    const completedAt = params.body.completedAt ? new Date(params.body.completedAt) : new Date();
    if (Number.isNaN(completedAt.getTime())) {
      throw badRequest('Completed-at timestamp is invalid', {
        completedAt: params.body.completedAt,
      });
    }
    if (booking.scheduledAt.getTime() > completedAt.getTime()) {
      throw badRequest('Bookings cannot be completed before their scheduled start time', {
        bookingId: params.bookingId,
      });
    }
    const completionAttendance = normalizeCompletionAttendance({
      participantAthleteIds: booking.participants.map((participant) => participant.athleteId),
      attendance: params.body.attendance,
      fallbackNote: params.body.note ?? null,
    });
    const attendanceSummary = summarizeCompletionAttendance(completionAttendance);
    const focusAreas = booking.objectives.map((objective) => objective.objective);
    const endpointKey = bookingLifecycleEndpointKey(params.bookingId, 'complete');
    const requestHash = hashBookingLifecycleRequest({
      bookingId: params.bookingId,
      body: params.body,
    });
    try {
      const response = await prisma.$transaction(async (tx) => {
        const updateResult = await tx.booking.updateMany({
          where: {
            id: params.bookingId,
            version: booking.version,
          },
          data: {
            status: 'COMPLETED',
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
        const [updated, existingAttendance] = await Promise.all([
          tx.booking.findUniqueOrThrow({
            where: {
              id: params.bookingId,
            },
          }),
          tx.attendanceRecord.findMany({
            where: {
              bookingId: params.bookingId,
              athleteId: {
                in: booking.participants.map((participant) => participant.athleteId),
              },
            },
          }),
        ]);
        const attendanceRecordIds: string[] = [];
        const existingAttendanceByAthleteId = new Map(
          existingAttendance.map((record) => [record.athleteId, record]),
        );
        const attendanceWrites = await Promise.all(
          completionAttendance.map(async (attendance) => {
            const existing = existingAttendanceByAthleteId.get(attendance.athleteId);
            const attendanceRecord = existing
              ? await tx.attendanceRecord.update({
                  where: {
                    id: existing.id,
                  },
                  data: {
                    status: attendance.status,
                    notes: attendance.notes,
                    effortRating: attendance.effortRating,
                    focusAreasJson: focusAreas as never,
                    recordedByUserId: params.authUserId,
                    recordedAt: completedAt,
                  },
                })
              : await tx.attendanceRecord.create({
                  data: {
                    id: newId('att'),
                    bookingId: params.bookingId,
                    groupSessionId: booking.groupSessionId ?? null,
                    athleteId: attendance.athleteId,
                    status: attendance.status,
                    notes: attendance.notes,
                    effortRating: attendance.effortRating,
                    focusAreasJson: focusAreas as never,
                    recordedByUserId: params.authUserId,
                    recordedAt: completedAt,
                  },
                });
            return { attendance, attendanceRecord };
          }),
        );
        attendanceRecordIds.push(
          ...attendanceWrites.map(({ attendanceRecord }) => attendanceRecord.id),
        );
        attendanceWrites.forEach(({ attendance, attendanceRecord }) => {
          existingAttendanceByAthleteId.set(attendance.athleteId, attendanceRecord);
        });
        const sessionNoteIds: string[] = [];
        const completionNoteText = params.body.note?.trim();
        if (completionNoteText) {
          const sessionNoteWrites = await Promise.all(
            attendanceWrites.flatMap(({ attendance, attendanceRecord }) => {
              if (attendance.status !== 'ATTENDED') {
                return [];
              }
              const metadataJson = {
                source: 'booking-completion',
                proofSource: 'attendance-record',
                attendanceRecordId: attendanceRecord.id,
                attendanceRecordIds: [attendanceRecord.id],
                focus: focusAreas,
                completedAt: completedAt.toISOString(),
              };
              return [
                (async () => {
                  const existingSessionNote = await tx.sessionNote.findFirst({
                    where: {
                      bookingId: params.bookingId,
                      athleteId: attendance.athleteId,
                      createdByUserId: params.authUserId,
                      deletedAt: null,
                    },
                  });
                  if (existingSessionNote) {
                    return tx.sessionNote.update({
                      where: {
                        id: existingSessionNote.id,
                      },
                      data: {
                        groupSessionId: booking.groupSessionId ?? null,
                        coachUserId: params.authUserId,
                        visibility: 'PUBLIC',
                        noteText: completionNoteText,
                        metadataJson: metadataJson as never,
                        updatedByUserId: params.authUserId,
                        version: {
                          increment: 1,
                        },
                      },
                    });
                  }
                  return tx.sessionNote.create({
                    data: {
                      id: newId('snt'),
                      bookingId: params.bookingId,
                      groupSessionId: booking.groupSessionId ?? null,
                      athleteId: attendance.athleteId,
                      coachUserId: params.authUserId,
                      visibility: 'PUBLIC',
                      noteText: completionNoteText,
                      privateNotesEncrypted: null,
                      metadataJson: metadataJson as never,
                      createdByUserId: params.authUserId,
                      updatedByUserId: params.authUserId,
                    },
                  });
                })(),
              ];
            }),
          );
          sessionNoteIds.push(...sessionNoteWrites.map((sessionNote) => sessionNote.id));
        }
        await tx.bookingStatusEvent.create({
          data: {
            id: newId('bse'),
            bookingId: params.bookingId,
            fromStatus: booking.status,
            toStatus: 'COMPLETED',
            actorUserId: params.authUserId,
            reason: 'Booking completed',
            metadataJson: {
              note: params.body.note ?? null,
              source: 'api-db-runtime',
              attendanceRecordIds,
              sessionNoteIds,
              attendanceSummary,
              proofSource: 'attendance-record',
              proofSources: sessionNoteIds.length
                ? ['attendance-record', 'session-note']
                : ['attendance-record'],
            } as never,
            requestId: params.requestId,
            occurredAt: completedAt,
          },
        });
        const candidateRecipientIds = bookingFamilyRecipientIds({
          actorUserId: params.authUserId,
          bookedByUserId: booking.bookedByUserId,
          participants: booking.participants.map((participant) => ({
            guardianUserId: participant.guardianUserId,
            athleteUserId: participant.athlete.userId,
          })),
        });
        if (candidateRecipientIds.length > 0) {
          const existingNotifications = await tx.notification.findMany({
            where: {
              userId: {
                in: candidateRecipientIds,
              },
              sourceType: {
                in: [
                  BOOKING_COMPLETED_NOTIFICATION_SOURCE_TYPE,
                  BOOKING_REVIEW_PROMPT_NOTIFICATION_SOURCE_TYPE,
                ],
              },
              sourceId: params.bookingId,
            },
            select: {
              sourceType: true,
              userId: true,
            },
          });
          const existingKeys = new Set(
            existingNotifications.map(
              (notification) => `${notification.sourceType ?? ''}:${notification.userId}`,
            ),
          );
          const notificationRows = bookingCompletionNotificationRows({
            bookingId: params.bookingId,
            actorUserId: params.authUserId,
            recipientUserIds: candidateRecipientIds,
            attendanceSummary,
            now: completedAt.toISOString(),
          }).filter(
            (row) =>
              !existingKeys.has(`${asString(row.sourceType) ?? ''}:${asString(row.userId) ?? ''}`),
          );
          if (notificationRows.length > 0) {
            await tx.notification.createMany({
              data: notificationRows.map((row) => ({
                id: asString(row.id) ?? newId('nfn'),
                userId: asString(row.userId) ?? '',
                type: asString(row.type) ?? 'BOOKING_COMPLETED',
                title: asString(row.title) ?? 'Booking update',
                body: asString(row.body) ?? null,
                status: 'UNREAD',
                sourceType: asString(row.sourceType) ?? null,
                sourceId: params.bookingId,
                deepLink: asString(row.deepLink) ?? `/bookings/${params.bookingId}`,
                metadataJson: row.metadataJson as never,
                createdAt: completedAt,
                updatedAt: completedAt,
              })),
            });
          }
        }
        const nextResponse = bookingResponseSchema.parse({
          id: updated.id,
          coachUserId: updated.coachUserId,
          clubId: updated.clubId ?? null,
          bookedByUserId: updated.bookedByUserId ?? undefined,
          recurringSeriesId: updated.recurringSeriesId ?? null,
          groupSessionId: updated.groupSessionId ?? null,
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
          requestExpiresAt: updated.requestExpiresAt?.toISOString() ?? null,
          requestResolvedAt: updated.requestResolvedAt?.toISOString() ?? null,
          requestResolutionReason: updated.requestResolutionReason ?? null,
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
              expiresAt: new Date(completedAt.getTime() + IDEMPOTENCY_TTL_MS),
            },
          });
        }
        return nextResponse;
      }, API_DB_TRANSACTION_OPTIONS);
      return normalizeForJson(response);
    } catch (error) {
      if (params.body.idempotencyKey && isCreateBookingIdempotencyRace(error)) {
        const replay = await resolveLifecycleBookingIdempotency({
          authUserId: params.authUserId,
          bookingId: params.bookingId,
          action: 'complete',
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
