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
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;
const coerceMetadata = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const normalizeAs = <T>(value: unknown): T => normalizeForJson(value) as unknown as T;
const nowIso = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const IDEMPOTENCY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const COMMUNITY_GROUP_CREATE_ENDPOINT_KEY = 'community.group.create';
const GROUP_MESSAGE_CREATE_ENDPOINT_KEY = 'community.group-message.create';
const THREAD_MESSAGE_CREATE_ENDPOINT_KEY = 'community.thread-message.create';
const POST_COMMENT_CREATE_ENDPOINT_KEY = 'community.post-comment.create';
const POST_CREATE_ENDPOINT_KEY = 'community.post.create';
const COMMUNITY_GROUP_INVITE_TYPE = 'community_group_invite';
const COMMUNITY_GROUP_JOIN_REQUEST_TYPE = 'community_group_join_request';
const STAFF_POST_ROLES = new Set(['ADMIN', 'CLUB_ADMIN', 'COACH', 'HEAD_COACH', 'OWNER', 'STAFF']);
const GROUP_PRIVILEGED_ROLES = new Set(['OWNER', 'ADMIN']);
const GROUP_ROLE_WEIGHT: Record<string, number> = {
  MEMBER: 1,
  MODERATOR: 2,
  ADMIN: 3,
  OWNER: 4,
};
interface StoreProvider {
  version: string;
  tables: SeedTables;
}
export interface CommunityMediaAccessParams {
  authUserId: string;
  isPrivilegedAdmin: boolean;
}
export interface CommunityGroupCreateParams extends CommunityMediaAccessParams {
  name: string;
  description?: string;
  type?: 'GENERAL' | 'CLUB' | 'SQUAD';
  visibility?: 'PUBLIC' | 'PRIVATE';
  clubId?: string;
  squadId?: string;
  memberUserIds?: string[];
  idempotencyKey?: string;
}
export interface CommunityGroupMembershipParams extends CommunityMediaAccessParams {
  communityGroupId: string;
}
export type CommunityGroupAssignableRole = 'ADMIN' | 'MODERATOR' | 'MEMBER';
export interface CommunityGroupMemberAddParams extends CommunityGroupMembershipParams {
  memberUserId: string;
  role?: CommunityGroupAssignableRole;
}
export interface CommunityGroupMemberRoleUpdateParams extends CommunityGroupMembershipParams {
  memberUserId: string;
  role: CommunityGroupAssignableRole;
}
export interface CommunityGroupMemberRemoveParams extends CommunityGroupMembershipParams {
  memberUserId: string;
}
export interface CommunityGroupOwnerTransferParams extends CommunityGroupMembershipParams {
  memberUserId: string;
}
export interface CommunityGroupInviteCreateParams extends CommunityGroupMembershipParams {
  inviteeUserId: string;
  message?: string;
}
export interface CommunityGroupInviteMutationParams extends CommunityMediaAccessParams {
  inviteId: string;
}
export interface CommunityGroupJoinRequestCreateParams extends CommunityGroupMembershipParams {
  isCoach?: boolean;
}
export interface CommunityGroupJoinRequestMutationParams extends CommunityGroupMembershipParams {
  requestId: string;
}
export interface PostListParams extends CommunityMediaAccessParams {
  clubId?: string;
  communityGroupId?: string;
  followingOnly?: boolean;
}
export interface MediaAttachmentInput {
  mediaObjectId: string;
  title?: string;
}
type SanitizedMediaAttachment = {
  id: string;
  mediaObjectId: string;
  type: 'photo' | 'video' | 'pdf';
  title: string;
  subtitle?: string;
  contentType?: string;
  originalFileName?: string;
};
export interface PostCreateParams extends CommunityMediaAccessParams {
  clubId?: string;
  communityGroupId?: string;
  content: string;
  visibility?: 'PUBLIC' | 'CLUB' | 'GROUP' | 'PRIVATE';
  metadata?: Record<string, unknown>;
  attachments?: MediaAttachmentInput[];
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
export interface PostReactionParams extends CommunityMediaAccessParams {
  postId: string;
}
export interface PostPinParams extends CommunityMediaAccessParams {
  postId: string;
  pinned: boolean;
}
export interface GroupMessageCreateParams extends CommunityMediaAccessParams {
  communityGroupId: string;
  body: string;
  attachments?: MediaAttachmentInput[];
  idempotencyKey?: string;
}
export interface ThreadMessageCreateParams extends CommunityMediaAccessParams {
  messageThreadId: string;
  body: string;
  attachments?: MediaAttachmentInput[];
  idempotencyKey?: string;
}
export interface MessageDeleteParams extends CommunityMediaAccessParams {
  messageId: string;
}
export interface GroupMessageReadParams extends CommunityMediaAccessParams {
  communityGroupId: string;
}
export interface ThreadMessageReadParams extends CommunityMediaAccessParams {
  messageThreadId: string;
}
export interface CommunityGroupListResult {
  groups: SeedRow[];
  dataVersion: string | null;
}
export interface CommunityGroupMutationResult {
  group: SeedRow;
  dataVersion: string | null;
}
export interface CommunityGroupInviteListResult {
  invites: SeedRow[];
  dataVersion: string | null;
}
export interface CommunityGroupInviteMutationResult {
  invite: SeedRow;
  group?: SeedRow;
  dataVersion: string | null;
}
export interface CommunityGroupJoinRequestListResult {
  requests: SeedRow[];
  dataVersion: string | null;
}
export interface CommunityGroupJoinRequestMutationResult {
  request: SeedRow;
  group?: SeedRow;
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
export interface PostReactionMutationResult {
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
  typePreferences?: Record<
    string,
    {
      enabled?: boolean;
      channels?: string[];
    }
  >;
  mutedCoaches?: Array<{
    coachId: string;
    reason?: string | null;
  }>;
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
  createCommunityGroup(
    params: CommunityGroupCreateParams,
  ): Promise<CommunityGroupMutationResult>;
  joinCommunityGroup(params: CommunityGroupMembershipParams): Promise<CommunityGroupMutationResult>;
  leaveCommunityGroup(params: CommunityGroupMembershipParams): Promise<CommunityGroupMutationResult>;
  addCommunityGroupMember(
    params: CommunityGroupMemberAddParams,
  ): Promise<CommunityGroupMutationResult>;
  updateCommunityGroupMemberRole(
    params: CommunityGroupMemberRoleUpdateParams,
  ): Promise<CommunityGroupMutationResult>;
  removeCommunityGroupMember(
    params: CommunityGroupMemberRemoveParams,
  ): Promise<CommunityGroupMutationResult>;
  transferCommunityGroupOwner(
    params: CommunityGroupOwnerTransferParams,
  ): Promise<CommunityGroupMutationResult>;
  archiveCommunityGroup(
    params: CommunityGroupMembershipParams,
  ): Promise<CommunityGroupMutationResult>;
  createCommunityGroupInvite(
    params: CommunityGroupInviteCreateParams,
  ): Promise<CommunityGroupInviteMutationResult>;
  listCommunityGroupInvites(
    params: CommunityMediaAccessParams,
  ): Promise<CommunityGroupInviteListResult>;
  acceptCommunityGroupInvite(
    params: CommunityGroupInviteMutationParams,
  ): Promise<CommunityGroupInviteMutationResult>;
  declineCommunityGroupInvite(
    params: CommunityGroupInviteMutationParams,
  ): Promise<CommunityGroupInviteMutationResult>;
  createCommunityGroupJoinRequest(
    params: CommunityGroupJoinRequestCreateParams,
  ): Promise<CommunityGroupJoinRequestMutationResult>;
  listCommunityGroupJoinRequests(
    params: CommunityGroupMembershipParams,
  ): Promise<CommunityGroupJoinRequestListResult>;
  approveCommunityGroupJoinRequest(
    params: CommunityGroupJoinRequestMutationParams,
  ): Promise<CommunityGroupJoinRequestMutationResult>;
  rejectCommunityGroupJoinRequest(
    params: CommunityGroupJoinRequestMutationParams,
  ): Promise<CommunityGroupJoinRequestMutationResult>;
  listPosts(params: PostListParams): Promise<PostListResult>;
  createPost(params: PostCreateParams): Promise<PostMutationResult>;
  togglePostReaction(params: PostReactionParams): Promise<PostReactionMutationResult>;
  setPostPin(params: PostPinParams): Promise<PostMutationResult>;
  listPostComments(params: PostCommentListParams): Promise<PostCommentListResult>;
  getPostComment(params: PostCommentReadParams): Promise<PostCommentMutationResult>;
  createPostComment(params: PostCommentCreateParams): Promise<PostCommentMutationResult>;
  deletePostComment(params: PostCommentDeleteParams): Promise<PostCommentMutationResult>;
  togglePostCommentReaction(params: PostCommentReactionParams): Promise<PostCommentMutationResult>;
  listMessageThreads(params: CommunityMediaAccessParams): Promise<MessageThreadListResult>;
  listNotifications(params: CommunityMediaAccessParams): Promise<NotificationListResult>;
  markNotificationRead(params: NotificationMutationParams): Promise<NotificationMutationResult>;
  markAllNotificationsRead(
    params: CommunityMediaAccessParams,
  ): Promise<NotificationBulkMutationResult>;
  dismissNotification(params: NotificationMutationParams): Promise<NotificationMutationResult>;
  dismissAllNotifications(
    params: CommunityMediaAccessParams,
  ): Promise<NotificationBulkMutationResult>;
  updateNotificationPreferences(
    params: NotificationPreferenceUpdateParams,
  ): Promise<NotificationPreferenceMutationResult>;
  createGroupMessage(params: GroupMessageCreateParams): Promise<GroupMessageCreateResult>;
  createThreadMessage(params: ThreadMessageCreateParams): Promise<MessageMutationResult>;
  deleteMessage(params: MessageDeleteParams): Promise<MessageMutationResult>;
  markGroupMessagesRead(params: GroupMessageReadParams): Promise<GroupMessageReadResult>;
  markThreadMessagesRead(params: ThreadMessageReadParams): Promise<GroupMessageReadResult>;
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
  return new Set<string>(
    asRows(tables.communityGroupMemberships).flatMap((row): string[] => {
      if (!(isActiveMembership(row) && asString(row.userId) === authUserId)) return [];
      const mapped = asString(row.communityGroupId);
      return mapped ? [mapped] : [];
    }),
  );
}
function readableClubIdsForUser(tables: SeedTables, authUserId: string): Set<string> {
  return new Set<string>(
    asRows(tables.clubMemberships).flatMap((row): string[] => {
      if (!(isActiveMembership(row) && asString(row.userId) === authUserId)) return [];
      const mapped = asString(row.clubId);
      return mapped ? [mapped] : [];
    }),
  );
}
function activeBlockedUserIdsForUser(tables: SeedTables, authUserId: string): Set<string> {
  return new Set<string>(
    asRows(tables.userBlocks).flatMap((row): string[] => {
      if (asString(row.deletedAt)) return [];
      const blockerUserId = asString(row.blockerUserId);
      const blockedUserId = asString(row.blockedUserId);
      if (blockerUserId === authUserId && blockedUserId) return [blockedUserId];
      if (blockedUserId === authUserId && blockerUserId) return [blockerUserId];
      return [];
    }),
  );
}
function activeFollowedUserIdsForUser(tables: SeedTables, authUserId: string): Set<string> {
  const blockedUserIds = activeBlockedUserIdsForUser(tables, authUserId);
  return new Set<string>(
    asRows(tables.userFollows).flatMap((row): string[] => {
      const followedUserId = asString(row.followedUserId);
      if (
        asString(row.followerUserId) !== authUserId ||
        asString(row.deletedAt) ||
        !followedUserId ||
        blockedUserIds.has(followedUserId)
      ) {
        return [];
      }
      return [followedUserId];
    }),
  );
}
function isFollowingFeedPost(row: SeedRow): boolean {
  const metadata = coerceMetadata(row.attachmentsJson);
  const feedType = asString(metadata.feedType);
  const postAs = asString(metadata.postAs);
  return (
    (feedType === 'PERSONAL' || feedType === 'BOTH') &&
    (!postAs || postAs === 'self')
  );
}
function uniqueStrings(values: string[] | undefined): string[] {
  return Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean)));
}
function normalizeAttachmentInputs(
  attachments: MediaAttachmentInput[] | undefined,
): MediaAttachmentInput[] {
  const seen = new Set<string>();
  return (attachments ?? []).flatMap((attachment) => {
    const mediaObjectId = attachment.mediaObjectId.trim();
    if (!mediaObjectId || seen.has(mediaObjectId)) {
      return [];
    }
    seen.add(mediaObjectId);
    return [
      {
        mediaObjectId,
        ...(attachment.title?.trim() ? { title: attachment.title.trim() } : {}),
      },
    ];
  });
}
function attachmentTypeForMediaObject(row: SeedRow): SanitizedMediaAttachment['type'] {
  const kind = asString(row.kind)?.toUpperCase();
  const contentType = asString(row.contentType)?.toLowerCase() ?? '';
  if (kind === 'IMAGE') return 'photo';
  if (kind === 'VIDEO') return 'video';
  if (kind === 'DOCUMENT' && contentType.includes('pdf')) return 'pdf';
  throw badRequest('Unsupported media attachment type', {
    mediaObjectId: asString(row.id) ?? null,
    kind,
    contentType,
  });
}
function sanitizeMediaAttachment(row: SeedRow, input: MediaAttachmentInput): SanitizedMediaAttachment {
  const mediaObjectId = asString(row.id) as string;
  const contentType = asString(row.contentType);
  const originalFileName = asString(row.originalFileName);
  return {
    id: mediaObjectId,
    mediaObjectId,
    type: attachmentTypeForMediaObject(row),
    title: input.title ?? originalFileName ?? 'Attachment',
    ...(contentType ? { subtitle: contentType, contentType } : {}),
    ...(originalFileName ? { originalFileName } : {}),
  };
}
function assertSanitizedMediaAttachments(params: {
  mediaObjects: SeedRow[];
  authUserId: string;
  attachments?: MediaAttachmentInput[];
}): SanitizedMediaAttachment[] {
  const inputs = normalizeAttachmentInputs(params.attachments);
  if (inputs.length === 0) {
    return [];
  }
  const rowsById = new Map(
    params.mediaObjects.flatMap((row) => {
      const id = asString(row.id);
      return id ? [[id, row] as const] : [];
    }),
  );
  return inputs.map((input) => {
    const row = rowsById.get(input.mediaObjectId);
    if (!row || asString(row.deletedAt)) {
      throw badRequest('Media attachment proof was not found', {
        mediaObjectId: input.mediaObjectId,
      });
    }
    if (asString(row.ownerUserId) !== params.authUserId) {
      throw forbidden('Media attachment does not belong to authenticated user', {
        mediaObjectId: input.mediaObjectId,
      });
    }
    if (asString(row.status) !== 'AVAILABLE') {
      throw badRequest('Media attachment must be finalized and pass malware scanning before use', {
        mediaObjectId: input.mediaObjectId,
        status: asString(row.status) ?? null,
      });
    }
    return sanitizeMediaAttachment(row, input);
  });
}
function assertStoreMediaAttachments(
  tables: SeedTables,
  authUserId: string,
  attachments?: MediaAttachmentInput[],
): SanitizedMediaAttachment[] {
  return assertSanitizedMediaAttachments({
    mediaObjects: asRows(tables.mediaObjects),
    authUserId,
    attachments,
  });
}
async function assertDbMediaAttachments(
  authUserId: string,
  attachments?: MediaAttachmentInput[],
): Promise<SanitizedMediaAttachment[]> {
  const inputs = normalizeAttachmentInputs(attachments);
  if (inputs.length === 0) {
    return [];
  }
  const prisma = getPrismaClientOrThrow();
  const mediaObjects = await prisma.mediaObject.findMany({
    where: {
      id: {
        in: inputs.map((input) => input.mediaObjectId),
      },
    },
  });
  return assertSanitizedMediaAttachments({
    mediaObjects: normalizeAs<SeedRow[]>(mediaObjects),
    authUserId,
    attachments: inputs,
  });
}
function metadataWithAttachments(
  metadata: Record<string, unknown> | undefined,
  attachments: SanitizedMediaAttachment[],
): Record<string, unknown> {
  return attachments.length > 0 ? { ...(metadata ?? {}), attachments } : (metadata ?? {});
}
function hashCommunityGroupCreateRequest(params: CommunityGroupCreateParams): string {
  const type = params.type ?? (params.squadId ? 'SQUAD' : params.clubId ? 'CLUB' : 'GENERAL');
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        name: params.name.trim(),
        description: params.description?.trim() ?? null,
        type,
        visibility: params.visibility ?? 'PRIVATE',
        clubId: params.clubId ?? null,
        squadId: params.squadId ?? null,
        memberUserIds: uniqueStrings(params.memberUserIds).sort(),
      }),
    )
    .digest('hex');
}
function hashGroupMessageCreateRequest(params: GroupMessageCreateParams): string {
  return crypto
    .createHash('sha256')
    .update(
      stableJson({
        communityGroupId: params.communityGroupId,
        body: params.body,
        attachments: normalizeAttachmentInputs(params.attachments),
      }),
    )
    .digest('hex');
}
function hashThreadMessageCreateRequest(params: ThreadMessageCreateParams): string {
  return crypto
    .createHash('sha256')
    .update(
      stableJson({
        messageThreadId: params.messageThreadId,
        body: params.body,
        attachments: normalizeAttachmentInputs(params.attachments),
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
        attachments: normalizeAttachmentInputs(params.attachments),
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
  return String(value ?? '')
    .trim()
    .toUpperCase();
}
function groupRoleWeight(value: unknown): number {
  return GROUP_ROLE_WEIGHT[normalizeRole(value)] ?? 0;
}
function isGroupPrivilegedRole(value: unknown): boolean {
  return GROUP_PRIVILEGED_ROLES.has(normalizeRole(value));
}
function canStaffPostWithRole(value: unknown): boolean {
  return STAFF_POST_ROLES.has(normalizeRole(value));
}
function getStorePostReactionState(
  tables: SeedTables,
  postId: string | undefined,
  authUserId?: string,
): { reactionsCount: number; likedByCurrentUser: boolean; likes: string[] } {
  if (!postId) {
    return {
      reactionsCount: 0,
      likedByCurrentUser: false,
      likes: [],
    };
  }
  const likes = asRows(tables.postReactions).filter(
    (row) =>
      asString(row.postId) === postId &&
      String(row.reaction ?? 'LIKE').toUpperCase() === 'LIKE',
  );
  const likedByCurrentUser = Boolean(
    authUserId && likes.some((row) => asString(row.userId) === authUserId),
  );
  return {
    reactionsCount: likes.length,
    likedByCurrentUser,
    likes: likedByCurrentUser && authUserId ? [authUserId] : [],
  };
}
function hydrateStorePost(tables: SeedTables, post: SeedRow, authUserId?: string): SeedRow {
  const reactionState = getStorePostReactionState(tables, asString(post.id), authUserId);
  return {
    ...post,
    author: storeUserSummary(tables, asString(post.authorUserId)),
    ...reactionState,
  };
}
function visibleStoreClub(tables: SeedTables, clubId: string | undefined): SeedRow | null {
  if (!clubId) {
    return null;
  }
  return activeRows(asRows(tables.clubs)).find((row) => asString(row.id) === clubId) ?? null;
}
function activeStoreClubMembership(
  tables: SeedTables,
  clubId: string,
  userId: string,
): SeedRow | undefined {
  return asRows(tables.clubMemberships).find(
    (row) =>
      isActiveMembership(row) &&
      asString(row.clubId) === clubId &&
      asString(row.userId) === userId,
  );
}
function activeStoreSquad(tables: SeedTables, squadId: string): SeedRow | undefined {
  return asRows(tables.squads).find(
    (row) => asString(row.id) === squadId && !asString(row.deletedAt),
  );
}
function activeStoreSquadMembership(row: SeedRow): boolean {
  const status = asString(row.status)?.toLowerCase();
  return !asString(row.deletedAt) && (!status || status === 'active');
}
function activeStoreAthlete(tables: SeedTables, athleteId: string): SeedRow | undefined {
  return asRows(tables.athletes).find(
    (row) =>
      asString(row.id) === athleteId &&
      asString(row.status)?.toLowerCase() !== 'inactive' &&
      !asString(row.deletedAt),
  );
}
function storeUserAssignedToSquad(tables: SeedTables, squadId: string, userId: string): boolean {
  const squad = activeStoreSquad(tables, squadId);
  if (asString(squad?.ownerCoachUserId) === userId) {
    return true;
  }
  const athleteIds = new Set(
    asRows(tables.squadMemberships)
      .filter((row) => asString(row.squadId) === squadId && activeStoreSquadMembership(row))
      .map((row) => asString(row.athleteId))
      .filter((athleteId): athleteId is string => Boolean(athleteId)),
  );
  for (const athleteId of athleteIds) {
    const athlete = activeStoreAthlete(tables, athleteId);
    if (asString(athlete?.userId) === userId) {
      return true;
    }
    if (
      asRows(tables.guardianChildLinks).some(
        (row) =>
          asString(row.athleteId) === athleteId &&
          asString(row.guardianUserId) === userId &&
          !asString(row.deletedAt),
      )
    ) {
      return true;
    }
  }
  return false;
}
function assertStoreSquadCommunityGroupUserEligible(
  tables: SeedTables,
  group: SeedRow,
  userId: string,
  userIdField: string,
): void {
  const squadId = asString(group.squadId);
  if (!squadId || storeUserAssignedToSquad(tables, squadId, userId)) {
    return;
  }
  throw forbidden('Squad community group members must be assigned to the squad', {
    communityGroupId: asString(group.id),
    squadId,
    [userIdField]: userId,
  });
}
function assertCanCreateStoreCommunityGroup(
  tables: SeedTables,
  params: CommunityGroupCreateParams,
): {
  type: 'GENERAL' | 'CLUB' | 'SQUAD';
  clubId: string | null;
  squadId: string | null;
  memberUserIds: string[];
  visibility: 'PUBLIC' | 'PRIVATE';
} {
  const type = params.type ?? (params.squadId ? 'SQUAD' : params.clubId ? 'CLUB' : 'GENERAL');
  let clubId = params.clubId?.trim() || null;
  const squadId = params.squadId?.trim() || null;
  const visibility = params.visibility ?? 'PRIVATE';
  const memberUserIds = uniqueStrings(params.memberUserIds).filter(
    (userId) => userId !== params.authUserId,
  );
  if (type !== 'SQUAD' && squadId) {
    throw badRequest('squadId is only supported for squad community groups');
  }
  if (type === 'CLUB' && !clubId) {
    throw badRequest('clubId is required when creating a club community group');
  }
  if (type === 'GENERAL' && clubId) {
    throw badRequest('General community groups cannot be club-scoped');
  }
  if (type === 'SQUAD') {
    if (!squadId) {
      throw badRequest('squadId is required when creating a squad community group');
    }
    if (visibility === 'PUBLIC') {
      throw badRequest('Squad community groups cannot be public');
    }
    const squad = activeStoreSquad(tables, squadId);
    if (!squad) {
      throw notFound('Squad not found', { squadId });
    }
    const squadClubId = asString(squad.clubId);
    if (!squadClubId) {
      throw badRequest('Squad community groups require a club-linked squad', { squadId });
    }
    if (clubId && clubId !== squadClubId) {
      throw badRequest('clubId must match the squad club', { clubId, squadId });
    }
    clubId = squadClubId;
  }
  if (!clubId && memberUserIds.length > 0) {
    throw badRequest('Adding members to general groups requires the invite API');
  }
  if (clubId) {
    if (!visibleStoreClub(tables, clubId)) {
      throw notFound('Club not found', { clubId });
    }
    const creatorMembership = activeStoreClubMembership(tables, clubId, params.authUserId);
    if (!params.isPrivilegedAdmin && !canStaffPostWithRole(creatorMembership?.role)) {
      throw forbidden('Only active club staff can create club-scoped community groups', { clubId });
    }
    if (type === 'CLUB') {
      const missingMemberIds = memberUserIds.filter(
        (userId) => !activeStoreClubMembership(tables, clubId, userId),
      );
      if (missingMemberIds.length > 0) {
        throw forbidden('Group members must already belong to the club', {
          clubId,
          userIds: missingMemberIds,
        });
      }
    }
  }
  if (type === 'SQUAD' && squadId) {
    const missingMemberIds = memberUserIds.filter(
      (userId) => !storeUserAssignedToSquad(tables, squadId, userId),
    );
    if (missingMemberIds.length > 0) {
      throw forbidden('Squad community group members must be assigned to the squad', {
        clubId,
        squadId,
        userIds: missingMemberIds,
      });
    }
  }
  return {
    type,
    clubId,
    squadId: type === 'SQUAD' ? squadId : null,
    memberUserIds,
    visibility,
  };
}
function activeStoreCommunityGroup(
  tables: SeedTables,
  groupId: string | undefined,
): SeedRow | null {
  if (!groupId) {
    return null;
  }
  return (
    activeRows(asRows(tables.communityGroups)).find((row) => asString(row.id) === groupId) ?? null
  );
}
function storeCommunityGroupWithMemberships(tables: SeedTables, group: SeedRow): SeedRow {
  return {
    ...group,
    memberships: activeGroupMemberships(tables, asString(group.id) ?? ''),
  };
}
function assertCanJoinStoreCommunityGroup(
  tables: SeedTables,
  params: CommunityGroupMembershipParams,
): SeedRow {
  const group = activeStoreCommunityGroup(tables, params.communityGroupId);
  if (!group) {
    throw notFound('Community group not found', {
      communityGroupId: params.communityGroupId,
    });
  }
  if (String(group.visibility ?? '').toUpperCase() !== 'PUBLIC') {
    throw forbidden('Only public community groups can be joined directly', {
      communityGroupId: params.communityGroupId,
    });
  }
  const clubId = asString(group.clubId);
  if (
    clubId &&
    !params.isPrivilegedAdmin &&
    !activeStoreClubMembership(tables, clubId, params.authUserId)
  ) {
    throw forbidden('Club community groups can only be joined by active club members', {
      clubId,
      communityGroupId: params.communityGroupId,
    });
  }
  assertStoreSquadCommunityGroupUserEligible(
    tables,
    group,
    params.authUserId,
    'userId',
  );
  return group;
}
function assertCanLeaveStoreCommunityGroup(
  tables: SeedTables,
  params: CommunityGroupMembershipParams,
): { group: SeedRow; membership: SeedRow } {
  const group = activeStoreCommunityGroup(tables, params.communityGroupId);
  if (!group) {
    throw notFound('Community group not found', {
      communityGroupId: params.communityGroupId,
    });
  }
  const memberships = activeGroupMemberships(tables, params.communityGroupId);
  const membership = memberships.find((row) => asString(row.userId) === params.authUserId);
  if (!membership) {
    throw notFound('Community group membership not found', {
      communityGroupId: params.communityGroupId,
    });
  }
  const role = normalizeRole(membership.role);
  const privilegedCount = memberships.filter((row) =>
    GROUP_PRIVILEGED_ROLES.has(normalizeRole(row.role)),
  ).length;
  if (
    GROUP_PRIVILEGED_ROLES.has(role) &&
    privilegedCount === 1 &&
    memberships.length > 1
  ) {
    throw badRequest('Cannot leave group as the only owner/admin. Promote another member first.', {
      communityGroupId: params.communityGroupId,
    });
  }
  return { group, membership };
}
function getStoreCommunityGroupMemberManagementScope(
  tables: SeedTables,
  params: CommunityGroupMemberRemoveParams,
): {
  group: SeedRow;
  memberships: SeedRow[];
  actorMembership: SeedRow | null;
  targetMembership: SeedRow;
} {
  const group = activeStoreCommunityGroup(tables, params.communityGroupId);
  if (!group) {
    throw notFound('Community group not found', {
      communityGroupId: params.communityGroupId,
    });
  }
  const memberships = activeGroupMemberships(tables, params.communityGroupId);
  const targetMembership = memberships.find((row) => asString(row.userId) === params.memberUserId);
  if (!targetMembership) {
    throw notFound('Community group membership not found', {
      communityGroupId: params.communityGroupId,
      memberUserId: params.memberUserId,
    });
  }
  const actorMembership =
    memberships.find((row) => asString(row.userId) === params.authUserId) ?? null;
  if (!params.isPrivilegedAdmin) {
    if (!actorMembership || !isGroupPrivilegedRole(actorMembership.role)) {
      throw forbidden('Only community group owners and admins can manage group members', {
        communityGroupId: params.communityGroupId,
      });
    }
  }
  return {
    group,
    memberships,
    actorMembership,
    targetMembership,
  };
}
function getStoreCommunityGroupMemberAddScope(
  tables: SeedTables,
  params: CommunityGroupMemberAddParams,
): {
  group: SeedRow;
  memberships: SeedRow[];
  actorMembership: SeedRow | null;
  targetUser: SeedRow;
  existingMembership: SeedRow | null;
  role: CommunityGroupAssignableRole;
} {
  const group = activeStoreCommunityGroup(tables, params.communityGroupId);
  if (!group) {
    throw notFound('Community group not found', {
      communityGroupId: params.communityGroupId,
    });
  }
  const targetUser = activeRows(asRows(tables.users)).find(
    (row) => asString(row.id) === params.memberUserId,
  );
  if (!targetUser) {
    throw notFound('Member user not found', {
      memberUserId: params.memberUserId,
    });
  }
  const role = normalizeRole(params.role ?? 'MEMBER');
  if (!['ADMIN', 'MODERATOR', 'MEMBER'].includes(role)) {
    throw badRequest('Community group role must be ADMIN, MODERATOR, or MEMBER', {
      communityGroupId: params.communityGroupId,
      role: params.role,
    });
  }
  const memberships = activeGroupMemberships(tables, params.communityGroupId);
  const actorMembership =
    memberships.find((row) => asString(row.userId) === params.authUserId) ?? null;
  if (!params.isPrivilegedAdmin) {
    if (!actorMembership || !isGroupPrivilegedRole(actorMembership.role)) {
      throw forbidden('Only community group owners and admins can add group members', {
        communityGroupId: params.communityGroupId,
      });
    }
    const actorRole = normalizeRole(actorMembership.role);
    if (actorRole !== 'OWNER' && groupRoleWeight(role) >= groupRoleWeight(actorRole)) {
      throw forbidden('Cannot add a community group member with a role equal to or higher than your own', {
        communityGroupId: params.communityGroupId,
        memberUserId: params.memberUserId,
      });
    }
  }
  const clubId = asString(group.clubId);
  if (
    clubId &&
    !params.isPrivilegedAdmin &&
    !activeStoreClubMembership(tables, clubId, params.memberUserId)
  ) {
    throw forbidden('Club community group members must already belong to the club', {
      clubId,
      communityGroupId: params.communityGroupId,
      memberUserId: params.memberUserId,
    });
  }
  assertStoreSquadCommunityGroupUserEligible(
    tables,
    group,
    params.memberUserId,
    'memberUserId',
  );
  return {
    group,
    memberships,
    actorMembership,
    targetUser,
    existingMembership:
      asRows(tables.communityGroupMemberships).find(
        (row) =>
          asString(row.communityGroupId) === params.communityGroupId &&
          asString(row.userId) === params.memberUserId,
      ) ?? null,
    role: role as CommunityGroupAssignableRole,
  };
}
function assertCanUpdateStoreCommunityGroupMemberRole(
  params: CommunityGroupMemberRoleUpdateParams,
  scope: {
    memberships: SeedRow[];
    actorMembership: SeedRow | null;
    targetMembership: SeedRow;
  },
): void {
  if (params.memberUserId === params.authUserId) {
    throw forbidden('Cannot change your own community group role', {
      communityGroupId: params.communityGroupId,
      memberUserId: params.memberUserId,
    });
  }
  const nextRole = normalizeRole(params.role);
  if (!['ADMIN', 'MODERATOR', 'MEMBER'].includes(nextRole)) {
    throw badRequest('Community group role must be ADMIN, MODERATOR, or MEMBER', {
      communityGroupId: params.communityGroupId,
      role: params.role,
    });
  }
  if (!params.isPrivilegedAdmin) {
    const actorRole = normalizeRole(scope.actorMembership?.role);
    const targetRole = normalizeRole(scope.targetMembership.role);
    if (groupRoleWeight(actorRole) < groupRoleWeight(targetRole)) {
      throw forbidden('Cannot change the role of a higher-ranked community group member', {
        communityGroupId: params.communityGroupId,
        memberUserId: params.memberUserId,
      });
    }
    if (actorRole !== 'OWNER' && groupRoleWeight(nextRole) >= groupRoleWeight(actorRole)) {
      throw forbidden('Cannot assign a community group role equal to or higher than your own', {
        communityGroupId: params.communityGroupId,
        memberUserId: params.memberUserId,
      });
    }
  }
  const targetRole = normalizeRole(scope.targetMembership.role);
  const privilegedCount = scope.memberships.filter((row) => isGroupPrivilegedRole(row.role)).length;
  if (isGroupPrivilegedRole(targetRole) && !isGroupPrivilegedRole(nextRole) && privilegedCount === 1) {
    throw badRequest('Cannot demote the only community group owner/admin. Promote another member first.', {
      communityGroupId: params.communityGroupId,
    });
  }
}
function assertCanRemoveStoreCommunityGroupMember(
  params: CommunityGroupMemberRemoveParams,
  scope: {
    memberships: SeedRow[];
    actorMembership: SeedRow | null;
    targetMembership: SeedRow;
  },
): void {
  if (params.memberUserId === params.authUserId) {
    throw forbidden('Use the leave endpoint to remove your own community group membership', {
      communityGroupId: params.communityGroupId,
      memberUserId: params.memberUserId,
    });
  }
  if (!params.isPrivilegedAdmin) {
    const actorRole = normalizeRole(scope.actorMembership?.role);
    const targetRole = normalizeRole(scope.targetMembership.role);
    if (actorRole !== 'OWNER' && groupRoleWeight(actorRole) <= groupRoleWeight(targetRole)) {
      throw forbidden('Cannot remove a same-ranked or higher-ranked community group member', {
        communityGroupId: params.communityGroupId,
        memberUserId: params.memberUserId,
      });
    }
  }
  const privilegedCount = scope.memberships.filter((row) => isGroupPrivilegedRole(row.role)).length;
  if (isGroupPrivilegedRole(scope.targetMembership.role) && privilegedCount === 1) {
    throw badRequest('Cannot remove the only community group owner/admin. Promote another member first.', {
      communityGroupId: params.communityGroupId,
    });
  }
  if (scope.memberships.length === 1) {
    throw badRequest('Cannot remove the only community group member. Archive the group instead.', {
      communityGroupId: params.communityGroupId,
    });
  }
}
function assertCanTransferStoreCommunityGroupOwner(
  params: CommunityGroupOwnerTransferParams,
  scope: {
    actorMembership: SeedRow | null;
    targetMembership: SeedRow;
  },
): void {
  if (params.memberUserId === params.authUserId) {
    throw badRequest('Cannot transfer community group ownership to yourself', {
      communityGroupId: params.communityGroupId,
      memberUserId: params.memberUserId,
    });
  }
  if (!params.isPrivilegedAdmin && normalizeRole(scope.actorMembership?.role) !== 'OWNER') {
    throw forbidden('Only the community group owner can transfer ownership', {
      communityGroupId: params.communityGroupId,
    });
  }
  if (normalizeRole(scope.targetMembership.role) === 'OWNER') {
    throw conflict('Target member is already the community group owner', {
      communityGroupId: params.communityGroupId,
      memberUserId: params.memberUserId,
    });
  }
}
function assertCanArchiveStoreCommunityGroup(
  tables: SeedTables,
  params: CommunityGroupMembershipParams,
): { group: SeedRow; memberships: SeedRow[] } {
  const group = activeStoreCommunityGroup(tables, params.communityGroupId);
  if (!group) {
    throw notFound('Community group not found', {
      communityGroupId: params.communityGroupId,
    });
  }
  const memberships = activeGroupMemberships(tables, params.communityGroupId);
  const actorMembership = memberships.find((row) => asString(row.userId) === params.authUserId);
  if (!params.isPrivilegedAdmin && normalizeRole(actorMembership?.role) !== 'OWNER') {
    throw forbidden('Only community group owners can archive groups', {
      communityGroupId: params.communityGroupId,
    });
  }
  return {
    group,
    memberships,
  };
}
function communityGroupIdForInvite(invite: SeedRow): string | undefined {
  return asString(invite.communityGroupId) ?? asString(coerceMetadata(invite.metadataJson).communityGroupId);
}
function storeUserName(tables: SeedTables, userId: string | undefined): string | undefined {
  if (!userId) {
    return undefined;
  }
  const user = activeRows(asRows(tables.users)).find((row) => asString(row.id) === userId);
  return asString(user?.name) ?? asString(user?.fullName) ?? asString(user?.email) ?? userId;
}
function communityGroupInviteView(tables: SeedTables, invite: SeedRow, target: SeedRow): SeedRow {
  const groupId = communityGroupIdForInvite(invite);
  const group = activeStoreCommunityGroup(tables, groupId);
  const inviterId = asString(invite.senderUserId);
  const inviteeId = asString(target.targetUserId);
  return {
    id: invite.id,
    groupId,
    groupName: asString(group?.name) ?? asString(coerceMetadata(invite.metadataJson).groupName) ?? 'Community group',
    inviterId,
    inviterName: storeUserName(tables, inviterId) ?? inviterId,
    inviteeId,
    inviteeName: storeUserName(tables, inviteeId) ?? inviteeId,
    status: normalizeRole(target.status || invite.status || 'PENDING'),
    createdAt: invite.createdAt,
    respondedAt: target.respondedAt,
  };
}
function communityGroupJoinRequestView(tables: SeedTables, request: SeedRow): SeedRow {
  const groupId = communityGroupIdForInvite(request);
  const group = activeStoreCommunityGroup(tables, groupId);
  const requesterId = asString(request.senderUserId);
  const metadata = coerceMetadata(request.metadataJson);
  const status = normalizeRole(request.status || 'PENDING');
  return {
    id: request.id,
    groupId,
    groupName:
      asString(group?.name) ?? asString(metadata.groupName) ?? 'Community group',
    requesterId,
    requesterName:
      storeUserName(tables, requesterId) ?? asString(metadata.requesterName) ?? requesterId,
    requestedRole: 'MEMBER',
    isCoach: asBoolean(metadata.isCoach) ?? false,
    status,
    createdAt: request.createdAt,
    respondedAt: status === 'PENDING' ? null : request.updatedAt,
  };
}
function findPendingStoreCommunityGroupInvite(
  tables: SeedTables,
  communityGroupId: string,
  inviteeUserId: string,
): { invite: SeedRow; target: SeedRow } | null {
  const targets = asRows(tables.inviteTargets);
  for (const invite of asRows(tables.invites)) {
    if (
      asString(invite.inviteType) !== COMMUNITY_GROUP_INVITE_TYPE ||
      normalizeRole(invite.status) !== 'PENDING' ||
      communityGroupIdForInvite(invite) !== communityGroupId
    ) {
      continue;
    }
    const target = targets.find(
      (row) =>
        asString(row.inviteId) === asString(invite.id) &&
        asString(row.targetUserId) === inviteeUserId &&
        normalizeRole(row.status) === 'PENDING',
    );
    if (target) {
      return { invite, target };
    }
  }
  return null;
}
function findPendingStoreCommunityGroupJoinRequest(
  tables: SeedTables,
  communityGroupId: string,
  requesterUserId: string,
): SeedRow | null {
  return (
    asRows(tables.invites).find(
      (request) =>
        asString(request.inviteType) === COMMUNITY_GROUP_JOIN_REQUEST_TYPE &&
        normalizeRole(request.status) === 'PENDING' &&
        asString(request.senderUserId) === requesterUserId &&
        communityGroupIdForInvite(request) === communityGroupId,
    ) ?? null
  );
}
function findStoreCommunityGroupInviteForUser(
  tables: SeedTables,
  inviteId: string,
  authUserId: string,
): { invite: SeedRow; target: SeedRow } | null {
  const invite = asRows(tables.invites).find(
    (row) =>
      asString(row.id) === inviteId &&
      asString(row.inviteType) === COMMUNITY_GROUP_INVITE_TYPE &&
      normalizeRole(row.status) === 'PENDING',
  );
  if (!invite) {
    return null;
  }
  const target = asRows(tables.inviteTargets).find(
    (row) =>
      asString(row.inviteId) === inviteId &&
      asString(row.targetUserId) === authUserId &&
      normalizeRole(row.status) === 'PENDING',
  );
  return target ? { invite, target } : null;
}
function assertCanCreateStoreCommunityGroupInvite(
  tables: SeedTables,
  params: CommunityGroupInviteCreateParams,
): { group: SeedRow; invitee: SeedRow } {
  const group = activeStoreCommunityGroup(tables, params.communityGroupId);
  if (!group) {
    throw notFound('Community group not found', {
      communityGroupId: params.communityGroupId,
    });
  }
  const memberships = activeGroupMemberships(tables, params.communityGroupId);
  const actorMembership = memberships.find((row) => asString(row.userId) === params.authUserId);
  if (!params.isPrivilegedAdmin && !isGroupPrivilegedRole(actorMembership?.role)) {
    throw forbidden('Only community group owners and admins can invite members', {
      communityGroupId: params.communityGroupId,
    });
  }
  if (memberships.some((row) => asString(row.userId) === params.inviteeUserId)) {
    throw conflict('Invitee is already a community group member', {
      communityGroupId: params.communityGroupId,
      inviteeUserId: params.inviteeUserId,
    });
  }
  const invitee = activeRows(asRows(tables.users)).find((row) => asString(row.id) === params.inviteeUserId);
  if (!invitee) {
    throw notFound('Invitee user not found', {
      inviteeUserId: params.inviteeUserId,
    });
  }
  const clubId = asString(group.clubId);
  if (
    clubId &&
    !params.isPrivilegedAdmin &&
    !activeStoreClubMembership(tables, clubId, params.inviteeUserId)
  ) {
    throw forbidden('Club community group invitees must already belong to the club', {
      clubId,
      communityGroupId: params.communityGroupId,
      inviteeUserId: params.inviteeUserId,
    });
  }
  assertStoreSquadCommunityGroupUserEligible(
    tables,
    group,
    params.inviteeUserId,
    'inviteeUserId',
  );
  if (findPendingStoreCommunityGroupInvite(tables, params.communityGroupId, params.inviteeUserId)) {
    throw conflict('Community group invite is already pending', {
      communityGroupId: params.communityGroupId,
      inviteeUserId: params.inviteeUserId,
    });
  }
  return { group, invitee };
}
function assertCanCreateStoreCommunityGroupJoinRequest(
  tables: SeedTables,
  params: CommunityGroupJoinRequestCreateParams,
): { group: SeedRow; requester: SeedRow } {
  const group = activeStoreCommunityGroup(tables, params.communityGroupId);
  if (!group) {
    throw notFound('Community group not found', {
      communityGroupId: params.communityGroupId,
    });
  }
  const requester = activeRows(asRows(tables.users)).find(
    (row) => asString(row.id) === params.authUserId,
  );
  if (!requester) {
    throw forbidden('Authenticated user is not a known Clubroom user');
  }
  const memberships = activeGroupMemberships(tables, params.communityGroupId);
  if (memberships.some((row) => asString(row.userId) === params.authUserId)) {
    throw conflict('Authenticated user is already a community group member', {
      communityGroupId: params.communityGroupId,
    });
  }
  const clubId = asString(group.clubId);
  if (
    clubId &&
    !params.isPrivilegedAdmin &&
    !activeStoreClubMembership(tables, clubId, params.authUserId)
  ) {
    throw forbidden('Club community group requests require active club membership', {
      clubId,
      communityGroupId: params.communityGroupId,
    });
  }
  assertStoreSquadCommunityGroupUserEligible(
    tables,
    group,
    params.authUserId,
    'userId',
  );
  if (findPendingStoreCommunityGroupJoinRequest(tables, params.communityGroupId, params.authUserId)) {
    throw conflict('Community group join request is already pending', {
      communityGroupId: params.communityGroupId,
    });
  }
  return { group, requester };
}
function assertCanManageStoreCommunityGroupJoinRequests(
  tables: SeedTables,
  params: CommunityGroupMembershipParams,
): SeedRow {
  const group = activeStoreCommunityGroup(tables, params.communityGroupId);
  if (!group) {
    throw notFound('Community group not found', {
      communityGroupId: params.communityGroupId,
    });
  }
  const actorMembership = activeGroupMemberships(tables, params.communityGroupId).find(
    (row) => asString(row.userId) === params.authUserId,
  );
  if (!params.isPrivilegedAdmin && !isGroupPrivilegedRole(actorMembership?.role)) {
    throw forbidden('Only community group owners and admins can manage join requests', {
      communityGroupId: params.communityGroupId,
    });
  }
  return group;
}
function assertCanCreateStorePost(
  tables: SeedTables,
  params: PostCreateParams,
): {
  clubId: string | null;
  communityGroupId: string | null;
  visibility: string;
} {
  const group = activeStoreCommunityGroup(tables, params.communityGroupId);
  if (params.communityGroupId && !group) {
    throw notFound('Community group not found', {
      communityGroupId: params.communityGroupId,
    });
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
    throw notFound('Club not found', {
      clubId,
    });
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
    if (
      !canStaffPostWithRole(groupMembership?.role) &&
      !canStaffPostWithRole(clubMembership?.role)
    ) {
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
): {
  likesCount: number;
  likedByCurrentUser: boolean;
  likes: string[];
} {
  if (!commentId) {
    return {
      likesCount: 0,
      likedByCurrentUser: false,
      likes: [],
    };
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
    throw notFound('Post not found', {
      postId,
    });
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
  throw forbidden('Post is not visible to authenticated user', {
    postId,
  });
}
function assertCanPinStorePost(
  tables: SeedTables,
  post: SeedRow,
  params: PostPinParams,
): void {
  if (params.isPrivilegedAdmin) {
    return;
  }
  const groupId = asString(post.communityGroupId);
  const clubId = asString(post.clubId);
  const groupMembership = groupId
    ? asRows(tables.communityGroupMemberships).find(
        (row) =>
          isActiveMembership(row) &&
          asString(row.communityGroupId) === groupId &&
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
  if (
    canStaffPostWithRole(groupMembership?.role) ||
    canStaffPostWithRole(clubMembership?.role)
  ) {
    return;
  }
  throw forbidden('Only active staff can pin feed posts', {
    postId: params.postId,
    clubId,
    communityGroupId: groupId,
  });
}
function assertValidStoreParentComment(
  tables: SeedTables,
  postId: string,
  parentCommentId: string | undefined,
): void {
  if (!parentCommentId) {
    return;
  }
  const parent = asRows(tables.postComments).find((row) => asString(row.id) === parentCommentId);
  if (!parent || asString(parent.postId) !== postId) {
    throw badRequest('Parent comment must belong to the target post', {
      postId,
      parentCommentId,
    });
  }
  if (asBoolean(parent.isDeleted) === true || asString(parent.deletedAt) != null) {
    throw badRequest('Cannot reply to a deleted comment', {
      parentCommentId,
    });
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
  const latestMessage = activeRows(asRows(tables.messages)).reduce<SeedRow | undefined>(
    (latest, row) => {
      if (asString(row.messageThreadId) !== threadId) {
        return latest;
      }
      if (!latest) {
        return row;
      }
      return Date.parse(asString(row.createdAt) ?? '') >
        Date.parse(asString(latest.createdAt) ?? '')
        ? row
        : latest;
    },
    undefined,
  );
  thread.lastMessageAt = asString(latestMessage?.createdAt) ?? null;
  thread.updatedAt = now;
  thread.updatedByUserId = authUserId;
  thread.version = Number(thread.version ?? 1) + 1;
}
function isVisibleNotification(row: SeedRow): boolean {
  return (
    asString(row.dismissedAt) == null && String(row.status ?? '').toUpperCase() !== 'DISMISSED'
  );
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
  value:
    | Record<
        string,
        {
          enabled?: boolean;
          channels?: string[];
        }
      >
    | undefined,
):
  | Record<
      string,
      {
        enabled: boolean;
        channels: string[];
      }
    >
  | undefined {
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
  const notification = asRows(tables.notifications).find(
    (row) => asString(row.id) === notificationId,
  );
  if (!notification) {
    throw notFound('Notification not found', {
      notificationId,
    });
  }
  if (asString(notification.userId) !== authUserId) {
    throw forbidden('Notification does not belong to authenticated user', {
      notificationId,
    });
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
    throw notFound('Community group not found', {
      communityGroupId,
    });
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
    throw notFound('Message thread not found', {
      messageThreadId,
    });
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
): {
  message: SeedRow;
  thread: SeedRow;
} {
  const message = asRows(tables.messages).find((row) => asString(row.id) === messageId);
  if (!message) {
    throw notFound('Message not found', {
      messageId,
    });
  }
  if (asString(message.deletedAt) != null) {
    throw conflict('Message is already deleted', {
      messageId,
    });
  }
  const messageThreadId = asString(message.messageThreadId);
  const thread = activeRows(asRows(tables.messageThreads)).find(
    (row) => asString(row.id) === messageThreadId,
  );
  if (!thread || !messageThreadId) {
    throw notFound('Message thread not found', {
      messageId,
    });
  }
  if (isPrivilegedAdmin) {
    return {
      message,
      thread,
    };
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
  return {
    message,
    thread,
  };
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
  const threadParticipantByUserId = new Map(
    participants.flatMap((row) => {
      if (asString(row.messageThreadId) !== asString(thread.id)) {
        return [];
      }
      const userId = asString(row.userId);
      return userId ? [[userId, row] as const] : [];
    }),
  );
  for (const membership of activeGroupMemberships(tables, communityGroupId)) {
    const userId = asString(membership.userId) as string;
    const existing = threadParticipantByUserId.get(userId);
    if (existing) {
      existing.leftAt = null;
      continue;
    }
    const createdParticipant = {
      id: newId('mpr'),
      messageThreadId: asString(thread.id),
      userId,
      role: asString(membership.role) ?? 'member',
      lastReadAt: null,
      muted: false,
      joinedAt: now,
      leftAt: null,
    };
    participants.push(createdParticipant);
    threadParticipantByUserId.set(userId, createdParticipant);
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
  async createCommunityGroup(
    params: CommunityGroupCreateParams,
  ): Promise<CommunityGroupMutationResult> {
    const store = this.storeProvider();
    const scope = assertCanCreateStoreCommunityGroup(store.tables, params);
    const requestHash = hashCommunityGroupCreateRequest(params);
    if (params.idempotencyKey) {
      const existing = asRows(store.tables.idempotencyKeys).find(
        (row) =>
          asString(row.userId) === params.authUserId &&
          asString(row.endpointKey) === COMMUNITY_GROUP_CREATE_ENDPOINT_KEY &&
          asString(row.idempotencyKey) === params.idempotencyKey,
      );
      if (existing) {
        assertMatchingIdempotencyRequest(
          existing,
          requestHash,
          'Idempotency key was already used with a different community group payload',
        );
        return normalizeAs<CommunityGroupMutationResult>(existing.responseBodyJson);
      }
    }
    if (scope.type === 'SQUAD' && scope.squadId) {
      const existingGroup = activeRows(asRows(store.tables.communityGroups)).find(
        (row) => asString(row.squadId) === scope.squadId,
      );
      if (existingGroup) {
        return {
          group: storeCommunityGroupWithMemberships(store.tables, existingGroup),
          dataVersion: store.version,
        };
      }
    }
    const name = params.name.trim();
    if (!name) {
      throw badRequest('Community group name cannot be empty');
    }
    if (name.length > 120) {
      throw badRequest('Community group name must be 120 characters or fewer');
    }
    const now = nowIso();
    const groupId = newId('cgrp');
    const membershipUserIds = [params.authUserId, ...scope.memberUserIds];
    const memberships = membershipUserIds.map((userId, index): SeedRow => ({
      id: newId('cgm'),
      communityGroupId: groupId,
      userId,
      role: index === 0 ? 'OWNER' : 'MEMBER',
      active: true,
      createdByUserId: params.authUserId,
      updatedByUserId: params.authUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      joinedAt: now,
    }));
    const group: SeedRow = {
      id: groupId,
      groupType: scope.type,
      clubId: scope.clubId,
      squadId: scope.squadId,
      ownerUserId: params.authUserId,
      name,
      description: params.description?.trim() || null,
      visibility: scope.visibility,
      createdByUserId: params.authUserId,
      updatedByUserId: params.authUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
      memberships,
    };
    ensureRows(store.tables, 'communityGroups').push(group);
    ensureRows(store.tables, 'communityGroupMemberships').push(...memberships);
    const response: CommunityGroupMutationResult = {
      group,
      dataVersion: store.version,
    };
    if (params.idempotencyKey) {
      ensureRows(store.tables, 'idempotencyKeys').push({
        id: newId('idk'),
        userId: params.authUserId,
        endpointKey: COMMUNITY_GROUP_CREATE_ENDPOINT_KEY,
        idempotencyKey: params.idempotencyKey,
        requestHash,
        responseStatus: 201,
        responseBodyJson: response,
        createdAt: now,
        expiresAt: new Date(Date.parse(now) + IDEMPOTENCY_TTL_MS).toISOString(),
      });
    }
    return response;
  }
  async joinCommunityGroup(
    params: CommunityGroupMembershipParams,
  ): Promise<CommunityGroupMutationResult> {
    const store = this.storeProvider();
    const group = assertCanJoinStoreCommunityGroup(store.tables, params);
    const memberships = ensureRows(store.tables, 'communityGroupMemberships');
    const activeMembership = memberships.find(
      (row) =>
        isActiveMembership(row) &&
        asString(row.communityGroupId) === params.communityGroupId &&
        asString(row.userId) === params.authUserId,
    );
    if (activeMembership) {
      throw conflict('Authenticated user is already a community group member', {
        communityGroupId: params.communityGroupId,
      });
    }
    const now = nowIso();
    const existingMembership = memberships.find(
      (row) =>
        asString(row.communityGroupId) === params.communityGroupId &&
        asString(row.userId) === params.authUserId,
    );
    if (existingMembership) {
      existingMembership.role = 'MEMBER';
      existingMembership.active = true;
      existingMembership.deletedAt = null;
      existingMembership.updatedAt = now;
      existingMembership.updatedByUserId = params.authUserId;
      existingMembership.version = (asNumber(existingMembership.version) ?? 1) + 1;
    } else {
      memberships.push({
        id: newId('cgm'),
        communityGroupId: params.communityGroupId,
        userId: params.authUserId,
        role: 'MEMBER',
        active: true,
        createdByUserId: params.authUserId,
        updatedByUserId: params.authUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        joinedAt: now,
      });
    }
    group.updatedAt = now;
    group.updatedByUserId = params.authUserId;
    group.version = (asNumber(group.version) ?? 1) + 1;
    return {
      group: storeCommunityGroupWithMemberships(store.tables, group),
      dataVersion: store.version,
    };
  }
  async leaveCommunityGroup(
    params: CommunityGroupMembershipParams,
  ): Promise<CommunityGroupMutationResult> {
    const store = this.storeProvider();
    const { group, membership } = assertCanLeaveStoreCommunityGroup(store.tables, params);
    const now = nowIso();
    membership.active = false;
    membership.deletedAt = now;
    membership.updatedAt = now;
    membership.updatedByUserId = params.authUserId;
    membership.version = (asNumber(membership.version) ?? 1) + 1;
    group.updatedAt = now;
    group.updatedByUserId = params.authUserId;
    group.version = (asNumber(group.version) ?? 1) + 1;
    return {
      group: storeCommunityGroupWithMemberships(store.tables, group),
      dataVersion: store.version,
    };
  }
  async addCommunityGroupMember(
    params: CommunityGroupMemberAddParams,
  ): Promise<CommunityGroupMutationResult> {
    const store = this.storeProvider();
    const scope = getStoreCommunityGroupMemberAddScope(store.tables, params);
    if (
      scope.existingMembership &&
      isActiveMembership(scope.existingMembership)
    ) {
      return {
        group: storeCommunityGroupWithMemberships(store.tables, scope.group),
        dataVersion: store.version,
      };
    }
    const now = nowIso();
    if (scope.existingMembership) {
      scope.existingMembership.role = scope.role;
      scope.existingMembership.active = true;
      scope.existingMembership.deletedAt = null;
      scope.existingMembership.updatedAt = now;
      scope.existingMembership.updatedByUserId = params.authUserId;
      scope.existingMembership.version = (asNumber(scope.existingMembership.version) ?? 1) + 1;
    } else {
      ensureRows(store.tables, 'communityGroupMemberships').push({
        id: newId('cgm'),
        communityGroupId: params.communityGroupId,
        userId: params.memberUserId,
        role: scope.role,
        active: true,
        createdByUserId: params.authUserId,
        updatedByUserId: params.authUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        joinedAt: now,
      });
    }
    scope.group.updatedAt = now;
    scope.group.updatedByUserId = params.authUserId;
    scope.group.version = (asNumber(scope.group.version) ?? 1) + 1;
    return {
      group: storeCommunityGroupWithMemberships(store.tables, scope.group),
      dataVersion: store.version,
    };
  }
  async updateCommunityGroupMemberRole(
    params: CommunityGroupMemberRoleUpdateParams,
  ): Promise<CommunityGroupMutationResult> {
    const store = this.storeProvider();
    const scope = getStoreCommunityGroupMemberManagementScope(store.tables, params);
    assertCanUpdateStoreCommunityGroupMemberRole(params, scope);
    const now = nowIso();
    const previousRole = normalizeRole(scope.targetMembership.role);
    const nextRole = normalizeRole(params.role);
    if (previousRole !== nextRole) {
      scope.targetMembership.role = nextRole;
      scope.targetMembership.updatedAt = now;
      scope.targetMembership.updatedByUserId = params.authUserId;
      scope.targetMembership.version = (asNumber(scope.targetMembership.version) ?? 1) + 1;
      scope.group.updatedAt = now;
      scope.group.updatedByUserId = params.authUserId;
      scope.group.version = (asNumber(scope.group.version) ?? 1) + 1;
    }
    return {
      group: storeCommunityGroupWithMemberships(store.tables, scope.group),
      dataVersion: store.version,
    };
  }
  async removeCommunityGroupMember(
    params: CommunityGroupMemberRemoveParams,
  ): Promise<CommunityGroupMutationResult> {
    const store = this.storeProvider();
    const scope = getStoreCommunityGroupMemberManagementScope(store.tables, params);
    assertCanRemoveStoreCommunityGroupMember(params, scope);
    const now = nowIso();
    scope.targetMembership.active = false;
    scope.targetMembership.deletedAt = now;
    scope.targetMembership.updatedAt = now;
    scope.targetMembership.updatedByUserId = params.authUserId;
    scope.targetMembership.version = (asNumber(scope.targetMembership.version) ?? 1) + 1;
    scope.group.updatedAt = now;
    scope.group.updatedByUserId = params.authUserId;
    scope.group.version = (asNumber(scope.group.version) ?? 1) + 1;
    return {
      group: storeCommunityGroupWithMemberships(store.tables, scope.group),
      dataVersion: store.version,
    };
  }
  async transferCommunityGroupOwner(
    params: CommunityGroupOwnerTransferParams,
  ): Promise<CommunityGroupMutationResult> {
    const store = this.storeProvider();
    const scope = getStoreCommunityGroupMemberManagementScope(store.tables, params);
    assertCanTransferStoreCommunityGroupOwner(params, scope);
    const now = nowIso();
    for (const membership of scope.memberships) {
      const userId = asString(membership.userId);
      const currentRole = normalizeRole(membership.role);
      const nextRole =
        userId === params.memberUserId ? 'OWNER' : currentRole === 'OWNER' ? 'ADMIN' : currentRole;
      if (normalizeRole(membership.role) !== nextRole) {
        membership.role = nextRole;
        membership.updatedAt = now;
        membership.updatedByUserId = params.authUserId;
        membership.version = (asNumber(membership.version) ?? 1) + 1;
      }
    }
    scope.group.ownerUserId = params.memberUserId;
    scope.group.updatedAt = now;
    scope.group.updatedByUserId = params.authUserId;
    scope.group.version = (asNumber(scope.group.version) ?? 1) + 1;
    return {
      group: storeCommunityGroupWithMemberships(store.tables, scope.group),
      dataVersion: store.version,
    };
  }
  async archiveCommunityGroup(
    params: CommunityGroupMembershipParams,
  ): Promise<CommunityGroupMutationResult> {
    const store = this.storeProvider();
    const scope = assertCanArchiveStoreCommunityGroup(store.tables, params);
    const now = nowIso();
    scope.group.deletedAt = now;
    scope.group.deletedByUserId = params.authUserId;
    scope.group.updatedAt = now;
    scope.group.updatedByUserId = params.authUserId;
    scope.group.version = (asNumber(scope.group.version) ?? 1) + 1;
    for (const membership of scope.memberships) {
      membership.active = false;
      membership.deletedAt = now;
      membership.updatedAt = now;
      membership.updatedByUserId = params.authUserId;
      membership.version = (asNumber(membership.version) ?? 1) + 1;
    }
    return {
      group: storeCommunityGroupWithMemberships(store.tables, scope.group),
      dataVersion: store.version,
    };
  }
  async createCommunityGroupInvite(
    params: CommunityGroupInviteCreateParams,
  ): Promise<CommunityGroupInviteMutationResult> {
    const store = this.storeProvider();
    const scope = assertCanCreateStoreCommunityGroupInvite(store.tables, params);
    const now = nowIso();
    const invite: SeedRow = {
      id: newId('cgi'),
      inviteType: COMMUNITY_GROUP_INVITE_TYPE,
      senderUserId: params.authUserId,
      clubId: asString(scope.group.clubId) ?? null,
      status: 'PENDING',
      message: params.message?.trim() || null,
      metadataJson: {
        communityGroupId: params.communityGroupId,
        groupName: asString(scope.group.name) ?? 'Community group',
      },
      createdAt: now,
      updatedAt: now,
      revokedAt: null,
    };
    const target: SeedRow = {
      id: newId('cgit'),
      inviteId: invite.id,
      targetUserId: params.inviteeUserId,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
      respondedAt: null,
    };
    ensureRows(store.tables, 'invites').push(invite);
    ensureRows(store.tables, 'inviteTargets').push(target);
    ensureRows(store.tables, 'notifications').push({
      id: newId('ntf'),
      userId: params.inviteeUserId,
      type: 'COMMUNITY_GROUP_INVITE',
      title: 'Group invite',
      body: `${storeUserName(store.tables, params.authUserId) ?? 'A member'} invited you to join ${
        asString(scope.group.name) ?? 'a community group'
      }`,
      status: 'UNREAD',
      sourceType: 'community_group_invite',
      sourceId: invite.id,
      deepLink: `/community/invites/${invite.id}`,
      metadataJson: {
        communityGroupId: params.communityGroupId,
      },
      createdAt: now,
      updatedAt: now,
      readAt: null,
      dismissedAt: null,
    });
    return {
      invite: communityGroupInviteView(store.tables, invite, target),
      dataVersion: store.version,
    };
  }
  async listCommunityGroupInvites(
    params: CommunityMediaAccessParams,
  ): Promise<CommunityGroupInviteListResult> {
    const store = this.storeProvider();
    const invitesById = new Map(
      asRows(store.tables.invites).map((invite) => [asString(invite.id), invite] as const),
    );
    return {
      invites: asRows(store.tables.inviteTargets).flatMap((target): SeedRow[] => {
        const invite = invitesById.get(asString(target.inviteId));
        if (
          !invite ||
          asString(target.targetUserId) !== params.authUserId ||
          asString(invite.inviteType) !== COMMUNITY_GROUP_INVITE_TYPE ||
          normalizeRole(invite.status) !== 'PENDING' ||
          normalizeRole(target.status) !== 'PENDING' ||
          !activeStoreCommunityGroup(store.tables, communityGroupIdForInvite(invite))
        ) {
          return [];
        }
        return [communityGroupInviteView(store.tables, invite, target)];
      }),
      dataVersion: store.version,
    };
  }
  async acceptCommunityGroupInvite(
    params: CommunityGroupInviteMutationParams,
  ): Promise<CommunityGroupInviteMutationResult> {
    const store = this.storeProvider();
    const scope = findStoreCommunityGroupInviteForUser(store.tables, params.inviteId, params.authUserId);
    if (!scope) {
      throw notFound('Community group invite not found', {
        inviteId: params.inviteId,
      });
    }
    const communityGroupId = communityGroupIdForInvite(scope.invite);
    const group = activeStoreCommunityGroup(store.tables, communityGroupId);
    if (!group || !communityGroupId) {
      throw notFound('Community group not found', {
        inviteId: params.inviteId,
      });
    }
    if (activeGroupMemberships(store.tables, communityGroupId).some((row) => asString(row.userId) === params.authUserId)) {
      throw conflict('Invitee is already a community group member', {
        communityGroupId,
      });
    }
    assertStoreSquadCommunityGroupUserEligible(
      store.tables,
      group,
      params.authUserId,
      'userId',
    );
    const now = nowIso();
    scope.invite.status = 'ACCEPTED';
    scope.invite.updatedAt = now;
    scope.target.status = 'ACCEPTED';
    scope.target.respondedAt = now;
    scope.target.updatedAt = now;
    const memberships = ensureRows(store.tables, 'communityGroupMemberships');
    const existingMembership = memberships.find(
      (row) => asString(row.communityGroupId) === communityGroupId && asString(row.userId) === params.authUserId,
    );
    if (existingMembership) {
      existingMembership.role = 'MEMBER';
      existingMembership.active = true;
      existingMembership.deletedAt = null;
      existingMembership.updatedAt = now;
      existingMembership.updatedByUserId = params.authUserId;
      existingMembership.version = (asNumber(existingMembership.version) ?? 1) + 1;
    } else {
      memberships.push({
        id: newId('cgm'),
        communityGroupId,
        userId: params.authUserId,
        role: 'MEMBER',
        active: true,
        createdByUserId: params.authUserId,
        updatedByUserId: params.authUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        joinedAt: now,
      });
    }
    group.updatedAt = now;
    group.updatedByUserId = params.authUserId;
    group.version = (asNumber(group.version) ?? 1) + 1;
    return {
      invite: communityGroupInviteView(store.tables, scope.invite, scope.target),
      group: storeCommunityGroupWithMemberships(store.tables, group),
      dataVersion: store.version,
    };
  }
  async declineCommunityGroupInvite(
    params: CommunityGroupInviteMutationParams,
  ): Promise<CommunityGroupInviteMutationResult> {
    const store = this.storeProvider();
    const scope = findStoreCommunityGroupInviteForUser(store.tables, params.inviteId, params.authUserId);
    if (!scope) {
      throw notFound('Community group invite not found', {
        inviteId: params.inviteId,
      });
    }
    const now = nowIso();
    scope.invite.status = 'DECLINED';
    scope.invite.updatedAt = now;
    scope.target.status = 'DECLINED';
    scope.target.respondedAt = now;
    scope.target.updatedAt = now;
    return {
      invite: communityGroupInviteView(store.tables, scope.invite, scope.target),
      dataVersion: store.version,
    };
  }
  async createCommunityGroupJoinRequest(
    params: CommunityGroupJoinRequestCreateParams,
  ): Promise<CommunityGroupJoinRequestMutationResult> {
    const store = this.storeProvider();
    const scope = assertCanCreateStoreCommunityGroupJoinRequest(store.tables, params);
    const now = nowIso();
    const request: SeedRow = {
      id: newId('cgjr'),
      inviteType: COMMUNITY_GROUP_JOIN_REQUEST_TYPE,
      senderUserId: params.authUserId,
      clubId: asString(scope.group.clubId) ?? null,
      status: 'PENDING',
      message: null,
      metadataJson: {
        communityGroupId: params.communityGroupId,
        groupName: asString(scope.group.name) ?? 'Community group',
        requesterName: storeUserName(store.tables, params.authUserId) ?? params.authUserId,
        requestedRole: 'MEMBER',
        isCoach: params.isCoach ?? false,
      },
      createdAt: now,
      updatedAt: now,
      revokedAt: null,
    };
    ensureRows(store.tables, 'invites').push(request);
    const managerIds = activeGroupMemberships(store.tables, params.communityGroupId)
      .filter((membership) => isGroupPrivilegedRole(membership.role))
      .flatMap((membership): string[] => {
        const userId = asString(membership.userId);
        return userId && userId !== params.authUserId ? [userId] : [];
      });
    ensureRows(store.tables, 'notifications').push(
      ...managerIds.map((userId): SeedRow => ({
        id: newId('ntf'),
        userId,
        type: 'COMMUNITY_GROUP_JOIN_REQUEST',
        title: 'Group join request',
        body: `${storeUserName(store.tables, params.authUserId) ?? 'A member'} wants to join ${
          asString(scope.group.name) ?? 'a community group'
        }`,
        status: 'UNREAD',
        sourceType: 'community_group_join_request',
        sourceId: request.id,
        deepLink: `/community/groups/${params.communityGroupId}/join-requests`,
        metadataJson: {
          communityGroupId: params.communityGroupId,
        },
        createdAt: now,
        updatedAt: now,
        readAt: null,
        dismissedAt: null,
      })),
    );
    return {
      request: communityGroupJoinRequestView(store.tables, request),
      dataVersion: store.version,
    };
  }
  async listCommunityGroupJoinRequests(
    params: CommunityGroupMembershipParams,
  ): Promise<CommunityGroupJoinRequestListResult> {
    const store = this.storeProvider();
    assertCanManageStoreCommunityGroupJoinRequests(store.tables, params);
    return {
      requests: asRows(store.tables.invites)
        .filter(
          (request) =>
            asString(request.inviteType) === COMMUNITY_GROUP_JOIN_REQUEST_TYPE &&
            normalizeRole(request.status) === 'PENDING' &&
            communityGroupIdForInvite(request) === params.communityGroupId,
        )
        .map((request) => communityGroupJoinRequestView(store.tables, request)),
      dataVersion: store.version,
    };
  }
  async approveCommunityGroupJoinRequest(
    params: CommunityGroupJoinRequestMutationParams,
  ): Promise<CommunityGroupJoinRequestMutationResult> {
    const store = this.storeProvider();
    const group = assertCanManageStoreCommunityGroupJoinRequests(store.tables, params);
    const request = asRows(store.tables.invites).find(
      (candidate) =>
        asString(candidate.id) === params.requestId &&
        asString(candidate.inviteType) === COMMUNITY_GROUP_JOIN_REQUEST_TYPE &&
        normalizeRole(candidate.status) === 'PENDING' &&
        communityGroupIdForInvite(candidate) === params.communityGroupId,
    );
    if (!request) {
      throw notFound('Community group join request not found', {
        communityGroupId: params.communityGroupId,
        requestId: params.requestId,
      });
    }
    const requesterUserId = asString(request.senderUserId);
    if (!requesterUserId) {
      throw badRequest('Community group join request is missing a requester', {
        requestId: params.requestId,
      });
    }
    if (
      activeGroupMemberships(store.tables, params.communityGroupId).some(
        (membership) => asString(membership.userId) === requesterUserId,
      )
    ) {
      throw conflict('Requester is already a community group member', {
        communityGroupId: params.communityGroupId,
        requestId: params.requestId,
      });
    }
    assertStoreSquadCommunityGroupUserEligible(
      store.tables,
      group,
      requesterUserId,
      'requesterUserId',
    );
    const now = nowIso();
    request.status = 'ACCEPTED';
    request.updatedAt = now;
    const memberships = ensureRows(store.tables, 'communityGroupMemberships');
    const existingMembership = memberships.find(
      (membership) =>
        asString(membership.communityGroupId) === params.communityGroupId &&
        asString(membership.userId) === requesterUserId,
    );
    if (existingMembership) {
      existingMembership.role = 'MEMBER';
      existingMembership.active = true;
      existingMembership.deletedAt = null;
      existingMembership.updatedAt = now;
      existingMembership.updatedByUserId = params.authUserId;
      existingMembership.version = (asNumber(existingMembership.version) ?? 1) + 1;
    } else {
      memberships.push({
        id: newId('cgm'),
        communityGroupId: params.communityGroupId,
        userId: requesterUserId,
        role: 'MEMBER',
        active: true,
        createdByUserId: params.authUserId,
        updatedByUserId: params.authUserId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        joinedAt: now,
      });
    }
    group.updatedAt = now;
    group.updatedByUserId = params.authUserId;
    group.version = (asNumber(group.version) ?? 1) + 1;
    ensureRows(store.tables, 'notifications').push({
      id: newId('ntf'),
      userId: requesterUserId,
      type: 'COMMUNITY_GROUP_JOIN_REQUEST',
      title: 'Join request approved',
      body: `Your request to join ${asString(group.name) ?? 'the community group'} was approved.`,
      status: 'UNREAD',
      sourceType: 'community_group_join_request',
      sourceId: request.id,
      deepLink: `/community/groups/${params.communityGroupId}`,
      metadataJson: {
        communityGroupId: params.communityGroupId,
      },
      createdAt: now,
      updatedAt: now,
      readAt: null,
      dismissedAt: null,
    });
    return {
      request: communityGroupJoinRequestView(store.tables, request),
      group: storeCommunityGroupWithMemberships(store.tables, group),
      dataVersion: store.version,
    };
  }
  async rejectCommunityGroupJoinRequest(
    params: CommunityGroupJoinRequestMutationParams,
  ): Promise<CommunityGroupJoinRequestMutationResult> {
    const store = this.storeProvider();
    const group = assertCanManageStoreCommunityGroupJoinRequests(store.tables, params);
    const request = asRows(store.tables.invites).find(
      (candidate) =>
        asString(candidate.id) === params.requestId &&
        asString(candidate.inviteType) === COMMUNITY_GROUP_JOIN_REQUEST_TYPE &&
        normalizeRole(candidate.status) === 'PENDING' &&
        communityGroupIdForInvite(candidate) === params.communityGroupId,
    );
    if (!request) {
      throw notFound('Community group join request not found', {
        communityGroupId: params.communityGroupId,
        requestId: params.requestId,
      });
    }
    const requesterUserId = asString(request.senderUserId);
    if (!requesterUserId) {
      throw badRequest('Community group join request is missing a requester', {
        requestId: params.requestId,
      });
    }
    const now = nowIso();
    request.status = 'DECLINED';
    request.updatedAt = now;
    ensureRows(store.tables, 'notifications').push({
      id: newId('ntf'),
      userId: requesterUserId,
      type: 'COMMUNITY_GROUP_JOIN_REQUEST',
      title: 'Join request declined',
      body: `Your request to join ${asString(group.name) ?? 'the community group'} was not approved.`,
      status: 'UNREAD',
      sourceType: 'community_group_join_request',
      sourceId: request.id,
      deepLink: `/community/groups/${params.communityGroupId}`,
      metadataJson: {
        communityGroupId: params.communityGroupId,
      },
      createdAt: now,
      updatedAt: now,
      readAt: null,
      dismissedAt: null,
    });
    return {
      request: communityGroupJoinRequestView(store.tables, request),
      dataVersion: store.version,
    };
  }
  async listCommunityGroups(params: CommunityMediaAccessParams): Promise<CommunityGroupListResult> {
    const store = this.storeProvider();
    const readableGroupIds = readableCommunityGroupIds(store.tables, params.authUserId);
    const memberships = asRows(store.tables.communityGroupMemberships).filter(isActiveMembership);
    return {
      groups: activeRows(asRows(store.tables.communityGroups)).flatMap((group) =>
        readableGroupIds.has(asString(group.id) ?? '')
          ? [
              {
                ...group,
                memberships: memberships.filter(
                  (membership) => asString(membership.communityGroupId) === asString(group.id),
                ),
              },
            ]
          : [],
      ),
      dataVersion: store.version,
    };
  }
  async listPosts(params: PostListParams): Promise<PostListResult> {
    const store = this.storeProvider();
    const readableGroupIds = readableCommunityGroupIds(store.tables, params.authUserId);
    const readableClubIds = readableClubIdsForUser(store.tables, params.authUserId);
    const followedUserIds = params.followingOnly
      ? activeFollowedUserIdsForUser(store.tables, params.authUserId)
      : null;
    if (params.clubId && params.communityGroupId) {
      throw badRequest('Use either clubId or communityGroupId when listing posts');
    }
    if (params.communityGroupId && !readableGroupIds.has(params.communityGroupId)) {
      throw forbidden('Community group does not belong to authenticated user', {
        communityGroupId: params.communityGroupId,
      });
    }
    if (params.clubId && !params.isPrivilegedAdmin && !readableClubIds.has(params.clubId)) {
      throw forbidden('Club does not belong to authenticated user', {
        clubId: params.clubId,
      });
    }
    if (followedUserIds && followedUserIds.size === 0) {
      return {
        posts: [],
        dataVersion: store.version,
      };
    }
    const posts = activeRows(asRows(store.tables.posts)).flatMap((row) => {
      if (
        followedUserIds &&
        (!followedUserIds.has(asString(row.authorUserId) ?? '') || !isFollowingFeedPost(row))
      ) {
        return [];
      }
      if (
        !(() => {
          if (params.communityGroupId) {
            return asString(row.communityGroupId) === params.communityGroupId;
          }
          if (params.clubId) {
            return asString(row.clubId) === params.clubId;
          }
          const postGroupId = asString(row.communityGroupId);
          const postClubId = asString(row.clubId);
          return (
            asString(row.authorUserId) === params.authUserId ||
            (postGroupId ? readableGroupIds.has(postGroupId) : false) ||
            (postClubId ? readableClubIds.has(postClubId) : false)
          );
        })()
      )
        return [];
      const postId = asString(row.id);
      return [
        hydrateStorePost(
          store.tables,
          {
            ...row,
            comments: activeRows(asRows(store.tables.postComments)).filter(
              (row) => asString(row.postId) === postId && asBoolean(row.isDeleted) !== true,
            ),
            reactions: asRows(store.tables.postReactions).filter(
              (row) => asString(row.postId) === postId,
            ),
          },
          params.authUserId,
        ),
      ];
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
    const attachments = assertStoreMediaAttachments(
      store.tables,
      params.authUserId,
      params.attachments,
    );
    const now = nowIso();
    const post: SeedRow = {
      id: newId('pst'),
      authorUserId: params.authUserId,
      clubId: scope.clubId,
      communityGroupId: scope.communityGroupId,
      visibility: scope.visibility,
      content,
      attachmentsJson: metadataWithAttachments(params.metadata, attachments),
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
      post: hydrateStorePost(store.tables, post, params.authUserId),
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
  async togglePostReaction(params: PostReactionParams): Promise<PostReactionMutationResult> {
    const store = this.storeProvider();
    const post = assertReadableStorePost(
      store.tables,
      params.postId,
      params.authUserId,
      params.isPrivilegedAdmin,
    );
    const reactions = ensureRows(store.tables, 'postReactions');
    const existingIndex = reactions.findIndex(
      (row) =>
        asString(row.postId) === params.postId &&
        asString(row.userId) === params.authUserId &&
        String(row.reaction ?? 'LIKE').toUpperCase() === 'LIKE',
    );
    if (existingIndex >= 0) {
      reactions.splice(existingIndex, 1);
    } else {
      reactions.push({
        id: newId('prx'),
        postId: params.postId,
        userId: params.authUserId,
        reaction: 'LIKE',
        createdAt: nowIso(),
      });
    }
    const state = getStorePostReactionState(store.tables, params.postId, params.authUserId);
    const now = nowIso();
    post.reactionsCount = state.reactionsCount;
    post.updatedAt = now;
    post.updatedByUserId = params.authUserId;
    post.version = Number(post.version ?? 1) + 1;
    return {
      post: hydrateStorePost(store.tables, post, params.authUserId),
      dataVersion: store.version,
    };
  }
  async setPostPin(params: PostPinParams): Promise<PostMutationResult> {
    const store = this.storeProvider();
    const post = assertReadableStorePost(
      store.tables,
      params.postId,
      params.authUserId,
      params.isPrivilegedAdmin,
    );
    assertCanPinStorePost(store.tables, post, params);
    const metadata = { ...coerceMetadata(post.attachmentsJson) };
    const now = nowIso();
    if (params.pinned) {
      metadata.isPinned = true;
      metadata.pinnedBy = params.authUserId;
      metadata.pinnedAt = now;
    } else {
      delete metadata.isPinned;
      delete metadata.pinnedBy;
      delete metadata.pinnedAt;
    }
    post.attachmentsJson = metadata;
    post.updatedAt = now;
    post.updatedByUserId = params.authUserId;
    post.version = Number(post.version ?? 1) + 1;
    return {
      post: hydrateStorePost(store.tables, post, params.authUserId),
      dataVersion: store.version,
    };
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
      throw notFound('Comment not found', {
        commentId: params.commentId,
      });
    }
    const postId = asString(comment.postId);
    if (!postId) {
      throw notFound('Post not found', {
        commentId: params.commentId,
      });
    }
    assertReadableStorePost(store.tables, postId, params.authUserId, params.isPrivilegedAdmin);
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
      throw notFound('Comment not found', {
        commentId: params.commentId,
      });
    }
    const postId = asString(comment.postId);
    if (!postId) {
      throw notFound('Post not found', {
        commentId: params.commentId,
      });
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
      throw conflict('Comment is already deleted', {
        commentId: params.commentId,
      });
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
  async togglePostCommentReaction(
    params: PostCommentReactionParams,
  ): Promise<PostCommentMutationResult> {
    const store = this.storeProvider();
    const comment = asRows(store.tables.postComments).find(
      (row) => asString(row.id) === params.commentId,
    );
    if (!comment) {
      throw notFound('Comment not found', {
        commentId: params.commentId,
      });
    }
    const postId = asString(comment.postId);
    if (!postId) {
      throw notFound('Post not found', {
        commentId: params.commentId,
      });
    }
    assertReadableStorePost(store.tables, postId, params.authUserId, params.isPrivilegedAdmin);
    if (asBoolean(comment.isDeleted) === true || asString(comment.deletedAt) != null) {
      throw badRequest('Cannot react to a deleted comment', {
        commentId: params.commentId,
      });
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
      participants.flatMap((row) => {
        if (!(asString(row.userId) === params.authUserId)) return [];
        const mapped = asString(row.messageThreadId);
        return Boolean(mapped) ? [mapped] : [];
      }),
    );
    return {
      threads: activeRows(asRows(store.tables.messageThreads)).flatMap((thread) => {
        if (!myThreadIds.has(asString(thread.id) ?? '')) return [];
        const threadId = asString(thread.id);
        const messages = activeRows(asRows(store.tables.messages)).filter(
          (row) => asString(row.messageThreadId) === threadId,
        );
        return [
          {
            ...thread,
            participants: participants.filter((row) => asString(row.messageThreadId) === threadId),
            messages: messages.map((message) => ({
              ...message,
              receipts: asRows(store.tables.messageReceipts).filter(
                (row) => asString(row.messageId) === asString(message.id),
              ),
            })),
          },
        ];
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
        (row) => asString(row.userId) === params.authUserId && asString(row.unmutedAt) == null,
      ),
      quietHours:
        asRows(store.tables.quietHours).find((row) => asString(row.userId) === params.authUserId) ??
        null,
      unreadCount: notificationUnreadCount(notifications),
      dataVersion: store.version,
    };
  }
  async markNotificationRead(
    params: NotificationMutationParams,
  ): Promise<NotificationMutationResult> {
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
  async markAllNotificationsRead(
    params: CommunityMediaAccessParams,
  ): Promise<NotificationBulkMutationResult> {
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
  async dismissNotification(
    params: NotificationMutationParams,
  ): Promise<NotificationMutationResult> {
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
  async dismissAllNotifications(
    params: CommunityMediaAccessParams,
  ): Promise<NotificationBulkMutationResult> {
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
      quietHours.startTimeLocal =
        params.quietHours.startTime ?? quietHours.startTimeLocal ?? '22:00';
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
    const group = assertCanWriteStoreGroupMessages(
      store.tables,
      params.communityGroupId,
      params.authUserId,
    );
    const attachments = assertStoreMediaAttachments(
      store.tables,
      params.authUserId,
      params.attachments,
    );
    const thread = ensureStoreGroupThread(store.tables, group, params.authUserId, now);
    const threadId = asString(thread.id) as string;
    const message: SeedRow = {
      id: newId('msg'),
      messageThreadId: threadId,
      senderUserId: params.authUserId,
      content: params.body,
      attachmentsJson: attachments,
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
    const attachments = assertStoreMediaAttachments(
      store.tables,
      params.authUserId,
      params.attachments,
    );
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
      attachmentsJson: attachments,
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
      return {
        thread: null,
        dataVersion: store.version,
      };
    }
    const now = nowIso();
    const threadId = asString(thread.id) as string;
    const messages = activeRows(asRows(store.tables.messages)).filter(
      (row) => asString(row.messageThreadId) === threadId,
    );
    const receipts = ensureRows(store.tables, 'messageReceipts');
    const receiptByMessageId = new Map(
      receipts.flatMap((row) => {
        if (asString(row.userId) !== params.authUserId) {
          return [];
        }
        const messageId = asString(row.messageId);
        return messageId ? [[messageId, row] as const] : [];
      }),
    );
    for (const message of messages) {
      const messageId = asString(message.id) as string;
      const existing = receiptByMessageId.get(messageId);
      if (existing) {
        existing.deliveredAt = asString(existing.deliveredAt) ?? now;
        existing.readAt = now;
        existing.updatedAt = now;
        continue;
      }
      const createdReceipt = {
        id: newId('mrc'),
        messageId,
        userId: params.authUserId,
        deliveredAt: now,
        readAt: now,
        createdAt: now,
        updatedAt: now,
      };
      receipts.push(createdReceipt);
      receiptByMessageId.set(messageId, createdReceipt);
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
  async markThreadMessagesRead(params: ThreadMessageReadParams): Promise<GroupMessageReadResult> {
    const store = this.storeProvider();
    const thread = assertCanWriteStoreThreadMessages(
      store.tables,
      params.messageThreadId,
      params.authUserId,
    );
    const now = nowIso();
    const threadId = asString(thread.id) as string;
    const messages = activeRows(asRows(store.tables.messages)).filter(
      (row) => asString(row.messageThreadId) === threadId,
    );
    const receipts = ensureRows(store.tables, 'messageReceipts');
    const receiptByMessageId = new Map(
      receipts.flatMap((row) => {
        if (asString(row.userId) !== params.authUserId) {
          return [];
        }
        const messageId = asString(row.messageId);
        return messageId ? [[messageId, row] as const] : [];
      }),
    );
    for (const message of messages) {
      const messageId = asString(message.id) as string;
      const existing = receiptByMessageId.get(messageId);
      if (existing) {
        existing.deliveredAt = asString(existing.deliveredAt) ?? now;
        existing.readAt = now;
        existing.updatedAt = now;
        continue;
      }
      const createdReceipt = {
        id: newId('mrc'),
        messageId,
        userId: params.authUserId,
        deliveredAt: now,
        readAt: now,
        createdAt: now,
        updatedAt: now,
      };
      receipts.push(createdReceipt);
      receiptByMessageId.set(messageId, createdReceipt);
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
      select: {
        communityGroupId: true,
      },
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
      select: {
        clubId: true,
      },
    });
    return memberships.map((row) => row.clubId);
  }
  private async userAssignedToSquad(squadId: string, userId: string): Promise<boolean> {
    const prisma = getPrismaClientOrThrow();
    const squad = await prisma.squad.findFirst({
      where: {
        id: squadId,
        deletedAt: null,
      },
      select: {
        ownerCoachUserId: true,
      },
    });
    if (squad?.ownerCoachUserId === userId) {
      return true;
    }
    const membership = await prisma.squadMembership.findFirst({
      where: {
        squadId,
        deletedAt: null,
        NOT: {
          status: {
            in: ['inactive', 'INACTIVE'],
          },
        },
        athlete: {
          deletedAt: null,
          NOT: {
            status: {
              in: ['inactive', 'INACTIVE'],
            },
          },
          OR: [
            {
              userId,
            },
            {
              guardianLinks: {
                some: {
                  guardianUserId: userId,
                  deletedAt: null,
                },
              },
            },
          ],
        },
      },
      select: {
        id: true,
      },
    });
    return Boolean(membership);
  }
  private async assertSquadCommunityGroupUserEligible(params: {
    group: SeedRow;
    userId: string;
    userIdField: string;
  }): Promise<void> {
    const squadId = asString(params.group.squadId);
    if (!squadId || (await this.userAssignedToSquad(squadId, params.userId))) {
      return;
    }
    throw forbidden('Squad community group members must be assigned to the squad', {
      communityGroupId: asString(params.group.id),
      squadId,
      [params.userIdField]: params.userId,
    });
  }
  private async assertCanCreateCommunityGroup(params: CommunityGroupCreateParams): Promise<{
    type: 'GENERAL' | 'CLUB' | 'SQUAD';
    clubId: string | null;
    squadId: string | null;
    memberUserIds: string[];
    visibility: 'PUBLIC' | 'PRIVATE';
  }> {
    const prisma = getPrismaClientOrThrow();
    const type = params.type ?? (params.squadId ? 'SQUAD' : params.clubId ? 'CLUB' : 'GENERAL');
    let clubId = params.clubId?.trim() || null;
    const squadId = params.squadId?.trim() || null;
    const visibility = params.visibility ?? 'PRIVATE';
    const memberUserIds = uniqueStrings(params.memberUserIds).filter(
      (userId) => userId !== params.authUserId,
    );
    if (type !== 'SQUAD' && squadId) {
      throw badRequest('squadId is only supported for squad community groups');
    }
    if (type === 'CLUB' && !clubId) {
      throw badRequest('clubId is required when creating a club community group');
    }
    if (type === 'GENERAL' && clubId) {
      throw badRequest('General community groups cannot be club-scoped');
    }
    if (type === 'SQUAD') {
      if (!squadId) {
        throw badRequest('squadId is required when creating a squad community group');
      }
      if (visibility === 'PUBLIC') {
        throw badRequest('Squad community groups cannot be public');
      }
      const squad = await prisma.squad.findFirst({
        where: {
          id: squadId,
          deletedAt: null,
        },
        select: {
          id: true,
          clubId: true,
        },
      });
      if (!squad) {
        throw notFound('Squad not found', { squadId });
      }
      if (clubId && clubId !== squad.clubId) {
        throw badRequest('clubId must match the squad club', { clubId, squadId });
      }
      clubId = squad.clubId;
    }
    if (!clubId && memberUserIds.length > 0) {
      throw badRequest('Adding members to general groups requires the invite API');
    }
    const actor = await prisma.user.findUnique({
      where: {
        id: params.authUserId,
      },
      select: {
        id: true,
      },
    });
    if (!actor) {
      throw forbidden('Authenticated user is not a known Clubroom user');
    }
    if (clubId) {
      const club = await prisma.club.findFirst({
        where: {
          id: clubId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });
      if (!club) {
        throw notFound('Club not found', { clubId });
      }
      const creatorMembership = await prisma.clubMembership.findFirst({
        where: {
          clubId,
          userId: params.authUserId,
          active: true,
          deletedAt: null,
        },
        select: {
          role: true,
        },
      });
      if (!params.isPrivilegedAdmin && !canStaffPostWithRole(creatorMembership?.role)) {
        throw forbidden('Only active club staff can create club-scoped community groups', {
          clubId,
        });
      }
      if (type === 'CLUB' && memberUserIds.length > 0) {
        const activeMemberships = await prisma.clubMembership.findMany({
          where: {
            clubId,
            userId: {
              in: memberUserIds,
            },
            active: true,
            deletedAt: null,
          },
          select: {
            userId: true,
          },
        });
        const activeUserIds = new Set(activeMemberships.map((membership) => membership.userId));
        const missingMemberIds = memberUserIds.filter((userId) => !activeUserIds.has(userId));
        if (missingMemberIds.length > 0) {
          throw forbidden('Group members must already belong to the club', {
            clubId,
            userIds: missingMemberIds,
          });
        }
      }
    }
    if (type === 'SQUAD' && squadId) {
      const eligibility = await Promise.all(
        memberUserIds.map(async (userId) => ({
          userId,
          assigned: await this.userAssignedToSquad(squadId, userId),
        })),
      );
      const missingMemberIds = eligibility.flatMap((entry) =>
        entry.assigned ? [] : [entry.userId],
      );
      if (missingMemberIds.length > 0) {
        throw forbidden('Squad community group members must be assigned to the squad', {
          clubId,
          squadId,
          userIds: missingMemberIds,
        });
      }
    }
    return {
      type,
      clubId,
      squadId: type === 'SQUAD' ? squadId : null,
      memberUserIds,
      visibility,
    };
  }
  private async assertCanJoinCommunityGroup(
    params: CommunityGroupMembershipParams,
  ): Promise<{ id: string; clubId: string | null; squadId: string | null; visibility: string }> {
    const prisma = getPrismaClientOrThrow();
    const [actor, group] = await Promise.all([
      prisma.user.findUnique({
        where: {
          id: params.authUserId,
        },
        select: {
          id: true,
        },
      }),
      prisma.communityGroup.findFirst({
        where: {
          id: params.communityGroupId,
          deletedAt: null,
        },
        select: {
          id: true,
          clubId: true,
          squadId: true,
          visibility: true,
        },
      }),
    ]);
    if (!actor) {
      throw forbidden('Authenticated user is not a known Clubroom user');
    }
    if (!group) {
      throw notFound('Community group not found', {
        communityGroupId: params.communityGroupId,
      });
    }
    if (String(group.visibility).toUpperCase() !== 'PUBLIC') {
      throw forbidden('Only public community groups can be joined directly', {
        communityGroupId: params.communityGroupId,
      });
    }
    if (group.clubId && !params.isPrivilegedAdmin) {
      const membership = await prisma.clubMembership.findFirst({
        where: {
          clubId: group.clubId,
          userId: params.authUserId,
          active: true,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });
      if (!membership) {
        throw forbidden('Club community groups can only be joined by active club members', {
          clubId: group.clubId,
          communityGroupId: params.communityGroupId,
        });
      }
    }
    await this.assertSquadCommunityGroupUserEligible({
      group: normalizeAs<SeedRow>(group),
      userId: params.authUserId,
      userIdField: 'userId',
    });
    return group;
  }
  private async assertCanLeaveCommunityGroup(
    params: CommunityGroupMembershipParams,
  ): Promise<{ groupId: string; membershipId: string }> {
    const prisma = getPrismaClientOrThrow();
    const group = await prisma.communityGroup.findFirst({
      where: {
        id: params.communityGroupId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
    if (!group) {
      throw notFound('Community group not found', {
        communityGroupId: params.communityGroupId,
      });
    }
    const memberships = await prisma.communityGroupMembership.findMany({
      where: {
        communityGroupId: params.communityGroupId,
        active: true,
        deletedAt: null,
      },
      select: {
        id: true,
        userId: true,
        role: true,
      },
    });
    const membership = memberships.find((row) => row.userId === params.authUserId);
    if (!membership) {
      throw notFound('Community group membership not found', {
        communityGroupId: params.communityGroupId,
      });
    }
    const privilegedCount = memberships.filter((row) =>
      GROUP_PRIVILEGED_ROLES.has(normalizeRole(row.role)),
    ).length;
    if (
      GROUP_PRIVILEGED_ROLES.has(normalizeRole(membership.role)) &&
      privilegedCount === 1 &&
      memberships.length > 1
    ) {
      throw badRequest('Cannot leave group as the only owner/admin. Promote another member first.', {
        communityGroupId: params.communityGroupId,
      });
    }
    return {
      groupId: group.id,
      membershipId: membership.id,
    };
  }
  private async getCommunityGroupMemberManagementScope(
    params: CommunityGroupMemberRemoveParams,
  ): Promise<{
    group: SeedRow;
    memberships: SeedRow[];
    actorMembership: SeedRow | null;
    targetMembership: SeedRow;
  }> {
    const prisma = getPrismaClientOrThrow();
    const group = await prisma.communityGroup.findFirst({
      where: {
        id: params.communityGroupId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
    if (!group) {
      throw notFound('Community group not found', {
        communityGroupId: params.communityGroupId,
      });
    }
    const memberships = normalizeAs<SeedRow[]>(
      await prisma.communityGroupMembership.findMany({
        where: {
          communityGroupId: params.communityGroupId,
          active: true,
          deletedAt: null,
        },
        select: {
          id: true,
          userId: true,
          role: true,
        },
      }),
    );
    const targetMembership =
      memberships.find((row) => asString(row.userId) === params.memberUserId) ?? null;
    if (!targetMembership) {
      throw notFound('Community group membership not found', {
        communityGroupId: params.communityGroupId,
        memberUserId: params.memberUserId,
      });
    }
    const actorMembership =
      memberships.find((row) => asString(row.userId) === params.authUserId) ?? null;
    if (!params.isPrivilegedAdmin) {
      if (!actorMembership || !isGroupPrivilegedRole(actorMembership.role)) {
        throw forbidden('Only community group owners and admins can manage group members', {
          communityGroupId: params.communityGroupId,
        });
      }
    }
    return {
      group: normalizeAs<SeedRow>(group),
      memberships,
      actorMembership,
      targetMembership,
    };
  }
  private async getCommunityGroupMemberAddScope(
    params: CommunityGroupMemberAddParams,
  ): Promise<{
    group: SeedRow;
    memberships: SeedRow[];
    actorMembership: SeedRow | null;
    targetUser: SeedRow;
    existingMembership: SeedRow | null;
    role: CommunityGroupAssignableRole;
  }> {
    const prisma = getPrismaClientOrThrow();
    const [group, targetUser] = await Promise.all([
      prisma.communityGroup.findFirst({
        where: {
          id: params.communityGroupId,
          deletedAt: null,
        },
        select: {
          id: true,
          clubId: true,
          squadId: true,
        },
      }),
      prisma.user.findUnique({
        where: {
          id: params.memberUserId,
        },
        select: {
          id: true,
          deletedAt: true,
        },
      }),
    ]);
    if (!group) {
      throw notFound('Community group not found', {
        communityGroupId: params.communityGroupId,
      });
    }
    if (!targetUser || targetUser.deletedAt) {
      throw notFound('Member user not found', {
        memberUserId: params.memberUserId,
      });
    }
    const role = normalizeRole(params.role ?? 'MEMBER');
    if (!['ADMIN', 'MODERATOR', 'MEMBER'].includes(role)) {
      throw badRequest('Community group role must be ADMIN, MODERATOR, or MEMBER', {
        communityGroupId: params.communityGroupId,
        role: params.role,
      });
    }
    const [memberships, existingMembership] = await Promise.all([
      prisma.communityGroupMembership.findMany({
        where: {
          communityGroupId: params.communityGroupId,
          active: true,
          deletedAt: null,
        },
        select: {
          id: true,
          userId: true,
          role: true,
        },
      }),
      prisma.communityGroupMembership.findUnique({
        where: {
          communityGroupId_userId: {
            communityGroupId: params.communityGroupId,
            userId: params.memberUserId,
          },
        },
      }),
    ]);
    const normalizedMemberships = normalizeAs<SeedRow[]>(memberships);
    const actorMembership =
      normalizedMemberships.find((row) => asString(row.userId) === params.authUserId) ?? null;
    if (!params.isPrivilegedAdmin) {
      if (!actorMembership || !isGroupPrivilegedRole(actorMembership.role)) {
        throw forbidden('Only community group owners and admins can add group members', {
          communityGroupId: params.communityGroupId,
        });
      }
      const actorRole = normalizeRole(actorMembership.role);
      if (actorRole !== 'OWNER' && groupRoleWeight(role) >= groupRoleWeight(actorRole)) {
        throw forbidden('Cannot add a community group member with a role equal to or higher than your own', {
          communityGroupId: params.communityGroupId,
          memberUserId: params.memberUserId,
        });
      }
    }
    if (group.clubId && !params.isPrivilegedAdmin) {
      const clubMembership = await prisma.clubMembership.findFirst({
        where: {
          clubId: group.clubId,
          userId: params.memberUserId,
          active: true,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });
      if (!clubMembership) {
        throw forbidden('Club community group members must already belong to the club', {
          clubId: group.clubId,
          communityGroupId: params.communityGroupId,
          memberUserId: params.memberUserId,
        });
      }
    }
    await this.assertSquadCommunityGroupUserEligible({
      group: normalizeAs<SeedRow>(group),
      userId: params.memberUserId,
      userIdField: 'memberUserId',
    });
    return {
      group: normalizeAs<SeedRow>(group),
      memberships: normalizedMemberships,
      actorMembership,
      targetUser: normalizeAs<SeedRow>(targetUser),
      existingMembership: existingMembership ? normalizeAs<SeedRow>(existingMembership) : null,
      role: role as CommunityGroupAssignableRole,
    };
  }
  private async assertCanArchiveCommunityGroup(
    params: CommunityGroupMembershipParams,
  ): Promise<{ groupId: string }> {
    const prisma = getPrismaClientOrThrow();
    const group = await prisma.communityGroup.findFirst({
      where: {
        id: params.communityGroupId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
    if (!group) {
      throw notFound('Community group not found', {
        communityGroupId: params.communityGroupId,
      });
    }
    if (!params.isPrivilegedAdmin) {
      const actorMembership = await prisma.communityGroupMembership.findFirst({
        where: {
          communityGroupId: params.communityGroupId,
          userId: params.authUserId,
          active: true,
          deletedAt: null,
        },
        select: {
          role: true,
        },
      });
      if (normalizeRole(actorMembership?.role) !== 'OWNER') {
        throw forbidden('Only community group owners can archive groups', {
          communityGroupId: params.communityGroupId,
        });
      }
    }
    return {
      groupId: group.id,
    };
  }
  private async hasPendingCommunityGroupInvite(
    communityGroupId: string,
    inviteeUserId: string,
  ): Promise<boolean> {
    const prisma = getPrismaClientOrThrow();
    const invites = normalizeAs<SeedRow[]>(
      await prisma.invite.findMany({
        where: {
          inviteType: COMMUNITY_GROUP_INVITE_TYPE,
          status: 'PENDING',
          targets: {
            some: {
              targetUserId: inviteeUserId,
              status: 'PENDING',
            },
          },
        },
        include: {
          targets: {
            where: {
              targetUserId: inviteeUserId,
              status: 'PENDING',
            },
          },
        },
      }),
    );
    return invites.some((invite) => communityGroupIdForInvite(invite) === communityGroupId);
  }
  private async hasPendingCommunityGroupJoinRequest(
    communityGroupId: string,
    requesterUserId: string,
  ): Promise<boolean> {
    const prisma = getPrismaClientOrThrow();
    const requests = normalizeAs<SeedRow[]>(
      await prisma.invite.findMany({
        where: {
          inviteType: COMMUNITY_GROUP_JOIN_REQUEST_TYPE,
          status: 'PENDING',
          senderUserId: requesterUserId,
        },
      }),
    );
    return requests.some((request) => communityGroupIdForInvite(request) === communityGroupId);
  }
  private async assertCanCreateCommunityGroupJoinRequest(
    params: CommunityGroupJoinRequestCreateParams,
  ): Promise<{ group: SeedRow; requester: SeedRow; managerUserIds: string[] }> {
    const prisma = getPrismaClientOrThrow();
    const [group, requester] = await Promise.all([
      prisma.communityGroup.findFirst({
        where: {
          id: params.communityGroupId,
          deletedAt: null,
        },
        select: {
          id: true,
          clubId: true,
          squadId: true,
          name: true,
        },
      }),
      prisma.user.findUnique({
        where: {
          id: params.authUserId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          deletedAt: true,
        },
      }),
    ]);
    if (!group) {
      throw notFound('Community group not found', {
        communityGroupId: params.communityGroupId,
      });
    }
    if (!requester || requester.deletedAt) {
      throw forbidden('Authenticated user is not a known Clubroom user');
    }
    const memberships = await prisma.communityGroupMembership.findMany({
      where: {
        communityGroupId: params.communityGroupId,
        active: true,
        deletedAt: null,
      },
      select: {
        userId: true,
        role: true,
      },
    });
    if (memberships.some((membership) => membership.userId === params.authUserId)) {
      throw conflict('Authenticated user is already a community group member', {
        communityGroupId: params.communityGroupId,
      });
    }
    if (group.clubId && !params.isPrivilegedAdmin) {
      const clubMembership = await prisma.clubMembership.findFirst({
        where: {
          clubId: group.clubId,
          userId: params.authUserId,
          active: true,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });
      if (!clubMembership) {
        throw forbidden('Club community group requests require active club membership', {
          clubId: group.clubId,
          communityGroupId: params.communityGroupId,
        });
      }
    }
    await this.assertSquadCommunityGroupUserEligible({
      group: normalizeAs<SeedRow>(group),
      userId: params.authUserId,
      userIdField: 'userId',
    });
    if (await this.hasPendingCommunityGroupJoinRequest(params.communityGroupId, params.authUserId)) {
      throw conflict('Community group join request is already pending', {
        communityGroupId: params.communityGroupId,
      });
    }
    return {
      group: normalizeAs<SeedRow>(group),
      requester: normalizeAs<SeedRow>(requester),
      managerUserIds: memberships
        .filter((membership) => isGroupPrivilegedRole(membership.role))
        .flatMap((membership): string[] =>
          membership.userId === params.authUserId ? [] : [membership.userId],
        ),
    };
  }
  private async assertCanManageCommunityGroupJoinRequests(
    params: CommunityGroupMembershipParams,
  ): Promise<{ group: SeedRow }> {
    const prisma = getPrismaClientOrThrow();
    const group = await prisma.communityGroup.findFirst({
      where: {
        id: params.communityGroupId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        clubId: true,
        squadId: true,
      },
    });
    if (!group) {
      throw notFound('Community group not found', {
        communityGroupId: params.communityGroupId,
      });
    }
    if (!params.isPrivilegedAdmin) {
      const actorMembership = await prisma.communityGroupMembership.findFirst({
        where: {
          communityGroupId: params.communityGroupId,
          userId: params.authUserId,
          active: true,
          deletedAt: null,
        },
        select: {
          role: true,
        },
      });
      if (!isGroupPrivilegedRole(actorMembership?.role)) {
        throw forbidden('Only community group owners and admins can manage join requests', {
          communityGroupId: params.communityGroupId,
        });
      }
    }
    return {
      group: normalizeAs<SeedRow>(group),
    };
  }
  private async assertCanCreateCommunityGroupInvite(
    params: CommunityGroupInviteCreateParams,
  ): Promise<{ group: SeedRow; inviter: SeedRow | null; invitee: SeedRow }> {
    const prisma = getPrismaClientOrThrow();
    const [group, invitee, inviter] = await Promise.all([
      prisma.communityGroup.findFirst({
        where: {
          id: params.communityGroupId,
          deletedAt: null,
        },
        select: {
          id: true,
          clubId: true,
          squadId: true,
          name: true,
          deletedAt: true,
        },
      }),
      prisma.user.findUnique({
        where: {
          id: params.inviteeUserId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          deletedAt: true,
        },
      }),
      prisma.user.findUnique({
        where: {
          id: params.authUserId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          deletedAt: true,
        },
      }),
    ]);
    if (!group) {
      throw notFound('Community group not found', {
        communityGroupId: params.communityGroupId,
      });
    }
    if (!invitee || invitee.deletedAt) {
      throw notFound('Invitee user not found', {
        inviteeUserId: params.inviteeUserId,
      });
    }
    const memberships = await prisma.communityGroupMembership.findMany({
      where: {
        communityGroupId: params.communityGroupId,
        active: true,
        deletedAt: null,
      },
      select: {
        userId: true,
        role: true,
      },
    });
    const actorMembership = memberships.find((row) => row.userId === params.authUserId);
    if (!params.isPrivilegedAdmin && !isGroupPrivilegedRole(actorMembership?.role)) {
      throw forbidden('Only community group owners and admins can invite members', {
        communityGroupId: params.communityGroupId,
      });
    }
    if (memberships.some((row) => row.userId === params.inviteeUserId)) {
      throw conflict('Invitee is already a community group member', {
        communityGroupId: params.communityGroupId,
        inviteeUserId: params.inviteeUserId,
      });
    }
    if (group.clubId && !params.isPrivilegedAdmin) {
      const clubMembership = await prisma.clubMembership.findFirst({
        where: {
          clubId: group.clubId,
          userId: params.inviteeUserId,
          active: true,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });
      if (!clubMembership) {
        throw forbidden('Club community group invitees must already belong to the club', {
          clubId: group.clubId,
          communityGroupId: params.communityGroupId,
          inviteeUserId: params.inviteeUserId,
        });
      }
    }
    await this.assertSquadCommunityGroupUserEligible({
      group: normalizeAs<SeedRow>(group),
      userId: params.inviteeUserId,
      userIdField: 'inviteeUserId',
    });
    if (await this.hasPendingCommunityGroupInvite(params.communityGroupId, params.inviteeUserId)) {
      throw conflict('Community group invite is already pending', {
        communityGroupId: params.communityGroupId,
        inviteeUserId: params.inviteeUserId,
      });
    }
    return {
      group: normalizeAs<SeedRow>(group),
      inviter: inviter && !inviter.deletedAt ? normalizeAs<SeedRow>(inviter) : null,
      invitee: normalizeAs<SeedRow>(invitee),
    };
  }
  private async getPendingCommunityGroupInviteForUser(
    params: CommunityGroupInviteMutationParams,
  ): Promise<{
    invite: SeedRow;
    target: SeedRow;
    group: SeedRow;
    inviter: SeedRow | null;
    invitee: SeedRow | null;
  }> {
    const prisma = getPrismaClientOrThrow();
    const invite = normalizeAs<SeedRow | null>(
      await prisma.invite.findFirst({
        where: {
          id: params.inviteId,
          inviteType: COMMUNITY_GROUP_INVITE_TYPE,
          status: 'PENDING',
        },
        include: {
          targets: {
            where: {
              targetUserId: params.authUserId,
              status: 'PENDING',
            },
          },
        },
      }),
    );
    const target = asRows(invite?.targets)[0];
    if (!invite || !target) {
      throw notFound('Community group invite not found', {
        inviteId: params.inviteId,
      });
    }
    const communityGroupId = communityGroupIdForInvite(invite);
    if (!communityGroupId) {
      throw notFound('Community group not found', {
        inviteId: params.inviteId,
      });
    }
    const [group, inviter, invitee] = await Promise.all([
      prisma.communityGroup.findFirst({
        where: {
          id: communityGroupId,
          deletedAt: null,
        },
        select: {
          id: true,
          clubId: true,
          name: true,
          deletedAt: true,
        },
      }),
      prisma.user.findUnique({
        where: {
          id: asString(invite.senderUserId) ?? '',
        },
        select: {
          id: true,
          name: true,
          email: true,
          deletedAt: true,
        },
      }),
      prisma.user.findUnique({
        where: {
          id: params.authUserId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          deletedAt: true,
        },
      }),
    ]);
    if (!group) {
      throw notFound('Community group not found', {
        inviteId: params.inviteId,
      });
    }
    return {
      invite,
      target,
      group: normalizeAs<SeedRow>(group),
      inviter: inviter && !inviter.deletedAt ? normalizeAs<SeedRow>(inviter) : null,
      invitee: invitee && !invitee.deletedAt ? normalizeAs<SeedRow>(invitee) : null,
    };
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
      throw notFound('Post not found', {
        postId,
      });
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
            select: {
              id: true,
            },
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
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),
    ]);
    if (groupMembership || clubMembership) {
      return normalizeAs<SeedRow>(post);
    }
    throw forbidden('Post is not visible to authenticated user', {
      postId,
    });
  }
  private async assertCanPinPost(post: SeedRow, params: PostPinParams): Promise<void> {
    if (params.isPrivilegedAdmin) {
      return;
    }
    const prisma = getPrismaClientOrThrow();
    const groupId = asString(post.communityGroupId);
    const clubId = asString(post.clubId);
    const [groupMembership, clubMembership] = await Promise.all([
      groupId
        ? prisma.communityGroupMembership.findFirst({
            where: {
              communityGroupId: groupId,
              userId: params.authUserId,
              active: true,
              deletedAt: null,
            },
            select: {
              role: true,
            },
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
            select: {
              role: true,
            },
          })
        : Promise.resolve(null),
    ]);
    if (
      canStaffPostWithRole(groupMembership?.role) ||
      canStaffPostWithRole(clubMembership?.role)
    ) {
      return;
    }
    throw forbidden('Only active staff can pin feed posts', {
      postId: params.postId,
      clubId,
      communityGroupId: groupId,
    });
  }
  private async assertCanCreatePost(params: PostCreateParams): Promise<{
    clubId: string | null;
    communityGroupId: string | null;
    visibility: 'PUBLIC' | 'CLUB' | 'GROUP' | 'PRIVATE';
  }> {
    const prisma = getPrismaClientOrThrow();
    const group = params.communityGroupId
      ? await prisma.communityGroup.findFirst({
          where: {
            id: params.communityGroupId,
            deletedAt: null,
          },
        })
      : null;
    if (params.communityGroupId && !group) {
      throw notFound('Community group not found', {
        communityGroupId: params.communityGroupId,
      });
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
        where: {
          id: clubId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });
      if (!club) {
        throw notFound('Club not found', {
          clubId,
        });
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
              select: {
                role: true,
              },
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
              select: {
                role: true,
              },
            })
          : Promise.resolve(null),
      ]);
      if (
        !canStaffPostWithRole(groupMembership?.role) &&
        !canStaffPostWithRole(clubMembership?.role)
      ) {
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
  private async hydratePosts(posts: SeedRow[], authUserId?: string): Promise<SeedRow[]> {
    if (posts.length === 0) {
      return [];
    }
    const userIds = Array.from(
      new Set(
        posts.flatMap((post): string[] => {
          const mapped = asString(post.authorUserId);
          return mapped ? [mapped] : [];
        }),
      ),
    );
    const prisma = getPrismaClientOrThrow();
    const users = normalizeAs<SeedRow[]>(
      userIds.length > 0
        ? await prisma.user.findMany({
            where: {
              id: {
                in: userIds,
              },
            },
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          })
        : [],
    );
    const usersById = new Map(users.map((user) => [asString(user.id), user] as const));
    return posts.map((post) => {
      const authorUserId = asString(post.authorUserId);
      const postId = asString(post.id);
      const likes = asRows(post.reactions).filter(
        (row) => String(row.reaction ?? 'LIKE').toUpperCase() === 'LIKE',
      );
      const likedByCurrentUser = Boolean(
        authUserId && likes.some((row) => asString(row.userId) === authUserId),
      );
      const user = authorUserId ? usersById.get(authorUserId) : undefined;
      return {
        ...post,
        reactionsCount: postId ? likes.length : 0,
        likedByCurrentUser,
        likes: likedByCurrentUser && authUserId ? [authUserId] : [],
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
    const commentIds = comments.flatMap((comment): string[] => {
      const mapped = asString(comment.id);
      return mapped ? [mapped] : [];
    });
    const userIds = Array.from(
      new Set(
        comments.flatMap((comment): string[] => {
          const mapped = asString(comment.authorUserId);
          return mapped ? [mapped] : [];
        }),
      ),
    );
    const prisma = getPrismaClientOrThrow();
    const users = normalizeAs<SeedRow[]>(
      userIds.length > 0
        ? await prisma.user.findMany({
            where: {
              id: {
                in: userIds,
              },
            },
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          })
        : [],
    );
    const usersById = new Map(users.map((user) => [asString(user.id), user] as const));
    const reactions = normalizeAs<SeedRow[]>(
      commentIds.length > 0
        ? await prisma.postCommentReaction.findMany({
            where: {
              commentId: {
                in: commentIds,
              },
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
        likesCount: commentId ? (likesCountByCommentId.get(commentId) ?? 0) : 0,
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
      where: {
        id: parentCommentId,
      },
    });
    if (!parent || parent.postId !== postId) {
      throw badRequest('Parent comment must belong to the target post', {
        postId,
        parentCommentId,
      });
    }
    if (parent.isDeleted || parent.deletedAt) {
      throw badRequest('Cannot reply to a deleted comment', {
        parentCommentId,
      });
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
      select: {
        id: true,
      },
    });
    if (!group) {
      throw notFound('Community group not found', {
        communityGroupId,
      });
    }
    const membership = await prisma.communityGroupMembership.findFirst({
      where: {
        communityGroupId,
        userId: authUserId,
        active: true,
        deletedAt: null,
      },
      select: {
        id: true,
      },
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
      select: {
        id: true,
      },
    });
    if (!thread) {
      throw notFound('Message thread not found', {
        messageThreadId,
      });
    }
    const participant = await prisma.messageParticipant.findFirst({
      where: {
        messageThreadId,
        userId: authUserId,
        leftAt: null,
      },
      select: {
        id: true,
      },
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
      where: {
        id: threadId,
      },
      include: {
        participants: {
          where: {
            leftAt: null,
          },
        },
        messages: {
          where: {
            deletedAt: null,
          },
          include: {
            receipts: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
    if (!thread) {
      throw notFound('Message thread not found', {
        threadId,
      });
    }
    return normalizeAs<SeedRow>(thread);
  }
  async listCommunityGroups(params: CommunityMediaAccessParams): Promise<CommunityGroupListResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.listCommunityGroups(params);
    }
    const readableGroupIds = await this.getReadableCommunityGroupIds(params.authUserId);
    if (readableGroupIds.length === 0) {
      return {
        groups: [],
        dataVersion: null,
      };
    }
    const prisma = getPrismaClientOrThrow();
    const groups = normalizeAs<SeedRow[]>(
      await prisma.communityGroup.findMany({
        where: {
          id: {
            in: readableGroupIds,
          },
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
        orderBy: {
          updatedAt: 'desc',
        },
      }),
    );
    return {
      groups,
      dataVersion: null,
    };
  }
  async createCommunityGroup(
    params: CommunityGroupCreateParams,
  ): Promise<CommunityGroupMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.createCommunityGroup(params);
    }
    const scope = await this.assertCanCreateCommunityGroup(params);
    const prisma = getPrismaClientOrThrow();
    const requestHash = hashCommunityGroupCreateRequest(params);
    if (params.idempotencyKey) {
      const existing = await prisma.idempotencyKey.findUnique({
        where: {
          userId_endpointKey_idempotencyKey: {
            userId: params.authUserId,
            endpointKey: COMMUNITY_GROUP_CREATE_ENDPOINT_KEY,
            idempotencyKey: params.idempotencyKey,
          },
        },
      });
      if (existing) {
        assertMatchingIdempotencyRequest(
          normalizeAs<SeedRow>(existing),
          requestHash,
          'Idempotency key was already used with a different community group payload',
        );
        return normalizeAs<CommunityGroupMutationResult>(existing.responseBodyJson);
      }
    }
    if (scope.type === 'SQUAD' && scope.squadId) {
      const existingGroup = await prisma.communityGroup.findFirst({
        where: {
          squadId: scope.squadId,
          deletedAt: null,
        },
        include: {
          memberships: {
            where: {
              active: true,
              deletedAt: null,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
      if (existingGroup) {
        return {
          group: normalizeAs<SeedRow>(existingGroup),
          dataVersion: null,
        };
      }
    }
    const name = params.name.trim();
    if (!name) {
      throw badRequest('Community group name cannot be empty');
    }
    if (name.length > 120) {
      throw badRequest('Community group name must be 120 characters or fewer');
    }
    const now = new Date();
    const groupId = newId('cgrp');
    const membershipUserIds = [params.authUserId, ...scope.memberUserIds];
    return prisma.$transaction(async (tx): Promise<CommunityGroupMutationResult> => {
      const group = await tx.communityGroup.create({
        data: {
          id: groupId,
          groupType: scope.type,
          clubId: scope.clubId,
          squadId: scope.squadId,
          ownerUserId: params.authUserId,
          name,
          description: params.description?.trim() || null,
          visibility: scope.visibility,
          createdByUserId: params.authUserId,
          updatedByUserId: params.authUserId,
          version: 1,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          deletedByUserId: null,
          memberships: {
            create: membershipUserIds.map((userId, index) => ({
              id: newId('cgm'),
              userId,
              role: index === 0 ? 'OWNER' : 'MEMBER',
              active: true,
              createdByUserId: params.authUserId,
              updatedByUserId: params.authUserId,
              version: 1,
              createdAt: now,
              updatedAt: now,
              deletedAt: null,
            })),
          },
        },
        include: {
          memberships: {
            where: {
              active: true,
              deletedAt: null,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
      const groupResponse: CommunityGroupMutationResult = {
        group: normalizeAs<SeedRow>(group),
        dataVersion: null,
      };
      if (params.idempotencyKey) {
        await tx.idempotencyKey.create({
          data: {
            id: newId('idk'),
            userId: params.authUserId,
            endpointKey: COMMUNITY_GROUP_CREATE_ENDPOINT_KEY,
            idempotencyKey: params.idempotencyKey,
            requestHash,
            responseStatus: 201,
            responseBodyJson: groupResponse as never,
            expiresAt: new Date(now.getTime() + IDEMPOTENCY_TTL_MS),
          },
        });
      }
      return groupResponse;
    });
  }
  async joinCommunityGroup(
    params: CommunityGroupMembershipParams,
  ): Promise<CommunityGroupMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.joinCommunityGroup(params);
    }
    await this.assertCanJoinCommunityGroup(params);
    const prisma = getPrismaClientOrThrow();
    const now = new Date();
    return prisma.$transaction(async (tx): Promise<CommunityGroupMutationResult> => {
      const existingMembership = await tx.communityGroupMembership.findUnique({
        where: {
          communityGroupId_userId: {
            communityGroupId: params.communityGroupId,
            userId: params.authUserId,
          },
        },
      });
      if (existingMembership?.active && !existingMembership.deletedAt) {
        throw conflict('Authenticated user is already a community group member', {
          communityGroupId: params.communityGroupId,
        });
      }
      if (existingMembership) {
        await tx.communityGroupMembership.update({
          where: {
            id: existingMembership.id,
          },
          data: {
            role: 'MEMBER',
            active: true,
            deletedAt: null,
            updatedByUserId: params.authUserId,
            version: {
              increment: 1,
            },
          },
        });
      } else {
        await tx.communityGroupMembership.create({
          data: {
            id: newId('cgm'),
            communityGroupId: params.communityGroupId,
            userId: params.authUserId,
            role: 'MEMBER',
            active: true,
            createdByUserId: params.authUserId,
            updatedByUserId: params.authUserId,
            version: 1,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        });
      }
      const group = await tx.communityGroup.update({
        where: {
          id: params.communityGroupId,
        },
        data: {
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
        include: {
          memberships: {
            where: {
              active: true,
              deletedAt: null,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
      return {
        group: normalizeAs<SeedRow>(group),
        dataVersion: null,
      };
    });
  }
  async leaveCommunityGroup(
    params: CommunityGroupMembershipParams,
  ): Promise<CommunityGroupMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.leaveCommunityGroup(params);
    }
    const scope = await this.assertCanLeaveCommunityGroup(params);
    const prisma = getPrismaClientOrThrow();
    const now = new Date();
    return prisma.$transaction(async (tx): Promise<CommunityGroupMutationResult> => {
      await tx.communityGroupMembership.update({
        where: {
          id: scope.membershipId,
        },
        data: {
          active: false,
          deletedAt: now,
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
      });
      const group = await tx.communityGroup.update({
        where: {
          id: scope.groupId,
        },
        data: {
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
        include: {
          memberships: {
            where: {
              active: true,
              deletedAt: null,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
      return {
        group: normalizeAs<SeedRow>(group),
        dataVersion: null,
      };
    });
  }
  async addCommunityGroupMember(
    params: CommunityGroupMemberAddParams,
  ): Promise<CommunityGroupMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.addCommunityGroupMember(params);
    }
    const scope = await this.getCommunityGroupMemberAddScope(params);
    const prisma = getPrismaClientOrThrow();
    const existingMembershipId = asString(scope.existingMembership?.id);
    if (
      scope.existingMembership &&
      asBoolean(scope.existingMembership.active) !== false &&
      asString(scope.existingMembership.deletedAt) == null
    ) {
      const group = await prisma.communityGroup.findUnique({
        where: {
          id: params.communityGroupId,
        },
        include: {
          memberships: {
            where: {
              active: true,
              deletedAt: null,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
      if (!group) {
        throw notFound('Community group not found', {
          communityGroupId: params.communityGroupId,
        });
      }
      return {
        group: normalizeAs<SeedRow>(group),
        dataVersion: null,
      };
    }
    const now = new Date();
    return prisma.$transaction(async (tx): Promise<CommunityGroupMutationResult> => {
      if (existingMembershipId) {
        await tx.communityGroupMembership.update({
          where: {
            id: existingMembershipId,
          },
          data: {
            role: scope.role,
            active: true,
            deletedAt: null,
            updatedByUserId: params.authUserId,
            version: {
              increment: 1,
            },
          },
        });
      } else {
        await tx.communityGroupMembership.create({
          data: {
            id: newId('cgm'),
            communityGroupId: params.communityGroupId,
            userId: params.memberUserId,
            role: scope.role,
            active: true,
            createdByUserId: params.authUserId,
            updatedByUserId: params.authUserId,
            version: 1,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        });
      }
      const group = await tx.communityGroup.update({
        where: {
          id: params.communityGroupId,
        },
        data: {
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
        include: {
          memberships: {
            where: {
              active: true,
              deletedAt: null,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
      return {
        group: normalizeAs<SeedRow>(group),
        dataVersion: null,
      };
    });
  }
  async updateCommunityGroupMemberRole(
    params: CommunityGroupMemberRoleUpdateParams,
  ): Promise<CommunityGroupMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.updateCommunityGroupMemberRole(params);
    }
    const scope = await this.getCommunityGroupMemberManagementScope(params);
    assertCanUpdateStoreCommunityGroupMemberRole(params, scope);
    const prisma = getPrismaClientOrThrow();
    const previousRole = normalizeRole(scope.targetMembership.role);
    const nextRole = normalizeRole(params.role);
    return prisma.$transaction(async (tx): Promise<CommunityGroupMutationResult> => {
      const targetMembershipId = asString(scope.targetMembership.id);
      if (!targetMembershipId) {
        throw notFound('Community group membership not found', {
          communityGroupId: params.communityGroupId,
          memberUserId: params.memberUserId,
        });
      }
      if (previousRole === nextRole) {
        const group = await tx.communityGroup.findUnique({
          where: {
            id: params.communityGroupId,
          },
          include: {
            memberships: {
              where: {
                active: true,
                deletedAt: null,
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        });
        if (!group) {
          throw notFound('Community group not found', {
            communityGroupId: params.communityGroupId,
          });
        }
        return {
          group: normalizeAs<SeedRow>(group),
          dataVersion: null,
        };
      }
      await tx.communityGroupMembership.update({
        where: {
          id: targetMembershipId,
        },
        data: {
          role: nextRole,
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
      });
      const group = await tx.communityGroup.update({
        where: {
          id: params.communityGroupId,
        },
        data: {
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
        include: {
          memberships: {
            where: {
              active: true,
              deletedAt: null,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
      return {
        group: normalizeAs<SeedRow>(group),
        dataVersion: null,
      };
    });
  }
  async removeCommunityGroupMember(
    params: CommunityGroupMemberRemoveParams,
  ): Promise<CommunityGroupMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.removeCommunityGroupMember(params);
    }
    const scope = await this.getCommunityGroupMemberManagementScope(params);
    assertCanRemoveStoreCommunityGroupMember(params, scope);
    const targetMembershipId = asString(scope.targetMembership.id);
    if (!targetMembershipId) {
      throw notFound('Community group membership not found', {
        communityGroupId: params.communityGroupId,
        memberUserId: params.memberUserId,
      });
    }
    const prisma = getPrismaClientOrThrow();
    const now = new Date();
    return prisma.$transaction(async (tx): Promise<CommunityGroupMutationResult> => {
      await tx.communityGroupMembership.update({
        where: {
          id: targetMembershipId,
        },
        data: {
          active: false,
          deletedAt: now,
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
      });
      const group = await tx.communityGroup.update({
        where: {
          id: params.communityGroupId,
        },
        data: {
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
        include: {
          memberships: {
            where: {
              active: true,
              deletedAt: null,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
      return {
        group: normalizeAs<SeedRow>(group),
        dataVersion: null,
      };
    });
  }
  async transferCommunityGroupOwner(
    params: CommunityGroupOwnerTransferParams,
  ): Promise<CommunityGroupMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.transferCommunityGroupOwner(params);
    }
    const scope = await this.getCommunityGroupMemberManagementScope(params);
    assertCanTransferStoreCommunityGroupOwner(params, scope);
    const targetMembershipId = asString(scope.targetMembership.id);
    if (!targetMembershipId) {
      throw notFound('Community group membership not found', {
        communityGroupId: params.communityGroupId,
        memberUserId: params.memberUserId,
      });
    }
    const prisma = getPrismaClientOrThrow();
    return prisma.$transaction(async (tx): Promise<CommunityGroupMutationResult> => {
      await tx.communityGroupMembership.updateMany({
        where: {
          communityGroupId: params.communityGroupId,
          active: true,
          deletedAt: null,
          role: 'OWNER',
          userId: {
            not: params.memberUserId,
          },
        },
        data: {
          role: 'ADMIN',
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
      });
      await tx.communityGroupMembership.update({
        where: {
          id: targetMembershipId,
        },
        data: {
          role: 'OWNER',
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
      });
      const group = await tx.communityGroup.update({
        where: {
          id: params.communityGroupId,
        },
        data: {
          ownerUserId: params.memberUserId,
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
        include: {
          memberships: {
            where: {
              active: true,
              deletedAt: null,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
      return {
        group: normalizeAs<SeedRow>(group),
        dataVersion: null,
      };
    });
  }
  async archiveCommunityGroup(
    params: CommunityGroupMembershipParams,
  ): Promise<CommunityGroupMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.archiveCommunityGroup(params);
    }
    const scope = await this.assertCanArchiveCommunityGroup(params);
    const prisma = getPrismaClientOrThrow();
    const now = new Date();
    return prisma.$transaction(async (tx): Promise<CommunityGroupMutationResult> => {
      await tx.communityGroupMembership.updateMany({
        where: {
          communityGroupId: scope.groupId,
          active: true,
          deletedAt: null,
        },
        data: {
          active: false,
          deletedAt: now,
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
      });
      const group = await tx.communityGroup.update({
        where: {
          id: scope.groupId,
        },
        data: {
          deletedAt: now,
          deletedByUserId: params.authUserId,
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
        include: {
          memberships: {
            where: {
              active: true,
              deletedAt: null,
            },
          },
        },
      });
      return {
        group: normalizeAs<SeedRow>(group),
        dataVersion: null,
      };
    });
  }
  async createCommunityGroupInvite(
    params: CommunityGroupInviteCreateParams,
  ): Promise<CommunityGroupInviteMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.createCommunityGroupInvite(params);
    }
    const prisma = getPrismaClientOrThrow();
    const [group, invitee] = await Promise.all([
      prisma.communityGroup.findFirst({
        where: {
          id: params.communityGroupId,
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
      }),
      prisma.user.findUnique({
        where: {
          id: params.inviteeUserId,
        },
        select: {
          id: true,
          name: true,
        },
      }),
    ]);
    if (!group) {
      throw notFound('Community group not found', {
        communityGroupId: params.communityGroupId,
      });
    }
    if (!invitee) {
      throw notFound('Invitee user not found', {
        inviteeUserId: params.inviteeUserId,
      });
    }
    const actorMembership = group.memberships.find((row) => row.userId === params.authUserId);
    if (!params.isPrivilegedAdmin && !isGroupPrivilegedRole(actorMembership?.role)) {
      throw forbidden('Only community group owners and admins can invite members', {
        communityGroupId: params.communityGroupId,
      });
    }
    if (group.memberships.some((row) => row.userId === params.inviteeUserId)) {
      throw conflict('Invitee is already a community group member', {
        communityGroupId: params.communityGroupId,
        inviteeUserId: params.inviteeUserId,
      });
    }
    if (group.clubId && !params.isPrivilegedAdmin) {
      const clubMembership = await prisma.clubMembership.findFirst({
        where: {
          clubId: group.clubId,
          userId: params.inviteeUserId,
          active: true,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });
      if (!clubMembership) {
        throw forbidden('Club community group invitees must already belong to the club', {
          clubId: group.clubId,
          communityGroupId: params.communityGroupId,
          inviteeUserId: params.inviteeUserId,
        });
      }
    }
    await this.assertSquadCommunityGroupUserEligible({
      group: normalizeAs<SeedRow>(group),
      userId: params.inviteeUserId,
      userIdField: 'inviteeUserId',
    });
    const pendingInvites = await prisma.invite.findMany({
      where: {
        inviteType: COMMUNITY_GROUP_INVITE_TYPE,
        status: 'PENDING',
      },
      include: {
        targets: {
          where: {
            targetUserId: params.inviteeUserId,
            status: 'PENDING',
          },
        },
      },
    });
    if (
      pendingInvites.some(
        (invite) =>
          normalizeAs<SeedRow>(invite.metadataJson).communityGroupId === params.communityGroupId &&
          invite.targets.length > 0,
      )
    ) {
      throw conflict('Community group invite is already pending', {
        communityGroupId: params.communityGroupId,
        inviteeUserId: params.inviteeUserId,
      });
    }
    const inviter = await prisma.user.findUnique({
      where: {
        id: params.authUserId,
      },
      select: {
        name: true,
      },
    });
    const now = new Date();
    const inviteId = newId('cgi');
    const targetId = newId('cgit');
    await prisma.$transaction(async (tx) => {
      await tx.invite.create({
        data: {
          id: inviteId,
          inviteType: COMMUNITY_GROUP_INVITE_TYPE,
          senderUserId: params.authUserId,
          clubId: group.clubId,
          status: 'PENDING',
          message: params.message?.trim() || null,
          metadataJson: {
            communityGroupId: params.communityGroupId,
            groupName: group.name,
          } as never,
          createdAt: now,
          updatedAt: now,
        },
      });
      await tx.inviteTarget.create({
        data: {
          id: targetId,
          inviteId,
          targetUserId: params.inviteeUserId,
          status: 'PENDING',
          createdAt: now,
          updatedAt: now,
        },
      });
      await tx.notification.create({
        data: {
          id: newId('ntf'),
          userId: params.inviteeUserId,
          type: 'COMMUNITY_GROUP_INVITE',
          title: 'Group invite',
          body: `${inviter?.name ?? 'A member'} invited you to join ${group.name}`,
          status: 'UNREAD',
          sourceType: 'community_group_invite',
          sourceId: inviteId,
          deepLink: `/community/invites/${inviteId}`,
          metadataJson: {
            communityGroupId: params.communityGroupId,
          } as never,
          createdAt: now,
          updatedAt: now,
        },
      });
    });
    return {
      invite: {
        id: inviteId,
        groupId: params.communityGroupId,
        groupName: group.name,
        inviterId: params.authUserId,
        inviterName: inviter?.name ?? params.authUserId,
        inviteeId: params.inviteeUserId,
        inviteeName: invitee.name ?? params.inviteeUserId,
        status: 'PENDING',
        createdAt: now.toISOString(),
      },
      dataVersion: null,
    };
  }
  async listCommunityGroupInvites(
    params: CommunityMediaAccessParams,
  ): Promise<CommunityGroupInviteListResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.listCommunityGroupInvites(params);
    }
    const prisma = getPrismaClientOrThrow();
    const targets = await prisma.inviteTarget.findMany({
      where: {
        targetUserId: params.authUserId,
        status: 'PENDING',
        invite: {
          inviteType: COMMUNITY_GROUP_INVITE_TYPE,
          status: 'PENDING',
        },
      },
      include: {
        invite: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    const groupIds = Array.from(
      new Set(
        targets
          .map((target) => asString(normalizeAs<SeedRow>(target.invite.metadataJson).communityGroupId))
          .filter((groupId): groupId is string => Boolean(groupId)),
      ),
    );
    const groups = groupIds.length
      ? await prisma.communityGroup.findMany({
          where: {
            id: {
              in: groupIds,
            },
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
          },
        })
      : [];
    const groupById = new Map(groups.map((group) => [group.id, group] as const));
    return {
      invites: targets.flatMap((target): SeedRow[] => {
        const groupId = asString(normalizeAs<SeedRow>(target.invite.metadataJson).communityGroupId);
        const group = groupId ? groupById.get(groupId) : undefined;
        if (!group || !groupId) {
          return [];
        }
        return [
          {
            id: target.invite.id,
            groupId,
            groupName: group.name,
            inviterId: target.invite.senderUserId,
            inviteeId: params.authUserId,
            status: target.status,
            createdAt: target.invite.createdAt,
            respondedAt: target.respondedAt,
          },
        ];
      }),
      dataVersion: null,
    };
  }
  async acceptCommunityGroupInvite(
    params: CommunityGroupInviteMutationParams,
  ): Promise<CommunityGroupInviteMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.acceptCommunityGroupInvite(params);
    }
    const prisma = getPrismaClientOrThrow();
    const target = await prisma.inviteTarget.findFirst({
      where: {
        inviteId: params.inviteId,
        targetUserId: params.authUserId,
        status: 'PENDING',
        invite: {
          inviteType: COMMUNITY_GROUP_INVITE_TYPE,
          status: 'PENDING',
        },
      },
      include: {
        invite: true,
      },
    });
    if (!target) {
      throw notFound('Community group invite not found', {
        inviteId: params.inviteId,
      });
    }
    const communityGroupId = asString(normalizeAs<SeedRow>(target.invite.metadataJson).communityGroupId);
    const group = communityGroupId
      ? await prisma.communityGroup.findFirst({
          where: {
            id: communityGroupId,
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
        })
      : null;
    if (!group || !communityGroupId) {
      throw notFound('Community group not found', {
        inviteId: params.inviteId,
      });
    }
    if (group.memberships.some((row) => row.userId === params.authUserId)) {
      throw conflict('Invitee is already a community group member', {
        communityGroupId,
      });
    }
    await this.assertSquadCommunityGroupUserEligible({
      group: normalizeAs<SeedRow>(group),
      userId: params.authUserId,
      userIdField: 'userId',
    });
    const now = new Date();
    return prisma.$transaction(async (tx): Promise<CommunityGroupInviteMutationResult> => {
      await tx.invite.update({
        where: {
          id: target.invite.id,
        },
        data: {
          status: 'ACCEPTED',
        },
      });
      await tx.inviteTarget.update({
        where: {
          id: target.id,
        },
        data: {
          status: 'ACCEPTED',
          respondedAt: now,
        },
      });
      await tx.communityGroupMembership.upsert({
        where: {
          communityGroupId_userId: {
            communityGroupId,
            userId: params.authUserId,
          },
        },
        create: {
          id: newId('cgm'),
          communityGroupId,
          userId: params.authUserId,
          role: 'MEMBER',
          active: true,
          createdByUserId: params.authUserId,
          updatedByUserId: params.authUserId,
          version: 1,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
        update: {
          role: 'MEMBER',
          active: true,
          deletedAt: null,
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
      });
      const updatedGroup = await tx.communityGroup.update({
        where: {
          id: communityGroupId,
        },
        data: {
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
        include: {
          memberships: {
            where: {
              active: true,
              deletedAt: null,
            },
          },
        },
      });
      return {
        invite: {
          id: target.invite.id,
          groupId: communityGroupId,
          groupName: group.name,
          inviterId: target.invite.senderUserId,
          inviteeId: params.authUserId,
          status: 'ACCEPTED',
          createdAt: target.invite.createdAt,
          respondedAt: now.toISOString(),
        },
        group: normalizeAs<SeedRow>(updatedGroup),
        dataVersion: null,
      };
    });
  }
  async declineCommunityGroupInvite(
    params: CommunityGroupInviteMutationParams,
  ): Promise<CommunityGroupInviteMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.declineCommunityGroupInvite(params);
    }
    const prisma = getPrismaClientOrThrow();
    const target = await prisma.inviteTarget.findFirst({
      where: {
        inviteId: params.inviteId,
        targetUserId: params.authUserId,
        status: 'PENDING',
        invite: {
          inviteType: COMMUNITY_GROUP_INVITE_TYPE,
          status: 'PENDING',
        },
      },
      include: {
        invite: true,
      },
    });
    if (!target) {
      throw notFound('Community group invite not found', {
        inviteId: params.inviteId,
      });
    }
    const communityGroupId = asString(normalizeAs<SeedRow>(target.invite.metadataJson).communityGroupId);
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.invite.update({
        where: {
          id: target.invite.id,
        },
        data: {
          status: 'DECLINED',
        },
      });
      await tx.inviteTarget.update({
        where: {
          id: target.id,
        },
        data: {
          status: 'DECLINED',
          respondedAt: now,
        },
      });
    });
    return {
      invite: {
        id: target.invite.id,
        groupId: communityGroupId,
        inviterId: target.invite.senderUserId,
        inviteeId: params.authUserId,
        status: 'DECLINED',
        createdAt: target.invite.createdAt,
        respondedAt: now.toISOString(),
      },
      dataVersion: null,
    };
  }
  async createCommunityGroupJoinRequest(
    params: CommunityGroupJoinRequestCreateParams,
  ): Promise<CommunityGroupJoinRequestMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.createCommunityGroupJoinRequest(params);
    }
    const scope = await this.assertCanCreateCommunityGroupJoinRequest(params);
    const prisma = getPrismaClientOrThrow();
    const now = new Date();
    const requestId = newId('cgjr');
    await prisma.$transaction(async (tx) => {
      await tx.invite.create({
        data: {
          id: requestId,
          inviteType: COMMUNITY_GROUP_JOIN_REQUEST_TYPE,
          senderUserId: params.authUserId,
          clubId: asString(scope.group.clubId) ?? null,
          status: 'PENDING',
          message: null,
          metadataJson: {
            communityGroupId: params.communityGroupId,
            groupName: asString(scope.group.name) ?? 'Community group',
            requesterName:
              asString(scope.requester.name) ?? asString(scope.requester.email) ?? params.authUserId,
            requestedRole: 'MEMBER',
            isCoach: params.isCoach ?? false,
          } as never,
          createdAt: now,
          updatedAt: now,
        },
      });
      if (scope.managerUserIds.length > 0) {
        await tx.notification.createMany({
          data: scope.managerUserIds.map((userId) => ({
            id: newId('ntf'),
            userId,
            type: 'COMMUNITY_GROUP_JOIN_REQUEST',
            title: 'Group join request',
            body: `${
              asString(scope.requester.name) ?? asString(scope.requester.email) ?? 'A member'
            } wants to join ${asString(scope.group.name) ?? 'a community group'}`,
            status: 'UNREAD',
            sourceType: 'community_group_join_request',
            sourceId: requestId,
            deepLink: `/community/groups/${params.communityGroupId}/join-requests`,
            metadataJson: {
              communityGroupId: params.communityGroupId,
            } as never,
            createdAt: now,
            updatedAt: now,
          })),
        });
      }
    });
    return {
      request: {
        id: requestId,
        groupId: params.communityGroupId,
        groupName: asString(scope.group.name) ?? 'Community group',
        requesterId: params.authUserId,
        requesterName:
          asString(scope.requester.name) ?? asString(scope.requester.email) ?? params.authUserId,
        requestedRole: 'MEMBER',
        isCoach: params.isCoach ?? false,
        status: 'PENDING',
        createdAt: now.toISOString(),
        respondedAt: null,
      },
      dataVersion: null,
    };
  }
  async listCommunityGroupJoinRequests(
    params: CommunityGroupMembershipParams,
  ): Promise<CommunityGroupJoinRequestListResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.listCommunityGroupJoinRequests(params);
    }
    const scope = await this.assertCanManageCommunityGroupJoinRequests(params);
    const prisma = getPrismaClientOrThrow();
    const requests = normalizeAs<SeedRow[]>(
      await prisma.invite.findMany({
        where: {
          inviteType: COMMUNITY_GROUP_JOIN_REQUEST_TYPE,
          status: 'PENDING',
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ).filter((request) => communityGroupIdForInvite(request) === params.communityGroupId);
    const requesterIds = Array.from(
      new Set(
        requests.flatMap((request): string[] => {
          const requesterId = asString(request.senderUserId);
          return requesterId ? [requesterId] : [];
        }),
      ),
    );
    const requesters = normalizeAs<SeedRow[]>(
      requesterIds.length > 0
        ? await prisma.user.findMany({
            where: {
              id: {
                in: requesterIds,
              },
            },
            select: {
              id: true,
              name: true,
              email: true,
            },
          })
        : [],
    );
    const requestersById = new Map(requesters.map((requester) => [asString(requester.id), requester] as const));
    return {
      requests: requests.map((request): SeedRow => {
        const metadata = coerceMetadata(request.metadataJson);
        const requesterId = asString(request.senderUserId);
        const requester = requesterId ? requestersById.get(requesterId) : undefined;
        return {
          id: request.id,
          groupId: params.communityGroupId,
          groupName: asString(scope.group.name) ?? asString(metadata.groupName) ?? 'Community group',
          requesterId,
          requesterName:
            asString(requester?.name) ??
            asString(requester?.email) ??
            asString(metadata.requesterName) ??
            requesterId,
          requestedRole: 'MEMBER',
          isCoach: asBoolean(metadata.isCoach) ?? false,
          status: 'PENDING',
          createdAt: request.createdAt,
          respondedAt: null,
        };
      }),
      dataVersion: null,
    };
  }
  async approveCommunityGroupJoinRequest(
    params: CommunityGroupJoinRequestMutationParams,
  ): Promise<CommunityGroupJoinRequestMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.approveCommunityGroupJoinRequest(params);
    }
    const scope = await this.assertCanManageCommunityGroupJoinRequests(params);
    const prisma = getPrismaClientOrThrow();
    const request = normalizeAs<SeedRow | null>(
      await prisma.invite.findFirst({
        where: {
          id: params.requestId,
          inviteType: COMMUNITY_GROUP_JOIN_REQUEST_TYPE,
          status: 'PENDING',
        },
      }),
    );
    if (!request || communityGroupIdForInvite(request) !== params.communityGroupId) {
      throw notFound('Community group join request not found', {
        communityGroupId: params.communityGroupId,
        requestId: params.requestId,
      });
    }
    const requesterUserId = asString(request.senderUserId);
    if (!requesterUserId) {
      throw badRequest('Community group join request is missing a requester', {
        requestId: params.requestId,
      });
    }
    const requester = normalizeAs<SeedRow | null>(
      await prisma.user.findUnique({
        where: {
          id: requesterUserId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          deletedAt: true,
        },
      }),
    );
    if (!requester || requester.deletedAt) {
      throw notFound('Requester user not found', {
        requesterUserId,
      });
    }
    const existingMembership = await prisma.communityGroupMembership.findUnique({
      where: {
        communityGroupId_userId: {
          communityGroupId: params.communityGroupId,
          userId: requesterUserId,
        },
      },
    });
    if (existingMembership?.active && !existingMembership.deletedAt) {
      throw conflict('Requester is already a community group member', {
        communityGroupId: params.communityGroupId,
        requestId: params.requestId,
      });
    }
    await this.assertSquadCommunityGroupUserEligible({
      group: scope.group,
      userId: requesterUserId,
      userIdField: 'requesterUserId',
    });
    const now = new Date();
    return prisma.$transaction(async (tx): Promise<CommunityGroupJoinRequestMutationResult> => {
      await tx.invite.update({
        where: {
          id: params.requestId,
        },
        data: {
          status: 'ACCEPTED',
        },
      });
      await tx.communityGroupMembership.upsert({
        where: {
          communityGroupId_userId: {
            communityGroupId: params.communityGroupId,
            userId: requesterUserId,
          },
        },
        create: {
          id: newId('cgm'),
          communityGroupId: params.communityGroupId,
          userId: requesterUserId,
          role: 'MEMBER',
          active: true,
          createdByUserId: params.authUserId,
          updatedByUserId: params.authUserId,
          version: 1,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
        update: {
          role: 'MEMBER',
          active: true,
          deletedAt: null,
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
      });
      const group = await tx.communityGroup.update({
        where: {
          id: params.communityGroupId,
        },
        data: {
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
        include: {
          memberships: {
            where: {
              active: true,
              deletedAt: null,
            },
          },
        },
      });
      await tx.notification.create({
        data: {
          id: newId('ntf'),
          userId: requesterUserId,
          type: 'COMMUNITY_GROUP_JOIN_REQUEST',
          title: 'Join request approved',
          body: `Your request to join ${asString(scope.group.name) ?? 'the community group'} was approved.`,
          status: 'UNREAD',
          sourceType: 'community_group_join_request',
          sourceId: params.requestId,
          deepLink: `/community/groups/${params.communityGroupId}`,
          metadataJson: {
            communityGroupId: params.communityGroupId,
          } as never,
          createdAt: now,
          updatedAt: now,
        },
      });
      const metadata = coerceMetadata(request.metadataJson);
      return {
        request: {
          id: params.requestId,
          groupId: params.communityGroupId,
          groupName: asString(scope.group.name) ?? asString(metadata.groupName) ?? 'Community group',
          requesterId: requesterUserId,
          requesterName:
            asString(requester.name) ??
            asString(requester.email) ??
            asString(metadata.requesterName) ??
            requesterUserId,
          requestedRole: 'MEMBER',
          isCoach: asBoolean(metadata.isCoach) ?? false,
          status: 'ACCEPTED',
          createdAt: request.createdAt,
          respondedAt: now.toISOString(),
        },
        group: normalizeAs<SeedRow>(group),
        dataVersion: null,
      };
    });
  }
  async rejectCommunityGroupJoinRequest(
    params: CommunityGroupJoinRequestMutationParams,
  ): Promise<CommunityGroupJoinRequestMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.rejectCommunityGroupJoinRequest(params);
    }
    const scope = await this.assertCanManageCommunityGroupJoinRequests(params);
    const prisma = getPrismaClientOrThrow();
    const request = normalizeAs<SeedRow | null>(
      await prisma.invite.findFirst({
        where: {
          id: params.requestId,
          inviteType: COMMUNITY_GROUP_JOIN_REQUEST_TYPE,
          status: 'PENDING',
        },
      }),
    );
    if (!request || communityGroupIdForInvite(request) !== params.communityGroupId) {
      throw notFound('Community group join request not found', {
        communityGroupId: params.communityGroupId,
        requestId: params.requestId,
      });
    }
    const requesterUserId = asString(request.senderUserId);
    if (!requesterUserId) {
      throw badRequest('Community group join request is missing a requester', {
        requestId: params.requestId,
      });
    }
    const requester = normalizeAs<SeedRow | null>(
      await prisma.user.findUnique({
        where: {
          id: requesterUserId,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      }),
    );
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.invite.update({
        where: {
          id: params.requestId,
        },
        data: {
          status: 'DECLINED',
        },
      });
      await tx.notification.create({
        data: {
          id: newId('ntf'),
          userId: requesterUserId,
          type: 'COMMUNITY_GROUP_JOIN_REQUEST',
          title: 'Join request declined',
          body: `Your request to join ${asString(scope.group.name) ?? 'the community group'} was not approved.`,
          status: 'UNREAD',
          sourceType: 'community_group_join_request',
          sourceId: params.requestId,
          deepLink: `/community/groups/${params.communityGroupId}`,
          metadataJson: {
            communityGroupId: params.communityGroupId,
          } as never,
          createdAt: now,
          updatedAt: now,
        },
      });
    });
    const metadata = coerceMetadata(request.metadataJson);
    return {
      request: {
        id: params.requestId,
        groupId: params.communityGroupId,
        groupName: asString(scope.group.name) ?? asString(metadata.groupName) ?? 'Community group',
        requesterId: requesterUserId,
        requesterName:
          asString(requester?.name) ??
          asString(requester?.email) ??
          asString(metadata.requesterName) ??
          requesterUserId,
        requestedRole: 'MEMBER',
        isCoach: asBoolean(metadata.isCoach) ?? false,
        status: 'DECLINED',
        createdAt: request.createdAt,
        respondedAt: now.toISOString(),
      },
      dataVersion: null,
    };
  }
  async listPosts(params: PostListParams): Promise<PostListResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.listPosts(params);
    }
    if (params.clubId && params.communityGroupId) {
      throw badRequest('Use either clubId or communityGroupId when listing posts');
    }
    const [readableGroupIds, readableClubIds] = await Promise.all([
      this.getReadableCommunityGroupIds(params.authUserId),
      this.getReadableClubIds(params.authUserId),
    ]);
    if (params.communityGroupId && !readableGroupIds.includes(params.communityGroupId)) {
      throw forbidden('Community group does not belong to authenticated user', {
        communityGroupId: params.communityGroupId,
      });
    }
    if (params.clubId && !params.isPrivilegedAdmin && !readableClubIds.includes(params.clubId)) {
      throw forbidden('Club does not belong to authenticated user', {
        clubId: params.clubId,
      });
    }
    const prisma = getPrismaClientOrThrow();
    let followedUserIds: string[] | null = null;
    if (params.followingOnly) {
      const [followRows, blockRows] = await Promise.all([
        prisma.userFollow.findMany({
          where: {
            followerUserId: params.authUserId,
            deletedAt: null,
          },
          select: {
            followedUserId: true,
          },
        }),
        prisma.userBlock.findMany({
          where: {
            deletedAt: null,
            OR: [{ blockerUserId: params.authUserId }, { blockedUserId: params.authUserId }],
          },
          select: {
            blockerUserId: true,
            blockedUserId: true,
          },
        }),
      ]);
      const blockedUserIds = new Set(
        blockRows.flatMap((row) => {
          if (row.blockerUserId === params.authUserId) return [row.blockedUserId];
          if (row.blockedUserId === params.authUserId) return [row.blockerUserId];
          return [];
        }),
      );
      followedUserIds = followRows
        .map((row) => row.followedUserId)
        .filter((userId) => !blockedUserIds.has(userId));
      if (followedUserIds.length === 0) {
        return {
          posts: [],
          dataVersion: null,
        };
      }
    }
    const posts = normalizeAs<SeedRow[]>(
      await prisma.post.findMany({
        where: {
          deletedAt: null,
          ...(followedUserIds
            ? {
                authorUserId: {
                  in: followedUserIds,
                },
              }
            : {}),
          ...(params.communityGroupId
            ? {
                communityGroupId: params.communityGroupId,
              }
            : params.clubId
              ? {
                  clubId: params.clubId,
                }
            : {
                OR: [
                  {
                    authorUserId: params.authUserId,
                  },
                  {
                    communityGroupId: {
                      in: readableGroupIds,
                    },
                  },
                  {
                    clubId: {
                      in: readableClubIds,
                    },
                  },
                ],
              }),
        },
        include: {
          comments: {
            where: {
              deletedAt: null,
              isDeleted: false,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
          reactions: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    );
    return {
      posts: await this.hydratePosts(
        params.followingOnly ? posts.filter(isFollowingFeedPost) : posts,
        params.authUserId,
      ),
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
    const attachments = await assertDbMediaAttachments(params.authUserId, params.attachments);
    const now = new Date();
    const response = await prisma.$transaction(async (tx): Promise<PostMutationResult> => {
      const post = await tx.post.create({
        data: {
          id: newId('pst'),
          authorUserId: params.authUserId,
          clubId: scope.clubId,
          communityGroupId: scope.communityGroupId,
          visibility: scope.visibility,
          content,
          attachmentsJson: normalizeForJson(
            metadataWithAttachments(params.metadata, attachments),
          ) as never,
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
          where: {
            id: scope.communityGroupId,
          },
          data: {
            updatedByUserId: params.authUserId,
            version: {
              increment: 1,
            },
          },
        });
      }
      const author = await tx.user.findUnique({
        where: {
          id: params.authUserId,
        },
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      });
      const postResponse: PostMutationResult = {
        post: {
          ...normalizeAs<SeedRow>(post),
          reactionsCount: 0,
          likedByCurrentUser: false,
          likes: [],
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
            responseBodyJson: postResponse as never,
            expiresAt: new Date(now.getTime() + IDEMPOTENCY_TTL_MS),
          },
        });
      }
      return postResponse;
    });
    return response;
  }
  async togglePostReaction(params: PostReactionParams): Promise<PostReactionMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.togglePostReaction(params);
    }
    await this.assertReadablePost(params.postId, params.authUserId, params.isPrivilegedAdmin);
    const prisma = getPrismaClientOrThrow();
    const updatedPost = await prisma.$transaction(async (tx): Promise<SeedRow> => {
      const existing = await tx.postReaction.findUnique({
        where: {
          postId_userId_reaction: {
            postId: params.postId,
            userId: params.authUserId,
            reaction: 'LIKE',
          },
        },
      });
      if (existing) {
        await tx.postReaction.delete({
          where: {
            id: existing.id,
          },
        });
      } else {
        await tx.postReaction.create({
          data: {
            id: newId('prx'),
            postId: params.postId,
            userId: params.authUserId,
            reaction: 'LIKE',
          },
        });
      }
      const reactionsCount = await tx.postReaction.count({
        where: {
          postId: params.postId,
          reaction: 'LIKE',
        },
      });
      return normalizeAs<SeedRow>(
        await tx.post.update({
          where: {
            id: params.postId,
          },
          data: {
            reactionsCount,
            updatedByUserId: params.authUserId,
            version: {
              increment: 1,
            },
          },
          include: {
            reactions: true,
          },
        }),
      );
    });
    const hydrated = await this.hydratePosts([updatedPost], params.authUserId);
    return {
      post: hydrated[0] as SeedRow,
      dataVersion: null,
    };
  }
  async setPostPin(params: PostPinParams): Promise<PostMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.setPostPin(params);
    }
    const post = await this.assertReadablePost(
      params.postId,
      params.authUserId,
      params.isPrivilegedAdmin,
    );
    await this.assertCanPinPost(post, params);
    const metadata = { ...coerceMetadata(post.attachmentsJson) };
    const now = new Date();
    if (params.pinned) {
      metadata.isPinned = true;
      metadata.pinnedBy = params.authUserId;
      metadata.pinnedAt = now.toISOString();
    } else {
      delete metadata.isPinned;
      delete metadata.pinnedBy;
      delete metadata.pinnedAt;
    }
    const prisma = getPrismaClientOrThrow();
    const updated = normalizeAs<SeedRow>(
      await prisma.post.update({
        where: {
          id: params.postId,
        },
        data: {
          attachmentsJson: normalizeForJson(metadata) as never,
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
        include: {
          reactions: true,
        },
      }),
    );
    const hydrated = await this.hydratePosts([updated], params.authUserId);
    return {
      post: hydrated[0] as SeedRow,
      dataVersion: null,
    };
  }
  async listPostComments(params: PostCommentListParams): Promise<PostCommentListResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.listPostComments(params);
    }
    await this.assertReadablePost(params.postId, params.authUserId, params.isPrivilegedAdmin);
    const prisma = getPrismaClientOrThrow();
    const comments = normalizeAs<SeedRow[]>(
      await prisma.postComment.findMany({
        where: {
          postId: params.postId,
        },
        orderBy: {
          createdAt: 'asc',
        },
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
      where: {
        id: params.commentId,
      },
    });
    if (!comment) {
      throw notFound('Comment not found', {
        commentId: params.commentId,
      });
    }
    await this.assertReadablePost(comment.postId, params.authUserId, params.isPrivilegedAdmin);
    return {
      comment: await this.hydratePostComment(normalizeAs<SeedRow>(comment), params.authUserId),
      dataVersion: null,
    };
  }
  async createPostComment(params: PostCommentCreateParams): Promise<PostCommentMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.createPostComment(params);
    }
    await this.assertReadablePost(params.postId, params.authUserId, params.isPrivilegedAdmin);
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
    const response = await prisma.$transaction(async (tx): Promise<PostCommentMutationResult> => {
      const [comment, author] = await Promise.all([
        tx.postComment.create({
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
        }),
        tx.user.findUnique({
          where: {
            id: params.authUserId,
          },
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        }),
        tx.post.update({
          where: {
            id: params.postId,
          },
          data: {
            commentsCount: {
              increment: 1,
            },
            updatedByUserId: params.authUserId,
            version: {
              increment: 1,
            },
          },
        }),
      ]);
      const commentResponse: PostCommentMutationResult = {
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
            responseBodyJson: commentResponse as never,
            expiresAt: new Date(now.getTime() + IDEMPOTENCY_TTL_MS),
          },
        });
      }
      return commentResponse;
    });
    return response;
  }
  async deletePostComment(params: PostCommentDeleteParams): Promise<PostCommentMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.deletePostComment(params);
    }
    const prisma = getPrismaClientOrThrow();
    const comment = await prisma.postComment.findUnique({
      where: {
        id: params.commentId,
      },
    });
    if (!comment) {
      throw notFound('Comment not found', {
        commentId: params.commentId,
      });
    }

    await this.assertReadablePost(comment.postId, params.authUserId, params.isPrivilegedAdmin).then(
      () => {
        if (!params.isPrivilegedAdmin && comment.authorUserId !== params.authUserId) {
          throw forbidden('Only the comment author or privileged admin can delete this comment', {
            commentId: params.commentId,
          });
        }
        if (comment.isDeleted || comment.deletedAt) {
          throw conflict('Comment is already deleted', {
            commentId: params.commentId,
          });
        }
      },
    );
    const now = new Date();
    const updatedComment = await prisma.$transaction(async (tx): Promise<SeedRow> => {
      const [updated] = await Promise.all([
        tx.postComment.update({
          where: {
            id: params.commentId,
          },
          data: {
            content: '[deleted]',
            isDeleted: true,
            deletedAt: now,
            updatedAt: now,
          },
        }),
        tx.post.update({
          where: {
            id: comment.postId,
          },
          data: {
            commentsCount: {
              decrement: 1,
            },
            updatedByUserId: params.authUserId,
            version: {
              increment: 1,
            },
          },
        }),
      ]);
      return normalizeAs<SeedRow>(updated);
    });
    return {
      comment: await this.hydratePostComment(updatedComment, params.authUserId),
      dataVersion: null,
    };
  }
  async togglePostCommentReaction(
    params: PostCommentReactionParams,
  ): Promise<PostCommentMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.togglePostCommentReaction(params);
    }
    const prisma = getPrismaClientOrThrow();
    const comment = await prisma.postComment.findUnique({
      where: {
        id: params.commentId,
      },
    });
    if (!comment) {
      throw notFound('Comment not found', {
        commentId: params.commentId,
      });
    }

    await this.assertReadablePost(comment.postId, params.authUserId, params.isPrivilegedAdmin).then(
      () => {
        if (comment.isDeleted || comment.deletedAt) {
          throw badRequest('Cannot react to a deleted comment', {
            commentId: params.commentId,
          });
        }
      },
    );
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
          where: {
            id: existing.id,
          },
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
      select: {
        messageThreadId: true,
      },
    });
    const threadIds = participantRows.map((row) => row.messageThreadId);
    if (threadIds.length === 0) {
      return {
        threads: [],
        dataVersion: null,
      };
    }
    const threads = normalizeAs<SeedRow[]>(
      await prisma.messageThread.findMany({
        where: {
          id: {
            in: threadIds,
          },
          deletedAt: null,
        },
        include: {
          participants: {
            where: {
              leftAt: null,
            },
          },
          messages: {
            where: {
              deletedAt: null,
            },
            include: {
              receipts: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
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
        where: {
          userId: params.authUserId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.notificationPreference.findUnique({
        where: {
          userId: params.authUserId,
        },
      }),
      prisma.mutedSource.findMany({
        where: {
          userId: params.authUserId,
          unmutedAt: null,
        },
      }),
      prisma.quietHours.findUnique({
        where: {
          userId: params.authUserId,
        },
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
  async markNotificationRead(
    params: NotificationMutationParams,
  ): Promise<NotificationMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.markNotificationRead(params);
    }
    const prisma = getPrismaClientOrThrow();
    const notification = await prisma.notification.findUnique({
      where: {
        id: params.notificationId,
      },
    });
    if (!notification) {
      throw notFound('Notification not found', {
        notificationId: params.notificationId,
      });
    }
    if (notification.userId !== params.authUserId) {
      throw forbidden('Notification does not belong to authenticated user', {
        notificationId: params.notificationId,
      });
    }
    const updated = await prisma.notification.update({
      where: {
        id: params.notificationId,
      },
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
  async markAllNotificationsRead(
    params: CommunityMediaAccessParams,
  ): Promise<NotificationBulkMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.markAllNotificationsRead(params);
    }
    const prisma = getPrismaClientOrThrow();
    const now = new Date();
    await prisma.notification.updateMany({
      where: {
        userId: params.authUserId,
        dismissedAt: null,
        status: {
          not: 'DISMISSED',
        },
      },
      data: {
        status: 'READ',
        readAt: now,
      },
    });
    const notifications = normalizeAs<SeedRow[]>(
      await prisma.notification.findMany({
        where: {
          userId: params.authUserId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    );
    return {
      notifications,
      unreadCount: notificationUnreadCount(notifications),
      dataVersion: null,
    };
  }
  async dismissNotification(
    params: NotificationMutationParams,
  ): Promise<NotificationMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.dismissNotification(params);
    }
    const prisma = getPrismaClientOrThrow();
    const notification = await prisma.notification.findUnique({
      where: {
        id: params.notificationId,
      },
    });
    if (!notification) {
      throw notFound('Notification not found', {
        notificationId: params.notificationId,
      });
    }
    if (notification.userId !== params.authUserId) {
      throw forbidden('Notification does not belong to authenticated user', {
        notificationId: params.notificationId,
      });
    }
    const updated = await prisma.notification.update({
      where: {
        id: params.notificationId,
      },
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
  async dismissAllNotifications(
    params: CommunityMediaAccessParams,
  ): Promise<NotificationBulkMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.dismissAllNotifications(params);
    }
    const prisma = getPrismaClientOrThrow();
    const now = new Date();
    await prisma.notification.updateMany({
      where: {
        userId: params.authUserId,
        dismissedAt: null,
        status: {
          not: 'DISMISSED',
        },
      },
      data: {
        status: 'DISMISSED',
        dismissedAt: now,
      },
    });
    const notifications = normalizeAs<SeedRow[]>(
      await prisma.notification.findMany({
        where: {
          userId: params.authUserId,
        },
        orderBy: {
          createdAt: 'desc',
        },
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
      where: {
        userId: params.authUserId,
      },
    });
    const existingSettings = coerceMetadata(existing?.settingsJson);
    const typePreferences = normalizeTypePreferences(params.typePreferences);
    const quietHoursPromise = params.quietHours
      ? prisma.quietHours.upsert({
          where: {
            userId: params.authUserId,
          },
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
            ...(params.quietHours.enabled == null
              ? {}
              : {
                  enabled: params.quietHours.enabled,
                }),
            ...(params.quietHours.startTime == null
              ? {}
              : {
                  startTimeLocal: params.quietHours.startTime,
                }),
            ...(params.quietHours.endTime == null
              ? {}
              : {
                  endTimeLocal: params.quietHours.endTime,
                }),
            ...(params.quietHours.timezone == null
              ? {}
              : {
                  timeZone: params.quietHours.timezone,
                }),
          },
        })
      : prisma.quietHours.findUnique({
          where: {
            userId: params.authUserId,
          },
        });
    const existingCoachMutesPromise = params.mutedCoaches
      ? prisma.mutedSource.findMany({
          where: {
            userId: params.authUserId,
            sourceType: 'coach',
          },
        })
      : Promise.resolve(null);
    const [preferences, quietHours, existingCoachMutes] = await Promise.all([
      prisma.notificationPreference.upsert({
        where: {
          userId: params.authUserId,
        },
        create: {
          userId: params.authUserId,
          pushEnabled: params.channels?.push ?? true,
          emailEnabled: params.channels?.email ?? true,
          smsEnabled: params.channels?.sms ?? false,
          settingsJson: {
            ...existingSettings,
            ...(typePreferences
              ? {
                  typePreferences,
                }
              : {}),
          },
          createdAt: now,
          updatedAt: now,
        },
        update: {
          ...(params.channels?.push == null
            ? {}
            : {
                pushEnabled: params.channels.push,
              }),
          ...(params.channels?.email == null
            ? {}
            : {
                emailEnabled: params.channels.email,
              }),
          ...(params.channels?.sms == null
            ? {}
            : {
                smsEnabled: params.channels.sms,
              }),
          ...(typePreferences
            ? {
                settingsJson: {
                  ...existingSettings,
                  typePreferences,
                },
              }
            : {}),
        },
      }),
      quietHoursPromise,
      existingCoachMutesPromise,
    ]);
    if (params.mutedCoaches && existingCoachMutes) {
      const desired = new Map(
        params.mutedCoaches.map((coach) => [coach.coachId, coach.reason ?? null] as const),
      );
      const muteWrites = existingCoachMutes.map((source) => {
        if (!desired.has(source.sourceId)) {
          return prisma.mutedSource.update({
            where: {
              id: source.id,
            },
            data: {
              unmutedAt: source.unmutedAt ?? now,
            },
          });
        }
        const reason = desired.get(source.sourceId);
        desired.delete(source.sourceId);
        return prisma.mutedSource.update({
          where: {
            id: source.id,
          },
          data: {
            reason,
            unmutedAt: null,
          },
        });
      });
      muteWrites.push(
        ...Array.from(desired.entries()).map(([coachId, reason]) =>
          prisma.mutedSource.create({
            data: {
              id: newId('mut'),
              userId: params.authUserId,
              sourceType: 'coach',
              sourceId: coachId,
              reason,
              mutedAt: now,
              unmutedAt: null,
            },
          }),
        ),
      );
      await Promise.all(muteWrites);
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
    const attachments = await assertDbMediaAttachments(params.authUserId, params.attachments);
    const now = new Date();
    const response = await prisma.$transaction(async (tx): Promise<GroupMessageCreateResult> => {
      const [group, memberships, existingThread] = await Promise.all([
        tx.communityGroup.findFirst({
          where: {
            id: params.communityGroupId,
            deletedAt: null,
          },
        }),
        tx.communityGroupMembership.findMany({
          where: {
            communityGroupId: params.communityGroupId,
            active: true,
            deletedAt: null,
          },
        }),
        tx.messageThread.findFirst({
          where: {
            communityGroupId: params.communityGroupId,
            threadType: 'GROUP',
            deletedAt: null,
          },
        }),
      ]);
      if (!group) {
        throw notFound('Community group not found', {
          communityGroupId: params.communityGroupId,
        });
      }
      if (!memberships.some((row) => row.userId === params.authUserId)) {
        throw forbidden('Community group does not belong to authenticated user', {
          communityGroupId: params.communityGroupId,
        });
      }
      let thread = existingThread;
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
      const messageId = newId('msg');
      const [message, hydratedThread] = await Promise.all([
        tx.message.create({
          data: {
            id: messageId,
            messageThreadId: thread.id,
            senderUserId: params.authUserId,
            content: params.body,
            attachmentsJson: normalizeForJson(attachments) as never,
            createdAt: now,
            updatedAt: now,
            receipts: {
              createMany: {
                data: memberships.map((membership) => ({
                  id: newId('mrc'),
                  userId: membership.userId,
                  deliveredAt: now,
                  readAt: membership.userId === params.authUserId ? now : null,
                  createdAt: now,
                  updatedAt: now,
                })),
                skipDuplicates: true,
              },
            },
          },
        }),
        Promise.all(
          memberships.map((membership) =>
            tx.messageParticipant.upsert({
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
                lastReadAt: membership.userId === params.authUserId ? now : null,
                muted: false,
                joinedAt: now,
                leftAt: null,
              },
              update: {
                role: membership.role,
                leftAt: null,
                ...(membership.userId === params.authUserId
                  ? {
                      lastReadAt: now,
                    }
                  : {}),
              },
            }),
          ),
        ),
        tx.messageThread.update({
          where: {
            id: thread.id,
          },
          data: {
            lastMessageAt: now,
            updatedByUserId: params.authUserId,
            version: {
              increment: 1,
            },
          },
        }),
        tx.communityGroup.update({
          where: {
            id: group.id,
          },
          data: {
            updatedByUserId: params.authUserId,
            version: {
              increment: 1,
            },
          },
        }),
      ]).then((transactionResults) =>
        tx.messageThread
          .findUnique({
            where: {
              id: thread.id,
            },
            include: {
              participants: {
                where: {
                  leftAt: null,
                },
              },
              messages: {
                where: {
                  deletedAt: null,
                },
                include: {
                  receipts: true,
                },
                orderBy: {
                  createdAt: 'asc',
                },
              },
            },
          })
          .then((threadResult) => [transactionResults[0], threadResult] as const),
      );
      if (!hydratedThread) {
        throw notFound('Message thread not found', {
          threadId: thread.id,
        });
      }
      const hydratedMessage = hydratedThread.messages.find((row) => row.id === message.id);
      if (!hydratedMessage) {
        throw notFound('Message not found', {
          messageId: message.id,
        });
      }
      const messageResponse: GroupMessageCreateResult = {
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
            responseBodyJson: messageResponse as never,
            expiresAt: new Date(now.getTime() + IDEMPOTENCY_TTL_MS),
          },
        });
      }
      return messageResponse;
    });
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
    const attachments = await assertDbMediaAttachments(params.authUserId, params.attachments);
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
    const response = await prisma.$transaction(async (tx): Promise<MessageMutationResult> => {
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
      const messageId = newId('msg');
      await Promise.all([
        tx.message.create({
          data: {
            id: messageId,
            messageThreadId: params.messageThreadId,
            senderUserId: params.authUserId,
            content: body,
            attachmentsJson: normalizeForJson(attachments) as never,
            createdAt: now,
            updatedAt: now,
            receipts: {
              createMany: {
                data: participants.map((participant) => ({
                  id: newId('mrc'),
                  userId: participant.userId,
                  deliveredAt: now,
                  readAt: participant.userId === params.authUserId ? now : null,
                  createdAt: now,
                  updatedAt: now,
                })),
                skipDuplicates: true,
              },
            },
          },
        }),
        tx.messageParticipant.updateMany({
          where: {
            messageThreadId: params.messageThreadId,
            userId: params.authUserId,
            leftAt: null,
          },
          data: {
            lastReadAt: now,
          },
        }),
        tx.messageThread.update({
          where: {
            id: params.messageThreadId,
          },
          data: {
            lastMessageAt: now,
            updatedByUserId: params.authUserId,
            version: {
              increment: 1,
            },
          },
        }),
      ]);
      const hydratedThread = await tx.messageThread.findUnique({
        where: {
          id: params.messageThreadId,
        },
        include: {
          participants: {
            where: {
              leftAt: null,
            },
          },
          messages: {
            where: {
              deletedAt: null,
            },
            include: {
              receipts: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
      if (!hydratedThread) {
        throw notFound('Message thread not found', {
          threadId: params.messageThreadId,
        });
      }
      const hydratedMessage = hydratedThread.messages.find((row) => row.id === messageId);
      if (!hydratedMessage) {
        throw notFound('Message not found', {
          messageId,
        });
      }
      const messageResponse: MessageMutationResult = {
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
            responseBodyJson: messageResponse as never,
            expiresAt: new Date(now.getTime() + IDEMPOTENCY_TTL_MS),
          },
        });
      }
      return messageResponse;
    });
    return response;
  }
  async deleteMessage(params: MessageDeleteParams): Promise<MessageMutationResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.deleteMessage(params);
    }
    const prisma = getPrismaClientOrThrow();
    const message = await prisma.message.findUnique({
      where: {
        id: params.messageId,
      },
    });
    if (!message) {
      throw notFound('Message not found', {
        messageId: params.messageId,
      });
    }
    if (message.deletedAt) {
      throw conflict('Message is already deleted', {
        messageId: params.messageId,
      });
    }
    if (!params.isPrivilegedAdmin) {
      const participant = await prisma.messageParticipant.findFirst({
        where: {
          messageThreadId: message.messageThreadId,
          userId: params.authUserId,
          leftAt: null,
        },
        select: {
          id: true,
        },
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
    const deletedMessage = await prisma.$transaction(async (tx): Promise<SeedRow> => {
      const [updated, latestMessage] = await Promise.all([
        tx.message.update({
          where: {
            id: params.messageId,
          },
          data: {
            content: '[deleted]',
            deletedAt: now,
            updatedAt: now,
          },
          include: {
            receipts: true,
          },
        }),
        tx.message.findFirst({
          where: {
            messageThreadId: message.messageThreadId,
            id: {
              not: params.messageId,
            },
            deletedAt: null,
          },
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            createdAt: true,
          },
        }),
      ]);
      await tx.messageThread.update({
        where: {
          id: message.messageThreadId,
        },
        data: {
          lastMessageAt: latestMessage?.createdAt ?? null,
          updatedByUserId: params.authUserId,
          version: {
            increment: 1,
          },
        },
      });
      return normalizeAs<SeedRow>(updated);
    });
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
      select: {
        id: true,
      },
    });
    if (!thread) {
      return {
        thread: null,
        dataVersion: null,
      };
    }
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const messages = await tx.message.findMany({
        where: {
          messageThreadId: thread.id,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });
      await Promise.all([
        Promise.all(
          messages.map((message) =>
            tx.messageReceipt.upsert({
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
            }),
          ),
        ),
        tx.messageParticipant.updateMany({
          where: {
            messageThreadId: thread.id,
            userId: params.authUserId,
            leftAt: null,
          },
          data: {
            lastReadAt: now,
          },
        }),
      ]);
    });
    return {
      thread: await this.getHydratedThread(thread.id),
      dataVersion: null,
    };
  }
  async markThreadMessagesRead(params: ThreadMessageReadParams): Promise<GroupMessageReadResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.markThreadMessagesRead(params);
    }
    await this.assertCanWriteThreadMessages(params.messageThreadId, params.authUserId);
    const prisma = getPrismaClientOrThrow();
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const messages = await tx.message.findMany({
        where: {
          messageThreadId: params.messageThreadId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });
      await Promise.all([
        Promise.all(
          messages.map((message) =>
            tx.messageReceipt.upsert({
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
            }),
          ),
        ),
        tx.messageParticipant.updateMany({
          where: {
            messageThreadId: params.messageThreadId,
            userId: params.authUserId,
            leftAt: null,
          },
          data: {
            lastReadAt: now,
          },
        }),
      ]);
    });
    return {
      thread: await this.getHydratedThread(params.messageThreadId),
      dataVersion: null,
    };
  }
}
const seedRepository = new StoreCommunityMediaRepository(() => getMarketplaceSeedStore());
const prismaRepository = new PrismaCommunityMediaRepository();
export function resolveCommunityMediaRepository(): CommunityMediaRepository {
  return getApiDataBackend() === 'db' ? prismaRepository : seedRepository;
}
