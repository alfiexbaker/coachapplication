import { NOTIFICATION_TYPE_CATEGORIES } from '@/constants/analytics-types';
import { api } from '@/constants/config';
import type {
  Booking,
  ChatMessage,
  ChatThreadSummary,
  EnhancedNotificationPreferences,
  GroupMemberRole,
  GroupMessage,
  GroupType,
  MutedCoach,
  NotificationChannel,
  NotificationItem,
  NotificationType,
  ParentGroup,
} from '@/constants/types';
import { authService } from '@/services/auth-service';
import { apiFetch } from '@/services/api-client';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
} from '@/services/api-auth-context';
import { userService } from '@/services/user-service';
import { createLogger } from '@/utils/logger';
import {
  err,
  notFound,
  ok,
  serviceError,
  type Result,
  type ServiceError,
} from '@/types/result';

const logger = createLogger('CommunityMediaAuthorityService');
const USE_MOCK = api.useMock;

interface ApiCommunityGroupMembership {
  userId?: string;
  role?: string;
  joinedAt?: string;
  active?: boolean;
  deletedAt?: string | null;
}

interface ApiCommunityGroup {
  id: string;
  clubId?: string | null;
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

interface ApiNotification {
  id: string;
  userId?: string;
  type?: string | null;
  title?: string | null;
  body?: string | null;
  status?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  deepLink?: string | null;
  metadataJson?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
  readAt?: string | null;
  dismissedAt?: string | null;
}

interface ApiNotificationPreference {
  userId?: string;
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  settingsJson?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiMutedSource {
  sourceType?: string | null;
  sourceId?: string | null;
  reason?: string | null;
  mutedAt?: string;
}

interface ApiQuietHours {
  enabled?: boolean;
  startTimeLocal?: string | null;
  endTimeLocal?: string | null;
  timeZone?: string | null;
}

interface ApiNotificationListResponse {
  notifications: ApiNotification[];
  preferences?: ApiNotificationPreference | null;
  mutedSources?: ApiMutedSource[];
  quietHours?: ApiQuietHours | null;
  unreadCount?: number;
}

interface AuthorityContext {
  currentUserId: string;
  currentUserAccountType?: string;
  headers: Record<string, string>;
}

interface NotificationState {
  notifications: AuthorityNotificationItem[];
  preferences: EnhancedNotificationPreferences;
  unreadCount: number;
}

export interface AuthorityNotificationItem extends NotificationItem {
  recipientId?: string;
  recipientRole?: 'coach' | 'parent';
  deepLink?: string;
  createdAt?: string;
  expiresAt?: string;
  data?: Record<string, string>;
  notificationType?: string;
  dismissed?: boolean;
}

function normalizeGroupRole(role: string | null | undefined): GroupMemberRole {
  switch ((role ?? '').toUpperCase()) {
    case 'OWNER':
      return 'OWNER';
    case 'ADMIN':
      return 'ADMIN';
    case 'MODERATOR':
      return 'MODERATOR';
    default:
      return 'MEMBER';
  }
}

function normalizeGroupType(group: ApiCommunityGroup): GroupType {
  if (group.clubId) {
    return 'CLUB';
  }
  return 'GENERAL';
}

function isCoachAccountType(accountType: string | undefined): boolean {
  return accountType === 'COACH' || accountType === 'ADMIN';
}

function humanizeServiceType(serviceType: string | undefined): string {
  if (!serviceType) {
    return 'Direct message';
  }
  return serviceType
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function coerceIso(value: string | null | undefined, fallback: string): string {
  return value && value.trim().length > 0 ? value : fallback;
}

function normalizeRecordStringValues(
  value: Record<string, unknown> | null | undefined,
): Record<string, string> | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const entries = Object.entries(value)
    .filter(([, entryValue]) => entryValue != null)
    .map(([key, entryValue]) => [key, String(entryValue)] as const);

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function mergeById<T extends { id: string }>(authoritative: T[], overlay: T[]): T[] {
  const overlayById = new Map(overlay.map((item) => [item.id, item] as const));
  const merged = authoritative.map((item) => {
    const override = overlayById.get(item.id);
    return override ? { ...item, ...override } : item;
  });
  const authoritativeIds = new Set(authoritative.map((item) => item.id));
  return [...merged, ...overlay.filter((item) => !authoritativeIds.has(item.id))];
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
    return 'Just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) {
    return 'Yesterday';
  }
  return `${diffDays} days ago`;
}

function mapCommunityGroup(group: ApiCommunityGroup): ParentGroup {
  const memberships = (group.memberships ?? []).filter(
    (membership) =>
      membership.active !== false && membership.deletedAt == null && Boolean(membership.userId),
  );

  return {
    id: group.id,
    name: group.name?.trim() || 'Community group',
    description: group.description?.trim() || undefined,
    type: normalizeGroupType(group),
    members: memberships.map((membership) => ({
      parentId: membership.userId as string,
      role: normalizeGroupRole(membership.role),
      joinedAt: coerceIso(membership.joinedAt, group.createdAt ?? new Date().toISOString()),
    })),
    createdById: group.createdByUserId || group.ownerUserId || '',
    createdAt: coerceIso(group.createdAt, new Date().toISOString()),
    updatedAt: coerceIso(group.updatedAt, group.createdAt ?? new Date().toISOString()),
    lastMessageAt: undefined,
    lastMessagePreview: undefined,
    unreadCount: 0,
    clubId: group.clubId ?? undefined,
    isPublic: (group.visibility ?? '').toUpperCase() === 'PUBLIC',
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
  return message.receipts?.find((receipt) => receipt.userId && receipt.userId !== currentUserId);
}

function determineChatSender(
  senderUserId: string | undefined,
  currentUserId: string,
  currentUserAccountType?: string,
): 'parent' | 'coach' {
  const currentUserIsCoach = isCoachAccountType(currentUserAccountType);
  if (senderUserId === currentUserId) {
    return currentUserIsCoach ? 'coach' : 'parent';
  }
  return currentUserIsCoach ? 'parent' : 'coach';
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
      const status: ChatMessage['status'] = relevantReceipt?.readAt
        ? 'seen'
        : relevantReceipt?.deliveredAt || relevantReceipt
          ? 'delivered'
          : 'sent';

      return {
        id: message.id,
        threadId: message.messageThreadId || '',
        sender: determineChatSender(senderUserId, currentUserId, currentUserAccountType),
        body: message.content?.trim() || '',
        createdAt: coerceIso(message.createdAt, new Date().toISOString()),
        status,
        attachments: [],
        readReceipts: (message.receipts ?? [])
          .filter((receipt) => Boolean(receipt.userId && receipt.readAt))
          .map((receipt) => ({
            recipientId: receipt.userId as string,
            readAt: receipt.readAt as string,
          })),
      };
    })
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    );
}

function mapGroupMessages(messages: ApiMessage[]): GroupMessage[] {
  return messages
    .map((message) => {
      const status: GroupMessage['status'] = message.receipts?.some((receipt) => receipt.readAt)
        ? 'seen'
        : 'delivered';
      return {
        id: message.id,
        groupId: message.messageThreadId || '',
        senderId: message.senderUserId || '',
        body: message.content?.trim() || '',
        createdAt: coerceIso(message.createdAt, new Date().toISOString()),
        status,
        readBy: (message.receipts ?? [])
          .filter((receipt) => Boolean(receipt.userId) && Boolean(receipt.readAt))
          .map((receipt) => receipt.userId as string),
        attachments: [],
      };
    })
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    );
}

async function loadBookingsById(): Promise<Map<string, Booking>> {
  const { bookingService } = await import('@/services/booking-service');
  const bookings = await bookingService.list();
  return new Map(bookings.map((booking) => [booking.id, booking] as const));
}

async function loadUserNames(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const usersResult = await userService.getUsersByIds(userIds);
  if (!usersResult.success) {
    logger.warn('Falling back to ids for community labels', { error: usersResult.error });
    return new Map();
  }

  return new Map(
    usersResult.data.map((user) => [
      user.id,
      user.name?.trim() || user.id,
    ]),
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
    return 'You';
  }
  return userNamesById.get(lastMessage.senderUserId) || 'Member';
}

function buildThreadSummary(params: {
  thread: ApiMessageThread;
  currentUserId: string;
  currentUserAccountType?: string;
  bookingsById: Map<string, Booking>;
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
  const isGroup = (thread.threadType ?? '').toUpperCase() === 'GROUP';
  const messages = mapChatMessages(
    thread.messages ?? [],
    currentUserId,
    currentUserAccountType,
  );
  const lastMessage = messages[messages.length - 1];
  const participants = thread.participants ?? [];

  if (isGroup) {
    const group = thread.communityGroupId ? groupsById.get(thread.communityGroupId) : undefined;
    const memberCount = participants.length || group?.members.length || 0;
    return {
      id: thread.id,
      kind: 'group',
      bookingId: thread.bookingId ?? '',
      groupType: group?.type === 'CLUB' ? 'club' : 'class',
      serviceName: group?.name || 'Community group',
      location: '',
      scheduledFor: coerceIso(
        thread.lastMessageAt,
        thread.createdAt ?? new Date().toISOString(),
      ),
      unreadCount: messages.filter(
        (message) =>
          (thread.messages ?? []).find((row) => row.id === message.id)?.senderUserId !==
            currentUserId && message.status !== 'seen',
      ).length,
      memberCount,
      title: thread.title?.trim() || group?.name || 'Community group',
      subtitle: group?.description || `${memberCount} members`,
      scopeLabel: group?.clubId ? 'Club' : undefined,
      postingAsOptions: [],
      safetyCopy: 'Report inappropriate messages via the menu',
      lastMessageSnippet: lastMessage?.body,
      lastMessageSender: resolveGroupLastMessageSender(thread, currentUserId, userNamesById),
    };
  }

  const booking = thread.bookingId ? bookingsById.get(thread.bookingId) : undefined;
  const counterpartyUserId = participants.find(
    (participant) => participant.userId && participant.userId !== currentUserId,
  )?.userId;
  const currentUserIsCoach = isCoachAccountType(currentUserAccountType);
  const title = currentUserIsCoach
    ? booking?.bookedByName ||
      (counterpartyUserId ? userNamesById.get(counterpartyUserId) : undefined) ||
      'Parent'
    : booking?.coachName ||
      (counterpartyUserId ? userNamesById.get(counterpartyUserId) : undefined) ||
      'Coach';

  return {
    id: thread.id,
    kind: 'direct',
    counterpartyUserId,
    bookingId: thread.bookingId ?? '',
    serviceName: booking?.service || humanizeServiceType(booking?.serviceType),
    location: booking?.location || booking?.locationLabel || '',
    scheduledFor:
      booking?.scheduledAt ||
      coerceIso(thread.lastMessageAt, thread.createdAt ?? new Date().toISOString()),
    unreadCount: messages.filter(
      (message) =>
        (thread.messages ?? []).find((row) => row.id === message.id)?.senderUserId !==
          currentUserId && message.status !== 'seen',
    ).length,
    title,
    subtitle: booking?.athleteNames?.join(', ') || booking?.service || undefined,
    safetyCopy: 'Report inappropriate messages via the menu',
    lastMessageSnippet: lastMessage?.body,
    lastMessageSender: lastMessage
      ? lastMessage.sender === determineChatSender(currentUserId, currentUserId, currentUserAccountType)
        ? 'You'
        : title
      : undefined,
  };
}

function notificationItemTypeForBackendType(
  rawType: string | null | undefined,
  sourceType: string | null | undefined,
): NotificationItem['type'] {
  const normalizedType = (rawType ?? '').toUpperCase() as NotificationType;
  switch (NOTIFICATION_TYPE_CATEGORIES[normalizedType]) {
    case 'BOOKINGS':
      return normalizedType === 'REVIEW_REQUEST' ? 'review' : 'booking';
    case 'MESSAGES':
      if (normalizedType === 'REVIEW_REQUEST' || normalizedType === 'REVIEW_RECEIVED') {
        return 'review';
      }
      return 'message';
    case 'BADGES':
      return 'badge';
    case 'PAYMENTS':
      return 'payment';
    case 'REMINDERS':
      return 'reminder';
    case 'MATCHES':
    case 'SOCIAL':
      return 'community';
    default:
      if ((sourceType ?? '').toLowerCase() === 'thread') {
        return 'message';
      }
      return 'community';
  }
}

function normalizeNotificationChannels(value: unknown): NotificationChannel[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => String(entry).toUpperCase())
    .filter(
      (entry): entry is NotificationChannel =>
        entry === 'PUSH' || entry === 'EMAIL' || entry === 'SMS',
    );
}

function createDefaultPreferences(userId: string): EnhancedNotificationPreferences {
  const now = new Date().toISOString();
  return {
    userId,
    channels: {
      push: true,
      email: true,
      sms: false,
    },
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '07:00',
    },
    typePreferences: {},
    mutedCoaches: [],
    createdAt: now,
    updatedAt: now,
  };
}

function mapMutedCoaches(mutedSources: ApiMutedSource[]): MutedCoach[] {
  return mutedSources
    .filter((source) => (source.sourceType ?? '').toLowerCase() === 'coach' && source.sourceId)
    .map((source) => ({
      coachId: source.sourceId as string,
      mutedAt: coerceIso(source.mutedAt, new Date().toISOString()),
      reason: source.reason ?? undefined,
    }));
}

function mapNotificationPreferences(params: {
  currentUserId: string;
  preferences?: ApiNotificationPreference | null;
  mutedSources: ApiMutedSource[];
  quietHours?: ApiQuietHours | null;
}): EnhancedNotificationPreferences {
  const base = createDefaultPreferences(params.currentUserId);
  const settings = params.preferences?.settingsJson;
  const rawTypePreferences =
    settings && typeof settings === 'object' && !Array.isArray(settings)
      ? (settings.typePreferences as Record<string, { enabled?: unknown; channels?: unknown }> | undefined)
      : undefined;

  const typePreferences =
    rawTypePreferences == null
      ? {}
      : Object.fromEntries(
          Object.entries(rawTypePreferences).map(([key, value]) => [
            key,
            {
              enabled: value.enabled !== false,
              channels: normalizeNotificationChannels(value.channels),
            },
          ]),
        );

  return {
    userId: params.preferences?.userId || params.currentUserId,
    channels: {
      push: params.preferences?.pushEnabled ?? base.channels.push,
      email: params.preferences?.emailEnabled ?? base.channels.email,
      sms: params.preferences?.smsEnabled ?? base.channels.sms,
    },
    quietHours: {
      enabled: params.quietHours?.enabled ?? base.quietHours.enabled,
      startTime: params.quietHours?.startTimeLocal || base.quietHours.startTime,
      endTime: params.quietHours?.endTimeLocal || base.quietHours.endTime,
      timezone: params.quietHours?.timeZone || undefined,
    },
    typePreferences,
    mutedCoaches: mapMutedCoaches(params.mutedSources),
    createdAt: coerceIso(params.preferences?.createdAt, base.createdAt),
    updatedAt: coerceIso(params.preferences?.updatedAt, base.updatedAt),
  };
}

function mapNotification(
  notification: ApiNotification,
  currentUserId: string,
  currentUserAccountType?: string,
): AuthorityNotificationItem {
  return {
    id: notification.id,
    type: notificationItemTypeForBackendType(notification.type, notification.sourceType),
    notificationType: notification.type ?? undefined,
    title: notification.title?.trim() || 'Notification',
    body: notification.body?.trim() || '',
    timeLabel: formatTimeLabel(notification.createdAt),
    read: (notification.status ?? '').toUpperCase() === 'READ' || Boolean(notification.readAt),
    recipientId: notification.userId || currentUserId,
    recipientRole: isCoachAccountType(currentUserAccountType) ? 'coach' : 'parent',
    deepLink: notification.deepLink ?? undefined,
    createdAt: coerceIso(notification.createdAt, new Date().toISOString()),
    data: normalizeRecordStringValues(notification.metadataJson),
    dismissed: Boolean(notification.dismissedAt),
  };
}

async function resolveContext(message: string): Promise<Result<AuthorityContext, ServiceError>> {
  const currentUserResult = await resolveSignedInApiUser(message);
  if (!currentUserResult.success) {
    return currentUserResult;
  }

  const currentUser = currentUserResult.data;
  return ok({
    currentUserId: currentUser.id,
    currentUserAccountType: currentUser.accountType,
    headers: buildApiAuthHeaders({
      actingRole: deriveApiActingRole(currentUser, 'parent'),
    }),
  });
}

async function resolveCurrentUserSender(): Promise<'parent' | 'coach'> {
  const currentUser = await authService.getCurrentUser();
  return isCoachAccountType(currentUser?.accountType) ? 'coach' : 'parent';
}

class CommunityMediaAuthorityService {
  private async fetchGroups(): Promise<Result<ParentGroup[], ServiceError>> {
    if (USE_MOCK) {
      return ok([]);
    }

    const contextResult = await resolveContext('Sign in to view community groups.');
    if (!contextResult.success) {
      return contextResult;
    }

    const result = await apiFetch<ApiCommunityGroupListResponse>('/v1/community-groups', {
      method: 'GET',
      headers: contextResult.data.headers,
    });
    if (!result.success) {
      logger.error('Failed to load community groups via API', { error: result.error });
      return err(result.error);
    }

    return ok(result.data.groups.map(mapCommunityGroup));
  }

  private async fetchThreads(
    message: string,
  ): Promise<Result<{ context: AuthorityContext; threads: ApiMessageThread[] }, ServiceError>> {
    if (USE_MOCK) {
      return ok({
        context: {
          currentUserId: '',
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

    const result = await apiFetch<ApiMessageThreadListResponse>('/v1/message-threads', {
      method: 'GET',
      headers: contextResult.data.headers,
    });
    if (!result.success) {
      logger.error('Failed to load message threads via API', { error: result.error });
      return err(result.error);
    }

    return ok({
      context: contextResult.data,
      threads: result.data.threads,
    });
  }

  private async fetchNotificationState(): Promise<Result<NotificationState, ServiceError>> {
    if (USE_MOCK) {
      return ok({
        notifications: [],
        preferences: createDefaultPreferences('current_user'),
        unreadCount: 0,
      });
    }

    const contextResult = await resolveContext('Sign in to view notifications.');
    if (!contextResult.success) {
      return contextResult;
    }

    const result = await apiFetch<ApiNotificationListResponse>('/v1/me/notifications', {
      method: 'GET',
      headers: contextResult.data.headers,
    });
    if (!result.success) {
      logger.error('Failed to load notifications via API', { error: result.error });
      return err(result.error);
    }

    const notifications = result.data.notifications.map((notification) =>
      mapNotification(
        notification,
        contextResult.data.currentUserId,
        contextResult.data.currentUserAccountType,
      ),
    );

    return ok({
      notifications,
      preferences: mapNotificationPreferences({
        currentUserId: contextResult.data.currentUserId,
        preferences: result.data.preferences ?? null,
        mutedSources: result.data.mutedSources ?? [],
        quietHours: result.data.quietHours ?? null,
      }),
      unreadCount:
        result.data.unreadCount ??
        notifications.filter((notification) => !notification.read && !notification.dismissed).length,
    });
  }

  async listGroups(): Promise<Result<ParentGroup[], ServiceError>> {
    return this.fetchGroups();
  }

  async getGroup(groupId: string): Promise<Result<ParentGroup, ServiceError>> {
    const groupsResult = await this.fetchGroups();
    if (!groupsResult.success) {
      return groupsResult;
    }

    const group = groupsResult.data.find((candidate) => candidate.id === groupId);
    if (!group) {
      return err(notFound('Group', groupId));
    }

    return ok(group);
  }

  async listThreads(): Promise<Result<ChatThreadSummary[], ServiceError>> {
    if (USE_MOCK) {
      return ok([]);
    }

    const threadsResult = await this.fetchThreads('Sign in to view messages.');
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

    const groupsById = new Map(groupsResult.data.map((group) => [group.id, group] as const));
    return ok(
      threadsResult.data.threads.map((thread) =>
        buildThreadSummary({
          thread,
          currentUserId: threadsResult.data.context.currentUserId,
          currentUserAccountType: threadsResult.data.context.currentUserAccountType,
          bookingsById,
          groupsById,
          userNamesById,
        }),
      ),
    );
  }

  async listMessages(threadId: string): Promise<Result<ChatMessage[], ServiceError>> {
    if (USE_MOCK) {
      return ok([]);
    }

    const threadsResult = await this.fetchThreads('Sign in to view messages.');
    if (!threadsResult.success) {
      return threadsResult;
    }

    const thread = threadsResult.data.threads.find((candidate) => candidate.id === threadId);
    if (!thread) {
      return err(notFound('Thread', threadId));
    }

    return ok(
      mapChatMessages(
        thread.messages ?? [],
        threadsResult.data.context.currentUserId,
        threadsResult.data.context.currentUserAccountType,
      ),
    );
  }

  async listGroupMessages(groupId: string): Promise<Result<GroupMessage[], ServiceError>> {
    if (USE_MOCK) {
      return ok([]);
    }

    const threadsResult = await this.fetchThreads('Sign in to view group messages.');
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

  async listNotifications(): Promise<Result<AuthorityNotificationItem[], ServiceError>> {
    const stateResult = await this.fetchNotificationState();
    if (!stateResult.success) {
      return stateResult;
    }
    return ok(stateResult.data.notifications);
  }

  async getNotificationPreferences(): Promise<
    Result<EnhancedNotificationPreferences, ServiceError>
  > {
    const stateResult = await this.fetchNotificationState();
    if (!stateResult.success) {
      return stateResult;
    }
    return ok(stateResult.data.preferences);
  }

  async getNotificationUnreadCount(): Promise<Result<number, ServiceError>> {
    const stateResult = await this.fetchNotificationState();
    if (!stateResult.success) {
      return stateResult;
    }
    return ok(stateResult.data.unreadCount);
  }

  async getCurrentUserSender(): Promise<Result<'parent' | 'coach', ServiceError>> {
    try {
      return ok(await resolveCurrentUserSender());
    } catch (error) {
      return err(serviceError('UNKNOWN', 'Failed to resolve current user role.', error));
    }
  }
}

export const communityMediaAuthorityService = new CommunityMediaAuthorityService();
export { mergeById };
