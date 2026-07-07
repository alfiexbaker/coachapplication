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
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const asIsoString = (value: unknown, fallback = new Date().toISOString()): string =>
  typeof value === 'string'
    ? value
    : value instanceof Date
      ? value.toISOString()
      : fallback;

export interface CoachTrialOffering {
  id: string;
  coachId: string;
  enabled: boolean;
  trialPrice: number;
  normalPrice: number;
  durationMinutes: number;
  limitPerFamily: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoachTrialOfferingInput {
  enabled: boolean;
  trialPrice: number;
  normalPrice: number;
  durationMinutes: number;
  limitPerFamily: number;
  description: string;
}

export interface CoachTrialOfferingRepository {
  get(
    coachUserId: string,
    options?: { includePrivate?: boolean },
  ): Promise<CoachTrialOffering | null>;
  listActive(): Promise<CoachTrialOffering[]>;
  upsert(coachUserId: string, input: CoachTrialOfferingInput): Promise<CoachTrialOffering>;
  archive(coachUserId: string): Promise<void>;
}

function moneyToMinor(value: number): number {
  return Math.round(value * 100);
}

function moneyFromMinor(value: unknown): number {
  return Math.round(((asNumber(value) ?? 0) / 100) * 100) / 100;
}

function mapOffering(row: SeedRow): CoachTrialOffering {
  return {
    id: asString(row.id) ?? '',
    coachId: asString(row.coachUserId) ?? '',
    enabled: asBoolean(row.enabled) === true,
    trialPrice: moneyFromMinor(row.trialPriceMinor),
    normalPrice: moneyFromMinor(row.normalPriceMinor),
    durationMinutes: asNumber(row.durationMinutes) ?? 60,
    limitPerFamily: asNumber(row.limitPerFamily) ?? 1,
    description: asString(row.description) ?? '',
    createdAt: asIsoString(row.createdAt),
    updatedAt: asIsoString(row.updatedAt),
  };
}

function trialOfferingRows(tables: SeedTables): SeedRow[] {
  if (!Array.isArray(tables.coachTrialOfferings)) {
    tables.coachTrialOfferings = [];
  }
  return tables.coachTrialOfferings;
}

function requireStoreCoach(tables: SeedTables, coachUserId: string): void {
  const coach = asRows(tables.coachProfiles).find(
    (row) => asString(row.userId) === coachUserId && !asString(row.deletedAt),
  );
  if (!coach) {
    throw notFound('Coach profile not found');
  }
}

function activePublicRows(tables: SeedTables): SeedRow[] {
  return trialOfferingRows(tables).filter(
    (row) => asBoolean(row.enabled) === true && !asString(row.deletedAt),
  );
}

class StoreCoachTrialOfferingRepository implements CoachTrialOfferingRepository {
  constructor(private readonly getTables: () => SeedTables) {}

  async get(
    coachUserId: string,
    options: { includePrivate?: boolean } = {},
  ): Promise<CoachTrialOffering | null> {
    const tables = this.getTables();
    requireStoreCoach(tables, coachUserId);
    const row = trialOfferingRows(tables).find(
      (candidate) =>
        asString(candidate.coachUserId) === coachUserId && !asString(candidate.deletedAt),
    );
    if (!row || (asBoolean(row.enabled) !== true && options.includePrivate !== true)) {
      return null;
    }
    return mapOffering(row);
  }

  async listActive(): Promise<CoachTrialOffering[]> {
    const tables = this.getTables();
    return activePublicRows(tables)
      .sort((left, right) =>
        asIsoString(right.updatedAt).localeCompare(asIsoString(left.updatedAt)),
      )
      .map(mapOffering);
  }

  async upsert(
    coachUserId: string,
    input: CoachTrialOfferingInput,
  ): Promise<CoachTrialOffering> {
    const tables = this.getTables();
    requireStoreCoach(tables, coachUserId);
    const rows = trialOfferingRows(tables);
    const now = new Date().toISOString();
    let row = rows.find((candidate) => asString(candidate.coachUserId) === coachUserId);
    if (!row) {
      row = {
        id: `trial_${randomUUID()}`,
        coachUserId,
        createdByUserId: coachUserId,
        createdAt: now,
        version: 1,
      };
      rows.push(row);
    }

    Object.assign(row, {
      enabled: input.enabled,
      trialPriceMinor: moneyToMinor(input.trialPrice),
      normalPriceMinor: moneyToMinor(input.normalPrice),
      currency: 'GBP',
      durationMinutes: input.durationMinutes,
      limitPerFamily: input.limitPerFamily,
      description: input.description,
      updatedByUserId: coachUserId,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
      version: Number(row.version ?? 0) + 1,
    });

    return mapOffering(row);
  }

  async archive(coachUserId: string): Promise<void> {
    const tables = this.getTables();
    requireStoreCoach(tables, coachUserId);
    const row = trialOfferingRows(tables).find(
      (candidate) =>
        asString(candidate.coachUserId) === coachUserId && !asString(candidate.deletedAt),
    );
    if (!row) {
      throw notFound('Trial offering not found');
    }
    const now = new Date().toISOString();
    Object.assign(row, {
      enabled: false,
      deletedAt: now,
      deletedByUserId: coachUserId,
      updatedAt: now,
      updatedByUserId: coachUserId,
      version: Number(row.version ?? 0) + 1,
    });
  }
}

class DbCoachTrialOfferingRepository implements CoachTrialOfferingRepository {
  private readonly fixture = new StoreCoachTrialOfferingRepository(
    () => getDbFixtureStore().tables,
  );

  private async requireCoach(coachUserId: string): Promise<void> {
    const prisma = getPrismaClientOrThrow();
    const coach = await prisma.coachProfile.findFirst({
      where: {
        userId: coachUserId,
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

  async get(
    coachUserId: string,
    options: { includePrivate?: boolean } = {},
  ): Promise<CoachTrialOffering | null> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.get(coachUserId, options);
    }
    await this.requireCoach(coachUserId);
    const prisma = getPrismaClientOrThrow();
    const row = await prisma.coachTrialOffering.findFirst({
      where: {
        coachUserId,
        deletedAt: null,
        ...(options.includePrivate === true ? {} : { enabled: true }),
      },
    });
    return row ? mapOffering(row as unknown as SeedRow) : null;
  }

  async listActive(): Promise<CoachTrialOffering[]> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.listActive();
    }
    const prisma = getPrismaClientOrThrow();
    const rows = await prisma.coachTrialOffering.findMany({
      where: {
        enabled: true,
        deletedAt: null,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    return rows.map((row) => mapOffering(row as unknown as SeedRow));
  }

  async upsert(
    coachUserId: string,
    input: CoachTrialOfferingInput,
  ): Promise<CoachTrialOffering> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.upsert(coachUserId, input);
    }
    await this.requireCoach(coachUserId);
    const prisma = getPrismaClientOrThrow();
    const row = await prisma.coachTrialOffering.upsert({
      where: {
        coachUserId,
      },
      create: {
        id: `trial_${randomUUID()}`,
        coachUserId,
        enabled: input.enabled,
        trialPriceMinor: moneyToMinor(input.trialPrice),
        normalPriceMinor: moneyToMinor(input.normalPrice),
        currency: 'GBP',
        durationMinutes: input.durationMinutes,
        limitPerFamily: input.limitPerFamily,
        description: input.description,
        createdByUserId: coachUserId,
        updatedByUserId: coachUserId,
      },
      update: {
        enabled: input.enabled,
        trialPriceMinor: moneyToMinor(input.trialPrice),
        normalPriceMinor: moneyToMinor(input.normalPrice),
        currency: 'GBP',
        durationMinutes: input.durationMinutes,
        limitPerFamily: input.limitPerFamily,
        description: input.description,
        updatedByUserId: coachUserId,
        deletedAt: null,
        deletedByUserId: null,
        version: {
          increment: 1n,
        },
      },
    });
    return mapOffering(row as unknown as SeedRow);
  }

  async archive(coachUserId: string): Promise<void> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.archive(coachUserId);
    }
    await this.requireCoach(coachUserId);
    const prisma = getPrismaClientOrThrow();
    const row = await prisma.coachTrialOffering.findFirst({
      where: {
        coachUserId,
        deletedAt: null,
      },
    });
    if (!row) {
      throw notFound('Trial offering not found');
    }
    await prisma.coachTrialOffering.update({
      where: {
        id: row.id,
      },
      data: {
        enabled: false,
        deletedAt: new Date(),
        deletedByUserId: coachUserId,
        updatedByUserId: coachUserId,
        version: {
          increment: 1n,
        },
      },
    });
  }
}

const seedRepository = new StoreCoachTrialOfferingRepository(
  () => getMarketplaceSeedStore().tables,
);
const dbRepository = new DbCoachTrialOfferingRepository();

export function resolveCoachTrialOfferingRepository(): CoachTrialOfferingRepository {
  return getApiDataBackend() === 'db' ? dbRepository : seedRepository;
}
