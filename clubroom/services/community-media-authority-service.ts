import { api } from "@/constants/config";
import type {
  ChatMessage,
  ChatThreadSummary,
  EnhancedNotificationPreferences,
  GroupMemberRole,
  GroupMessage,
  GroupType,
  ParentGroup,
} from "@/constants/types";
import { authService } from "@/services/auth-service";
import { apiFetch } from "@/services/api-client";
import { formatServiceTypeLabel } from "@/utils/booking-display";
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
} from "@/services/api-auth-context";
import { userService } from "@/services/user-service";
import {
  notificationAuthorityService,
  type AuthorityNotificationItem,
} from "@/services/notification/notification-authority-service";
import { generateId } from "@/utils/generate-id";
import { createLogger } from "@/utils/logger";
import {
  err,
  notFound,
  ok,
  serviceError,
  type Result,
  type ServiceError,
} from "@/types/result";
const logger = createLogger("CommunityMediaAuthorityService");
const USE_MOCK = api.useMock;
interface ApiCommunityGroupMembership {
  userId?: string;
  role?: string;
  joinedAt?: string;
  createdAt?: string;
  active?: boolean;
  deletedAt?: string | null;
}
interface ApiCommunityGroup {
  id: string;
  groupType?: string | null;
  type?: string | null;
  clubId?: string | null;
  squadId?: string | null;
  sessionId?: string | null;
  ownerUserId?: string;
  name?: string | null;
  description?: string | null;
  visibility?: string | null;
  createdByUserId?: string;
  createdAt?: string;
  updatedAt?: string;
  memberships?: ApiCommunityGroupMembership[];
}
interface ApiCommunityGroupListResponse {
  groups: ApiCommunityGroup[];
}
interface ApiCommunityGroupCreateResponse {
  group: ApiCommunityGroup;
}
interface ApiCommunityGroupInvite {
  id: string;
  groupId?: string;
  groupName?: string;
  inviterId?: string;
  inviterName?: string;
  inviteeId?: string;
  inviteeName?: string;
  status?: string;
  createdAt?: string;
  respondedAt?: string | null;
}
interface ApiCommunityGroupInviteListResponse {
  invites: ApiCommunityGroupInvite[];
}
interface ApiCommunityGroupInviteMutationResponse {
  invite: ApiCommunityGroupInvite;
  group?: ApiCommunityGroup;
}
interface ApiCommunityGroupJoinRequest {
  id: string;
  groupId?: string;
  groupName?: string;
  requesterId?: string;
  requesterName?: string;
  requestedRole?: string;
  isCoach?: boolean;
  status?: string;
  createdAt?: string;
  respondedAt?: string | null;
}
interface ApiCommunityGroupJoinRequestListResponse {
  requests: ApiCommunityGroupJoinRequest[];
}
interface ApiCommunityGroupJoinRequestMutationResponse {
  request: ApiCommunityGroupJoinRequest;
  group?: ApiCommunityGroup;
}
interface ApiMessageReceipt {
  userId?: string;
  deliveredAt?: string | null;
  readAt?: string | null;
}
interface ApiMessage {
  id: string;
  messageThreadId?: string;
  senderUserId?: string | null;
  content?: string | null;
  attachmentsJson?: unknown;
  createdAt?: string;
  receipts?: ApiMessageReceipt[];
}
interface ApiMessageParticipant {
  userId?: string;
}
interface ApiMessageThread {
  id: string;
  threadType?: string | null;
  title?: string | null;
  bookingId?: string | null;
  clubId?: string | null;
  communityGroupId?: string | null;
  groupSessionId?: string | null;
  createdAt?: string;
  lastMessageAt?: string | null;
  participants?: ApiMessageParticipant[];
  messages?: ApiMessage[];
}
interface ApiMessageThreadListResponse {
  threads: ApiMessageThread[];
}
interface ApiGroupMessageWriteResponse {
  message: ApiMessage;
  thread?: ApiMessageThread | null;
}
interface ApiThreadMessageWriteResponse {
  message: ApiMessage;
  thread?: ApiMessageThread | null;
}
interface ApiGroupMessageReadResponse {
  thread?: ApiMessageThread | null;
}
interface AuthorityContext {
  currentUserId: string;
  currentUserAccountType?: string;
  headers: Record<string, string>;
}
interface ThreadBookingContext {
  id: string;
  service?: string;
  serviceType?: string;
  location?: string;
  locationLabel?: string;
  scheduledAt?: string;
  coachName?: string;
  bookedByName?: string;
  athleteNames?: string[];
}
export interface AuthorityGroupInvite {
  id: string;
  groupId: string;
  groupName: string;
  inviterId: string;
  inviterName: string;
  inviteeId: string;
  inviteeName: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  createdAt: string;
  respondedAt?: string;
}
export interface AuthorityGroupJoinRequest {
  id: string;
  groupId: string;
  groupName: string;
  requesterId: string;
  requesterName: string;
  requestedRole: GroupMemberRole;
  isCoach: boolean;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  createdAt: string;
  respondedAt?: string;
}
export type { AuthorityNotificationItem } from "@/services/notification/notification-authority-service";
function normalizeGroupRole(role: string | null | undefined): GroupMemberRole {
  switch ((role ?? "").toUpperCase()) {
    case "OWNER":
      return "OWNER";
    case "ADMIN":
      return "ADMIN";
    case "MODERATOR":
      return "MODERATOR";
    default:
      return "MEMBER";
  }
}
function normalizeGroupType(group: ApiCommunityGroup): GroupType {
  const value = (group.groupType ?? group.type ?? "").toUpperCase();
  if (value === "SQUAD" || group.squadId) {
    return "SQUAD";
  }
  if (value === "SESSION" || group.sessionId) {
    return "SESSION";
  }
  if (value === "CLUB") {
    return "CLUB";
  }
  if (group.clubId) {
    return "CLUB";
  }
  return "GENERAL";
}
function isCoachAccountType(accountType: string | undefined): boolean {
  return accountType === "COACH" || accountType === "ADMIN";
}
function humanizeServiceType(serviceType: string | undefined): string {
  return serviceType ? formatServiceTypeLabel(serviceType) : "Direct message";
}
function coerceIso(value: string | null | undefined, fallback: string): string {
  return value && value.trim().length > 0 ? value : fallback;
}
function normalizeRecordStringValues(
  value: Record<string, unknown> | null | undefined,
): Record<string, string> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const entries = Object.entries(value)
    .filter(([, entryValue]) => entryValue != null)
    .map(([key, entryValue]) => [key, String(entryValue)] as const);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}
function mergeById<
  T extends {
    id: string;
  },
>(authoritative: T[], overlay: T[]): T[] {
  const overlayById = new Map(overlay.map((item) => [item.id, item] as const));
  const merged = authoritative.map((item) => {
    const override = overlayById.get(item.id);
    return override
      ? {
          ...item,
          ...override,
        }
      : item;
  });
  const authoritativeIds = new Set(authoritative.map((item) => item.id));
  return [
    ...merged,
    ...overlay.filter((item) => !authoritativeIds.has(item.id)),
  ];
}
function formatTimeLabel(dateString: string | undefined): string | undefined {
  if (!dateString) {
    return undefined;
  }
  const timestamp = new Date(dateString).getTime();
  if (Number.isNaN(timestamp)) {
    return undefined;
  }
  const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (diffMinutes < 1) {
    return "Just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) {
    return "Yesterday";
  }
  return `${diffDays} days ago`;
}
function mapCommunityGroup(group: ApiCommunityGroup): ParentGroup {
  const memberships = (group.memberships ?? []).filter(
    (membership) =>
      membership.active !== false &&
      membership.deletedAt == null &&
      Boolean(membership.userId),
  );
  return {
    id: group.id,
    name: group.name?.trim() || "Community group",
    description: group.description?.trim() || undefined,
    type: normalizeGroupType(group),
    members: memberships.map((membership) => ({
      parentId: membership.userId as string,
      role: normalizeGroupRole(membership.role),
      joinedAt: coerceIso(
        membership.joinedAt ?? membership.createdAt,
        group.createdAt ?? new Date().toISOString(),
      ),
    })),
    createdById: group.createdByUserId || group.ownerUserId || "",
    createdAt: coerceIso(group.createdAt, new Date().toISOString()),
    updatedAt: coerceIso(
      group.updatedAt,
      group.createdAt ?? new Date().toISOString(),
    ),
    lastMessageAt: undefined,
    lastMessagePreview: undefined,
    unreadCount: 0,
    clubId: group.clubId ?? undefined,
    squadId: group.squadId ?? undefined,
    sessionId: group.sessionId ?? undefined,
    isPublic: (group.visibility ?? "").toUpperCase() === "PUBLIC",
  };
}
function normalizeInviteStatus(value: string | undefined): AuthorityGroupInvite["status"] {
  const normalized = (value ?? "PENDING").toUpperCase();
  if (normalized === "ACCEPTED" || normalized === "DECLINED") {
    return normalized;
  }
  return "PENDING";
}
function normalizeJoinRequestStatus(
  value: string | undefined,
): AuthorityGroupJoinRequest["status"] {
  const normalized = (value ?? "PENDING").toUpperCase();
  if (normalized === "ACCEPTED" || normalized === "DECLINED") {
    return normalized;
  }
  return "PENDING";
}
function mapCommunityGroupInvite(invite: ApiCommunityGroupInvite): AuthorityGroupInvite {
  return {
    id: invite.id,
    groupId: invite.groupId ?? "",
    groupName: invite.groupName?.trim() || "Community group",
    inviterId: invite.inviterId ?? "",
    inviterName: invite.inviterName?.trim() || "Member",
    inviteeId: invite.inviteeId ?? "",
    inviteeName: invite.inviteeName?.trim() || "Member",
    status: normalizeInviteStatus(invite.status),
    createdAt: coerceIso(invite.createdAt, new Date().toISOString()),
    respondedAt: invite.respondedAt
      ? coerceIso(invite.respondedAt, invite.respondedAt)
      : undefined,
  };
}
function mapCommunityGroupJoinRequest(
  request: ApiCommunityGroupJoinRequest,
): AuthorityGroupJoinRequest {
  return {
    id: request.id,
    groupId: request.groupId ?? "",
    groupName: request.groupName?.trim() || "Community group",
    requesterId: request.requesterId ?? "",
    requesterName: request.requesterName?.trim() || "Member",
    requestedRole: normalizeGroupRole(request.requestedRole),
    isCoach: request.isCoach ?? false,
    status: normalizeJoinRequestStatus(request.status),
    createdAt: coerceIso(request.createdAt, new Date().toISOString()),
    respondedAt: request.respondedAt
      ? coerceIso(request.respondedAt, request.respondedAt)
      : undefined,
  };
}
function getCurrentUserReceipt(
  message: ApiMessage,
  currentUserId: string,
): ApiMessageReceipt | undefined {
  return message.receipts?.find((receipt) => receipt.userId === currentUserId);
}
function getRemoteRecipientReceipt(
  message: ApiMessage,
  currentUserId: string,
): ApiMessageReceipt | undefined {
  return message.receipts?.find(
    (receipt) => receipt.userId && receipt.userId !== currentUserId,
  );
}
function determineChatSender(
  senderUserId: string | undefined,
  currentUserId: string,
  currentUserAccountType?: string,
): "parent" | "coach" {
  const currentUserIsCoach = isCoachAccountType(currentUserAccountType);
  if (senderUserId === currentUserId) {
    return currentUserIsCoach ? "coach" : "parent";
  }
  return currentUserIsCoach ? "parent" : "coach";
}
function mapMessageAttachments(value: unknown): NonNullable<ChatMessage["attachments"]> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry): NonNullable<ChatMessage["attachments"]> => {
    if (!entry || typeof entry !== "object") {
      return [];
    }
    const row = entry as Record<string, unknown>;
    const id = typeof row.mediaObjectId === "string"
      ? row.mediaObjectId
      : typeof row.id === "string"
        ? row.id
        : undefined;
    const type = row.type === "photo" || row.type === "video" || row.type === "pdf"
      ? row.type
      : undefined;
    if (!id || !type) {
      return [];
    }
    return [
      {
        id,
        type,
        title: typeof row.title === "string" && row.title.trim() ? row.title : "Attachment",
        ...(typeof row.subtitle === "string" && row.subtitle.trim()
          ? { subtitle: row.subtitle }
          : {}),
        ...(typeof row.thumbnailUrl === "string" && row.thumbnailUrl.trim()
          ? { thumbnailUrl: row.thumbnailUrl }
          : {}),
      },
    ];
  });
}
function toAttachmentProofs(
  attachments?: NonNullable<ChatMessage["attachments"]>,
): Array<{ mediaObjectId: string; title?: string }> | undefined {
  const proofs = (attachments ?? []).flatMap((attachment) => {
    const mediaObjectId = attachment.id?.trim();
    if (!mediaObjectId) {
      return [];
    }
    return [
      {
        mediaObjectId,
        ...(attachment.title?.trim() ? { title: attachment.title.trim() } : {}),
      },
    ];
  });
  return proofs.length > 0 ? proofs : undefined;
}
function mapChatMessages(
  messages: ApiMessage[],
  currentUserId: string,
  currentUserAccountType?: string,
): ChatMessage[] {
  return messages
    .map((message) => {
      const senderUserId = message.senderUserId ?? undefined;
      const isOutgoing = senderUserId === currentUserId;
      const relevantReceipt = isOutgoing
        ? getRemoteRecipientReceipt(message, currentUserId)
        : getCurrentUserReceipt(message, currentUserId);
      const status: ChatMessage["status"] = relevantReceipt?.readAt
        ? "seen"
        : relevantReceipt?.deliveredAt || relevantReceipt
          ? "delivered"
          : "sent";
      return {
        id: message.id,
        threadId: message.messageThreadId || "",
        sender: determineChatSender(
          senderUserId,
          currentUserId,
          currentUserAccountType,
        ),
        body: message.content?.trim() || "",
        createdAt: coerceIso(message.createdAt, new Date().toISOString()),
        status,
        attachments: mapMessageAttachments(message.attachmentsJson),
        readReceipts: (message.receipts ?? []).flatMap((receipt) =>
          Boolean(receipt.userId && receipt.readAt)
            ? [
                {
                  recipientId: receipt.userId as string,
                  readAt: receipt.readAt as string,
                },
              ]
            : [],
        ),
      };
    })
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() -
        new Date(right.createdAt).getTime(),
    );
}
function mapGroupMessages(messages: ApiMessage[]): GroupMessage[] {
  return messages
    .map((message) => {
      const status: GroupMessage["status"] = message.receipts?.some(
        (receipt) => receipt.readAt,
      )
        ? "seen"
        : "delivered";
      return {
        id: message.id,
        groupId: message.messageThreadId || "",
        senderId: message.senderUserId || "",
        body: message.content?.trim() || "",
        createdAt: coerceIso(message.createdAt, new Date().toISOString()),
        status,
        readBy: (message.receipts ?? []).flatMap((receipt) =>
          Boolean(receipt.userId) && Boolean(receipt.readAt)
            ? [receipt.userId as string]
            : [],
        ),
        attachments: mapMessageAttachments(message.attachmentsJson),
      };
    })
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() -
        new Date(right.createdAt).getTime(),
    );
}
function mapGroupMessage(message: ApiMessage, groupId: string): GroupMessage {
  return {
    id: message.id,
    groupId,
    senderId: message.senderUserId || "",
    body: message.content?.trim() || "",
    createdAt: coerceIso(message.createdAt, new Date().toISOString()),
    status: message.receipts?.some((receipt) => receipt.readAt)
      ? "seen"
      : "delivered",
    readBy: (message.receipts ?? []).flatMap((receipt) =>
      Boolean(receipt.userId) && Boolean(receipt.readAt)
        ? [receipt.userId as string]
        : [],
    ),
    attachments: mapMessageAttachments(message.attachmentsJson),
  };
}
async function loadBookingsById(): Promise<Map<string, ThreadBookingContext>> {
  const { bookingAuthorityService } = await import("@/services/booking");
  const result = await bookingAuthorityService.listBookings();
  if (!result.success) {
    logger.warn("Skipping optional booking labels for message threads", {
      error: result.error.message,
    });
    return new Map();
  }
  return new Map(
    result.data.map((booking) => [
      booking.id,
      {
        id: booking.id,
        serviceType: booking.serviceType,
        service: humanizeServiceType(booking.serviceType),
        location: booking.location,
        scheduledAt: booking.scheduledAt,
      },
    ] as const),
  );
}
async function loadUserNames(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) {
    return new Map();
  }
  const usersResult = await userService.getUsersByIds(userIds);
  if (!usersResult.success) {
    logger.warn("Falling back to ids for community labels", {
      error: usersResult.error,
    });
    return new Map();
  }
  return new Map(
    usersResult.data.map((user) => [user.id, user.name?.trim() || user.id]),
  );
}
function resolveGroupLastMessageSender(
  thread: ApiMessageThread,
  currentUserId: string,
  userNamesById: Map<string, string>,
): string | undefined {
  const lastMessage = thread.messages?.[thread.messages.length - 1];
  if (!lastMessage?.senderUserId) {
    return undefined;
  }
  if (lastMessage.senderUserId === currentUserId) {
    return "You";
  }
  return userNamesById.get(lastMessage.senderUserId) || "Member";
}
function buildThreadSummary(params: {
  thread: ApiMessageThread;
  currentUserId: string;
  currentUserAccountType?: string;
  bookingsById: Map<string, ThreadBookingContext>;
  groupsById: Map<string, ParentGroup>;
  userNamesById: Map<string, string>;
}): ChatThreadSummary {
  const {
    thread,
    currentUserId,
    currentUserAccountType,
    bookingsById,
    groupsById,
    userNamesById,
  } = params;
  const isGroup = (thread.threadType ?? "").toUpperCase() === "GROUP";
  const messages = mapChatMessages(
    thread.messages ?? [],
    currentUserId,
    currentUserAccountType,
  );
  const lastMessage = messages[messages.length - 1];
  const participants = thread.participants ?? [];
  if (isGroup) {
    const group = thread.communityGroupId
      ? groupsById.get(thread.communityGroupId)
      : undefined;
    const memberCount = participants.length || group?.members.length || 0;
    return {
      id: thread.id,
      kind: "group",
      bookingId: thread.bookingId ?? "",
      communityGroupId: thread.communityGroupId ?? undefined,
      groupSessionId: thread.groupSessionId ?? undefined,
      groupType: group?.type === "CLUB" ? "club" : group?.type === "SQUAD" ? "squad" : "class",
      serviceName: group?.name || "Community group",
      location: "",
      scheduledFor: coerceIso(
        thread.lastMessageAt,
        thread.createdAt ?? new Date().toISOString(),
      ),
      unreadCount: messages.filter(
        (message) =>
          (thread.messages ?? []).find((row) => row.id === message.id)
            ?.senderUserId !== currentUserId && message.status !== "seen",
      ).length,
      memberCount,
      title: thread.title?.trim() || group?.name || "Community group",
      subtitle: group?.description || `${memberCount} members`,
      scopeLabel: group?.clubId ? "Club" : undefined,
      postingAsOptions: [],
      safetyCopy: "Report inappropriate messages via the menu",
      lastMessageSnippet: lastMessage?.body,
      lastMessageSender: resolveGroupLastMessageSender(
        thread,
        currentUserId,
        userNamesById,
      ),
    };
  }
  const booking = thread.bookingId
    ? bookingsById.get(thread.bookingId)
    : undefined;
  const counterpartyUserId = participants.find(
    (participant) => participant.userId && participant.userId !== currentUserId,
  )?.userId;
  const currentUserIsCoach = isCoachAccountType(currentUserAccountType);
  const title = currentUserIsCoach
    ? booking?.bookedByName ||
      (counterpartyUserId
        ? userNamesById.get(counterpartyUserId)
        : undefined) ||
      "Parent"
    : booking?.coachName ||
      (counterpartyUserId
        ? userNamesById.get(counterpartyUserId)
        : undefined) ||
      "Coach";
  return {
    id: thread.id,
    kind: "direct",
    counterpartyUserId,
    communityGroupId: thread.communityGroupId ?? undefined,
    groupSessionId: thread.groupSessionId ?? undefined,
    bookingId: thread.bookingId ?? "",
    serviceName: booking?.service || humanizeServiceType(booking?.serviceType),
    location: booking?.location || booking?.locationLabel || "",
    scheduledFor:
      booking?.scheduledAt ||
      coerceIso(
        thread.lastMessageAt,
        thread.createdAt ?? new Date().toISOString(),
      ),
    unreadCount: messages.filter(
      (message) =>
        (thread.messages ?? []).find((row) => row.id === message.id)
          ?.senderUserId !== currentUserId && message.status !== "seen",
    ).length,
    title,
    subtitle:
      booking?.athleteNames?.join(", ") || booking?.service || undefined,
    safetyCopy: "Report inappropriate messages via the menu",
    lastMessageSnippet: lastMessage?.body,
    lastMessageSender: lastMessage
      ? lastMessage.sender ===
        determineChatSender(
          currentUserId,
          currentUserId,
          currentUserAccountType,
        )
        ? "You"
        : title
      : undefined,
  };
}
async function resolveContext(
  message: string,
): Promise<Result<AuthorityContext, ServiceError>> {
  const currentUserResult = await resolveSignedInApiUser(message);
  if (!currentUserResult.success) {
    return currentUserResult;
  }
  const currentUser = currentUserResult.data;
  return ok({
    currentUserId: currentUser.id,
    currentUserAccountType: currentUser.accountType,
    headers: buildApiAuthHeaders({
      actingRole: deriveApiActingRole(currentUser, "parent"),
    }),
  });
}
async function resolveCurrentUserSender(): Promise<"parent" | "coach"> {
  const currentUser = await authService.getCurrentUser();
  return isCoachAccountType(currentUser?.accountType) ? "coach" : "parent";
}
class CommunityMediaAuthorityService {
  private async fetchGroups(): Promise<Result<ParentGroup[], ServiceError>> {
    if (USE_MOCK) {
      return ok([]);
    }
    const contextResult = await resolveContext(
      "Sign in to view community groups.",
    );
    if (!contextResult.success) {
      return contextResult;
    }
    const result = await apiFetch<ApiCommunityGroupListResponse>(
      "/v1/community-groups",
      {
        method: "GET",
        headers: contextResult.data.headers,
      },
    );
    if (!result.success) {
      logger.warn("Failed to load community groups via API", {
        error: result.error,
      });
      return err(result.error);
    }
    return ok(result.data.groups.map(mapCommunityGroup));
  }
  private async fetchThreads(message: string): Promise<
    Result<
      {
        context: AuthorityContext;
        threads: ApiMessageThread[];
      },
      ServiceError
    >
  > {
    if (USE_MOCK) {
      return ok({
        context: {
          currentUserId: "",
          currentUserAccountType: undefined,
          headers: {},
        },
        threads: [],
      });
    }
    const contextResult = await resolveContext(message);
    if (!contextResult.success) {
      return contextResult;
    }
    const result = await apiFetch<ApiMessageThreadListResponse>(
      "/v1/message-threads",
      {
        method: "GET",
        headers: contextResult.data.headers,
      },
    );
    if (!result.success) {
      logger.warn("Failed to load message threads via API", {
        error: result.error,
      });
      return err(result.error);
    }
    return ok({
      context: contextResult.data,
      threads: result.data.threads,
    });
  }
  async listGroups(): Promise<Result<ParentGroup[], ServiceError>> {
    return this.fetchGroups();
  }
  async createGroup(params: {
    name: string;
    description?: string;
    type: GroupType;
    memberIds?: string[];
    isPublic?: boolean;
    clubId?: string;
    squadId?: string;
  }): Promise<Result<ParentGroup, ServiceError>> {
    if (USE_MOCK) {
      return err(serviceError("UNSUPPORTED", "Community group API is disabled in mock mode."));
    }
    if (params.type === "SESSION") {
      return err(
        serviceError(
          "UNSUPPORTED",
          "API mode supports GENERAL, CLUB, and SQUAD community group creation. Session groups need a dedicated /v1 contract.",
          { missingAuthority: "community_group_session_link" },
        ),
      );
    }
    const contextResult = await resolveContext(
      "Sign in to create community groups.",
    );
    if (!contextResult.success) {
      return contextResult;
    }
    const result = await apiFetch<ApiCommunityGroupCreateResponse>(
      "/v1/community-groups",
      {
        method: "POST",
        headers: contextResult.data.headers,
        body: JSON.stringify({
          name: params.name,
          description: params.description,
          type: params.type,
          clubId: params.clubId,
          squadId: params.squadId,
          isPublic: params.isPublic,
          memberIds: params.memberIds ?? [],
          idempotencyKey: generateId("community_group_create"),
        }),
      },
    );
    if (!result.success) {
      logger.error("Failed to create community group via API", {
        error: result.error,
      });
      return err(result.error);
    }
    return ok(mapCommunityGroup(result.data.group));
  }
  async joinGroup(groupId: string): Promise<Result<ParentGroup, ServiceError>> {
    if (USE_MOCK) {
      return err(serviceError("UNSUPPORTED", "Community group API is disabled in mock mode."));
    }
    const contextResult = await resolveContext(
      "Sign in to join community groups.",
    );
    if (!contextResult.success) {
      return contextResult;
    }
    const result = await apiFetch<ApiCommunityGroupCreateResponse>(
      `/v1/community-groups/${encodeURIComponent(groupId)}/join`,
      {
        method: "POST",
        headers: contextResult.data.headers,
      },
    );
    if (!result.success) {
      logger.error("Failed to join community group via API", {
        groupId,
        error: result.error,
      });
      return err(result.error);
    }
    return ok(mapCommunityGroup(result.data.group));
  }
  async leaveGroup(groupId: string): Promise<Result<ParentGroup, ServiceError>> {
    if (USE_MOCK) {
      return err(serviceError("UNSUPPORTED", "Community group API is disabled in mock mode."));
    }
    const contextResult = await resolveContext(
      "Sign in to leave community groups.",
    );
    if (!contextResult.success) {
      return contextResult;
    }
    const result = await apiFetch<ApiCommunityGroupCreateResponse>(
      `/v1/community-groups/${encodeURIComponent(groupId)}/leave`,
      {
        method: "POST",
        headers: contextResult.data.headers,
      },
    );
    if (!result.success) {
      logger.error("Failed to leave community group via API", {
        groupId,
        error: result.error,
      });
      return err(result.error);
    }
    return ok(mapCommunityGroup(result.data.group));
  }
  async addMember(params: {
    groupId: string;
    memberUserId: string;
    role?: GroupMemberRole;
  }): Promise<Result<ParentGroup, ServiceError>> {
    if (USE_MOCK) {
      return err(serviceError("UNSUPPORTED", "Community group API is disabled in mock mode."));
    }
    if (params.role === "OWNER") {
      return err(
        serviceError(
          "VALIDATION",
          "Use owner transfer to assign community group ownership.",
        ),
      );
    }
    const contextResult = await resolveContext(
      "Sign in to add community group members.",
    );
    if (!contextResult.success) {
      return contextResult;
    }
    const result = await apiFetch<ApiCommunityGroupCreateResponse>(
      `/v1/community-groups/${encodeURIComponent(params.groupId)}/members`,
      {
        method: "POST",
        headers: contextResult.data.headers,
        body: JSON.stringify({
          memberUserId: params.memberUserId,
          role: params.role ?? "MEMBER",
        }),
      },
    );
    if (!result.success) {
      logger.error("Failed to add community group member via API", {
        groupId: params.groupId,
        memberUserId: params.memberUserId,
        error: result.error,
      });
      return err(result.error);
    }
    return ok(mapCommunityGroup(result.data.group));
  }
  async changeMemberRole(params: {
    groupId: string;
    memberUserId: string;
    role: GroupMemberRole;
  }): Promise<Result<ParentGroup, ServiceError>> {
    if (USE_MOCK) {
      return err(serviceError("UNSUPPORTED", "Community group API is disabled in mock mode."));
    }
    if (params.role === "OWNER") {
      return this.transferGroupOwner(params.groupId, params.memberUserId);
    }
    const contextResult = await resolveContext(
      "Sign in to manage community group members.",
    );
    if (!contextResult.success) {
      return contextResult;
    }
    const result = await apiFetch<ApiCommunityGroupCreateResponse>(
      `/v1/community-groups/${encodeURIComponent(params.groupId)}/members/${encodeURIComponent(
        params.memberUserId,
      )}/role`,
      {
        method: "PATCH",
        headers: contextResult.data.headers,
        body: JSON.stringify({
          role: params.role,
        }),
      },
    );
    if (!result.success) {
      logger.error("Failed to change community group member role via API", {
        groupId: params.groupId,
        memberUserId: params.memberUserId,
        error: result.error,
      });
      return err(result.error);
    }
    return ok(mapCommunityGroup(result.data.group));
  }
  private async transferGroupOwner(
    groupId: string,
    memberUserId: string,
  ): Promise<Result<ParentGroup, ServiceError>> {
    const contextResult = await resolveContext(
      "Sign in to transfer community group ownership.",
    );
    if (!contextResult.success) {
      return contextResult;
    }
    const result = await apiFetch<ApiCommunityGroupCreateResponse>(
      `/v1/community-groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(
        memberUserId,
      )}/transfer-ownership`,
      {
        method: "POST",
        headers: contextResult.data.headers,
      },
    );
    if (!result.success) {
      logger.error("Failed to transfer community group owner via API", {
        groupId,
        memberUserId,
        error: result.error,
      });
      return err(result.error);
    }
    return ok(mapCommunityGroup(result.data.group));
  }
  async removeMember(
    groupId: string,
    memberUserId: string,
  ): Promise<Result<ParentGroup, ServiceError>> {
    if (USE_MOCK) {
      return err(serviceError("UNSUPPORTED", "Community group API is disabled in mock mode."));
    }
    const contextResult = await resolveContext(
      "Sign in to manage community group members.",
    );
    if (!contextResult.success) {
      return contextResult;
    }
    const result = await apiFetch<ApiCommunityGroupCreateResponse>(
      `/v1/community-groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(
        memberUserId,
      )}/remove`,
      {
        method: "POST",
        headers: contextResult.data.headers,
      },
    );
    if (!result.success) {
      logger.error("Failed to remove community group member via API", {
        groupId,
        memberUserId,
        error: result.error,
      });
      return err(result.error);
    }
    return ok(mapCommunityGroup(result.data.group));
  }
  async archiveGroup(groupId: string): Promise<Result<ParentGroup, ServiceError>> {
    if (USE_MOCK) {
      return err(serviceError("UNSUPPORTED", "Community group API is disabled in mock mode."));
    }
    const contextResult = await resolveContext(
      "Sign in to archive community groups.",
    );
    if (!contextResult.success) {
      return contextResult;
    }
    const result = await apiFetch<ApiCommunityGroupCreateResponse>(
      `/v1/community-groups/${encodeURIComponent(groupId)}/archive`,
      {
        method: "POST",
        headers: contextResult.data.headers,
      },
    );
    if (!result.success) {
      logger.error("Failed to archive community group via API", {
        groupId,
        error: result.error,
      });
      return err(result.error);
    }
    return ok(mapCommunityGroup(result.data.group));
  }
  async createGroupInvite(params: {
    groupId: string;
    inviteeUserId: string;
    message?: string;
  }): Promise<Result<AuthorityGroupInvite, ServiceError>> {
    if (USE_MOCK) {
      return err(serviceError("UNSUPPORTED", "Community group API is disabled in mock mode."));
    }
    const contextResult = await resolveContext(
      "Sign in to invite community group members.",
    );
    if (!contextResult.success) {
      return contextResult;
    }
    const result = await apiFetch<ApiCommunityGroupInviteMutationResponse>(
      `/v1/community-groups/${encodeURIComponent(params.groupId)}/invites`,
      {
        method: "POST",
        headers: contextResult.data.headers,
        body: JSON.stringify({
          inviteeUserId: params.inviteeUserId,
          message: params.message,
        }),
      },
    );
    if (!result.success) {
      logger.error("Failed to create community group invite via API", {
        groupId: params.groupId,
        inviteeUserId: params.inviteeUserId,
        error: result.error,
      });
      return err(result.error);
    }
    return ok(mapCommunityGroupInvite(result.data.invite));
  }
  async listGroupInvites(): Promise<Result<AuthorityGroupInvite[], ServiceError>> {
    if (USE_MOCK) {
      return err(serviceError("UNSUPPORTED", "Community group API is disabled in mock mode."));
    }
    const contextResult = await resolveContext(
      "Sign in to read community group invites.",
    );
    if (!contextResult.success) {
      return contextResult;
    }
    const result = await apiFetch<ApiCommunityGroupInviteListResponse>(
      "/v1/me/community-group-invites",
      {
        headers: contextResult.data.headers,
      },
    );
    if (!result.success) {
      logger.error("Failed to list community group invites via API", {
        error: result.error,
      });
      return err(result.error);
    }
    return ok(result.data.invites.map(mapCommunityGroupInvite));
  }
  async acceptGroupInvite(inviteId: string): Promise<Result<ParentGroup, ServiceError>> {
    if (USE_MOCK) {
      return err(serviceError("UNSUPPORTED", "Community group API is disabled in mock mode."));
    }
    const contextResult = await resolveContext(
      "Sign in to accept community group invites.",
    );
    if (!contextResult.success) {
      return contextResult;
    }
    const result = await apiFetch<ApiCommunityGroupInviteMutationResponse>(
      `/v1/community-group-invites/${encodeURIComponent(inviteId)}/accept`,
      {
        method: "POST",
        headers: contextResult.data.headers,
      },
    );
    if (!result.success) {
      logger.error("Failed to accept community group invite via API", {
        inviteId,
        error: result.error,
      });
      return err(result.error);
    }
    if (!result.data.group) {
      return err(notFound("Community group", inviteId));
    }
    return ok(mapCommunityGroup(result.data.group));
  }
  async declineGroupInvite(inviteId: string): Promise<Result<AuthorityGroupInvite, ServiceError>> {
    if (USE_MOCK) {
      return err(serviceError("UNSUPPORTED", "Community group API is disabled in mock mode."));
    }
    const contextResult = await resolveContext(
      "Sign in to decline community group invites.",
    );
    if (!contextResult.success) {
      return contextResult;
    }
    const result = await apiFetch<ApiCommunityGroupInviteMutationResponse>(
      `/v1/community-group-invites/${encodeURIComponent(inviteId)}/decline`,
      {
        method: "POST",
        headers: contextResult.data.headers,
      },
    );
    if (!result.success) {
      logger.error("Failed to decline community group invite via API", {
        inviteId,
        error: result.error,
      });
      return err(result.error);
    }
    return ok(mapCommunityGroupInvite(result.data.invite));
  }
  async requestGroupJoin(
    groupId: string,
    params?: { isCoach?: boolean },
  ): Promise<Result<AuthorityGroupJoinRequest, ServiceError>> {
    if (USE_MOCK) {
      return err(serviceError("UNSUPPORTED", "Community group API is disabled in mock mode."));
    }
    const contextResult = await resolveContext(
      "Sign in to request community group access.",
    );
    if (!contextResult.success) {
      return contextResult;
    }
    const result = await apiFetch<ApiCommunityGroupJoinRequestMutationResponse>(
      `/v1/community-groups/${encodeURIComponent(groupId)}/join-requests`,
      {
        method: "POST",
        headers: contextResult.data.headers,
        body: JSON.stringify({
          isCoach: params?.isCoach,
        }),
      },
    );
    if (!result.success) {
      logger.error("Failed to request community group access via API", {
        groupId,
        error: result.error,
      });
      return err(result.error);
    }
    return ok(mapCommunityGroupJoinRequest(result.data.request));
  }
  async listGroupJoinRequests(
    groupId: string,
  ): Promise<Result<AuthorityGroupJoinRequest[], ServiceError>> {
    if (USE_MOCK) {
      return err(serviceError("UNSUPPORTED", "Community group API is disabled in mock mode."));
    }
    const contextResult = await resolveContext(
      "Sign in to review community group requests.",
    );
    if (!contextResult.success) {
      return contextResult;
    }
    const result = await apiFetch<ApiCommunityGroupJoinRequestListResponse>(
      `/v1/community-groups/${encodeURIComponent(groupId)}/join-requests`,
      {
        headers: contextResult.data.headers,
      },
    );
    if (!result.success) {
      logger.error("Failed to list community group join requests via API", {
        groupId,
        error: result.error,
      });
      return err(result.error);
    }
    return ok(result.data.requests.map(mapCommunityGroupJoinRequest));
  }
  async approveGroupJoinRequest(
    groupId: string,
    requestId: string,
  ): Promise<Result<{ request: AuthorityGroupJoinRequest; group: ParentGroup }, ServiceError>> {
    if (USE_MOCK) {
      return err(serviceError("UNSUPPORTED", "Community group API is disabled in mock mode."));
    }
    const contextResult = await resolveContext(
      "Sign in to approve community group requests.",
    );
    if (!contextResult.success) {
      return contextResult;
    }
    const result = await apiFetch<ApiCommunityGroupJoinRequestMutationResponse>(
      `/v1/community-groups/${encodeURIComponent(groupId)}/join-requests/${encodeURIComponent(
        requestId,
      )}/approve`,
      {
        method: "POST",
        headers: contextResult.data.headers,
      },
    );
    if (!result.success) {
      logger.error("Failed to approve community group join request via API", {
        groupId,
        requestId,
        error: result.error,
      });
      return err(result.error);
    }
    if (!result.data.group) {
      return err(notFound("Community group", groupId));
    }
    return ok({
      request: mapCommunityGroupJoinRequest(result.data.request),
      group: mapCommunityGroup(result.data.group),
    });
  }
  async rejectGroupJoinRequest(
    groupId: string,
    requestId: string,
  ): Promise<Result<AuthorityGroupJoinRequest, ServiceError>> {
    if (USE_MOCK) {
      return err(serviceError("UNSUPPORTED", "Community group API is disabled in mock mode."));
    }
    const contextResult = await resolveContext(
      "Sign in to reject community group requests.",
    );
    if (!contextResult.success) {
      return contextResult;
    }
    const result = await apiFetch<ApiCommunityGroupJoinRequestMutationResponse>(
      `/v1/community-groups/${encodeURIComponent(groupId)}/join-requests/${encodeURIComponent(
        requestId,
      )}/reject`,
      {
        method: "POST",
        headers: contextResult.data.headers,
      },
    );
    if (!result.success) {
      logger.error("Failed to reject community group join request via API", {
        groupId,
        requestId,
        error: result.error,
      });
      return err(result.error);
    }
    return ok(mapCommunityGroupJoinRequest(result.data.request));
  }
  async getGroup(groupId: string): Promise<Result<ParentGroup, ServiceError>> {
    const groupsResult = await this.fetchGroups();
    if (!groupsResult.success) {
      return groupsResult;
    }
    const group = groupsResult.data.find(
      (candidate) => candidate.id === groupId,
    );
    if (!group) {
      return err(notFound("Group", groupId));
    }
    return ok(group);
  }
  async listThreads(): Promise<Result<ChatThreadSummary[], ServiceError>> {
    if (USE_MOCK) {
      return ok([]);
    }
    const threadsResult = await this.fetchThreads("Sign in to view messages.");
    if (!threadsResult.success) {
      return threadsResult;
    }
    const groupsResult = await this.fetchGroups();
    if (!groupsResult.success) {
      return groupsResult;
    }
    const [bookingsById, userNamesById] = await Promise.all([
      loadBookingsById(),
      (async () => {
        const userIds = new Set<string>();
        threadsResult.data.threads.forEach((thread) => {
          thread.participants?.forEach((participant) => {
            if (participant.userId) {
              userIds.add(participant.userId);
            }
          });
          thread.messages?.forEach((message) => {
            if (message.senderUserId) {
              userIds.add(message.senderUserId);
            }
          });
        });
        return loadUserNames(Array.from(userIds));
      })(),
    ]);
    const groupsById = new Map(
      groupsResult.data.map((group) => [group.id, group] as const),
    );
    return ok(
      threadsResult.data.threads.map((thread) =>
        buildThreadSummary({
          thread,
          currentUserId: threadsResult.data.context.currentUserId,
          currentUserAccountType:
            threadsResult.data.context.currentUserAccountType,
          bookingsById,
          groupsById,
          userNamesById,
        }),
      ),
    );
  }
  async listMessages(
    threadId: string,
  ): Promise<Result<ChatMessage[], ServiceError>> {
    if (USE_MOCK) {
      return ok([]);
    }
    const threadsResult = await this.fetchThreads("Sign in to view messages.");
    if (!threadsResult.success) {
      return threadsResult;
    }
    const thread = threadsResult.data.threads.find(
      (candidate) => candidate.id === threadId,
    );
    if (!thread) {
      return err(notFound("Thread", threadId));
    }
    return ok(
      mapChatMessages(
        thread.messages ?? [],
        threadsResult.data.context.currentUserId,
        threadsResult.data.context.currentUserAccountType,
      ),
    );
  }
  async listGroupMessages(
    groupId: string,
  ): Promise<Result<GroupMessage[], ServiceError>> {
    if (USE_MOCK) {
      return ok([]);
    }
    const threadsResult = await this.fetchThreads(
      "Sign in to view group messages.",
    );
    if (!threadsResult.success) {
      return threadsResult;
    }
    const thread = threadsResult.data.threads.find(
      (candidate) => candidate.communityGroupId === groupId,
    );
    if (!thread) {
      return ok([]);
    }
    return ok(
      mapGroupMessages(thread.messages ?? []).map((message) => ({
        ...message,
        groupId,
      })),
    );
  }
  async sendGroupMessage(
    groupId: string,
    body: string,
    attachments?: NonNullable<GroupMessage["attachments"]>,
  ): Promise<Result<GroupMessage, ServiceError>> {
    if (USE_MOCK) {
      return ok({
        id: generateId("gmsg"),
        groupId,
        senderId: "",
        body,
        createdAt: new Date().toISOString(),
        status: "sent",
        readBy: [],
        attachments: [],
      });
    }
    const contextResult = await resolveContext(
      "Sign in to send community messages.",
    );
    if (!contextResult.success) {
      return contextResult;
    }
    const result = await apiFetch<ApiGroupMessageWriteResponse>(
      `/v1/community-groups/${encodeURIComponent(groupId)}/messages`,
      {
        method: "POST",
        headers: contextResult.data.headers,
        body: JSON.stringify({
          body,
          attachments: toAttachmentProofs(attachments),
          idempotencyKey: generateId("gmsg-send"),
        }),
      },
    );
    if (!result.success) {
      logger.error("Failed to send group message via API", {
        groupId,
        error: result.error,
      });
      return err(result.error);
    }
    return ok(mapGroupMessage(result.data.message, groupId));
  }
  async sendThreadMessage(
    threadId: string,
    body: string,
    attachments?: NonNullable<ChatMessage["attachments"]>,
  ): Promise<Result<ChatMessage, ServiceError>> {
    if (USE_MOCK) {
      return ok({
        id: generateId("msg"),
        threadId,
        sender: "parent",
        body,
        createdAt: new Date().toISOString(),
        status: "sent",
        attachments: [],
      });
    }
    const contextResult = await resolveContext("Sign in to send messages.");
    if (!contextResult.success) {
      return contextResult;
    }
    const result = await apiFetch<ApiThreadMessageWriteResponse>(
      `/v1/message-threads/${encodeURIComponent(threadId)}/messages`,
      {
        method: "POST",
        headers: contextResult.data.headers,
        body: JSON.stringify({
          body,
          attachments: toAttachmentProofs(attachments),
          idempotencyKey: generateId("msg-send"),
        }),
      },
    );
    if (!result.success) {
      logger.error("Failed to send thread message via API", {
        threadId,
        error: result.error,
      });
      return err(result.error);
    }
    const mapped = mapChatMessages(
      [result.data.message],
      contextResult.data.currentUserId,
      contextResult.data.currentUserAccountType,
    )[0];
    return mapped
      ? ok(mapped)
      : err(serviceError("UNKNOWN", "Message was not returned by the API"));
  }
  async deleteMessage(messageId: string): Promise<Result<void, ServiceError>> {
    if (USE_MOCK) {
      return ok(undefined);
    }
    const contextResult = await resolveContext("Sign in to delete messages.");
    if (!contextResult.success) {
      return contextResult;
    }
    const result = await apiFetch<ApiThreadMessageWriteResponse>(
      `/v1/messages/${encodeURIComponent(messageId)}`,
      {
        method: "DELETE",
        headers: contextResult.data.headers,
      },
    );
    if (!result.success) {
      logger.error("Failed to remove message via API", {
        messageId,
        error: result.error,
      });
      return err(result.error);
    }
    return ok(undefined);
  }
  async markThreadMessagesRead(
    threadId: string,
  ): Promise<Result<void, ServiceError>> {
    if (USE_MOCK) {
      return ok(undefined);
    }
    const contextResult = await resolveContext(
      "Sign in to mark messages read.",
    );
    if (!contextResult.success) {
      return contextResult;
    }
    const result = await apiFetch<ApiGroupMessageReadResponse>(
      `/v1/message-threads/${encodeURIComponent(threadId)}/read`,
      {
        method: "POST",
        headers: contextResult.data.headers,
      },
    );
    if (!result.success) {
      logger.error("Failed to mark thread messages read via API", {
        threadId,
        error: result.error,
      });
      return err(result.error);
    }
    return ok(undefined);
  }
  async markGroupMessagesRead(
    groupId: string,
  ): Promise<Result<void, ServiceError>> {
    if (USE_MOCK) {
      return ok(undefined);
    }
    const contextResult = await resolveContext(
      "Sign in to mark community messages read.",
    );
    if (!contextResult.success) {
      return contextResult;
    }
    const result = await apiFetch<ApiGroupMessageReadResponse>(
      `/v1/community-groups/${encodeURIComponent(groupId)}/messages/read`,
      {
        method: "POST",
        headers: contextResult.data.headers,
      },
    );
    if (!result.success) {
      logger.error("Failed to mark group messages read via API", {
        groupId,
        error: result.error,
      });
      return err(result.error);
    }
    return ok(undefined);
  }
  async listNotifications(): Promise<
    Result<AuthorityNotificationItem[], ServiceError>
  > {
    return notificationAuthorityService.listNotifications();
  }
  async markNotificationRead(
    notificationId: string,
  ): Promise<Result<AuthorityNotificationItem, ServiceError>> {
    return notificationAuthorityService.markNotificationRead(notificationId);
  }
  async markAllNotificationsRead(): Promise<
    Result<AuthorityNotificationItem[], ServiceError>
  > {
    return notificationAuthorityService.markAllNotificationsRead();
  }
  async dismissNotification(
    notificationId: string,
  ): Promise<Result<AuthorityNotificationItem, ServiceError>> {
    return notificationAuthorityService.dismissNotification(notificationId);
  }
  async dismissAllNotifications(): Promise<
    Result<AuthorityNotificationItem[], ServiceError>
  > {
    return notificationAuthorityService.dismissAllNotifications();
  }
  async getNotificationPreferences(): Promise<
    Result<EnhancedNotificationPreferences, ServiceError>
  > {
    return notificationAuthorityService.getNotificationPreferences();
  }
  async updateNotificationPreferences(
    updates: Partial<
      Omit<
        EnhancedNotificationPreferences,
        "userId" | "createdAt" | "updatedAt"
      >
    >,
  ): Promise<Result<EnhancedNotificationPreferences, ServiceError>> {
    return notificationAuthorityService.updateNotificationPreferences(updates);
  }
  async getNotificationUnreadCount(): Promise<Result<number, ServiceError>> {
    return notificationAuthorityService.getNotificationUnreadCount();
  }
  async getCurrentUserSender(): Promise<
    Result<"parent" | "coach", ServiceError>
  > {
    try {
      return ok(await resolveCurrentUserSender());
    } catch (error) {
      return err(
        serviceError("UNKNOWN", "Failed to resolve current user role.", error),
      );
    }
  }
}
export const communityMediaAuthorityService =
  new CommunityMediaAuthorityService();
export { mergeById };
