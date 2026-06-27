import { canUseClubCapability, parseOrganizationRole } from '@clubroom/shared-contracts';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { forbidden, notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asIsoString = (value: unknown, fallback = new Date().toISOString()): string =>
  typeof value === 'string' ? value : value instanceof Date ? value.toISOString() : fallback;

export interface ClubBrandingRecord {
  clubId: string;
  name: string;
  tagline: string;
  badgeUrl: string;
  coverPhotoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  updatedAt: string;
}

export interface ClubBrandingPatch {
  name?: string;
  tagline?: string;
  badgeUrl?: string;
  coverPhotoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

interface ClubBrandingRepository {
  getClubBranding(params: {
    clubId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubBrandingRecord>;
  updateClubBranding(params: {
    clubId: string;
    patch: ClubBrandingPatch;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubBrandingRecord>;
}

interface BrandingClubRow {
  id?: unknown;
  name?: unknown;
  tagline?: unknown;
  badgeUrl?: unknown;
  coverPhotoUrl?: unknown;
  primaryColor?: unknown;
  secondaryColor?: unknown;
  updatedAt?: unknown;
}

function buildClubBrandingRecord(club: BrandingClubRow): ClubBrandingRecord {
  return {
    clubId: asString(club.id) ?? '',
    name: asString(club.name) ?? 'Club',
    tagline: asString(club.tagline) ?? '',
    badgeUrl: asString(club.badgeUrl) ?? '',
    coverPhotoUrl: asString(club.coverPhotoUrl) ?? '',
    primaryColor: asString(club.primaryColor) ?? '#0F172A',
    secondaryColor: asString(club.secondaryColor) ?? '#1C8C5E',
    updatedAt: asIsoString(club.updatedAt),
  };
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

function requireEditClubProfile(role: unknown): void {
  const parsedRole = parseOrganizationRole(role);
  if (!parsedRole || !canUseClubCapability(parsedRole, 'edit_org_profile')) {
    throw forbidden('You do not have permission to edit the club profile');
  }
}

class SeedClubBrandingRepository implements ClubBrandingRepository {
  constructor(private readonly getTables: () => SeedTables) {}

  private requireReadContext(params: {
    clubId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): { club: SeedRow; viewerMembership: SeedRow | null } {
    const tables = this.getTables();
    const club = findStoreClub(tables, params.clubId);
    if (!club) {
      throw notFound('Club not found');
    }
    const viewerMembership = findActiveStoreMembership(tables, params.clubId, params.authUserId);
    if (!params.isPrivilegedAdmin && !viewerMembership) {
      throw forbidden('You do not have permission to view the club profile');
    }
    return { club, viewerMembership };
  }

  async getClubBranding(params: {
    clubId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubBrandingRecord> {
    return buildClubBrandingRecord(this.requireReadContext(params).club);
  }

  async updateClubBranding(params: {
    clubId: string;
    patch: ClubBrandingPatch;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubBrandingRecord> {
    const context = this.requireReadContext(params);
    if (!params.isPrivilegedAdmin) {
      requireEditClubProfile(context.viewerMembership?.role);
    }
    const now = new Date().toISOString();
    Object.assign(context.club, params.patch, {
      updatedByUserId: params.authUserId,
      updatedAt: now,
      version: Number(context.club.version ?? 0) + 1,
    });
    return buildClubBrandingRecord(context.club);
  }
}

class DbClubBrandingRepository implements ClubBrandingRepository {
  private readonly fixture = new SeedClubBrandingRepository(() => getDbFixtureStore().tables);

  private async requireReadContext(params: {
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
      }),
      prisma.clubMembership.findUnique({
        where: {
          clubId_userId: {
            clubId: params.clubId,
            userId: params.authUserId,
          },
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
      throw forbidden('You do not have permission to view the club profile');
    }
    return { club, viewerMembership };
  }

  async getClubBranding(params: {
    clubId: string;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubBrandingRecord> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.getClubBranding(params);
    }
    return buildClubBrandingRecord((await this.requireReadContext(params)).club);
  }

  async updateClubBranding(params: {
    clubId: string;
    patch: ClubBrandingPatch;
    authUserId: string;
    isPrivilegedAdmin: boolean;
  }): Promise<ClubBrandingRecord> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.updateClubBranding(params);
    }
    const context = await this.requireReadContext(params);
    if (!params.isPrivilegedAdmin) {
      requireEditClubProfile(context.viewerMembership?.role);
    }
    const prisma = getPrismaClientOrThrow();
    const club = await prisma.club.update({
      where: {
        id: params.clubId,
      },
      data: {
        ...params.patch,
        updatedByUserId: params.authUserId,
        version: {
          increment: 1n,
        },
      },
    });
    return buildClubBrandingRecord(club);
  }
}

const seedRepository = new SeedClubBrandingRepository(() => getMarketplaceSeedStore().tables);
const dbRepository = new DbClubBrandingRepository();

export function resolveClubBrandingRepository(): ClubBrandingRepository {
  return getApiDataBackend() === 'db' ? dbRepository : seedRepository;
}
