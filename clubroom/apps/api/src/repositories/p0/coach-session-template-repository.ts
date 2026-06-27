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
type SessionTemplateType = '1-to-1' | 'small-group' | 'clinic' | 'assessment';

const asRows = (value: unknown): SeedRow[] =>
  Array.isArray(value) ? (value as SeedRow[]) : [];
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
const asIsoString = (value: unknown, fallback = new Date().toISOString()): string =>
  typeof value === 'string'
    ? value
    : value instanceof Date
      ? value.toISOString()
      : fallback;

export interface CoachSessionTemplate {
  id: string;
  coachId: string;
  name: string;
  type: SessionTemplateType;
  duration: number;
  capacity: number;
  defaultPrice: number;
  description?: string;
  defaultLocation?: string;
  skillsFocus: string[];
  createdAt: string;
}

export interface CoachSessionTemplateInput {
  name: string;
  type: SessionTemplateType;
  duration: number;
  capacity: number;
  defaultPrice: number;
  description?: string;
  defaultLocation?: string;
  skillsFocus: string[];
}

export type CoachSessionTemplatePatch = Partial<CoachSessionTemplateInput>;

interface SessionTemplateRepository {
  list(authUserId: string): Promise<CoachSessionTemplate[]>;
  get(authUserId: string, templateId: string): Promise<CoachSessionTemplate>;
  create(
    authUserId: string,
    input: CoachSessionTemplateInput,
  ): Promise<CoachSessionTemplate>;
  update(
    authUserId: string,
    templateId: string,
    patch: CoachSessionTemplatePatch,
  ): Promise<CoachSessionTemplate>;
  delete(authUserId: string, templateId: string): Promise<void>;
}

function toStoreType(type: SessionTemplateType): string {
  return type === '1-to-1' ? 'one_to_one' : type.replaceAll('-', '_');
}

function toContractType(value: unknown): SessionTemplateType {
  const normalized = asString(value)?.trim().toLowerCase().replaceAll('_', '-');
  if (
    normalized === '1-to-1' ||
    normalized === 'small-group' ||
    normalized === 'clinic' ||
    normalized === 'assessment'
  ) {
    return normalized;
  }
  if (normalized === 'one-to-one') {
    return '1-to-1';
  }
  return '1-to-1';
}

function mapTemplate(row: SeedRow): CoachSessionTemplate {
  return {
    id: asString(row.id) ?? '',
    coachId: asString(row.coachUserId) ?? '',
    name: asString(row.title) ?? 'Session',
    type: toContractType(row.serviceType),
    duration: Number(row.durationMinutes ?? 60),
    capacity: Number(row.capacity ?? 1),
    defaultPrice: Number(row.priceMinor ?? 0) / 100,
    ...(asString(row.description)
      ? {
          description: asString(row.description),
        }
      : {}),
    ...(asString(row.defaultLocation)
      ? {
          defaultLocation: asString(row.defaultLocation),
        }
      : {}),
    skillsFocus: asStringArray(row.skillsFocus),
    createdAt: asIsoString(row.createdAt),
  };
}

function activeOfferingRows(tables: SeedTables, authUserId: string): SeedRow[] {
  return asRows(tables.coachingOfferings).filter(
    (row) =>
      asString(row.coachUserId) === authUserId &&
      row.active !== false &&
      !asString(row.deletedAt),
  );
}

function requireStoreCoach(tables: SeedTables, authUserId: string): void {
  const coach = asRows(tables.coachProfiles).find(
    (row) => asString(row.userId) === authUserId && !asString(row.deletedAt),
  );
  if (!coach) {
    throw notFound('Coach profile not found');
  }
}

class StoreSessionTemplateRepository implements SessionTemplateRepository {
  constructor(private readonly getTables: () => SeedTables) {}

  async list(authUserId: string): Promise<CoachSessionTemplate[]> {
    const tables = this.getTables();
    requireStoreCoach(tables, authUserId);
    return activeOfferingRows(tables, authUserId)
      .sort((left, right) =>
        asIsoString(left.createdAt).localeCompare(asIsoString(right.createdAt)),
      )
      .map(mapTemplate);
  }

  async get(authUserId: string, templateId: string): Promise<CoachSessionTemplate> {
    const tables = this.getTables();
    requireStoreCoach(tables, authUserId);
    const row = activeOfferingRows(tables, authUserId).find(
      (candidate) => asString(candidate.id) === templateId,
    );
    if (!row) {
      throw notFound('Session template not found');
    }
    return mapTemplate(row);
  }

  async create(
    authUserId: string,
    input: CoachSessionTemplateInput,
  ): Promise<CoachSessionTemplate> {
    const tables = this.getTables();
    requireStoreCoach(tables, authUserId);
    if (!Array.isArray(tables.coachingOfferings)) {
      tables.coachingOfferings = [];
    }
    const now = new Date().toISOString();
    const row: SeedRow = {
      id: `off_${randomUUID()}`,
      coachUserId: authUserId,
      title: input.name,
      serviceType: toStoreType(input.type),
      durationMinutes: input.duration,
      capacity: input.capacity,
      priceMinor: Math.round(input.defaultPrice * 100),
      currency: 'GBP',
      description: input.description || null,
      defaultLocation: input.defaultLocation || null,
      skillsFocus: input.skillsFocus,
      active: true,
      createdByUserId: authUserId,
      updatedByUserId: authUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    };
    tables.coachingOfferings.push(row);
    return mapTemplate(row);
  }

  async update(
    authUserId: string,
    templateId: string,
    patch: CoachSessionTemplatePatch,
  ): Promise<CoachSessionTemplate> {
    const tables = this.getTables();
    requireStoreCoach(tables, authUserId);
    const row = activeOfferingRows(tables, authUserId).find(
      (candidate) => asString(candidate.id) === templateId,
    );
    if (!row) {
      throw notFound('Session template not found');
    }
    Object.assign(row, {
      ...(patch.name !== undefined ? { title: patch.name } : {}),
      ...(patch.type !== undefined ? { serviceType: toStoreType(patch.type) } : {}),
      ...(patch.duration !== undefined ? { durationMinutes: patch.duration } : {}),
      ...(patch.capacity !== undefined ? { capacity: patch.capacity } : {}),
      ...(patch.defaultPrice !== undefined
        ? { priceMinor: Math.round(patch.defaultPrice * 100) }
        : {}),
      ...(patch.description !== undefined
        ? { description: patch.description || null }
        : {}),
      ...(patch.defaultLocation !== undefined
        ? { defaultLocation: patch.defaultLocation || null }
        : {}),
      ...(patch.skillsFocus !== undefined ? { skillsFocus: patch.skillsFocus } : {}),
      updatedByUserId: authUserId,
      updatedAt: new Date().toISOString(),
      version: Number(row.version ?? 0) + 1,
    });
    return mapTemplate(row);
  }

  async delete(authUserId: string, templateId: string): Promise<void> {
    const tables = this.getTables();
    requireStoreCoach(tables, authUserId);
    const row = activeOfferingRows(tables, authUserId).find(
      (candidate) => asString(candidate.id) === templateId,
    );
    if (!row) {
      throw notFound('Session template not found');
    }
    const now = new Date().toISOString();
    Object.assign(row, {
      active: false,
      deletedAt: now,
      deletedByUserId: authUserId,
      updatedAt: now,
      updatedByUserId: authUserId,
      version: Number(row.version ?? 0) + 1,
    });
  }
}

class DbSessionTemplateRepository implements SessionTemplateRepository {
  private readonly fixture = new StoreSessionTemplateRepository(
    () => getDbFixtureStore().tables,
  );

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

  async list(authUserId: string): Promise<CoachSessionTemplate[]> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.list(authUserId);
    }
    await this.requireCoach(authUserId);
    const prisma = getPrismaClientOrThrow();
    const rows = await prisma.coachingOffering.findMany({
      where: {
        coachUserId: authUserId,
        active: true,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    return rows.map((row) => mapTemplate(row as unknown as SeedRow));
  }

  async get(authUserId: string, templateId: string): Promise<CoachSessionTemplate> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.get(authUserId, templateId);
    }
    await this.requireCoach(authUserId);
    const prisma = getPrismaClientOrThrow();
    const row = await prisma.coachingOffering.findFirst({
      where: {
        id: templateId,
        coachUserId: authUserId,
        active: true,
        deletedAt: null,
      },
    });
    if (!row) {
      throw notFound('Session template not found');
    }
    return mapTemplate(row as unknown as SeedRow);
  }

  async create(
    authUserId: string,
    input: CoachSessionTemplateInput,
  ): Promise<CoachSessionTemplate> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.create(authUserId, input);
    }
    await this.requireCoach(authUserId);
    const prisma = getPrismaClientOrThrow();
    const row = await prisma.coachingOffering.create({
      data: {
        id: `off_${randomUUID()}`,
        coachUserId: authUserId,
        title: input.name,
        serviceType: toStoreType(input.type),
        durationMinutes: input.duration,
        capacity: input.capacity,
        priceMinor: Math.round(input.defaultPrice * 100),
        currency: 'GBP',
        description: input.description || null,
        defaultLocation: input.defaultLocation || null,
        skillsFocus: input.skillsFocus,
        active: true,
        createdByUserId: authUserId,
        updatedByUserId: authUserId,
      },
    });
    return mapTemplate(row as unknown as SeedRow);
  }

  async update(
    authUserId: string,
    templateId: string,
    patch: CoachSessionTemplatePatch,
  ): Promise<CoachSessionTemplate> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.update(authUserId, templateId, patch);
    }
    await this.get(authUserId, templateId);
    const prisma = getPrismaClientOrThrow();
    const row = await prisma.coachingOffering.update({
      where: {
        id: templateId,
      },
      data: {
        ...(patch.name !== undefined ? { title: patch.name } : {}),
        ...(patch.type !== undefined ? { serviceType: toStoreType(patch.type) } : {}),
        ...(patch.duration !== undefined ? { durationMinutes: patch.duration } : {}),
        ...(patch.capacity !== undefined ? { capacity: patch.capacity } : {}),
        ...(patch.defaultPrice !== undefined
          ? { priceMinor: Math.round(patch.defaultPrice * 100) }
          : {}),
        ...(patch.description !== undefined
          ? { description: patch.description || null }
          : {}),
        ...(patch.defaultLocation !== undefined
          ? { defaultLocation: patch.defaultLocation || null }
          : {}),
        ...(patch.skillsFocus !== undefined ? { skillsFocus: patch.skillsFocus } : {}),
        updatedByUserId: authUserId,
        version: {
          increment: 1n,
        },
      },
    });
    return mapTemplate(row as unknown as SeedRow);
  }

  async delete(authUserId: string, templateId: string): Promise<void> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.delete(authUserId, templateId);
    }
    await this.get(authUserId, templateId);
    const prisma = getPrismaClientOrThrow();
    await prisma.coachingOffering.update({
      where: {
        id: templateId,
      },
      data: {
        active: false,
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

const seedRepository = new StoreSessionTemplateRepository(
  () => getMarketplaceSeedStore().tables,
);
const dbRepository = new DbSessionTemplateRepository();

export function resolveCoachSessionTemplateRepository(): SessionTemplateRepository {
  return getApiDataBackend() === 'db' ? dbRepository : seedRepository;
}
