import crypto from 'node:crypto';
import {
  canUseClubCapability,
  isClubStaffRole,
  parseOrganizationRole,
  type CompleteGroupSessionRequest,
} from '@clubroom/shared-contracts';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/http-errors.js';
import {
  applyBookingCancellationInvoiceEffects,
  applyBookingCancellationInvoiceEffectsInDbTransaction,
  generateInvoiceForBooking,
} from '../../lib/invoice-runtime.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import {
  API_DB_TRANSACTION_OPTIONS,
  getPrismaClientOrThrow,
  shouldUseDbFixtureFallback,
} from '../../lib/prisma-runtime.js';
import type { AuditEventData } from '../../lib/audit-runtime.js';
import {
  BOOKING_COMPLETED_NOTIFICATION_SOURCE_TYPE,
  BOOKING_REVIEW_PROMPT_NOTIFICATION_SOURCE_TYPE,
  bookingCompletionNotificationRows,
  bookingFamilyRecipientIds,
  createBookingInSeedTables,
  type SeedTables,
} from './booking-repository.js';
import { normalizeForJson } from './normalize.js';
type SeedRow = Record<string, unknown>;
type GroupSessionStatus = 'DRAFT' | 'PUBLISHED' | 'FULL' | 'COMPLETED' | 'CANCELLED';
type AppGroupSessionType =
  | 'CAMP'
  | 'CLINIC'
  | 'TEAM_TRAINING'
  | 'OPEN_SESSION'
  | 'TRIAL'
  | 'TRAINING';
type AppInviteType = 'OPEN' | 'CLOSED' | 'SQUAD_ONLY';
type AppSkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL';
type AppSessionRsvpStatus = 'pending' | 'going' | 'maybe' | 'not_going';
export interface AppGroupSessionSchedule {
  date: string;
  startTime: string;
  endTime: string;
}
export interface AppRecurringPattern {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  until?: string;
}
export interface AppGroupSession {
  id: string;
  coachId: string;
  coachName?: string;
  clubId?: string;
  clubName?: string;
  createdByName?: string;
  title: string;
  description: string;
  sessionType: AppGroupSessionType;
  schedule: AppGroupSessionSchedule[];
  maxParticipants: number;
  currentParticipants: number;
  offPlatformParticipants: number;
  waitlistEnabled: boolean;
  waitlistCount: number;
  pricePerParticipant: number;
  currency: string;
  ageMin?: number;
  ageMax?: number;
  skillLevel?: AppSkillLevel;
  location: string;
  isVirtual: boolean;
  status: GroupSessionStatus;
  createdAt: string;
  focus?: string[];
  equipment?: string[];
  isRecurring?: boolean;
  recurringPattern?: AppRecurringPattern;
  cancelledInstances?: string[];
  squadId?: string;
  isFree?: boolean;
  inviteType?: AppInviteType;
  registrationDeadline?: string;
}
export interface AppGroupRegistration {
  id: string;
  sessionId: string;
  athleteId: string;
  athleteName?: string;
  parentId: string;
  parentName?: string;
  status: 'REGISTERED' | 'WAITLISTED' | 'CANCELLED' | 'ATTENDED' | 'NO_SHOW';
  registeredAt: string;
  paidAt?: string;
  attendedDates: string[];
  notes?: string;
}
export interface AppSessionRsvp {
  id: string;
  sessionId: string;
  userId: string;
  childId?: string;
  status: AppSessionRsvpStatus;
  respondedAt?: string;
  createdAt: string;
}
export interface SessionRsvpMemberInput {
  userId: string;
  childId?: string;
}
export interface GroupSessionListParams {
  authUserId: string;
  isPrivilegedAdmin: boolean;
  statusFilter?: string;
  coachUserId?: string;
  clubId?: string;
  squadId?: string;
  athleteId?: string;
  sessionType?: string;
  skillLevel?: string;
  discover?: boolean;
}
export interface GroupSessionCreateInput {
  coachId: string;
  clubId?: string;
  title: string;
  description?: string;
  sessionType: AppGroupSessionType;
  schedule: AppGroupSessionSchedule[];
  maxParticipants: number;
  pricePerParticipant?: number;
  currency?: string;
  ageMin?: number;
  ageMax?: number;
  skillLevel?: string;
  location?: string;
  isVirtual?: boolean;
  focus?: string[];
  equipment?: string[];
  waitlistEnabled?: boolean;
  squadId?: string;
  inviteType?: AppInviteType;
  registrationDeadline?: string;
}
export interface GroupSessionCreateParams {
  authUserId: string;
  isPrivilegedAdmin: boolean;
  body: GroupSessionCreateInput;
}
export interface GroupSessionAccessParams {
  authUserId: string;
  isPrivilegedAdmin: boolean;
  sessionId: string;
  requestId?: string;
  forCompletion?: boolean;
}
export interface GroupSessionOffPlatformParticipantsParams extends GroupSessionAccessParams {
  count: number;
}
export interface GroupSessionCancelInstanceParams extends GroupSessionAccessParams {
  date: string;
}
export interface GroupSessionEndSeriesParams extends GroupSessionAccessParams {
  fromDate: string;
}
export interface GroupSessionRegisterParams {
  authUserId: string;
  isPrivilegedAdmin: boolean;
  requestId: string;
  sessionId: string;
  athleteId: string;
  bookedByUserId: string;
  note: string;
  waitlistOnly?: boolean;
}
export interface GroupSessionAttendanceParams {
  authUserId: string;
  isPrivilegedAdmin: boolean;
  registrationId: string;
  date: string;
  status: 'ATTENDED' | 'NO_SHOW' | null;
  successAuditEvent: AuditEventData;
}
export interface GroupSessionCompletionParams {
  authUserId: string;
  isPrivilegedAdmin: boolean;
  sessionId: string;
  body: CompleteGroupSessionRequest;
  requestId: string;
  successAuditEvent: AuditEventData;
}
export interface GroupSessionRegistrationAccessParams {
  authUserId: string;
  isPrivilegedAdmin: boolean;
  registrationId: string;
}
export interface GroupRegistrationListParams {
  authUserId: string;
  isPrivilegedAdmin: boolean;
  athleteIds: string[];
}
export interface GroupSessionRsvpAccessParams {
  authUserId: string;
  isPrivilegedAdmin: boolean;
  sessionId: string;
}
export interface GroupSessionRsvpCreateParams extends GroupSessionRsvpAccessParams {
  members: SessionRsvpMemberInput[];
}
export interface SessionRsvpAccessParams {
  authUserId: string;
  isPrivilegedAdmin: boolean;
  rsvpId: string;
}
export interface SessionRsvpRespondParams extends SessionRsvpAccessParams {
  status: Exclude<AppSessionRsvpStatus, 'pending'>;
}
export interface SessionRsvpUserListParams {
  authUserId: string;
  isPrivilegedAdmin: boolean;
  userId: string;
  status?: AppSessionRsvpStatus;
}
export interface SessionRsvpBatchCountsParams {
  authUserId: string;
  isPrivilegedAdmin: boolean;
  sessionIds: string[];
}
export interface GroupSessionActionResult {
  session: AppGroupSession;
  dataVersion: string | null;
}
export interface GroupSessionListResult {
  sessions: AppGroupSession[];
  dataVersion: string | null;
}
export interface GroupSessionDetailResult extends GroupSessionActionResult {}
export interface GroupSessionRosterResult {
  session: AppGroupSession;
  registrations: AppGroupRegistration[];
  occurrenceDate: string | null;
  dataVersion: string | null;
}
export interface GroupSessionRegisterResult {
  registration: AppGroupRegistration;
  booking: {
    id: string;
    status: string;
    recurringSeriesId?: string | null;
    groupSessionId?: string | null;
  } | null;
  sessionStatus: GroupSessionStatus;
  dataVersion: string | null;
}
export interface GroupSessionRegistrationResult {
  registration: AppGroupRegistration;
  dataVersion: string | null;
}
export interface GroupSessionCompletionResult {
  session: AppGroupSession;
  registrations: AppGroupRegistration[];
  occurrenceDate: string;
  dataVersion: string | null;
}
export interface GroupRegistrationListResult {
  registrations: AppGroupRegistration[];
  dataVersion: string | null;
}
export interface SessionRsvpListResult {
  rsvps: AppSessionRsvp[];
  dataVersion: string | null;
}
export interface SessionRsvpActionResult {
  rsvp: AppSessionRsvp;
  dataVersion: string | null;
}
export interface SessionRsvpCounts {
  going: number;
  notGoing: number;
  maybe: number;
  pending: number;
}
export interface SessionRsvpCountsResult {
  counts: SessionRsvpCounts;
  dataVersion: string | null;
}
export interface SessionRsvpBatchCountsResult {
  countsBySessionId: Record<string, SessionRsvpCounts>;
  dataVersion: string | null;
}
export interface SessionRsvpReminderResult {
  reminded: number;
  dataVersion: string | null;
}
export interface GroupSessionRepository {
  listVisibleSessions(params: GroupSessionListParams): Promise<GroupSessionListResult>;
  getVisibleSessionById(params: GroupSessionAccessParams): Promise<GroupSessionDetailResult>;
  createSession(params: GroupSessionCreateParams): Promise<GroupSessionActionResult>;
  publishSession(params: GroupSessionAccessParams): Promise<GroupSessionActionResult>;
  updateOffPlatformParticipants(
    params: GroupSessionOffPlatformParticipantsParams,
  ): Promise<GroupSessionActionResult>;
  cancelInstance(params: GroupSessionCancelInstanceParams): Promise<GroupSessionActionResult>;
  endSeries(params: GroupSessionEndSeriesParams): Promise<GroupSessionActionResult>;
  cancelSession(params: GroupSessionAccessParams): Promise<GroupSessionActionResult>;
  registerAthlete(params: GroupSessionRegisterParams): Promise<GroupSessionRegisterResult>;
  listSessionRoster(params: GroupSessionAccessParams): Promise<GroupSessionRosterResult>;
  cancelRegistration(
    params: GroupSessionRegistrationAccessParams,
  ): Promise<GroupSessionRegistrationResult>;
  markAttendance(params: GroupSessionAttendanceParams): Promise<GroupSessionRegistrationResult>;
  completeSession(params: GroupSessionCompletionParams): Promise<GroupSessionCompletionResult>;
  listRegistrationsForAthleteIds(
    params: GroupRegistrationListParams,
  ): Promise<GroupRegistrationListResult>;
  findSessionById(sessionId: string): Promise<AppGroupSession | null>;
  createSessionRsvps(params: GroupSessionRsvpCreateParams): Promise<SessionRsvpListResult>;
  listSessionRsvps(params: GroupSessionRsvpAccessParams): Promise<SessionRsvpListResult>;
  listSessionRsvpsForUser(params: SessionRsvpUserListParams): Promise<SessionRsvpListResult>;
  getSessionRsvpById(params: SessionRsvpAccessParams): Promise<SessionRsvpActionResult>;
  respondSessionRsvp(params: SessionRsvpRespondParams): Promise<SessionRsvpActionResult>;
  getSessionRsvpCounts(params: GroupSessionRsvpAccessParams): Promise<SessionRsvpCountsResult>;
  getBatchSessionRsvpCounts(
    params: SessionRsvpBatchCountsParams,
  ): Promise<SessionRsvpBatchCountsResult>;
  remindSessionRsvps(params: GroupSessionRsvpAccessParams): Promise<SessionRsvpReminderResult>;
  deleteSessionRsvpsForSession(
    params: GroupSessionRsvpAccessParams,
  ): Promise<SessionRsvpReminderResult>;
}
interface StoreProvider {
  version: string;
  tables: SeedTables;
}
interface StoreSessionContext {
  session: SeedRow;
  registrations: SeedRow[];
  attendanceRecords: SeedRow[];
}
interface PrismaAthleteRow {
  id: string;
  userId: string | null;
  displayName: string;
}
interface PrismaRegistrationRow {
  id: string;
  groupSessionId: string;
  athleteId: string;
  parentUserId: string | null;
  status: string;
  paidAt: string | null;
  notes: string | null;
  registeredAt: string;
  updatedAt: string;
  createdByUserId: string;
  updatedByUserId: string;
  version: number;
  rosterActiveAt: string | null;
  rosterEndedAt: string | null;
  deletedAt: string | null;
  deletedByUserId: string | null;
  parentName?: string;
  athlete?: PrismaAthleteRow | null;
}
interface PrismaAttendanceRow {
  id: string;
  bookingId: string | null;
  groupSessionId: string | null;
  athleteId: string;
  status: string;
  notes: string | null;
  effortRating: number | null;
  recordedAt: string;
  createdAt: string;
}
interface PrismaOccurrenceCompletionRow {
  id: string;
  groupSessionId: string;
  occurrenceDate: string;
  completedByUserId: string;
  rosterSize: number;
  attendedCount: number;
  noShowCount: number;
  createdAt: string;
  updatedAt: string;
}
interface PrismaSessionRsvpRow {
  id: string;
  groupSessionId: string;
  userId: string;
  athleteId: string | null;
  status: string;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  deletedByUserId: string | null;
}
interface PrismaSessionRow {
  id: string;
  coachUserId: string;
  coachName?: string;
  clubId: string | null;
  clubName?: string;
  squadId: string | null;
  title: string;
  description: string | null;
  sessionType: string;
  maxParticipants: number;
  currentParticipants: number;
  offPlatformParticipants: number;
  waitlistEnabled: boolean;
  waitlistCount: number;
  pricePerParticipantMinor: number | null;
  currency: string;
  ageMin: number | null;
  ageMax: number | null;
  skillLevel: string | null;
  location: string | null;
  isVirtual: boolean;
  status: string;
  registrationDeadlineAt: string | null;
  inviteType: string | null;
  scheduleJson: unknown;
  cancelledInstancesJson: unknown;
  focusJson: unknown;
  equipmentJson: unknown;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  createdByName?: string;
  updatedByUserId: string;
  version: number;
  deletedAt: string | null;
  deletedByUserId: string | null;
  registrations: PrismaRegistrationRow[];
  attendanceRecords: PrismaAttendanceRow[];
  occurrenceCompletions?: PrismaOccurrenceCompletionRow[];
}
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
const normalizeAs = <T>(value: unknown): T => normalizeForJson(value) as unknown as T;
function parseIsoDatePart(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString().slice(0, 10);
}
function normalizeStoredInviteType(value: string | undefined): AppInviteType | undefined {
  const normalized = value?.trim().toUpperCase();
  if (normalized === 'SQUAD' || normalized === 'SQUAD_ONLY') {
    return 'SQUAD_ONLY';
  }
  if (normalized === 'OPEN') {
    return 'OPEN';
  }
  if (normalized === 'CLOSED') {
    return 'CLOSED';
  }
  return undefined;
}
function toStoredInviteType(value: AppInviteType | undefined): string | null {
  if (value === 'SQUAD_ONLY') {
    return 'squad';
  }
  if (value === 'CLOSED') {
    return 'closed';
  }
  if (value === 'OPEN') {
    return 'open';
  }
  return null;
}
function normalizeStoredSessionType(
  value: string | undefined,
  squadId?: string | null,
): AppGroupSessionType {
  const normalized = value?.trim().toUpperCase();
  if (normalized === 'CAMP') return 'CAMP';
  if (normalized === 'CLINIC') return 'CLINIC';
  if (normalized === 'TRIAL') return 'TRIAL';
  if (normalized === 'OPEN_SESSION') return 'OPEN_SESSION';
  if (normalized === 'TEAM_TRAINING') return 'TEAM_TRAINING';
  if (normalized === 'TRAINING') return 'TRAINING';
  if (normalized === 'GROUP_TRAINING') {
    return squadId ? 'TEAM_TRAINING' : 'TRAINING';
  }
  return squadId ? 'TEAM_TRAINING' : 'TRAINING';
}
function toStoredSessionType(value: AppGroupSessionType): string {
  if (value === 'CAMP') return 'camp';
  if (value === 'CLINIC') return 'clinic';
  if (value === 'TRIAL') return 'trial';
  if (value === 'OPEN_SESSION') return 'open_session';
  if (value === 'TEAM_TRAINING' || value === 'TRAINING') return 'group_training';
  return 'group_training';
}
function normalizeSkillLevel(value: string | undefined): AppSkillLevel | undefined {
  const normalized = value?.trim().toUpperCase();
  if (
    normalized === 'BEGINNER' ||
    normalized === 'INTERMEDIATE' ||
    normalized === 'ADVANCED' ||
    normalized === 'ALL'
  ) {
    return normalized;
  }
  return undefined;
}
function normalizeSessionStatus(value: string | undefined): GroupSessionStatus {
  const normalized = value?.trim().toUpperCase();
  if (
    normalized === 'DRAFT' ||
    normalized === 'PUBLISHED' ||
    normalized === 'FULL' ||
    normalized === 'COMPLETED' ||
    normalized === 'CANCELLED'
  ) {
    return normalized;
  }
  return 'DRAFT';
}
function assertSessionOpenForRegistration(session: SeedRow, now: Date): GroupSessionStatus {
  const sessionId = asString(session.id) ?? '';
  const normalized = normalizeSessionStatus(asString(session.status));
  if (normalized !== 'PUBLISHED' && normalized !== 'FULL') {
    throw badRequest('Group session is not open for registration', {
      sessionId,
      status: normalized,
    });
  }
  const deadline = asString(session.registrationDeadlineAt);
  if (deadline && Date.parse(deadline) <= now.getTime()) {
    throw badRequest('Group session registration deadline has passed', {
      sessionId,
      registrationDeadline: deadline,
    });
  }
  const cancelled = new Set(asStringArray(session.cancelledInstancesJson));
  const hasUpcomingOccurrence = buildScheduleEntries(session.scheduleJson).some((entry) => {
    const startsAt = new Date(`${entry.date}T${entry.startTime}:00.000Z`);
    return (
      !cancelled.has(entry.date) &&
      !Number.isNaN(startsAt.getTime()) &&
      startsAt.getTime() > now.getTime()
    );
  });
  if (!hasUpcomingOccurrence) {
    throw badRequest('Group session has no upcoming occurrence available for registration', {
      sessionId,
    });
  }
  return normalized;
}
function assertRecurringInstanceExists(sessionId: string, scheduleJson: unknown, date: string): void {
  const schedule = buildScheduleEntries(scheduleJson);
  if (schedule.length < 2) {
    throw badRequest('Group session is not recurring', { sessionId });
  }
  if (!schedule.some((entry) => entry.date === date)) {
    throw badRequest('Group session instance not found', { sessionId, date });
  }
}
function scheduledRecurringDatesFrom(
  sessionId: string,
  scheduleJson: unknown,
  fromDate: string,
): string[] {
  const schedule = buildScheduleEntries(scheduleJson);
  if (schedule.length < 2) {
    throw badRequest('Group session is not recurring', { sessionId });
  }
  return schedule.flatMap((entry) => (entry.date >= fromDate ? [entry.date] : []));
}
function assertOccurrencesCanBeCancelled(params: {
  session: SeedRow;
  dates: string[];
  occurrenceCompletions: SeedRow[];
  now: Date;
}): void {
  const sessionId = asString(params.session.id) ?? '';
  const schedule = buildScheduleEntries(params.session.scheduleJson);
  const byDate = new Map(schedule.map((entry) => [entry.date, entry] as const));
  const completedDates = completedOccurrenceDates(params.occurrenceCompletions, sessionId);
  for (const date of params.dates) {
    const occurrence = byDate.get(date);
    const startsAt = occurrence
      ? new Date(`${occurrence.date}T${occurrence.startTime}:00.000Z`)
      : null;
    if (
      !occurrence ||
      !startsAt ||
      Number.isNaN(startsAt.getTime()) ||
      startsAt.getTime() <= params.now.getTime() ||
      completedDates.has(date)
    ) {
      throw conflict('Started or completed group session occurrences cannot be cancelled', {
        sessionId,
        occurrenceDate: date,
      });
    }
  }
  const cancelledDates = new Set(asStringArray(params.session.cancelledInstancesJson));
  params.dates.forEach((date) => cancelledDates.add(date));
  const remainingDates = schedule
    .filter((entry) => !cancelledDates.has(entry.date))
    .map((entry) => entry.date);
  if (
    completedDates.size > 0 &&
    remainingDates.every((date) => completedDates.has(date))
  ) {
    throw conflict('Cannot cancel every remaining occurrence after group session delivery started', {
      sessionId,
    });
  }
}
function groupSessionHeadcount(registered: number, offPlatform: number): number {
  return Math.max(0, registered) + Math.max(0, offPlatform);
}
function derivePublishedSessionStatus(
  maxParticipants: number,
  registered: number,
  offPlatform: number,
): Extract<GroupSessionStatus, 'PUBLISHED' | 'FULL'> {
  return maxParticipants > 0 && groupSessionHeadcount(registered, offPlatform) >= maxParticipants
    ? 'FULL'
    : 'PUBLISHED';
}
function deriveSessionStatusForHeadcount(
  currentStatus: string | undefined,
  maxParticipants: number,
  registered: number,
  offPlatform: number,
): GroupSessionStatus {
  const status = normalizeSessionStatus(currentStatus);
  if (status !== 'PUBLISHED' && status !== 'FULL') {
    return status;
  }
  return derivePublishedSessionStatus(maxParticipants, registered, offPlatform);
}
function requireAssignedDeliveryCoach(sessionId: string, coachUserId: string | undefined | null): string {
  if (!coachUserId) {
    throw badRequest('Group session needs an assigned delivery coach before registration', {
      sessionId,
    });
  }
  return coachUserId;
}
function buildSessionThreadParticipants(params: {
  coachUserId?: string | null;
  bookedByUserId?: string | null;
  athleteUserId?: string | null;
}): Array<{ userId: string; role: string }> {
  const entries = [
    { userId: params.coachUserId, role: 'COACH' },
    { userId: params.bookedByUserId, role: 'MEMBER' },
    { userId: params.athleteUserId, role: 'ATHLETE' },
  ];
  const seen = new Set<string>();
  return entries.flatMap((entry) => {
    const userId = entry.userId?.trim();
    if (!userId || seen.has(userId)) {
      return [];
    }
    seen.add(userId);
    return [{ userId, role: entry.role }];
  });
}
function ensureStoreGroupSessionThread(params: {
  tables: SeedTables;
  session: SeedRow;
  participantEntries: Array<{ userId: string; role: string }>;
  authUserId: string;
  now: string;
}): void {
  const sessionId = asString(params.session.id);
  if (!sessionId || params.participantEntries.length < 2) {
    return;
  }
  const threads = params.tables.messageThreads = asRows(params.tables.messageThreads);
  const participants = params.tables.messageParticipants = asRows(params.tables.messageParticipants);
  let thread = threads.find(
    (row) =>
      asString(row.groupSessionId) === sessionId &&
      asString(row.threadType)?.toUpperCase() === 'GROUP' &&
      !asString(row.deletedAt),
  );
  if (!thread) {
    thread = {
      id: newId('thr'),
      threadType: 'GROUP',
      clubId: asString(params.session.clubId) ?? null,
      communityGroupId: null,
      groupSessionId: sessionId,
      bookingId: null,
      title: asString(params.session.title) ?? 'Session chat',
      lastMessageAt: null,
      createdByUserId: params.authUserId,
      updatedByUserId: params.authUserId,
      version: 1,
      createdAt: params.now,
      updatedAt: params.now,
      deletedAt: null,
    };
    threads.push(thread);
  }
  for (const entry of params.participantEntries) {
    const existing = participants.find(
      (row) =>
        asString(row.messageThreadId) === asString(thread.id) &&
        asString(row.userId) === entry.userId,
    );
    if (existing) {
      existing.role = asString(existing.role) ?? entry.role;
      existing.leftAt = null;
      continue;
    }
    participants.push({
      id: newId('mpt'),
      messageThreadId: asString(thread.id),
      userId: entry.userId,
      role: entry.role,
      lastReadAt: null,
      muted: false,
      joinedAt: params.now,
      leftAt: null,
    });
  }
}
function buildScheduleEntries(value: unknown): AppGroupSessionSchedule[] {
  return asRows(value).flatMap((entry) => {
    const mapped = (() => {
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
      };
    })();
    return mapped !== null ? [mapped] : [];
  });
}
function buildStoredScheduleJson(schedule: AppGroupSessionSchedule[]): Array<{
  startsAt: string;
  endsAt: string;
}> {
  return schedule.flatMap((entry) => {
    const mapped = (() => {
      const startsAt = new Date(`${entry.date}T${entry.startTime}:00.000Z`);
      const endsAt = new Date(`${entry.date}T${entry.endTime}:00.000Z`);
      if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
        return null;
      }
      return {
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
      };
    })();
    return mapped !== null ? [mapped] : [];
  });
}
function assertGroupSessionOccurrenceCanBeCompleted(
  session: SeedRow,
  occurrenceDate: string,
  now: Date,
): AppGroupSessionSchedule {
  const sessionId = asString(session.id) ?? '';
  const status = normalizeSessionStatus(asString(session.status));
  if (status !== 'PUBLISHED' && status !== 'FULL' && status !== 'COMPLETED') {
    throw badRequest('Group session is not eligible for completion', {
      sessionId,
      status,
    });
  }
  const schedule = buildScheduleEntries(session.scheduleJson);
  const matchingOccurrences = schedule.filter(
    (entry) => entry.date === occurrenceDate,
  );
  if (matchingOccurrences.length === 0) {
    throw badRequest('Group session occurrence not found', {
      sessionId,
      occurrenceDate,
    });
  }
  if (matchingOccurrences.length > 1) {
    throw badRequest('Group session occurrence date is ambiguous', {
      sessionId,
      occurrenceDate,
    });
  }
  const occurrence = matchingOccurrences[0]!;
  if (asStringArray(session.cancelledInstancesJson).includes(occurrenceDate)) {
    throw badRequest('Cancelled group session occurrences cannot be completed', {
      sessionId,
      occurrenceDate,
    });
  }
  const endsAt = new Date(`${occurrence.date}T${occurrence.endTime}:00.000Z`);
  if (Number.isNaN(endsAt.getTime())) {
    throw badRequest('Group session occurrence has an invalid end time', {
      sessionId,
      occurrenceDate,
    });
  }
  if (endsAt.getTime() > now.getTime()) {
    throw badRequest('Group session occurrence cannot be completed before it ends', {
      sessionId,
      occurrenceDate,
      endsAt: endsAt.toISOString(),
    });
  }
  return occurrence;
}
function occurrenceStartsAt(occurrence: AppGroupSessionSchedule): Date {
  return new Date(`${occurrence.date}T${occurrence.startTime}:00.000Z`);
}
function hasRosterLifecycleAuthority(row: SeedRow): boolean {
  return Object.prototype.hasOwnProperty.call(row, 'rosterActiveAt');
}
function isRegistrationActiveForOccurrence(
  row: SeedRow,
  occurrence: AppGroupSessionSchedule,
): boolean {
  if (asString(row.deletedAt)) {
    return false;
  }
  const status = asString(row.status)?.toUpperCase();
  if (!hasRosterLifecycleAuthority(row)) {
    return status !== 'WAITLISTED' && status !== 'CANCELLED';
  }
  const activeAt = asString(row.rosterActiveAt);
  if (!activeAt) {
    return false;
  }
  const occurrenceStart = occurrenceStartsAt(occurrence);
  const activeDate = new Date(activeAt);
  if (
    Number.isNaN(occurrenceStart.getTime()) ||
    Number.isNaN(activeDate.getTime()) ||
    activeDate.getTime() > occurrenceStart.getTime()
  ) {
    return false;
  }
  const endedAt = asString(row.rosterEndedAt);
  if (!endedAt) {
    return true;
  }
  const endedDate = new Date(endedAt);
  return !Number.isNaN(endedDate.getTime()) && endedDate.getTime() > occurrenceStart.getTime();
}
function occurrenceCompletionDate(row: SeedRow): string | undefined {
  return parseIsoDatePart(asString(row.occurrenceDate));
}
function completedOccurrenceDates(rows: SeedRow[], sessionId: string): Set<string> {
  return new Set(
    rows.flatMap((row) => {
      const date = occurrenceCompletionDate(row);
      return asString(row.groupSessionId) === sessionId && date ? [date] : [];
    }),
  );
}
function pendingCompletionOccurrence(params: {
  session: SeedRow;
  occurrenceCompletions: SeedRow[];
  now: Date;
}): AppGroupSessionSchedule | null {
  const sessionId = asString(params.session.id) ?? '';
  const completedDates = completedOccurrenceDates(params.occurrenceCompletions, sessionId);
  const cancelledDates = new Set(asStringArray(params.session.cancelledInstancesJson));
  return (
    buildScheduleEntries(params.session.scheduleJson)
      .filter((occurrence) => !cancelledDates.has(occurrence.date))
      .filter((occurrence) => {
        const endsAt = new Date(`${occurrence.date}T${occurrence.endTime}:00.000Z`);
        return !Number.isNaN(endsAt.getTime()) && endsAt.getTime() <= params.now.getTime();
      })
      .filter((occurrence) => !completedDates.has(occurrence.date))
      .sort((left, right) => left.date.localeCompare(right.date))[0] ?? null
  );
}
function willCompleteSeriesAfterOccurrence(params: {
  session: SeedRow;
  occurrenceCompletions: SeedRow[];
  occurrenceDate: string;
  now: Date;
}): boolean {
  const sessionId = asString(params.session.id) ?? '';
  const completedDates = completedOccurrenceDates(params.occurrenceCompletions, sessionId);
  completedDates.add(params.occurrenceDate);
  const cancelledDates = new Set(asStringArray(params.session.cancelledInstancesJson));
  const scheduled = buildScheduleEntries(params.session.scheduleJson).filter(
    (occurrence) => !cancelledDates.has(occurrence.date),
  );
  return (
    scheduled.length > 0 &&
    scheduled.every((occurrence) => {
      const endsAt = new Date(`${occurrence.date}T${occurrence.endTime}:00.000Z`);
      return (
        !Number.isNaN(endsAt.getTime()) &&
        endsAt.getTime() <= params.now.getTime() &&
        completedDates.has(occurrence.date)
      );
    })
  );
}
function isActiveCompletionRegistration(row: SeedRow): boolean {
  const status = asString(row.status)?.toUpperCase();
  return (
    asString(row.deletedAt) == null &&
    status !== 'CANCELLED' &&
    status !== 'WAITLISTED'
  );
}
function recurringRegistrationStatus(row: SeedRow): 'REGISTERED' | 'WAITLISTED' | 'CANCELLED' {
  const status = asString(row.status)?.toUpperCase();
  if (status === 'WAITLISTED' || status === 'CANCELLED') {
    return status;
  }
  return 'REGISTERED';
}
function assertExactCompletionRoster(
  sessionId: string,
  registrations: SeedRow[],
  occurrence: AppGroupSessionSchedule,
  attendance: CompleteGroupSessionRequest['attendance'],
): void {
  const registrationIds = attendance.map((entry) => entry.registrationId);
  if (new Set(registrationIds).size !== registrationIds.length) {
    throw badRequest('Group session completion attendance contains duplicate registrations', {
      sessionId,
    });
  }
  const activeIds = new Set(
    registrations.flatMap((row) => {
      const id = asString(row.id);
      return isRegistrationActiveForOccurrence(row, occurrence) && id ? [id] : [];
    }),
  );
  if (
    activeIds.size !== registrationIds.length ||
    registrationIds.some((registrationId) => !activeIds.has(registrationId))
  ) {
    throw badRequest('Group session completion requires the exact active roster', {
      sessionId,
      activeRegistrationCount: activeIds.size,
      submittedRegistrationCount: registrationIds.length,
    });
  }
}
function attendanceProofStatus(row: SeedRow): 'ATTENDED' | 'NO_SHOW' | null {
  const status = asString(row.status)?.toUpperCase();
  return status === 'ATTENDED' || status === 'NO_SHOW' ? status : null;
}
function completionMatchesExistingProof(params: {
  sessionId: string;
  occurrenceDate: string;
  registrations: SeedRow[];
  attendanceRecords: SeedRow[];
  attendance: CompleteGroupSessionRequest['attendance'];
}): boolean {
  const registrationById = new Map(
    params.registrations.flatMap((registration) => {
      const id = asString(registration.id);
      return id ? [[id, registration] as const] : [];
    }),
  );
  return params.attendance.every((input) => {
    const registration = registrationById.get(input.registrationId);
    if (!registration) {
      return false;
    }
    const proof = params.attendanceRecords.filter(
      (record) =>
        asString(record.groupSessionId) === params.sessionId &&
        asString(record.athleteId) === asString(registration.athleteId) &&
        parseIsoDatePart(asString(record.recordedAt) ?? asString(record.createdAt)) ===
          params.occurrenceDate &&
        attendanceProofStatus(record) !== null,
    );
    if (proof.length !== 1) {
      return false;
    }
    const [record] = proof;
    return (
      attendanceProofStatus(record!) === input.status &&
      (asString(record!.notes) ?? null) === (input.notes ?? null) &&
      (asNumber(record!.effortRating) ?? null) === (input.effortRating ?? null)
    );
  });
}
function applyDerivedGroupCompletionState(params: {
  session: SeedRow;
  registrations: SeedRow[];
  attendanceRecords: SeedRow[];
  occurrenceCompletions: SeedRow[];
  actorUserId: string;
  now: Date;
}): void {
  const sessionId = asString(params.session.id) ?? '';
  const activeRegistrations = params.registrations.filter(isActiveCompletionRegistration);
  const cancelledDates = new Set(asStringArray(params.session.cancelledInstancesJson));
  const scheduled = buildScheduleEntries(params.session.scheduleJson).filter(
    (entry) => !cancelledDates.has(entry.date),
  );
  const scheduledDates = new Set(scheduled.map((entry) => entry.date));
  const completedDates = completedOccurrenceDates(params.occurrenceCompletions, sessionId);
  const completed =
    scheduled.length > 0 &&
    scheduled.every((entry) => {
      const endsAt = new Date(`${entry.date}T${entry.endTime}:00.000Z`);
      return (
        !Number.isNaN(endsAt.getTime()) &&
        endsAt.getTime() <= params.now.getTime() &&
        completedDates.has(entry.date)
      );
    });
  const updatedAt = params.now.toISOString();
  for (const registration of activeRegistrations) {
    if (completed) {
      const proof = params.attendanceRecords.filter(
        (record) =>
          asString(record.groupSessionId) === sessionId &&
          asString(record.athleteId) === asString(registration.athleteId) &&
          scheduledDates.has(
            parseIsoDatePart(asString(record.recordedAt) ?? asString(record.createdAt)) ?? '',
          ) &&
          attendanceProofStatus(record) !== null,
      );
      registration.status = proof.some((record) => attendanceProofStatus(record) === 'ATTENDED')
        ? 'ATTENDED'
        : 'NO_SHOW';
    } else {
      registration.status = 'REGISTERED';
    }
    registration.updatedAt = updatedAt;
    registration.updatedByUserId = params.actorUserId;
    registration.version = (asNumber(registration.version) ?? 1) + 1;
  }
  params.session.status = completed
    ? 'COMPLETED'
    : derivePublishedSessionStatus(
        asNumber(params.session.maxParticipants) ?? 0,
        asNumber(params.session.currentParticipants) ?? 0,
        asNumber(params.session.offPlatformParticipants) ?? 0,
      );
  params.session.updatedAt = updatedAt;
  params.session.updatedByUserId = params.actorUserId;
  params.session.version = (asNumber(params.session.version) ?? 1) + 1;
}
function deriveRecurringPattern(
  schedule: AppGroupSessionSchedule[],
): AppRecurringPattern | undefined {
  if (schedule.length < 2) {
    return undefined;
  }
  const first = schedule[0];
  const second = schedule[1];
  if (
    !first ||
    !second ||
    first.startTime !== second.startTime ||
    first.endTime !== second.endTime
  ) {
    return undefined;
  }
  const firstDate = new Date(`${first.date}T00:00:00.000Z`);
  const secondDate = new Date(`${second.date}T00:00:00.000Z`);
  if (Number.isNaN(firstDate.getTime()) || Number.isNaN(secondDate.getTime())) {
    return undefined;
  }
  const diffDays = Math.round((secondDate.getTime() - firstDate.getTime()) / 86400000);
  if (diffDays !== 7) {
    return undefined;
  }
  return {
    dayOfWeek: firstDate.getUTCDay(),
    startTime: first.startTime,
    endTime: first.endTime,
    until: schedule[schedule.length - 1]?.date,
  };
}
function groupAttendanceDates(
  attendanceRecords: SeedRow[],
  sessionId: string,
  athleteId: string,
): string[] {
  return Array.from(
    new Set(
      attendanceRecords.flatMap((row) => {
        if (
          !(
            asString(row.groupSessionId) === sessionId &&
            asString(row.athleteId) === athleteId &&
            asString(row.status)?.toUpperCase() === 'ATTENDED'
          )
        )
          return [];
        const mapped = parseIsoDatePart(asString(row.recordedAt) ?? asString(row.createdAt));
        return mapped ? [mapped] : [];
      }),
    ),
  ).sort();
}
function mapSessionRow(session: SeedRow): AppGroupSession {
  const schedule = buildScheduleEntries(session.scheduleJson);
  const recurringPattern = deriveRecurringPattern(schedule);
  const pricePerParticipant = (asNumber(session.pricePerParticipantMinor) ?? 0) / 100;
  return {
    id: asString(session.id) ?? '',
    coachId: asString(session.coachUserId) ?? '',
    ...(asString(session.coachName)
      ? {
          coachName: asString(session.coachName),
        }
      : {}),
    ...(asString(session.clubId)
      ? {
          clubId: asString(session.clubId),
        }
      : {}),
    ...(asString(session.clubName)
      ? {
          clubName: asString(session.clubName),
        }
      : {}),
    ...(asString(session.createdByName)
      ? {
          createdByName: asString(session.createdByName),
        }
      : {}),
    title: asString(session.title) ?? 'Session',
    description: asString(session.description) ?? '',
    sessionType: normalizeStoredSessionType(
      asString(session.sessionType),
      asString(session.squadId),
    ),
    schedule,
    maxParticipants: asNumber(session.maxParticipants) ?? 0,
    currentParticipants: asNumber(session.currentParticipants) ?? 0,
    offPlatformParticipants: asNumber(session.offPlatformParticipants) ?? 0,
    waitlistEnabled: asBoolean(session.waitlistEnabled) ?? true,
    waitlistCount: asNumber(session.waitlistCount) ?? 0,
    pricePerParticipant,
    currency: asString(session.currency) ?? 'GBP',
    ...(typeof asNumber(session.ageMin) === 'number'
      ? {
          ageMin: asNumber(session.ageMin),
        }
      : {}),
    ...(typeof asNumber(session.ageMax) === 'number'
      ? {
          ageMax: asNumber(session.ageMax),
        }
      : {}),
    ...(normalizeSkillLevel(asString(session.skillLevel))
      ? {
          skillLevel: normalizeSkillLevel(asString(session.skillLevel)),
        }
      : {}),
    location: asString(session.location) ?? 'TBD',
    isVirtual: asBoolean(session.isVirtual) ?? false,
    status: normalizeSessionStatus(asString(session.status)),
    createdAt: asString(session.createdAt) ?? isoNow(),
    ...(asStringArray(session.focusJson).length > 0
      ? {
          focus: asStringArray(session.focusJson),
        }
      : {}),
    ...(asStringArray(session.equipmentJson).length > 0
      ? {
          equipment: asStringArray(session.equipmentJson),
        }
      : {}),
    ...(schedule.length > 1
      ? {
          isRecurring: true,
        }
      : {}),
    ...(recurringPattern
      ? {
          recurringPattern,
        }
      : {}),
    ...(asStringArray(session.cancelledInstancesJson).length > 0
      ? {
          cancelledInstances: asStringArray(session.cancelledInstancesJson),
        }
      : {}),
    ...(asString(session.squadId)
      ? {
          squadId: asString(session.squadId),
        }
      : {}),
    ...(pricePerParticipant === 0
      ? {
          isFree: true,
        }
      : {}),
    ...(normalizeStoredInviteType(asString(session.inviteType))
      ? {
          inviteType: normalizeStoredInviteType(asString(session.inviteType)),
        }
      : {}),
    ...(asString(session.registrationDeadlineAt)
      ? {
          registrationDeadline: asString(session.registrationDeadlineAt),
        }
      : {}),
  };
}
function mapRegistrationRow(
  registration: SeedRow,
  attendanceRecords: SeedRow[],
): AppGroupRegistration {
  const sessionId = asString(registration.groupSessionId) ?? '';
  const athleteId = asString(registration.athleteId) ?? '';
  const athlete = asObject(registration.athlete);
  const athleteName =
    asString(registration.athleteName)?.trim() || asString(athlete?.displayName)?.trim();
  const parentName = asString(registration.parentName)?.trim();
  return {
    id: asString(registration.id) ?? '',
    sessionId,
    athleteId,
    ...(athleteName ? { athleteName } : {}),
    parentId: asString(registration.parentUserId) ?? '',
    ...(parentName ? { parentName } : {}),
    status:
      (asString(registration.status)?.toUpperCase() as AppGroupRegistration['status']) ??
      'REGISTERED',
    registeredAt: asString(registration.registeredAt) ?? isoNow(),
    ...(asString(registration.paidAt)
      ? {
          paidAt: asString(registration.paidAt),
        }
      : {}),
    attendedDates: groupAttendanceDates(attendanceRecords, sessionId, athleteId),
    ...(asString(registration.notes)
      ? {
          notes: asString(registration.notes),
        }
      : {}),
  };
}

function withStoreRegistrationIdentity(tables: SeedTables, registration: SeedRow): SeedRow {
  const athleteId = asString(registration.athleteId);
  const parentUserId = asString(registration.parentUserId);
  const athlete = athleteId
    ? asRows(tables.athletes).find(
        (row) => asString(row.id) === athleteId && asString(row.deletedAt) == null,
      )
    : undefined;
  const parent = parentUserId
    ? asRows(tables.users).find(
        (row) => asString(row.id) === parentUserId && asString(row.deletedAt) == null,
      )
    : undefined;
  return {
    ...registration,
    ...(athlete ? { athlete } : {}),
    ...(asString(athlete?.displayName)?.trim()
      ? { athleteName: asString(athlete?.displayName)?.trim() }
      : {}),
    ...(asString(parent?.name)?.trim()
      ? { parentName: asString(parent?.name)?.trim() }
      : {}),
  };
}
function projectRosterRegistrationIdentity(
  registrations: AppGroupRegistration[],
  includeGuardianName: boolean,
): AppGroupRegistration[] {
  if (includeGuardianName) {
    return registrations;
  }
  return registrations.map(({ parentName: _parentName, ...registration }) => registration);
}
function normalizeSessionRsvpStatus(value: unknown): AppSessionRsvpStatus {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'GOING') return 'going';
  if (normalized === 'MAYBE') return 'maybe';
  if (normalized === 'NOT_GOING' || normalized === 'NOT GOING') return 'not_going';
  return 'pending';
}
function toStoredSessionRsvpStatus(value: AppSessionRsvpStatus): string {
  if (value === 'going') return 'GOING';
  if (value === 'maybe') return 'MAYBE';
  if (value === 'not_going') return 'NOT_GOING';
  return 'PENDING';
}
function emptySessionRsvpCounts(): SessionRsvpCounts {
  return {
    going: 0,
    notGoing: 0,
    maybe: 0,
    pending: 0,
  };
}
function incrementSessionRsvpCounts(counts: SessionRsvpCounts, status: unknown): void {
  const normalized = normalizeSessionRsvpStatus(status);
  if (normalized === 'going') counts.going += 1;
  else if (normalized === 'maybe') counts.maybe += 1;
  else if (normalized === 'not_going') counts.notGoing += 1;
  else counts.pending += 1;
}
function mapSessionRsvpRow(row: SeedRow): AppSessionRsvp {
  return {
    id: asString(row.id) ?? '',
    sessionId: asString(row.groupSessionId) ?? asString(row.sessionId) ?? '',
    userId: asString(row.userId) ?? '',
    ...(asString(row.athleteId) ?? asString(row.childId)
      ? {
          childId: asString(row.athleteId) ?? asString(row.childId),
        }
      : {}),
    status: normalizeSessionRsvpStatus(row.status),
    ...(asString(row.respondedAt)
      ? {
          respondedAt: asString(row.respondedAt),
        }
      : {}),
    createdAt: asString(row.createdAt) ?? isoNow(),
  };
}
function sessionRsvpNotification(params: {
  sessionId: string;
  title: string;
  userId: string;
  now: string;
}): SeedRow {
  return {
    id: newId('nfn'),
    userId: params.userId,
    type: 'SESSION_RSVP_REMINDER',
    title: 'Reminder: Session RSVP',
    body: `Please confirm attendance for "${params.title}".`,
    status: 'UNREAD',
    sourceType: 'group_session',
    sourceId: params.sessionId,
    deepLink: `/session/${params.sessionId}/rsvp`,
    metadataJson: {
      sessionId: params.sessionId,
    },
    createdAt: params.now,
    updatedAt: params.now,
    readAt: null,
    dismissedAt: null,
  };
}
function mapContext(
  context: StoreSessionContext,
  occurrence: AppGroupSessionSchedule | null = null,
  tables?: SeedTables,
): GroupSessionRosterResult {
  return {
    session: mapSessionRow(context.session),
    registrations: context.registrations.flatMap((row) =>
      occurrence
        ? isRegistrationActiveForOccurrence(row, occurrence)
          ? [
              mapRegistrationRow(
                tables
                  ? withStoreRegistrationIdentity(tables, {
                      ...row,
                      status: 'REGISTERED',
                    })
                  : {
                      ...row,
                      status: 'REGISTERED',
                    },
                context.attendanceRecords,
              ),
            ]
          : []
        : asString(row.deletedAt) == null && asString(row.status)?.toUpperCase() !== 'CANCELLED'
          ? [
              mapRegistrationRow(
                tables ? withStoreRegistrationIdentity(tables, row) : row,
                context.attendanceRecords,
              ),
            ]
          : [],
    ),
    occurrenceDate: occurrence?.date ?? null,
    dataVersion: null,
  };
}
function buildStoreSessionContext(tables: SeedTables, session: SeedRow): StoreSessionContext {
  const sessionId = asString(session.id) ?? '';
  return {
    session,
    registrations: asRows(tables.groupSessionRegistrations).filter(
      (row) => asString(row.groupSessionId) === sessionId && !asString(row.deletedAt),
    ),
    attendanceRecords: asRows(tables.attendanceRecords).filter(
      (row) => asString(row.groupSessionId) === sessionId,
    ),
  };
}
function getAthleteUserIdsByAthleteId(tables: SeedTables): Map<string, string | undefined> {
  return new Map(
    asRows(tables.athletes).flatMap((item) => {
      const mapped = ((row) => [asString(row.id), asString(row.userId)] as const)(item);
      return ((item) =>
        (([id]) => Boolean(id))(item) ? [(([id, userId]) => [id as string, userId])(item)] : [])(
        mapped,
      );
    }),
  );
}
function hasGuardianAccess(tables: SeedTables, authUserId: string, athleteId: string): boolean {
  return asRows(tables.guardianChildLinks).some(
    (row) =>
      asString(row.athleteId) === athleteId &&
      asString(row.guardianUserId) === authUserId &&
    !asString(row.deletedAt),
  );
}
function canCreateClubSession(role: unknown): boolean {
  const parsedRole = parseOrganizationRole(role);
  if (!parsedRole) {
    return false;
  }
  return canUseClubCapability(parsedRole, 'create_org_sessions', {
    hasGrant: parsedRole === 'COACH',
  });
}
function canAssignClubSession(role: unknown): boolean {
  const parsedRole = parseOrganizationRole(role);
  return Boolean(parsedRole && canUseClubCapability(parsedRole, 'assign_session_coach'));
}
function isActiveClubStaffMembership(row: SeedRow | null | undefined): boolean {
  const role = parseOrganizationRole(row?.role);
  return Boolean(
    row &&
      row.active !== false &&
      !asString(row.deletedAt) &&
      role &&
      isClubStaffRole(role),
  );
}
function assertSeedClubSessionCreateAccess(
  tables: SeedTables,
  authUserId: string,
  targetCoachUserId: string,
  isPrivilegedAdmin: boolean,
  clubId: string | undefined,
  squadId: string | undefined,
): void {
  if (squadId && !clubId) {
    throw badRequest('clubId is required when squadId is supplied', { squadId });
  }
  if (!clubId) {
    return;
  }
  const club = asRows(tables.clubs).find(
    (row) => asString(row.id) === clubId && !asString(row.deletedAt),
  );
  if (!club) {
    throw notFound('Club not found', { clubId });
  }
  if (squadId) {
    const squad = asRows(tables.squads).find(
      (row) =>
        asString(row.id) === squadId &&
        asString(row.clubId) === clubId &&
        !asString(row.deletedAt),
    );
    if (!squad) {
      throw notFound('Squad not found', { clubId, squadId });
    }
  }
  const targetMembership = asRows(tables.clubMemberships).find(
    (row) => asString(row.clubId) === clubId && asString(row.userId) === targetCoachUserId,
  );
  if (!isActiveClubStaffMembership(targetMembership)) {
    throw forbidden('Assigned coach must be active club staff', {
      clubId,
      targetCoachUserId,
    });
  }
  if (isPrivilegedAdmin) {
    return;
  }
  const membership = asRows(tables.clubMemberships).find(
    (row) =>
      asString(row.clubId) === clubId &&
      asString(row.userId) === authUserId &&
      row.active !== false &&
      !asString(row.deletedAt),
  );
  const isSelfCreate = targetCoachUserId === authUserId;
  const canCreate = membership && canCreateClubSession(membership.role);
  const canAssign = membership && canAssignClubSession(membership.role);
  if (!canCreate || (!isSelfCreate && !canAssign)) {
    throw forbidden('You do not have permission to create group sessions for this club', {
      clubId,
    });
  }
}
function assertAthleteReadAccess(
  tables: SeedTables,
  authUserId: string,
  athleteId: string,
  isPrivilegedAdmin: boolean,
): void {
  if (isPrivilegedAdmin) {
    return;
  }
  const athleteUserId = getAthleteUserIdsByAthleteId(tables).get(athleteId);
  if (athleteUserId === authUserId || hasGuardianAccess(tables, authUserId, athleteId)) {
    return;
  }
  throw forbidden('Authenticated user cannot access this athlete', {
    athleteId,
  });
}
function canUserReadSeedSession(
  tables: SeedTables,
  session: SeedRow,
  authUserId: string,
  isPrivilegedAdmin: boolean,
  discover: boolean,
): boolean {
  const sessionId = asString(session.id);
  if (!sessionId) {
    return false;
  }
  if (isPrivilegedAdmin || asString(session.coachUserId) === authUserId) {
    return true;
  }
  const clubId = asString(session.clubId);
  if (
    clubId &&
    asRows(tables.clubMemberships).some(
      (row) =>
        asString(row.clubId) === clubId &&
        asString(row.userId) === authUserId &&
        row.active !== false &&
        !asString(row.deletedAt),
    )
  ) {
    return true;
  }
  const athleteUserIdsByAthleteId = getAthleteUserIdsByAthleteId(tables);
  const hasRegistration = asRows(tables.groupSessionRegistrations).some((row) => {
    if (asString(row.groupSessionId) !== sessionId || asString(row.deletedAt)) {
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
  const inviteIds = asRows(tables.invites).flatMap((row) => {
    if (!(asString(row.groupSessionId) === sessionId && !asString(row.revokedAt))) return [];
    const mapped = asString(row.id);
    return Boolean(mapped) ? [mapped] : [];
  });
  if (
    asRows(tables.inviteTargets).some(
      (row) =>
        inviteIds.includes(asString(row.inviteId) ?? '') &&
        asString(row.targetUserId) === authUserId,
    )
  ) {
    return true;
  }
  if (discover) {
    const status = normalizeSessionStatus(asString(session.status));
    const inviteType = normalizeStoredInviteType(asString(session.inviteType));
    return (
      (status === 'PUBLISHED' || status === 'FULL') &&
      inviteType !== 'SQUAD_ONLY' &&
      inviteType !== 'CLOSED'
    );
  }
  return false;
}
function canManageSeedSessionRsvps(
  tables: SeedTables,
  session: SeedRow,
  authUserId: string,
  isPrivilegedAdmin: boolean,
): boolean {
  if (isPrivilegedAdmin || asString(session.coachUserId) === authUserId) {
    return true;
  }
  const clubId = asString(session.clubId);
  if (!clubId) {
    return false;
  }
  const membership = asRows(tables.clubMemberships).find(
    (row) =>
      asString(row.clubId) === clubId &&
      asString(row.userId) === authUserId &&
      row.active !== false &&
      !asString(row.deletedAt),
  );
  const role = parseOrganizationRole(membership?.role);
  return Boolean(
    role &&
      (isClubStaffRole(role) ||
        canUseClubCapability(role, 'view_program_attendance', {
          hasGrant: role === 'COACH',
        })),
  );
}
function assertSeedSessionRsvpReadAccess(
  tables: SeedTables,
  session: SeedRow,
  authUserId: string,
  isPrivilegedAdmin: boolean,
): void {
  if (canUserReadSeedSession(tables, session, authUserId, isPrivilegedAdmin, true)) {
    return;
  }
  throw forbidden('Group session RSVP does not belong to authenticated user', {
    sessionId: asString(session.id),
  });
}
function assertSeedSessionRsvpManageAccess(
  tables: SeedTables,
  session: SeedRow,
  authUserId: string,
  isPrivilegedAdmin: boolean,
): void {
  if (canManageSeedSessionRsvps(tables, session, authUserId, isPrivilegedAdmin)) {
    return;
  }
  throw forbidden('Only session staff can manage RSVP state', {
    sessionId: asString(session.id),
  });
}
function assertSeedSessionRsvpMemberWriteAccess(params: {
  tables: SeedTables;
  session: SeedRow;
  authUserId: string;
  isPrivilegedAdmin: boolean;
  member: SessionRsvpMemberInput;
}): void {
  if (
    canManageSeedSessionRsvps(
      params.tables,
      params.session,
      params.authUserId,
      params.isPrivilegedAdmin,
    )
  ) {
    return;
  }
  if (params.member.userId !== params.authUserId) {
    throw forbidden('RSVP userId must match authenticated user', {
      userId: params.member.userId,
    });
  }
  if (params.member.childId) {
    assertAthleteReadAccess(
      params.tables,
      params.authUserId,
      params.member.childId,
      params.isPrivilegedAdmin,
    );
  }
}
function findLinkedSeedBooking(
  tables: SeedTables,
  sessionId: string,
  athleteId: string,
): SeedRow | undefined {
  const participantRows = asRows(tables.bookingParticipants);
  const bookingIds = new Set(
    participantRows.flatMap((row) => {
      if (!(asString(row.athleteId) === athleteId && !asString(row.deletedAt))) return [];
      const mapped = asString(row.bookingId);
      return Boolean(mapped) ? [mapped] : [];
    }),
  );
  return asRows(tables.bookings).find(
    (row) =>
      asString(row.groupSessionId) === sessionId &&
      bookingIds.has(asString(row.id) ?? '') &&
      asString(row.deletedAt) == null &&
      asString(row.status)?.toUpperCase() !== 'CANCELLED',
  );
}
function completeSeedLinkedBooking(params: {
  tables: SeedTables;
  booking: SeedRow;
  authUserId: string;
  requestId: string;
  attendanceRecordId: string;
  status: 'ATTENDED' | 'NO_SHOW';
  completedAt: string;
}): void {
  const currentStatus = asString(params.booking.status)?.toUpperCase();
  if (currentStatus === 'COMPLETED') {
    return;
  }
  if (currentStatus !== 'CONFIRMED' && currentStatus !== 'AWAITING_COMPLETION') {
    throw conflict('Linked group booking is not eligible for completion', {
      bookingId: asString(params.booking.id),
      status: currentStatus,
    });
  }
  params.booking.status = 'COMPLETED';
  params.booking.updatedAt = params.completedAt;
  params.booking.updatedByUserId = params.authUserId;
  params.booking.version = (asNumber(params.booking.version) ?? 1) + 1;
  asRows(params.tables.bookingStatusEvents).push({
    id: newId('bse'),
    bookingId: asString(params.booking.id),
    fromStatus: currentStatus,
    toStatus: 'COMPLETED',
    actorUserId: params.authUserId,
    reason: 'Completed with group session attendance',
    metadataJson: {
      source: 'group-session-completion',
      attendanceRecordIds: [params.attendanceRecordId],
      attendanceSummary: {
        attended: params.status === 'ATTENDED' ? 1 : 0,
        noShow: params.status === 'NO_SHOW' ? 1 : 0,
      },
      proofSource: 'attendance-record',
    },
    requestId: params.requestId,
    occurredAt: params.completedAt,
  });
  const bookingId = asString(params.booking.id);
  if (!bookingId) {
    return;
  }
  const athleteUserIdByAthleteId = new Map(
    asRows(params.tables.athletes).flatMap((athlete) => {
      const athleteId = asString(athlete.id);
      return athleteId
        ? [[athleteId, asString(athlete.userId) ?? null] as const]
        : [];
    }),
  );
  const participantRows = asRows(params.tables.bookingParticipants).filter(
    (participant) =>
      asString(participant.bookingId) === bookingId && !asString(participant.deletedAt),
  );
  const recipientUserIds = bookingFamilyRecipientIds({
    actorUserId: params.authUserId,
    bookedByUserId: asString(params.booking.bookedByUserId),
    participants: participantRows.map((participant) => {
      const athleteId = asString(participant.athleteId);
      return {
        guardianUserId: asString(participant.guardianUserId),
        athleteUserId: athleteId ? athleteUserIdByAthleteId.get(athleteId) : null,
      };
    }),
  });
  if (!Array.isArray(params.tables.notifications)) {
    params.tables.notifications = [];
  }
  const notifications = asRows(params.tables.notifications);
  const existingKeys = new Set(
    notifications
      .filter(
        (notification) =>
          asString(notification.sourceId) === bookingId &&
          (asString(notification.sourceType) === BOOKING_COMPLETED_NOTIFICATION_SOURCE_TYPE ||
            asString(notification.sourceType) === BOOKING_REVIEW_PROMPT_NOTIFICATION_SOURCE_TYPE),
      )
      .map(
        (notification) =>
          `${asString(notification.sourceType) ?? ''}:${asString(notification.userId) ?? ''}`,
      ),
  );
  notifications.push(
    ...bookingCompletionNotificationRows({
      bookingId,
      actorUserId: params.authUserId,
      recipientUserIds,
      attendanceSummary: {
        attended: params.status === 'ATTENDED' ? 1 : 0,
        noShow: params.status === 'NO_SHOW' ? 1 : 0,
      },
      now: params.completedAt,
    }).filter(
      (notification) =>
        !existingKeys.has(
          `${asString(notification.sourceType) ?? ''}:${asString(notification.userId) ?? ''}`,
        ),
    ),
  );
}
function cancelSeedBooking(
  tables: SeedTables,
  booking: SeedRow,
  authUserId: string,
  reason: string,
  metadataSource = 'group-session-registration',
): void {
  const now = isoNow();
  const fromStatus = asString(booking.status)?.toUpperCase() ?? 'CONFIRMED';
  booking.status = 'CANCELLED';
  booking.cancelledAt = now;
  booking.cancelledByUserId = authUserId;
  booking.cancelReason = reason;
  booking.updatedAt = now;
  booking.updatedByUserId = authUserId;
  booking.version = (asNumber(booking.version) ?? 1) + 1;
  asRows(tables.bookingStatusEvents).push({
    id: newId('bse'),
    bookingId: asString(booking.id),
    fromStatus,
    toStatus: 'CANCELLED',
    actorUserId: authUserId,
    reason,
    metadataJson: {
      source: metadataSource,
    },
    requestId: null,
    occurredAt: now,
  });
}
function createSeedLinkedBooking(params: {
  tables: SeedTables;
  authUserId: string;
  requestId: string;
  session: SeedRow;
  athleteId: string;
  bookedByUserId: string;
  note: string;
}): {
  id: string;
  status: string;
  recurringSeriesId?: string | null;
  groupSessionId?: string | null;
} {
  const { tables, authUserId, requestId, session, athleteId, bookedByUserId, note } = params;
  const scheduleEntries = asRows(session.scheduleJson);
  const firstWindow = scheduleEntries[0];
  const startsAt = asString(firstWindow?.startsAt) ?? isoNow();
  const endsAt = asString(firstWindow?.endsAt);
  const durationMinutes =
    startsAt && endsAt
      ? Math.max(15, Math.round((Date.parse(endsAt) - Date.parse(startsAt)) / 60000))
      : 60;
  const booking = createBookingInSeedTables({
    tables,
    authUserId,
    requestId,
    body: {
      coachUserId: asString(session.coachUserId) ?? '',
      athleteIds: [athleteId],
      bookedByUserId,
      scheduledAt: startsAt,
      durationMinutes,
      location: asString(session.location) ?? 'Club training ground',
      serviceType: asString(session.sessionType) ?? 'group_training',
      objectives: asStringArray(session.focusJson),
      notes: note,
      priceMinor: asNumber(session.pricePerParticipantMinor) ?? 0,
      currency: 'GBP',
    },
    bookingRowOverrides: {
      groupSessionId: asString(session.id) ?? null,
      clubId: asString(session.clubId) ?? null,
      status: 'CONFIRMED',
      confirmedAt: isoNow(),
    },
  });
  return {
    id: booking.id,
    status: booking.status,
    recurringSeriesId: booking.recurringSeriesId ?? null,
    groupSessionId: booking.groupSessionId ?? null,
  };
}
async function generateLinkedRegistrationInvoiceIfBillable(params: {
  bookingId: string | null | undefined;
  actorUserId: string;
  priceMinor: number | null | undefined;
}): Promise<void> {
  if (!params.bookingId || (params.priceMinor ?? 0) <= 0) {
    return;
  }
  await generateInvoiceForBooking({
    bookingId: params.bookingId,
    actorUserId: params.actorUserId,
    notes: 'Generated from group session waitlist promotion.',
  });
}
function sortSessionsByUpcomingDate(sessions: AppGroupSession[]): AppGroupSession[] {
  return Array.from(sessions).sort((left, right) => {
    const leftAt = left.schedule[0]
      ? `${left.schedule[0].date}T${left.schedule[0].startTime}:00Z`
      : '';
    const rightAt = right.schedule[0]
      ? `${right.schedule[0].date}T${right.schedule[0].startTime}:00Z`
      : '';
    return leftAt.localeCompare(rightAt);
  });
}
class StoreGroupSessionRepository implements GroupSessionRepository {
  constructor(private readonly storeProvider: () => StoreProvider) {}
  async listVisibleSessions(params: GroupSessionListParams): Promise<GroupSessionListResult> {
    const store = this.storeProvider();
    const { tables } = store;
    if (params.athleteId) {
      assertAthleteReadAccess(
        tables,
        params.authUserId,
        params.athleteId,
        params.isPrivilegedAdmin,
      );
    }
    const registrations = asRows(tables.groupSessionRegistrations);
    const sessions = asRows(tables.groupSessions).flatMap((row) => {
      if (asString(row.deletedAt)) {
        return [];
      }
      if (
        params.statusFilter &&
        normalizeSessionStatus(asString(row.status)) !== params.statusFilter.toUpperCase()
      ) {
        return [];
      }
      if (params.coachUserId && asString(row.coachUserId) !== params.coachUserId) {
        return [];
      }
      if (params.clubId && asString(row.clubId) !== params.clubId) {
        return [];
      }
      if (params.squadId && asString(row.squadId) !== params.squadId) {
        return [];
      }
      if (
        params.sessionType &&
        normalizeStoredSessionType(asString(row.sessionType), asString(row.squadId)) !==
          params.sessionType
      ) {
        return [];
      }
      if (
        params.skillLevel &&
        normalizeSkillLevel(asString(row.skillLevel)) !== params.skillLevel.toUpperCase()
      ) {
        return [];
      }
      if (
        params.athleteId &&
        !registrations.some(
          (registration) =>
            asString(registration.groupSessionId) === asString(row.id) &&
            asString(registration.athleteId) === params.athleteId &&
            asString(registration.deletedAt) == null &&
            asString(registration.status)?.toUpperCase() !== 'CANCELLED',
        )
      ) {
        return [];
      }
      return canUserReadSeedSession(
        tables,
        row,
        params.authUserId,
        params.isPrivilegedAdmin,
        params.discover === true,
      )
        ? [mapSessionRow(row)]
        : [];
    });
    return {
      sessions: sortSessionsByUpcomingDate(sessions),
      dataVersion: store.version,
    };
  }
  async getVisibleSessionById(params: GroupSessionAccessParams): Promise<GroupSessionDetailResult> {
    const store = this.storeProvider();
    const session = asRows(store.tables.groupSessions).find(
      (row) => asString(row.id) === params.sessionId && !asString(row.deletedAt),
    );
    if (!session) {
      throw notFound('Group session not found', {
        sessionId: params.sessionId,
      });
    }
    if (
      !canUserReadSeedSession(
        store.tables,
        session,
        params.authUserId,
        params.isPrivilegedAdmin,
        true,
      )
    ) {
      throw forbidden('Group session does not belong to authenticated user', {
        sessionId: params.sessionId,
      });
    }
    return {
      session: mapSessionRow(session),
      dataVersion: store.version,
    };
  }
  async createSession(params: GroupSessionCreateParams): Promise<GroupSessionActionResult> {
    const store = this.storeProvider();
    if (
      !params.body.clubId &&
      !params.isPrivilegedAdmin &&
      params.body.coachId !== params.authUserId
    ) {
      throw forbidden('coachId must match authenticated user');
    }
    assertSeedClubSessionCreateAccess(
      store.tables,
      params.authUserId,
      params.body.coachId,
      params.isPrivilegedAdmin,
      asString(params.body.clubId),
      asString(params.body.squadId),
    );
    const now = isoNow();
    const session: SeedRow = {
      id: newId('gse'),
      coachUserId: params.body.coachId,
      clubId: asString(params.body.clubId) ?? null,
      squadId: asString(params.body.squadId) ?? null,
      recurringSeriesId: null,
      title: params.body.title,
      description: params.body.description ?? '',
      sessionType: toStoredSessionType(params.body.sessionType),
      maxParticipants: params.body.maxParticipants,
      currentParticipants: 0,
      offPlatformParticipants: 0,
      waitlistEnabled: params.body.waitlistEnabled ?? true,
      waitlistCount: 0,
      pricePerParticipantMinor:
        typeof params.body.pricePerParticipant === 'number'
          ? Math.round(Math.max(0, params.body.pricePerParticipant) * 100)
          : 0,
      currency: params.body.currency ?? 'GBP',
      ageMin: params.body.ageMin ?? null,
      ageMax: params.body.ageMax ?? null,
      skillLevel: params.body.skillLevel?.toLowerCase() ?? null,
      location: params.body.location ?? 'TBD',
      isVirtual: params.body.isVirtual ?? false,
      status: 'DRAFT',
      registrationDeadlineAt: params.body.registrationDeadline ?? null,
      inviteType: toStoredInviteType(params.body.inviteType),
      scheduleJson: buildStoredScheduleJson(params.body.schedule),
      cancelledInstancesJson: [],
      focusJson: params.body.focus ?? [],
      equipmentJson: params.body.equipment ?? [],
      createdByUserId: params.authUserId,
      updatedByUserId: params.authUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    };
    asRows(store.tables.groupSessions).push(session);
    return {
      session: mapSessionRow(session),
      dataVersion: store.version,
    };
  }
  async publishSession(params: GroupSessionAccessParams): Promise<GroupSessionActionResult> {
    const store = this.storeProvider();
    const session = asRows(store.tables.groupSessions).find(
      (row) => asString(row.id) === params.sessionId && !asString(row.deletedAt),
    );
    if (!session) {
      throw notFound('Group session not found', {
        sessionId: params.sessionId,
      });
    }
    if (!params.isPrivilegedAdmin && asString(session.coachUserId) !== params.authUserId) {
      throw forbidden('Group session does not belong to authenticated user');
    }
    const maxParticipants = asNumber(session.maxParticipants) ?? 0;
    const currentParticipants = asNumber(session.currentParticipants) ?? 0;
    const offPlatformParticipants = asNumber(session.offPlatformParticipants) ?? 0;
    session.status = derivePublishedSessionStatus(
      maxParticipants,
      currentParticipants,
      offPlatformParticipants,
    );
    session.updatedAt = isoNow();
    session.updatedByUserId = params.authUserId;
    session.version = (asNumber(session.version) ?? 1) + 1;
    return {
      session: mapSessionRow(session),
      dataVersion: store.version,
    };
  }
  async updateOffPlatformParticipants(
    params: GroupSessionOffPlatformParticipantsParams,
  ): Promise<GroupSessionActionResult> {
    const store = this.storeProvider();
    const session = asRows(store.tables.groupSessions).find(
      (row) => asString(row.id) === params.sessionId && !asString(row.deletedAt),
    );
    if (!session) {
      throw notFound('Group session not found', {
        sessionId: params.sessionId,
      });
    }
    if (!params.isPrivilegedAdmin && asString(session.coachUserId) !== params.authUserId) {
      throw forbidden('Group session does not belong to authenticated user');
    }
    const maxParticipants = asNumber(session.maxParticipants) ?? 0;
    const currentParticipants = asNumber(session.currentParticipants) ?? 0;
    session.offPlatformParticipants = params.count;
    session.status = deriveSessionStatusForHeadcount(
      asString(session.status),
      maxParticipants,
      currentParticipants,
      params.count,
    );
    session.updatedAt = isoNow();
    session.updatedByUserId = params.authUserId;
    session.version = (asNumber(session.version) ?? 1) + 1;
    return {
      session: mapSessionRow(session),
      dataVersion: store.version,
    };
  }
  async cancelInstance(
    params: GroupSessionCancelInstanceParams,
  ): Promise<GroupSessionActionResult> {
    const store = this.storeProvider();
    const session = asRows(store.tables.groupSessions).find(
      (row) => asString(row.id) === params.sessionId && !asString(row.deletedAt),
    );
    if (!session) {
      throw notFound('Group session not found', {
        sessionId: params.sessionId,
      });
    }
    if (!params.isPrivilegedAdmin && asString(session.coachUserId) !== params.authUserId) {
      throw forbidden('Group session does not belong to authenticated user');
    }
    assertRecurringInstanceExists(params.sessionId, session.scheduleJson, params.date);
    assertOccurrencesCanBeCancelled({
      session,
      dates: [params.date],
      occurrenceCompletions: asRows(store.tables.groupSessionOccurrenceCompletions),
      now: new Date(),
    });
    const cancelled = new Set(asStringArray(session.cancelledInstancesJson));
    cancelled.add(params.date);
    session.cancelledInstancesJson = Array.from(cancelled).sort();
    session.updatedAt = isoNow();
    session.updatedByUserId = params.authUserId;
    session.version = (asNumber(session.version) ?? 1) + 1;
    return {
      session: mapSessionRow(session),
      dataVersion: store.version,
    };
  }
  async endSeries(params: GroupSessionEndSeriesParams): Promise<GroupSessionActionResult> {
    const store = this.storeProvider();
    const session = asRows(store.tables.groupSessions).find(
      (row) => asString(row.id) === params.sessionId && !asString(row.deletedAt),
    );
    if (!session) {
      throw notFound('Group session not found', {
        sessionId: params.sessionId,
      });
    }
    if (!params.isPrivilegedAdmin && asString(session.coachUserId) !== params.authUserId) {
      throw forbidden('Group session does not belong to authenticated user');
    }
    const dates = scheduledRecurringDatesFrom(
      params.sessionId,
      session.scheduleJson,
      params.fromDate,
    );
    assertOccurrencesCanBeCancelled({
      session,
      dates,
      occurrenceCompletions: asRows(store.tables.groupSessionOccurrenceCompletions),
      now: new Date(),
    });
    const cancelled = new Set(asStringArray(session.cancelledInstancesJson));
    for (const date of dates) {
      cancelled.add(date);
    }
    session.cancelledInstancesJson = Array.from(cancelled).sort();
    session.updatedAt = isoNow();
    session.updatedByUserId = params.authUserId;
    session.version = (asNumber(session.version) ?? 1) + 1;
    return {
      session: mapSessionRow(session),
      dataVersion: store.version,
    };
  }
  async cancelSession(params: GroupSessionAccessParams): Promise<GroupSessionActionResult> {
    const store = this.storeProvider();
    const session = asRows(store.tables.groupSessions).find(
      (row) => asString(row.id) === params.sessionId && !asString(row.deletedAt),
    );
    if (!session) {
      throw notFound('Group session not found', {
        sessionId: params.sessionId,
      });
    }
    if (!params.isPrivilegedAdmin && asString(session.coachUserId) !== params.authUserId) {
      throw forbidden('Group session does not belong to authenticated user');
    }
    if (normalizeSessionStatus(asString(session.status)) === 'COMPLETED') {
      throw conflict('Completed group sessions cannot be cancelled', {
        sessionId: params.sessionId,
      });
    }
    if (
      asRows(store.tables.groupSessionOccurrenceCompletions).some(
        (row) => asString(row.groupSessionId) === params.sessionId,
      )
    ) {
      throw conflict('Group sessions with completed occurrences cannot be cancelled', {
        sessionId: params.sessionId,
      });
    }
    const activeBookings = asRows(store.tables.bookings).filter(
      (row) =>
        asString(row.groupSessionId) === params.sessionId &&
        asString(row.deletedAt) == null &&
        asString(row.status)?.toUpperCase() !== 'CANCELLED',
    );
    const finalizedRegistration = asRows(store.tables.groupSessionRegistrations).find(
      (row) =>
        asString(row.groupSessionId) === params.sessionId &&
        asString(row.deletedAt) == null &&
        (asString(row.status)?.toUpperCase() === 'ATTENDED' ||
          asString(row.status)?.toUpperCase() === 'NO_SHOW'),
    );
    const completedBooking = activeBookings.find(
      (booking) => asString(booking.status)?.toUpperCase() === 'COMPLETED',
    );
    if (finalizedRegistration || completedBooking) {
      throw conflict('Group sessions with finalized attendance cannot be cancelled', {
        sessionId: params.sessionId,
        registrationId: asString(finalizedRegistration?.id) ?? null,
        bookingId: asString(completedBooking?.id) ?? null,
      });
    }
    const activeBookingIds = new Set(
      activeBookings.flatMap((row) => {
        const mapped = asString(row.id);
        return Boolean(mapped) ? [mapped] : [];
      }),
    );
    const paidInvoice = asRows(store.tables.invoices).find(
      (row) =>
        activeBookingIds.has(asString(row.bookingId) ?? '') &&
        asString(row.deletedAt) == null &&
        asString(row.status)?.toUpperCase() === 'PAID',
    );
    if (paidInvoice) {
      throw badRequest('Paid booking invoices require a refund workflow before cancellation', {
        bookingId: asString(paidInvoice.bookingId),
        invoiceId: asString(paidInvoice.id),
      });
    }
    await activeBookings.reduce(
      (chain, booking) =>
        chain.then(() =>
          applyBookingCancellationInvoiceEffects({
            bookingId: asString(booking.id) ?? '',
            actorUserId: params.authUserId,
            reason: 'Group session cancelled.',
            requestId: params.requestId,
          }),
        ),
      Promise.resolve(),
    );
    const now = isoNow();
    for (const registration of asRows(store.tables.groupSessionRegistrations).filter(
      (row) =>
        asString(row.groupSessionId) === params.sessionId &&
        asString(row.deletedAt) == null &&
        asString(row.status)?.toUpperCase() !== 'CANCELLED',
    )) {
      registration.status = 'CANCELLED';
      registration.rosterEndedAt = now;
      registration.updatedAt = now;
      registration.updatedByUserId = params.authUserId;
      registration.version = (asNumber(registration.version) ?? 1) + 1;
    }
    for (const attendance of asRows(store.tables.attendanceRecords).filter(
      (row) => asString(row.groupSessionId) === params.sessionId,
    )) {
      attendance.groupSessionId = null;
      attendance.updatedAt = now;
    }
    for (const booking of activeBookings) {
      cancelSeedBooking(
        store.tables,
        booking,
        params.authUserId,
        'Group session cancelled.',
        'group-session-cancellation',
      );
    }
    session.status = 'CANCELLED';
    session.currentParticipants = 0;
    session.waitlistCount = 0;
    session.updatedAt = now;
    session.updatedByUserId = params.authUserId;
    session.version = (asNumber(session.version) ?? 1) + 1;
    return {
      session: mapSessionRow(session),
      dataVersion: store.version,
    };
  }
  async registerAthlete(params: GroupSessionRegisterParams): Promise<GroupSessionRegisterResult> {
    const store = this.storeProvider();
    const session = asRows(store.tables.groupSessions).find(
      (row) => asString(row.id) === params.sessionId && !asString(row.deletedAt),
    );
    if (!session) {
      throw notFound('Group session not found', {
        sessionId: params.sessionId,
      });
    }
    assertAthleteReadAccess(
      store.tables,
      params.authUserId,
      params.athleteId,
      params.isPrivilegedAdmin,
    );
    const registrations = asRows(store.tables.groupSessionRegistrations);
    const activeRegistration = registrations.find(
      (row) =>
        asString(row.groupSessionId) === params.sessionId &&
        asString(row.athleteId) === params.athleteId &&
        asString(row.deletedAt) == null &&
        asString(row.status)?.toUpperCase() !== 'CANCELLED',
    );
    if (activeRegistration) {
      const registration = mapRegistrationRow(
        activeRegistration,
        asRows(store.tables.attendanceRecords),
      );
      if (params.waitlistOnly && registration.status !== 'WAITLISTED') {
        throw conflict('Athlete is already registered for this group session', {
          sessionId: params.sessionId,
          registrationId: registration.id,
        });
      }
      if (registration.status === 'REGISTERED') {
        ensureStoreGroupSessionThread({
          tables: store.tables,
          session,
          participantEntries: buildSessionThreadParticipants({
            coachUserId: asString(session.coachUserId),
            bookedByUserId: registration.parentId,
            athleteUserId: getAthleteUserIdsByAthleteId(store.tables).get(registration.athleteId),
          }),
          authUserId: params.authUserId,
          now: isoNow(),
        });
      }
      const linkedBooking = findLinkedSeedBooking(store.tables, params.sessionId, params.athleteId);
      return {
        registration,
        booking: linkedBooking
          ? {
              id: asString(linkedBooking.id) ?? '',
              status: asString(linkedBooking.status) ?? 'CONFIRMED',
              recurringSeriesId: asString(linkedBooking.recurringSeriesId) ?? null,
              groupSessionId: asString(linkedBooking.groupSessionId) ?? null,
            }
          : null,
        sessionStatus: normalizeSessionStatus(asString(session.status)),
        dataVersion: store.version,
      };
    }
    assertSessionOpenForRegistration(session, new Date());
    requireAssignedDeliveryCoach(params.sessionId, asString(session.coachUserId));
    const currentParticipants = asNumber(session.currentParticipants) ?? 0;
    const offPlatformParticipants = asNumber(session.offPlatformParticipants) ?? 0;
    const maxParticipants = asNumber(session.maxParticipants) ?? 0;
    const waitlistEnabled = asBoolean(session.waitlistEnabled) ?? true;
    const isFull =
      maxParticipants > 0 &&
      groupSessionHeadcount(currentParticipants, offPlatformParticipants) >= maxParticipants;
    if (params.waitlistOnly && !isFull) {
      throw conflict('Group session has spaces available; register instead', {
        sessionId: params.sessionId,
      });
    }
    if (isFull && !waitlistEnabled) {
      throw badRequest(params.waitlistOnly ? 'Group session waitlist is not enabled' : 'Group session is full', {
        sessionId: params.sessionId,
      });
    }
    const now = isoNow();
    const status = isFull ? 'WAITLISTED' : 'REGISTERED';
    const registration: SeedRow = {
      id: newId('gsr'),
      groupSessionId: params.sessionId,
      athleteId: params.athleteId,
      parentUserId: params.bookedByUserId,
      status,
      paidAt: null,
      notes: params.note,
      createdByUserId: params.authUserId,
      updatedByUserId: params.authUserId,
      version: 1,
      registeredAt: now,
      rosterActiveAt: status === 'REGISTERED' ? now : null,
      rosterEndedAt: null,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    };
    registrations.push(registration);
    let booking: {
      id: string;
      status: string;
      recurringSeriesId?: string | null;
      groupSessionId?: string | null;
    } | null = null;
    if (isFull) {
      session.waitlistCount = (asNumber(session.waitlistCount) ?? 0) + 1;
      session.status = 'FULL';
    } else {
      const updatedParticipants = currentParticipants + 1;
      session.currentParticipants = updatedParticipants;
      session.status = derivePublishedSessionStatus(
        maxParticipants,
        updatedParticipants,
        offPlatformParticipants,
      );
      booking = createSeedLinkedBooking({
        tables: store.tables,
        authUserId: params.authUserId,
        requestId: params.requestId,
        session,
        athleteId: params.athleteId,
        bookedByUserId: params.bookedByUserId,
        note: params.note,
      });
      ensureStoreGroupSessionThread({
        tables: store.tables,
        session,
        participantEntries: buildSessionThreadParticipants({
          coachUserId: asString(session.coachUserId),
          bookedByUserId: params.bookedByUserId,
          athleteUserId: getAthleteUserIdsByAthleteId(store.tables).get(params.athleteId),
        }),
        authUserId: params.authUserId,
        now,
      });
    }
    session.updatedAt = now;
    session.updatedByUserId = params.authUserId;
    session.version = (asNumber(session.version) ?? 1) + 1;
    return {
      registration: mapRegistrationRow(registration, asRows(store.tables.attendanceRecords)),
      booking,
      sessionStatus: normalizeSessionStatus(asString(session.status)),
      dataVersion: store.version,
    };
  }
  async listSessionRoster(params: GroupSessionAccessParams): Promise<GroupSessionRosterResult> {
    const store = this.storeProvider();
    const session = asRows(store.tables.groupSessions).find(
      (row) => asString(row.id) === params.sessionId && !asString(row.deletedAt),
    );
    if (!session) {
      throw notFound('Group session not found', {
        sessionId: params.sessionId,
      });
    }
    if (
      params.forCompletion &&
      !params.isPrivilegedAdmin &&
      asString(session.coachUserId) !== params.authUserId
    ) {
      throw forbidden('Only the assigned coach can read a group session completion roster', {
        sessionId: params.sessionId,
      });
    }
    if (
      !canUserReadSeedSession(
        store.tables,
        session,
        params.authUserId,
        params.isPrivilegedAdmin,
        true,
      )
    ) {
      throw forbidden('Group session does not belong to authenticated user', {
        sessionId: params.sessionId,
      });
    }
    const context = buildStoreSessionContext(store.tables, session);
    const occurrence = params.forCompletion
      ? pendingCompletionOccurrence({
          session,
          occurrenceCompletions: asRows(store.tables.groupSessionOccurrenceCompletions),
          now: new Date(),
        })
      : null;
    if (params.forCompletion && !occurrence) {
      return {
        session: mapSessionRow(session),
        registrations: [],
        occurrenceDate: null,
        dataVersion: store.version,
      };
    }
    const mapped = mapContext(context, occurrence, store.tables);
    const includeGuardianName =
      params.isPrivilegedAdmin || asString(session.coachUserId) === params.authUserId;
    return {
      ...mapped,
      registrations: projectRosterRegistrationIdentity(
        mapped.registrations,
        includeGuardianName,
      ),
      dataVersion: store.version,
    };
  }
  async cancelRegistration(
    params: GroupSessionRegistrationAccessParams,
  ): Promise<GroupSessionRegistrationResult> {
    const store = this.storeProvider();
    const registration = asRows(store.tables.groupSessionRegistrations).find(
      (row) => asString(row.id) === params.registrationId && asString(row.deletedAt) == null,
    );
    if (!registration) {
      throw notFound('Group session registration not found', {
        registrationId: params.registrationId,
      });
    }
    const athleteId = asString(registration.athleteId) ?? '';
    const sessionId = asString(registration.groupSessionId) ?? '';
    const session = asRows(store.tables.groupSessions).find(
      (row) => asString(row.id) === sessionId,
    );
    if (!session) {
      throw notFound('Group session not found', {
        sessionId,
      });
    }
    const athleteUserId = getAthleteUserIdsByAthleteId(store.tables).get(athleteId);
    const canManage =
      params.isPrivilegedAdmin ||
      asString(session.coachUserId) === params.authUserId ||
      asString(registration.parentUserId) === params.authUserId ||
      athleteUserId === params.authUserId;
    if (!canManage) {
      throw forbidden('Group session registration does not belong to authenticated user', {
        registrationId: params.registrationId,
      });
    }
    const now = isoNow();
    const previousStatus = asString(registration.status)?.toUpperCase() ?? 'REGISTERED';
    if (normalizeSessionStatus(asString(session.status)) === 'COMPLETED') {
      throw conflict('Completed group session registrations cannot be cancelled', {
        registrationId: params.registrationId,
        sessionId,
      });
    }
    if (previousStatus === 'ATTENDED' || previousStatus === 'NO_SHOW') {
      throw conflict('Finalized attendance cannot be cancelled through registration removal', {
        registrationId: params.registrationId,
        sessionId,
      });
    }
    const booking =
      previousStatus === 'REGISTERED'
        ? findLinkedSeedBooking(store.tables, sessionId, athleteId)
        : null;
    if (booking && asString(booking.status)?.toUpperCase() === 'COMPLETED') {
      throw conflict('Completed group bookings cannot be cancelled through registration removal', {
        registrationId: params.registrationId,
        bookingId: asString(booking.id),
      });
    }
    if (
      booking &&
      asString(booking.status)?.toUpperCase() !== 'CONFIRMED' &&
      asString(booking.status)?.toUpperCase() !== 'AWAITING_COMPLETION'
    ) {
      throw conflict('Linked group booking is not eligible for cancellation', {
        registrationId: params.registrationId,
        bookingId: asString(booking.id),
        status: asString(booking.status),
      });
    }
    if (booking) {
      await applyBookingCancellationInvoiceEffects({
        bookingId: asString(booking.id) ?? '',
        actorUserId: params.authUserId,
        reason: 'Group session registration cancelled.',
      });
    }
    registration.status = 'CANCELLED';
    registration.rosterEndedAt = now;
    registration.updatedAt = now;
    registration.updatedByUserId = params.authUserId;
    registration.version = (asNumber(registration.version) ?? 1) + 1;
    if (
      previousStatus === 'REGISTERED'
    ) {
      session.currentParticipants = Math.max(0, (asNumber(session.currentParticipants) ?? 0) - 1);
      if (booking) {
        cancelSeedBooking(
          store.tables,
          booking,
          params.authUserId,
          'Group session registration cancelled.',
        );
      }
      const promoted = asRows(store.tables.groupSessionRegistrations).reduce<SeedRow | undefined>(
        (earliest, row) => {
          if (
            asString(row.groupSessionId) !== sessionId ||
            asString(row.deletedAt) != null ||
            asString(row.status)?.toUpperCase() !== 'WAITLISTED'
          ) {
            return earliest;
          }
          if (!earliest) {
            return row;
          }
          return Date.parse(asString(row.registeredAt) ?? '') <
            Date.parse(asString(earliest.registeredAt) ?? '')
            ? row
            : earliest;
        },
        undefined,
      );
      if (promoted) {
        promoted.status = 'REGISTERED';
        promoted.paidAt = null;
        promoted.rosterActiveAt = now;
        promoted.rosterEndedAt = null;
        promoted.updatedAt = now;
        promoted.updatedByUserId = params.authUserId;
        promoted.version = (asNumber(promoted.version) ?? 1) + 1;
        session.currentParticipants = (asNumber(session.currentParticipants) ?? 0) + 1;
        session.waitlistCount = Math.max(0, (asNumber(session.waitlistCount) ?? 0) - 1);
        if (!findLinkedSeedBooking(store.tables, sessionId, asString(promoted.athleteId) ?? '')) {
          const promotedBooking = createSeedLinkedBooking({
            tables: store.tables,
            authUserId: params.authUserId,
            requestId: 'waitlist_promotion',
            session,
            athleteId: asString(promoted.athleteId) ?? '',
            bookedByUserId: asString(promoted.parentUserId) ?? params.authUserId,
            note: asString(promoted.notes) ?? 'Promoted from waitlist.',
          });
          await generateLinkedRegistrationInvoiceIfBillable({
            bookingId: promotedBooking.id,
            actorUserId: params.authUserId,
            priceMinor: asNumber(session.pricePerParticipantMinor),
          });
        }
      }
    } else if (previousStatus === 'WAITLISTED') {
      session.waitlistCount = Math.max(0, (asNumber(session.waitlistCount) ?? 0) - 1);
    }
    const maxParticipants = asNumber(session.maxParticipants) ?? 0;
    session.status = deriveSessionStatusForHeadcount(
      asString(session.status),
      maxParticipants,
      asNumber(session.currentParticipants) ?? 0,
      asNumber(session.offPlatformParticipants) ?? 0,
    );
    session.updatedAt = now;
    session.updatedByUserId = params.authUserId;
    session.version = (asNumber(session.version) ?? 1) + 1;
    return {
      registration: mapRegistrationRow(registration, asRows(store.tables.attendanceRecords)),
      dataVersion: store.version,
    };
  }
  async markAttendance(
    params: GroupSessionAttendanceParams,
  ): Promise<GroupSessionRegistrationResult> {
    const store = this.storeProvider();
    const registration = asRows(store.tables.groupSessionRegistrations).find(
      (row) => asString(row.id) === params.registrationId && asString(row.deletedAt) == null,
    );
    if (!registration) {
      throw notFound('Group session registration not found', {
        registrationId: params.registrationId,
      });
    }
    const sessionId = asString(registration.groupSessionId) ?? '';
    const session = asRows(store.tables.groupSessions).find(
      (row) => asString(row.id) === sessionId,
    );
    if (!session) {
      throw notFound('Group session not found', {
        sessionId,
      });
    }
    if (!params.isPrivilegedAdmin && asString(session.coachUserId) !== params.authUserId) {
      throw forbidden('Group session does not belong to authenticated user', {
        registrationId: params.registrationId,
      });
    }
    if (normalizeSessionStatus(asString(session.status)) === 'COMPLETED') {
      throw conflict('Completed group session attendance is immutable', {
        registrationId: params.registrationId,
        sessionId,
      });
    }
    const occurrence = assertGroupSessionOccurrenceCanBeCompleted(session, params.date, new Date());
    if (
      asRows(store.tables.groupSessionOccurrenceCompletions).some(
        (row) =>
          asString(row.groupSessionId) === sessionId &&
          occurrenceCompletionDate(row) === params.date,
      )
    ) {
      throw conflict('Completed group session occurrence attendance is immutable', {
        registrationId: params.registrationId,
        sessionId,
        occurrenceDate: params.date,
      });
    }
    if (!isRegistrationActiveForOccurrence(registration, occurrence)) {
      throw badRequest('Registration was not active for this group session occurrence', {
        registrationId: params.registrationId,
        sessionId,
        occurrenceDate: params.date,
      });
    }
    const isRecurring = buildScheduleEntries(session.scheduleJson).length > 1;
    const attendanceRecords = asRows(store.tables.attendanceRecords);
    const athleteId = asString(registration.athleteId) ?? '';
    const targetDate = params.date;
    const matching = attendanceRecords.filter(
      (row) =>
        asString(row.groupSessionId) === sessionId &&
        asString(row.athleteId) === athleteId &&
        parseIsoDatePart(asString(row.recordedAt) ?? asString(row.createdAt)) === targetDate,
    );
    const now = `${targetDate}T12:00:00.000Z`;
    if (params.status) {
      const [existing, ...duplicates] = matching;
      if (existing) {
        existing.status = params.status;
        existing.recordedByUserId = params.authUserId;
        existing.updatedAt = isoNow();
      } else {
        attendanceRecords.push({
          id: newId('att'),
          bookingId: null,
          groupSessionId: sessionId,
          athleteId,
          status: params.status,
          notes: null,
          effortRating: null,
          focusAreasJson: [],
          recordedByUserId: params.authUserId,
          recordedAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }
      for (const duplicate of duplicates) {
        duplicate.status = 'SUPERSEDED';
        duplicate.updatedAt = isoNow();
      }
      registration.status = isRecurring ? recurringRegistrationStatus(registration) : params.status;
    } else {
      for (const row of matching) {
        row.status = 'CLEARED';
        row.updatedAt = isoNow();
      }
      const remaining = attendanceRecords.filter(
        (row) =>
          asString(row.groupSessionId) === sessionId &&
          asString(row.athleteId) === athleteId &&
          attendanceProofStatus(row) !== null,
      );
      registration.status = isRecurring
        ? recurringRegistrationStatus(registration)
        : remaining.some((row) => attendanceProofStatus(row) === 'ATTENDED')
          ? 'ATTENDED'
          : remaining.some((row) => attendanceProofStatus(row) === 'NO_SHOW')
            ? 'NO_SHOW'
            : 'REGISTERED';
    }
    registration.updatedAt = isoNow();
    registration.updatedByUserId = params.authUserId;
    registration.version = (asNumber(registration.version) ?? 1) + 1;
    if (!Array.isArray(store.tables.auditEvents)) {
      store.tables.auditEvents = [];
    }
    asRows(store.tables.auditEvents).push({
      ...params.successAuditEvent,
      metadataJson: {
        ...(params.successAuditEvent.metadataJson as SeedRow),
        sessionId,
        athleteId,
        registrationStatus: asString(registration.status),
      },
      occurredAt: params.successAuditEvent.occurredAt.toISOString(),
    });
    return {
      registration: mapRegistrationRow(registration, attendanceRecords),
      dataVersion: store.version,
    };
  }
  async completeSession(
    params: GroupSessionCompletionParams,
  ): Promise<GroupSessionCompletionResult> {
    const store = this.storeProvider();
    const session = asRows(store.tables.groupSessions).find(
      (row) => asString(row.id) === params.sessionId && !asString(row.deletedAt),
    );
    if (!session) {
      throw notFound('Group session not found', {
        sessionId: params.sessionId,
      });
    }
    if (!params.isPrivilegedAdmin && asString(session.coachUserId) !== params.authUserId) {
      throw forbidden('Group session does not belong to authenticated user');
    }
    const now = new Date();
    const occurrence = assertGroupSessionOccurrenceCanBeCompleted(
      session,
      params.body.occurrenceDate,
      now,
    );
    const registrations = asRows(store.tables.groupSessionRegistrations).filter(
      (row) => asString(row.groupSessionId) === params.sessionId,
    );
    assertExactCompletionRoster(
      params.sessionId,
      registrations,
      occurrence,
      params.body.attendance,
    );
    const attendanceRecords = asRows(store.tables.attendanceRecords);
    if (!Array.isArray(store.tables.groupSessionOccurrenceCompletions)) {
      store.tables.groupSessionOccurrenceCompletions = [];
    }
    const occurrenceCompletions = asRows(store.tables.groupSessionOccurrenceCompletions);
    const existingCompletion = occurrenceCompletions.find(
      (row) =>
        asString(row.groupSessionId) === params.sessionId &&
        occurrenceCompletionDate(row) === params.body.occurrenceDate,
    );
    if (existingCompletion) {
      if (
        !completionMatchesExistingProof({
          sessionId: params.sessionId,
          occurrenceDate: params.body.occurrenceDate,
          registrations,
          attendanceRecords,
          attendance: params.body.attendance,
        })
      ) {
        throw conflict('Group session was already completed with different attendance', {
          sessionId: params.sessionId,
          occurrenceDate: params.body.occurrenceDate,
        });
      }
      return {
        session: mapSessionRow(session),
        registrations: registrations
          .filter((row) => asString(row.deletedAt) == null)
          .map((row) => mapRegistrationRow(row, attendanceRecords)),
        occurrenceDate: params.body.occurrenceDate,
        dataVersion: store.version,
      };
    }
    if (normalizeSessionStatus(asString(session.status)) === 'COMPLETED') {
      throw conflict('Group session completion ledger is inconsistent', {
        sessionId: params.sessionId,
        occurrenceDate: params.body.occurrenceDate,
      });
    }
    const shouldCompleteSeries = willCompleteSeriesAfterOccurrence({
      session,
      occurrenceCompletions,
      occurrenceDate: params.body.occurrenceDate,
      now,
    });
    const registrationById = new Map(
      registrations.flatMap((row) => {
        const id = asString(row.id);
        return id ? [[id, row] as const] : [];
      }),
    );
    const activeLinkedBookings = asRows(store.tables.bookings).filter(
      (row) =>
        asString(row.groupSessionId) === params.sessionId &&
        asString(row.deletedAt) == null &&
        asString(row.status)?.toUpperCase() !== 'CANCELLED',
    );
    for (const linkedBooking of activeLinkedBookings) {
      const linkedStatus = asString(linkedBooking.status)?.toUpperCase();
      if (linkedStatus === 'COMPLETED') {
        throw conflict('Linked group booking was completed outside group session authority', {
          bookingId: asString(linkedBooking.id),
          sessionId: params.sessionId,
        });
      }
      if (linkedStatus !== 'CONFIRMED' && linkedStatus !== 'AWAITING_COMPLETION') {
        throw conflict('Linked group booking is not eligible for completion', {
          bookingId: asString(linkedBooking.id),
          status: linkedStatus,
        });
      }
    }
    const linkedBookingByRegistrationId = new Map<string, SeedRow>();
    for (const input of params.body.attendance) {
      const registration = registrationById.get(input.registrationId);
      const athleteId = asString(registration?.athleteId);
      const linkedBooking = athleteId
        ? findLinkedSeedBooking(store.tables, params.sessionId, athleteId)
        : undefined;
      if (!linkedBooking) continue;
      linkedBookingByRegistrationId.set(input.registrationId, linkedBooking);
    }
    if (shouldCompleteSeries) {
      const submittedBookingIds = new Set(
        Array.from(linkedBookingByRegistrationId.values()).flatMap((booking) => {
          const bookingId = asString(booking.id);
          return bookingId ? [bookingId] : [];
        }),
      );
      const orphanedBooking = activeLinkedBookings.find(
        (booking) => !submittedBookingIds.has(asString(booking.id) ?? ''),
      );
      if (orphanedBooking) {
        throw conflict('Every active linked booking must belong to the final occurrence roster', {
          sessionId: params.sessionId,
          bookingId: asString(orphanedBooking.id),
        });
      }
    }
    const recordedAt = `${params.body.occurrenceDate}T12:00:00.000Z`;
    for (const input of params.body.attendance) {
      const registration = registrationById.get(input.registrationId);
      if (!registration) {
        throw badRequest('Group session completion registration not found', {
          sessionId: params.sessionId,
          registrationId: input.registrationId,
        });
      }
      const athleteId = asString(registration.athleteId) ?? '';
      const matching = attendanceRecords.filter(
        (row) =>
          asString(row.groupSessionId) === params.sessionId &&
          asString(row.athleteId) === athleteId &&
          parseIsoDatePart(asString(row.recordedAt) ?? asString(row.createdAt)) ===
            params.body.occurrenceDate,
      );
      const [existing, ...duplicates] = matching;
      let attendanceRecord: SeedRow;
      if (existing) {
        existing.status = input.status;
        existing.notes = input.notes ?? null;
        existing.effortRating = input.effortRating ?? null;
        existing.recordedByUserId = params.authUserId;
        existing.recordedAt = recordedAt;
        existing.updatedAt = now.toISOString();
        attendanceRecord = existing;
      } else {
        attendanceRecord = {
          id: newId('att'),
          bookingId: null,
          groupSessionId: params.sessionId,
          athleteId,
          status: input.status,
          notes: input.notes ?? null,
          effortRating: input.effortRating ?? null,
          focusAreasJson: [],
          recordedByUserId: params.authUserId,
          recordedAt,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };
        attendanceRecords.push(attendanceRecord);
      }
      for (const duplicate of duplicates) {
        duplicate.status = 'SUPERSEDED';
        duplicate.updatedAt = now.toISOString();
      }
      const linkedBooking = linkedBookingByRegistrationId.get(input.registrationId);
      if (linkedBooking && shouldCompleteSeries) {
        attendanceRecord.bookingId = asString(linkedBooking.id) ?? null;
        completeSeedLinkedBooking({
          tables: store.tables,
          booking: linkedBooking,
          authUserId: params.authUserId,
          requestId: params.requestId,
          attendanceRecordId: asString(attendanceRecord.id) ?? '',
          status: input.status,
          completedAt: now.toISOString(),
        });
      }
    }
    occurrenceCompletions.push({
      id: newId('goc'),
      groupSessionId: params.sessionId,
      occurrenceDate: `${params.body.occurrenceDate}T00:00:00.000Z`,
      completedByUserId: params.authUserId,
      rosterSize: params.body.attendance.length,
      attendedCount: params.body.attendance.filter((entry) => entry.status === 'ATTENDED').length,
      noShowCount: params.body.attendance.filter((entry) => entry.status === 'NO_SHOW').length,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    applyDerivedGroupCompletionState({
      session,
      registrations,
      attendanceRecords,
      occurrenceCompletions,
      actorUserId: params.authUserId,
      now,
    });
    asRows(store.tables.auditEvents).push({
      ...params.successAuditEvent,
      occurredAt: params.successAuditEvent.occurredAt.toISOString(),
    });
    return {
      session: mapSessionRow(session),
      registrations: registrations
        .filter((row) => asString(row.deletedAt) == null)
        .map((row) => mapRegistrationRow(row, attendanceRecords)),
      occurrenceDate: params.body.occurrenceDate,
      dataVersion: store.version,
    };
  }
  async listRegistrationsForAthleteIds(
    params: GroupRegistrationListParams,
  ): Promise<GroupRegistrationListResult> {
    const store = this.storeProvider();
    for (const athleteId of params.athleteIds) {
      assertAthleteReadAccess(store.tables, params.authUserId, athleteId, params.isPrivilegedAdmin);
    }
    const attendanceRecords = asRows(store.tables.attendanceRecords);
    const registrations = asRows(store.tables.groupSessionRegistrations).flatMap((row) =>
      params.athleteIds.includes(asString(row.athleteId) ?? '') &&
      asString(row.deletedAt) == null &&
      asString(row.status)?.toUpperCase() !== 'CANCELLED'
        ? [mapRegistrationRow(row, attendanceRecords)]
        : [],
    );
    return {
      registrations,
      dataVersion: store.version,
    };
  }
  async createSessionRsvps(
    params: GroupSessionRsvpCreateParams,
  ): Promise<SessionRsvpListResult> {
    const store = this.storeProvider();
    const session = asRows(store.tables.groupSessions).find(
      (row) => asString(row.id) === params.sessionId && !asString(row.deletedAt),
    );
    if (!session) {
      throw notFound('Group session not found', {
        sessionId: params.sessionId,
      });
    }
    if (!Array.isArray(store.tables.sessionRsvps)) {
      store.tables.sessionRsvps = [];
    }
    const rsvps = asRows(store.tables.sessionRsvps);
    const now = isoNow();
    const result: AppSessionRsvp[] = [];
    for (const member of params.members) {
      assertSeedSessionRsvpMemberWriteAccess({
        tables: store.tables,
        session,
        authUserId: params.authUserId,
        isPrivilegedAdmin: params.isPrivilegedAdmin,
        member,
      });
      const existing = rsvps.find(
        (row) =>
          asString(row.groupSessionId) === params.sessionId &&
          asString(row.userId) === member.userId &&
          (asString(row.athleteId) ?? null) === (member.childId ?? null) &&
          !asString(row.deletedAt),
      );
      if (existing) {
        result.push(mapSessionRsvpRow(existing));
        continue;
      }
      const row: SeedRow = {
        id: newId('srp'),
        groupSessionId: params.sessionId,
        userId: member.userId,
        athleteId: member.childId ?? null,
        status: 'PENDING',
        respondedAt: null,
        createdByUserId: params.authUserId,
        updatedByUserId: params.authUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      };
      rsvps.push(row);
      result.push(mapSessionRsvpRow(row));
    }
    return {
      rsvps: result,
      dataVersion: store.version,
    };
  }
  async listSessionRsvps(params: GroupSessionRsvpAccessParams): Promise<SessionRsvpListResult> {
    const store = this.storeProvider();
    const session = asRows(store.tables.groupSessions).find(
      (row) => asString(row.id) === params.sessionId && !asString(row.deletedAt),
    );
    if (!session) {
      throw notFound('Group session not found', {
        sessionId: params.sessionId,
      });
    }
    assertSeedSessionRsvpReadAccess(
      store.tables,
      session,
      params.authUserId,
      params.isPrivilegedAdmin,
    );
    const canReadAll = canManageSeedSessionRsvps(
      store.tables,
      session,
      params.authUserId,
      params.isPrivilegedAdmin,
    );
    return {
      rsvps: asRows(store.tables.sessionRsvps).flatMap((row) => {
        if (asString(row.groupSessionId) !== params.sessionId || asString(row.deletedAt)) {
          return [];
        }
        if (!canReadAll && asString(row.userId) !== params.authUserId) {
          return [];
        }
        return [mapSessionRsvpRow(row)];
      }),
      dataVersion: store.version,
    };
  }
  async listSessionRsvpsForUser(
    params: SessionRsvpUserListParams,
  ): Promise<SessionRsvpListResult> {
    if (!params.isPrivilegedAdmin && params.userId !== params.authUserId) {
      throw forbidden('RSVP userId must match authenticated user', {
        userId: params.userId,
      });
    }
    const store = this.storeProvider();
    return {
      rsvps: asRows(store.tables.sessionRsvps).flatMap((row) => {
        if (asString(row.userId) !== params.userId || asString(row.deletedAt)) {
          return [];
        }
        if (params.status && normalizeSessionRsvpStatus(row.status) !== params.status) {
          return [];
        }
        return [mapSessionRsvpRow(row)];
      }),
      dataVersion: store.version,
    };
  }
  async getSessionRsvpById(params: SessionRsvpAccessParams): Promise<SessionRsvpActionResult> {
    const store = this.storeProvider();
    const row = asRows(store.tables.sessionRsvps).find(
      (candidate) => asString(candidate.id) === params.rsvpId && !asString(candidate.deletedAt),
    );
    if (!row) {
      throw notFound('Session RSVP not found', {
        rsvpId: params.rsvpId,
      });
    }
    const session = asRows(store.tables.groupSessions).find(
      (candidate) => asString(candidate.id) === asString(row.groupSessionId),
    );
    if (!session) {
      throw notFound('Group session not found', {
        sessionId: asString(row.groupSessionId),
      });
    }
    const canReadAll = canManageSeedSessionRsvps(
      store.tables,
      session,
      params.authUserId,
      params.isPrivilegedAdmin,
    );
    if (!canReadAll && asString(row.userId) !== params.authUserId) {
      throw forbidden('Session RSVP does not belong to authenticated user', {
        rsvpId: params.rsvpId,
      });
    }
    return {
      rsvp: mapSessionRsvpRow(row),
      dataVersion: store.version,
    };
  }
  async respondSessionRsvp(params: SessionRsvpRespondParams): Promise<SessionRsvpActionResult> {
    const store = this.storeProvider();
    const row = asRows(store.tables.sessionRsvps).find(
      (candidate) => asString(candidate.id) === params.rsvpId && !asString(candidate.deletedAt),
    );
    if (!row) {
      throw notFound('Session RSVP not found', {
        rsvpId: params.rsvpId,
      });
    }
    if (!params.isPrivilegedAdmin && asString(row.userId) !== params.authUserId) {
      throw forbidden('Session RSVP does not belong to authenticated user', {
        rsvpId: params.rsvpId,
      });
    }
    const now = isoNow();
    row.status = toStoredSessionRsvpStatus(params.status);
    row.respondedAt = now;
    row.updatedAt = now;
    row.updatedByUserId = params.authUserId;
    row.version = (asNumber(row.version) ?? 1) + 1;
    return {
      rsvp: mapSessionRsvpRow(row),
      dataVersion: store.version,
    };
  }
  async getSessionRsvpCounts(
    params: GroupSessionRsvpAccessParams,
  ): Promise<SessionRsvpCountsResult> {
    const list = await this.listSessionRsvps(params);
    const counts = emptySessionRsvpCounts();
    for (const rsvp of list.rsvps) {
      incrementSessionRsvpCounts(counts, rsvp.status);
    }
    return {
      counts,
      dataVersion: list.dataVersion,
    };
  }
  async getBatchSessionRsvpCounts(
    params: SessionRsvpBatchCountsParams,
  ): Promise<SessionRsvpBatchCountsResult> {
    const countsBySessionId = Object.fromEntries(
      params.sessionIds.map((sessionId) => [sessionId, emptySessionRsvpCounts()]),
    );
    for (const sessionId of params.sessionIds) {
      const list = await this.listSessionRsvps({
        authUserId: params.authUserId,
        isPrivilegedAdmin: params.isPrivilegedAdmin,
        sessionId,
      });
      for (const rsvp of list.rsvps) {
        incrementSessionRsvpCounts(countsBySessionId[sessionId]!, rsvp.status);
      }
    }
    return {
      countsBySessionId,
      dataVersion: this.storeProvider().version,
    };
  }
  async remindSessionRsvps(
    params: GroupSessionRsvpAccessParams,
  ): Promise<SessionRsvpReminderResult> {
    const store = this.storeProvider();
    const session = asRows(store.tables.groupSessions).find(
      (row) => asString(row.id) === params.sessionId && !asString(row.deletedAt),
    );
    if (!session) {
      throw notFound('Group session not found', {
        sessionId: params.sessionId,
      });
    }
    assertSeedSessionRsvpManageAccess(
      store.tables,
      session,
      params.authUserId,
      params.isPrivilegedAdmin,
    );
    if (!Array.isArray(store.tables.notifications)) {
      store.tables.notifications = [];
    }
    const now = isoNow();
    const pending = asRows(store.tables.sessionRsvps).filter(
      (row) =>
        asString(row.groupSessionId) === params.sessionId &&
        normalizeSessionRsvpStatus(row.status) === 'pending' &&
        !asString(row.deletedAt),
    );
    asRows(store.tables.notifications).push(
      ...pending.map((row) =>
        sessionRsvpNotification({
          sessionId: params.sessionId,
          title: asString(session.title) ?? 'this session',
          userId: asString(row.userId) ?? '',
          now,
        }),
      ),
    );
    return {
      reminded: pending.length,
      dataVersion: store.version,
    };
  }
  async deleteSessionRsvpsForSession(
    params: GroupSessionRsvpAccessParams,
  ): Promise<SessionRsvpReminderResult> {
    const store = this.storeProvider();
    const session = asRows(store.tables.groupSessions).find(
      (row) => asString(row.id) === params.sessionId && !asString(row.deletedAt),
    );
    if (!session) {
      throw notFound('Group session not found', {
        sessionId: params.sessionId,
      });
    }
    assertSeedSessionRsvpManageAccess(
      store.tables,
      session,
      params.authUserId,
      params.isPrivilegedAdmin,
    );
    const now = isoNow();
    let deleted = 0;
    for (const row of asRows(store.tables.sessionRsvps)) {
      if (asString(row.groupSessionId) === params.sessionId && !asString(row.deletedAt)) {
        row.deletedAt = now;
        row.deletedByUserId = params.authUserId;
        row.updatedAt = now;
        row.updatedByUserId = params.authUserId;
        deleted += 1;
      }
    }
    return {
      reminded: deleted,
      dataVersion: store.version,
    };
  }
  async findSessionById(sessionId: string): Promise<AppGroupSession | null> {
    const store = this.storeProvider();
    const session = asRows(store.tables.groupSessions).find(
      (row) => asString(row.id) === sessionId && !asString(row.deletedAt),
    );
    return session ? mapSessionRow(session) : null;
  }
}
class PrismaGroupSessionRepository implements GroupSessionRepository {
  private readonly fallback = new StoreGroupSessionRepository(() => getDbFixtureStore());
  private async querySessions(params: {
    sessionId?: string;
    statusFilter?: string;
    coachUserId?: string;
    clubId?: string;
    squadId?: string;
    includeOccurrenceCompletions?: boolean;
    includeRegistrationGuardianNames?: boolean;
  }): Promise<PrismaSessionRow[]> {
    if (shouldUseDbFixtureFallback()) {
      return [];
    }
    const prisma = getPrismaClientOrThrow();
    const sessions = normalizeAs<PrismaSessionRow[]>(
      await prisma.groupSession.findMany({
        where: {
          deletedAt: null,
          ...(params.sessionId
            ? {
                id: params.sessionId,
              }
            : {}),
          ...(params.statusFilter
            ? {
                status: params.statusFilter.toUpperCase() as never,
              }
            : {}),
          ...(params.coachUserId
            ? {
                coachUserId: params.coachUserId,
              }
            : {}),
          ...(params.clubId
            ? {
                clubId: params.clubId,
              }
            : {}),
          ...(params.squadId
            ? {
                squadId: params.squadId,
              }
            : {}),
        },
        include: {
          registrations: {
            where: {
              deletedAt: null,
            },
            include: {
              athlete: true,
            },
          },
          attendanceRecords: true,
          ...(params.includeOccurrenceCompletions ? { occurrenceCompletions: true } : {}),
        },
      }),
    );
    const userIds = Array.from(
      new Set(
        sessions.flatMap((session) => [
          session.coachUserId,
          session.createdByUserId,
          ...(params.includeRegistrationGuardianNames
            ? session.registrations.flatMap((registration) =>
                registration.parentUserId ? [registration.parentUserId] : [],
              )
            : []),
        ]),
      ),
    );
    const clubIds = Array.from(new Set(sessions.flatMap((session) => session.clubId ?? [])));
    const [users, clubs] = await Promise.all([
      userIds.length > 0
        ? prisma.user.findMany({
            where: {
              id: {
                in: userIds,
              },
              deletedAt: null,
            },
            select: {
              id: true,
              name: true,
            },
          })
        : [],
      clubIds.length > 0
        ? prisma.club.findMany({
            where: {
              id: {
                in: clubIds,
              },
              deletedAt: null,
            },
            select: {
              id: true,
              name: true,
            },
          })
        : [],
    ]);
    const userNameById = new Map(users.map((user) => [user.id, user.name] as const));
    const clubNameById = new Map(clubs.map((club) => [club.id, club.name] as const));
    return sessions.map((session) => ({
      ...session,
      ...(params.includeRegistrationGuardianNames
        ? {
            registrations: session.registrations.map((registration) => ({
              ...registration,
              ...(registration.parentUserId && userNameById.get(registration.parentUserId)
                ? { parentName: userNameById.get(registration.parentUserId) }
                : {}),
            })),
          }
        : {}),
      ...(session.coachUserId && userNameById.get(session.coachUserId)
        ? {
            coachName: userNameById.get(session.coachUserId),
          }
        : {}),
      ...(session.createdByUserId && userNameById.get(session.createdByUserId)
        ? {
            createdByName: userNameById.get(session.createdByUserId),
          }
        : {}),
      ...(session.clubId && clubNameById.get(session.clubId)
        ? {
            clubName: clubNameById.get(session.clubId),
          }
        : {}),
    }));
  }
  private mapPrismaSession(session: PrismaSessionRow): AppGroupSession {
    return mapSessionRow(session as unknown as SeedRow);
  }
  private mapPrismaRegistration(
    registration: PrismaRegistrationRow,
    attendanceRecords: PrismaAttendanceRow[],
  ): AppGroupRegistration {
    return mapRegistrationRow(
      registration as unknown as SeedRow,
      attendanceRecords as unknown as SeedRow[],
    );
  }
  private async assertAthleteAccess(
    authUserId: string,
    athleteId: string,
    isPrivilegedAdmin: boolean,
  ): Promise<void> {
    if (isPrivilegedAdmin) {
      return;
    }
    const prisma = getPrismaClientOrThrow();
    const athlete = normalizeAs<PrismaAthleteRow | null>(
      await prisma.athlete.findUnique({
        where: {
          id: athleteId,
        },
        select: {
          id: true,
          userId: true,
        },
      }),
    );
    if (!athlete) {
      throw notFound('Athlete not found', {
        athleteId,
      });
    }
    if (athlete.userId === authUserId) {
      return;
    }
    const guardianLink = await prisma.guardianChildLink.findFirst({
      where: {
        athleteId,
        guardianUserId: authUserId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
    if (!guardianLink) {
      throw forbidden('Authenticated user cannot access this athlete', {
        athleteId,
      });
    }
  }
  private async resolveVisibleSessionIds(
    sessions: PrismaSessionRow[],
    authUserId: string,
    isPrivilegedAdmin: boolean,
    discover: boolean,
  ): Promise<Set<string>> {
    if (isPrivilegedAdmin) {
      return new Set(sessions.map((session) => session.id));
    }
    const prisma = getPrismaClientOrThrow();
    const sessionIds = sessions.map((session) => session.id);
    const clubIds = Array.from(
      new Set(
        sessions.flatMap((session) => {
          const mapped = session.clubId;
          return typeof mapped === 'string' ? [mapped] : [];
        }),
      ),
    );
    const clubMemberships = normalizeAs<
      Array<{
        clubId: string;
      }>
    >(
      clubIds.length > 0
        ? await prisma.clubMembership.findMany({
            where: {
              userId: authUserId,
              active: true,
              deletedAt: null,
              clubId: {
                in: clubIds,
              },
            },
            select: {
              clubId: true,
            },
          })
        : [],
    );
    const readableClubIds = new Set(clubMemberships.map((membership) => membership.clubId));
    const inviteTargets = normalizeAs<
      Array<{
        invite: {
          groupSessionId: string | null;
        };
      }>
    >(
      sessionIds.length > 0
        ? await prisma.inviteTarget.findMany({
            where: {
              targetUserId: authUserId,
              invite: {
                groupSessionId: {
                  in: sessionIds,
                },
                revokedAt: null,
              },
            },
            select: {
              invite: {
                select: {
                  groupSessionId: true,
                },
              },
            },
          })
        : [],
    );
    const invitedSessionIds = new Set(
      inviteTargets.flatMap((row) => {
        const mapped = row.invite.groupSessionId;
        return Boolean(mapped) ? [mapped] : [];
      }),
    );
    const visibleSessionIds = new Set<string>();
    for (const session of sessions) {
      if (session.coachUserId === authUserId) {
        visibleSessionIds.add(session.id);
        continue;
      }
      if (session.clubId && readableClubIds.has(session.clubId)) {
        visibleSessionIds.add(session.id);
        continue;
      }
      if (
        session.registrations.some(
          (registration) =>
            registration.parentUserId === authUserId || registration.athlete?.userId === authUserId,
        )
      ) {
        visibleSessionIds.add(session.id);
        continue;
      }
      if (invitedSessionIds.has(session.id)) {
        visibleSessionIds.add(session.id);
        continue;
      }
      if (discover) {
        const status = normalizeSessionStatus(session.status);
        const inviteType = normalizeStoredInviteType(session.inviteType ?? undefined);
        if (
          (status === 'PUBLISHED' || status === 'FULL') &&
          inviteType !== 'SQUAD_ONLY' &&
          inviteType !== 'CLOSED'
        ) {
          visibleSessionIds.add(session.id);
        }
      }
    }
    return visibleSessionIds;
  }
  private async assertSessionWriteAccess(
    authUserId: string,
    isPrivilegedAdmin: boolean,
    sessionId: string,
  ): Promise<PrismaSessionRow> {
    const sessions = await this.querySessions({
      sessionId,
    });
    const session = sessions[0];
    if (!session) {
      throw notFound('Group session not found', {
        sessionId,
      });
    }
    if (!isPrivilegedAdmin && session.coachUserId !== authUserId) {
      throw forbidden('Group session does not belong to authenticated user', {
        sessionId,
      });
    }
    return session;
  }
  private async assertClubSessionCreateAccess(
    authUserId: string,
    targetCoachUserId: string,
    isPrivilegedAdmin: boolean,
    clubId: string | undefined,
    squadId: string | undefined,
  ): Promise<void> {
    if (squadId && !clubId) {
      throw badRequest('clubId is required when squadId is supplied', { squadId });
    }
    if (!clubId) {
      return;
    }
    const prisma = getPrismaClientOrThrow();
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, deletedAt: true },
    });
    if (!club || club.deletedAt) {
      throw notFound('Club not found', { clubId });
    }
    if (squadId) {
      const squad = await prisma.squad.findUnique({
        where: { id: squadId },
        select: { id: true, clubId: true, deletedAt: true },
      });
      if (!squad || squad.deletedAt || squad.clubId !== clubId) {
        throw notFound('Squad not found', { clubId, squadId });
      }
    }
    const targetMembership = await prisma.clubMembership.findUnique({
      where: {
        clubId_userId: {
          clubId,
          userId: targetCoachUserId,
        },
      },
      select: {
        role: true,
        active: true,
        deletedAt: true,
      },
    });
    if (
      !targetMembership ||
      !targetMembership.active ||
      targetMembership.deletedAt ||
      !isClubStaffRole(parseOrganizationRole(targetMembership.role) ?? 'MEMBER')
    ) {
      throw forbidden('Assigned coach must be active club staff', {
        clubId,
        targetCoachUserId,
      });
    }
    if (isPrivilegedAdmin) {
      return;
    }
    const membership = await prisma.clubMembership.findUnique({
      where: {
        clubId_userId: {
          clubId,
          userId: authUserId,
        },
      },
      select: {
        role: true,
        active: true,
        deletedAt: true,
      },
    });
    const isSelfCreate = targetCoachUserId === authUserId;
    const hasActiveMembership = Boolean(membership?.active && !membership.deletedAt);
    const canCreate = hasActiveMembership && canCreateClubSession(membership?.role);
    const canAssign = hasActiveMembership && canAssignClubSession(membership?.role);
    if (!canCreate || (!isSelfCreate && !canAssign)) {
      throw forbidden('You do not have permission to create group sessions for this club', {
        clubId,
      });
    }
  }
  private async canManageSessionRsvps(
    session: PrismaSessionRow,
    authUserId: string,
    isPrivilegedAdmin: boolean,
  ): Promise<boolean> {
    if (isPrivilegedAdmin || session.coachUserId === authUserId) {
      return true;
    }
    if (!session.clubId) {
      return false;
    }
    const prisma = getPrismaClientOrThrow();
    const membership = await prisma.clubMembership.findUnique({
      where: {
        clubId_userId: {
          clubId: session.clubId,
          userId: authUserId,
        },
      },
      select: {
        role: true,
        active: true,
        deletedAt: true,
      },
    });
    if (!membership?.active || membership.deletedAt) {
      return false;
    }
    const role = parseOrganizationRole(membership.role);
    return Boolean(
      role &&
        (isClubStaffRole(role) ||
          canUseClubCapability(role, 'view_program_attendance', {
            hasGrant: role === 'COACH',
          })),
    );
  }
  private async assertSessionRsvpReadAccess(
    session: PrismaSessionRow,
    authUserId: string,
    isPrivilegedAdmin: boolean,
  ): Promise<void> {
    const visibleSessionIds = await this.resolveVisibleSessionIds(
      [session],
      authUserId,
      isPrivilegedAdmin,
      true,
    );
    if (!visibleSessionIds.has(session.id)) {
      throw forbidden('Group session RSVP does not belong to authenticated user', {
        sessionId: session.id,
      });
    }
  }
  private async assertSessionRsvpManageAccess(
    session: PrismaSessionRow,
    authUserId: string,
    isPrivilegedAdmin: boolean,
  ): Promise<void> {
    if (await this.canManageSessionRsvps(session, authUserId, isPrivilegedAdmin)) {
      return;
    }
    throw forbidden('Only session staff can manage RSVP state', {
      sessionId: session.id,
    });
  }
  private async assertSessionRsvpMemberWriteAccess(params: {
    session: PrismaSessionRow;
    authUserId: string;
    isPrivilegedAdmin: boolean;
    member: SessionRsvpMemberInput;
  }): Promise<void> {
    if (
      await this.canManageSessionRsvps(
        params.session,
        params.authUserId,
        params.isPrivilegedAdmin,
      )
    ) {
      return;
    }
    if (params.member.userId !== params.authUserId) {
      throw forbidden('RSVP userId must match authenticated user', {
        userId: params.member.userId,
      });
    }
    if (params.member.childId) {
      await this.assertAthleteAccess(
        params.authUserId,
        params.member.childId,
        params.isPrivilegedAdmin,
      );
    }
  }
  async listVisibleSessions(params: GroupSessionListParams): Promise<GroupSessionListResult> {
    if (shouldUseDbFixtureFallback()) {
      getPrismaClientOrThrow();
    }
    if (params.athleteId) {
      await this.assertAthleteAccess(params.authUserId, params.athleteId, params.isPrivilegedAdmin);
    }
    const sessions = await this.querySessions({
      statusFilter: params.statusFilter,
      coachUserId: params.coachUserId,
      clubId: params.clubId,
      squadId: params.squadId,
    });
    const visibleSessionIds = await this.resolveVisibleSessionIds(
      sessions,
      params.authUserId,
      params.isPrivilegedAdmin,
      params.discover === true,
    );
    const filtered = sessions.flatMap((item) =>
      ((session) => visibleSessionIds.has(session.id))(item)
        ? ((item) =>
            ((session) =>
              !params.athleteId ||
              session.registrations.some((entry) => entry.athleteId === params.athleteId))(item)
              ? ((session) => {
                  if (
                    !(
                      !params.sessionType ||
                      normalizeStoredSessionType(session.sessionType, session.squadId) ===
                        params.sessionType
                    )
                  )
                    return [];
                  return !params.skillLevel ||
                    normalizeSkillLevel(session.skillLevel ?? undefined) ===
                      params.skillLevel.toUpperCase()
                    ? [this.mapPrismaSession(session)]
                    : [];
                })(item)
              : [])(item)
        : [],
    );
    return {
      sessions: sortSessionsByUpcomingDate(filtered),
      dataVersion: null,
    };
  }
  async getVisibleSessionById(params: GroupSessionAccessParams): Promise<GroupSessionDetailResult> {
    if (shouldUseDbFixtureFallback()) {
      getPrismaClientOrThrow();
    }
    const sessions = await this.querySessions({
      sessionId: params.sessionId,
    });
    const session = sessions[0];
    if (!session) {
      throw notFound('Group session not found', {
        sessionId: params.sessionId,
      });
    }
    const visibleSessionIds = await this.resolveVisibleSessionIds(
      [session],
      params.authUserId,
      params.isPrivilegedAdmin,
      true,
    );
    if (!visibleSessionIds.has(session.id)) {
      throw forbidden('Group session does not belong to authenticated user', {
        sessionId: params.sessionId,
      });
    }
    return {
      session: this.mapPrismaSession(session),
      dataVersion: null,
    };
  }
  async createSession(params: GroupSessionCreateParams): Promise<GroupSessionActionResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.createSession(params);
    }
    if (
      !params.body.clubId &&
      !params.isPrivilegedAdmin &&
      params.body.coachId !== params.authUserId
    ) {
      throw forbidden('coachId must match authenticated user');
    }
    await this.assertClubSessionCreateAccess(
      params.authUserId,
      params.body.coachId,
      params.isPrivilegedAdmin,
      params.body.clubId,
      params.body.squadId,
    );
    const prisma = getPrismaClientOrThrow();
    const created = normalizeForJson(
      await prisma.groupSession.create({
        data: {
          id: newId('gse'),
          coachUserId: params.body.coachId,
          clubId: params.body.clubId ?? null,
          squadId: params.body.squadId ?? null,
          recurringSeriesId: null,
          title: params.body.title,
          description: params.body.description ?? '',
          sessionType: toStoredSessionType(params.body.sessionType),
          maxParticipants: params.body.maxParticipants,
          currentParticipants: 0,
          offPlatformParticipants: 0,
          waitlistEnabled: params.body.waitlistEnabled ?? true,
          waitlistCount: 0,
          pricePerParticipantMinor:
            typeof params.body.pricePerParticipant === 'number'
              ? Math.round(Math.max(0, params.body.pricePerParticipant) * 100)
              : 0,
          currency: params.body.currency ?? 'GBP',
          ageMin: params.body.ageMin ?? null,
          ageMax: params.body.ageMax ?? null,
          skillLevel: params.body.skillLevel?.toLowerCase() ?? null,
          location: params.body.location ?? 'TBD',
          isVirtual: params.body.isVirtual ?? false,
          status: 'DRAFT',
          registrationDeadlineAt: params.body.registrationDeadline
            ? new Date(params.body.registrationDeadline)
            : null,
          inviteType: toStoredInviteType(params.body.inviteType),
          scheduleJson: buildStoredScheduleJson(params.body.schedule),
          cancelledInstancesJson: [],
          focusJson: params.body.focus ?? [],
          equipmentJson: params.body.equipment ?? [],
          createdByUserId: params.authUserId,
          updatedByUserId: params.authUserId,
        },
      }),
    ) as SeedRow;
    return {
      session: mapSessionRow(created),
      dataVersion: null,
    };
  }
  async publishSession(params: GroupSessionAccessParams): Promise<GroupSessionActionResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.publishSession(params);
    }
    const session = await this.assertSessionWriteAccess(
      params.authUserId,
      params.isPrivilegedAdmin,
      params.sessionId,
    );
    const prisma = getPrismaClientOrThrow();
    const maxParticipants = session.maxParticipants;
    const currentParticipants = session.currentParticipants;
    const offPlatformParticipants = session.offPlatformParticipants;
    const updated = normalizeForJson(
      await prisma.groupSession.update({
        where: {
          id: session.id,
        },
        data: {
          status: derivePublishedSessionStatus(
            maxParticipants,
            currentParticipants,
            offPlatformParticipants,
          ),
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
      }),
    ) as SeedRow;
    return {
      session: mapSessionRow(updated),
      dataVersion: null,
    };
  }
  async updateOffPlatformParticipants(
    params: GroupSessionOffPlatformParticipantsParams,
  ): Promise<GroupSessionActionResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.updateOffPlatformParticipants(params);
    }
    const session = await this.assertSessionWriteAccess(
      params.authUserId,
      params.isPrivilegedAdmin,
      params.sessionId,
    );
    const prisma = getPrismaClientOrThrow();
    const updated = normalizeForJson(
      await prisma.groupSession.update({
        where: {
          id: session.id,
        },
        data: {
          offPlatformParticipants: params.count,
          status: deriveSessionStatusForHeadcount(
            session.status,
            session.maxParticipants,
            session.currentParticipants,
            params.count,
          ),
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
      }),
    ) as SeedRow;
    return {
      session: mapSessionRow(updated),
      dataVersion: null,
    };
  }
  async cancelInstance(
    params: GroupSessionCancelInstanceParams,
  ): Promise<GroupSessionActionResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.cancelInstance(params);
    }
    const session = await this.assertSessionWriteAccess(
      params.authUserId,
      params.isPrivilegedAdmin,
      params.sessionId,
    );
    assertRecurringInstanceExists(params.sessionId, session.scheduleJson, params.date);
    const prisma = getPrismaClientOrThrow();
    const occurrenceCompletions = normalizeAs<PrismaOccurrenceCompletionRow[]>(
      await prisma.groupSessionOccurrenceCompletion.findMany({
        where: { groupSessionId: params.sessionId },
      }),
    );
    assertOccurrencesCanBeCancelled({
      session: session as unknown as SeedRow,
      dates: [params.date],
      occurrenceCompletions: occurrenceCompletions as unknown as SeedRow[],
      now: new Date(),
    });
    const cancelled = new Set(asStringArray(session.cancelledInstancesJson));
    cancelled.add(params.date);
    const update = await prisma.groupSession.updateMany({
      where: {
        id: session.id,
        version: session.version,
      },
      data: {
        cancelledInstancesJson: Array.from(cancelled).sort(),
        updatedByUserId: params.authUserId,
        version: {
          increment: 1,
        },
      },
    });
    if (update.count !== 1) {
      throw conflict('Group session changed while cancelling the occurrence', {
        sessionId: params.sessionId,
        occurrenceDate: params.date,
      });
    }
    const updated = normalizeForJson(
      await prisma.groupSession.findUniqueOrThrow({ where: { id: session.id } }),
    ) as SeedRow;
    return {
      session: mapSessionRow(updated),
      dataVersion: null,
    };
  }
  async endSeries(params: GroupSessionEndSeriesParams): Promise<GroupSessionActionResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.endSeries(params);
    }
    const session = await this.assertSessionWriteAccess(
      params.authUserId,
      params.isPrivilegedAdmin,
      params.sessionId,
    );
    const dates = scheduledRecurringDatesFrom(
      params.sessionId,
      session.scheduleJson,
      params.fromDate,
    );
    const prisma = getPrismaClientOrThrow();
    const occurrenceCompletions = normalizeAs<PrismaOccurrenceCompletionRow[]>(
      await prisma.groupSessionOccurrenceCompletion.findMany({
        where: { groupSessionId: params.sessionId },
      }),
    );
    assertOccurrencesCanBeCancelled({
      session: session as unknown as SeedRow,
      dates,
      occurrenceCompletions: occurrenceCompletions as unknown as SeedRow[],
      now: new Date(),
    });
    const cancelled = new Set(asStringArray(session.cancelledInstancesJson));
    for (const date of dates) {
      cancelled.add(date);
    }
    const update = await prisma.groupSession.updateMany({
      where: {
        id: session.id,
        version: session.version,
      },
      data: {
        cancelledInstancesJson: Array.from(cancelled).sort(),
        updatedByUserId: params.authUserId,
        version: {
          increment: 1,
        },
      },
    });
    if (update.count !== 1) {
      throw conflict('Group session changed while ending the series', {
        sessionId: params.sessionId,
      });
    }
    const updated = normalizeForJson(
      await prisma.groupSession.findUniqueOrThrow({ where: { id: session.id } }),
    ) as SeedRow;
    return {
      session: mapSessionRow(updated),
      dataVersion: null,
    };
  }
  async cancelSession(params: GroupSessionAccessParams): Promise<GroupSessionActionResult> {
    if (shouldUseDbFixtureFallback()) {
      getPrismaClientOrThrow();
    }
    const authorizedSession = await this.assertSessionWriteAccess(
      params.authUserId,
      params.isPrivilegedAdmin,
      params.sessionId,
    );
    if (normalizeSessionStatus(authorizedSession.status) === 'COMPLETED') {
      throw conflict('Completed group sessions cannot be cancelled', {
        sessionId: params.sessionId,
      });
    }
    const prisma = getPrismaClientOrThrow();
    const updated = normalizeForJson(
      await prisma.$transaction(async (tx) => {
        const [currentSession, finalizedRegistration, occurrenceCompletion] = await Promise.all([
          tx.groupSession.findFirst({
            where: {
              id: params.sessionId,
              deletedAt: null,
            },
            select: {
              status: true,
              version: true,
            },
          }),
          tx.groupSessionRegistration.findFirst({
            where: {
              groupSessionId: params.sessionId,
              deletedAt: null,
              status: {
                in: ['ATTENDED', 'NO_SHOW'],
              },
            },
            select: {
              id: true,
            },
          }),
          tx.groupSessionOccurrenceCompletion.findFirst({
            where: {
              groupSessionId: params.sessionId,
            },
            select: {
              id: true,
            },
          }),
        ]);
        if (!currentSession) {
          throw notFound('Group session not found', {
            sessionId: params.sessionId,
          });
        }
        if (normalizeSessionStatus(currentSession.status) === 'COMPLETED') {
          throw conflict('Completed group sessions cannot be cancelled', {
            sessionId: params.sessionId,
          });
        }
        if (occurrenceCompletion) {
          throw conflict('Group sessions with completed occurrences cannot be cancelled', {
            sessionId: params.sessionId,
          });
        }
        const activeBookings = await tx.booking.findMany({
          where: {
            groupSessionId: params.sessionId,
            deletedAt: null,
            status: {
              not: 'CANCELLED',
            },
          },
          select: {
            id: true,
            status: true,
          },
        });
        const completedBooking = activeBookings.find(
          (booking) => booking.status === 'COMPLETED',
        );
        if (finalizedRegistration || completedBooking) {
          throw conflict('Group sessions with finalized attendance cannot be cancelled', {
            sessionId: params.sessionId,
            registrationId: finalizedRegistration?.id ?? null,
            bookingId: completedBooking?.id ?? null,
          });
        }
        await Promise.all(
          activeBookings.map((booking) =>
            applyBookingCancellationInvoiceEffectsInDbTransaction(tx, {
              bookingId: booking.id,
              actorUserId: params.authUserId,
              reason: 'Group session cancelled.',
              requestId: params.requestId,
            }),
          ),
        );
        const now = new Date();
        await Promise.all([
          tx.groupSessionRegistration.updateMany({
            where: {
              groupSessionId: params.sessionId,
              deletedAt: null,
              status: {
                not: 'CANCELLED',
              },
            },
            data: {
              status: 'CANCELLED',
              rosterEndedAt: now,
              updatedByUserId: params.authUserId,
              version: {
                increment: 1,
              },
            },
          }),
          tx.attendanceRecord.updateMany({
            where: {
              groupSessionId: params.sessionId,
            },
            data: {
              groupSessionId: null,
            },
          }),
          ...activeBookings.flatMap((booking) => [
            tx.booking.update({
              where: {
                id: booking.id,
              },
              data: {
                status: 'CANCELLED',
                cancelledAt: now,
                cancelledByUserId: params.authUserId,
                cancelReason: 'Group session cancelled.',
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
                reason: 'Group session cancelled.',
                metadataJson: {
                  source: 'group-session-cancellation',
                },
                requestId: params.requestId ?? null,
                occurredAt: now,
              },
            }),
          ]),
        ]);
        const sessionUpdate = await tx.groupSession.updateMany({
          where: {
            id: params.sessionId,
            version: currentSession.version,
          },
          data: {
            status: 'CANCELLED',
            currentParticipants: 0,
            waitlistCount: 0,
            updatedByUserId: params.authUserId,
            version: {
              increment: 1,
            },
          },
        });
        if (sessionUpdate.count !== 1) {
          throw conflict('Group session changed during cancellation', {
            sessionId: params.sessionId,
          });
        }
        return tx.groupSession.findUniqueOrThrow({
          where: {
            id: params.sessionId,
          },
        });
      }, {
        ...API_DB_TRANSACTION_OPTIONS,
        isolationLevel: 'Serializable',
      }),
    ) as SeedRow;
    return {
      session: mapSessionRow(updated),
      dataVersion: null,
    };
  }
  async registerAthlete(params: GroupSessionRegisterParams): Promise<GroupSessionRegisterResult> {
    if (shouldUseDbFixtureFallback()) {
      getPrismaClientOrThrow();
    }
    await this.assertAthleteAccess(params.authUserId, params.athleteId, params.isPrivilegedAdmin);
    const prisma = getPrismaClientOrThrow();
    const session = await this.assertSessionWriteAccess(params.authUserId, true, params.sessionId);
    const athleteForThread = await prisma.athlete.findUnique({
      where: {
        id: params.athleteId,
      },
      select: {
        userId: true,
      },
    });
    const sessionThreadParticipants = buildSessionThreadParticipants({
      coachUserId: session.coachUserId,
      bookedByUserId: params.bookedByUserId,
      athleteUserId: athleteForThread?.userId ?? null,
    });
    const ensureDbGroupSessionThread = async <
      T extends Pick<typeof prisma, 'messageThread' | 'messageParticipant'>,
    >(
      tx: T,
      now: Date,
    ): Promise<void> => {
      if (sessionThreadParticipants.length < 2) {
        return;
      }
      let thread = await tx.messageThread.findFirst({
        where: {
          groupSessionId: params.sessionId,
          threadType: 'GROUP',
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });
      if (!thread) {
        thread = await tx.messageThread.create({
          data: {
            id: newId('thr'),
            threadType: 'GROUP',
            clubId: session.clubId,
            communityGroupId: null,
            groupSessionId: params.sessionId,
            bookingId: null,
            title: session.title || 'Session chat',
            lastMessageAt: null,
            createdByUserId: params.authUserId,
            updatedByUserId: params.authUserId,
            createdAt: now,
            updatedAt: now,
          },
          select: {
            id: true,
          },
        });
      }
      await Promise.all(
        sessionThreadParticipants.map((entry) =>
          tx.messageParticipant.upsert({
            where: {
              messageThreadId_userId: {
                messageThreadId: thread.id,
                userId: entry.userId,
              },
            },
            update: {
              role: entry.role,
              leftAt: null,
            },
            create: {
              id: newId('mpt'),
              messageThreadId: thread.id,
              userId: entry.userId,
              role: entry.role,
              lastReadAt: null,
              muted: false,
              joinedAt: now,
              leftAt: null,
            },
          }),
        ),
      );
    };
    const existing = normalizeAs<PrismaRegistrationRow | null>(
      await prisma.groupSessionRegistration.findFirst({
        where: {
          groupSessionId: params.sessionId,
          athleteId: params.athleteId,
          deletedAt: null,
          status: {
            not: 'CANCELLED',
          },
        },
      }),
    );
    if (existing) {
      const attendanceRecords = normalizeAs<PrismaAttendanceRow[]>(
        await prisma.attendanceRecord.findMany({
          where: {
            groupSessionId: params.sessionId,
            athleteId: params.athleteId,
          },
        }),
      );
      const registration = this.mapPrismaRegistration(existing, attendanceRecords);
      if (params.waitlistOnly && registration.status !== 'WAITLISTED') {
        throw conflict('Athlete is already registered for this group session', {
          sessionId: params.sessionId,
          registrationId: registration.id,
        });
      }
      if (registration.status === 'REGISTERED') {
        await prisma.$transaction(async (tx) => {
          await ensureDbGroupSessionThread(tx, new Date());
        }, API_DB_TRANSACTION_OPTIONS);
      }
      const linkedBooking = normalizeAs<{
        id: string;
        status: string;
      } | null>(
        await prisma.booking.findFirst({
          where: {
            groupSessionId: params.sessionId,
            deletedAt: null,
            status: {
              not: 'CANCELLED',
            },
            participants: {
              some: {
                athleteId: params.athleteId,
                deletedAt: null,
              },
            },
          },
          select: {
            id: true,
            status: true,
            recurringSeriesId: true,
            groupSessionId: true,
          },
        }),
      );
      return {
        registration,
        booking: linkedBooking,
        sessionStatus: normalizeSessionStatus(session.status),
        dataVersion: null,
      };
    }
    assertSessionOpenForRegistration(session as unknown as SeedRow, new Date());
    const deliveryCoachUserId = requireAssignedDeliveryCoach(params.sessionId, session.coachUserId);
    const currentParticipants = session.currentParticipants;
    const offPlatformParticipants = session.offPlatformParticipants;
    const maxParticipants = session.maxParticipants;
    const isFull =
      maxParticipants > 0 &&
      groupSessionHeadcount(currentParticipants, offPlatformParticipants) >= maxParticipants;
    if (params.waitlistOnly && !isFull) {
      throw conflict('Group session has spaces available; register instead', {
        sessionId: params.sessionId,
      });
    }
    if (isFull && !session.waitlistEnabled) {
      throw badRequest(params.waitlistOnly ? 'Group session waitlist is not enabled' : 'Group session is full', {
        sessionId: params.sessionId,
      });
    }
    const now = new Date();
    const registrationId = newId('gsr');
    const bookingId = newId('bok');
    const bookingParticipantId = newId('bkp');
    const bookingEventId = newId('bse');
    const bookingObjectiveIds = asStringArray(session.focusJson).map(() => newId('bko'));
    const result = await prisma.$transaction(async (tx) => {
      const registration = await tx.groupSessionRegistration.create({
        data: {
          id: registrationId,
          groupSessionId: params.sessionId,
          athleteId: params.athleteId,
          parentUserId: params.bookedByUserId,
          status: isFull ? 'WAITLISTED' : 'REGISTERED',
          paidAt: null,
          notes: params.note,
          createdByUserId: params.authUserId,
          updatedByUserId: params.authUserId,
          registeredAt: now,
          rosterActiveAt: isFull ? null : now,
          rosterEndedAt: null,
        },
      });
      let booking: {
        id: string;
        status: string;
        recurringSeriesId?: string | null;
        groupSessionId?: string | null;
      } | null = null;
      if (isFull) {
        await tx.groupSession.update({
          where: {
            id: params.sessionId,
          },
          data: {
            waitlistCount: {
              increment: 1,
            },
            status: 'FULL',
            updatedByUserId: params.authUserId,
            version: {
              increment: 1,
            },
          },
        });
      } else {
        await tx.groupSession.update({
          where: {
            id: params.sessionId,
          },
          data: {
            currentParticipants: {
              increment: 1,
            },
            status: derivePublishedSessionStatus(
              maxParticipants,
              currentParticipants + 1,
              offPlatformParticipants,
            ),
            updatedByUserId: params.authUserId,
            version: {
              increment: 1,
            },
          },
        });
        const schedule = buildScheduleEntries(session.scheduleJson);
        const firstSlot = schedule[0];
        const startsAt = firstSlot
          ? new Date(`${firstSlot.date}T${firstSlot.startTime}:00.000Z`)
          : now;
        const durationMinutes = firstSlot
          ? Math.max(
              15,
              Math.round(
                (Date.parse(`${firstSlot.date}T${firstSlot.endTime}:00.000Z`) -
                  startsAt.getTime()) /
                  60000,
              ),
            )
          : 60;
        await tx.booking.create({
          data: {
            id: bookingId,
            coachUserId: deliveryCoachUserId,
            bookedByUserId: params.bookedByUserId,
            clubId: session.clubId,
            coachingOfferingId: null,
            status: 'CONFIRMED',
            scheduledAt: startsAt,
            durationMinutes,
            location: session.location ?? 'Club training ground',
            serviceType: session.sessionType,
            notes: params.note,
            objectivesJson: asStringArray(session.focusJson),
            priceMinor: session.pricePerParticipantMinor ?? 0,
            currency: session.currency,
            confirmationMode: 'manual',
            confirmedAt: now,
            cancelledByUserId: null,
            cancelledAt: null,
            cancelReason: null,
            cancellationFeeMinor: null,
            groupSessionId: params.sessionId,
            recurringSeriesId: null,
            seriesIndex: null,
            createdByUserId: params.authUserId,
            updatedByUserId: params.authUserId,
          },
        });
        await Promise.all([
          tx.bookingParticipant.create({
            data: {
              id: bookingParticipantId,
              bookingId,
              athleteId: params.athleteId,
              guardianUserId: params.bookedByUserId,
              status: 'confirmed',
              createdByUserId: params.authUserId,
              updatedByUserId: params.authUserId,
            },
          }),
          tx.bookingStatusEvent.create({
            data: {
              id: bookingEventId,
              bookingId,
              fromStatus: null,
              toStatus: 'CONFIRMED',
              actorUserId: params.authUserId,
              reason: 'Created from group session registration.',
              metadataJson: {
                source: 'group-session-registration',
              },
              requestId: params.requestId,
              occurredAt: now,
            },
          }),
          ...asStringArray(session.focusJson).map((objective, index) =>
            tx.bookingObjective.create({
              data: {
                id: bookingObjectiveIds[index] ?? newId('bko'),
                bookingId,
                objective,
                sortOrder: index,
                createdAt: now,
              },
            }),
          ),
        ]);
        booking = {
          id: bookingId,
          status: 'CONFIRMED',
          recurringSeriesId: null,
          groupSessionId: params.sessionId,
        };
        await ensureDbGroupSessionThread(tx, now);
      }
      return {
        registration: normalizeAs<PrismaRegistrationRow>(registration),
        booking,
      };
    }, API_DB_TRANSACTION_OPTIONS);
    const attendanceRecords = normalizeAs<PrismaAttendanceRow[]>(
      await prisma.attendanceRecord.findMany({
        where: {
          groupSessionId: params.sessionId,
          athleteId: params.athleteId,
        },
      }),
    );
    const refreshedSession = await this.querySessions({
      sessionId: params.sessionId,
    });
    return {
      registration: this.mapPrismaRegistration(result.registration, attendanceRecords),
      booking: result.booking,
      sessionStatus: normalizeSessionStatus(refreshedSession[0]?.status),
      dataVersion: null,
    };
  }
  async listSessionRoster(params: GroupSessionAccessParams): Promise<GroupSessionRosterResult> {
    if (shouldUseDbFixtureFallback()) {
      getPrismaClientOrThrow();
    }
    const sessions = await this.querySessions({
      sessionId: params.sessionId,
      includeOccurrenceCompletions: params.forCompletion === true,
      includeRegistrationGuardianNames: true,
    });
    const session = sessions[0];
    if (!session) {
      throw notFound('Group session not found', {
        sessionId: params.sessionId,
      });
    }
    if (
      params.forCompletion &&
      !params.isPrivilegedAdmin &&
      session.coachUserId !== params.authUserId
    ) {
      throw forbidden('Only the assigned coach can read a group session completion roster', {
        sessionId: params.sessionId,
      });
    }
    const visibleSessionIds = await this.resolveVisibleSessionIds(
      [session],
      params.authUserId,
      params.isPrivilegedAdmin,
      true,
    );
    if (!visibleSessionIds.has(session.id)) {
      throw forbidden('Group session does not belong to authenticated user', {
        sessionId: params.sessionId,
      });
    }
    const occurrence = params.forCompletion
      ? pendingCompletionOccurrence({
          session: session as unknown as SeedRow,
          occurrenceCompletions: (session.occurrenceCompletions ?? []) as unknown as SeedRow[],
          now: new Date(),
        })
      : null;
    const registrations =
      params.forCompletion && !occurrence
        ? []
        : session.registrations.flatMap((row) =>
            occurrence
              ? isRegistrationActiveForOccurrence(row as unknown as SeedRow, occurrence)
                ? [
                    this.mapPrismaRegistration(
                      {
                        ...row,
                        status: 'REGISTERED',
                      },
                      session.attendanceRecords,
                    ),
                  ]
                : []
              : row.status !== 'CANCELLED'
                ? [this.mapPrismaRegistration(row, session.attendanceRecords)]
                : [],
          );
    const includeGuardianName =
      params.isPrivilegedAdmin || session.coachUserId === params.authUserId;
    return {
      session: this.mapPrismaSession(session),
      registrations: projectRosterRegistrationIdentity(registrations, includeGuardianName),
      occurrenceDate: occurrence?.date ?? null,
      dataVersion: null,
    };
  }
  async cancelRegistration(
    params: GroupSessionRegistrationAccessParams,
  ): Promise<GroupSessionRegistrationResult> {
    if (shouldUseDbFixtureFallback()) {
      getPrismaClientOrThrow();
    }
    const prisma = getPrismaClientOrThrow();
    const registration = normalizeAs<
      | (PrismaRegistrationRow & {
          groupSession: PrismaSessionRow;
          athlete: PrismaAthleteRow | null;
        })
      | null
    >(
      await prisma.groupSessionRegistration.findFirst({
        where: {
          id: params.registrationId,
          deletedAt: null,
        },
        include: {
          athlete: true,
          groupSession: true,
        },
      }),
    );
    if (!registration) {
      throw notFound('Group session registration not found', {
        registrationId: params.registrationId,
      });
    }
    const canManage =
      params.isPrivilegedAdmin ||
      registration.groupSession.coachUserId === params.authUserId ||
      registration.parentUserId === params.authUserId ||
      registration.athlete?.userId === params.authUserId;
    if (!canManage) {
      throw forbidden('Group session registration does not belong to authenticated user', {
        registrationId: params.registrationId,
      });
    }
    const now = new Date();
    const previousStatus = registration.status.toUpperCase();
    if (normalizeSessionStatus(registration.groupSession.status) === 'COMPLETED') {
      throw conflict('Completed group session registrations cannot be cancelled', {
        registrationId: params.registrationId,
        sessionId: registration.groupSessionId,
      });
    }
    if (previousStatus === 'ATTENDED' || previousStatus === 'NO_SHOW') {
      throw conflict('Finalized attendance cannot be cancelled through registration removal', {
        registrationId: params.registrationId,
        sessionId: registration.groupSessionId,
      });
    }
    const promotedBookingIds = await prisma.$transaction(async (tx) => {
      const createdPromotedBookingIds: string[] = [];
      let linkedBookingId: string | null = null;
      let linkedBookingStatus: string | null = null;
      if (previousStatus === 'REGISTERED') {
        const booking = await tx.booking.findFirst({
          where: {
            groupSessionId: registration.groupSessionId,
            deletedAt: null,
            status: {
              not: 'CANCELLED',
            },
            participants: {
              some: {
                athleteId: registration.athleteId,
                deletedAt: null,
              },
            },
          },
          select: {
            id: true,
            status: true,
          },
        });
        linkedBookingId = booking?.id ?? null;
        linkedBookingStatus = booking?.status ?? null;
        if (booking?.status === 'COMPLETED') {
          throw conflict(
            'Completed group bookings cannot be cancelled through registration removal',
            {
              registrationId: params.registrationId,
              bookingId: booking.id,
            },
          );
        }
        if (
          booking &&
          booking.status !== 'CONFIRMED' &&
          booking.status !== 'AWAITING_COMPLETION'
        ) {
          throw conflict('Linked group booking is not eligible for cancellation', {
            registrationId: params.registrationId,
            bookingId: booking.id,
            status: booking.status,
          });
        }
        if (linkedBookingId) {
          await applyBookingCancellationInvoiceEffectsInDbTransaction(tx, {
            bookingId: linkedBookingId,
            actorUserId: params.authUserId,
            reason: 'Group session registration cancelled.',
          });
        }
      }
      await tx.groupSessionRegistration.update({
        where: {
          id: params.registrationId,
        },
        data: {
          status: 'CANCELLED',
          rosterEndedAt: now,
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
      });
      if (previousStatus === 'REGISTERED') {
        await tx.groupSession.update({
          where: {
            id: registration.groupSessionId,
          },
          data: {
            currentParticipants: {
              decrement: 1,
            },
            updatedByUserId: params.authUserId,
            version: {
              increment: 1,
            },
          },
        });
        if (linkedBookingId) {
          await tx.booking.update({
            where: {
              id: linkedBookingId,
            },
            data: {
              status: 'CANCELLED',
              cancelledAt: now,
              cancelledByUserId: params.authUserId,
              cancelReason: 'Group session registration cancelled.',
              updatedByUserId: params.authUserId,
              version: {
                increment: 1,
              },
            },
          });
          await tx.bookingStatusEvent.create({
            data: {
              id: newId('bse'),
              bookingId: linkedBookingId,
              fromStatus: linkedBookingStatus as never,
              toStatus: 'CANCELLED',
              actorUserId: params.authUserId,
              reason: 'Group session registration cancelled.',
              metadataJson: {
                source: 'group-session-registration',
              },
              requestId: null,
              occurredAt: now,
            },
          });
        }
        const promoted = await tx.groupSessionRegistration.findFirst({
          where: {
            groupSessionId: registration.groupSessionId,
            deletedAt: null,
            status: 'WAITLISTED',
          },
          orderBy: {
            registeredAt: 'asc',
          },
        });
        if (promoted) {
          await Promise.all([
            tx.groupSessionRegistration.update({
              where: {
                id: promoted.id,
              },
              data: {
                status: 'REGISTERED',
                paidAt: null,
                rosterActiveAt: now,
                rosterEndedAt: null,
                updatedByUserId: params.authUserId,
                version: {
                  increment: 1,
                },
              },
            }),
            tx.groupSession.update({
              where: {
                id: registration.groupSessionId,
              },
              data: {
                currentParticipants: {
                  increment: 1,
                },
                waitlistCount: {
                  decrement: 1,
                },
                updatedByUserId: params.authUserId,
                version: {
                  increment: 1,
                },
              },
            }),
          ]);
          const existingPromotedBooking = await tx.booking.findFirst({
            where: {
              groupSessionId: registration.groupSessionId,
              deletedAt: null,
              status: {
                not: 'CANCELLED',
              },
              participants: {
                some: {
                  athleteId: promoted.athleteId,
                  deletedAt: null,
                },
              },
            },
            select: {
              id: true,
            },
          });
          if (!existingPromotedBooking) {
            const bookingId = newId('bok');
            const schedule = buildScheduleEntries(registration.groupSession.scheduleJson);
            const firstSlot = schedule[0];
            const startsAt = firstSlot
              ? new Date(`${firstSlot.date}T${firstSlot.startTime}:00.000Z`)
              : now;
            const durationMinutes = firstSlot
              ? Math.max(
                  15,
                  Math.round(
                    (Date.parse(`${firstSlot.date}T${firstSlot.endTime}:00.000Z`) -
                      startsAt.getTime()) /
                      60000,
                  ),
                )
              : 60;
            const bookedByUserId = promoted.parentUserId ?? params.authUserId;
            await tx.booking.create({
              data: {
                id: bookingId,
                coachUserId: registration.groupSession.coachUserId,
                bookedByUserId,
                clubId: registration.groupSession.clubId,
                coachingOfferingId: null,
                status: 'CONFIRMED',
                scheduledAt: startsAt,
                durationMinutes,
                location: registration.groupSession.location ?? 'Club training ground',
                serviceType: registration.groupSession.sessionType,
                notes: promoted.notes ?? 'Promoted from waitlist.',
                objectivesJson: asStringArray(registration.groupSession.focusJson),
                priceMinor: registration.groupSession.pricePerParticipantMinor ?? 0,
                currency: registration.groupSession.currency,
                confirmationMode: 'manual',
                confirmedAt: now,
                cancelledByUserId: null,
                cancelledAt: null,
                cancelReason: null,
                cancellationFeeMinor: null,
                groupSessionId: registration.groupSessionId,
                recurringSeriesId: null,
                seriesIndex: null,
                createdByUserId: params.authUserId,
                updatedByUserId: params.authUserId,
              },
            });
            await Promise.all([
              tx.bookingParticipant.create({
                data: {
                  id: newId('bkp'),
                  bookingId,
                  athleteId: promoted.athleteId,
                  guardianUserId: bookedByUserId,
                  status: 'confirmed',
                  createdByUserId: params.authUserId,
                  updatedByUserId: params.authUserId,
                },
              }),
              tx.bookingStatusEvent.create({
                data: {
                  id: newId('bse'),
                  bookingId,
                  fromStatus: null,
                  toStatus: 'CONFIRMED',
                  actorUserId: params.authUserId,
                  reason: 'Created from group session waitlist promotion.',
                  metadataJson: {
                    source: 'group-session-waitlist-promotion',
                  },
                  requestId: 'waitlist_promotion',
                  occurredAt: now,
                },
              }),
              ...asStringArray(registration.groupSession.focusJson).map((objective, index) =>
                tx.bookingObjective.create({
                  data: {
                    id: newId('bko'),
                    bookingId,
                    objective,
                    sortOrder: index,
                    createdAt: now,
                  },
                }),
              ),
            ]);
            createdPromotedBookingIds.push(bookingId);
          }
        }
      } else if (previousStatus === 'WAITLISTED') {
        await tx.groupSession.update({
          where: {
            id: registration.groupSessionId,
          },
          data: {
            waitlistCount: {
              decrement: 1,
            },
            updatedByUserId: params.authUserId,
            version: {
              increment: 1,
            },
          },
        });
      }
      return createdPromotedBookingIds;
    }, API_DB_TRANSACTION_OPTIONS);
    await Promise.all(
      promotedBookingIds.map((bookingId) =>
        generateLinkedRegistrationInvoiceIfBillable({
          bookingId,
          actorUserId: params.authUserId,
          priceMinor: registration.groupSession.pricePerParticipantMinor,
        }),
      ),
    );
    const [refreshedRow, attendanceRows] = await Promise.all([
      prisma.groupSessionRegistration.findUnique({
        where: {
          id: params.registrationId,
        },
      }),
      prisma.attendanceRecord.findMany({
        where: {
          groupSessionId: registration.groupSessionId,
          athleteId: registration.athleteId,
        },
      }),
    ]);
    const refreshed = normalizeAs<PrismaRegistrationRow | null>(refreshedRow);
    const attendanceRecords = normalizeAs<PrismaAttendanceRow[]>(attendanceRows);
    if (!refreshed) {
      throw notFound('Group session registration not found', {
        registrationId: params.registrationId,
      });
    }
    return {
      registration: this.mapPrismaRegistration(refreshed, attendanceRecords),
      dataVersion: null,
    };
  }
  async markAttendance(
    params: GroupSessionAttendanceParams,
  ): Promise<GroupSessionRegistrationResult> {
    if (shouldUseDbFixtureFallback()) {
      getPrismaClientOrThrow();
    }
    const prisma = getPrismaClientOrThrow();
    return prisma.$transaction(async (tx) => {
      const registration = normalizeAs<
        | (PrismaRegistrationRow & {
            groupSession: PrismaSessionRow;
          })
        | null
      >(
        await tx.groupSessionRegistration.findFirst({
          where: {
            id: params.registrationId,
            deletedAt: null,
          },
          include: {
            groupSession: true,
          },
        }),
      );
      if (!registration) {
        throw notFound('Group session registration not found', {
          registrationId: params.registrationId,
        });
      }
      if (
        !params.isPrivilegedAdmin &&
        registration.groupSession.coachUserId !== params.authUserId
      ) {
        throw forbidden('Group session does not belong to authenticated user', {
          registrationId: params.registrationId,
        });
      }
      if (normalizeSessionStatus(registration.groupSession.status) === 'COMPLETED') {
        throw conflict('Completed group session attendance is immutable', {
          registrationId: params.registrationId,
          sessionId: registration.groupSessionId,
        });
      }
      const occurrence = assertGroupSessionOccurrenceCanBeCompleted(
        registration.groupSession as unknown as SeedRow,
        params.date,
        new Date(),
      );
      const occurrenceCompletion = await tx.groupSessionOccurrenceCompletion.findUnique({
        where: {
          groupSessionId_occurrenceDate: {
            groupSessionId: registration.groupSessionId,
            occurrenceDate: new Date(`${params.date}T00:00:00.000Z`),
          },
        },
        select: {
          id: true,
        },
      });
      if (occurrenceCompletion) {
        throw conflict('Completed group session occurrence attendance is immutable', {
          registrationId: params.registrationId,
          sessionId: registration.groupSessionId,
          occurrenceDate: params.date,
        });
      }
      if (!isRegistrationActiveForOccurrence(registration as unknown as SeedRow, occurrence)) {
        throw badRequest('Registration was not active for this group session occurrence', {
          registrationId: params.registrationId,
          sessionId: registration.groupSessionId,
          occurrenceDate: params.date,
        });
      }
      const isRecurring = buildScheduleEntries(registration.groupSession.scheduleJson).length > 1;
      const targetDate = params.date;
      const existing = await tx.attendanceRecord.findMany({
        where: {
          groupSessionId: registration.groupSessionId,
          athleteId: registration.athleteId,
        },
      });
      const matching = existing.filter(
        (row) => parseIsoDatePart(row.recordedAt.toISOString()) === targetDate,
      );
      if (params.status) {
        const [existing, ...duplicates] = matching;
        if (existing) {
          await tx.attendanceRecord.update({
            where: {
              id: existing.id,
            },
            data: {
              status: params.status,
              recordedByUserId: params.authUserId,
            },
          });
        } else {
          await tx.attendanceRecord.create({
            data: {
              id: newId('att'),
              bookingId: null,
              groupSessionId: registration.groupSessionId,
              athleteId: registration.athleteId,
              status: params.status,
              notes: null,
              effortRating: null,
              focusAreasJson: [],
              recordedByUserId: params.authUserId,
              recordedAt: new Date(`${targetDate}T12:00:00.000Z`),
            },
          });
        }
        if (duplicates.length > 0) {
          await tx.attendanceRecord.updateMany({
            where: {
              id: {
                in: duplicates.map((row) => row.id),
              },
            },
            data: {
              status: 'SUPERSEDED',
            },
          });
        }
        await tx.groupSessionRegistration.update({
          where: {
            id: registration.id,
          },
          data: {
            status: isRecurring
              ? recurringRegistrationStatus(registration as unknown as SeedRow)
              : params.status,
            updatedByUserId: params.authUserId,
            version: {
              increment: 1,
            },
          },
        });
      } else {
        if (matching.length > 0) {
          await tx.attendanceRecord.updateMany({
            where: {
              id: {
                in: matching.map((row) => row.id),
              },
            },
            data: {
              status: 'CLEARED',
            },
          });
        }
        const remaining = await tx.attendanceRecord.findMany({
          where: {
            groupSessionId: registration.groupSessionId,
            athleteId: registration.athleteId,
            status: {
              in: ['ATTENDED', 'NO_SHOW'],
            },
          },
          select: {
            status: true,
          },
        });
        await tx.groupSessionRegistration.update({
          where: {
            id: registration.id,
          },
          data: {
            status: isRecurring
              ? recurringRegistrationStatus(registration as unknown as SeedRow)
              : remaining.some((row) => row.status === 'ATTENDED')
                ? 'ATTENDED'
                : remaining.some((row) => row.status === 'NO_SHOW')
                  ? 'NO_SHOW'
                  : 'REGISTERED',
            updatedByUserId: params.authUserId,
            version: {
              increment: 1,
            },
          },
        });
      }
      const [refreshed, attendanceRecords] = await Promise.all([
        tx.groupSessionRegistration.findUnique({
          where: {
            id: registration.id,
          },
        }),
        tx.attendanceRecord.findMany({
          where: {
            groupSessionId: registration.groupSessionId,
            athleteId: registration.athleteId,
          },
        }),
      ]);
      if (!refreshed) {
        throw notFound('Group session registration not found', {
          registrationId: params.registrationId,
        });
      }
      const mappedRegistration = this.mapPrismaRegistration(
        normalizeAs<PrismaRegistrationRow>(refreshed),
        normalizeAs<PrismaAttendanceRow[]>(attendanceRecords),
      );
      await tx.auditEvent.create({
        data: {
          ...params.successAuditEvent,
          metadataJson: {
            ...(params.successAuditEvent.metadataJson as SeedRow),
            sessionId: registration.groupSessionId,
            athleteId: registration.athleteId,
            registrationStatus: mappedRegistration.status,
          } as never,
        },
      });
      return {
        registration: mappedRegistration,
        dataVersion: null,
      };
    }, {
      ...API_DB_TRANSACTION_OPTIONS,
      isolationLevel: 'Serializable',
    });
  }
  async completeSession(
    params: GroupSessionCompletionParams,
  ): Promise<GroupSessionCompletionResult> {
    if (shouldUseDbFixtureFallback()) {
      getPrismaClientOrThrow();
    }
    const prisma = getPrismaClientOrThrow();
    const now = new Date();
    const completedSession = await prisma.$transaction(async (tx) => {
      const session = normalizeAs<PrismaSessionRow | null>(
        await tx.groupSession.findFirst({
          where: {
            id: params.sessionId,
            deletedAt: null,
          },
          include: {
            registrations: {
              where: {
                deletedAt: null,
              },
            },
            attendanceRecords: true,
            occurrenceCompletions: true,
          },
        }),
      );
      if (!session) {
        throw notFound('Group session not found', {
          sessionId: params.sessionId,
        });
      }
      if (!params.isPrivilegedAdmin && session.coachUserId !== params.authUserId) {
        throw forbidden('Group session does not belong to authenticated user', {
          sessionId: params.sessionId,
        });
      }
      const occurrence = assertGroupSessionOccurrenceCanBeCompleted(
        session as unknown as SeedRow,
        params.body.occurrenceDate,
        now,
      );
      const registrationRows = session.registrations as unknown as SeedRow[];
      assertExactCompletionRoster(
        params.sessionId,
        registrationRows,
        occurrence,
        params.body.attendance,
      );
      const registrationById = new Map(session.registrations.map((row) => [row.id, row] as const));
      const attendanceRows = session.attendanceRecords as unknown as SeedRow[];
      const occurrenceRows = (session.occurrenceCompletions ?? []) as unknown as SeedRow[];
      const existingCompletion = occurrenceRows.find(
        (row) =>
          asString(row.groupSessionId) === params.sessionId &&
          occurrenceCompletionDate(row) === params.body.occurrenceDate,
      );
      if (existingCompletion) {
        if (
          !completionMatchesExistingProof({
            sessionId: params.sessionId,
            occurrenceDate: params.body.occurrenceDate,
            registrations: registrationRows,
            attendanceRecords: attendanceRows,
            attendance: params.body.attendance,
          })
        ) {
          throw conflict('Group session was already completed with different attendance', {
            sessionId: params.sessionId,
            occurrenceDate: params.body.occurrenceDate,
          });
        }
        return session;
      }
      if (normalizeSessionStatus(session.status) === 'COMPLETED') {
        throw conflict('Group session completion ledger is inconsistent', {
          sessionId: params.sessionId,
          occurrenceDate: params.body.occurrenceDate,
        });
      }
      const shouldCompleteSeries = willCompleteSeriesAfterOccurrence({
        session: session as unknown as SeedRow,
        occurrenceCompletions: occurrenceRows,
        occurrenceDate: params.body.occurrenceDate,
        now,
      });
      const linkedBookings = await tx.booking.findMany({
        where: {
          groupSessionId: params.sessionId,
          deletedAt: null,
          status: {
            not: 'CANCELLED',
          },
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
        },
      });
      const linkedBookingByAthleteId = new Map<
        string,
        (typeof linkedBookings)[number]
      >();
      for (const booking of linkedBookings) {
        for (const participant of booking.participants) {
          if (linkedBookingByAthleteId.has(participant.athleteId)) {
            throw conflict('Athlete has multiple active bookings for this group session', {
              sessionId: params.sessionId,
              athleteId: participant.athleteId,
            });
          }
          linkedBookingByAthleteId.set(participant.athleteId, booking);
        }
      }
      for (const linkedBooking of linkedBookings) {
        if (linkedBooking.status === 'COMPLETED') {
          throw conflict('Linked group booking was completed outside group session authority', {
            bookingId: linkedBooking.id,
            sessionId: params.sessionId,
          });
        }
        if (
          linkedBooking.status !== 'CONFIRMED' &&
          linkedBooking.status !== 'AWAITING_COMPLETION'
        ) {
          throw conflict('Linked group booking is not eligible for completion', {
            bookingId: linkedBooking.id,
            status: linkedBooking.status,
          });
        }
      }
      if (shouldCompleteSeries) {
        const finalRosterAthleteIds = new Set(
          params.body.attendance.flatMap((entry) => {
            const athleteId = registrationById.get(entry.registrationId)?.athleteId;
            return athleteId ? [athleteId] : [];
          }),
        );
        const orphanedBooking = linkedBookings.find(
          (booking) =>
            booking.participants.length === 0 ||
            booking.participants.some(
              (participant) => !finalRosterAthleteIds.has(participant.athleteId),
            ),
        );
        if (orphanedBooking) {
          throw conflict('Every active linked booking must belong to the final occurrence roster', {
            sessionId: params.sessionId,
            bookingId: orphanedBooking.id,
          });
        }
      }
      const occurrenceCompletion = normalizeAs<PrismaOccurrenceCompletionRow>(
        await tx.groupSessionOccurrenceCompletion.create({
          data: {
            id: newId('goc'),
            groupSessionId: params.sessionId,
            occurrenceDate: new Date(`${params.body.occurrenceDate}T00:00:00.000Z`),
            completedByUserId: params.authUserId,
            rosterSize: params.body.attendance.length,
            attendedCount: params.body.attendance.filter((entry) => entry.status === 'ATTENDED')
              .length,
            noShowCount: params.body.attendance.filter((entry) => entry.status === 'NO_SHOW')
              .length,
          },
        }),
      );
      occurrenceRows.push(occurrenceCompletion as unknown as SeedRow);
      const recordedAt = new Date(`${params.body.occurrenceDate}T12:00:00.000Z`);
      for (const input of params.body.attendance) {
        const registration = registrationById.get(input.registrationId);
        if (!registration) {
          throw badRequest('Group session completion registration not found', {
            sessionId: params.sessionId,
            registrationId: input.registrationId,
          });
        }
        const matching = session.attendanceRecords.filter(
          (row) =>
            row.athleteId === registration.athleteId &&
            parseIsoDatePart(row.recordedAt) === params.body.occurrenceDate,
        );
        const [existing, ...duplicates] = matching;
        const linkedBooking = linkedBookingByAthleteId.get(registration.athleteId);
        let attendanceRecord: PrismaAttendanceRow;
        if (existing) {
          attendanceRecord = normalizeAs<PrismaAttendanceRow>(
            await tx.attendanceRecord.update({
              where: {
                id: existing.id,
              },
              data: {
                bookingId: linkedBooking?.id ?? existing.bookingId,
                status: input.status,
                notes: input.notes ?? null,
                effortRating: input.effortRating ?? null,
                recordedByUserId: params.authUserId,
                recordedAt,
              },
            }),
          );
          Object.assign(existing, attendanceRecord);
        } else {
          attendanceRecord = normalizeAs<PrismaAttendanceRow>(
            await tx.attendanceRecord.create({
              data: {
                id: newId('att'),
                bookingId: linkedBooking?.id ?? null,
                groupSessionId: params.sessionId,
                athleteId: registration.athleteId,
                status: input.status,
                notes: input.notes ?? null,
                effortRating: input.effortRating ?? null,
                focusAreasJson: [],
                recordedByUserId: params.authUserId,
                recordedAt,
              },
            }),
          );
          session.attendanceRecords.push(attendanceRecord);
        }
        if (duplicates.length > 0) {
          await tx.attendanceRecord.updateMany({
            where: {
              id: {
                in: duplicates.map((row) => row.id),
              },
            },
            data: {
              status: 'SUPERSEDED',
            },
          });
          for (const duplicate of duplicates) {
            duplicate.status = 'SUPERSEDED';
          }
        }
        if (linkedBooking && shouldCompleteSeries) {
          const bookingUpdate = await tx.booking.updateMany({
            where: {
              id: linkedBooking.id,
              version: linkedBooking.version,
              status: linkedBooking.status,
            },
            data: {
              status: 'COMPLETED',
              updatedByUserId: params.authUserId,
              version: {
                increment: 1,
              },
            },
          });
          if (bookingUpdate.count !== 1) {
            throw conflict('Linked group booking changed during completion', {
              bookingId: linkedBooking.id,
            });
          }
          await tx.bookingStatusEvent.create({
            data: {
              id: newId('bse'),
              bookingId: linkedBooking.id,
              fromStatus: linkedBooking.status,
              toStatus: 'COMPLETED',
              actorUserId: params.authUserId,
              reason: 'Completed with group session attendance',
              metadataJson: {
                source: 'group-session-completion',
                attendanceRecordIds: [attendanceRecord.id],
                attendanceSummary: {
                  attended: input.status === 'ATTENDED' ? 1 : 0,
                  noShow: input.status === 'NO_SHOW' ? 1 : 0,
                },
                proofSource: 'attendance-record',
              },
              requestId: params.requestId,
              occurredAt: now,
            },
          });
          const recipientUserIds = bookingFamilyRecipientIds({
            actorUserId: params.authUserId,
            bookedByUserId: linkedBooking.bookedByUserId,
            participants: linkedBooking.participants.map((participant) => ({
              guardianUserId: participant.guardianUserId,
              athleteUserId: participant.athlete.userId,
            })),
          });
          if (recipientUserIds.length > 0) {
            const existingNotifications = await tx.notification.findMany({
              where: {
                userId: {
                  in: recipientUserIds,
                },
                sourceType: {
                  in: [
                    BOOKING_COMPLETED_NOTIFICATION_SOURCE_TYPE,
                    BOOKING_REVIEW_PROMPT_NOTIFICATION_SOURCE_TYPE,
                  ],
                },
                sourceId: linkedBooking.id,
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
              bookingId: linkedBooking.id,
              actorUserId: params.authUserId,
              recipientUserIds,
              attendanceSummary: {
                attended: input.status === 'ATTENDED' ? 1 : 0,
                noShow: input.status === 'NO_SHOW' ? 1 : 0,
              },
              now: now.toISOString(),
            }).filter(
              (notification) =>
                !existingKeys.has(
                  `${asString(notification.sourceType) ?? ''}:${asString(notification.userId) ?? ''}`,
                ),
            );
            if (notificationRows.length > 0) {
              await tx.notification.createMany({
                data: notificationRows.map((notification) => ({
                  id: asString(notification.id) ?? newId('nfn'),
                  userId: asString(notification.userId) ?? '',
                  type: asString(notification.type) ?? 'BOOKING_COMPLETED',
                  title: asString(notification.title) ?? 'Booking update',
                  body: asString(notification.body) ?? null,
                  status: 'UNREAD',
                  sourceType: asString(notification.sourceType) ?? null,
                  sourceId: linkedBooking.id,
                  deepLink:
                    asString(notification.deepLink) ?? `/bookings/${linkedBooking.id}`,
                  metadataJson: notification.metadataJson as never,
                  createdAt: now,
                  updatedAt: now,
                })),
              });
            }
          }
        }
      }
      const sessionRow = session as unknown as SeedRow;
      const sessionVersion = session.version;
      const registrationVersions = new Map(
        session.registrations.map((registration) => [
          registration.id,
          registration.version,
        ]),
      );
      applyDerivedGroupCompletionState({
        session: sessionRow,
        registrations: registrationRows,
        attendanceRecords: attendanceRows,
        occurrenceCompletions: occurrenceRows,
        actorUserId: params.authUserId,
        now,
      });
      const registrationUpdates = await Promise.all(
        registrationRows
          .filter(isActiveCompletionRegistration)
          .map((registration) =>
            tx.groupSessionRegistration.updateMany({
              where: {
                id: asString(registration.id) ?? '',
                version: registrationVersions.get(asString(registration.id) ?? ''),
              },
              data: {
                status: asString(registration.status) as never,
                updatedByUserId: params.authUserId,
                version: {
                  increment: 1,
                },
              },
            }),
          ),
      );
      if (registrationUpdates.some((update) => update.count !== 1)) {
        throw conflict('Group session roster changed during completion', {
          sessionId: params.sessionId,
        });
      }
      const sessionUpdate = await tx.groupSession.updateMany({
        where: {
          id: params.sessionId,
          version: sessionVersion,
        },
        data: {
          status: asString(sessionRow.status) as never,
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
      });
      if (sessionUpdate.count !== 1) {
        throw conflict('Group session changed during completion', {
          sessionId: params.sessionId,
        });
      }
      await tx.auditEvent.create({
        data: params.successAuditEvent,
      });
      const refreshed = await tx.groupSession.findFirst({
        where: {
          id: params.sessionId,
          deletedAt: null,
        },
        include: {
          registrations: {
            where: {
              deletedAt: null,
            },
          },
          attendanceRecords: true,
          occurrenceCompletions: true,
        },
      });
      if (!refreshed) {
        throw notFound('Group session not found', {
          sessionId: params.sessionId,
        });
      }
      return refreshed;
    }, {
      ...API_DB_TRANSACTION_OPTIONS,
      isolationLevel: 'Serializable',
    });
    const refreshed = normalizeAs<PrismaSessionRow>(completedSession);
    return {
      session: this.mapPrismaSession(refreshed),
      registrations: refreshed.registrations.map((registration) =>
        this.mapPrismaRegistration(registration, refreshed.attendanceRecords),
      ),
      occurrenceDate: params.body.occurrenceDate,
      dataVersion: null,
    };
  }
  async listRegistrationsForAthleteIds(
    params: GroupRegistrationListParams,
  ): Promise<GroupRegistrationListResult> {
    if (shouldUseDbFixtureFallback()) {
      getPrismaClientOrThrow();
    }
    await Promise.all(
      params.athleteIds.map((athleteId) =>
        this.assertAthleteAccess(params.authUserId, athleteId, params.isPrivilegedAdmin),
      ),
    );
    const prisma = getPrismaClientOrThrow();
    const registrations = normalizeAs<PrismaRegistrationRow[]>(
      await prisma.groupSessionRegistration.findMany({
        where: {
          athleteId: {
            in: params.athleteIds,
          },
          deletedAt: null,
          status: {
            not: 'CANCELLED',
          },
        },
      }),
    );
    const sessionIds = Array.from(new Set(registrations.map((row) => row.groupSessionId)));
    const attendanceRecords = normalizeAs<PrismaAttendanceRow[]>(
      await prisma.attendanceRecord.findMany({
        where: {
          groupSessionId: {
            in: sessionIds,
          },
          athleteId: {
            in: params.athleteIds,
          },
        },
      }),
    );
    return {
      registrations: registrations.map((row) =>
        this.mapPrismaRegistration(
          row,
          attendanceRecords.filter(
            (attendance) => attendance.groupSessionId === row.groupSessionId,
          ),
        ),
      ),
      dataVersion: null,
    };
  }
  async createSessionRsvps(
    params: GroupSessionRsvpCreateParams,
  ): Promise<SessionRsvpListResult> {
    if (shouldUseDbFixtureFallback()) {
      getPrismaClientOrThrow();
    }
    const sessions = await this.querySessions({
      sessionId: params.sessionId,
    });
    const session = sessions[0];
    if (!session) {
      throw notFound('Group session not found', {
        sessionId: params.sessionId,
      });
    }
    const prisma = getPrismaClientOrThrow();
    const rows: AppSessionRsvp[] = [];
    for (const member of params.members) {
      await this.assertSessionRsvpMemberWriteAccess({
        session,
        authUserId: params.authUserId,
        isPrivilegedAdmin: params.isPrivilegedAdmin,
        member,
      });
      const existing = normalizeAs<PrismaSessionRsvpRow | null>(
        await prisma.sessionRsvp.findFirst({
          where: {
            groupSessionId: params.sessionId,
            userId: member.userId,
            athleteId: member.childId ?? null,
            deletedAt: null,
          },
        }),
      );
      if (existing) {
        rows.push(mapSessionRsvpRow(existing as unknown as SeedRow));
        continue;
      }
      const created = normalizeAs<PrismaSessionRsvpRow>(
        await prisma.sessionRsvp.create({
          data: {
            id: newId('srp'),
            groupSessionId: params.sessionId,
            userId: member.userId,
            athleteId: member.childId ?? null,
            status: 'PENDING',
            respondedAt: null,
            createdByUserId: params.authUserId,
            updatedByUserId: params.authUserId,
          },
        }),
      );
      rows.push(mapSessionRsvpRow(created as unknown as SeedRow));
    }
    return {
      rsvps: rows,
      dataVersion: null,
    };
  }
  async listSessionRsvps(params: GroupSessionRsvpAccessParams): Promise<SessionRsvpListResult> {
    if (shouldUseDbFixtureFallback()) {
      getPrismaClientOrThrow();
    }
    const sessions = await this.querySessions({
      sessionId: params.sessionId,
    });
    const session = sessions[0];
    if (!session) {
      throw notFound('Group session not found', {
        sessionId: params.sessionId,
      });
    }
    await this.assertSessionRsvpReadAccess(
      session,
      params.authUserId,
      params.isPrivilegedAdmin,
    );
    const canReadAll = await this.canManageSessionRsvps(
      session,
      params.authUserId,
      params.isPrivilegedAdmin,
    );
    const prisma = getPrismaClientOrThrow();
    const rows = normalizeAs<PrismaSessionRsvpRow[]>(
      await prisma.sessionRsvp.findMany({
        where: {
          groupSessionId: params.sessionId,
          deletedAt: null,
          ...(canReadAll
            ? {}
            : {
                userId: params.authUserId,
              }),
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
    );
    return {
      rsvps: rows.map((row) => mapSessionRsvpRow(row as unknown as SeedRow)),
      dataVersion: null,
    };
  }
  async listSessionRsvpsForUser(
    params: SessionRsvpUserListParams,
  ): Promise<SessionRsvpListResult> {
    if (!params.isPrivilegedAdmin && params.userId !== params.authUserId) {
      throw forbidden('RSVP userId must match authenticated user', {
        userId: params.userId,
      });
    }
    if (shouldUseDbFixtureFallback()) {
      getPrismaClientOrThrow();
    }
    const prisma = getPrismaClientOrThrow();
    const rows = normalizeAs<PrismaSessionRsvpRow[]>(
      await prisma.sessionRsvp.findMany({
        where: {
          userId: params.userId,
          deletedAt: null,
          ...(params.status
            ? {
                status: toStoredSessionRsvpStatus(params.status) as never,
              }
            : {}),
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    );
    return {
      rsvps: rows.map((row) => mapSessionRsvpRow(row as unknown as SeedRow)),
      dataVersion: null,
    };
  }
  async getSessionRsvpById(params: SessionRsvpAccessParams): Promise<SessionRsvpActionResult> {
    if (shouldUseDbFixtureFallback()) {
      getPrismaClientOrThrow();
    }
    const prisma = getPrismaClientOrThrow();
    const row = normalizeAs<
      | (PrismaSessionRsvpRow & {
          groupSession: PrismaSessionRow;
        })
      | null
    >(
      await prisma.sessionRsvp.findFirst({
        where: {
          id: params.rsvpId,
          deletedAt: null,
        },
        include: {
          groupSession: {
            include: {
              registrations: {
                where: {
                  deletedAt: null,
                },
                include: {
                  athlete: true,
                },
              },
              attendanceRecords: true,
            },
          },
        },
      }),
    );
    if (!row) {
      throw notFound('Session RSVP not found', {
        rsvpId: params.rsvpId,
      });
    }
    const canReadAll = await this.canManageSessionRsvps(
      row.groupSession,
      params.authUserId,
      params.isPrivilegedAdmin,
    );
    if (!canReadAll && row.userId !== params.authUserId) {
      throw forbidden('Session RSVP does not belong to authenticated user', {
        rsvpId: params.rsvpId,
      });
    }
    return {
      rsvp: mapSessionRsvpRow(row as unknown as SeedRow),
      dataVersion: null,
    };
  }
  async respondSessionRsvp(params: SessionRsvpRespondParams): Promise<SessionRsvpActionResult> {
    if (shouldUseDbFixtureFallback()) {
      getPrismaClientOrThrow();
    }
    const prisma = getPrismaClientOrThrow();
    const existing = normalizeAs<PrismaSessionRsvpRow | null>(
      await prisma.sessionRsvp.findFirst({
        where: {
          id: params.rsvpId,
          deletedAt: null,
        },
      }),
    );
    if (!existing) {
      throw notFound('Session RSVP not found', {
        rsvpId: params.rsvpId,
      });
    }
    if (!params.isPrivilegedAdmin && existing.userId !== params.authUserId) {
      throw forbidden('Session RSVP does not belong to authenticated user', {
        rsvpId: params.rsvpId,
      });
    }
    const updated = normalizeAs<PrismaSessionRsvpRow>(
      await prisma.sessionRsvp.update({
        where: {
          id: params.rsvpId,
        },
        data: {
          status: toStoredSessionRsvpStatus(params.status) as never,
          respondedAt: new Date(),
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
      }),
    );
    return {
      rsvp: mapSessionRsvpRow(updated as unknown as SeedRow),
      dataVersion: null,
    };
  }
  async getSessionRsvpCounts(
    params: GroupSessionRsvpAccessParams,
  ): Promise<SessionRsvpCountsResult> {
    const list = await this.listSessionRsvps(params);
    const counts = emptySessionRsvpCounts();
    for (const rsvp of list.rsvps) {
      incrementSessionRsvpCounts(counts, rsvp.status);
    }
    return {
      counts,
      dataVersion: list.dataVersion,
    };
  }
  async getBatchSessionRsvpCounts(
    params: SessionRsvpBatchCountsParams,
  ): Promise<SessionRsvpBatchCountsResult> {
    if (shouldUseDbFixtureFallback()) {
      getPrismaClientOrThrow();
    }
    const countsBySessionId = Object.fromEntries(
      params.sessionIds.map((sessionId) => [sessionId, emptySessionRsvpCounts()]),
    );
    for (const sessionId of params.sessionIds) {
      const list = await this.listSessionRsvps({
        authUserId: params.authUserId,
        isPrivilegedAdmin: params.isPrivilegedAdmin,
        sessionId,
      });
      for (const rsvp of list.rsvps) {
        incrementSessionRsvpCounts(countsBySessionId[sessionId]!, rsvp.status);
      }
    }
    return {
      countsBySessionId,
      dataVersion: null,
    };
  }
  async remindSessionRsvps(
    params: GroupSessionRsvpAccessParams,
  ): Promise<SessionRsvpReminderResult> {
    if (shouldUseDbFixtureFallback()) {
      getPrismaClientOrThrow();
    }
    const sessions = await this.querySessions({
      sessionId: params.sessionId,
    });
    const session = sessions[0];
    if (!session) {
      throw notFound('Group session not found', {
        sessionId: params.sessionId,
      });
    }
    await this.assertSessionRsvpManageAccess(
      session,
      params.authUserId,
      params.isPrivilegedAdmin,
    );
    const prisma = getPrismaClientOrThrow();
    const pending = normalizeAs<PrismaSessionRsvpRow[]>(
      await prisma.sessionRsvp.findMany({
        where: {
          groupSessionId: params.sessionId,
          status: 'PENDING',
          deletedAt: null,
        },
      }),
    );
    const now = new Date();
    if (pending.length > 0) {
      await prisma.notification.createMany({
        data: pending.map((row) => ({
          id: newId('nfn'),
          userId: row.userId,
          type: 'SESSION_RSVP_REMINDER',
          title: 'Reminder: Session RSVP',
          body: `Please confirm attendance for "${session.title}".`,
          status: 'UNREAD',
          sourceType: 'group_session',
          sourceId: params.sessionId,
          deepLink: `/session/${params.sessionId}/rsvp`,
          metadataJson: {
            sessionId: params.sessionId,
          },
          createdAt: now,
          updatedAt: now,
        })),
      });
    }
    return {
      reminded: pending.length,
      dataVersion: null,
    };
  }
  async deleteSessionRsvpsForSession(
    params: GroupSessionRsvpAccessParams,
  ): Promise<SessionRsvpReminderResult> {
    if (shouldUseDbFixtureFallback()) {
      getPrismaClientOrThrow();
    }
    const sessions = await this.querySessions({
      sessionId: params.sessionId,
    });
    const session = sessions[0];
    if (!session) {
      throw notFound('Group session not found', {
        sessionId: params.sessionId,
      });
    }
    await this.assertSessionRsvpManageAccess(
      session,
      params.authUserId,
      params.isPrivilegedAdmin,
    );
    const prisma = getPrismaClientOrThrow();
    const result = await prisma.sessionRsvp.updateMany({
      where: {
        groupSessionId: params.sessionId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
        deletedByUserId: params.authUserId,
        updatedByUserId: params.authUserId,
      },
    });
    return {
      reminded: result.count,
      dataVersion: null,
    };
  }
  async findSessionById(sessionId: string): Promise<AppGroupSession | null> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.findSessionById(sessionId);
    }
    const sessions = await this.querySessions({
      sessionId,
    });
    return sessions[0] ? this.mapPrismaSession(sessions[0]) : null;
  }
}
const seedRepository = new StoreGroupSessionRepository(() => getMarketplaceSeedStore());
const prismaRepository = new PrismaGroupSessionRepository();
export function resolveGroupSessionRepository(): GroupSessionRepository {
  return getApiDataBackend() === 'db' ? prismaRepository : seedRepository;
}
