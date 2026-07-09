import { randomUUID } from 'node:crypto';
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
const asIsoString = (value: unknown, fallback = new Date().toISOString()): string =>
  typeof value === 'string'
    ? value
    : value instanceof Date
      ? value.toISOString()
      : fallback;

export interface CoachVenuePreset {
  id: string;
  coachId: string;
  label: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CoachVenueInput {
  label: string;
  isDefault?: boolean;
}

export type CoachVenuePatch = Partial<CoachVenueInput>;

interface CoachVenueRepository {
  list(authUserId: string): Promise<CoachVenuePreset[]>;
  create(authUserId: string, input: CoachVenueInput): Promise<CoachVenuePreset>;
  update(
    authUserId: string,
    venueId: string,
    patch: CoachVenuePatch,
  ): Promise<CoachVenuePreset>;
  delete(authUserId: string, venueId: string): Promise<void>;
}

function mapVenue(row: SeedRow): CoachVenuePreset {
  return {
    id: asString(row.id) ?? '',
    coachId: asString(row.coachUserId) ?? '',
    label: asString(row.label) ?? 'Venue',
    isDefault: asBoolean(row.isDefault) ?? false,
    createdAt: asIsoString(row.createdAt),
    updatedAt: asIsoString(row.updatedAt),
  };
}

function requireStoreCoach(tables: SeedTables, authUserId: string): void {
  const coach = asRows(tables.coachProfiles).find(
    (row) => asString(row.userId) === authUserId && !asString(row.deletedAt),
  );
  if (!coach) {
    throw notFound('Coach profile not found');
  }
}

function activeVenueRows(tables: SeedTables, authUserId: string): SeedRow[] {
  return asRows(tables.coachLocations).filter(
    (row) => asString(row.coachUserId) === authUserId && !asString(row.deletedAt),
  );
}

class StoreCoachVenueRepository implements CoachVenueRepository {
  constructor(private readonly getTables: () => SeedTables) {}

  async list(authUserId: string): Promise<CoachVenuePreset[]> {
    const tables = this.getTables();
    requireStoreCoach(tables, authUserId);
    return activeVenueRows(tables, authUserId)
      .sort((left, right) => {
        const defaultDelta = Number(right.isDefault === true) - Number(left.isDefault === true);
        if (defaultDelta !== 0) return defaultDelta;
        return asIsoString(left.createdAt).localeCompare(asIsoString(right.createdAt));
      })
      .map(mapVenue);
  }

  async create(authUserId: string, input: CoachVenueInput): Promise<CoachVenuePreset> {
    const tables = this.getTables();
    requireStoreCoach(tables, authUserId);
    if (!Array.isArray(tables.coachLocations)) {
      tables.coachLocations = [];
    }
    const now = new Date().toISOString();
    const row: SeedRow = {
      id: `loc_${randomUUID()}`,
      coachUserId: authUserId,
      label: input.label,
      addressText: null,
      latLngJson: null,
      isDefault: input.isDefault === true,
      createdByUserId: authUserId,
      updatedByUserId: authUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    };
    tables.coachLocations.push(row);
    return mapVenue(row);
  }

  async update(
    authUserId: string,
    venueId: string,
    patch: CoachVenuePatch,
  ): Promise<CoachVenuePreset> {
    const tables = this.getTables();
    requireStoreCoach(tables, authUserId);
    const row = activeVenueRows(tables, authUserId).find(
      (candidate) => asString(candidate.id) === venueId,
    );
    if (!row) {
      throw notFound('Coach venue not found');
    }
    Object.assign(row, {
      ...(patch.label !== undefined ? { label: patch.label } : {}),
      ...(patch.isDefault !== undefined ? { isDefault: patch.isDefault } : {}),
      updatedAt: new Date().toISOString(),
      updatedByUserId: authUserId,
      version: Number(row.version ?? 0) + 1,
    });
    return mapVenue(row);
  }

  async delete(authUserId: string, venueId: string): Promise<void> {
    const tables = this.getTables();
    requireStoreCoach(tables, authUserId);
    const row = activeVenueRows(tables, authUserId).find(
      (candidate) => asString(candidate.id) === venueId,
    );
    if (!row) {
      throw notFound('Coach venue not found');
    }
    const now = new Date().toISOString();
    Object.assign(row, {
      deletedAt: now,
      deletedByUserId: authUserId,
      updatedAt: now,
      updatedByUserId: authUserId,
      version: Number(row.version ?? 0) + 1,
    });
  }
}

class DbCoachVenueRepository implements CoachVenueRepository {
  private readonly fixture = new StoreCoachVenueRepository(() => getDbFixtureStore().tables);

  private async requireCoach(authUserId: string): Promise<void> {
    const prisma = getPrismaClientOrThrow();
    const coach = await prisma.coachProfile.findFirst({
      where: {
        userId: authUserId,
        deletedAt: null,
      },
      select: {
        userId: true,
      },
    });
    if (!coach) {
      throw notFound('Coach profile not found');
    }
  }

  async list(authUserId: string): Promise<CoachVenuePreset[]> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.list(authUserId);
    }
    await this.requireCoach(authUserId);
    const prisma = getPrismaClientOrThrow();
    const rows = await prisma.coachLocation.findMany({
      where: {
        coachUserId: authUserId,
        deletedAt: null,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return rows.map((row) => mapVenue(row as unknown as SeedRow));
  }

  async create(authUserId: string, input: CoachVenueInput): Promise<CoachVenuePreset> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.create(authUserId, input);
    }
    await this.requireCoach(authUserId);
    const prisma = getPrismaClientOrThrow();
    const row = await prisma.coachLocation.create({
      data: {
        id: `loc_${randomUUID()}`,
        coachUserId: authUserId,
        label: input.label,
        addressText: null,
        isDefault: input.isDefault === true,
        createdByUserId: authUserId,
        updatedByUserId: authUserId,
      },
    });
    return mapVenue(row as unknown as SeedRow);
  }

  async update(
    authUserId: string,
    venueId: string,
    patch: CoachVenuePatch,
  ): Promise<CoachVenuePreset> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.update(authUserId, venueId, patch);
    }
    await this.requireCoach(authUserId);
    const prisma = getPrismaClientOrThrow();
    const existing = await prisma.coachLocation.findFirst({
      where: {
        id: venueId,
        coachUserId: authUserId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
    if (!existing) {
      throw notFound('Coach venue not found');
    }
    const row = await prisma.coachLocation.update({
      where: {
        id: venueId,
      },
      data: {
        ...(patch.label !== undefined ? { label: patch.label } : {}),
        ...(patch.isDefault !== undefined ? { isDefault: patch.isDefault } : {}),
        updatedByUserId: authUserId,
        version: {
          increment: 1n,
        },
      },
    });
    return mapVenue(row as unknown as SeedRow);
  }

  async delete(authUserId: string, venueId: string): Promise<void> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.delete(authUserId, venueId);
    }
    await this.requireCoach(authUserId);
    const prisma = getPrismaClientOrThrow();
    const existing = await prisma.coachLocation.findFirst({
      where: {
        id: venueId,
        coachUserId: authUserId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
    if (!existing) {
      throw notFound('Coach venue not found');
    }
    await prisma.coachLocation.update({
      where: {
        id: venueId,
      },
      data: {
        deletedAt: new Date(),
        deletedByUserId: authUserId,
        updatedByUserId: authUserId,
        version: {
          increment: 1n,
        },
      },
    });
  }
}

const seedRepository = new StoreCoachVenueRepository(() => getMarketplaceSeedStore().tables);
const dbRepository = new DbCoachVenueRepository();

export function resolveCoachVenueRepository(): CoachVenueRepository {
  return getApiDataBackend() === 'db' ? dbRepository : seedRepository;
}
