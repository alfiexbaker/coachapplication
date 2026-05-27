import crypto from 'node:crypto';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { badRequest, conflict, forbidden, notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { normalizeForJson } from './normalize.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const asBoolean = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined);
const coerceMetadata = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
const normalizeAs = <T>(value: unknown): T => normalizeForJson(value) as unknown as T;
const nowIso = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const IDEMPOTENCY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const GROUP_MESSAGE_CREATE_ENDPOINT_KEY = 'community.group-message.create';
const THREAD_MESSAGE_CREATE_ENDPOINT_KEY = 'community.thread-message.create';
const POST_COMMENT_CREATE_ENDPOINT_KEY = 'community.post-comment.create';
const POST_CREATE_ENDPOINT_KEY = 'community.post.create';
const STAFF_POST_ROLES = new Set(['ADMIN', 'CLUB_ADMIN', 'COACH', 'HEAD_COACH', 'OWNER', 'STAFF']);

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

export interface PostCreateParams extends CommunityMediaAccessParams {
  clubId?: string;
  communityGroupId?: string;
  content: string;
  visibility?: 'PUBLIC' | 'CLUB' | 'GROUP' | 'PRIVATE';
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface PostCommentListParams extends CommunityMediaAccessParams {
  postId: string;
}

export interface PostCommentReadParams extends CommunityMediaAccessParams {
  commentId: string;
}

export interface PostCommentCreateParams extends CommunityMediaAccessParams {
  postId: string;
  content: string;
  parentCommentId?: string;
  idempotencyKey?: string;
}

export interface PostCommentDeleteParams extends CommunityMediaAccessParams {
  commentId: string;
}

export interface PostCommentReactionParams extends CommunityMediaAccessParams {
  commentId: string;
}

export interface GroupMessageCreateParams extends CommunityMediaAccessParams {
  communityGroupId: string;
  body: string;
  idempotencyKey?: string;
}

export interface ThreadMessageCreateParams extends CommunityMediaAccessParams {
  messageThreadId: string;
  body: string;
  idempotencyKey?: string;
}

export interface MessageDeleteParams extends CommunityMediaAccessParams {
  messageId: string;
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

export interface PostMutationResult {
  post: SeedRow;
  dataVersion: string | null;
}

export interface PostCommentListResult {
  comments: SeedRow[];
  dataVersion: string | null;
}

export interface PostCommentMutationResult {
  comment: SeedRow;
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

export interface NotificationMutationParams extends CommunityMediaAccessParams {
  notificationId: string;
}

export interface NotificationMutationResult {
  notification: SeedRow;
  dataVersion: string | null;
}

export interface NotificationBulkMutationResult {
  notifications: SeedRow[];
  unreadCount: number;
  dataVersion: string | null;
}

export interface NotificationPreferenceUpdateParams extends CommunityMediaAccessParams {
  channels?: {
    push?: boolean;
    email?: boolean;
    sms?: boolean;
  };
  quietHours?: {
    enabled?: boolean;
    startTime?: string;
    endTime?: string;
    timezone?: string;
  };
  typePreferences?: Record<string, { enabled?: boolean; channels?: string[] }>;
  mutedCoaches?: Array<{ coachId: string; reason?: string | null }>;
}

export interface NotificationPreferenceMutationResult {
  preferences: SeedRow;
  mutedSources: SeedRow[];
  quietHours: SeedRow | null;
  dataVersion: string | null;
}

export interface GroupMessageCreateResult {
  message: SeedRow;
  thread: SeedRow;
  dataVersion: string | null;
}

export interface MessageMutationResult {
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
  createPost(params: PostCreateParams): Promise<PostMutationResult>;
  listPostComments(params: PostCommentListParams): Promise<PostCommentListResult>;
  getPostComment(params: PostCommentReadParams): Promise<PostCommentMutationResult>;
  createPostComment(params: PostCommentCreateParams): Promise<PostCommentMutationResult>;
  deletePostComment(params: PostCommentDeleteParams): Promise<PostCommentMutationResult>;
  togglePostCommentReaction(params: PostCommentReactionParams): Promise<PostCommentMutationResult>;
  listMessageThreads(params: CommunityMediaAccessParams): Promise<MessageThreadListResult>;
  listNotifications(params: CommunityMediaAccessParams): Promise<NotificationListResult>;
  markNotificationRead(params: NotificationMutationParams): Promise<NotificationMutationResult>;
  markAllNotificationsRead(params: CommunityMediaAccessParams): Promise<NotificationBulkMutationResult>;
  dismissNotification(params: NotificationMutationParams): Promise<NotificationMutationResult>;
  dismissAllNotifications(params: CommunityMediaAccessParams): Promise<NotificationBulkMutationResult>;
  updateNotificationPreferences(params: NotificationPreferenceUpdateParams): Promise<NotificationPreferenceMutationResult>;
  createGroupMessage(params: GroupMessageCreateParams): Promise<GroupMessageCreateResult>;
  createThreadMessage(params: ThreadMessageCreateParams): Promise<MessageMutationResult>;
  deleteMessage(params: MessageDeleteParams): Promise<MessageMutationResult>;
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

function hashThreadMessageCreateRequest(params: ThreadMessageCreateParams): string {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        messageThreadId: params.messageThreadId,
        body: params.body,
      }),
    )
    .digest('hex');
}

function hashPostCommentCreateRequest(params: PostCommentCreateParams): string {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        postId: params.postId,
        content: params.content.trim(),
        parentCommentId: params.parentCommentId ?? null,
      }),
    )
    .digest('hex');
}

function stableJson(value: unknown): string {
  if (value === undefined) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableJson(entryValue)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashPostCreateRequest(params: PostCreateParams): string {
  return crypto
    .createHash('sha256')
    .update(
      stableJson({
        clubId: params.clubId ?? null,
        communityGroupId: params.communityGroupId ?? null,
        content: params.content.trim(),
        visibility: params.visibility ?? null,
        metadata: params.metadata ?? {},
      }),
    )
    .digest('hex');
}

function assertMatchingIdempotencyRequest(
  row: SeedRow,
  requestHash: string,
  message = 'Idempotency key was already used with a different payload',
): void {
  if (asString(row.requestHash) !== requestHash) {
    throw conflict(message);
  }
}

function normalizeRole(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
}

function canStaffPostWithRole(value: unknown): boolean {
  return STAFF_POST_ROLES.has(normalizeRole(value));
}

function hydrateStorePost(tables: SeedTables, post: SeedRow): SeedRow {
  return {
    ...post,
    author: storeUserSummary(tables, asString(post.authorUserId)),
  };
}

function visibleStoreClub(tables: SeedTables, clubId: string | undefined): SeedRow | null {
  if (!clubId) {
    return null;
  }
  return activeRows(asRows(tables.clubs)).find((row) => asString(row.id) === clubId) ?? null;
}

function activeStoreCommunityGroup(tables: SeedTables, groupId: string | undefined): SeedRow | null {
  if (!groupId) {
    return null;
  }
  return activeRows(asRows(tables.communityGroups)).find((row) => asString(row.id) === groupId) ?? null;
}

function assertCanCreateStorePost(
  tables: SeedTables,
  params: PostCreateParams,
): { clubId: string | null; communityGroupId: string | null; visibility: string } {
  const group = activeStoreCommunityGroup(tables, params.communityGroupId);
  if (params.communityGroupId && !group) {
    throw notFound('Community group not found', { communityGroupId: params.communityGroupId });
  }

  const groupClubId = asString(group?.clubId);
  if (params.clubId && groupClubId && params.clubId !== groupClubId) {
    throw badRequest('Post clubId must match the community group clubId', {
      clubId: params.clubId,
      communityGroupId: params.communityGroupId,
    });
  }

  const clubId = params.clubId ?? groupClubId ?? null;
  if (!clubId && !params.communityGroupId) {
    throw badRequest('A clubId or communityGroupId is required for staff-led feed posting');
  }
  if (clubId && !visibleStoreClub(tables, clubId)) {
    throw notFound('Club not found', { clubId });
  }

  if (!params.isPrivilegedAdmin) {
    const groupMembership = params.communityGroupId
      ? asRows(tables.communityGroupMemberships).find(
          (row) =>
            isActiveMembership(row) &&
            asString(row.communityGroupId) === params.communityGroupId &&
            asString(row.userId) === params.authUserId,
        )
      : undefined;
    const clubMembership = clubId
      ? asRows(tables.clubMemberships).find(
          (row) =>
            isActiveMembership(row) &&
            asString(row.clubId) === clubId &&
            asString(row.userId) === params.authUserId,
        )
      : undefined;

    if (!canStaffPostWithRole(groupMembership?.role) && !canStaffPostWithRole(clubMembership?.role)) {
      throw forbidden('Only active staff can create feed posts for this club or group', {
        clubId,
        communityGroupId: params.communityGroupId,
      });
    }
  }

  return {
    clubId,
    communityGroupId: params.communityGroupId ?? null,
    visibility: params.visibility ?? (params.communityGroupId ? 'GROUP' : 'CLUB'),
  };
}

function storeUserSummary(tables: SeedTables, userId: string | undefined): SeedRow | null {
  if (!userId) {
    return null;
  }
  const user = asRows(tables.users).find((row) => asString(row.id) === userId);
  return {
    id: userId,
    name: asString(user?.name) ?? userId,
    avatarUrl: asString(user?.avatarUrl) ?? null,
  };
}

function getStoreCommentReactionState(
  tables: SeedTables,
  commentId: string | undefined,
  authUserId: string | undefined,
): { likesCount: number; likedByCurrentUser: boolean; likes: string[] } {
  if (!commentId) {
    return { likesCount: 0, likedByCurrentUser: false, likes: [] };
  }

  const likes = asRows(tables.postCommentReactions).filter(
    (row) =>
      asString(row.commentId) === commentId &&
      String(row.reaction ?? 'LIKE').toUpperCase() === 'LIKE',
  );
  const likedByCurrentUser = Boolean(
    authUserId && likes.some((row) => asString(row.userId) === authUserId),
  );
  return {
    likesCount: likes.length,
    likedByCurrentUser,
    likes: likedByCurrentUser && authUserId ? [authUserId] : [],
  };
}

function hydrateStorePostComment(
  tables: SeedTables,
  comment: SeedRow,
  authUserId?: string,
): SeedRow {
  const reactionState = getStoreCommentReactionState(tables, asString(comment.id), authUserId);
  return {
    ...comment,
    author: storeUserSummary(tables, asString(comment.authorUserId)),
    ...reactionState,
  };
}

function assertReadableStorePost(
  tables: SeedTables,
  postId: string,
  authUserId: string,
  isPrivilegedAdmin: boolean,
): SeedRow {
  const post = activeRows(asRows(tables.posts)).find((row) => asString(row.id) === postId);
  if (!post) {
    throw notFound('Post not found', { postId });
  }

  if (isPrivilegedAdmin || asString(post.authorUserId) === authUserId) {
    return post;
  }

  const postGroupId = asString(post.communityGroupId);
  const postClubId = asString(post.clubId);
  const readableGroupIds = readableCommunityGroupIds(tables, authUserId);
  const readableClubIds = readableClubIdsForUser(tables, authUserId);
  if (
    (postGroupId ? readableGroupIds.has(postGroupId) : false) ||
    (postClubId ? readableClubIds.has(postClubId) : false)
  ) {
    return post;
  }

  throw forbidden('Post is not visible to authenticated user', { postId });
}

function assertValidStoreParentComment(
  tables: SeedTables,
  postId: string,
  parentCommentId: string | undefined,
): void {
  if (!parentCommentId) {
    return;
  }

  const parent = asRows(tables.postComments).find(
    (row) => asString(row.id) === parentCommentId,
  );
  if (!parent || asString(parent.postId) !== postId) {
    throw badRequest('Parent comment must belong to the target post', {
      postId,
      parentCommentId,
    });
  }
  if (asBoolean(parent.isDeleted) === true || asString(parent.deletedAt) != null) {
    throw badRequest('Cannot reply to a deleted comment', { parentCommentId });
  }
  if (asString(parent.parentCommentId)) {
    throw badRequest('Cannot reply to a reply; comments support one reply level', {
      parentCommentId,
    });
  }
}

function refreshStorePostCommentCount(
  tables: SeedTables,
  post: SeedRow,
  authUserId: string,
  now: string,
): void {
  const postId = asString(post.id);
  post.commentsCount = asRows(tables.postComments).filter(
    (row) =>
      asString(row.postId) === postId &&
      asBoolean(row.isDeleted) !== true &&
      asString(row.deletedAt) == null,
  ).length;
  post.updatedAt = now;
  post.updatedByUserId = authUserId;
  post.version = Number(post.version ?? 1) + 1;
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

function refreshStoreThreadLastMessage(
  tables: SeedTables,
  thread: SeedRow,
  authUserId: string,
  now: string,
): void {
  const threadId = asString(thread.id);
  const latestMessage = activeRows(asRows(tables.messages))
    .filter((row) => asString(row.messageThreadId) === threadId)
    .sort(
      (left, right) =>
        Date.parse(asString(right.createdAt) ?? '') - Date.parse(asString(left.createdAt) ?? ''),
    )[0];

  thread.lastMessageAt = asString(latestMessage?.createdAt) ?? null;
  thread.updatedAt = now;
  thread.updatedByUserId = authUserId;
  thread.version = Number(thread.version ?? 1) + 1;
}

function isVisibleNotification(row: SeedRow): boolean {
  return asString(row.dismissedAt) == null && String(row.status ?? '').toUpperCase() !== 'DISMISSED';
}

function notificationUnreadCount(rows: SeedRow[]): number {
  return rows.filter((row) => isVisibleNotification(row) && asString(row.status) !== 'READ').length;
}

function storeNotificationsForUser(tables: SeedTables, authUserId: string): SeedRow[] {
  return asRows(tables.notifications).filter((row) => asString(row.userId) === authUserId);
}

function activeMutedSourcesForUser(tables: SeedTables, authUserId: string): SeedRow[] {
  return asRows(tables.mutedSources).filter(
    (row) => asString(row.userId) === authUserId && asString(row.unmutedAt) == null,
  );
}

function quietHoursForUser(tables: SeedTables, authUserId: string): SeedRow | null {
  return asRows(tables.quietHours).find((row) => asString(row.userId) === authUserId) ?? null;
}

function normalizeTypePreferences(
  value: Record<string, { enabled?: boolean; channels?: string[] }> | undefined,
): Record<string, { enabled: boolean; channels: string[] }> | undefined {
  if (!value) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      {
        enabled: entry.enabled !== false,
        channels: Array.isArray(entry.channels)
          ? Array.from(new Set(entry.channels.map((channel) => String(channel).toUpperCase())))
          : [],
      },
    ]),
  );
}

function ensureStoreNotificationPreference(
  tables: SeedTables,
  authUserId: string,
  now: string,
): SeedRow {
  const preferences = ensureRows(tables, 'notificationPreferences');
  const existing = preferences.find((row) => asString(row.userId) === authUserId);
  if (existing) {
    return existing;
  }

  const created: SeedRow = {
    userId: authUserId,
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    settingsJson: {},
    createdAt: now,
    updatedAt: now,
  };
  preferences.push(created);
  return created;
}

function findMutableStoreNotification(
  tables: SeedTables,
  notificationId: string,
  authUserId: string,
): SeedRow {
  const notification = asRows(tables.notifications).find((row) => asString(row.id) === notificationId);
  if (!notification) {
    throw notFound('Notification not found', { notificationId });
  }
  if (asString(notification.userId) !== authUserId) {
    throw forbidden('Notification does not belong to authenticated user', { notificationId });
  }
  return notification;
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

function activeStoreThreadParticipant(
  tables: SeedTables,
  messageThreadId: string,
  authUserId: string,
): SeedRow | undefined {
  return asRows(tables.messageParticipants).find(
    (row) =>
      asString(row.messageThreadId) === messageThreadId &&
      asString(row.userId) === authUserId &&
      asString(row.leftAt) == null,
  );
}

function assertCanWriteStoreThreadMessages(
  tables: SeedTables,
  messageThreadId: string,
  authUserId: string,
): SeedRow {
  const thread = activeRows(asRows(tables.messageThreads)).find(
    (row) => asString(row.id) === messageThreadId,
  );
  if (!thread) {
    throw notFound('Message thread not found', { messageThreadId });
  }

  if (!activeStoreThreadParticipant(tables, messageThreadId, authUserId)) {
    throw forbidden('Message thread does not belong to authenticated user', {
      messageThreadId,
    });
  }

  return thread;
}

function assertCanDeleteStoreMessage(
  tables: SeedTables,
  messageId: string,
  authUserId: string,
  isPrivilegedAdmin: boolean,
): { message: SeedRow; thread: SeedRow } {
  const message = asRows(tables.messages).find((row) => asString(row.id) === messageId);
  if (!message) {
    throw notFound('Message not found', { messageId });
  }
  if (asString(message.deletedAt) != null) {
    throw conflict('Message is already deleted', { messageId });
  }

  const messageThreadId = asString(message.messageThreadId);
  const thread = activeRows(asRows(tables.messageThreads)).find(
    (row) => asString(row.id) === messageThreadId,
  );
  if (!thread || !messageThreadId) {
    throw notFound('Message thread not found', { messageId });
  }

  if (isPrivilegedAdmin) {
    return { message, thread };
  }
  if (!activeStoreThreadParticipant(tables, messageThreadId, authUserId)) {
    throw forbidden('Message thread does not belong to authenticated user', {
      messageThreadId,
    });
  }
  if (asString(message.senderUserId) !== authUserId) {
    throw forbidden('Only the message sender or privileged admin can delete this message', {
      messageId,
    });
  }

  return { message, thread };
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

  assertMatchingIdempotencyRequest(
    entry,
    requestHash,
    'Idempotency key was already used with a different community message payload',
  );
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

function findSeedThreadMessageCreateIdempotency(params: {
  tables: SeedTables;
  authUserId: string;
  body: ThreadMessageCreateParams;
}): MessageMutationResult | null {
  if (!params.body.idempotencyKey) {
    return null;
  }

  const requestHash = hashThreadMessageCreateRequest(params.body);
  const entry = asRows(params.tables.idempotencyKeys).find(
    (row) =>
      asString(row.userId) === params.authUserId &&
      asString(row.endpointKey) === THREAD_MESSAGE_CREATE_ENDPOINT_KEY &&
      asString(row.idempotencyKey) === params.body.idempotencyKey,
  );
  if (!entry) {
    return null;
  }

  assertMatchingIdempotencyRequest(
    entry,
    requestHash,
    'Idempotency key was already used with a different direct message payload',
  );
  return normalizeAs<MessageMutationResult>(entry.responseBodyJson);
}

function recordSeedThreadMessageCreateIdempotency(params: {
  tables: SeedTables;
  authUserId: string;
  body: ThreadMessageCreateParams;
  response: MessageMutationResult;
  now: string;
}): void {
  if (!params.body.idempotencyKey) {
    return;
  }

  ensureRows(params.tables, 'idempotencyKeys').push({
    id: newId('idk'),
    userId: params.authUserId,
    endpointKey: THREAD_MESSAGE_CREATE_ENDPOINT_KEY,
    idempotencyKey: params.body.idempotencyKey,
    requestHash: hashThreadMessageCreateRequest(params.body),
    responseStatus: 201,
    responseBodyJson: params.response,
    createdAt: params.now,
    expiresAt: new Date(Date.parse(params.now) + IDEMPOTENCY_TTL_MS).toISOString(),
  });
}

function findSeedPostCreateIdempotency(params: {
  tables: SeedTables;
  authUserId: string;
  body: PostCreateParams;
}): PostMutationResult | null {
  if (!params.body.idempotencyKey) {
    return null;
  }

  const requestHash = hashPostCreateRequest(params.body);
  const entry = asRows(params.tables.idempotencyKeys).find(
    (row) =>
      asString(row.userId) === params.authUserId &&
      asString(row.endpointKey) === POST_CREATE_ENDPOINT_KEY &&
      asString(row.idempotencyKey) === params.body.idempotencyKey,
  );
  if (!entry) {
    return null;
  }

  assertMatchingIdempotencyRequest(
    entry,
    requestHash,
    'Idempotency key was already used with a different post payload',
  );
  return normalizeAs<PostMutationResult>(entry.responseBodyJson);
}

function recordSeedPostCreateIdempotency(params: {
  tables: SeedTables;
  authUserId: string;
  body: PostCreateParams;
  response: PostMutationResult;
  now: string;
}): void {
  if (!params.body.idempotencyKey) {
    return;
  }

  ensureRows(params.tables, 'idempotencyKeys').push({
    id: newId('idk'),
    userId: params.authUserId,
    endpointKey: POST_CREATE_ENDPOINT_KEY,
    idempotencyKey: params.body.idempotencyKey,
    requestHash: hashPostCreateRequest(params.body),
    responseStatus: 201,
    responseBodyJson: params.response,
    createdAt: params.now,
    expiresAt: new Date(Date.parse(params.now) + IDEMPOTENCY_TTL_MS).toISOString(),
  });
}

function findSeedPostCommentCreateIdempotency(params: {
  tables: SeedTables;
  authUserId: string;
  body: PostCommentCreateParams;
}): PostCommentMutationResult | null {
  if (!params.body.idempotencyKey) {
    return null;
  }

  const requestHash = hashPostCommentCreateRequest(params.body);
  const entry = asRows(params.tables.idempotencyKeys).find(
    (row) =>
      asString(row.userId) === params.authUserId &&
      asString(row.endpointKey) === POST_COMMENT_CREATE_ENDPOINT_KEY &&
      asString(row.idempotencyKey) === params.body.idempotencyKey,
  );
  if (!entry) {
    return null;
  }

  assertMatchingIdempotencyRequest(
    entry,
    requestHash,
    'Idempotency key was already used with a different post comment payload',
  );
  return normalizeAs<PostCommentMutationResult>(entry.responseBodyJson);
}

function recordSeedPostCommentCreateIdempotency(params: {
  tables: SeedTables;
  authUserId: string;
  body: PostCommentCreateParams;
  response: PostCommentMutationResult;
  now: string;
}): void {
  if (!params.body.idempotencyKey) {
    return;
  }

  ensureRows(params.tables, 'idempotencyKeys').push({
    id: newId('idk'),
    userId: params.authUserId,
    endpointKey: POST_COMMENT_CREATE_ENDPOINT_KEY,
    idempotencyKey: params.body.idempotencyKey,
    requestHash: hashPostCommentCreateRequest(params.body),
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

  async createPost(params: PostCreateParams): Promise<PostMutationResult> {
    const store = this.storeProvider();
    const scope = assertCanCreateStorePost(store.tables, params);
    const replay = findSeedPostCreateIdempotency({
      tables: store.tables,
      authUserId: params.authUserId,
      body: params,
    });
    if (replay) {
      return replay;
    }

    const content = params.content.trim();
    if (!content) {
      throw badRequest('Post content cannot be empty');
    }
    if (content.length > 4000) {
      throw badRequest('Post content must be 4000 characters or fewer');
    }

    const now = nowIso();
    const post: SeedRow = {
      id: newId('pst'),
      authorUserId: params.authUserId,
      clubId: scope.clubId,
      communityGroupId: scope.communityGroupId,
      visibility: scope.visibility,
      content,
      attachmentsJson: params.metadata ?? {},
      commentsCount: 0,
      reactionsCount: 0,
      createdByUserId: params.authUserId,
      updatedByUserId: params.authUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    };
    ensureRows(store.tables, 'posts').push(post);

    if (scope.communityGroupId) {
      const group = activeStoreCommunityGroup(store.tables, scope.communityGroupId);
      if (group) {
        group.updatedAt = now;
        group.updatedByUserId = params.authUserId;
        group.version = Number(group.version ?? 1) + 1;
      }
    }

    const response: PostMutationResult = {
      post: hydrateStorePost(store.tables, post),
      dataVersion: store.version,
    };
    recordSeedPostCreateIdempotency({
      tables: store.tables,
      authUserId: params.authUserId,
      body: params,
      response,
      now,
    });
    return response;
  }

  async listPostComments(params: PostCommentListParams): Promise<PostCommentListResult> {
    const store = this.storeProvider();
    assertReadableStorePost(
      store.tables,
      params.postId,
      params.authUserId,
      params.isPrivilegedAdmin,
    );

    const comments = asRows(store.tables.postComments)
      .filter((row) => asString(row.postId) === params.postId)
      .sort(
        (left, right) =>
          Date.parse(asString(left.createdAt) ?? '') - Date.parse(asString(right.createdAt) ?? ''),
      )
      .map((comment) => hydrateStorePostComment(store.tables, comment, params.authUserId));

    return {
      comments,
      dataVersion: store.version,
    };
  }

  async getPostComment(params: PostCommentReadParams): Promise<PostCommentMutationResult> {
    const store = this.storeProvider();
    const comment = asRows(store.tables.postComments).find(
      (row) => asString(row.id) === params.commentId,
    );
    if (!comment) {
      throw notFound('Comment not found', { commentId: params.commentId });
    }
    const postId = asString(comment.postId);
    if (!postId) {
      throw notFound('Post not found', { commentId: params.commentId });
    }
    assertReadableStorePost(
      store.tables,
      postId,
      params.authUserId,
      params.isPrivilegedAdmin,
    );

    return {
      comment: hydrateStorePostComment(store.tables, comment, params.authUserId),
      dataVersion: store.version,
    };
  }

  async createPostComment(params: PostCommentCreateParams): Promise<PostCommentMutationResult> {
    const store = this.storeProvider();
    const post = assertReadableStorePost(
      store.tables,
      params.postId,
      params.authUserId,
      params.isPrivilegedAdmin,
    );
    const replay = findSeedPostCommentCreateIdempotency({
      tables: store.tables,
      authUserId: params.authUserId,
      body: params,
    });
    if (replay) {
      return replay;
    }

    const content = params.content.trim();
    if (!content) {
      throw badRequest('Comment content cannot be empty');
    }
    if (content.length > 2000) {
      throw badRequest('Comment must be 2000 characters or fewer');
    }

    assertValidStoreParentComment(store.tables, params.postId, params.parentCommentId);

    const now = nowIso();
    const comment: SeedRow = {
      id: newId('cmt'),
      postId: params.postId,
      authorUserId: params.authUserId,
      parentCommentId: params.parentCommentId ?? null,
      content,
      isDeleted: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    ensureRows(store.tables, 'postComments').push(comment);
    refreshStorePostCommentCount(store.tables, post, params.authUserId, now);

    const response: PostCommentMutationResult = {
      comment: hydrateStorePostComment(store.tables, comment, params.authUserId),
      dataVersion: store.version,
    };
    recordSeedPostCommentCreateIdempotency({
      tables: store.tables,
      authUserId: params.authUserId,
      body: params,
      response,
      now,
    });
    return response;
  }

  async deletePostComment(params: PostCommentDeleteParams): Promise<PostCommentMutationResult> {
    const store = this.storeProvider();
    const comment = asRows(store.tables.postComments).find(
      (row) => asString(row.id) === params.commentId,
    );
    if (!comment) {
      throw notFound('Comment not found', { commentId: params.commentId });
    }
    const postId = asString(comment.postId);
    if (!postId) {
      throw notFound('Post not found', { commentId: params.commentId });
    }
    const post = assertReadableStorePost(
      store.tables,
      postId,
      params.authUserId,
      params.isPrivilegedAdmin,
    );

    if (!params.isPrivilegedAdmin && asString(comment.authorUserId) !== params.authUserId) {
      throw forbidden('Only the comment author or privileged admin can delete this comment', {
        commentId: params.commentId,
      });
    }
    if (asBoolean(comment.isDeleted) === true || asString(comment.deletedAt) != null) {
      throw conflict('Comment is already deleted', { commentId: params.commentId });
    }

    const now = nowIso();
    comment.content = '[deleted]';
    comment.isDeleted = true;
    comment.deletedAt = now;
    comment.updatedAt = now;
    refreshStorePostCommentCount(store.tables, post, params.authUserId, now);

    return {
      comment: hydrateStorePostComment(store.tables, comment, params.authUserId),
      dataVersion: store.version,
    };
  }

  async togglePostCommentReaction(params: PostCommentReactionParams): Promise<PostCommentMutationResult> {
    const store = this.storeProvider();
    const comment = asRows(store.tables.postComments).find(
      (row) => asString(row.id) === params.commentId,
    );
    if (!comment) {
      throw notFound('Comment not found', { commentId: params.commentId });
    }
    const postId = asString(comment.postId);
    if (!postId) {
      throw notFound('Post not found', { commentId: params.commentId });
    }
    assertReadableStorePost(
      store.tables,
      postId,
      params.authUserId,
      params.isPrivilegedAdmin,
    );
    if (asBoolean(comment.isDeleted) === true || asString(comment.deletedAt) != null) {
      throw badRequest('Cannot react to a deleted comment', { commentId: params.commentId });
    }

    const reactions = ensureRows(store.tables, 'postCommentReactions');
    const existingIndex = reactions.findIndex(
      (row) =>
        asString(row.commentId) === params.commentId &&
        asString(row.userId) === params.authUserId &&
        String(row.reaction ?? 'LIKE').toUpperCase() === 'LIKE',
    );
    if (existingIndex >= 0) {
      reactions.splice(existingIndex, 1);
    } else {
      reactions.push({
        id: newId('pcr'),
        commentId: params.commentId,
        userId: params.authUserId,
        reaction: 'LIKE',
        createdAt: nowIso(),
      });
    }

    return {
      comment: hydrateStorePostComment(store.tables, comment, params.authUserId),
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
      unreadCount: notificationUnreadCount(notifications),
      dataVersion: store.version,
    };
  }

  async markNotificationRead(params: NotificationMutationParams): Promise<NotificationMutationResult> {
    const store = this.storeProvider();
    const notification = findMutableStoreNotification(
      store.tables,
      params.notificationId,
      params.authUserId,
    );
    const now = nowIso();
    notification.status = 'READ';
    notification.readAt = asString(notification.readAt) ?? now;
    notification.updatedAt = now;
    return {
      notification,
      dataVersion: store.version,
    };
  }

  async markAllNotificationsRead(params: CommunityMediaAccessParams): Promise<NotificationBulkMutationResult> {
    const store = this.storeProvider();
    const notifications = storeNotificationsForUser(store.tables, params.authUserId);
    const now = nowIso();
    for (const notification of notifications.filter(isVisibleNotification)) {
      notification.status = 'READ';
      notification.readAt = asString(notification.readAt) ?? now;
      notification.updatedAt = now;
    }
    return {
      notifications,
      unreadCount: notificationUnreadCount(notifications),
      dataVersion: store.version,
    };
  }

  async dismissNotification(params: NotificationMutationParams): Promise<NotificationMutationResult> {
    const store = this.storeProvider();
    const notification = findMutableStoreNotification(
      store.tables,
      params.notificationId,
      params.authUserId,
    );
    const now = nowIso();
    notification.status = 'DISMISSED';
    notification.dismissedAt = asString(notification.dismissedAt) ?? now;
    notification.updatedAt = now;
    return {
      notification,
      dataVersion: store.version,
    };
  }

  async dismissAllNotifications(params: CommunityMediaAccessParams): Promise<NotificationBulkMutationResult> {
    const store = this.storeProvider();
    const notifications = storeNotificationsForUser(store.tables, params.authUserId);
    const now = nowIso();
    for (const notification of notifications.filter(isVisibleNotification)) {
      notification.status = 'DISMISSED';
      notification.dismissedAt = asString(notification.dismissedAt) ?? now;
      notification.updatedAt = now;
    }
    return {
      notifications,
      unreadCount: notificationUnreadCount(notifications),
      dataVersion: store.version,
    };
  }

  async updateNotificationPreferences(
    params: NotificationPreferenceUpdateParams,
  ): Promise<NotificationPreferenceMutationResult> {
    const store = this.storeProvider();
    const now = nowIso();
    const preferences = ensureStoreNotificationPreference(store.tables, params.authUserId, now);
    preferences.pushEnabled = params.channels?.push ?? preferences.pushEnabled ?? true;
    preferences.emailEnabled = params.channels?.email ?? preferences.emailEnabled ?? true;
    preferences.smsEnabled = params.channels?.sms ?? preferences.smsEnabled ?? false;

    const typePreferences = normalizeTypePreferences(params.typePreferences);
    if (typePreferences) {
      const existingSettings = coerceMetadata(preferences.settingsJson);
      preferences.settingsJson = {
        ...existingSettings,
        typePreferences,
      };
    }
    preferences.updatedAt = now;

    let quietHours = quietHoursForUser(store.tables, params.authUserId);
    if (params.quietHours) {
      if (!quietHours) {
        quietHours = {
          userId: params.authUserId,
          enabled: false,
          startTimeLocal: '22:00',
          endTimeLocal: '07:00',
          timeZone: 'Europe/London',
          createdAt: now,
          updatedAt: now,
        };
        ensureRows(store.tables, 'quietHours').push(quietHours);
      }
      quietHours.enabled = params.quietHours.enabled ?? quietHours.enabled ?? false;
      quietHours.startTimeLocal = params.quietHours.startTime ?? quietHours.startTimeLocal ?? '22:00';
      quietHours.endTimeLocal = params.quietHours.endTime ?? quietHours.endTimeLocal ?? '07:00';
      quietHours.timeZone = params.quietHours.timezone ?? quietHours.timeZone ?? 'Europe/London';
      quietHours.updatedAt = now;
    }

    if (params.mutedCoaches) {
      const desired = new Map(
        params.mutedCoaches.map((coach) => [coach.coachId, coach.reason ?? null] as const),
      );
      const mutedSources = ensureRows(store.tables, 'mutedSources');
      for (const source of mutedSources.filter(
        (row) =>
          asString(row.userId) === params.authUserId &&
          String(row.sourceType ?? '').toLowerCase() === 'coach',
      )) {
        const coachId = asString(source.sourceId);
        if (!coachId || !desired.has(coachId)) {
          source.unmutedAt = asString(source.unmutedAt) ?? now;
          continue;
        }
        source.reason = desired.get(coachId);
        source.unmutedAt = null;
        desired.delete(coachId);
      }
      for (const [coachId, reason] of desired.entries()) {
        mutedSources.push({
          id: newId('mut'),
          userId: params.authUserId,
          sourceType: 'coach',
          sourceId: coachId,
          reason,
          mutedAt: now,
          unmutedAt: null,
        });
      }
    }

    return {
      preferences,
      mutedSources: activeMutedSourcesForUser(store.tables, params.authUserId),
      quietHours,
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

  async createThreadMessage(params: ThreadMessageCreateParams): Promise<MessageMutationResult> {
    const store = this.storeProvider();
    const replay = findSeedThreadMessageCreateIdempotency({
      tables: store.tables,
      authUserId: params.authUserId,
      body: params,
    });
    if (replay) {
      return replay;
    }

    const body = params.body.trim();
    if (!body) {
      throw badRequest('Message body cannot be empty');
    }
    if (body.length > 4000) {
      throw badRequest('Message body must be 4000 characters or fewer');
    }

    const now = nowIso();
    const thread = assertCanWriteStoreThreadMessages(
      store.tables,
      params.messageThreadId,
      params.authUserId,
    );
    const threadId = asString(thread.id) as string;
    const message: SeedRow = {
      id: newId('msg'),
      messageThreadId: threadId,
      senderUserId: params.authUserId,
      content: body,
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

    const response: MessageMutationResult = {
      message: hydrateStoreMessage(store.tables, message),
      thread: hydrateStoreThread(store.tables, thread),
      dataVersion: store.version,
    };
    recordSeedThreadMessageCreateIdempotency({
      tables: store.tables,
      authUserId: params.authUserId,
      body: params,
      response,
      now,
    });
    return response;
  }

  async deleteMessage(params: MessageDeleteParams): Promise<MessageMutationResult> {
    const store = this.storeProvider();
    const { message, thread } = assertCanDeleteStoreMessage(
      store.tables,
      params.messageId,
      params.authUserId,
      params.isPrivilegedAdmin,
    );

    const now = nowIso();
    message.content = '[deleted]';
    message.deletedAt = now;
    message.updatedAt = now;
    refreshStoreThreadLastMessage(store.tables, thread, params.authUserId, now);

    return {
      message: hydrateStoreMessage(store.tables, message),
      thread: hydrateStoreThread(store.tables, thread),
      dataVersion: store.version,
    };
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

  private async assertReadablePost(
    postId: string,
    authUserId: string,
    isPrivilegedAdmin: boolean,
  ): Promise<SeedRow> {
    const prisma = getPrismaClientOrThrow();
    const post = await prisma.post.findFirst({
      where: {
        id: postId,
        deletedAt: null,
      },
    });
    if (!post) {
      throw notFound('Post not found', { postId });
    }

    if (isPrivilegedAdmin || post.authorUserId === authUserId) {
      return normalizeAs<SeedRow>(post);
    }

    const [groupMembership, clubMembership] = await Promise.all([
      post.communityGroupId
        ? prisma.communityGroupMembership.findFirst({
            where: {
              communityGroupId: post.communityGroupId,
              userId: authUserId,
              active: true,
              deletedAt: null,
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      post.clubId
        ? prisma.clubMembership.findFirst({
            where: {
              clubId: post.clubId,
              userId: authUserId,
              active: true,
              deletedAt: null,
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);
    if (groupMembership || clubMembership) {
      return normalizeAs<SeedRow>(post);
    }

    throw forbidden('Post is not visible to authenticated user', { postId });
  }

  private async assertCanCreatePost(params: PostCreateParams): Promise<{
    clubId: string | null;
    communityGroupId: string | null;
    visibility: 'PUBLIC' | 'CLUB' | 'GROUP' | 'PRIVATE';
  }> {
    const prisma = getPrismaClientOrThrow();
    const group = params.communityGroupId
      ? await prisma.communityGroup.findFirst({
          where: { id: params.communityGroupId, deletedAt: null },
        })
      : null;
    if (params.communityGroupId && !group) {
      throw notFound('Community group not found', { communityGroupId: params.communityGroupId });
    }

    if (params.clubId && group?.clubId && params.clubId !== group.clubId) {
      throw badRequest('Post clubId must match the community group clubId', {
        clubId: params.clubId,
        communityGroupId: params.communityGroupId,
      });
    }

    const clubId = params.clubId ?? group?.clubId ?? null;
    if (!clubId && !params.communityGroupId) {
      throw badRequest('A clubId or communityGroupId is required for staff-led feed posting');
    }
    if (clubId) {
      const club = await prisma.club.findFirst({
        where: { id: clubId, deletedAt: null },
        select: { id: true },
      });
      if (!club) {
        throw notFound('Club not found', { clubId });
      }
    }

    if (!params.isPrivilegedAdmin) {
      const [groupMembership, clubMembership] = await Promise.all([
        params.communityGroupId
          ? prisma.communityGroupMembership.findFirst({
              where: {
                communityGroupId: params.communityGroupId,
                userId: params.authUserId,
                active: true,
                deletedAt: null,
              },
              select: { role: true },
            })
          : Promise.resolve(null),
        clubId
          ? prisma.clubMembership.findFirst({
              where: {
                clubId,
                userId: params.authUserId,
                active: true,
                deletedAt: null,
              },
              select: { role: true },
            })
          : Promise.resolve(null),
      ]);
      if (!canStaffPostWithRole(groupMembership?.role) && !canStaffPostWithRole(clubMembership?.role)) {
        throw forbidden('Only active staff can create feed posts for this club or group', {
          clubId,
          communityGroupId: params.communityGroupId,
        });
      }
    }

    return {
      clubId,
      communityGroupId: params.communityGroupId ?? null,
      visibility: params.visibility ?? (params.communityGroupId ? 'GROUP' : 'CLUB'),
    };
  }

  private async hydratePosts(posts: SeedRow[]): Promise<SeedRow[]> {
    if (posts.length === 0) {
      return [];
    }

    const userIds = Array.from(
      new Set(
        posts
          .map((post) => asString(post.authorUserId))
          .filter((userId): userId is string => Boolean(userId)),
      ),
    );
    const prisma = getPrismaClientOrThrow();
    const users = normalizeAs<SeedRow[]>(
      userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, avatarUrl: true },
          })
        : [],
    );
    const usersById = new Map(users.map((user) => [asString(user.id), user] as const));

    return posts.map((post) => {
      const authorUserId = asString(post.authorUserId);
      const user = authorUserId ? usersById.get(authorUserId) : undefined;
      return {
        ...post,
        author: authorUserId
          ? {
              id: authorUserId,
              name: asString(user?.name) ?? authorUserId,
              avatarUrl: asString(user?.avatarUrl) ?? null,
            }
          : null,
      };
    });
  }

  private async hydratePostComments(comments: SeedRow[], authUserId?: string): Promise<SeedRow[]> {
    if (comments.length === 0) {
      return [];
    }

    const commentIds = comments
      .map((comment) => asString(comment.id))
      .filter((commentId): commentId is string => Boolean(commentId));
    const userIds = Array.from(
      new Set(
        comments
          .map((comment) => asString(comment.authorUserId))
          .filter((userId): userId is string => Boolean(userId)),
      ),
    );
    const prisma = getPrismaClientOrThrow();
    const users = normalizeAs<SeedRow[]>(
      userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, avatarUrl: true },
          })
        : [],
    );
    const usersById = new Map(users.map((user) => [asString(user.id), user] as const));
    const reactions = normalizeAs<SeedRow[]>(
      commentIds.length > 0
        ? await prisma.postCommentReaction.findMany({
            where: {
              commentId: { in: commentIds },
              reaction: 'LIKE',
            },
          })
        : [],
    );
    const likesCountByCommentId = new Map<string, number>();
    const likedCommentIds = new Set<string>();
    for (const reaction of reactions) {
      const commentId = asString(reaction.commentId);
      if (!commentId) {
        continue;
      }
      likesCountByCommentId.set(commentId, (likesCountByCommentId.get(commentId) ?? 0) + 1);
      if (authUserId && asString(reaction.userId) === authUserId) {
        likedCommentIds.add(commentId);
      }
    }

    return comments.map((comment) => {
      const authorUserId = asString(comment.authorUserId);
      const user = authorUserId ? usersById.get(authorUserId) : undefined;
      const commentId = asString(comment.id);
      const likedByCurrentUser = Boolean(commentId && likedCommentIds.has(commentId));
      return {
        ...comment,
        author: authorUserId
          ? {
              id: authorUserId,
              name: asString(user?.name) ?? authorUserId,
              avatarUrl: asString(user?.avatarUrl) ?? null,
            }
          : null,
        likesCount: commentId ? likesCountByCommentId.get(commentId) ?? 0 : 0,
        likedByCurrentUser,
        likes: likedByCurrentUser && authUserId ? [authUserId] : [],
      };
    });
  }

  private async hydratePostComment(comment: SeedRow, authUserId?: string): Promise<SeedRow> {
    return (await this.hydratePostComments([comment], authUserId))[0] as SeedRow;
  }

  private async assertValidPrismaParentComment(
    postId: string,
    parentCommentId: string | undefined,
  ): Promise<void> {
    if (!parentCommentId) {
      return;
    }

    const prisma = getPrismaClientOrThrow();
    const parent = await prisma.postComment.findUnique({
      where: { id: parentCommentId },
    });
    if (!parent || parent.postId !== postId) {
      throw badRequest('Parent comment must belong to the target post', {
        postId,
        parentCommentId,
      });
    }
    if (parent.isDeleted || parent.deletedAt) {
      throw badRequest('Cannot reply to a deleted comment', { parentCommentId });
    }
    if (parent.parentCommentId) {
      throw badRequest('Cannot reply to a reply; comments support one reply level', {
        parentCommentId,
      });
    }
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

  private async assertCanWriteThreadMessages(
    messageThreadId: string,
    authUserId: string,
  ): Promise<void> {
    const prisma = getPrismaClientOrThrow();
    const thread = await prisma.messageThread.findFirst({
      where: {
        id: messageThreadId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!thread) {
      throw notFound('Message thread not found', { messageThreadId });
    }

    const participant = await prisma.messageParticipant.findFirst({
      where: {
        messageThreadId,
        userId: authUserId,
        leftAt: null,
      },
      select: { id: true },
    });
    if (!participant) {
      throw forbidden('Message thread does not belong to authenticated user', {
        messageThreadId,
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
      posts: await this.hydratePosts(posts),
      dataVersion: null,
    };
  }

  async createPost(params: PostCreateParams): Promise<PostMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.createPost(params);
    }

    const scope = await this.assertCanCreatePost(params);
    const prisma = getPrismaClientOrThrow();
    const requestHash = hashPostCreateRequest(params);
    if (params.idempotencyKey) {
      const existing = await prisma.idempotencyKey.findUnique({
        where: {
          userId_endpointKey_idempotencyKey: {
            userId: params.authUserId,
            endpointKey: POST_CREATE_ENDPOINT_KEY,
            idempotencyKey: params.idempotencyKey,
          },
        },
      });
      if (existing) {
        assertMatchingIdempotencyRequest(
          normalizeAs<SeedRow>(existing),
          requestHash,
          'Idempotency key was already used with a different post payload',
        );
        return normalizeAs<PostMutationResult>(existing.responseBodyJson);
      }
    }

    const content = params.content.trim();
    if (!content) {
      throw badRequest('Post content cannot be empty');
    }
    if (content.length > 4000) {
      throw badRequest('Post content must be 4000 characters or fewer');
    }

    const now = new Date();
    let response: PostMutationResult | null = null;
    await prisma.$transaction(async (tx) => {
      const post = await tx.post.create({
        data: {
          id: newId('pst'),
          authorUserId: params.authUserId,
          clubId: scope.clubId,
          communityGroupId: scope.communityGroupId,
          visibility: scope.visibility,
          content,
          attachmentsJson: normalizeForJson(params.metadata ?? {}) as never,
          commentsCount: 0,
          reactionsCount: 0,
          createdByUserId: params.authUserId,
          updatedByUserId: params.authUserId,
          version: 1,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          deletedByUserId: null,
        },
      });

      if (scope.communityGroupId) {
        await tx.communityGroup.update({
          where: { id: scope.communityGroupId },
          data: {
            updatedByUserId: params.authUserId,
            version: { increment: 1 },
          },
        });
      }

      const author = await tx.user.findUnique({
        where: { id: params.authUserId },
        select: { id: true, name: true, avatarUrl: true },
      });
      response = {
        post: {
          ...normalizeAs<SeedRow>(post),
          author: author
            ? normalizeAs<SeedRow>(author)
            : {
                id: params.authUserId,
                name: params.authUserId,
                avatarUrl: null,
              },
        },
        dataVersion: null,
      };

      if (params.idempotencyKey) {
        await tx.idempotencyKey.create({
          data: {
            id: newId('idk'),
            userId: params.authUserId,
            endpointKey: POST_CREATE_ENDPOINT_KEY,
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
      throw notFound('Post was not created');
    }
    return response;
  }

  async listPostComments(params: PostCommentListParams): Promise<PostCommentListResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.listPostComments(params);
    }

    await this.assertReadablePost(
      params.postId,
      params.authUserId,
      params.isPrivilegedAdmin,
    );

    const prisma = getPrismaClientOrThrow();
    const comments = normalizeAs<SeedRow[]>(
      await prisma.postComment.findMany({
        where: {
          postId: params.postId,
        },
        orderBy: { createdAt: 'asc' },
      }),
    );

    return {
      comments: await this.hydratePostComments(comments, params.authUserId),
      dataVersion: null,
    };
  }

  async getPostComment(params: PostCommentReadParams): Promise<PostCommentMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.getPostComment(params);
    }

    const prisma = getPrismaClientOrThrow();
    const comment = await prisma.postComment.findUnique({
      where: { id: params.commentId },
    });
    if (!comment) {
      throw notFound('Comment not found', { commentId: params.commentId });
    }

    await this.assertReadablePost(
      comment.postId,
      params.authUserId,
      params.isPrivilegedAdmin,
    );

    return {
      comment: await this.hydratePostComment(normalizeAs<SeedRow>(comment), params.authUserId),
      dataVersion: null,
    };
  }

  async createPostComment(params: PostCommentCreateParams): Promise<PostCommentMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.createPostComment(params);
    }

    await this.assertReadablePost(
      params.postId,
      params.authUserId,
      params.isPrivilegedAdmin,
    );

    const prisma = getPrismaClientOrThrow();
    const requestHash = hashPostCommentCreateRequest(params);
    if (params.idempotencyKey) {
      const existing = await prisma.idempotencyKey.findUnique({
        where: {
          userId_endpointKey_idempotencyKey: {
            userId: params.authUserId,
            endpointKey: POST_COMMENT_CREATE_ENDPOINT_KEY,
            idempotencyKey: params.idempotencyKey,
          },
        },
      });
      if (existing) {
        assertMatchingIdempotencyRequest(
          normalizeAs<SeedRow>(existing),
          requestHash,
          'Idempotency key was already used with a different post comment payload',
        );
        return normalizeAs<PostCommentMutationResult>(existing.responseBodyJson);
      }
    }

    const content = params.content.trim();
    if (!content) {
      throw badRequest('Comment content cannot be empty');
    }
    if (content.length > 2000) {
      throw badRequest('Comment must be 2000 characters or fewer');
    }
    await this.assertValidPrismaParentComment(params.postId, params.parentCommentId);

    const now = new Date();
    let response: PostCommentMutationResult | null = null;

    await prisma.$transaction(async (tx) => {
      const comment = await tx.postComment.create({
        data: {
          id: newId('cmt'),
          postId: params.postId,
          authorUserId: params.authUserId,
          parentCommentId: params.parentCommentId ?? null,
          content,
          isDeleted: false,
          deletedAt: null,
          createdAt: now,
          updatedAt: now,
        },
      });

      const commentsCount = await tx.postComment.count({
        where: {
          postId: params.postId,
          isDeleted: false,
          deletedAt: null,
        },
      });
      await tx.post.update({
        where: { id: params.postId },
        data: {
          commentsCount,
          updatedByUserId: params.authUserId,
          version: { increment: 1 },
        },
      });

      const author = await tx.user.findUnique({
        where: { id: params.authUserId },
        select: { id: true, name: true, avatarUrl: true },
      });
      response = {
        comment: {
          ...normalizeAs<SeedRow>(comment),
          author: author
            ? normalizeAs<SeedRow>(author)
            : {
                id: params.authUserId,
                name: params.authUserId,
                avatarUrl: null,
              },
          likesCount: 0,
          likedByCurrentUser: false,
          likes: [],
        },
        dataVersion: null,
      };

      if (params.idempotencyKey) {
        await tx.idempotencyKey.create({
          data: {
            id: newId('idk'),
            userId: params.authUserId,
            endpointKey: POST_COMMENT_CREATE_ENDPOINT_KEY,
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
      throw notFound('Comment was not created');
    }
    return response;
  }

  async deletePostComment(params: PostCommentDeleteParams): Promise<PostCommentMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.deletePostComment(params);
    }

    const prisma = getPrismaClientOrThrow();
    const comment = await prisma.postComment.findUnique({
      where: { id: params.commentId },
    });
    if (!comment) {
      throw notFound('Comment not found', { commentId: params.commentId });
    }

    await this.assertReadablePost(
      comment.postId,
      params.authUserId,
      params.isPrivilegedAdmin,
    );

    if (!params.isPrivilegedAdmin && comment.authorUserId !== params.authUserId) {
      throw forbidden('Only the comment author or privileged admin can delete this comment', {
        commentId: params.commentId,
      });
    }
    if (comment.isDeleted || comment.deletedAt) {
      throw conflict('Comment is already deleted', { commentId: params.commentId });
    }

    const now = new Date();
    let updatedComment: SeedRow | null = null;
    await prisma.$transaction(async (tx) => {
      const updated = await tx.postComment.update({
        where: { id: params.commentId },
        data: {
          content: '[deleted]',
          isDeleted: true,
          deletedAt: now,
          updatedAt: now,
        },
      });
      const commentsCount = await tx.postComment.count({
        where: {
          postId: comment.postId,
          isDeleted: false,
          deletedAt: null,
        },
      });
      await tx.post.update({
        where: { id: comment.postId },
        data: {
          commentsCount,
          updatedByUserId: params.authUserId,
          version: { increment: 1 },
        },
      });
      updatedComment = normalizeAs<SeedRow>(updated);
    });

    if (!updatedComment) {
      throw notFound('Comment was not deleted');
    }
    return {
      comment: await this.hydratePostComment(updatedComment, params.authUserId),
      dataVersion: null,
    };
  }

  async togglePostCommentReaction(params: PostCommentReactionParams): Promise<PostCommentMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.togglePostCommentReaction(params);
    }

    const prisma = getPrismaClientOrThrow();
    const comment = await prisma.postComment.findUnique({
      where: { id: params.commentId },
    });
    if (!comment) {
      throw notFound('Comment not found', { commentId: params.commentId });
    }

    await this.assertReadablePost(
      comment.postId,
      params.authUserId,
      params.isPrivilegedAdmin,
    );
    if (comment.isDeleted || comment.deletedAt) {
      throw badRequest('Cannot react to a deleted comment', { commentId: params.commentId });
    }

    await prisma.$transaction(async (tx) => {
      const existing = await tx.postCommentReaction.findUnique({
        where: {
          commentId_userId_reaction: {
            commentId: params.commentId,
            userId: params.authUserId,
            reaction: 'LIKE',
          },
        },
      });
      if (existing) {
        await tx.postCommentReaction.delete({
          where: { id: existing.id },
        });
        return;
      }

      await tx.postCommentReaction.create({
        data: {
          id: newId('pcr'),
          commentId: params.commentId,
          userId: params.authUserId,
          reaction: 'LIKE',
        },
      });
    });

    return {
      comment: await this.hydratePostComment(normalizeAs<SeedRow>(comment), params.authUserId),
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
      unreadCount: notificationUnreadCount(normalizedNotifications),
      dataVersion: null,
    };
  }

  async markNotificationRead(params: NotificationMutationParams): Promise<NotificationMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.markNotificationRead(params);
    }

    const prisma = getPrismaClientOrThrow();
    const notification = await prisma.notification.findUnique({
      where: { id: params.notificationId },
    });
    if (!notification) {
      throw notFound('Notification not found', { notificationId: params.notificationId });
    }
    if (notification.userId !== params.authUserId) {
      throw forbidden('Notification does not belong to authenticated user', {
        notificationId: params.notificationId,
      });
    }

    const updated = await prisma.notification.update({
      where: { id: params.notificationId },
      data: {
        status: 'READ',
        readAt: notification.readAt ?? new Date(),
      },
    });
    return {
      notification: normalizeAs<SeedRow>(updated),
      dataVersion: null,
    };
  }

  async markAllNotificationsRead(params: CommunityMediaAccessParams): Promise<NotificationBulkMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.markAllNotificationsRead(params);
    }

    const prisma = getPrismaClientOrThrow();
    const now = new Date();
    await prisma.notification.updateMany({
      where: {
        userId: params.authUserId,
        dismissedAt: null,
        status: { not: 'DISMISSED' },
      },
      data: {
        status: 'READ',
        readAt: now,
      },
    });
    const notifications = normalizeAs<SeedRow[]>(
      await prisma.notification.findMany({
        where: { userId: params.authUserId },
        orderBy: { createdAt: 'desc' },
      }),
    );
    return {
      notifications,
      unreadCount: notificationUnreadCount(notifications),
      dataVersion: null,
    };
  }

  async dismissNotification(params: NotificationMutationParams): Promise<NotificationMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.dismissNotification(params);
    }

    const prisma = getPrismaClientOrThrow();
    const notification = await prisma.notification.findUnique({
      where: { id: params.notificationId },
    });
    if (!notification) {
      throw notFound('Notification not found', { notificationId: params.notificationId });
    }
    if (notification.userId !== params.authUserId) {
      throw forbidden('Notification does not belong to authenticated user', {
        notificationId: params.notificationId,
      });
    }

    const updated = await prisma.notification.update({
      where: { id: params.notificationId },
      data: {
        status: 'DISMISSED',
        dismissedAt: notification.dismissedAt ?? new Date(),
      },
    });
    return {
      notification: normalizeAs<SeedRow>(updated),
      dataVersion: null,
    };
  }

  async dismissAllNotifications(params: CommunityMediaAccessParams): Promise<NotificationBulkMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.dismissAllNotifications(params);
    }

    const prisma = getPrismaClientOrThrow();
    const now = new Date();
    await prisma.notification.updateMany({
      where: {
        userId: params.authUserId,
        dismissedAt: null,
        status: { not: 'DISMISSED' },
      },
      data: {
        status: 'DISMISSED',
        dismissedAt: now,
      },
    });
    const notifications = normalizeAs<SeedRow[]>(
      await prisma.notification.findMany({
        where: { userId: params.authUserId },
        orderBy: { createdAt: 'desc' },
      }),
    );
    return {
      notifications,
      unreadCount: notificationUnreadCount(notifications),
      dataVersion: null,
    };
  }

  async updateNotificationPreferences(
    params: NotificationPreferenceUpdateParams,
  ): Promise<NotificationPreferenceMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.updateNotificationPreferences(params);
    }

    const prisma = getPrismaClientOrThrow();
    const now = new Date();
    const existing = await prisma.notificationPreference.findUnique({
      where: { userId: params.authUserId },
    });
    const existingSettings = coerceMetadata(existing?.settingsJson);
    const typePreferences = normalizeTypePreferences(params.typePreferences);

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: params.authUserId },
      create: {
        userId: params.authUserId,
        pushEnabled: params.channels?.push ?? true,
        emailEnabled: params.channels?.email ?? true,
        smsEnabled: params.channels?.sms ?? false,
        settingsJson: {
          ...existingSettings,
          ...(typePreferences ? { typePreferences } : {}),
        },
        createdAt: now,
        updatedAt: now,
      },
      update: {
        ...(params.channels?.push == null ? {} : { pushEnabled: params.channels.push }),
        ...(params.channels?.email == null ? {} : { emailEnabled: params.channels.email }),
        ...(params.channels?.sms == null ? {} : { smsEnabled: params.channels.sms }),
        ...(typePreferences
          ? {
              settingsJson: {
                ...existingSettings,
                typePreferences,
              },
            }
          : {}),
      },
    });

    let quietHours = await prisma.quietHours.findUnique({
      where: { userId: params.authUserId },
    });
    if (params.quietHours) {
      quietHours = await prisma.quietHours.upsert({
        where: { userId: params.authUserId },
        create: {
          userId: params.authUserId,
          enabled: params.quietHours.enabled ?? false,
          startTimeLocal: params.quietHours.startTime ?? '22:00',
          endTimeLocal: params.quietHours.endTime ?? '07:00',
          timeZone: params.quietHours.timezone ?? 'Europe/London',
          createdAt: now,
          updatedAt: now,
        },
        update: {
          ...(params.quietHours.enabled == null ? {} : { enabled: params.quietHours.enabled }),
          ...(params.quietHours.startTime == null ? {} : { startTimeLocal: params.quietHours.startTime }),
          ...(params.quietHours.endTime == null ? {} : { endTimeLocal: params.quietHours.endTime }),
          ...(params.quietHours.timezone == null ? {} : { timeZone: params.quietHours.timezone }),
        },
      });
    }

    if (params.mutedCoaches) {
      const desired = new Map(
        params.mutedCoaches.map((coach) => [coach.coachId, coach.reason ?? null] as const),
      );
      const existingCoachMutes = await prisma.mutedSource.findMany({
        where: {
          userId: params.authUserId,
          sourceType: 'coach',
        },
      });
      await Promise.all(
        existingCoachMutes.map((source) => {
          if (!desired.has(source.sourceId)) {
            return prisma.mutedSource.update({
              where: { id: source.id },
              data: { unmutedAt: source.unmutedAt ?? now },
            });
          }
          const reason = desired.get(source.sourceId);
          desired.delete(source.sourceId);
          return prisma.mutedSource.update({
            where: { id: source.id },
            data: {
              reason,
              unmutedAt: null,
            },
          });
        }),
      );
      for (const [coachId, reason] of desired.entries()) {
        await prisma.mutedSource.create({
          data: {
            id: newId('mut'),
            userId: params.authUserId,
            sourceType: 'coach',
            sourceId: coachId,
            reason,
            mutedAt: now,
            unmutedAt: null,
          },
        });
      }
    }

    const mutedSources = await prisma.mutedSource.findMany({
      where: {
        userId: params.authUserId,
        unmutedAt: null,
      },
    });

    return {
      preferences: normalizeAs<SeedRow>(preferences),
      mutedSources: normalizeAs<SeedRow[]>(mutedSources),
      quietHours: normalizeAs<SeedRow | null>(quietHours),
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

  async createThreadMessage(params: ThreadMessageCreateParams): Promise<MessageMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.createThreadMessage(params);
    }

    await this.assertCanWriteThreadMessages(params.messageThreadId, params.authUserId);

    const body = params.body.trim();
    if (!body) {
      throw badRequest('Message body cannot be empty');
    }
    if (body.length > 4000) {
      throw badRequest('Message body must be 4000 characters or fewer');
    }

    const requestHash = hashThreadMessageCreateRequest(params);
    const prisma = getPrismaClientOrThrow();
    if (params.idempotencyKey) {
      const existing = await prisma.idempotencyKey.findUnique({
        where: {
          userId_endpointKey_idempotencyKey: {
            userId: params.authUserId,
            endpointKey: THREAD_MESSAGE_CREATE_ENDPOINT_KEY,
            idempotencyKey: params.idempotencyKey,
          },
        },
      });
      if (existing) {
        assertMatchingIdempotencyRequest(
          normalizeAs<SeedRow>(existing),
          requestHash,
          'Idempotency key was already used with a different direct message payload',
        );
        return normalizeAs<MessageMutationResult>(existing.responseBodyJson);
      }
    }

    const now = new Date();
    let response: MessageMutationResult | null = null;
    await prisma.$transaction(async (tx) => {
      const participants = await tx.messageParticipant.findMany({
        where: {
          messageThreadId: params.messageThreadId,
          leftAt: null,
        },
      });
      if (!participants.some((row) => row.userId === params.authUserId)) {
        throw forbidden('Message thread does not belong to authenticated user', {
          messageThreadId: params.messageThreadId,
        });
      }

      const message = await tx.message.create({
        data: {
          id: newId('msg'),
          messageThreadId: params.messageThreadId,
          senderUserId: params.authUserId,
          content: body,
          attachmentsJson: [],
          createdAt: now,
          updatedAt: now,
        },
      });

      await tx.messageReceipt.createMany({
        data: participants.map((participant) => ({
          id: newId('mrc'),
          messageId: message.id,
          userId: participant.userId,
          deliveredAt: now,
          readAt: participant.userId === params.authUserId ? now : null,
          createdAt: now,
          updatedAt: now,
        })),
        skipDuplicates: true,
      });

      await tx.messageParticipant.updateMany({
        where: {
          messageThreadId: params.messageThreadId,
          userId: params.authUserId,
          leftAt: null,
        },
        data: { lastReadAt: now },
      });

      await tx.messageThread.update({
        where: { id: params.messageThreadId },
        data: {
          lastMessageAt: now,
          updatedByUserId: params.authUserId,
          version: { increment: 1 },
        },
      });

      const hydratedThread = await tx.messageThread.findUnique({
        where: { id: params.messageThreadId },
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
        throw notFound('Message thread not found', { threadId: params.messageThreadId });
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
            endpointKey: THREAD_MESSAGE_CREATE_ENDPOINT_KEY,
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

  async deleteMessage(params: MessageDeleteParams): Promise<MessageMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.deleteMessage(params);
    }

    const prisma = getPrismaClientOrThrow();
    const message = await prisma.message.findUnique({
      where: { id: params.messageId },
    });
    if (!message) {
      throw notFound('Message not found', { messageId: params.messageId });
    }
    if (message.deletedAt) {
      throw conflict('Message is already deleted', { messageId: params.messageId });
    }

    if (!params.isPrivilegedAdmin) {
      const participant = await prisma.messageParticipant.findFirst({
        where: {
          messageThreadId: message.messageThreadId,
          userId: params.authUserId,
          leftAt: null,
        },
        select: { id: true },
      });
      if (!participant) {
        throw forbidden('Message thread does not belong to authenticated user', {
          messageThreadId: message.messageThreadId,
        });
      }
      if (message.senderUserId !== params.authUserId) {
        throw forbidden('Only the message sender or privileged admin can delete this message', {
          messageId: params.messageId,
        });
      }
    }

    const now = new Date();
    let deletedMessage: SeedRow | null = null;
    await prisma.$transaction(async (tx) => {
      const updated = await tx.message.update({
        where: { id: params.messageId },
        data: {
          content: '[deleted]',
          deletedAt: now,
          updatedAt: now,
        },
        include: { receipts: true },
      });

      const latestMessage = await tx.message.findFirst({
        where: {
          messageThreadId: message.messageThreadId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      await tx.messageThread.update({
        where: { id: message.messageThreadId },
        data: {
          lastMessageAt: latestMessage?.createdAt ?? null,
          updatedByUserId: params.authUserId,
          version: { increment: 1 },
        },
      });

      deletedMessage = normalizeAs<SeedRow>(updated);
    });

    if (!deletedMessage) {
      throw notFound('Message was not deleted');
    }
    return {
      message: deletedMessage,
      thread: await this.getHydratedThread(message.messageThreadId),
      dataVersion: null,
    };
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
