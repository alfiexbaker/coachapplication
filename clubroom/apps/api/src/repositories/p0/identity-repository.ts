import { forbidden } from "../../lib/http-errors.js";
import { getApiDataBackend } from "../../lib/data-backend.js";
import { getMarketplaceSeedStore } from "../../lib/marketplace-seed-store.js";
import { getDbFixtureStore } from "../../lib/db-fixture-store.js";
import {
  getPrismaClientOrThrow,
  shouldUseDbFixtureFallback,
} from "../../lib/prisma-runtime.js";
import { normalizeForJson } from "./normalize.js";
type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;
const asRows = (value: unknown): SeedRow[] =>
  Array.isArray(value) ? (value as SeedRow[]) : [];
const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;
export interface IdentityMeAggregate {
  user: {
    id?: string;
    name?: string;
    email?: string;
    avatarUrl: string | null;
    locale: string | null;
    timeZone: string | null;
  };
  profile: Record<string, unknown> | null;
  roles: string[];
  linkedFamilies: Array<{
    familyId: string | undefined;
    familyName: string | null;
    role: string | null;
    relationshipLabel: string | null;
    childAccessAthleteIds: unknown[];
  }>;
  linkedAthletes: Array<{
    athleteId: string | null;
    displayName: string | null;
    status: string | null;
  }>;
  dataVersion: string | null;
}
export interface IdentityRepository {
  getMe(authUserId: string): Promise<IdentityMeAggregate>;
}
function fromTables(
  tables: SeedTables,
  authUserId: string,
  dataVersion: string | null,
): IdentityMeAggregate {
  const users = asRows(tables.users);
  const profiles = asRows(tables.userProfiles);
  const roleMemberships = asRows(tables.userRoleMemberships);
  const familyMemberships = asRows(tables.familyMemberships);
  const families = asRows(tables.families);
  const athletes = asRows(tables.athletes);
  const user = users.find((row) => asString(row.id) === authUserId);
  if (!user) {
    throw forbidden(`Authenticated user ${authUserId} does not exist`);
  }
  const profile =
    profiles.find((row) => asString(row.userId) === authUserId) ?? null;
  const roles = roleMemberships.flatMap((row) => {
    if (!(asString(row.userId) === authUserId)) return [];
    const mapped = asString(row.role);
    return Boolean(mapped) ? [mapped] : [];
  });
  const linkedFamilies = familyMemberships.flatMap((row) => {
    if (!(asString(row.userId) === authUserId)) return [];
    const familyId = asString(row.familyId);
    const family = families.find((item) => asString(item.id) === familyId);
    return [
      {
        familyId,
        familyName: asString(family?.name) ?? null,
        role: asString(row.role) ?? null,
        relationshipLabel: asString(row.relationshipLabel) ?? null,
        childAccessAthleteIds: Array.isArray(row.childAccessAthleteIds)
          ? row.childAccessAthleteIds
          : [],
      },
    ];
  });
  const linkedAthletes = athletes.flatMap((row) =>
    asString(row.userId) === authUserId
      ? [
          {
            athleteId: asString(row.id) ?? null,
            displayName: asString(row.displayName) ?? null,
            status: asString(row.status) ?? null,
          },
        ]
      : [],
  );
  return {
    user: {
      id: asString(user.id),
      name: asString(user.name),
      email: asString(user.email),
      avatarUrl: asString(user.avatarUrl) ?? null,
      locale: asString(user.locale) ?? null,
      timeZone: asString(user.timeZone) ?? null,
    },
    profile,
    roles,
    linkedFamilies,
    linkedAthletes,
    dataVersion,
  };
}
class SeedIdentityRepository implements IdentityRepository {
  async getMe(authUserId: string): Promise<IdentityMeAggregate> {
    const store = getMarketplaceSeedStore();
    return fromTables(store.tables, authUserId, store.version);
  }
}
class DbIdentityRepository implements IdentityRepository {
  async getMe(authUserId: string): Promise<IdentityMeAggregate> {
    if (shouldUseDbFixtureFallback()) {
      const store = getDbFixtureStore();
      return fromTables(store.tables, authUserId, null);
    }
    const prisma = getPrismaClientOrThrow();
    const user = await prisma.user.findUnique({
      where: {
        id: authUserId,
      },
    });
    if (!user) {
      throw forbidden(`Authenticated user ${authUserId} does not exist`);
    }
    const [profile, roleMemberships, familyMemberships, linkedAthletes] =
      await Promise.all([
        prisma.userProfile.findUnique({
          where: {
            userId: authUserId,
          },
        }),
        prisma.userRoleMembership.findMany({
          where: {
            userId: authUserId,
          },
        }),
        prisma.familyMembership.findMany({
          where: {
            userId: authUserId,
          },
          include: {
            family: true,
          },
        }),
        prisma.athlete.findMany({
          where: {
            userId: authUserId,
          },
        }),
      ]);
    const payload: IdentityMeAggregate = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email ?? undefined,
        avatarUrl: user.avatarUrl ?? null,
        locale: user.locale ?? null,
        timeZone: user.timeZone ?? null,
      },
      profile: profile
        ? normalizeForJson(profile as Record<string, unknown>)
        : null,
      roles: roleMemberships.map((row) => row.role),
      linkedFamilies: familyMemberships.map((row) => ({
        familyId: row.familyId,
        familyName: row.family?.name ?? null,
        role: row.role ?? null,
        relationshipLabel: row.relationshipLabel ?? null,
        childAccessAthleteIds: row.childAccessAthleteIds,
      })),
      linkedAthletes: linkedAthletes.map((row) => ({
        athleteId: row.id,
        displayName: row.displayName,
        status: row.status,
      })),
      dataVersion: null,
    };
    return normalizeForJson(payload);
  }
}
const seedIdentityRepository = new SeedIdentityRepository();
const dbIdentityRepository = new DbIdentityRepository();
export function resolveIdentityRepository(): IdentityRepository {
  return getApiDataBackend() === "db"
    ? dbIdentityRepository
    : seedIdentityRepository;
}
