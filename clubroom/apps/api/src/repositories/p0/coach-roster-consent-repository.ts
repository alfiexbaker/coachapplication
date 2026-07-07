import { getApiDataBackend } from "../../lib/data-backend.js";
import { getDbFixtureStore } from "../../lib/db-fixture-store.js";
import { getMarketplaceSeedStore } from "../../lib/marketplace-seed-store.js";
import {
  getPrismaClientOrThrow,
  shouldUseDbFixtureFallback,
} from "../../lib/prisma-runtime.js";
import { resolveCoachRosterRepository } from "./coach-roster-repository.js";
import { normalizeForJson } from "./normalize.js";

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;
type ConsentStatusFilter = "granted" | "denied" | "all";
type RosterConsentType = "PHOTO" | "VIDEO" | "SOCIAL_MEDIA" | "EMERGENCY_TREATMENT";

const CONSENT_TYPES: RosterConsentType[] = [
  "PHOTO",
  "VIDEO",
  "SOCIAL_MEDIA",
  "EMERGENCY_TREATMENT",
];

const asRows = (value: unknown): SeedRow[] =>
  Array.isArray(value) ? (value as SeedRow[]) : [];
const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;
const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;
const asIsoString = (value: unknown): string | undefined =>
  typeof value === "string"
    ? value
    : value instanceof Date
      ? value.toISOString()
      : undefined;

export interface RosterConsentFilters {
  type?: RosterConsentType;
  status?: ConsentStatusFilter;
  search?: string;
}

export interface RosterConsent {
  type: RosterConsentType;
  granted: boolean;
  grantedAt?: string;
  grantedBy: string;
  expiryAt?: string;
}

export interface AthleteRosterConsent {
  athleteId: string;
  consents: RosterConsent[];
  lastUpdated: string;
}

export interface RosterConsentSummary {
  totalAthletes: number;
  byType: Record<RosterConsentType, { granted: number; denied: number }>;
}

export interface CoachRosterConsentResult {
  consents: AthleteRosterConsent[];
  summary: RosterConsentSummary;
  dataVersion: string | null;
}

export interface CoachRosterConsentRepository {
  list(coachUserId: string, filters?: RosterConsentFilters): Promise<CoachRosterConsentResult>;
}

function latestTimestamp(values: Array<string | undefined>): string {
  const latest = values
    .flatMap((value) => {
      const parsed = Date.parse(value ?? "");
      return Number.isFinite(parsed) ? [parsed] : [];
    })
    .sort((left, right) => right - left)[0];
  return new Date(latest ?? Date.now()).toISOString();
}

function rowTimestamp(row: SeedRow): number {
  const parsed = Date.parse(
    asIsoString(row.createdAt) ??
      asIsoString(row.grantedAt) ??
      asIsoString(row.revokedAt) ??
      "",
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

function isConsentGranted(row: SeedRow | undefined): boolean {
  if (!row || asBoolean(row.granted) !== true || asIsoString(row.revokedAt)) {
    return false;
  }
  const expiresAt = asIsoString(row.expiresAt) ?? asIsoString(row.expiryAt);
  if (!expiresAt) {
    return true;
  }
  const expiry = Date.parse(expiresAt);
  return Number.isFinite(expiry) && expiry > Date.now();
}

function consentFromRow(type: RosterConsentType, row: SeedRow | undefined): RosterConsent {
  const granted = isConsentGranted(row);
  const grantedAt = granted ? asIsoString(row?.grantedAt) : undefined;
  const expiryAt = asIsoString(row?.expiresAt) ?? asIsoString(row?.expiryAt);
  return {
    type,
    granted,
    ...(grantedAt ? { grantedAt } : {}),
    grantedBy: granted ? (asString(row?.grantedByUserId) ?? asString(row?.grantedBy) ?? "") : "",
    ...(expiryAt ? { expiryAt } : {}),
  };
}

function buildSummary(consents: AthleteRosterConsent[]): RosterConsentSummary {
  const byType = Object.fromEntries(
    CONSENT_TYPES.map((type) => [type, { granted: 0, denied: 0 }]),
  ) as RosterConsentSummary["byType"];
  for (const athlete of consents) {
    for (const consent of athlete.consents) {
      if (consent.granted) {
        byType[consent.type].granted += 1;
      } else {
        byType[consent.type].denied += 1;
      }
    }
  }
  return {
    totalAthletes: consents.length,
    byType,
  };
}

function applyFilters(
  consents: AthleteRosterConsent[],
  searchable: Map<string, string>,
  filters?: RosterConsentFilters,
): AthleteRosterConsent[] {
  let result = consents;
  const search = filters?.search?.trim().toLowerCase();
  if (search) {
    result = result.filter((entry) => searchable.get(entry.athleteId)?.includes(search));
  }
  if (filters?.type && filters.status && filters.status !== "all") {
    const expected = filters.status === "granted";
    result = result.filter(
      (entry) => entry.consents.find((consent) => consent.type === filters.type)?.granted === expected,
    );
  }
  return result;
}

function buildFromRows(params: {
  coachUserId: string;
  rosterEntries: Array<{
    athleteId: string;
    athleteName?: string;
    parentName?: string;
    parentId?: string;
  }>;
  consentRows: SeedRow[];
  filters?: RosterConsentFilters;
  dataVersion: string | null;
}): CoachRosterConsentResult {
  const rowsByAthleteAndType = new Map<string, SeedRow>();
  for (const row of params.consentRows) {
    const athleteId = asString(row.athleteId);
    const type = asString(row.consentType) as RosterConsentType | undefined;
    if (!athleteId || !type || !CONSENT_TYPES.includes(type)) {
      continue;
    }
    const key = `${athleteId}:${type}`;
    const existing = rowsByAthleteAndType.get(key);
    if (!existing || rowTimestamp(row) >= rowTimestamp(existing)) {
      rowsByAthleteAndType.set(key, row);
    }
  }

  const searchable = new Map<string, string>();
  const consents = params.rosterEntries.map((entry) => {
    searchable.set(
      entry.athleteId,
      [
        entry.athleteId,
        entry.athleteName,
        entry.parentId,
        entry.parentName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    );
    const athleteConsents = CONSENT_TYPES.map((type) =>
      consentFromRow(type, rowsByAthleteAndType.get(`${entry.athleteId}:${type}`)),
    );
    return {
      athleteId: entry.athleteId,
      consents: athleteConsents,
      lastUpdated: latestTimestamp(
        athleteConsents.flatMap((consent) => [consent.grantedAt, consent.expiryAt]),
      ),
    };
  });

  const filtered = applyFilters(consents, searchable, params.filters);
  return {
    consents: filtered,
    summary: buildSummary(filtered),
    dataVersion: params.dataVersion,
  };
}

class StoreCoachRosterConsentRepository implements CoachRosterConsentRepository {
  constructor(private readonly getStore: () => { version: string | null; tables: SeedTables }) {}

  async list(
    coachUserId: string,
    filters?: RosterConsentFilters,
  ): Promise<CoachRosterConsentResult> {
    const store = this.getStore();
    const roster = await resolveCoachRosterRepository().list(coachUserId);
    const athleteIds = new Set(roster.entries.map((entry) => entry.athleteId));
    return buildFromRows({
      coachUserId,
      rosterEntries: roster.entries,
      consentRows: asRows(store.tables.childConsents).filter((row) =>
        athleteIds.has(asString(row.athleteId) ?? ""),
      ),
      filters,
      dataVersion: store.version ?? roster.dataVersion,
    });
  }
}

class DbCoachRosterConsentRepository implements CoachRosterConsentRepository {
  private readonly fixture = new StoreCoachRosterConsentRepository(() => getDbFixtureStore());

  async list(
    coachUserId: string,
    filters?: RosterConsentFilters,
  ): Promise<CoachRosterConsentResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.list(coachUserId, filters);
    }
    const roster = await resolveCoachRosterRepository().list(coachUserId);
    const athleteIds = roster.entries.map((entry) => entry.athleteId);
    const prisma = getPrismaClientOrThrow();
    const consentRows =
      athleteIds.length > 0
        ? await prisma.childConsent.findMany({
            where: {
              athleteId: {
                in: athleteIds,
              },
            },
          })
        : [];
    return buildFromRows({
      coachUserId,
      rosterEntries: roster.entries,
      consentRows: consentRows.map((row) => normalizeForJson(row) as SeedRow),
      filters,
      dataVersion: roster.dataVersion,
    });
  }
}

const seedRepository = new StoreCoachRosterConsentRepository(() => getMarketplaceSeedStore());
const dbRepository = new DbCoachRosterConsentRepository();

export function resolveCoachRosterConsentRepository(): CoachRosterConsentRepository {
  return getApiDataBackend() === "db" ? dbRepository : seedRepository;
}
