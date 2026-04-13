import { forbidden, notFound } from '../../lib/http-errors.js';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { normalizeForJson } from './normalize.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

export interface FamilyAggregate {
  family: Record<string, unknown>;
  memberships: Array<Record<string, unknown>>;
  athletes: Array<Record<string, unknown>>;
  dataVersion: string | null;
}

export interface FamilyRepository {
  getFamilyAggregate(familyId: string, authUserId: string, isClubAdmin: boolean): Promise<FamilyAggregate>;
}

function fromTables(
  tables: SeedTables,
  familyId: string,
  authUserId: string,
  isClubAdmin: boolean,
  dataVersion: string | null,
): FamilyAggregate {
  const families = asRows(tables.families).filter((row) => !asString(row.deletedAt));
  const memberships = asRows(tables.familyMemberships).filter((row) => !asString(row.deletedAt));
  const athletes = asRows(tables.athletes).filter((row) => !asString(row.deletedAt));
  const guardianChildLinks = asRows(tables.guardianChildLinks).filter((row) => !asString(row.deletedAt));
  const childSenTags = asRows(tables.childSenTags).filter((row) => !asString(row.deletedAt));
  const childConsents = asRows(tables.childConsents);
  const users = asRows(tables.users).filter((row) => !asString(row.deletedAt));

  const family = families.find((row) => asString(row.id) === familyId);
  if (!family) {
    throw notFound('Family not found', { familyId });
  }

  const familyMemberships = memberships.filter((row) => asString(row.familyId) === familyId);
  const canAccess = isClubAdmin || familyMemberships.some((row) => asString(row.userId) === authUserId);
  if (!canAccess) {
    throw forbidden('Not allowed to access this family');
  }

  const familyAthleteIds = new Set(
    guardianChildLinks
      .filter((row) => asString(row.familyId) === familyId)
      .map((row) => asString(row.athleteId))
      .filter((id): id is string => Boolean(id)),
  );
  const familyAthletes = athletes
    .filter((row) => {
      const athleteId = asString(row.id);
      return Boolean(athleteId && familyAthleteIds.has(athleteId));
    })
    .map((athlete) => {
      const athleteId = asString(athlete.id) ?? '';
      return {
        ...athlete,
        guardians: guardianChildLinks.filter((row) => asString(row.athleteId) === athleteId),
        senTags: childSenTags.filter((row) => asString(row.athleteId) === athleteId),
        consents: childConsents.filter((row) => asString(row.athleteId) === athleteId),
      };
    });

  const membershipRows = familyMemberships.map((membership) => {
    const userId = asString(membership.userId);
    const user = users.find((row) => asString(row.id) === userId) ?? null;
    return {
      ...membership,
      user,
    };
  });

  return {
    family,
    memberships: membershipRows,
    athletes: familyAthletes,
    dataVersion,
  };
}

class SeedFamilyRepository implements FamilyRepository {
  async getFamilyAggregate(
    familyId: string,
    authUserId: string,
    isClubAdmin: boolean,
  ): Promise<FamilyAggregate> {
    const store = getMarketplaceSeedStore();
    return fromTables(store.tables, familyId, authUserId, isClubAdmin, store.version);
  }
}

class DbFamilyRepository implements FamilyRepository {
  async getFamilyAggregate(
    familyId: string,
    authUserId: string,
    isClubAdmin: boolean,
  ): Promise<FamilyAggregate> {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return fromTables(store.tables, familyId, authUserId, isClubAdmin, null);
    }

    const prisma = getPrismaClientOrThrow();
    const family = await prisma.family.findUnique({
      where: { id: familyId },
    });
    if (!family) {
      throw notFound('Family not found', { familyId });
    }

    const familyMemberships = await prisma.familyMembership.findMany({
      where: { familyId, deletedAt: null },
    });
    const canAccess = isClubAdmin || familyMemberships.some((row) => row.userId === authUserId);
    if (!canAccess) {
      throw forbidden('Not allowed to access this family');
    }

    const [users, guardianLinks] = await Promise.all([
      prisma.user.findMany({
        where: {
          id: {
            in: familyMemberships.map((row) => row.userId),
          },
        },
      }),
      prisma.guardianChildLink.findMany({
        where: { familyId, deletedAt: null },
      }),
    ]);

    const athleteIds = [...new Set(guardianLinks.map((row) => row.athleteId))];
    const [athletes, senTags, consents] = await Promise.all([
      prisma.athlete.findMany({
        where: {
          id: { in: athleteIds },
          deletedAt: null,
        },
      }),
      prisma.childSenTag.findMany({
        where: {
          athleteId: { in: athleteIds },
          deletedAt: null,
        },
      }),
      prisma.childConsent.findMany({
        where: {
          athleteId: { in: athleteIds },
        },
      }),
    ]);

    const membershipRows = familyMemberships.map((membership) => {
      const user = users.find((row) => row.id === membership.userId) ?? null;
      return {
        ...membership,
        user,
      };
    });

    const familyAthletes = athletes.map((athlete) => ({
      ...athlete,
      guardians: guardianLinks.filter((row) => row.athleteId === athlete.id),
      senTags: senTags.filter((row) => row.athleteId === athlete.id),
      consents: consents.filter((row) => row.athleteId === athlete.id),
    }));

    return normalizeForJson({
      family,
      memberships: membershipRows,
      athletes: familyAthletes,
      dataVersion: null,
    });
  }
}

const seedFamilyRepository = new SeedFamilyRepository();
const dbFamilyRepository = new DbFamilyRepository();

export function resolveFamilyRepository(): FamilyRepository {
  return getApiDataBackend() === 'db' ? dbFamilyRepository : seedFamilyRepository;
}
