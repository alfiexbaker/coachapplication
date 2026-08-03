import { randomUUID } from 'node:crypto';
import { Prisma } from '@clubroom/db';
import { parseOrganizationRole } from '@clubroom/shared-contracts';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { conflict, forbidden, notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { normalizeForJson } from './normalize.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;
interface IntegrationRow {
  id?: unknown;
  clubId?: unknown;
  provider?: unknown;
  status?: unknown;
  displayName?: unknown;
  externalAccountId?: unknown;
  metadataJson?: unknown;
  createdByUserId?: unknown;
  updatedByUserId?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asIsoString = (value: unknown, fallback = new Date().toISOString()): string =>
  typeof value === 'string' ? value : value instanceof Date ? value.toISOString() : fallback;
const asMetadata = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export type ClubIntegrationStatus = 'DISCONNECTED' | 'CONNECTED' | 'NEEDS_REAUTH' | 'DISABLED';

export interface ClubIntegrationRecord {
  id: string;
  clubId: string;
  provider: string;
  status: ClubIntegrationStatus;
  displayName: string | null;
  externalAccountId: string | null;
  metadataJson: Record<string, unknown> | null;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertClubIntegrationInput {
  clubId: string;
  provider: string;
  status?: ClubIntegrationStatus;
  displayName?: string | null;
  externalAccountId?: string | null;
  metadataJson?: Record<string, unknown> | null;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}

export interface ClubIntegrationRepository {
  list(params: {
    clubId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubIntegrationRecord[]>;
  create(params: UpsertClubIntegrationInput): Promise<ClubIntegrationRecord>;
  update(params: UpsertClubIntegrationInput): Promise<ClubIntegrationRecord>;
}

function ensureTable(tables: SeedTables, key: string): SeedRow[] {
  if (!Array.isArray(tables[key])) {
    tables[key] = [];
  }
  return tables[key];
}

function normalizeProvider(provider: string): string {
  return provider.trim().toUpperCase();
}

function normalizeStatus(value: unknown): ClubIntegrationStatus {
  return value === 'CONNECTED' ||
    value === 'NEEDS_REAUTH' ||
    value === 'DISABLED' ||
    value === 'DISCONNECTED'
    ? value
    : 'DISCONNECTED';
}

function buildRecord(row: {
  id?: unknown;
  clubId?: unknown;
  provider?: unknown;
  status?: unknown;
  displayName?: unknown;
  externalAccountId?: unknown;
  metadataJson?: unknown;
  createdByUserId?: unknown;
  updatedByUserId?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}): ClubIntegrationRecord {
  return {
    id: asString(row.id) ?? '',
    clubId: asString(row.clubId) ?? '',
    provider: normalizeProvider(asString(row.provider) ?? 'CUSTOM'),
    status: normalizeStatus(row.status),
    displayName: asString(row.displayName) ?? null,
    externalAccountId: asString(row.externalAccountId) ?? null,
    metadataJson: asMetadata(row.metadataJson),
    createdByUserId: asString(row.createdByUserId) ?? '',
    updatedByUserId: asString(row.updatedByUserId) ?? '',
    createdAt: asIsoString(row.createdAt),
    updatedAt: asIsoString(row.updatedAt),
  };
}

function toPrismaJson(
  value: Record<string, unknown> | null | undefined,
): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return Prisma.JsonNull;
  }
  return value as Prisma.InputJsonValue;
}

function requireClubAdminRole(role: unknown): void {
  const parsedRole = parseOrganizationRole(role);
  if (parsedRole !== 'OWNER' && parsedRole !== 'ADMIN') {
    throw forbidden('You do not have permission to manage club integrations');
  }
}

function findStoreClub(tables: SeedTables, clubId: string): SeedRow | null {
  return (
    asRows(tables.clubs).find((row) => asString(row.id) === clubId && !asString(row.deletedAt)) ??
    null
  );
}

function findActiveStoreMembership(
  tables: SeedTables,
  clubId: string,
  authUserId: string,
): SeedRow | null {
  return (
    asRows(tables.clubMemberships).find(
      (row) =>
        asString(row.clubId) === clubId &&
        asString(row.userId) === authUserId &&
        row.active !== false &&
        !asString(row.deletedAt),
    ) ?? null
  );
}

class SeedClubIntegrationRepository implements ClubIntegrationRepository {
  constructor(private readonly getTables: () => SeedTables) {}

  private requireContext(params: {
    clubId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): SeedTables {
    const tables = this.getTables();
    const club = findStoreClub(tables, params.clubId);
    if (!club) {
      throw notFound('Club not found');
    }
    const viewerMembership = findActiveStoreMembership(tables, params.clubId, params.authUserId);
    if (!params.isPrivilegedAdmin) {
      requireClubAdminRole(viewerMembership?.role);
    }
    return tables;
  }

  async list(params: {
    clubId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubIntegrationRecord[]> {
    const tables = this.requireContext(params);
    return asRows(tables.clubIntegrations)
      .filter((row) => asString(row.clubId) === params.clubId && !asString(row.deletedAt))
      .sort((left, right) =>
        normalizeProvider(asString(left.provider) ?? '').localeCompare(
          normalizeProvider(asString(right.provider) ?? ''),
        ),
      )
      .map((row) => buildRecord(row as IntegrationRow));
  }

  async create(params: UpsertClubIntegrationInput): Promise<ClubIntegrationRecord> {
    const tables = this.requireContext(params);
    const provider = normalizeProvider(params.provider);
    const rows = ensureTable(tables, 'clubIntegrations');
    const existing = rows.find(
      (row) =>
        asString(row.clubId) === params.clubId &&
        normalizeProvider(asString(row.provider) ?? '') === provider &&
        !asString(row.deletedAt),
    );
    if (existing) {
      throw conflict('Club integration already exists for this provider');
    }
    const now = new Date().toISOString();
    const created: SeedRow = {
      id: `cint_${randomUUID()}`,
      clubId: params.clubId,
      provider,
      status: params.status ?? 'DISCONNECTED',
      displayName: params.displayName?.trim() || null,
      externalAccountId: params.externalAccountId?.trim() || null,
      metadataJson: params.metadataJson ?? null,
      createdByUserId: params.authUserId,
      updatedByUserId: params.authUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    };
    rows.unshift(created);
    return buildRecord(created);
  }

  async update(params: UpsertClubIntegrationInput): Promise<ClubIntegrationRecord> {
    const tables = this.requireContext(params);
    const provider = normalizeProvider(params.provider);
    const row = asRows(tables.clubIntegrations).find(
      (candidate) =>
        asString(candidate.clubId) === params.clubId &&
        normalizeProvider(asString(candidate.provider) ?? '') === provider &&
        !asString(candidate.deletedAt),
    );
    if (!row) {
      throw notFound('Club integration not found');
    }
    Object.assign(row, {
      ...(params.status !== undefined ? { status: params.status } : {}),
      ...(params.displayName !== undefined
        ? { displayName: params.displayName?.trim() || null }
        : {}),
      ...(params.externalAccountId !== undefined
        ? { externalAccountId: params.externalAccountId?.trim() || null }
        : {}),
      ...(params.metadataJson !== undefined ? { metadataJson: params.metadataJson } : {}),
      updatedByUserId: params.authUserId,
      updatedAt: new Date().toISOString(),
      version: Number(row.version ?? 1) + 1,
    });
    return buildRecord(row);
  }
}

class DbClubIntegrationRepository implements ClubIntegrationRepository {
  private readonly fixture = new SeedClubIntegrationRepository(() => getDbFixtureStore().tables);

  private async requireContext(params: {
    clubId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }) {
    const prisma = getPrismaClientOrThrow();
    const [club, viewerMembership] = await Promise.all([
      prisma.club.findFirst({
        where: {
          id: params.clubId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      }),
      prisma.clubMembership.findUnique({
        where: {
          clubId_userId: {
            clubId: params.clubId,
            userId: params.authUserId,
          },
        },
        select: {
          role: true,
          active: true,
          deletedAt: true,
        },
      }),
    ]);
    if (!club) {
      throw notFound('Club not found');
    }
    if (
      !params.isPrivilegedAdmin &&
      (!viewerMembership || !viewerMembership.active || viewerMembership.deletedAt)
    ) {
      throw forbidden('You do not have permission to manage club integrations');
    }
    if (!params.isPrivilegedAdmin) {
      requireClubAdminRole(viewerMembership?.role);
    }
  }

  async list(params: {
    clubId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubIntegrationRecord[]> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.list(params);
    }
    await this.requireContext(params);
    const prisma = getPrismaClientOrThrow();
    const rows = await prisma.clubIntegration.findMany({
      where: {
        clubId: params.clubId,
        deletedAt: null,
      },
      orderBy: {
        provider: 'asc',
      },
    });
    return normalizeForJson(rows.map(buildRecord));
  }

  async create(params: UpsertClubIntegrationInput): Promise<ClubIntegrationRecord> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.create(params);
    }
    await this.requireContext(params);
    const prisma = getPrismaClientOrThrow();
    const provider = normalizeProvider(params.provider);
    const existing = await prisma.clubIntegration.findFirst({
      where: {
        clubId: params.clubId,
        provider,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
    if (existing) {
      throw conflict('Club integration already exists for this provider');
    }
    const created = await prisma.clubIntegration.create({
      data: {
        id: `cint_${randomUUID()}`,
        clubId: params.clubId,
        provider,
        status: params.status ?? 'DISCONNECTED',
        displayName: params.displayName?.trim() || null,
        externalAccountId: params.externalAccountId?.trim() || null,
        metadataJson: toPrismaJson(params.metadataJson),
        createdByUserId: params.authUserId,
        updatedByUserId: params.authUserId,
      },
    });
    return normalizeForJson(buildRecord(created));
  }

  async update(params: UpsertClubIntegrationInput): Promise<ClubIntegrationRecord> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.update(params);
    }
    await this.requireContext(params);
    const prisma = getPrismaClientOrThrow();
    const provider = normalizeProvider(params.provider);
    const existing = await prisma.clubIntegration.findFirst({
      where: {
        clubId: params.clubId,
        provider,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
    if (!existing) {
      throw notFound('Club integration not found');
    }
    const updated = await prisma.clubIntegration.update({
      where: {
        id: existing.id,
      },
      data: {
        ...(params.status !== undefined ? { status: params.status } : {}),
        ...(params.displayName !== undefined
          ? { displayName: params.displayName?.trim() || null }
          : {}),
        ...(params.externalAccountId !== undefined
          ? { externalAccountId: params.externalAccountId?.trim() || null }
          : {}),
        ...(params.metadataJson !== undefined
          ? { metadataJson: toPrismaJson(params.metadataJson) }
          : {}),
        updatedByUserId: params.authUserId,
        version: {
          increment: 1n,
        },
      },
    });
    return normalizeForJson(buildRecord(updated));
  }
}

const seedRepository = new SeedClubIntegrationRepository(() => getMarketplaceSeedStore().tables);
const dbRepository = new DbClubIntegrationRepository();

export function resolveClubIntegrationRepository(): ClubIntegrationRepository {
  return getApiDataBackend() === 'db' ? dbRepository : seedRepository;
}
