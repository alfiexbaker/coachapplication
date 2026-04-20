import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { forbidden, notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { normalizeForJson } from './normalize.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const asBoolean = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined);
const normalizeAs = <T>(value: unknown): T => normalizeForJson(value) as unknown as T;

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

export interface CommunityMediaRepository {
  listCommunityGroups(params: CommunityMediaAccessParams): Promise<CommunityGroupListResult>;
  listPosts(params: PostListParams): Promise<PostListResult>;
  listMessageThreads(params: CommunityMediaAccessParams): Promise<MessageThreadListResult>;
  listNotifications(params: CommunityMediaAccessParams): Promise<NotificationListResult>;
}

function isActiveMembership(row: SeedRow): boolean {
  return asString(row.deletedAt) == null && asBoolean(row.active) !== false;
}

function activeRows(rows: SeedRow[]): SeedRow[] {
  return rows.filter((row) => asString(row.deletedAt) == null);
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
}

const seedRepository = new StoreCommunityMediaRepository(() => getMarketplaceSeedStore());
const prismaRepository = new PrismaCommunityMediaRepository();

export function resolveCommunityMediaRepository(): CommunityMediaRepository {
  return getApiDataBackend() === 'db' ? prismaRepository : seedRepository;
}
