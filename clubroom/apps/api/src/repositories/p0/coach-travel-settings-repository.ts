import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import {
  getPrismaClientOrThrow,
  shouldUseDbFixtureFallback,
} from '../../lib/prisma-runtime.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] =>
  Array.isArray(value) ? (value as SeedRow[]) : [];
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const asIsoString = (value: unknown, fallback = new Date().toISOString()): string =>
  typeof value === 'string'
    ? value
    : value instanceof Date
      ? value.toISOString()
      : fallback;

export interface CoachTravelSettings {
  coachId: string;
  radiusMiles: number;
  acceptsTravelSessions: boolean;
  acceptsRemoteSessions: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CoachTravelSettingsPatch {
  radiusMiles?: number;
  acceptsTravelSessions?: boolean;
  acceptsRemoteSessions?: boolean;
}

export interface CoachTravelSettingsRepository {
  get(coachUserId: string): Promise<CoachTravelSettings>;
  update(coachUserId: string, patch: CoachTravelSettingsPatch): Promise<CoachTravelSettings>;
}

function mapSettings(row: SeedRow): CoachTravelSettings {
  return {
    coachId: asString(row.userId) ?? '',
    radiusMiles: asNumber(row.travelRadiusMiles) ?? 10,
    acceptsTravelSessions: asBoolean(row.acceptsTravelSessions) ?? true,
    acceptsRemoteSessions: asBoolean(row.acceptsRemoteSessions) ?? false,
    createdAt: asIsoString(row.createdAt),
    updatedAt: asIsoString(row.updatedAt),
  };
}

function requireStoreCoach(tables: SeedTables, coachUserId: string): SeedRow {
  const coach = asRows(tables.coachProfiles).find(
    (row) => asString(row.userId) === coachUserId && !asString(row.deletedAt),
  );
  if (!coach) {
    throw notFound('Coach profile not found');
  }
  return coach;
}

class StoreCoachTravelSettingsRepository implements CoachTravelSettingsRepository {
  constructor(private readonly getTables: () => SeedTables) {}

  async get(coachUserId: string): Promise<CoachTravelSettings> {
    return mapSettings(requireStoreCoach(this.getTables(), coachUserId));
  }

  async update(
    coachUserId: string,
    patch: CoachTravelSettingsPatch,
  ): Promise<CoachTravelSettings> {
    const coach = requireStoreCoach(this.getTables(), coachUserId);
    Object.assign(coach, {
      ...(patch.radiusMiles !== undefined ? { travelRadiusMiles: patch.radiusMiles } : {}),
      ...(patch.acceptsTravelSessions !== undefined
        ? { acceptsTravelSessions: patch.acceptsTravelSessions }
        : {}),
      ...(patch.acceptsRemoteSessions !== undefined
        ? { acceptsRemoteSessions: patch.acceptsRemoteSessions }
        : {}),
      updatedAt: new Date().toISOString(),
      updatedByUserId: coachUserId,
      version: Number(coach.version ?? 0) + 1,
    });
    return mapSettings(coach);
  }
}

class DbCoachTravelSettingsRepository implements CoachTravelSettingsRepository {
  private readonly fixture = new StoreCoachTravelSettingsRepository(
    () => getDbFixtureStore().tables,
  );

  async get(coachUserId: string): Promise<CoachTravelSettings> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.get(coachUserId);
    }
    const prisma = getPrismaClientOrThrow();
    const coach = await prisma.coachProfile.findFirst({
      where: {
        userId: coachUserId,
        deletedAt: null,
      },
    });
    if (!coach) {
      throw notFound('Coach profile not found');
    }
    return mapSettings(coach as unknown as SeedRow);
  }

  async update(
    coachUserId: string,
    patch: CoachTravelSettingsPatch,
  ): Promise<CoachTravelSettings> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.update(coachUserId, patch);
    }
    await this.get(coachUserId);
    const prisma = getPrismaClientOrThrow();
    const coach = await prisma.coachProfile.update({
      where: {
        userId: coachUserId,
      },
      data: {
        ...(patch.radiusMiles !== undefined ? { travelRadiusMiles: patch.radiusMiles } : {}),
        ...(patch.acceptsTravelSessions !== undefined
          ? { acceptsTravelSessions: patch.acceptsTravelSessions }
          : {}),
        ...(patch.acceptsRemoteSessions !== undefined
          ? { acceptsRemoteSessions: patch.acceptsRemoteSessions }
          : {}),
      },
    });
    return mapSettings(coach as unknown as SeedRow);
  }
}

const seedRepository = new StoreCoachTravelSettingsRepository(
  () => getMarketplaceSeedStore().tables,
);
const dbRepository = new DbCoachTravelSettingsRepository();

export function resolveCoachTravelSettingsRepository(): CoachTravelSettingsRepository {
  return getApiDataBackend() === 'db' ? dbRepository : seedRepository;
}
