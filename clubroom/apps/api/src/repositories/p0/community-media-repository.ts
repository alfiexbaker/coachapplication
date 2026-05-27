import crypto from 'node:crypto';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { conflict, forbidden, notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { normalizeForJson } from './normalize.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const asBoolean = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined);
const normalizeAs = <T>(value: unknown): T => normalizeForJson(value) as unknown as T;
const nowIso = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const IDEMPOTENCY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const GROUP_MESSAGE_CREATE_ENDPOINT_KEY = 'community.group-message.create';

interface StoreProvider {
  version: string;
  tables: SeedTables;
}

export interface CommunityMediaAccessParams {
  authUserId: string;
  isPrivilegedAdmin: boolean;
}

export interface PostListParams extends CommunityMediaAccessParams {
  communityGroupId?: string;
}

export interface GroupMessageCreateParams extends CommunityMediaAccessParams {
  communityGroupId: string;
  body: string;
  idempotencyKey?: string;
}

export interface GroupMessageReadParams extends CommunityMediaAccessParams {
  communityGroupId: string;
}

export interface CommunityGroupListResult {
  groups: SeedRow[];
  dataVersion: string | null;
}

export interface PostListResult {
  posts: SeedRow[];
  dataVersion: string | null;
}

export interface MessageThreadListResult {
  threads: SeedRow[];
  dataVersion: string | null;
}

export interface NotificationListResult {
  notifications: SeedRow[];
  preferences: SeedRow | null;
  mutedSources: SeedRow[];
  quietHours: SeedRow | null;
  unreadCount: number;
  dataVersion: string | null;
}

export interface GroupMessageCreateResult {
  message: SeedRow;
  thread: SeedRow;
  dataVersion: string | null;
}

export interface GroupMessageReadResult {
  thread: SeedRow | null;
  dataVersion: string | null;
}

export interface CommunityMediaRepository {
  listCommunityGroups(params: CommunityMediaAccessParams): Promise<CommunityGroupListResult>;
  listPosts(params: PostListParams): Promise<PostListResult>;
  listMessageThreads(params: CommunityMediaAccessParams): Promise<MessageThreadListResult>;
  listNotifications(params: CommunityMediaAccessParams): Promise<NotificationListResult>;
  createGroupMessage(params: GroupMessageCreateParams): Promise<GroupMessageCreateResult>;
  markGroupMessagesRead(params: GroupMessageReadParams): Promise<GroupMessageReadResult>;
}

function isActiveMembership(row: SeedRow): boolean {
  return asString(row.deletedAt) == null && asBoolean(row.active) !== false;
}

function activeRows(rows: SeedRow[]): SeedRow[] {
  return rows.filter((row) => asString(row.deletedAt) == null);
}

function ensureRows(tables: SeedTables, key: string): SeedRow[] {
  const existing = tables[key];
  if (Array.isArray(existing)) {
    return existing;
  }
  const created: SeedRow[] = [];
  tables[key] = created;
  return created;
}

function readableCommunityGroupIds(tables: SeedTables, authUserId: string): Set<string> {
  return new Set(
    asRows(tables.communityGroupMemberships)
      .filter((row) => isActiveMembership(row) && asString(row.userId) === authUserId)
      .map((row) => asString(row.communityGroupId))
      .filter((groupId): groupId is string => Boolean(groupId)),
  );
}

function readableClubIdsForUser(tables: SeedTables, authUserId: string): Set<string> {
  return new Set(
    asRows(tables.clubMemberships)
      .filter((row) => isActiveMembership(row) && asString(row.userId) === authUserId)
      .map((row) => asString(row.clubId))
      .filter((clubId): clubId is string => Boolean(clubId)),
  );
}

function hashGroupMessageCreateRequest(params: GroupMessageCreateParams): string {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        communityGroupId: params.communityGroupId,
        body: params.body,
      }),
    )
    .digest('hex');
}

function assertMatchingIdempotencyRequest(row: SeedRow, requestHash: string): void {
  if (asString(row.requestHash) !== requestHash) {
    throw conflict('Idempotency key was already used with a different community message payload');
  }
}

function groupThreadForStore(tables: SeedTables, communityGroupId: string): SeedRow | undefined {
  return activeRows(asRows(tables.messageThreads)).find(
    (row) =>
      asString(row.communityGroupId) === communityGroupId &&
      String(row.threadType ?? '').toUpperCase() === 'GROUP',
  );
}

function hydrateStoreMessage(tables: SeedTables, message: SeedRow): SeedRow {
  const messageId = asString(message.id);
  return {
    ...message,
    receipts: asRows(tables.messageReceipts).filter((row) => asString(row.messageId) === messageId),
  };
}

function hydrateStoreThread(tables: SeedTables, thread: SeedRow): SeedRow {
  const threadId = asString(thread.id);
  const messages = activeRows(asRows(tables.messages)).filter(
    (row) => asString(row.messageThreadId) === threadId,
  );
  return {
    ...thread,
    participants: asRows(tables.messageParticipants).filter(
      (row) => asString(row.messageThreadId) === threadId && asString(row.leftAt) == null,
    ),
    messages: messages.map((message) => hydrateStoreMessage(tables, message)),
  };
}

function activeGroupMemberships(tables: SeedTables, communityGroupId: string): SeedRow[] {
  return asRows(tables.communityGroupMemberships).filter(
    (row) =>
      isActiveMembership(row) &&
      asString(row.communityGroupId) === communityGroupId &&
      Boolean(asString(row.userId)),
  );
}

function assertCanWriteStoreGroupMessages(
  tables: SeedTables,
  communityGroupId: string,
  authUserId: string,
): SeedRow {
  const group = activeRows(asRows(tables.communityGroups)).find(
    (row) => asString(row.id) === communityGroupId,
  );
  if (!group) {
    throw notFound('Community group not found', { communityGroupId });
  }

  const isMember = activeGroupMemberships(tables, communityGroupId).some(
    (row) => asString(row.userId) === authUserId,
  );
  if (!isMember) {
    throw forbidden('Community group does not belong to authenticated user', {
      communityGroupId,
    });
  }

  return group;
}

function ensureStoreGroupThread(
  tables: SeedTables,
  group: SeedRow,
  authUserId: string,
  now: string,
): SeedRow {
  const communityGroupId = asString(group.id) as string;
  const thread =
    groupThreadForStore(tables, communityGroupId) ??
    (() => {
      const created: SeedRow = {
        id: newId('thr'),
        threadType: 'GROUP',
        clubId: asString(group.clubId) ?? null,
        communityGroupId,
        groupSessionId: null,
        bookingId: null,
        title: asString(group.name) ?? 'Community group',
        lastMessageAt: null,
        createdByUserId: authUserId,
        updatedByUserId: authUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      ensureRows(tables, 'messageThreads').push(created);
      return created;
    })();

  const participants = ensureRows(tables, 'messageParticipants');
  for (const membership of activeGroupMemberships(tables, communityGroupId)) {
    const userId = asString(membership.userId) as string;
    const existing = participants.find(
      (row) => asString(row.messageThreadId) === asString(thread.id) && asString(row.userId) === userId,
    );
    if (existing) {
      existing.leftAt = null;
      continue;
    }
    participants.push({
      id: newId('mpr'),
      messageThreadId: asString(thread.id),
      userId,
      role: asString(membership.role) ?? 'member',
      lastReadAt: null,
      muted: false,
      joinedAt: now,
      leftAt: null,
    });
  }

  return thread;
}

function findSeedGroupMessageCreateIdempotency(params: {
  tables: SeedTables;
  authUserId: string;
  body: GroupMessageCreateParams;
}): GroupMessageCreateResult | null {
  if (!params.body.idempotencyKey) {
    return null;
  }

  const requestHash = hashGroupMessageCreateRequest(params.body);
  const entry = asRows(params.tables.idempotencyKeys).find(
    (row) =>
      asString(row.userId) === params.authUserId &&
      asString(row.endpointKey) === GROUP_MESSAGE_CREATE_ENDPOINT_KEY &&
      asString(row.idempotencyKey) === params.body.idempotencyKey,
  );
  if (!entry) {
    return null;
  }

  assertMatchingIdempotencyRequest(entry, requestHash);
  return normalizeAs<GroupMessageCreateResult>(entry.responseBodyJson);
}

function recordSeedGroupMessageCreateIdempotency(params: {
  tables: SeedTables;
  authUserId: string;
  body: GroupMessageCreateParams;
  response: GroupMessageCreateResult;
  now: string;
}): void {
  if (!params.body.idempotencyKey) {
    return;
  }

  ensureRows(params.tables, 'idempotencyKeys').push({
    id: newId('idk'),
    userId: params.authUserId,
    endpointKey: GROUP_MESSAGE_CREATE_ENDPOINT_KEY,
    idempotencyKey: params.body.idempotencyKey,
    requestHash: hashGroupMessageCreateRequest(params.body),
    responseStatus: 201,
    responseBodyJson: params.response,
    createdAt: params.now,
    expiresAt: new Date(Date.parse(params.now) + IDEMPOTENCY_TTL_MS).toISOString(),
  });
}

class StoreCommunityMediaRepository implements CommunityMediaRepository {
  constructor(private readonly storeProvider: () => StoreProvider) {}

  async listCommunityGroups(params: CommunityMediaAccessParams): Promise<CommunityGroupListResult> {
    const store = this.storeProvider();
    const readableGroupIds = readableCommunityGroupIds(store.tables, params.authUserId);
    const memberships = asRows(store.tables.communityGroupMemberships).filter(isActiveMembership);

    return {
      groups: activeRows(asRows(store.tables.communityGroups))
        .filter((row) => readableGroupIds.has(asString(row.id) ?? ''))
        .map((group) => ({
          ...group,
          memberships: memberships.filter(
            (row) => asString(row.communityGroupId) === asString(group.id),
          ),
        })),
      dataVersion: store.version,
    };
  }

  async listPosts(params: PostListParams): Promise<PostListResult> {
    const store = this.storeProvider();
    const readableGroupIds = readableCommunityGroupIds(store.tables, params.authUserId);
    const readableClubIds = readableClubIdsForUser(store.tables, params.authUserId);

    if (params.communityGroupId && !readableGroupIds.has(params.communityGroupId)) {
      throw forbidden('Community group does not belong to authenticated user', {
        communityGroupId: params.communityGroupId,
      });
    }

    const posts = activeRows(asRows(store.tables.posts))
      .filter((row) => {
        if (params.communityGroupId) {
          return asString(row.communityGroupId) === params.communityGroupId;
        }
        const postGroupId = asString(row.communityGroupId);
        const postClubId = asString(row.clubId);
        return (
          asString(row.authorUserId) === params.authUserId
          || (postGroupId ? readableGroupIds.has(postGroupId) : false)
          || (postClubId ? readableClubIds.has(postClubId) : false)
        );
      })
      .map((post) => {
        const postId = asString(post.id);
        return {
          ...post,
          comments: activeRows(asRows(store.tables.postComments)).filter(
            (row) =>
              asString(row.postId) === postId
              && asBoolean(row.isDeleted) !== true,
          ),
          reactions: asRows(store.tables.postReactions).filter((row) => asString(row.postId) === postId),
        };
      });

    return {
      posts,
      dataVersion: store.version,
    };
  }

  async listMessageThreads(params: CommunityMediaAccessParams): Promise<MessageThreadListResult> {
    const store = this.storeProvider();
    const participants = asRows(store.tables.messageParticipants).filter(
      (row) => asString(row.leftAt) == null,
    );
    const myThreadIds = new Set(
      participants
        .filter((row) => asString(row.userId) === params.authUserId)
        .map((row) => asString(row.messageThreadId))
        .filter((threadId): threadId is string => Boolean(threadId)),
    );

    return {
      threads: activeRows(asRows(store.tables.messageThreads))
        .filter((thread) => myThreadIds.has(asString(thread.id) ?? ''))
        .map((thread) => {
          const threadId = asString(thread.id);
          const messages = activeRows(asRows(store.tables.messages)).filter(
            (row) => asString(row.messageThreadId) === threadId,
          );
          return {
            ...thread,
            participants: participants.filter((row) => asString(row.messageThreadId) === threadId),
            messages: messages.map((message) => ({
              ...message,
              receipts: asRows(store.tables.messageReceipts).filter(
                (row) => asString(row.messageId) === asString(message.id),
              ),
            })),
          };
        }),
      dataVersion: store.version,
    };
  }

  async listNotifications(params: CommunityMediaAccessParams): Promise<NotificationListResult> {
    const store = this.storeProvider();
    const notifications = asRows(store.tables.notifications).filter(
      (row) => asString(row.userId) === params.authUserId,
    );

    return {
      notifications,
      preferences:
        asRows(store.tables.notificationPreferences).find(
          (row) => asString(row.userId) === params.authUserId,
        ) ?? null,
      mutedSources: asRows(store.tables.mutedSources).filter(
        (row) =>
          asString(row.userId) === params.authUserId
          && asString(row.unmutedAt) == null,
      ),
      quietHours:
        asRows(store.tables.quietHours).find((row) => asString(row.userId) === params.authUserId) ?? null,
      unreadCount: notifications.filter((row) => asString(row.status) !== 'READ').length,
      dataVersion: store.version,
    };
  }

  async createGroupMessage(params: GroupMessageCreateParams): Promise<GroupMessageCreateResult> {
    const store = this.storeProvider();
    const replay = findSeedGroupMessageCreateIdempotency({
      tables: store.tables,
      authUserId: params.authUserId,
      body: params,
    });
    if (replay) {
      return replay;
    }

    const now = nowIso();
    const group = assertCanWriteStoreGroupMessages(store.tables, params.communityGroupId, params.authUserId);
    const thread = ensureStoreGroupThread(store.tables, group, params.authUserId, now);
    const threadId = asString(thread.id) as string;
    const message: SeedRow = {
      id: newId('msg'),
      messageThreadId: threadId,
      senderUserId: params.authUserId,
      content: params.body,
      attachmentsJson: [],
      editedAt: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    ensureRows(store.tables, 'messages').push(message);

    const receipts = ensureRows(store.tables, 'messageReceipts');
    for (const participant of asRows(store.tables.messageParticipants).filter(
      (row) => asString(row.messageThreadId) === threadId && asString(row.leftAt) == null,
    )) {
      const userId = asString(participant.userId);
      if (!userId) {
        continue;
      }
      receipts.push({
        id: newId('mrc'),
        messageId: asString(message.id),
        userId,
        deliveredAt: now,
        readAt: userId === params.authUserId ? now : null,
        createdAt: now,
        updatedAt: now,
      });
      if (userId === params.authUserId) {
        participant.lastReadAt = now;
      }
    }

    thread.lastMessageAt = now;
    thread.updatedAt = now;
    thread.updatedByUserId = params.authUserId;
    thread.version = Number(thread.version ?? 1) + 1;
    group.updatedAt = now;
    group.updatedByUserId = params.authUserId;
    group.version = Number(group.version ?? 1) + 1;

    const response: GroupMessageCreateResult = {
      message: hydrateStoreMessage(store.tables, message),
      thread: hydrateStoreThread(store.tables, thread),
      dataVersion: store.version,
    };
    recordSeedGroupMessageCreateIdempotency({
      tables: store.tables,
      authUserId: params.authUserId,
      body: params,
      response,
      now,
    });
    return response;
  }

  async markGroupMessagesRead(params: GroupMessageReadParams): Promise<GroupMessageReadResult> {
    const store = this.storeProvider();
    assertCanWriteStoreGroupMessages(store.tables, params.communityGroupId, params.authUserId);
    const thread = groupThreadForStore(store.tables, params.communityGroupId);
    if (!thread) {
      return { thread: null, dataVersion: store.version };
    }

    const now = nowIso();
    const threadId = asString(thread.id) as string;
    const messages = activeRows(asRows(store.tables.messages)).filter(
      (row) => asString(row.messageThreadId) === threadId,
    );
    const receipts = ensureRows(store.tables, 'messageReceipts');
    for (const message of messages) {
      const messageId = asString(message.id) as string;
      const existing = receipts.find(
        (row) => asString(row.messageId) === messageId && asString(row.userId) === params.authUserId,
      );
      if (existing) {
        existing.deliveredAt = asString(existing.deliveredAt) ?? now;
        existing.readAt = now;
        existing.updatedAt = now;
        continue;
      }
      receipts.push({
        id: newId('mrc'),
        messageId,
        userId: params.authUserId,
        deliveredAt: now,
        readAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    const participant = asRows(store.tables.messageParticipants).find(
      (row) =>
        asString(row.messageThreadId) === threadId &&
        asString(row.userId) === params.authUserId &&
        asString(row.leftAt) == null,
    );
    if (participant) {
      participant.lastReadAt = now;
    }

    return {
      thread: hydrateStoreThread(store.tables, thread),
      dataVersion: store.version,
    };
  }
}

class PrismaCommunityMediaRepository implements CommunityMediaRepository {
  private readonly fallback = new StoreCommunityMediaRepository(() => getDbFixtureStore());

  private async getReadableCommunityGroupIds(authUserId: string): Promise<string[]> {
    const prisma = getPrismaClientOrThrow();
    const memberships = await prisma.communityGroupMembership.findMany({
      where: {
        userId: authUserId,
        active: true,
        deletedAt: null,
      },
      select: { communityGroupId: true },
    });
    return memberships.map((row) => row.communityGroupId);
  }

  private async getReadableClubIds(authUserId: string): Promise<string[]> {
    const prisma = getPrismaClientOrThrow();
    const memberships = await prisma.clubMembership.findMany({
      where: {
        userId: authUserId,
        active: true,
        deletedAt: null,
      },
      select: { clubId: true },
    });
    return memberships.map((row) => row.clubId);
  }

  private async assertCanWriteGroupMessages(
    communityGroupId: string,
    authUserId: string,
  ): Promise<void> {
    const prisma = getPrismaClientOrThrow();
    const group = await prisma.communityGroup.findFirst({
      where: {
        id: communityGroupId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!group) {
      throw notFound('Community group not found', { communityGroupId });
    }

    const membership = await prisma.communityGroupMembership.findFirst({
      where: {
        communityGroupId,
        userId: authUserId,
        active: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!membership) {
      throw forbidden('Community group does not belong to authenticated user', {
        communityGroupId,
      });
    }
  }

  private async getHydratedThread(threadId: string): Promise<SeedRow> {
    const prisma = getPrismaClientOrThrow();
    const thread = await prisma.messageThread.findUnique({
      where: { id: threadId },
      include: {
        participants: {
          where: { leftAt: null },
        },
        messages: {
          where: { deletedAt: null },
          include: { receipts: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!thread) {
      throw notFound('Message thread not found', { threadId });
    }
    return normalizeAs<SeedRow>(thread);
  }

  async listCommunityGroups(params: CommunityMediaAccessParams): Promise<CommunityGroupListResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.listCommunityGroups(params);
    }

    const readableGroupIds = await this.getReadableCommunityGroupIds(params.authUserId);
    if (readableGroupIds.length === 0) {
      return { groups: [], dataVersion: null };
    }

    const prisma = getPrismaClientOrThrow();
    const groups = normalizeAs<SeedRow[]>(
      await prisma.communityGroup.findMany({
        where: {
          id: { in: readableGroupIds },
          deletedAt: null,
        },
        include: {
          memberships: {
            where: {
              active: true,
              deletedAt: null,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    );

    return {
      groups,
      dataVersion: null,
    };
  }

  async listPosts(params: PostListParams): Promise<PostListResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.listPosts(params);
    }

    const readableGroupIds = await this.getReadableCommunityGroupIds(params.authUserId);
    const readableClubIds = await this.getReadableClubIds(params.authUserId);

    if (params.communityGroupId && !readableGroupIds.includes(params.communityGroupId)) {
      throw forbidden('Community group does not belong to authenticated user', {
        communityGroupId: params.communityGroupId,
      });
    }

    const prisma = getPrismaClientOrThrow();
    const posts = normalizeAs<SeedRow[]>(
      await prisma.post.findMany({
        where: {
          deletedAt: null,
          ...(params.communityGroupId
            ? {
                communityGroupId: params.communityGroupId,
              }
            : {
                OR: [
                  { authorUserId: params.authUserId },
                  { communityGroupId: { in: readableGroupIds } },
                  { clubId: { in: readableClubIds } },
                ],
              }),
        },
        include: {
          comments: {
            where: {
              deletedAt: null,
              isDeleted: false,
            },
            orderBy: { createdAt: 'asc' },
          },
          reactions: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    );

    return {
      posts,
      dataVersion: null,
    };
  }

  async listMessageThreads(params: CommunityMediaAccessParams): Promise<MessageThreadListResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.listMessageThreads(params);
    }

    const prisma = getPrismaClientOrThrow();
    const participantRows = await prisma.messageParticipant.findMany({
      where: {
        userId: params.authUserId,
        leftAt: null,
      },
      select: { messageThreadId: true },
    });
    const threadIds = participantRows.map((row) => row.messageThreadId);
    if (threadIds.length === 0) {
      return { threads: [], dataVersion: null };
    }

    const threads = normalizeAs<SeedRow[]>(
      await prisma.messageThread.findMany({
        where: {
          id: { in: threadIds },
          deletedAt: null,
        },
        include: {
          participants: {
            where: { leftAt: null },
          },
          messages: {
            where: { deletedAt: null },
            include: {
              receipts: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    );

    return {
      threads,
      dataVersion: null,
    };
  }

  async listNotifications(params: CommunityMediaAccessParams): Promise<NotificationListResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.listNotifications(params);
    }

    const prisma = getPrismaClientOrThrow();
    const [notifications, preferences, mutedSources, quietHours] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: params.authUserId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notificationPreference.findUnique({
        where: { userId: params.authUserId },
      }),
      prisma.mutedSource.findMany({
        where: {
          userId: params.authUserId,
          unmutedAt: null,
        },
      }),
      prisma.quietHours.findUnique({
        where: { userId: params.authUserId },
      }),
    ]);

    const normalizedNotifications = normalizeAs<SeedRow[]>(notifications);

    return {
      notifications: normalizedNotifications,
      preferences: normalizeAs<SeedRow | null>(preferences),
      mutedSources: normalizeAs<SeedRow[]>(mutedSources),
      quietHours: normalizeAs<SeedRow | null>(quietHours),
      unreadCount: normalizedNotifications.filter((row) => asString(row.status) !== 'READ').length,
      dataVersion: null,
    };
  }

  async createGroupMessage(params: GroupMessageCreateParams): Promise<GroupMessageCreateResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.createGroupMessage(params);
    }

    await this.assertCanWriteGroupMessages(params.communityGroupId, params.authUserId);

    const requestHash = hashGroupMessageCreateRequest(params);
    const prisma = getPrismaClientOrThrow();
    if (params.idempotencyKey) {
      const existing = await prisma.idempotencyKey.findUnique({
        where: {
          userId_endpointKey_idempotencyKey: {
            userId: params.authUserId,
            endpointKey: GROUP_MESSAGE_CREATE_ENDPOINT_KEY,
            idempotencyKey: params.idempotencyKey,
          },
        },
      });
      if (existing) {
        assertMatchingIdempotencyRequest(normalizeAs<SeedRow>(existing), requestHash);
        return normalizeAs<GroupMessageCreateResult>(existing.responseBodyJson);
      }
    }

    const now = new Date();
    let response: GroupMessageCreateResult | null = null;

    await prisma.$transaction(async (tx) => {
      const group = await tx.communityGroup.findFirst({
        where: {
          id: params.communityGroupId,
          deletedAt: null,
        },
      });
      if (!group) {
        throw notFound('Community group not found', { communityGroupId: params.communityGroupId });
      }

      const memberships = await tx.communityGroupMembership.findMany({
        where: {
          communityGroupId: params.communityGroupId,
          active: true,
          deletedAt: null,
        },
      });
      if (!memberships.some((row) => row.userId === params.authUserId)) {
        throw forbidden('Community group does not belong to authenticated user', {
          communityGroupId: params.communityGroupId,
        });
      }

      let thread = await tx.messageThread.findFirst({
        where: {
          communityGroupId: params.communityGroupId,
          threadType: 'GROUP',
          deletedAt: null,
        },
      });
      if (!thread) {
        thread = await tx.messageThread.create({
          data: {
            id: newId('thr'),
            threadType: 'GROUP',
            clubId: group.clubId,
            communityGroupId: group.id,
            groupSessionId: null,
            bookingId: null,
            title: group.name,
            lastMessageAt: null,
            createdByUserId: params.authUserId,
            updatedByUserId: params.authUserId,
            createdAt: now,
            updatedAt: now,
          },
        });
      }

      for (const membership of memberships) {
        await tx.messageParticipant.upsert({
          where: {
            messageThreadId_userId: {
              messageThreadId: thread.id,
              userId: membership.userId,
            },
          },
          create: {
            id: newId('mpr'),
            messageThreadId: thread.id,
            userId: membership.userId,
            role: membership.role,
            lastReadAt: null,
            muted: false,
            joinedAt: now,
            leftAt: null,
          },
          update: {
            role: membership.role,
            leftAt: null,
          },
        });
      }

      const message = await tx.message.create({
        data: {
          id: newId('msg'),
          messageThreadId: thread.id,
          senderUserId: params.authUserId,
          content: params.body,
          attachmentsJson: [],
          createdAt: now,
          updatedAt: now,
        },
      });

      await tx.messageReceipt.createMany({
        data: memberships.map((membership) => ({
          id: newId('mrc'),
          messageId: message.id,
          userId: membership.userId,
          deliveredAt: now,
          readAt: membership.userId === params.authUserId ? now : null,
          createdAt: now,
          updatedAt: now,
        })),
        skipDuplicates: true,
      });

      await tx.messageParticipant.updateMany({
        where: {
          messageThreadId: thread.id,
          userId: params.authUserId,
        },
        data: {
          lastReadAt: now,
        },
      });

      await tx.messageThread.update({
        where: { id: thread.id },
        data: {
          lastMessageAt: now,
          updatedByUserId: params.authUserId,
          version: { increment: 1 },
        },
      });

      await tx.communityGroup.update({
        where: { id: group.id },
        data: {
          updatedByUserId: params.authUserId,
          version: { increment: 1 },
        },
      });

      const hydratedThread = await tx.messageThread.findUnique({
        where: { id: thread.id },
        include: {
          participants: {
            where: { leftAt: null },
          },
          messages: {
            where: { deletedAt: null },
            include: { receipts: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      if (!hydratedThread) {
        throw notFound('Message thread not found', { threadId: thread.id });
      }
      const hydratedMessage = hydratedThread.messages.find((row) => row.id === message.id);
      if (!hydratedMessage) {
        throw notFound('Message not found', { messageId: message.id });
      }

      response = {
        message: normalizeAs<SeedRow>(hydratedMessage),
        thread: normalizeAs<SeedRow>(hydratedThread),
        dataVersion: null,
      };

      if (params.idempotencyKey) {
        await tx.idempotencyKey.create({
          data: {
            id: newId('idk'),
            userId: params.authUserId,
            endpointKey: GROUP_MESSAGE_CREATE_ENDPOINT_KEY,
            idempotencyKey: params.idempotencyKey,
            requestHash,
            responseStatus: 201,
            responseBodyJson: response as never,
            expiresAt: new Date(now.getTime() + IDEMPOTENCY_TTL_MS),
          },
        });
      }
    });

    if (!response) {
      throw notFound('Message was not created');
    }
    return response;
  }

  async markGroupMessagesRead(params: GroupMessageReadParams): Promise<GroupMessageReadResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.markGroupMessagesRead(params);
    }

    await this.assertCanWriteGroupMessages(params.communityGroupId, params.authUserId);

    const prisma = getPrismaClientOrThrow();
    const thread = await prisma.messageThread.findFirst({
      where: {
        communityGroupId: params.communityGroupId,
        threadType: 'GROUP',
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!thread) {
      return { thread: null, dataVersion: null };
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const messages = await tx.message.findMany({
        where: {
          messageThreadId: thread.id,
          deletedAt: null,
        },
        select: { id: true },
      });

      for (const message of messages) {
        await tx.messageReceipt.upsert({
          where: {
            messageId_userId: {
              messageId: message.id,
              userId: params.authUserId,
            },
          },
          create: {
            id: newId('mrc'),
            messageId: message.id,
            userId: params.authUserId,
            deliveredAt: now,
            readAt: now,
            createdAt: now,
            updatedAt: now,
          },
          update: {
            deliveredAt: now,
            readAt: now,
          },
        });
      }

      await tx.messageParticipant.updateMany({
        where: {
          messageThreadId: thread.id,
          userId: params.authUserId,
          leftAt: null,
        },
        data: {
          lastReadAt: now,
        },
      });
    });

    return {
      thread: await this.getHydratedThread(thread.id),
      dataVersion: null,
    };
  }
}

const seedRepository = new StoreCommunityMediaRepository(() => getMarketplaceSeedStore());
const prismaRepository = new PrismaCommunityMediaRepository();

export function resolveCommunityMediaRepository(): CommunityMediaRepository {
  return getApiDataBackend() === 'db' ? prismaRepository : seedRepository;
}
