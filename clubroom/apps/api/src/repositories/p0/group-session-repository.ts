import crypto from 'node:crypto';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { badRequest, forbidden, notFound } from '../../lib/http-errors.js';
import {
  applyBookingCancellationInvoiceEffects,
  applyBookingCancellationInvoiceEffectsInDbTransaction,
  generateInvoiceForBooking,
} from '../../lib/invoice-runtime.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { createBookingInSeedTables, type SeedTables } from './booking-repository.js';
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
  clubId?: string;
  title: string;
  description: string;
  sessionType: AppGroupSessionType;
  schedule: AppGroupSessionSchedule[];
  maxParticipants: number;
  currentParticipants: number;
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
  squadId?: string;
  isFree?: boolean;
  inviteType?: AppInviteType;
  registrationDeadline?: string;
}
export interface AppGroupRegistration {
  id: string;
  sessionId: string;
  athleteId: string;
  parentId: string;
  status: 'REGISTERED' | 'WAITLISTED' | 'CANCELLED' | 'ATTENDED' | 'NO_SHOW';
  registeredAt: string;
  paidAt?: string;
  attendedDates: string[];
  notes?: string;
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
}
export interface GroupSessionRegisterParams {
  authUserId: string;
  isPrivilegedAdmin: boolean;
  requestId: string;
  sessionId: string;
  athleteId: string;
  bookedByUserId: string;
  note: string;
}
export interface GroupSessionAttendanceParams {
  authUserId: string;
  isPrivilegedAdmin: boolean;
  registrationId: string;
  date: string;
  attended: boolean;
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
  dataVersion: string | null;
}
export interface GroupSessionRegisterResult {
  registration: AppGroupRegistration;
  booking: {
    id: string;
    status: string;
  } | null;
  sessionStatus: GroupSessionStatus;
  dataVersion: string | null;
}
export interface GroupSessionRegistrationResult {
  registration: AppGroupRegistration;
  dataVersion: string | null;
}
export interface GroupRegistrationListResult {
  registrations: AppGroupRegistration[];
  dataVersion: string | null;
}
export interface GroupSessionRepository {
  listVisibleSessions(params: GroupSessionListParams): Promise<GroupSessionListResult>;
  getVisibleSessionById(params: GroupSessionAccessParams): Promise<GroupSessionDetailResult>;
  createSession(params: GroupSessionCreateParams): Promise<GroupSessionActionResult>;
  publishSession(params: GroupSessionAccessParams): Promise<GroupSessionActionResult>;
  cancelSession(params: GroupSessionAccessParams): Promise<GroupSessionActionResult>;
  registerAthlete(params: GroupSessionRegisterParams): Promise<GroupSessionRegisterResult>;
  listSessionRoster(params: GroupSessionAccessParams): Promise<GroupSessionRosterResult>;
  cancelRegistration(
    params: GroupSessionRegistrationAccessParams,
  ): Promise<GroupSessionRegistrationResult>;
  markAttendance(params: GroupSessionAttendanceParams): Promise<GroupSessionRegistrationResult>;
  listRegistrationsForAthleteIds(
    params: GroupRegistrationListParams,
  ): Promise<GroupRegistrationListResult>;
  findSessionById(sessionId: string): Promise<AppGroupSession | null>;
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
  deletedAt: string | null;
  deletedByUserId: string | null;
  athlete?: PrismaAthleteRow | null;
}
interface PrismaAttendanceRow {
  id: string;
  groupSessionId: string | null;
  athleteId: string;
  status: string;
  notes: string | null;
  recordedAt: string;
}
interface PrismaSessionRow {
  id: string;
  coachUserId: string;
  clubId: string | null;
  squadId: string | null;
  title: string;
  description: string | null;
  sessionType: string;
  maxParticipants: number;
  currentParticipants: number;
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
  focusJson: unknown;
  equipmentJson: unknown;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  updatedByUserId: string;
  deletedAt: string | null;
  deletedByUserId: string | null;
  registrations: PrismaRegistrationRow[];
  attendanceRecords: PrismaAttendanceRow[];
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
function assertSessionOpenForRegistration(
  sessionId: string,
  status: string | undefined,
): GroupSessionStatus {
  const normalized = normalizeSessionStatus(status);
  if (normalized !== 'PUBLISHED' && normalized !== 'FULL') {
    throw badRequest('Group session is not open for registration', {
      sessionId,
      status: normalized,
    });
  }
  return normalized;
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
        return Boolean(mapped) ? [mapped] : [];
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
    ...(asString(session.clubId)
      ? {
          clubId: asString(session.clubId),
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
  return {
    id: asString(registration.id) ?? '',
    sessionId,
    athleteId,
    parentId: asString(registration.parentUserId) ?? athleteId,
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
function mapContext(context: StoreSessionContext): GroupSessionRosterResult {
  return {
    session: mapSessionRow(context.session),
    registrations: context.registrations.flatMap((row) =>
      asString(row.deletedAt) == null && asString(row.status)?.toUpperCase() !== 'CANCELLED'
        ? [mapRegistrationRow(row, context.attendanceRecords)]
        : [],
    ),
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
    },
  });
  return {
    id: booking.id,
    status: booking.status,
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
  return Array.from(sessions).toSorted((left, right) => {
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
    if (!params.isPrivilegedAdmin && params.body.coachId !== params.authUserId) {
      throw forbidden('coachId must match authenticated user');
    }
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
    session.status =
      currentParticipants >= maxParticipants && maxParticipants > 0 ? 'FULL' : 'PUBLISHED';
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
    const activeBookings = asRows(store.tables.bookings).filter(
      (row) =>
        asString(row.groupSessionId) === params.sessionId &&
        asString(row.deletedAt) == null &&
        asString(row.status)?.toUpperCase() !== 'CANCELLED',
    );
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
    assertSessionOpenForRegistration(params.sessionId, asString(session.status));
    const registrations = asRows(store.tables.groupSessionRegistrations);
    const activeRegistration = registrations.find(
      (row) =>
        asString(row.groupSessionId) === params.sessionId &&
        asString(row.athleteId) === params.athleteId &&
        asString(row.deletedAt) == null &&
        asString(row.status)?.toUpperCase() !== 'CANCELLED',
    );
    if (activeRegistration) {
      return {
        registration: mapRegistrationRow(
          activeRegistration,
          asRows(store.tables.attendanceRecords),
        ),
        booking: findLinkedSeedBooking(store.tables, params.sessionId, params.athleteId)
          ? {
              id:
                asString(
                  findLinkedSeedBooking(store.tables, params.sessionId, params.athleteId)?.id,
                ) ?? '',
              status: 'CONFIRMED',
            }
          : null,
        sessionStatus: normalizeSessionStatus(asString(session.status)),
        dataVersion: store.version,
      };
    }
    const currentParticipants = asNumber(session.currentParticipants) ?? 0;
    const maxParticipants = asNumber(session.maxParticipants) ?? 0;
    const waitlistEnabled = asBoolean(session.waitlistEnabled) ?? true;
    const isFull = maxParticipants > 0 && currentParticipants >= maxParticipants;
    if (isFull && !waitlistEnabled) {
      throw badRequest('Group session is full', {
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
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    };
    registrations.push(registration);
    let booking: {
      id: string;
      status: string;
    } | null = null;
    if (isFull) {
      session.waitlistCount = (asNumber(session.waitlistCount) ?? 0) + 1;
    } else {
      const updatedParticipants = currentParticipants + 1;
      session.currentParticipants = updatedParticipants;
      session.status =
        updatedParticipants >= maxParticipants && maxParticipants > 0 ? 'FULL' : 'PUBLISHED';
      booking = createSeedLinkedBooking({
        tables: store.tables,
        authUserId: params.authUserId,
        requestId: params.requestId,
        session,
        athleteId: params.athleteId,
        bookedByUserId: params.bookedByUserId,
        note: params.note,
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
    const mapped = mapContext(context);
    return {
      ...mapped,
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
    const booking =
      previousStatus === 'REGISTERED' ||
      previousStatus === 'ATTENDED' ||
      previousStatus === 'NO_SHOW'
        ? findLinkedSeedBooking(store.tables, sessionId, athleteId)
        : null;
    if (booking) {
      await applyBookingCancellationInvoiceEffects({
        bookingId: asString(booking.id) ?? '',
        actorUserId: params.authUserId,
        reason: 'Group session registration cancelled.',
      });
    }
    registration.status = 'CANCELLED';
    registration.updatedAt = now;
    registration.updatedByUserId = params.authUserId;
    registration.version = (asNumber(registration.version) ?? 1) + 1;
    if (
      previousStatus === 'REGISTERED' ||
      previousStatus === 'ATTENDED' ||
      previousStatus === 'NO_SHOW'
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
    session.status =
      (asNumber(session.currentParticipants) ?? 0) >= maxParticipants && maxParticipants > 0
        ? 'FULL'
        : 'PUBLISHED';
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
    if (params.attended) {
      if (matching.length === 0) {
        attendanceRecords.push({
          id: newId('att'),
          bookingId: null,
          groupSessionId: sessionId,
          athleteId,
          status: 'ATTENDED',
          notes: null,
          effortRating: null,
          focusAreasJson: [],
          recordedByUserId: params.authUserId,
          recordedAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }
      registration.status = 'ATTENDED';
    } else {
      for (const row of matching) {
        row.groupSessionId = null;
      }
      const remaining = attendanceRecords.some(
        (row) =>
          asString(row.groupSessionId) === sessionId &&
          asString(row.athleteId) === athleteId &&
          asString(row.status)?.toUpperCase() === 'ATTENDED',
      );
      registration.status = remaining ? 'ATTENDED' : 'REGISTERED';
    }
    registration.updatedAt = isoNow();
    registration.updatedByUserId = params.authUserId;
    registration.version = (asNumber(registration.version) ?? 1) + 1;
    return {
      registration: mapRegistrationRow(registration, attendanceRecords),
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
        },
      }),
    );
    return sessions;
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
          return Boolean(mapped) ? [mapped] : [];
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
  async listVisibleSessions(params: GroupSessionListParams): Promise<GroupSessionListResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.listVisibleSessions(params);
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
      return this.fallback.getVisibleSessionById(params);
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
    if (!params.isPrivilegedAdmin && params.body.coachId !== params.authUserId) {
      throw forbidden('coachId must match authenticated user');
    }
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
    const updated = normalizeForJson(
      await prisma.groupSession.update({
        where: {
          id: session.id,
        },
        data: {
          status:
            currentParticipants >= maxParticipants && maxParticipants > 0 ? 'FULL' : 'PUBLISHED',
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
  async cancelSession(params: GroupSessionAccessParams): Promise<GroupSessionActionResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.cancelSession(params);
    }
    await this.assertSessionWriteAccess(
      params.authUserId,
      params.isPrivilegedAdmin,
      params.sessionId,
    );
    const prisma = getPrismaClientOrThrow();
    const updated = normalizeForJson(
      await prisma.$transaction(async (tx) => {
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
        return tx.groupSession.update({
          where: {
            id: params.sessionId,
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
      }),
    ) as SeedRow;
    return {
      session: mapSessionRow(updated),
      dataVersion: null,
    };
  }
  async registerAthlete(params: GroupSessionRegisterParams): Promise<GroupSessionRegisterResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.registerAthlete(params);
    }
    await this.assertAthleteAccess(params.authUserId, params.athleteId, params.isPrivilegedAdmin);
    const prisma = getPrismaClientOrThrow();
    const session = await this.assertSessionWriteAccess(params.authUserId, true, params.sessionId);
    assertSessionOpenForRegistration(params.sessionId, session.status);
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
          },
        }),
      );
      return {
        registration: this.mapPrismaRegistration(existing, attendanceRecords),
        booking: linkedBooking,
        sessionStatus: 'PUBLISHED',
        dataVersion: null,
      };
    }
    const currentParticipants = session.currentParticipants;
    const maxParticipants = session.maxParticipants;
    const isFull = maxParticipants > 0 && currentParticipants >= maxParticipants;
    if (isFull && !session.waitlistEnabled) {
      throw badRequest('Group session is full', {
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
        },
      });
      let booking: {
        id: string;
        status: string;
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
            status:
              currentParticipants + 1 >= maxParticipants && maxParticipants > 0
                ? 'FULL'
                : 'PUBLISHED',
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
            coachUserId: session.coachUserId,
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
        };
      }
      return {
        registration: normalizeAs<PrismaRegistrationRow>(registration),
        booking,
      };
    });
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
      return this.fallback.listSessionRoster(params);
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
      registrations: session.registrations.flatMap((row) =>
        row.status !== 'CANCELLED'
          ? [this.mapPrismaRegistration(row, session.attendanceRecords)]
          : [],
      ),
      dataVersion: null,
    };
  }
  async cancelRegistration(
    params: GroupSessionRegistrationAccessParams,
  ): Promise<GroupSessionRegistrationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.cancelRegistration(params);
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
    const promotedBookingIds = await prisma.$transaction(async (tx) => {
      const createdPromotedBookingIds: string[] = [];
      let linkedBookingId: string | null = null;
      if (
        previousStatus === 'REGISTERED' ||
        previousStatus === 'ATTENDED' ||
        previousStatus === 'NO_SHOW'
      ) {
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
          },
        });
        linkedBookingId = booking?.id ?? null;
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
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
      });
      if (
        previousStatus === 'REGISTERED' ||
        previousStatus === 'ATTENDED' ||
        previousStatus === 'NO_SHOW'
      ) {
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
              fromStatus: 'CONFIRMED',
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
    });
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
      return this.fallback.markAttendance(params);
    }
    const prisma = getPrismaClientOrThrow();
    const registration = normalizeAs<
      | (PrismaRegistrationRow & {
          groupSession: PrismaSessionRow;
        })
      | null
    >(
      await prisma.groupSessionRegistration.findFirst({
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
    if (!params.isPrivilegedAdmin && registration.groupSession.coachUserId !== params.authUserId) {
      throw forbidden('Group session does not belong to authenticated user', {
        registrationId: params.registrationId,
      });
    }
    const targetDate = params.date;
    await prisma.$transaction(async (tx) => {
      const existing = await tx.attendanceRecord.findMany({
        where: {
          groupSessionId: registration.groupSessionId,
          athleteId: registration.athleteId,
        },
      });
      const matching = existing.filter(
        (row) => parseIsoDatePart(row.recordedAt.toISOString()) === targetDate,
      );
      if (params.attended) {
        if (matching.length === 0) {
          await tx.attendanceRecord.create({
            data: {
              id: newId('att'),
              bookingId: null,
              groupSessionId: registration.groupSessionId,
              athleteId: registration.athleteId,
              status: 'ATTENDED',
              notes: null,
              effortRating: null,
              focusAreasJson: [],
              recordedByUserId: params.authUserId,
              recordedAt: new Date(`${targetDate}T12:00:00.000Z`),
            },
          });
        }
        await tx.groupSessionRegistration.update({
          where: {
            id: registration.id,
          },
          data: {
            status: 'ATTENDED',
            updatedByUserId: params.authUserId,
            version: {
              increment: 1,
            },
          },
        });
      } else {
        if (matching.length > 0) {
          await tx.attendanceRecord.deleteMany({
            where: {
              id: {
                in: matching.map((row) => row.id),
              },
            },
          });
        }
        const remaining = await tx.attendanceRecord.count({
          where: {
            groupSessionId: registration.groupSessionId,
            athleteId: registration.athleteId,
            status: 'ATTENDED',
          },
        });
        await tx.groupSessionRegistration.update({
          where: {
            id: registration.id,
          },
          data: {
            status: remaining > 0 ? 'ATTENDED' : 'REGISTERED',
            updatedByUserId: params.authUserId,
            version: {
              increment: 1,
            },
          },
        });
      }
    });
    const refreshed = normalizeAs<PrismaRegistrationRow | null>(
      await prisma.groupSessionRegistration.findUnique({
        where: {
          id: registration.id,
        },
      }),
    );
    const attendanceRecords = normalizeAs<PrismaAttendanceRow[]>(
      await prisma.attendanceRecord.findMany({
        where: {
          groupSessionId: registration.groupSessionId,
          athleteId: registration.athleteId,
        },
      }),
    );
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
  async listRegistrationsForAthleteIds(
    params: GroupRegistrationListParams,
  ): Promise<GroupRegistrationListResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.listRegistrationsForAthleteIds(params);
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
