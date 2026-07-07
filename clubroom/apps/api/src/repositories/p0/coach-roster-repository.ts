import crypto from "node:crypto";
import { getApiDataBackend } from "../../lib/data-backend.js";
import { getDbFixtureStore } from "../../lib/db-fixture-store.js";
import { badRequest, notFound } from "../../lib/http-errors.js";
import { getMarketplaceSeedStore } from "../../lib/marketplace-seed-store.js";
import {
  getPrismaClientOrThrow,
  shouldUseDbFixtureFallback,
} from "../../lib/prisma-runtime.js";
import { normalizeForJson } from "./normalize.js";

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const FOOTBALL_OBJECTIVES = new Set([
  "Dribbling",
  "Passing",
  "Defending",
  "Finishing",
  "Goalkeeping",
  "Conditioning",
]);

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? value as SeedRow[] : []);
const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" ? value : undefined;
const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;
const asObject = (value: unknown): SeedRow =>
  value && typeof value === "object" && !Array.isArray(value) ? value as SeedRow : {};
const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const nowIso = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

const ROSTER_STATUSES = new Set(["ACTIVE", "PAUSED", "GRADUATED", "INACTIVE"]);
const NOTIFICATION_PREFERENCES = new Set(["ALL", "IMPORTANT", "NONE"]);
const REMOVAL_REASONS = new Set(["GRADUATED", "MOVED", "INACTIVE", "OTHER"]);

type RosterStatus = CoachRosterEntryDto["status"];
type NotificationPreference = CoachRosterEntryDto["notificationPreference"];
type RemovalReason = "GRADUATED" | "MOVED" | "INACTIVE" | "OTHER";

export interface CoachRosterNoteDto {
  id: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CoachRosterEntryDto {
  id: string;
  coachId: string;
  athleteId: string;
  athleteName?: string;
  parentId: string;
  parentName?: string;
  status: "ACTIVE" | "PAUSED" | "GRADUATED" | "INACTIVE";
  startDate: string;
  lastSessionDate?: string;
  nextSessionDate?: string;
  totalSessions: number;
  totalRevenue: number;
  averageRating: number;
  notes: CoachRosterNoteDto[];
  tags: string[];
  primaryFocus?: string;
  notificationPreference: "ALL" | "IMPORTANT" | "NONE";
}

export interface CoachRosterResult {
  entries: CoachRosterEntryDto[];
  dataVersion: string | null;
}

export interface CoachRosterCreateInput {
  athleteId: string;
  status?: RosterStatus;
  tags?: string[];
  primaryFocus?: string | null;
  notificationPreference?: NotificationPreference;
}

export interface CoachRosterUpdateInput {
  status?: RosterStatus;
  tags?: string[];
  primaryFocus?: string | null;
  notificationPreference?: NotificationPreference;
}

export interface CoachRosterNoteInput {
  content: string;
}

export interface CoachRosterRemovalInput {
  reason: RemovalReason;
  customReason?: string;
  archived: boolean;
}

export interface CoachRosterRemovalDto {
  id: string;
  coachId: string;
  athleteId: string;
  reason: RemovalReason;
  customReason?: string;
  archived: boolean;
  removedAt: string;
  previousStatus: RosterStatus;
  totalSessions: number;
  totalRevenue: number;
  originalEntry?: CoachRosterEntryDto;
}

export interface CoachRosterRepository {
  list(coachUserId: string): Promise<CoachRosterResult>;
  get(coachUserId: string, athleteId: string): Promise<CoachRosterEntryDto | null>;
  create(
    coachUserId: string,
    actorUserId: string,
    input: CoachRosterCreateInput,
  ): Promise<CoachRosterEntryDto>;
  update(
    coachUserId: string,
    athleteId: string,
    actorUserId: string,
    input: CoachRosterUpdateInput,
  ): Promise<CoachRosterEntryDto>;
  createNote(
    coachUserId: string,
    athleteId: string,
    actorUserId: string,
    input: CoachRosterNoteInput,
  ): Promise<CoachRosterNoteDto>;
  updateNote(
    coachUserId: string,
    athleteId: string,
    noteId: string,
    actorUserId: string,
    input: CoachRosterNoteInput,
  ): Promise<CoachRosterNoteDto>;
  removeNote(
    coachUserId: string,
    athleteId: string,
    noteId: string,
    actorUserId: string,
  ): Promise<CoachRosterNoteDto>;
  remove(
    coachUserId: string,
    athleteId: string,
    actorUserId: string,
    input: CoachRosterRemovalInput,
  ): Promise<CoachRosterRemovalDto>;
  listRemovals(coachUserId: string): Promise<CoachRosterRemovalDto[]>;
  undoRemoval(
    coachUserId: string,
    removalId: string,
    actorUserId: string,
  ): Promise<CoachRosterEntryDto>;
}

function dateOnly(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

function displayName(row: SeedRow | undefined, fallback: string): string {
  return asString(row?.displayName) ?? asString(row?.name) ?? asString(row?.email) ?? fallback;
}

function firstSupportedObjective(values: string[]): string | undefined {
  return values.find((value) => FOOTBALL_OBJECTIVES.has(value));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function normalizeRosterStatus(value: unknown, fallback: RosterStatus = "ACTIVE"): RosterStatus {
  const status = asString(value)?.toUpperCase();
  return status && ROSTER_STATUSES.has(status) ? status as RosterStatus : fallback;
}

function normalizeNotificationPreference(
  value: unknown,
  fallback: NotificationPreference = "ALL",
): NotificationPreference {
  const preference = asString(value)?.toUpperCase();
  return preference && NOTIFICATION_PREFERENCES.has(preference)
    ? preference as NotificationPreference
    : fallback;
}

function normalizeRemovalReason(value: unknown): RemovalReason {
  const reason = asString(value)?.toUpperCase();
  return reason && REMOVAL_REASONS.has(reason) ? reason as RemovalReason : "OTHER";
}

function coachRosterOverlayRows(tables: SeedTables): SeedRow[] {
  if (!Array.isArray(tables.coachAthleteRosterEntries)) {
    tables.coachAthleteRosterEntries = [];
  }
  return asRows(tables.coachAthleteRosterEntries);
}

function sessionNoteRows(tables: SeedTables): SeedRow[] {
  if (!Array.isArray(tables.sessionNotes)) {
    tables.sessionNotes = [];
  }
  return asRows(tables.sessionNotes);
}

function coachRosterOverlayByAthleteId(tables: SeedTables, coachUserId: string): Map<string, SeedRow> {
  const overlays = new Map<string, SeedRow>();
  for (const row of asRows(tables.coachAthleteRosterEntries)) {
    if (asString(row.coachUserId) !== coachUserId) continue;
    const athleteId = asString(row.athleteId);
    if (!athleteId) continue;
    overlays.set(athleteId, row);
  }
  return overlays;
}

function isRemovedOverlay(row: SeedRow | undefined): boolean {
  return Boolean(asString(row?.deletedAt) || asString(row?.removedAt));
}

function buildRemovalRecord(
  row: SeedRow,
  originalEntry?: CoachRosterEntryDto,
): CoachRosterRemovalDto {
  const removedTotalRevenueMinor = asNumber(row.removedTotalRevenueMinor);
  return {
    id: asString(row.id) ?? "",
    coachId: asString(row.coachUserId) ?? "",
    athleteId: asString(row.athleteId) ?? "",
    reason: normalizeRemovalReason(row.removalReason),
    customReason: asString(row.customRemovalReason),
    archived: asBoolean(row.archived) ?? true,
    removedAt: asString(row.removedAt) ?? asString(row.deletedAt) ?? nowIso(),
    previousStatus: normalizeRosterStatus(row.status),
    totalSessions: asNumber(row.removedTotalSessions) ?? originalEntry?.totalSessions ?? 0,
    totalRevenue: removedTotalRevenueMinor != null
      ? Math.round(removedTotalRevenueMinor / 100)
      : originalEntry?.totalRevenue ?? 0,
    originalEntry: (asBoolean(row.archived) ?? true) ? originalEntry : undefined,
  };
}

function firstGuardianForAthlete(
  athleteId: string,
  participantGuardianIds: string[],
  guardianLinks: SeedRow[],
): string {
  const participantGuardianId = participantGuardianIds.find(Boolean);
  if (participantGuardianId) return participantGuardianId;

  const linkedGuardian = guardianLinks
    .filter((row) => asString(row.athleteId) === athleteId && !asString(row.deletedAt))
    .sort((left, right) => Number(Boolean(right.isPrimary)) - Number(Boolean(left.isPrimary)))[0];
  return asString(linkedGuardian?.guardianUserId) ?? "";
}

function noteContent(row: SeedRow): string | undefined {
  return asString(row.noteText) ?? asString(asObject(row.metadataJson).summary);
}

function noteSource(row: SeedRow): string | undefined {
  return asString(asObject(row.metadataJson).source);
}

function isMutableRosterNote(row: SeedRow): boolean {
  const source = noteSource(row);
  return !source || source === "roster-note";
}

function mapRosterNote(row: SeedRow): CoachRosterNoteDto {
  return {
    id: asString(row.id) ?? "",
    content: noteContent(row) ?? "",
    createdAt: asString(row.createdAt) ?? asString(row.updatedAt) ?? nowIso(),
    updatedAt: asString(row.updatedAt),
  };
}

function assertVisibleRosterEntry(entry: CoachRosterEntryDto | null, coachUserId: string, athleteId: string): void {
  if (!entry) {
    throw notFound("Roster entry not found", {
      coachUserId,
      athleteId,
    });
  }
}

function buildRosterFromTables(params: {
  tables: SeedTables;
  coachUserId: string;
  dataVersion: string | null;
}): CoachRosterResult {
  const now = Date.now();
  const bookings = asRows(params.tables.bookings).filter(
    (row) => asString(row.coachUserId) === params.coachUserId && !asString(row.deletedAt),
  );
  const bookingIds = new Set(bookings.map((row) => asString(row.id)).filter(Boolean) as string[]);
  const participants = asRows(params.tables.bookingParticipants).filter(
    (row) =>
      bookingIds.has(asString(row.bookingId) ?? "") &&
      !asString(row.deletedAt) &&
      asString(row.status)?.toUpperCase() !== "CANCELLED",
  );
  const athletesById = new Map(
    asRows(params.tables.athletes)
      .filter((row) => !asString(row.deletedAt))
      .map((row) => [asString(row.id) ?? "", row]),
  );
  const usersById = new Map(
    asRows(params.tables.users)
      .filter((row) => !asString(row.deletedAt))
      .map((row) => [asString(row.id) ?? "", row]),
  );
  const guardianLinks = asRows(params.tables.guardianChildLinks);
  const objectivesByBookingId = new Map<string, string[]>();
  for (const objective of asRows(params.tables.bookingObjectives)) {
    const bookingId = asString(objective.bookingId);
    const value = asString(objective.objective);
    if (!bookingId || !value) continue;
    objectivesByBookingId.set(bookingId, [...(objectivesByBookingId.get(bookingId) ?? []), value]);
  }

  const notesByAthleteId = new Map<string, CoachRosterNoteDto[]>();
  for (const note of asRows(params.tables.sessionNotes)) {
    if (asString(note.coachUserId) !== params.coachUserId || asString(note.deletedAt)) continue;
    const athleteId = asString(note.athleteId);
    const content = noteContent(note);
    if (!athleteId || !content) continue;
    const notes = notesByAthleteId.get(athleteId) ?? [];
    notes.push({
      id: asString(note.id) ?? `${athleteId}:${notes.length}`,
      content,
      createdAt: asString(note.createdAt) ?? asString(note.updatedAt) ?? new Date(0).toISOString(),
      updatedAt: asString(note.updatedAt),
    });
    notesByAthleteId.set(athleteId, notes);
  }
  for (const notes of notesByAthleteId.values()) {
    notes.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  }

  const feedbackByAthleteId = new Map<string, number[]>();
  for (const feedback of asRows(params.tables.sessionFeedback)) {
    if (asString(feedback.deletedAt)) continue;
    const athleteId = asString(feedback.athleteId);
    const bookingId = asString(feedback.bookingId);
    const rating = asNumber(feedback.rating);
    if (!athleteId || !bookingIds.has(bookingId ?? "") || rating == null) continue;
    feedbackByAthleteId.set(athleteId, [...(feedbackByAthleteId.get(athleteId) ?? []), rating]);
  }

  const bookingsById = new Map(bookings.map((booking) => [asString(booking.id) ?? "", booking]));
  const overlaysByAthleteId = coachRosterOverlayByAthleteId(
    params.tables,
    params.coachUserId,
  );
  const rowsByAthleteId = new Map<string, SeedRow[]>();
  for (const participant of participants) {
    const athleteId = asString(participant.athleteId);
    if (!athleteId || !athletesById.has(athleteId)) continue;
    rowsByAthleteId.set(athleteId, [...(rowsByAthleteId.get(athleteId) ?? []), participant]);
  }
  for (const [athleteId, overlay] of overlaysByAthleteId.entries()) {
    if (isRemovedOverlay(overlay) || !athletesById.has(athleteId) || rowsByAthleteId.has(athleteId)) {
      continue;
    }
    rowsByAthleteId.set(athleteId, []);
  }

  const entries = Array.from(rowsByAthleteId.entries()).flatMap(
    ([athleteId, athleteParticipants]): CoachRosterEntryDto[] => {
    const overlay = overlaysByAthleteId.get(athleteId);
    if (isRemovedOverlay(overlay)) {
      return [];
    }
    const athlete = athletesById.get(athleteId);
    const participantBookingRows = athleteParticipants
      .map((participant) => bookingsById.get(asString(participant.bookingId) ?? ""))
      .filter((row): row is SeedRow => Boolean(row));
    const datedBookings = participantBookingRows
      .map((booking) => ({
        booking,
        scheduledAt: Date.parse(asString(booking.scheduledAt) ?? ""),
      }))
      .filter((entry) => Number.isFinite(entry.scheduledAt))
      .sort((left, right) => left.scheduledAt - right.scheduledAt);
    const nonCancelled = datedBookings.filter(
      ({ booking }) => asString(booking.status)?.toUpperCase() !== "CANCELLED",
    );
    const completed = nonCancelled.filter(
      ({ booking }) => asString(booking.status)?.toUpperCase() === "COMPLETED",
    );
    const past = nonCancelled.filter(({ scheduledAt }) => scheduledAt <= now);
    const future = nonCancelled.filter(({ scheduledAt }) => scheduledAt > now);
    const guardianId = firstGuardianForAthlete(
      athleteId,
      athleteParticipants.map((row) => asString(row.guardianUserId) ?? ""),
      guardianLinks,
    );
    const objectiveValues = participantBookingRows.flatMap(
      (booking) => objectivesByBookingId.get(asString(booking.id) ?? "") ?? [],
    );
    const totalRevenueMinor = completed.reduce(
      (sum, { booking }) => sum + (asNumber(booking.priceMinor) ?? 0),
      0,
    );
    const derivedStatus: RosterStatus = nonCancelled.length > 0 ? "ACTIVE" : "INACTIVE";

    return [{
      id: asString(overlay?.id) ?? `roster_${params.coachUserId}_${athleteId}`,
      coachId: params.coachUserId,
      athleteId,
      athleteName: displayName(athlete, "Athlete"),
      parentId: guardianId,
      parentName: guardianId ? displayName(usersById.get(guardianId), "Guardian") : undefined,
      status: normalizeRosterStatus(overlay?.status, derivedStatus),
      startDate: dateOnly(asString(datedBookings[0]?.booking.scheduledAt))
        ?? dateOnly(asString(overlay?.createdAt))
        ?? "",
      lastSessionDate: dateOnly(asString(past[past.length - 1]?.booking.scheduledAt)),
      nextSessionDate: dateOnly(asString(future[0]?.booking.scheduledAt)),
      totalSessions: completed.length,
      totalRevenue: Math.round(totalRevenueMinor / 100),
      averageRating: average(feedbackByAthleteId.get(athleteId) ?? []),
      notes: notesByAthleteId.get(athleteId) ?? [],
      tags: asStringArray(overlay?.tags),
      primaryFocus: asString(overlay?.primaryFocus) ?? firstSupportedObjective(objectiveValues),
      notificationPreference: normalizeNotificationPreference(overlay?.notificationPreference),
    } satisfies CoachRosterEntryDto];
  });

  entries.sort((left, right) => {
    if (left.nextSessionDate && !right.nextSessionDate) return -1;
    if (!left.nextSessionDate && right.nextSessionDate) return 1;
    return (left.athleteName ?? "").localeCompare(right.athleteName ?? "");
  });

  return {
    entries,
    dataVersion: params.dataVersion,
  };
}

class StoreCoachRosterRepository implements CoachRosterRepository {
  constructor(private readonly loadStore: () => { version: string | null; tables: SeedTables }) {}

  async list(coachUserId: string): Promise<CoachRosterResult> {
    const store = this.loadStore();
    return buildRosterFromTables({
      tables: store.tables,
      coachUserId,
      dataVersion: store.version,
    });
  }

  async get(coachUserId: string, athleteId: string): Promise<CoachRosterEntryDto | null> {
    const result = await this.list(coachUserId);
    return result.entries.find((entry) => entry.athleteId === athleteId) ?? null;
  }

  async create(
    coachUserId: string,
    actorUserId: string,
    input: CoachRosterCreateInput,
  ): Promise<CoachRosterEntryDto> {
    const existing = await this.get(coachUserId, input.athleteId);
    if (existing) {
      return this.update(coachUserId, input.athleteId, actorUserId, input);
    }

    const store = this.loadStore();
    const athlete = asRows(store.tables.athletes).find(
      (row) => asString(row.id) === input.athleteId && !asString(row.deletedAt),
    );
    if (!athlete) {
      throw notFound("Athlete not found", {
        athleteId: input.athleteId,
      });
    }

    const now = nowIso();
    const rows = coachRosterOverlayRows(store.tables);
    let row = rows.find(
      (candidate) =>
        asString(candidate.coachUserId) === coachUserId &&
        asString(candidate.athleteId) === input.athleteId,
    );
    if (!row) {
      row = {
        id: newId("car"),
        coachUserId,
        athleteId: input.athleteId,
        createdByUserId: actorUserId,
        createdAt: now,
        version: 0,
      };
      rows.push(row);
    }

    const wasRemoved = isRemovedOverlay(row);
    row.status = normalizeRosterStatus(input.status, "ACTIVE");
    row.tags = input.tags ?? [];
    row.primaryFocus = input.primaryFocus ?? undefined;
    row.notificationPreference = normalizeNotificationPreference(input.notificationPreference);
    row.removalReason = undefined;
    row.customRemovalReason = undefined;
    row.archived = true;
    row.removedAt = undefined;
    row.restoredAt = wasRemoved ? now : row.restoredAt;
    row.deletedAt = undefined;
    row.deletedByUserId = undefined;
    row.updatedByUserId = actorUserId;
    row.updatedAt = now;
    row.version = (asNumber(row.version) ?? 0) + 1;

    const created = await this.get(coachUserId, input.athleteId);
    if (!created) {
      throw notFound("Roster entry not found", {
        coachUserId,
        athleteId: input.athleteId,
      });
    }
    return created;
  }

  async update(
    coachUserId: string,
    athleteId: string,
    actorUserId: string,
    input: CoachRosterUpdateInput,
  ): Promise<CoachRosterEntryDto> {
    const current = await this.get(coachUserId, athleteId);
    if (!current) {
      throw notFound("Roster entry not found", {
        coachUserId,
        athleteId,
      });
    }

    const store = this.loadStore();
    const rows = coachRosterOverlayRows(store.tables);
    const now = nowIso();
    let row = rows.find(
      (candidate) =>
        asString(candidate.coachUserId) === coachUserId &&
        asString(candidate.athleteId) === athleteId,
    );
    if (!row) {
      row = {
        id: newId("car"),
        coachUserId,
        athleteId,
        createdByUserId: actorUserId,
        createdAt: now,
        version: 0,
      };
      rows.push(row);
    }

    row.status = normalizeRosterStatus(input.status, current.status);
    row.tags = input.tags ?? current.tags;
    row.primaryFocus = input.primaryFocus === undefined
      ? current.primaryFocus
      : input.primaryFocus ?? undefined;
    row.notificationPreference = normalizeNotificationPreference(
      input.notificationPreference,
      current.notificationPreference,
    );
    row.removalReason = undefined;
    row.customRemovalReason = undefined;
    row.archived = true;
    row.removedAt = undefined;
    row.restoredAt = isRemovedOverlay(row) ? now : row.restoredAt;
    row.deletedAt = undefined;
    row.deletedByUserId = undefined;
    row.updatedByUserId = actorUserId;
    row.updatedAt = now;
    row.version = (asNumber(row.version) ?? 0) + 1;

    const updated = await this.get(coachUserId, athleteId);
    if (!updated) {
      throw notFound("Roster entry not found", {
        coachUserId,
        athleteId,
      });
    }
    return updated;
  }

  async createNote(
    coachUserId: string,
    athleteId: string,
    actorUserId: string,
    input: CoachRosterNoteInput,
  ): Promise<CoachRosterNoteDto> {
    const current = await this.get(coachUserId, athleteId);
    assertVisibleRosterEntry(current, coachUserId, athleteId);

    const store = this.loadStore();
    const now = nowIso();
    const row: SeedRow = {
      id: newId("snt"),
      bookingId: null,
      groupSessionId: null,
      athleteId,
      coachUserId,
      visibility: "PRIVATE",
      noteText: input.content,
      privateNotesEncrypted: null,
      metadataJson: {
        source: "roster-note",
      },
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    };
    sessionNoteRows(store.tables).push(row);
    return mapRosterNote(row);
  }

  async updateNote(
    coachUserId: string,
    athleteId: string,
    noteId: string,
    actorUserId: string,
    input: CoachRosterNoteInput,
  ): Promise<CoachRosterNoteDto> {
    const current = await this.get(coachUserId, athleteId);
    assertVisibleRosterEntry(current, coachUserId, athleteId);

    const row = sessionNoteRows(this.loadStore().tables).find(
      (candidate) =>
        asString(candidate.id) === noteId &&
        asString(candidate.coachUserId) === coachUserId &&
        asString(candidate.athleteId) === athleteId &&
        !asString(candidate.deletedAt) &&
        isMutableRosterNote(candidate),
    );
    if (!row) {
      throw notFound("Roster note not found", {
        coachUserId,
        athleteId,
        noteId,
      });
    }

    row.noteText = input.content;
    row.metadataJson = {
      ...asObject(row.metadataJson),
      source: "roster-note",
    };
    row.updatedByUserId = actorUserId;
    row.updatedAt = nowIso();
    row.version = (asNumber(row.version) ?? 1) + 1;
    return mapRosterNote(row);
  }

  async removeNote(
    coachUserId: string,
    athleteId: string,
    noteId: string,
    actorUserId: string,
  ): Promise<CoachRosterNoteDto> {
    const current = await this.get(coachUserId, athleteId);
    assertVisibleRosterEntry(current, coachUserId, athleteId);

    const row = sessionNoteRows(this.loadStore().tables).find(
      (candidate) =>
        asString(candidate.id) === noteId &&
        asString(candidate.coachUserId) === coachUserId &&
        asString(candidate.athleteId) === athleteId &&
        !asString(candidate.deletedAt) &&
        isMutableRosterNote(candidate),
    );
    if (!row) {
      throw notFound("Roster note not found", {
        coachUserId,
        athleteId,
        noteId,
      });
    }

    row.deletedAt = nowIso();
    row.deletedByUserId = actorUserId;
    row.updatedByUserId = actorUserId;
    row.updatedAt = row.deletedAt;
    row.version = (asNumber(row.version) ?? 1) + 1;
    return mapRosterNote(row);
  }

  async remove(
    coachUserId: string,
    athleteId: string,
    actorUserId: string,
    input: CoachRosterRemovalInput,
  ): Promise<CoachRosterRemovalDto> {
    const current = await this.get(coachUserId, athleteId);
    if (!current) {
      throw notFound("Roster entry not found", {
        coachUserId,
        athleteId,
      });
    }

    const store = this.loadStore();
    const rows = coachRosterOverlayRows(store.tables);
    const now = nowIso();
    let row = rows.find(
      (candidate) =>
        asString(candidate.coachUserId) === coachUserId &&
        asString(candidate.athleteId) === athleteId,
    );
    if (!row) {
      row = {
        id: newId("car"),
        coachUserId,
        athleteId,
        createdByUserId: actorUserId,
        createdAt: now,
        version: 0,
      };
      rows.push(row);
    }

    row.status = current.status;
    row.tags = current.tags;
    row.primaryFocus = current.primaryFocus;
    row.notificationPreference = current.notificationPreference;
    row.removalReason = input.reason;
    row.customRemovalReason = input.customReason;
    row.archived = input.archived;
    row.removedTotalSessions = current.totalSessions;
    row.removedTotalRevenueMinor = Math.round(current.totalRevenue * 100);
    row.removedAt = now;
    row.deletedAt = now;
    row.deletedByUserId = actorUserId;
    row.updatedByUserId = actorUserId;
    row.updatedAt = now;
    row.version = (asNumber(row.version) ?? 0) + 1;

    return buildRemovalRecord(row, input.archived ? current : undefined);
  }

  async listRemovals(coachUserId: string): Promise<CoachRosterRemovalDto[]> {
    const store = this.loadStore();
    return coachRosterOverlayRows(store.tables)
      .filter((row) => asString(row.coachUserId) === coachUserId && isRemovedOverlay(row))
      .map((row) => buildRemovalRecord(row))
      .sort((left, right) => Date.parse(right.removedAt) - Date.parse(left.removedAt));
  }

  async undoRemoval(
    coachUserId: string,
    removalId: string,
    actorUserId: string,
  ): Promise<CoachRosterEntryDto> {
    const store = this.loadStore();
    const row = coachRosterOverlayRows(store.tables).find(
      (candidate) =>
        asString(candidate.coachUserId) === coachUserId &&
        asString(candidate.id) === removalId &&
        isRemovedOverlay(candidate),
    );
    if (!row) {
      throw notFound("Roster removal not found", {
        coachUserId,
        removalId,
      });
    }
    if ((asBoolean(row.archived) ?? true) === false) {
      throw badRequest("Cannot restore - removal did not keep a restore snapshot", {
        coachUserId,
        removalId,
      });
    }

    const now = nowIso();
    row.removalReason = undefined;
    row.customRemovalReason = undefined;
    row.removedAt = undefined;
    row.deletedAt = undefined;
    row.deletedByUserId = undefined;
    row.restoredAt = now;
    row.updatedByUserId = actorUserId;
    row.updatedAt = now;
    row.version = (asNumber(row.version) ?? 0) + 1;

    const athleteId = asString(row.athleteId) ?? "";
    const entry = await this.get(coachUserId, athleteId);
    if (!entry) {
      throw notFound("Roster entry not found", {
        coachUserId,
        athleteId,
      });
    }
    return entry;
  }
}

class DbCoachRosterRepository implements CoachRosterRepository {
  private readonly fallback = new StoreCoachRosterRepository(() => getDbFixtureStore());

  async list(coachUserId: string): Promise<CoachRosterResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.list(coachUserId);
    }

    const prisma = getPrismaClientOrThrow();
    const bookings = await prisma.booking.findMany({
      where: {
        coachUserId,
        deletedAt: null,
        participants: {
          some: {
            deletedAt: null,
          },
        },
      },
      include: {
        objectives: true,
        participants: {
          where: {
            deletedAt: null,
          },
          include: {
            athlete: true,
          },
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
    });
    const bookingAthleteIds = Array.from(
      new Set(bookings.flatMap((booking) => booking.participants.map((row) => row.athleteId))),
    );
    const rosterEntries = await prisma.coachAthleteRosterEntry.findMany({
      where: {
        coachUserId,
      },
    });
    const athleteIds = Array.from(
      new Set([...bookingAthleteIds, ...rosterEntries.map((row) => row.athleteId)]),
    );
    const guardianIdsFromParticipants = bookings.flatMap((booking) =>
      booking.participants.flatMap((row) => row.guardianUserId ? [row.guardianUserId] : []),
    );
    const [guardianLinks, users, feedbackRows, noteRows, athleteRows] = await Promise.all([
      prisma.guardianChildLink.findMany({
        where: {
          athleteId: {
            in: athleteIds,
          },
          deletedAt: null,
        },
      }),
      prisma.user.findMany({
        where: {
          id: {
            in: guardianIdsFromParticipants,
          },
          deletedAt: null,
        },
      }),
      prisma.sessionFeedback.findMany({
        where: {
          athleteId: {
            in: bookingAthleteIds,
          },
          bookingId: {
            in: bookings.map((booking) => booking.id),
          },
          deletedAt: null,
          rating: {
            not: null,
          },
        },
      }),
      prisma.sessionNote.findMany({
        where: {
          coachUserId,
          athleteId: {
            in: athleteIds,
          },
          deletedAt: null,
        },
      }),
      prisma.athlete.findMany({
        where: {
          id: {
            in: athleteIds,
          },
          deletedAt: null,
        },
      }),
    ]);
    const linkGuardianIds = guardianLinks.flatMap((row) =>
      row.guardianUserId && !guardianIdsFromParticipants.includes(row.guardianUserId)
        ? [row.guardianUserId]
        : [],
    );
    const extraUsers = linkGuardianIds.length > 0
      ? await prisma.user.findMany({
          where: {
            id: {
              in: linkGuardianIds,
            },
            deletedAt: null,
          },
        })
      : [];

    const tables: SeedTables = {
      bookings: bookings.map((row) => normalizeForJson(row) as SeedRow),
      bookingParticipants: bookings.flatMap((booking) =>
        booking.participants.map((row) => normalizeForJson(row) as SeedRow),
      ),
      bookingObjectives: bookings.flatMap((booking) =>
        booking.objectives.map((row) => normalizeForJson(row) as SeedRow),
      ),
      athletes: athleteRows.map((row) => normalizeForJson(row) as SeedRow),
      guardianChildLinks: guardianLinks.map((row) => normalizeForJson(row) as SeedRow),
      users: [...users, ...extraUsers].map((row) => normalizeForJson(row) as SeedRow),
      sessionNotes: noteRows.map((row) => normalizeForJson(row) as SeedRow),
      sessionFeedback: feedbackRows.map((row) => normalizeForJson(row) as SeedRow),
      coachAthleteRosterEntries: rosterEntries.map((row) => normalizeForJson(row) as SeedRow),
    };

    return buildRosterFromTables({
      tables,
      coachUserId,
      dataVersion: null,
    });
  }

  async get(coachUserId: string, athleteId: string): Promise<CoachRosterEntryDto | null> {
    const result = await this.list(coachUserId);
    return result.entries.find((entry) => entry.athleteId === athleteId) ?? null;
  }

  async create(
    coachUserId: string,
    actorUserId: string,
    input: CoachRosterCreateInput,
  ): Promise<CoachRosterEntryDto> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.create(coachUserId, actorUserId, input);
    }

    const current = await this.get(coachUserId, input.athleteId);
    if (current) {
      return this.update(coachUserId, input.athleteId, actorUserId, input);
    }

    const prisma = getPrismaClientOrThrow();
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: input.athleteId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
    if (!athlete) {
      throw notFound("Athlete not found", {
        athleteId: input.athleteId,
      });
    }

    await prisma.coachAthleteRosterEntry.upsert({
      where: {
        coachUserId_athleteId: {
          coachUserId,
          athleteId: input.athleteId,
        },
      },
      create: {
        id: newId("car"),
        coachUserId,
        athleteId: input.athleteId,
        status: normalizeRosterStatus(input.status, "ACTIVE"),
        tags: input.tags ?? [],
        primaryFocus: input.primaryFocus ?? null,
        notificationPreference: normalizeNotificationPreference(input.notificationPreference),
        archived: true,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      },
      update: {
        status: normalizeRosterStatus(input.status, "ACTIVE"),
        tags: input.tags ?? [],
        primaryFocus: input.primaryFocus ?? null,
        notificationPreference: normalizeNotificationPreference(input.notificationPreference),
        removalReason: null,
        customRemovalReason: null,
        archived: true,
        removedAt: null,
        restoredAt: new Date(),
        deletedAt: null,
        deletedByUserId: null,
        updatedByUserId: actorUserId,
        version: {
          increment: 1,
        },
      },
    });

    const created = await this.get(coachUserId, input.athleteId);
    if (!created) {
      throw notFound("Roster entry not found", {
        coachUserId,
        athleteId: input.athleteId,
      });
    }
    return created;
  }

  async update(
    coachUserId: string,
    athleteId: string,
    actorUserId: string,
    input: CoachRosterUpdateInput,
  ): Promise<CoachRosterEntryDto> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.update(coachUserId, athleteId, actorUserId, input);
    }

    const current = await this.get(coachUserId, athleteId);
    if (!current) {
      throw notFound("Roster entry not found", {
        coachUserId,
        athleteId,
      });
    }

    const prisma = getPrismaClientOrThrow();
    await prisma.coachAthleteRosterEntry.upsert({
      where: {
        coachUserId_athleteId: {
          coachUserId,
          athleteId,
        },
      },
      create: {
        id: newId("car"),
        coachUserId,
        athleteId,
        status: normalizeRosterStatus(input.status, current.status),
        tags: input.tags ?? current.tags,
        primaryFocus: input.primaryFocus === undefined
          ? current.primaryFocus ?? null
          : input.primaryFocus,
        notificationPreference: normalizeNotificationPreference(
          input.notificationPreference,
          current.notificationPreference,
        ),
        archived: true,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      },
      update: {
        status: normalizeRosterStatus(input.status, current.status),
        tags: input.tags ?? current.tags,
        primaryFocus: input.primaryFocus === undefined
          ? current.primaryFocus ?? null
          : input.primaryFocus,
        notificationPreference: normalizeNotificationPreference(
          input.notificationPreference,
          current.notificationPreference,
        ),
        removalReason: null,
        customRemovalReason: null,
        archived: true,
        removedAt: null,
        restoredAt: null,
        deletedAt: null,
        deletedByUserId: null,
        updatedByUserId: actorUserId,
        version: {
          increment: 1,
        },
      },
    });

    const updated = await this.get(coachUserId, athleteId);
    if (!updated) {
      throw notFound("Roster entry not found", {
        coachUserId,
        athleteId,
      });
    }
    return updated;
  }

  async createNote(
    coachUserId: string,
    athleteId: string,
    actorUserId: string,
    input: CoachRosterNoteInput,
  ): Promise<CoachRosterNoteDto> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.createNote(coachUserId, athleteId, actorUserId, input);
    }

    const current = await this.get(coachUserId, athleteId);
    assertVisibleRosterEntry(current, coachUserId, athleteId);

    const prisma = getPrismaClientOrThrow();
    const created = await prisma.sessionNote.create({
      data: {
        id: newId("snt"),
        bookingId: null,
        groupSessionId: null,
        athleteId,
        coachUserId,
        visibility: "PRIVATE",
        noteText: input.content,
        privateNotesEncrypted: null,
        metadataJson: {
          source: "roster-note",
        },
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      },
    });
    return mapRosterNote(normalizeForJson(created) as SeedRow);
  }

  async updateNote(
    coachUserId: string,
    athleteId: string,
    noteId: string,
    actorUserId: string,
    input: CoachRosterNoteInput,
  ): Promise<CoachRosterNoteDto> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.updateNote(coachUserId, athleteId, noteId, actorUserId, input);
    }

    const current = await this.get(coachUserId, athleteId);
    assertVisibleRosterEntry(current, coachUserId, athleteId);

    const prisma = getPrismaClientOrThrow();
    const existing = await prisma.sessionNote.findFirst({
      where: {
        id: noteId,
        coachUserId,
        athleteId,
        deletedAt: null,
      },
    });
    const existingRow = existing ? normalizeForJson(existing) as SeedRow : null;
    if (!existingRow || !isMutableRosterNote(existingRow)) {
      throw notFound("Roster note not found", {
        coachUserId,
        athleteId,
        noteId,
      });
    }

    const updated = await prisma.sessionNote.update({
      where: {
        id: noteId,
      },
      data: {
        noteText: input.content,
        metadataJson: {
          ...asObject(existingRow.metadataJson),
          source: "roster-note",
        },
        updatedByUserId: actorUserId,
        version: {
          increment: 1,
        },
      },
    });
    return mapRosterNote(normalizeForJson(updated) as SeedRow);
  }

  async removeNote(
    coachUserId: string,
    athleteId: string,
    noteId: string,
    actorUserId: string,
  ): Promise<CoachRosterNoteDto> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.removeNote(coachUserId, athleteId, noteId, actorUserId);
    }

    const current = await this.get(coachUserId, athleteId);
    assertVisibleRosterEntry(current, coachUserId, athleteId);

    const prisma = getPrismaClientOrThrow();
    const existing = await prisma.sessionNote.findFirst({
      where: {
        id: noteId,
        coachUserId,
        athleteId,
        deletedAt: null,
      },
    });
    const existingRow = existing ? normalizeForJson(existing) as SeedRow : null;
    if (!existingRow || !isMutableRosterNote(existingRow)) {
      throw notFound("Roster note not found", {
        coachUserId,
        athleteId,
        noteId,
      });
    }

    const removed = await prisma.sessionNote.update({
      where: {
        id: noteId,
      },
      data: {
        deletedAt: new Date(),
        deletedByUserId: actorUserId,
        updatedByUserId: actorUserId,
        version: {
          increment: 1,
        },
      },
    });
    return mapRosterNote(normalizeForJson(removed) as SeedRow);
  }

  async remove(
    coachUserId: string,
    athleteId: string,
    actorUserId: string,
    input: CoachRosterRemovalInput,
  ): Promise<CoachRosterRemovalDto> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.remove(coachUserId, athleteId, actorUserId, input);
    }

    const current = await this.get(coachUserId, athleteId);
    if (!current) {
      throw notFound("Roster entry not found", {
        coachUserId,
        athleteId,
      });
    }

    const prisma = getPrismaClientOrThrow();
    const removedAt = new Date();
    const row = await prisma.coachAthleteRosterEntry.upsert({
      where: {
        coachUserId_athleteId: {
          coachUserId,
          athleteId,
        },
      },
      create: {
        id: newId("car"),
        coachUserId,
        athleteId,
        status: current.status,
        tags: current.tags,
        primaryFocus: current.primaryFocus ?? null,
        notificationPreference: current.notificationPreference,
        removalReason: input.reason,
        customRemovalReason: input.customReason ?? null,
        archived: input.archived,
        removedTotalSessions: current.totalSessions,
        removedTotalRevenueMinor: Math.round(current.totalRevenue * 100),
        removedAt,
        deletedAt: removedAt,
        deletedByUserId: actorUserId,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      },
      update: {
        status: current.status,
        tags: current.tags,
        primaryFocus: current.primaryFocus ?? null,
        notificationPreference: current.notificationPreference,
        removalReason: input.reason,
        customRemovalReason: input.customReason ?? null,
        archived: input.archived,
        removedTotalSessions: current.totalSessions,
        removedTotalRevenueMinor: Math.round(current.totalRevenue * 100),
        removedAt,
        deletedAt: removedAt,
        deletedByUserId: actorUserId,
        updatedByUserId: actorUserId,
        version: {
          increment: 1,
        },
      },
    });

    return buildRemovalRecord(normalizeForJson(row) as SeedRow, input.archived ? current : undefined);
  }

  async listRemovals(coachUserId: string): Promise<CoachRosterRemovalDto[]> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.listRemovals(coachUserId);
    }

    const prisma = getPrismaClientOrThrow();
    const rows = await prisma.coachAthleteRosterEntry.findMany({
      where: {
        coachUserId,
        OR: [
          {
            removedAt: {
              not: null,
            },
          },
          {
            deletedAt: {
              not: null,
            },
          },
        ],
      },
      orderBy: [
        {
          removedAt: "desc",
        },
        {
          updatedAt: "desc",
        },
      ],
    });
    return rows.map((row) => buildRemovalRecord(normalizeForJson(row) as SeedRow));
  }

  async undoRemoval(
    coachUserId: string,
    removalId: string,
    actorUserId: string,
  ): Promise<CoachRosterEntryDto> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.undoRemoval(coachUserId, removalId, actorUserId);
    }

    const prisma = getPrismaClientOrThrow();
    const existing = await prisma.coachAthleteRosterEntry.findFirst({
      where: {
        id: removalId,
        coachUserId,
        OR: [
          {
            removedAt: {
              not: null,
            },
          },
          {
            deletedAt: {
              not: null,
            },
          },
        ],
      },
    });
    if (!existing) {
      throw notFound("Roster removal not found", {
        coachUserId,
        removalId,
      });
    }
    if (!existing.archived) {
      throw badRequest("Cannot restore - removal did not keep a restore snapshot", {
        coachUserId,
        removalId,
      });
    }

    const updated = await prisma.coachAthleteRosterEntry.update({
      where: {
        id: existing.id,
      },
      data: {
        removalReason: null,
        customRemovalReason: null,
        removedAt: null,
        restoredAt: new Date(),
        deletedAt: null,
        deletedByUserId: null,
        updatedByUserId: actorUserId,
        version: {
          increment: 1,
        },
      },
    });

    const entry = await this.get(coachUserId, updated.athleteId);
    if (!entry) {
      throw notFound("Roster entry not found", {
        coachUserId,
        athleteId: updated.athleteId,
      });
    }
    return entry;
  }
}

const seedRepository = new StoreCoachRosterRepository(() => getMarketplaceSeedStore());
const dbRepository = new DbCoachRosterRepository();

export function resolveCoachRosterRepository(): CoachRosterRepository {
  return getApiDataBackend() === "db" ? dbRepository : seedRepository;
}
