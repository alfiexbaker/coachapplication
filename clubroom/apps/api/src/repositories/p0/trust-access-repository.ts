import { getApiDataBackend } from '../../lib/data-backend.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { normalizeForJson } from './normalize.js';
type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;
const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const supportedDirectAccessScopes = new Set([
  'athlete_progress:read',
  'athlete_progress:write',
  'session_note:read',
  'medical.read',
  'medical.manage',
  'safeguarding.read',
  'safeguarding.manage',
]);
export interface TrustAdminOverview {
  grants: Array<Record<string, unknown>>;
  auditEvents: Array<Record<string, unknown>>;
  securityEvents: Array<Record<string, unknown>>;
  retentionPolicies: Array<Record<string, unknown>>;
  legalHolds: Array<Record<string, unknown>>;
  dataVersion: string | null;
}
export interface TrustAccessRepository {
  getGuardianAthleteIds(userId: string): Promise<string[]>;
  getCoachAthleteIds(userId: string): Promise<string[]>;
  isVerifiedCoach(userId: string): Promise<boolean>;
  getTrustAdminOverview(): Promise<TrustAdminOverview>;
}
function isActiveRow(row: SeedRow): boolean {
  return !asString(row.deletedAt);
}
function isActiveGrant(row: SeedRow): boolean {
  if (asString(row.revokedAt)) {
    return false;
  }
  const expiresAt = asString(row.expiresAt);
  return !expiresAt || Date.parse(expiresAt) > Date.now();
}
function extractGrantedAthleteIds(
  accessGrants: SeedRow[],
  accessGrantScopes: SeedRow[],
  granteeUserId: string,
): string[] {
  const grantedAthleteIds: string[] = [];
  const readableScopes = new Set([
    'athlete_progress:read',
    'athlete_progress:write',
    'session_note:read',
    'medical.read',
    'medical.manage',
    'safeguarding.read',
    'safeguarding.manage',
  ]);

  for (const grant of accessGrants) {
    if (asString(grant.granteeUserId) !== granteeUserId || !isActiveGrant(grant)) {
      continue;
    }

    const grantId = asString(grant.id);
    if (!grantId) {
      continue;
    }

    const hasReadableScope = accessGrantScopes.some((scope) => {
      const scopeName = asString(scope.scope);
      return (
        asString(scope.accessGrantId) === grantId &&
        Boolean(scopeName && readableScopes.has(scopeName))
      );
    });
    if (!hasReadableScope) {
      continue;
    }

    const constraints = grant.constraintsJson as
      | {
          athleteId?: unknown;
        }
      | undefined;
    if (typeof constraints?.athleteId === 'string') {
      grantedAthleteIds.push(constraints.athleteId);
    }
  }

  return grantedAthleteIds;
}
function buildTrustAdminOverviewFromTables(
  tables: SeedTables,
  dataVersion: string | null,
): TrustAdminOverview {
  const grants = asRows(tables.accessGrants);
  const scopes = asRows(tables.accessGrantScopes);
  return {
    grants: grants.map((grant) => ({
      ...grant,
      scopes: scopes.filter((scope) => asString(scope.accessGrantId) === asString(grant.id)),
    })),
    auditEvents: asRows(tables.auditEvents),
    securityEvents: asRows(tables.securityEvents),
    retentionPolicies: asRows(tables.retentionPolicies),
    legalHolds: asRows(tables.legalHolds),
    dataVersion,
  };
}
class SeedTrustAccessRepository implements TrustAccessRepository {
  async getGuardianAthleteIds(userId: string): Promise<string[]> {
    return asRows(getMarketplaceSeedStore().tables.guardianChildLinks).flatMap((row) => {
      if (!(isActiveRow(row) && asString(row.guardianUserId) === userId)) return [];
      const mapped = asString(row.athleteId);
      return mapped ? [mapped] : [];
    });
  }
  async getCoachAthleteIds(userId: string): Promise<string[]> {
    const tables = getMarketplaceSeedStore().tables;
    const bookings = asRows(tables.bookings).filter(
      (row) => isActiveRow(row) && asString(row.coachUserId) === userId,
    );
    const bookingIds = new Set(
      bookings.flatMap((row) => {
        const mapped = asString(row.id);
        return Boolean(mapped) ? [mapped] : [];
      }),
    );
    const groupSessions = asRows(tables.groupSessions).filter(
      (row) => isActiveRow(row) && asString(row.coachUserId) === userId,
    );
    const groupSessionIds = new Set(
      groupSessions.flatMap((row) => {
        const mapped = asString(row.id);
        return Boolean(mapped) ? [mapped] : [];
      }),
    );
    const squads = asRows(tables.squads).filter(
      (row) => isActiveRow(row) && asString(row.ownerCoachUserId) === userId,
    );
    const squadIds = new Set(
      squads.flatMap((row) => {
        const mapped = asString(row.id);
        return Boolean(mapped) ? [mapped] : [];
      }),
    );
    const athleteIds = new Set<string>();
    for (const participant of asRows(tables.bookingParticipants)) {
      if (!isActiveRow(participant)) {
        continue;
      }
      if (bookingIds.has(asString(participant.bookingId) ?? '')) {
        const athleteId = asString(participant.athleteId);
        if (athleteId) {
          athleteIds.add(athleteId);
        }
      }
    }
    for (const registration of asRows(tables.groupSessionRegistrations)) {
      if (!isActiveRow(registration)) {
        continue;
      }
      if (groupSessionIds.has(asString(registration.groupSessionId) ?? '')) {
        const athleteId = asString(registration.athleteId);
        if (athleteId) {
          athleteIds.add(athleteId);
        }
      }
    }
    for (const membership of asRows(tables.squadMemberships)) {
      if (!isActiveRow(membership)) {
        continue;
      }
      if (squadIds.has(asString(membership.squadId) ?? '')) {
        const athleteId = asString(membership.athleteId);
        if (athleteId) {
          athleteIds.add(athleteId);
        }
      }
    }
    for (const athleteId of extractGrantedAthleteIds(
      asRows(tables.accessGrants),
      asRows(tables.accessGrantScopes),
      userId,
    )) {
      athleteIds.add(athleteId);
    }
    return [...athleteIds];
  }
  async isVerifiedCoach(userId: string): Promise<boolean> {
    const tables = getMarketplaceSeedStore().tables;
    const user = asRows(tables.users).find((row) => asString(row.id) === userId);
    if (user?.isVerified === true) {
      return true;
    }
    const coachProfile = asRows(tables.coachProfiles).find(
      (row) => asString(row.userId) === userId,
    );
    if (coachProfile?.dbsChecked === true) {
      return true;
    }
    return asRows(tables.coachVerifications).some((row) => {
      if (asString(row.coachUserId) !== userId) {
        return false;
      }
      if (asString(row.verificationType) !== 'DBS' || asString(row.status) !== 'APPROVED') {
        return false;
      }
      const expiresAt = asString(row.expiresAt);
      return !expiresAt || Date.parse(expiresAt) > Date.now();
    });
  }
  async getTrustAdminOverview(): Promise<TrustAdminOverview> {
    const store = getMarketplaceSeedStore();
    return buildTrustAdminOverviewFromTables(store.tables, store.version);
  }
}
class DbTrustAccessRepository implements TrustAccessRepository {
  async getGuardianAthleteIds(userId: string): Promise<string[]> {
    if (shouldUseDbFixtureFallback()) {
      return new FixtureTrustAccessRepository().getGuardianAthleteIds(userId);
    }
    const prisma = getPrismaClientOrThrow();
    const links = await prisma.guardianChildLink.findMany({
      where: {
        guardianUserId: userId,
        deletedAt: null,
      },
      select: {
        athleteId: true,
      },
    });
    return links.map((row) => row.athleteId);
  }
  async getCoachAthleteIds(userId: string): Promise<string[]> {
    if (shouldUseDbFixtureFallback()) {
      return new FixtureTrustAccessRepository().getCoachAthleteIds(userId);
    }
    const prisma = getPrismaClientOrThrow();
    const [bookingParticipants, registrations, squadMemberships, accessGrants] = await Promise.all([
      prisma.bookingParticipant.findMany({
        where: {
          deletedAt: null,
          booking: {
            coachUserId: userId,
            deletedAt: null,
          },
        },
        select: {
          athleteId: true,
        },
      }),
      prisma.groupSessionRegistration.findMany({
        where: {
          deletedAt: null,
          groupSession: {
            coachUserId: userId,
            deletedAt: null,
          },
        },
        select: {
          athleteId: true,
        },
      }),
      prisma.squadMembership.findMany({
        where: {
          deletedAt: null,
          squad: {
            ownerCoachUserId: userId,
            deletedAt: null,
          },
        },
        select: {
          athleteId: true,
        },
      }),
      prisma.accessGrant.findMany({
        where: {
          granteeUserId: userId,
          revokedAt: null,
          OR: [
            {
              expiresAt: null,
            },
            {
              expiresAt: {
                gt: new Date(),
              },
            },
          ],
        },
        include: {
          scopes: true,
        },
      }),
    ]);
    const athleteIds = new Set<string>();
    for (const row of bookingParticipants) {
      athleteIds.add(row.athleteId);
    }
    for (const row of registrations) {
      athleteIds.add(row.athleteId);
    }
    for (const row of squadMemberships) {
      athleteIds.add(row.athleteId);
    }
    for (const grant of accessGrants) {
      const hasSupportedScope = grant.scopes.some((scope) =>
        supportedDirectAccessScopes.has(scope.scope),
      );
      if (!hasSupportedScope) {
        continue;
      }
      const constraints = grant.constraintsJson as {
        athleteId?: unknown;
      } | null;
      if (typeof constraints?.athleteId === 'string') {
        athleteIds.add(constraints.athleteId);
      }
    }
    return [...athleteIds];
  }
  async isVerifiedCoach(userId: string): Promise<boolean> {
    if (shouldUseDbFixtureFallback()) {
      return new FixtureTrustAccessRepository().isVerifiedCoach(userId);
    }
    const prisma = getPrismaClientOrThrow();
    const [user, coachProfile, verification] = await Promise.all([
      prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          isVerified: true,
        },
      }),
      prisma.coachProfile.findUnique({
        where: {
          userId,
        },
        select: {
          dbsChecked: true,
        },
      }),
      prisma.coachVerification.findFirst({
        where: {
          coachUserId: userId,
          verificationType: 'DBS',
          status: 'APPROVED',
          OR: [
            {
              expiresAt: null,
            },
            {
              expiresAt: {
                gt: new Date(),
              },
            },
          ],
        },
        select: {
          id: true,
        },
      }),
    ]);
    return user?.isVerified === true || coachProfile?.dbsChecked === true || Boolean(verification);
  }
  async getTrustAdminOverview(): Promise<TrustAdminOverview> {
    if (shouldUseDbFixtureFallback()) {
      return new FixtureTrustAccessRepository().getTrustAdminOverview();
    }
    const prisma = getPrismaClientOrThrow();
    const [grants, auditEvents, securityEvents, retentionPolicies, legalHolds] = await Promise.all([
      prisma.accessGrant.findMany({
        include: {
          scopes: true,
        },
      }),
      prisma.auditEvent.findMany({
        orderBy: {
          occurredAt: 'desc',
        },
      }),
      prisma.securityEvent.findMany({
        orderBy: {
          occurredAt: 'desc',
        },
      }),
      prisma.retentionPolicy.findMany({
        orderBy: {
          tableName: 'asc',
        },
      }),
      prisma.legalHold.findMany({
        orderBy: {
          placedAt: 'desc',
        },
      }),
    ]);
    return normalizeForJson({
      grants,
      auditEvents,
      securityEvents,
      retentionPolicies,
      legalHolds,
      dataVersion: null,
    });
  }
}
class FixtureTrustAccessRepository extends SeedTrustAccessRepository {
  async getGuardianAthleteIds(userId: string): Promise<string[]> {
    return asRows(getDbFixtureStore().tables.guardianChildLinks).flatMap((row) => {
      if (!(isActiveRow(row) && asString(row.guardianUserId) === userId)) return [];
      const mapped = asString(row.athleteId);
      return mapped ? [mapped] : [];
    });
  }
  async getCoachAthleteIds(userId: string): Promise<string[]> {
    const tables = getDbFixtureStore().tables;
    return buildTrustAccessFromFixtureTables(tables, userId);
  }
  async isVerifiedCoach(userId: string): Promise<boolean> {
    const tables = getDbFixtureStore().tables;
    const user = asRows(tables.users).find((row) => asString(row.id) === userId);
    if (user?.isVerified === true) {
      return true;
    }
    const coachProfile = asRows(tables.coachProfiles).find(
      (row) => asString(row.userId) === userId,
    );
    if (coachProfile?.dbsChecked === true) {
      return true;
    }
    return asRows(tables.coachVerifications).some((row) => {
      if (asString(row.coachUserId) !== userId) {
        return false;
      }
      if (asString(row.verificationType) !== 'DBS' || asString(row.status) !== 'APPROVED') {
        return false;
      }
      const expiresAt = asString(row.expiresAt);
      return !expiresAt || Date.parse(expiresAt) > Date.now();
    });
  }
  async getTrustAdminOverview(): Promise<TrustAdminOverview> {
    return buildTrustAdminOverviewFromTables(getDbFixtureStore().tables, null);
  }
}
function buildTrustAccessFromFixtureTables(tables: SeedTables, userId: string): string[] {
  const bookings = asRows(tables.bookings).filter(
    (row) => isActiveRow(row) && asString(row.coachUserId) === userId,
  );
  const bookingIds = new Set(
    bookings.flatMap((row) => {
      const mapped = asString(row.id);
      return Boolean(mapped) ? [mapped] : [];
    }),
  );
  const groupSessions = asRows(tables.groupSessions).filter(
    (row) => isActiveRow(row) && asString(row.coachUserId) === userId,
  );
  const groupSessionIds = new Set(
    groupSessions.flatMap((row) => {
      const mapped = asString(row.id);
      return Boolean(mapped) ? [mapped] : [];
    }),
  );
  const squads = asRows(tables.squads).filter(
    (row) => isActiveRow(row) && asString(row.ownerCoachUserId) === userId,
  );
  const squadIds = new Set(
    squads.flatMap((row) => {
      const mapped = asString(row.id);
      return Boolean(mapped) ? [mapped] : [];
    }),
  );
  const athleteIds = new Set<string>();
  for (const participant of asRows(tables.bookingParticipants)) {
    if (!isActiveRow(participant)) {
      continue;
    }
    if (bookingIds.has(asString(participant.bookingId) ?? '')) {
      const athleteId = asString(participant.athleteId);
      if (athleteId) {
        athleteIds.add(athleteId);
      }
    }
  }
  for (const registration of asRows(tables.groupSessionRegistrations)) {
    if (!isActiveRow(registration)) {
      continue;
    }
    if (groupSessionIds.has(asString(registration.groupSessionId) ?? '')) {
      const athleteId = asString(registration.athleteId);
      if (athleteId) {
        athleteIds.add(athleteId);
      }
    }
  }
  for (const membership of asRows(tables.squadMemberships)) {
    if (!isActiveRow(membership)) {
      continue;
    }
    if (squadIds.has(asString(membership.squadId) ?? '')) {
      const athleteId = asString(membership.athleteId);
      if (athleteId) {
        athleteIds.add(athleteId);
      }
    }
  }
  for (const athleteId of extractGrantedAthleteIds(
    asRows(tables.accessGrants),
    asRows(tables.accessGrantScopes),
    userId,
  )) {
    athleteIds.add(athleteId);
  }
  return [...athleteIds];
}
const seedTrustAccessRepository = new SeedTrustAccessRepository();
const dbTrustAccessRepository = new DbTrustAccessRepository();
export function resolveTrustAccessRepository(): TrustAccessRepository {
  return getApiDataBackend() === 'db' ? dbTrustAccessRepository : seedTrustAccessRepository;
}
