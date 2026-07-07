import { randomUUID } from 'node:crypto';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;
type FollowActorType = 'USER' | 'COACH';
type FollowRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export interface UserFollowRecord {
  id: string;
  followerId: string;
  followerType: FollowActorType;
  followingId: string;
  followingType: FollowActorType;
  createdAt: string;
  notifyOnPost: boolean;
  notifyOnSession: boolean;
}

export interface UserFollowListResponse {
  follows: UserFollowRecord[];
  followerIds: string[];
  followingIds: string[];
  total: number;
  dataVersion: string | null;
}

export interface UserFollowMutationInput {
  followingId: string;
  followingType?: FollowActorType;
  notifyOnPost?: boolean;
  notifyOnSession?: boolean;
}

export interface UserFollowPreferenceInput {
  notifyOnPost?: boolean;
  notifyOnSession?: boolean;
}

export interface UserFollowRequestRecord {
  id: string;
  requesterId: string;
  targetId: string;
  status: FollowRequestStatus;
  message?: string;
  createdAt: string;
  respondedAt?: string;
}

export interface UserFollowRequestListResponse {
  requests: UserFollowRequestRecord[];
  total: number;
  dataVersion: string | null;
}

export interface UserFollowRequestCreateInput {
  targetId: string;
  message?: string;
}

export interface UserFollowRequestCreateResult {
  request: UserFollowRequestRecord;
  created: boolean;
}

export interface UserFollowRepository {
  listFollowing(actorUserId: string): Promise<UserFollowListResponse>;
  listFollowers(targetUserId: string, viewerUserId: string): Promise<UserFollowListResponse>;
  getFollow(followerUserId: string, followedUserId: string, viewerUserId: string): Promise<UserFollowRecord | null>;
  createFollow(actorUserId: string, input: UserFollowMutationInput): Promise<UserFollowRecord>;
  updateFollowPreferences(
    actorUserId: string,
    followedUserId: string,
    input: UserFollowPreferenceInput,
  ): Promise<UserFollowRecord | null>;
  removeFollow(actorUserId: string, followedUserId: string): Promise<UserFollowRecord | null>;
  listFollowRequests(actorUserId: string, targetUserId?: string): Promise<UserFollowRequestListResponse>;
  createFollowRequest(
    actorUserId: string,
    input: UserFollowRequestCreateInput,
  ): Promise<UserFollowRequestCreateResult>;
  respondToFollowRequest(
    actorUserId: string,
    requestId: string,
    response: Exclude<FollowRequestStatus, 'PENDING'>,
  ): Promise<UserFollowRequestRecord>;
}

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;
const nowIso = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${randomUUID()}`;

function ensureTable(tables: SeedTables, key: string): SeedRow[] {
  if (!Array.isArray(tables[key])) {
    tables[key] = [];
  }
  return tables[key];
}

function isActiveUser(row: SeedRow, userId: string): boolean {
  return (
    asString(row.id) === userId &&
    asString(row.accountStatus) !== 'disabled' &&
    !asString(row.deletedAt)
  );
}

function isActiveFollow(row: SeedRow): boolean {
  return !asString(row.deletedAt);
}

function roleToFollowActorType(role: string | undefined): FollowActorType {
  return role === 'coach' || role === 'club_admin' || role === 'security_admin' || role === 'support'
    ? 'COACH'
    : 'USER';
}

function userActorTypeFromTables(tables: SeedTables, userId: string): FollowActorType {
  const role = asRows(tables.userRoleMemberships).find(
    (row) =>
      asString(row.userId) === userId &&
      row.active !== false &&
      !asString(row.revokedAt),
  );
  return roleToFollowActorType(asString(role?.role));
}

function assertDifferentUsers(actorUserId: string, targetUserId: string): void {
  if (actorUserId === targetUserId) {
    throw badRequest('Users cannot follow themselves');
  }
}

function assertSeedUserExists(tables: SeedTables, userId: string): void {
  const user = asRows(tables.users).find((row) => isActiveUser(row, userId));
  if (!user) {
    throw notFound('Target user not found', { targetUserId: userId });
  }
}

function seedHasActiveBlock(tables: SeedTables, userAId: string, userBId: string): boolean {
  return asRows(tables.userBlocks).some(
    (row) =>
      !asString(row.deletedAt) &&
      ((asString(row.blockerUserId) === userAId && asString(row.blockedUserId) === userBId) ||
        (asString(row.blockerUserId) === userBId && asString(row.blockedUserId) === userAId)),
  );
}

function assertSeedCanReachTarget(tables: SeedTables, viewerUserId: string, targetUserId: string): void {
  assertSeedUserExists(tables, targetUserId);
  if (viewerUserId !== targetUserId && seedHasActiveBlock(tables, viewerUserId, targetUserId)) {
    throw forbidden('Follow relationship is unavailable because one side has blocked the other');
  }
}

function mapSeedFollow(row: SeedRow): UserFollowRecord {
  const createdAt = asString(row.createdAt) ?? nowIso();
  return {
    id: asString(row.id) ?? '',
    followerId: asString(row.followerUserId) ?? asString(row.followerId) ?? '',
    followerType: roleToFollowActorType(asString(row.followerType)?.toLowerCase()),
    followingId: asString(row.followedUserId) ?? asString(row.followingId) ?? '',
    followingType: roleToFollowActorType(asString(row.followingType)?.toLowerCase()),
    createdAt,
    notifyOnPost: asBoolean(row.notifyOnPost, true),
    notifyOnSession: asBoolean(row.notifyOnSession, true),
  };
}

function normalizeFollowRequestStatus(value: unknown): FollowRequestStatus {
  return value === 'ACCEPTED' || value === 'DECLINED' ? value : 'PENDING';
}

function mapSeedFollowRequest(row: SeedRow): UserFollowRequestRecord {
  const message = asString(row.message);
  const respondedAt = asString(row.respondedAt);
  return {
    id: asString(row.id) ?? '',
    requesterId: asString(row.requesterUserId) ?? asString(row.requesterId) ?? '',
    targetId: asString(row.targetUserId) ?? asString(row.targetId) ?? '',
    status: normalizeFollowRequestStatus(row.status),
    ...(message ? { message } : {}),
    createdAt: asString(row.createdAt) ?? nowIso(),
    ...(respondedAt ? { respondedAt } : {}),
  };
}

function listResponse(follows: UserFollowRecord[], dataVersion: string | null): UserFollowListResponse {
  const ordered = [...follows].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );
  return {
    follows: ordered,
    followerIds: ordered.map((follow) => follow.followerId),
    followingIds: ordered.map((follow) => follow.followingId),
    total: ordered.length,
    dataVersion,
  };
}

function requestListResponse(
  requests: UserFollowRequestRecord[],
  dataVersion: string | null,
): UserFollowRequestListResponse {
  const ordered = [...requests].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
  );
  return {
    requests: ordered,
    total: ordered.length,
    dataVersion,
  };
}

function seedHasActiveFollow(tables: SeedTables, followerUserId: string, followedUserId: string): boolean {
  return asRows(tables.userFollows).some(
    (row) =>
      asString(row.followerUserId) === followerUserId &&
      asString(row.followedUserId) === followedUserId &&
      isActiveFollow(row),
  );
}

function assertSeedNotConnected(tables: SeedTables, userAId: string, userBId: string): void {
  if (
    seedHasActiveFollow(tables, userAId, userBId) &&
    seedHasActiveFollow(tables, userBId, userAId)
  ) {
    throw conflict('Users are already connected');
  }
}

function pushFollowNotification(tables: SeedTables, follow: UserFollowRecord): void {
  ensureTable(tables, 'notifications').push({
    id: newId('nfn'),
    userId: follow.followingId,
    type: 'FOLLOW',
    title: 'New follower',
    body: 'Someone started following you',
    status: 'UNREAD',
    sourceType: 'user_follow',
    sourceId: follow.id,
    metadataJson: {
      followerUserId: follow.followerId,
      followedUserId: follow.followingId,
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
}

function pushFollowRequestNotification(tables: SeedTables, request: UserFollowRequestRecord): void {
  ensureTable(tables, 'notifications').push({
    id: newId('nfn'),
    userId: request.targetId,
    type: 'FOLLOW_REQUEST',
    title: 'Follow request',
    body: 'Someone wants to connect with you',
    status: 'UNREAD',
    sourceType: 'user_follow_request',
    sourceId: request.id,
    metadataJson: {
      requesterUserId: request.requesterId,
      targetUserId: request.targetId,
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
}

function pushFollowRequestResponseNotification(
  tables: SeedTables,
  request: UserFollowRequestRecord,
): void {
  ensureTable(tables, 'notifications').push({
    id: newId('nfn'),
    userId: request.requesterId,
    type: request.status === 'ACCEPTED' ? 'FOLLOW_REQUEST_ACCEPTED' : 'FOLLOW_REQUEST_DECLINED',
    title: request.status === 'ACCEPTED' ? 'Follow request accepted' : 'Follow request declined',
    body:
      request.status === 'ACCEPTED'
        ? 'Your follow request was accepted'
        : 'Your follow request was declined',
    status: 'UNREAD',
    sourceType: 'user_follow_request',
    sourceId: request.id,
    metadataJson: {
      requesterUserId: request.requesterId,
      targetUserId: request.targetId,
      status: request.status,
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
}

function upsertSeedFollow(
  tables: SeedTables,
  followerUserId: string,
  followedUserId: string,
): UserFollowRecord {
  const rows = ensureTable(tables, 'userFollows');
  const existing = rows.find(
    (row) =>
      asString(row.followerUserId) === followerUserId &&
      asString(row.followedUserId) === followedUserId,
  );
  const wasActive = existing ? isActiveFollow(existing) : false;
  const now = nowIso();
  if (existing) {
    Object.assign(existing, {
      followerType: userActorTypeFromTables(tables, followerUserId),
      followingType: userActorTypeFromTables(tables, followedUserId),
      notifyOnPost: true,
      notifyOnSession: true,
      deletedAt: null,
      deletedByUserId: null,
      updatedAt: now,
    });
    const follow = mapSeedFollow(existing);
    if (!wasActive) {
      pushFollowNotification(tables, follow);
    }
    return follow;
  }

  const row = {
    id: newId('ufl'),
    followerUserId,
    followedUserId,
    followerType: userActorTypeFromTables(tables, followerUserId),
    followingType: userActorTypeFromTables(tables, followedUserId),
    notifyOnPost: true,
    notifyOnSession: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedByUserId: null,
  };
  rows.push(row);
  const follow = mapSeedFollow(row);
  pushFollowNotification(tables, follow);
  return follow;
}

class StoreUserFollowRepository implements UserFollowRepository {
  constructor(
    private readonly storeProvider: () => { tables: SeedTables; version: string | null },
  ) {}

  async listFollowing(actorUserId: string): Promise<UserFollowListResponse> {
    const store = this.storeProvider();
    assertSeedUserExists(store.tables, actorUserId);
    const follows = asRows(store.tables.userFollows)
      .filter((row) => asString(row.followerUserId) === actorUserId && isActiveFollow(row))
      .map(mapSeedFollow);
    return listResponse(follows, store.version);
  }

  async listFollowers(targetUserId: string, viewerUserId: string): Promise<UserFollowListResponse> {
    const store = this.storeProvider();
    assertSeedCanReachTarget(store.tables, viewerUserId, targetUserId);
    const follows = asRows(store.tables.userFollows)
      .filter((row) => asString(row.followedUserId) === targetUserId && isActiveFollow(row))
      .map(mapSeedFollow);
    return listResponse(follows, store.version);
  }

  async getFollow(
    followerUserId: string,
    followedUserId: string,
    viewerUserId: string,
  ): Promise<UserFollowRecord | null> {
    const store = this.storeProvider();
    assertSeedCanReachTarget(store.tables, viewerUserId, followedUserId);
    const row = asRows(store.tables.userFollows).find(
      (candidate) =>
        asString(candidate.followerUserId) === followerUserId &&
        asString(candidate.followedUserId) === followedUserId &&
        isActiveFollow(candidate),
    );
    return row ? mapSeedFollow(row) : null;
  }

  async createFollow(actorUserId: string, input: UserFollowMutationInput): Promise<UserFollowRecord> {
    assertDifferentUsers(actorUserId, input.followingId);
    const store = this.storeProvider();
    assertSeedCanReachTarget(store.tables, actorUserId, input.followingId);
    const rows = ensureTable(store.tables, 'userFollows');
    const existing = rows.find(
      (row) =>
        asString(row.followerUserId) === actorUserId &&
        asString(row.followedUserId) === input.followingId,
    );
    const wasActive = existing ? isActiveFollow(existing) : false;
    const now = nowIso();
    if (existing) {
      Object.assign(existing, {
        followerType: userActorTypeFromTables(store.tables, actorUserId),
        followingType: input.followingType ?? userActorTypeFromTables(store.tables, input.followingId),
        notifyOnPost: input.notifyOnPost ?? true,
        notifyOnSession: input.notifyOnSession ?? true,
        deletedAt: null,
        deletedByUserId: null,
        updatedAt: now,
      });
      const follow = mapSeedFollow(existing);
      if (!wasActive) {
        pushFollowNotification(store.tables, follow);
      }
      return follow;
    }

    const row = {
      id: newId('ufl'),
      followerUserId: actorUserId,
      followedUserId: input.followingId,
      followerType: userActorTypeFromTables(store.tables, actorUserId),
      followingType: input.followingType ?? userActorTypeFromTables(store.tables, input.followingId),
      notifyOnPost: input.notifyOnPost ?? true,
      notifyOnSession: input.notifyOnSession ?? true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    };
    rows.push(row);
    const follow = mapSeedFollow(row);
    pushFollowNotification(store.tables, follow);
    return follow;
  }

  async updateFollowPreferences(
    actorUserId: string,
    followedUserId: string,
    input: UserFollowPreferenceInput,
  ): Promise<UserFollowRecord | null> {
    assertDifferentUsers(actorUserId, followedUserId);
    const store = this.storeProvider();
    assertSeedCanReachTarget(store.tables, actorUserId, followedUserId);
    const row = ensureTable(store.tables, 'userFollows').find(
      (candidate) =>
        asString(candidate.followerUserId) === actorUserId &&
        asString(candidate.followedUserId) === followedUserId &&
        isActiveFollow(candidate),
    );
    if (!row) {
      return null;
    }
    Object.assign(row, {
      ...(input.notifyOnPost !== undefined ? { notifyOnPost: input.notifyOnPost } : {}),
      ...(input.notifyOnSession !== undefined
        ? { notifyOnSession: input.notifyOnSession }
        : {}),
      updatedAt: nowIso(),
    });
    return mapSeedFollow(row);
  }

  async removeFollow(actorUserId: string, followedUserId: string): Promise<UserFollowRecord | null> {
    assertDifferentUsers(actorUserId, followedUserId);
    const store = this.storeProvider();
    assertSeedCanReachTarget(store.tables, actorUserId, followedUserId);
    const row = ensureTable(store.tables, 'userFollows').find(
      (candidate) =>
        asString(candidate.followerUserId) === actorUserId &&
        asString(candidate.followedUserId) === followedUserId &&
        isActiveFollow(candidate),
    );
    if (!row) {
      return null;
    }
    const follow = mapSeedFollow(row);
    Object.assign(row, {
      deletedAt: nowIso(),
      deletedByUserId: actorUserId,
      updatedAt: nowIso(),
    });
    return follow;
  }

  async listFollowRequests(
    actorUserId: string,
    targetUserId: string = actorUserId,
  ): Promise<UserFollowRequestListResponse> {
    const store = this.storeProvider();
    assertSeedCanReachTarget(store.tables, actorUserId, targetUserId);
    const requests = asRows(store.tables.userFollowRequests)
      .filter((row) => {
        if (asString(row.status) !== 'PENDING' || asString(row.deletedAt)) {
          return false;
        }
        const requesterId = asString(row.requesterUserId);
        const targetId = asString(row.targetUserId);
        if (targetUserId === actorUserId) {
          return targetId === actorUserId;
        }
        return targetId === targetUserId && requesterId === actorUserId;
      })
      .map(mapSeedFollowRequest);
    return requestListResponse(requests, store.version);
  }

  async createFollowRequest(
    actorUserId: string,
    input: UserFollowRequestCreateInput,
  ): Promise<UserFollowRequestCreateResult> {
    assertDifferentUsers(actorUserId, input.targetId);
    const store = this.storeProvider();
    assertSeedCanReachTarget(store.tables, actorUserId, input.targetId);
    assertSeedNotConnected(store.tables, actorUserId, input.targetId);
    const rows = ensureTable(store.tables, 'userFollowRequests');
    const existing = rows.find(
      (row) =>
        asString(row.requesterUserId) === actorUserId &&
        asString(row.targetUserId) === input.targetId &&
        asString(row.status) === 'PENDING' &&
        !asString(row.deletedAt),
    );
    if (existing) {
      return {
        request: mapSeedFollowRequest(existing),
        created: false,
      };
    }

    const now = nowIso();
    const row = {
      id: newId('ufr'),
      requesterUserId: actorUserId,
      targetUserId: input.targetId,
      message: input.message,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
      respondedAt: null,
      deletedAt: null,
      deletedByUserId: null,
    };
    rows.push(row);
    const request = mapSeedFollowRequest(row);
    pushFollowRequestNotification(store.tables, request);
    return {
      request,
      created: true,
    };
  }

  async respondToFollowRequest(
    actorUserId: string,
    requestId: string,
    response: Exclude<FollowRequestStatus, 'PENDING'>,
  ): Promise<UserFollowRequestRecord> {
    const store = this.storeProvider();
    const row = ensureTable(store.tables, 'userFollowRequests').find(
      (candidate) => asString(candidate.id) === requestId && !asString(candidate.deletedAt),
    );
    if (!row) {
      throw notFound('Follow request not found', { requestId });
    }
    if (asString(row.targetUserId) !== actorUserId) {
      throw forbidden('Only the request target can respond to a follow request');
    }
    if (asString(row.status) !== 'PENDING') {
      throw conflict('Follow request has already been resolved', { requestId });
    }

    const requesterId = asString(row.requesterUserId);
    const targetId = asString(row.targetUserId);
    if (!requesterId || !targetId) {
      throw notFound('Follow request not found', { requestId });
    }
    assertSeedCanReachTarget(store.tables, actorUserId, requesterId);

    const now = nowIso();
    Object.assign(row, {
      status: response,
      respondedAt: now,
      updatedAt: now,
    });

    if (response === 'ACCEPTED') {
      upsertSeedFollow(store.tables, requesterId, targetId);
      upsertSeedFollow(store.tables, targetId, requesterId);
    }

    const request = mapSeedFollowRequest(row);
    pushFollowRequestResponseNotification(store.tables, request);
    return request;
  }
}

class DbUserFollowRepository implements UserFollowRepository {
  private readonly fixture = new StoreUserFollowRepository(() => ({
    tables: getDbFixtureStore().tables,
    version: getDbFixtureStore().version,
  }));

  async listFollowing(actorUserId: string): Promise<UserFollowListResponse> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.listFollowing(actorUserId);
    }
    const prisma = getPrismaClientOrThrow();
    const rows = await prisma.userFollow.findMany({
      where: {
        followerUserId: actorUserId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return listResponse(rows.map(mapDbFollow), null);
  }

  async listFollowers(targetUserId: string, viewerUserId: string): Promise<UserFollowListResponse> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.listFollowers(targetUserId, viewerUserId);
    }
    await assertDbCanReachTarget(viewerUserId, targetUserId);
    const prisma = getPrismaClientOrThrow();
    const rows = await prisma.userFollow.findMany({
      where: {
        followedUserId: targetUserId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return listResponse(rows.map(mapDbFollow), null);
  }

  async getFollow(
    followerUserId: string,
    followedUserId: string,
    viewerUserId: string,
  ): Promise<UserFollowRecord | null> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.getFollow(followerUserId, followedUserId, viewerUserId);
    }
    await assertDbCanReachTarget(viewerUserId, followedUserId);
    const prisma = getPrismaClientOrThrow();
    const row = await prisma.userFollow.findFirst({
      where: {
        followerUserId,
        followedUserId,
        deletedAt: null,
      },
    });
    return row ? mapDbFollow(row) : null;
  }

  async createFollow(actorUserId: string, input: UserFollowMutationInput): Promise<UserFollowRecord> {
    assertDifferentUsers(actorUserId, input.followingId);
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.createFollow(actorUserId, input);
    }
    const prisma = getPrismaClientOrThrow();
    return prisma.$transaction(async (tx) => {
      await assertDbCanReachTarget(actorUserId, input.followingId, tx);
      return dbUpsertFollow(tx, actorUserId, input.followingId, {
        followingType: input.followingType,
        notifyOnPost: input.notifyOnPost,
        notifyOnSession: input.notifyOnSession,
      });
    });
  }

  async updateFollowPreferences(
    actorUserId: string,
    followedUserId: string,
    input: UserFollowPreferenceInput,
  ): Promise<UserFollowRecord | null> {
    assertDifferentUsers(actorUserId, followedUserId);
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.updateFollowPreferences(actorUserId, followedUserId, input);
    }
    const prisma = getPrismaClientOrThrow();
    await assertDbCanReachTarget(actorUserId, followedUserId);
    const existing = await prisma.userFollow.findFirst({
      where: {
        followerUserId: actorUserId,
        followedUserId,
        deletedAt: null,
      },
    });
    if (!existing) {
      return null;
    }
    const updated = await prisma.userFollow.update({
      where: {
        followerUserId_followedUserId: {
          followerUserId: actorUserId,
          followedUserId,
        },
      },
      data: {
        ...(input.notifyOnPost !== undefined ? { notifyOnPost: input.notifyOnPost } : {}),
        ...(input.notifyOnSession !== undefined
          ? { notifyOnSession: input.notifyOnSession }
          : {}),
      },
    });
    return mapDbFollow(updated);
  }

  async removeFollow(actorUserId: string, followedUserId: string): Promise<UserFollowRecord | null> {
    assertDifferentUsers(actorUserId, followedUserId);
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.removeFollow(actorUserId, followedUserId);
    }
    const prisma = getPrismaClientOrThrow();
    await assertDbCanReachTarget(actorUserId, followedUserId);
    const existing = await prisma.userFollow.findFirst({
      where: {
        followerUserId: actorUserId,
        followedUserId,
        deletedAt: null,
      },
    });
    if (!existing) {
      return null;
    }
    await prisma.userFollow.update({
      where: {
        followerUserId_followedUserId: {
          followerUserId: actorUserId,
          followedUserId,
        },
      },
      data: {
        deletedAt: new Date(),
        deletedByUserId: actorUserId,
      },
    });
    return mapDbFollow(existing);
  }

  async listFollowRequests(
    actorUserId: string,
    targetUserId: string = actorUserId,
  ): Promise<UserFollowRequestListResponse> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.listFollowRequests(actorUserId, targetUserId);
    }
    await assertDbCanReachTarget(actorUserId, targetUserId);
    const prisma = getPrismaClientOrThrow();
    const rows = await prisma.userFollowRequest.findMany({
      where:
        targetUserId === actorUserId
          ? {
              targetUserId: actorUserId,
              status: 'PENDING',
              deletedAt: null,
            }
          : {
              requesterUserId: actorUserId,
              targetUserId,
              status: 'PENDING',
              deletedAt: null,
            },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return requestListResponse(rows.map(mapDbFollowRequest), null);
  }

  async createFollowRequest(
    actorUserId: string,
    input: UserFollowRequestCreateInput,
  ): Promise<UserFollowRequestCreateResult> {
    assertDifferentUsers(actorUserId, input.targetId);
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.createFollowRequest(actorUserId, input);
    }
    const prisma = getPrismaClientOrThrow();
    return prisma.$transaction(async (tx) => {
      await assertDbCanReachTarget(actorUserId, input.targetId, tx);
      const [actorFollowsTarget, targetFollowsActor, existing] = await Promise.all([
        tx.userFollow.findFirst({
          where: {
            followerUserId: actorUserId,
            followedUserId: input.targetId,
            deletedAt: null,
          },
          select: {
            id: true,
          },
        }),
        tx.userFollow.findFirst({
          where: {
            followerUserId: input.targetId,
            followedUserId: actorUserId,
            deletedAt: null,
          },
          select: {
            id: true,
          },
        }),
        tx.userFollowRequest.findFirst({
          where: {
            requesterUserId: actorUserId,
            targetUserId: input.targetId,
            status: 'PENDING',
            deletedAt: null,
          },
        }),
      ]);
      if (actorFollowsTarget && targetFollowsActor) {
        throw conflict('Users are already connected');
      }
      if (existing) {
        return {
          request: mapDbFollowRequest(existing),
          created: false,
        };
      }

      const row = await tx.userFollowRequest.create({
        data: {
          id: newId('ufr'),
          requesterUserId: actorUserId,
          targetUserId: input.targetId,
          message: input.message,
        },
      });
      await tx.notification.create({
        data: {
          id: newId('nfn'),
          userId: input.targetId,
          type: 'FOLLOW_REQUEST',
          title: 'Follow request',
          body: 'Someone wants to connect with you',
          sourceType: 'user_follow_request',
          sourceId: row.id,
          metadataJson: {
            requesterUserId: actorUserId,
            targetUserId: input.targetId,
          },
        },
      });
      return {
        request: mapDbFollowRequest(row),
        created: true,
      };
    });
  }

  async respondToFollowRequest(
    actorUserId: string,
    requestId: string,
    response: Exclude<FollowRequestStatus, 'PENDING'>,
  ): Promise<UserFollowRequestRecord> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.respondToFollowRequest(actorUserId, requestId, response);
    }
    const prisma = getPrismaClientOrThrow();
    return prisma.$transaction(async (tx) => {
      const existing = await tx.userFollowRequest.findFirst({
        where: {
          id: requestId,
          deletedAt: null,
        },
      });
      if (!existing) {
        throw notFound('Follow request not found', { requestId });
      }
      if (existing.targetUserId !== actorUserId) {
        throw forbidden('Only the request target can respond to a follow request');
      }
      if (existing.status !== 'PENDING') {
        throw conflict('Follow request has already been resolved', { requestId });
      }
      await assertDbCanReachTarget(actorUserId, existing.requesterUserId, tx);

      const updated = await tx.userFollowRequest.update({
        where: {
          id: requestId,
        },
        data: {
          status: response,
          respondedAt: new Date(),
        },
      });

      if (response === 'ACCEPTED') {
        await dbUpsertFollow(tx, existing.requesterUserId, existing.targetUserId);
        await dbUpsertFollow(tx, existing.targetUserId, existing.requesterUserId);
      }

      await tx.notification.create({
        data: {
          id: newId('nfn'),
          userId: existing.requesterUserId,
          type: response === 'ACCEPTED' ? 'FOLLOW_REQUEST_ACCEPTED' : 'FOLLOW_REQUEST_DECLINED',
          title: response === 'ACCEPTED' ? 'Follow request accepted' : 'Follow request declined',
          body:
            response === 'ACCEPTED'
              ? 'Your follow request was accepted'
              : 'Your follow request was declined',
          sourceType: 'user_follow_request',
          sourceId: requestId,
          metadataJson: {
            requesterUserId: existing.requesterUserId,
            targetUserId: existing.targetUserId,
            status: response,
          },
        },
      });

      return mapDbFollowRequest(updated);
    });
  }
}

type DbFollowRow = {
  id: string;
  followerUserId: string;
  followedUserId: string;
  followerType: string;
  followingType: string;
  notifyOnPost: boolean;
  notifyOnSession: boolean;
  createdAt: Date;
};

function mapDbFollow(row: DbFollowRow): UserFollowRecord {
  return {
    id: row.id,
    followerId: row.followerUserId,
    followerType: roleToFollowActorType(row.followerType.toLowerCase()),
    followingId: row.followedUserId,
    followingType: roleToFollowActorType(row.followingType.toLowerCase()),
    createdAt: row.createdAt.toISOString(),
    notifyOnPost: row.notifyOnPost,
    notifyOnSession: row.notifyOnSession,
  };
}

type DbFollowRequestRow = {
  id: string;
  requesterUserId: string;
  targetUserId: string;
  status: string;
  message: string | null;
  createdAt: Date;
  respondedAt: Date | null;
};

function mapDbFollowRequest(row: DbFollowRequestRow): UserFollowRequestRecord {
  return {
    id: row.id,
    requesterId: row.requesterUserId,
    targetId: row.targetUserId,
    status: normalizeFollowRequestStatus(row.status),
    ...(row.message ? { message: row.message } : {}),
    createdAt: row.createdAt.toISOString(),
    ...(row.respondedAt ? { respondedAt: row.respondedAt.toISOString() } : {}),
  };
}

type UserFollowDbReader = Pick<
  ReturnType<typeof getPrismaClientOrThrow>,
  'user' | 'userBlock' | 'userRoleMembership'
>;

type UserFollowDbWriter = UserFollowDbReader &
  Pick<ReturnType<typeof getPrismaClientOrThrow>, 'notification' | 'userFollow'>;

async function assertDbCanReachTarget(
  viewerUserId: string,
  targetUserId: string,
  prisma: UserFollowDbReader = getPrismaClientOrThrow(),
): Promise<void> {
  const target = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      accountStatus: 'active',
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });
  if (!target) {
    throw notFound('Target user not found', { targetUserId });
  }
  if (viewerUserId === targetUserId) {
    return;
  }
  const blocked = await prisma.userBlock.findFirst({
    where: {
      deletedAt: null,
      OR: [
        {
          blockerUserId: viewerUserId,
          blockedUserId: targetUserId,
        },
        {
          blockerUserId: targetUserId,
          blockedUserId: viewerUserId,
        },
      ],
    },
    select: {
      id: true,
    },
  });
  if (blocked) {
    throw forbidden('Follow relationship is unavailable because one side has blocked the other');
  }
}

async function dbUserActorType(
  userId: string,
  prisma: UserFollowDbReader = getPrismaClientOrThrow(),
): Promise<FollowActorType> {
  const role = await prisma.userRoleMembership.findFirst({
    where: {
      userId,
      active: true,
      revokedAt: null,
    },
    select: {
      role: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
  return roleToFollowActorType(role?.role);
}

async function dbUpsertFollow(
  prisma: UserFollowDbWriter,
  followerUserId: string,
  followedUserId: string,
  input: {
    followingType?: FollowActorType;
    notifyOnPost?: boolean;
    notifyOnSession?: boolean;
  } = {},
): Promise<UserFollowRecord> {
  const [followerType, followingType, existing] = await Promise.all([
    dbUserActorType(followerUserId, prisma),
    input.followingType ? Promise.resolve(input.followingType) : dbUserActorType(followedUserId, prisma),
    prisma.userFollow.findUnique({
      where: {
        followerUserId_followedUserId: {
          followerUserId,
          followedUserId,
        },
      },
    }),
  ]);
  const row = existing
    ? await prisma.userFollow.update({
        where: {
          followerUserId_followedUserId: {
            followerUserId,
            followedUserId,
          },
        },
        data: {
          followerType,
          followingType,
          notifyOnPost: input.notifyOnPost ?? true,
          notifyOnSession: input.notifyOnSession ?? true,
          deletedAt: null,
          deletedByUserId: null,
        },
      })
    : await prisma.userFollow.create({
        data: {
          id: newId('ufl'),
          followerUserId,
          followedUserId,
          followerType,
          followingType,
          notifyOnPost: input.notifyOnPost ?? true,
          notifyOnSession: input.notifyOnSession ?? true,
        },
      });
  if (!existing || existing.deletedAt) {
    await prisma.notification.create({
      data: {
        id: newId('nfn'),
        userId: followedUserId,
        type: 'FOLLOW',
        title: 'New follower',
        body: 'Someone started following you',
        sourceType: 'user_follow',
        sourceId: row.id,
        metadataJson: {
          followerUserId,
          followedUserId,
        },
      },
    });
  }
  return mapDbFollow(row);
}

const seedRepository = new StoreUserFollowRepository(() => ({
  tables: getMarketplaceSeedStore().tables,
  version: getMarketplaceSeedStore().version,
}));
const dbRepository = new DbUserFollowRepository();

export function resolveUserFollowRepository(): UserFollowRepository {
  return getApiDataBackend() === 'db' ? dbRepository : seedRepository;
}
