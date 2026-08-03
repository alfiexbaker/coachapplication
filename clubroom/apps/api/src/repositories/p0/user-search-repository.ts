import type { UserDirectoryEntry, UserDirectoryRole } from '@clubroom/shared-contracts';

import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { normalizeForJson } from './normalize.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

export type UserSearchResult = UserDirectoryEntry;

export interface UserSearchParams {
  authUserId: string;
  query: string;
  limit?: number;
}

export interface UserProfileReadParams {
  authUserId: string;
  userId: string;
}

export interface UserSearchResponse {
  users: UserSearchResult[];
  total: number;
  dataVersion: string | null;
}

export interface UserSearchRepository {
  searchUsers(params: UserSearchParams): Promise<UserSearchResponse>;
  getUserById(params: UserProfileReadParams): Promise<{
    user: UserSearchResult | null;
    dataVersion: string | null;
  }>;
}

const DEFAULT_LIMIT = 20;
const CANDIDATE_LIMIT = 80;

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function isEmailQuery(query: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query);
}

function mapRole(role: string | undefined): UserDirectoryRole {
  switch (role) {
    case 'coach':
    case 'COACH':
      return 'COACH';
    case 'parent':
    case 'PARENT':
      return 'PARENT';
    case 'admin':
    case 'club_admin':
    case 'security_admin':
    case 'support':
      return 'ADMIN';
    default:
      return 'USER';
  }
}

function isUnder18(dateOfBirth: string | undefined, now = new Date()): boolean {
  if (!dateOfBirth) return false;
  const parsed = new Date(dateOfBirth);
  if (!Number.isFinite(parsed.getTime())) return false;
  let age = now.getUTCFullYear() - parsed.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - parsed.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < parsed.getUTCDate())) {
    age -= 1;
  }
  return age < 18;
}

function resolveSeedStore(): { tables: SeedTables; version: string | null } | null {
  if (getApiDataBackend() === 'seed') {
    const store = getMarketplaceSeedStore();
    return { tables: store.tables, version: store.version };
  }
  if (shouldUseDbFixtureFallback()) {
    const store = getDbFixtureStore();
    return { tables: store.tables, version: store.version };
  }
  return null;
}

function seedRolesByUser(tables: SeedTables): Map<string, string[]> {
  const roles = new Map<string, string[]>();
  for (const row of asRows(tables.userRoleMemberships)) {
    if (row.active === false || asString(row.revokedAt)) continue;
    const userId = asString(row.userId);
    const role = asString(row.role);
    if (!userId || !role) continue;
    const existing = roles.get(userId) ?? [];
    existing.push(role);
    roles.set(userId, existing);
  }
  return roles;
}

function seedRelationshipsForSearch(params: {
  tables: SeedTables;
  authUserId: string;
}): Set<string> {
  const relatedUserIds = new Set<string>([params.authUserId]);
  const requesterFamilyIds = new Set(
    asRows(params.tables.familyMemberships)
      .filter((row) => asString(row.userId) === params.authUserId && !asString(row.deletedAt))
      .flatMap((row) => {
        const familyId = asString(row.familyId);
        return familyId ? [familyId] : [];
      }),
  );

  for (const row of asRows(params.tables.familyMemberships)) {
    const familyId = asString(row.familyId);
    const userId = asString(row.userId);
    if (familyId && userId && requesterFamilyIds.has(familyId) && !asString(row.deletedAt)) {
      relatedUserIds.add(userId);
    }
  }

  const linkedAthleteIds = new Set<string>();
  for (const row of asRows(params.tables.guardianChildLinks)) {
    if (asString(row.guardianUserId) === params.authUserId && !asString(row.deletedAt)) {
      const athleteId = asString(row.athleteId);
      if (athleteId) linkedAthleteIds.add(athleteId);
    }
  }
  for (const participant of asRows(params.tables.bookingParticipants)) {
    const booking = asRows(params.tables.bookings).find(
      (row) => asString(row.id) === asString(participant.bookingId),
    );
    if (
      asString(booking?.coachUserId) === params.authUserId &&
      asString(booking?.status) !== 'CANCELLED' &&
      !asString(booking?.deletedAt)
    ) {
      const athleteId = asString(participant.athleteId);
      if (athleteId) linkedAthleteIds.add(athleteId);
    }
  }

  for (const athlete of asRows(params.tables.athletes)) {
    const athleteId = asString(athlete.id);
    const userId = asString(athlete.userId);
    if (athleteId && userId && linkedAthleteIds.has(athleteId)) {
      relatedUserIds.add(userId);
    }
  }

  return relatedUserIds;
}

function seedBlockedUserIdsForSearch(tables: SeedTables, authUserId: string): Set<string> {
  const blocked = new Set<string>();
  for (const row of asRows(tables.userBlocks)) {
    if (asString(row.deletedAt)) continue;
    const blockerUserId = asString(row.blockerUserId);
    const blockedUserId = asString(row.blockedUserId);
    if (blockerUserId === authUserId && blockedUserId) {
      blocked.add(blockedUserId);
    }
    if (blockedUserId === authUserId && blockerUserId) {
      blocked.add(blockerUserId);
    }
  }
  return blocked;
}

function seedMatchesQuery(user: SeedRow, profile: SeedRow | undefined, query: string): boolean {
  const email = asString(user.email)?.toLowerCase() ?? '';
  if (isEmailQuery(query)) return email === query;
  const haystack = [
    asString(user.name),
    asString(profile?.postcode),
    asString(profile?.city),
    asString(profile?.sport),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function mapSeedUser(params: {
  user: SeedRow;
  profile: SeedRow | undefined;
  privacy: SeedRow | undefined;
  roles: string[];
  query: string;
  isRelated: boolean;
}): UserSearchResult | null {
  const id = asString(params.user.id);
  const name = asString(params.user.name);
  if (!id || !name) return null;

  const email = asString(params.user.email);
  const exactEmail = Boolean(email && email.toLowerCase() === params.query);
  const includeEmail = params.isRelated || exactEmail;
  const showLocation = asBoolean(params.privacy?.showLocation) !== false;
  return {
    id,
    name,
    ...(includeEmail && email ? { email } : {}),
    ...(asString(params.user.avatarUrl) ? { avatar: asString(params.user.avatarUrl) } : {}),
    ...(showLocation && asString(params.profile?.postcode)
      ? { postcode: asString(params.profile?.postcode) }
      : {}),
    role: mapRole(params.roles[0]),
  };
}

function searchSeedUsers(params: UserSearchParams): UserSearchResponse {
  const store = resolveSeedStore();
  if (!store) {
    throw new Error('Seed search requested without seed store');
  }
  const query = normalizeQuery(params.query);
  if (query.length < 2) {
    return { users: [], total: 0, dataVersion: store.version };
  }

  const profiles = asRows(store.tables.userProfiles);
  const privacySettings = asRows(store.tables.userPrivacySettings);
  const rolesByUser = seedRolesByUser(store.tables);
  const relatedUserIds = seedRelationshipsForSearch({
    tables: store.tables,
    authUserId: params.authUserId,
  });
  const blockedUserIds = seedBlockedUserIdsForSearch(store.tables, params.authUserId);
  const athleteByUserId = new Map(
    asRows(store.tables.athletes).flatMap((athlete) => {
      const userId = asString(athlete.userId);
      return userId ? [[userId, athlete] as const] : [];
    }),
  );

  const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), DEFAULT_LIMIT);
  const users = asRows(store.tables.users)
    .filter((user) => asString(user.accountStatus) !== 'disabled' && !asString(user.deletedAt))
    .filter((user) => {
      const profile = profiles.find((row) => asString(row.userId) === asString(user.id));
      return seedMatchesQuery(user, profile, query);
    })
    .flatMap((user) => {
      const userId = asString(user.id);
      if (!userId) return [];
      if (blockedUserIds.has(userId)) return [];
      const profile = profiles.find((row) => asString(row.userId) === userId);
      const privacy = privacySettings.find((row) => asString(row.userId) === userId);
      const athlete = athleteByUserId.get(userId);
      const related = relatedUserIds.has(userId);
      const minor =
        isUnder18(asString(profile?.dateOfBirth)) || isUnder18(asString(athlete?.dateOfBirth));
      if (minor && !related) return [];
      const profileVisible = asBoolean(privacy?.profileVisible) !== false;
      const email = asString(user.email)?.toLowerCase() ?? '';
      const exactEmail = email === query;
      if (!minor && !profileVisible && !related && !exactEmail) return [];
      const mapped = mapSeedUser({
        user,
        profile,
        privacy,
        roles: rolesByUser.get(userId) ?? [],
        query,
        isRelated: related,
      });
      return mapped ? [mapped] : [];
    })
    .slice(0, limit);

  return { users, total: users.length, dataVersion: store.version };
}

function getSeedUserById(params: UserProfileReadParams): {
  user: UserSearchResult | null;
  dataVersion: string | null;
} {
  const store = resolveSeedStore();
  if (!store) {
    throw new Error('Seed profile read requested without seed store');
  }

  const user = asRows(store.tables.users).find(
    (row) =>
      asString(row.id) === params.userId &&
      asString(row.accountStatus) !== 'disabled' &&
      !asString(row.deletedAt),
  );
  if (!user) {
    return { user: null, dataVersion: store.version };
  }

  const blockedUserIds = seedBlockedUserIdsForSearch(store.tables, params.authUserId);
  if (blockedUserIds.has(params.userId)) {
    return { user: null, dataVersion: store.version };
  }

  const profiles = asRows(store.tables.userProfiles);
  const privacySettings = asRows(store.tables.userPrivacySettings);
  const rolesByUser = seedRolesByUser(store.tables);
  const relatedUserIds = seedRelationshipsForSearch({
    tables: store.tables,
    authUserId: params.authUserId,
  });
  const profile = profiles.find((row) => asString(row.userId) === params.userId);
  const privacy = privacySettings.find((row) => asString(row.userId) === params.userId);
  const athlete = asRows(store.tables.athletes).find(
    (row) => asString(row.userId) === params.userId,
  );
  const related = relatedUserIds.has(params.userId);
  const minor =
    isUnder18(asString(profile?.dateOfBirth)) || isUnder18(asString(athlete?.dateOfBirth));
  if (minor && !related) {
    return { user: null, dataVersion: store.version };
  }
  const profileVisible = asBoolean(privacy?.profileVisible) !== false;
  if (!minor && !profileVisible && !related) {
    return { user: null, dataVersion: store.version };
  }

  return {
    user: mapSeedUser({
      user,
      profile,
      privacy,
      roles: rolesByUser.get(params.userId) ?? [],
      query: '',
      isRelated: related,
    }),
    dataVersion: store.version,
  };
}

class DefaultUserSearchRepository implements UserSearchRepository {
  async searchUsers(params: UserSearchParams): Promise<UserSearchResponse> {
    const seedStore = resolveSeedStore();
    if (seedStore) {
      return searchSeedUsers(params);
    }

    const query = normalizeQuery(params.query);
    if (query.length < 2) {
      return { users: [], total: 0, dataVersion: null };
    }
    const limit = Math.min(Math.max(params.limit ?? DEFAULT_LIMIT, 1), DEFAULT_LIMIT);
    const prisma = getPrismaClientOrThrow();
    const emailLookup = isEmailQuery(query);
    const candidates = await prisma.user.findMany({
      where: {
        accountStatus: 'active',
        deletedAt: null,
        ...(emailLookup
          ? { email: { equals: query, mode: 'insensitive' } }
          : {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { profile: { postcode: { contains: query, mode: 'insensitive' } } },
                { profile: { city: { contains: query, mode: 'insensitive' } } },
                { profile: { sport: { contains: query, mode: 'insensitive' } } },
              ],
            }),
      },
      include: {
        profile: true,
        privacySetting: true,
        roles: {
          where: {
            active: true,
            revokedAt: null,
          },
        },
        linkedAthleteAccount: true,
      },
      orderBy: [{ name: 'asc' }],
      take: emailLookup ? 1 : CANDIDATE_LIMIT,
    });

    const candidateUserIds = candidates.map((user) => user.id);
    const candidateAthleteIds = candidates.flatMap((user) =>
      user.linkedAthleteAccount?.id ? [user.linkedAthleteAccount.id] : [],
    );
    const [requesterFamilies, sharedFamilies, guardianLinks, bookingLinks, blockLinks] =
      await Promise.all([
        prisma.familyMembership.findMany({
          where: { userId: params.authUserId, deletedAt: null },
          select: { familyId: true },
        }),
        prisma.familyMembership.findMany({
          where: {
            userId: { in: candidateUserIds },
            deletedAt: null,
          },
          select: { userId: true, familyId: true },
        }),
        prisma.guardianChildLink.findMany({
          where: {
            guardianUserId: params.authUserId,
            athleteId: { in: candidateAthleteIds },
            deletedAt: null,
          },
          select: { athleteId: true },
        }),
        prisma.bookingParticipant.findMany({
          where: {
            athleteId: { in: candidateAthleteIds },
            deletedAt: null,
            booking: {
              coachUserId: params.authUserId,
              deletedAt: null,
              status: { not: 'CANCELLED' },
            },
          },
          select: { athleteId: true },
        }),
        prisma.userBlock.findMany({
          where: {
            deletedAt: null,
            OR: [
              {
                blockerUserId: params.authUserId,
                blockedUserId: { in: candidateUserIds },
              },
              {
                blockerUserId: { in: candidateUserIds },
                blockedUserId: params.authUserId,
              },
            ],
          },
          select: {
            blockerUserId: true,
            blockedUserId: true,
          },
        }),
      ]);
    const requesterFamilyIds = new Set(requesterFamilies.map((row) => row.familyId));
    const sharedFamilyUserIds = new Set(
      sharedFamilies.flatMap((row) => (requesterFamilyIds.has(row.familyId) ? [row.userId] : [])),
    );
    const relatedAthleteIds = new Set([
      ...guardianLinks.map((row) => row.athleteId),
      ...bookingLinks.map((row) => row.athleteId),
    ]);
    const blockedUserIds = new Set(
      blockLinks.flatMap((row) =>
        row.blockerUserId === params.authUserId ? [row.blockedUserId] : [row.blockerUserId],
      ),
    );

    const users = candidates
      .flatMap((user) => {
        if (blockedUserIds.has(user.id)) return [];
        const related =
          user.id === params.authUserId ||
          sharedFamilyUserIds.has(user.id) ||
          Boolean(
            user.linkedAthleteAccount?.id && relatedAthleteIds.has(user.linkedAthleteAccount.id),
          );
        const minor =
          isUnder18(user.profile?.dateOfBirth?.toISOString()) ||
          isUnder18(user.linkedAthleteAccount?.dateOfBirth?.toISOString());
        if (minor && !related) return [];
        const profileVisible = user.privacySetting?.profileVisible !== false;
        const exactEmail = Boolean(user.email && user.email.toLowerCase() === query);
        if (!minor && !profileVisible && !related && !exactEmail) return [];
        const includeEmail = related || exactEmail;
        const showLocation = user.privacySetting?.showLocation !== false;
        return [
          {
            id: user.id,
            name: user.name,
            ...(includeEmail && user.email ? { email: user.email } : {}),
            ...(user.avatarUrl ? { avatar: user.avatarUrl } : {}),
            ...(showLocation && user.profile?.postcode ? { postcode: user.profile.postcode } : {}),
            role: mapRole(user.roles[0]?.role),
          },
        ];
      })
      .slice(0, limit);

    return normalizeForJson({ users, total: users.length, dataVersion: null });
  }

  async getUserById(params: UserProfileReadParams): Promise<{
    user: UserSearchResult | null;
    dataVersion: string | null;
  }> {
    const seedStore = resolveSeedStore();
    if (seedStore) {
      return getSeedUserById(params);
    }

    const prisma = getPrismaClientOrThrow();
    const user = await prisma.user.findFirst({
      where: {
        id: params.userId,
        accountStatus: 'active',
        deletedAt: null,
      },
      include: {
        profile: true,
        privacySetting: true,
        roles: {
          where: {
            active: true,
            revokedAt: null,
          },
        },
        linkedAthleteAccount: true,
      },
    });
    if (!user) {
      return { user: null, dataVersion: null };
    }

    const athleteId = user.linkedAthleteAccount?.id;
    const [
      requesterFamilies,
      sharedFamilies,
      guardianLinks,
      bookingLinks,
      blockLinks,
    ] = await Promise.all([
      prisma.familyMembership.findMany({
        where: { userId: params.authUserId, deletedAt: null },
        select: { familyId: true },
      }),
      prisma.familyMembership.findMany({
        where: { userId: params.userId, deletedAt: null },
        select: { familyId: true },
      }),
      athleteId
        ? prisma.guardianChildLink.findMany({
            where: {
              guardianUserId: params.authUserId,
              athleteId,
              deletedAt: null,
            },
            select: { athleteId: true },
          })
        : Promise.resolve([]),
      athleteId
        ? prisma.bookingParticipant.findMany({
            where: {
              athleteId,
              deletedAt: null,
              booking: {
                coachUserId: params.authUserId,
                deletedAt: null,
                status: { not: 'CANCELLED' },
              },
            },
            select: { athleteId: true },
          })
        : Promise.resolve([]),
      prisma.userBlock.findMany({
        where: {
          deletedAt: null,
          OR: [
            { blockerUserId: params.authUserId, blockedUserId: params.userId },
            { blockerUserId: params.userId, blockedUserId: params.authUserId },
          ],
        },
        select: { id: true },
      }),
    ]);

    if (blockLinks.length > 0) {
      return { user: null, dataVersion: null };
    }

    const requesterFamilyIds = new Set(requesterFamilies.map((row) => row.familyId));
    const related =
      user.id === params.authUserId ||
      sharedFamilies.some((row) => requesterFamilyIds.has(row.familyId)) ||
      guardianLinks.length > 0 ||
      bookingLinks.length > 0;
    const minor =
      isUnder18(user.profile?.dateOfBirth?.toISOString()) ||
      isUnder18(user.linkedAthleteAccount?.dateOfBirth?.toISOString());
    if (minor && !related) {
      return { user: null, dataVersion: null };
    }
    const profileVisible = user.privacySetting?.profileVisible !== false;
    if (!minor && !profileVisible && !related) {
      return { user: null, dataVersion: null };
    }

    const showLocation = user.privacySetting?.showLocation !== false;
    const result: UserSearchResult = {
      id: user.id,
      name: user.name,
      ...(related && user.email ? { email: user.email } : {}),
      ...(user.avatarUrl ? { avatar: user.avatarUrl } : {}),
      ...(showLocation && user.profile?.postcode ? { postcode: user.profile.postcode } : {}),
      role: mapRole(user.roles[0]?.role),
    };

    return normalizeForJson({ user: result, dataVersion: null });
  }
}

export const userSearchRepository = new DefaultUserSearchRepository();
