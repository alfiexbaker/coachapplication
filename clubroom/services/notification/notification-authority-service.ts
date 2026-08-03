import { NOTIFICATION_TYPE_CATEGORIES } from '@/constants/analytics-types';
import { api } from '@/constants/config';
import type {
  EnhancedNotificationPreferences,
  MutedCoach,
  NotificationChannel,
  NotificationItem,
  NotificationType,
} from '@/constants/types';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
} from '@/services/api-auth-context';
import { apiFetch } from '@/services/api-client';
import { type Result, type ServiceError, err, ok } from '@/types/result';
import { createLogger } from '@/utils/logger';

const logger = createLogger('NotificationAuthorityService');
const USE_MOCK = api.useMock;

interface ApiNotification {
  id: string;
  userId?: string;
  type?: string | null;
  title?: string | null;
  body?: string | null;
  status?: string | null;
  sourceType?: string | null;
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

interface ApiNotificationMutationResponse {
  notification: ApiNotification;
}

interface ApiNotificationBulkMutationResponse {
  notifications: ApiNotification[];
  unreadCount?: number;
}

interface ApiNotificationPreferenceMutationResponse {
  preferences?: ApiNotificationPreference | null;
  mutedSources?: ApiMutedSource[];
  quietHours?: ApiQuietHours | null;
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

function formatTimeLabel(dateString: string | undefined): string | undefined {
  if (!dateString) {
    return undefined;
  }
  const timestamp = new Date(dateString).getTime();
  if (Number.isNaN(timestamp)) {
    return undefined;
  }
  const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  const diffDays = Math.round(diffHours / 24);
  return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
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
      return normalizedType === 'REVIEW_REQUEST' || normalizedType === 'REVIEW_RECEIVED'
        ? 'review'
        : 'message';
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
      return (sourceType ?? '').toLowerCase() === 'thread' ? 'message' : 'community';
  }
}

function normalizeNotificationChannels(value: unknown): NotificationChannel[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    const mapped = String(entry).toUpperCase();
    return mapped === 'PUSH' || mapped === 'EMAIL' || mapped === 'SMS' ? [mapped] : [];
  });
}

function createDefaultPreferences(userId: string): EnhancedNotificationPreferences {
  const now = new Date().toISOString();
  return {
    userId,
    channels: { push: true, email: true, sms: false },
    quietHours: { enabled: false, startTime: '22:00', endTime: '07:00' },
    typePreferences: {},
    mutedCoaches: [],
    createdAt: now,
    updatedAt: now,
  };
}

function mapMutedCoaches(mutedSources: ApiMutedSource[]): MutedCoach[] {
  return mutedSources.flatMap((source) =>
    (source.sourceType ?? '').toLowerCase() === 'coach' && source.sourceId
      ? [
          {
            coachId: source.sourceId,
            mutedAt: coerceIso(source.mutedAt, new Date().toISOString()),
            reason: source.reason ?? undefined,
          },
        ]
      : [],
  );
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
      ? (settings.typePreferences as
          | Record<string, { enabled?: unknown; channels?: unknown }>
          | undefined)
      : undefined;
  const typePreferences = rawTypePreferences
    ? Object.fromEntries(
        Object.entries(rawTypePreferences).map(([key, value]) => [
          key,
          {
            enabled: value.enabled !== false,
            channels: normalizeNotificationChannels(value.channels),
          },
        ]),
      )
    : {};

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
  const isCoach = currentUserAccountType === 'COACH' || currentUserAccountType === 'ADMIN';
  return {
    id: notification.id,
    type: notificationItemTypeForBackendType(notification.type, notification.sourceType),
    notificationType: notification.type ?? undefined,
    title: notification.title?.trim() || 'Notification',
    body: notification.body?.trim() || '',
    timeLabel: formatTimeLabel(notification.createdAt),
    read: (notification.status ?? '').toUpperCase() === 'READ' || Boolean(notification.readAt),
    recipientId: notification.userId || currentUserId,
    recipientRole: isCoach ? 'coach' : 'parent',
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
  return ok({
    currentUserId: currentUserResult.data.id,
    currentUserAccountType: currentUserResult.data.accountType,
    headers: buildApiAuthHeaders({
      actingRole: deriveApiActingRole(currentUserResult.data, 'parent'),
    }),
  });
}

class NotificationAuthorityService {
  private async fetchState(): Promise<Result<NotificationState, ServiceError>> {
    if (USE_MOCK) {
      return ok({
        notifications: [],
        preferences: createDefaultPreferences('current_user'),
        unreadCount: 0,
      });
    }

    const contextResult = await resolveContext('Sign in to view notifications.');
    if (!contextResult.success) return contextResult;
    const result = await apiFetch<ApiNotificationListResponse>('/v1/me/notifications', {
      method: 'GET',
      headers: contextResult.data.headers,
    });
    if (!result.success) {
      logger.warn('Failed to load notifications via API', { error: result.error });
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
        notifications.filter((notification) => !notification.read && !notification.dismissed)
          .length,
    });
  }

  async listNotifications(): Promise<Result<AuthorityNotificationItem[], ServiceError>> {
    const result = await this.fetchState();
    return result.success ? ok(result.data.notifications) : result;
  }

  private async mutateOne(
    notificationId: string,
    action: 'read' | 'dismiss',
  ): Promise<Result<AuthorityNotificationItem, ServiceError>> {
    const contextResult = await resolveContext('Sign in to update notifications.');
    if (!contextResult.success) return contextResult;
    const result = await apiFetch<ApiNotificationMutationResponse>(
      `/v1/me/notifications/${encodeURIComponent(notificationId)}/${action}`,
      { method: 'POST', headers: contextResult.data.headers },
    );
    if (!result.success) return err(result.error);
    return ok(
      mapNotification(
        result.data.notification,
        contextResult.data.currentUserId,
        contextResult.data.currentUserAccountType,
      ),
    );
  }

  markNotificationRead(notificationId: string) {
    return this.mutateOne(notificationId, 'read');
  }

  dismissNotification(notificationId: string) {
    return this.mutateOne(notificationId, 'dismiss');
  }

  private async mutateAll(
    action: 'read-all' | 'dismiss-all',
  ): Promise<Result<AuthorityNotificationItem[], ServiceError>> {
    const contextResult = await resolveContext('Sign in to update notifications.');
    if (!contextResult.success) return contextResult;
    const result = await apiFetch<ApiNotificationBulkMutationResponse>(
      `/v1/me/notifications/${action}`,
      { method: 'POST', headers: contextResult.data.headers },
    );
    if (!result.success) return err(result.error);
    return ok(
      result.data.notifications.map((notification) =>
        mapNotification(
          notification,
          contextResult.data.currentUserId,
          contextResult.data.currentUserAccountType,
        ),
      ),
    );
  }

  markAllNotificationsRead() {
    return this.mutateAll('read-all');
  }

  dismissAllNotifications() {
    return this.mutateAll('dismiss-all');
  }

  async getNotificationPreferences(): Promise<
    Result<EnhancedNotificationPreferences, ServiceError>
  > {
    const result = await this.fetchState();
    return result.success ? ok(result.data.preferences) : result;
  }

  async updateNotificationPreferences(
    updates: Partial<Omit<EnhancedNotificationPreferences, 'userId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Result<EnhancedNotificationPreferences, ServiceError>> {
    const contextResult = await resolveContext('Sign in to update notification preferences.');
    if (!contextResult.success) return contextResult;
    const result = await apiFetch<ApiNotificationPreferenceMutationResponse>(
      '/v1/me/notifications/preferences',
      {
        method: 'PATCH',
        headers: contextResult.data.headers,
        body: JSON.stringify({
          ...(updates.channels ? { channels: updates.channels } : {}),
          ...(updates.quietHours ? { quietHours: updates.quietHours } : {}),
          ...(updates.typePreferences ? { typePreferences: updates.typePreferences } : {}),
          ...(updates.mutedCoaches
            ? {
                mutedCoaches: updates.mutedCoaches.map((coach) => ({
                  coachId: coach.coachId,
                  reason: coach.reason ?? null,
                })),
              }
            : {}),
        }),
      },
    );
    if (!result.success) return err(result.error);
    return ok(
      mapNotificationPreferences({
        currentUserId: contextResult.data.currentUserId,
        preferences: result.data.preferences ?? null,
        mutedSources: result.data.mutedSources ?? [],
        quietHours: result.data.quietHours ?? null,
      }),
    );
  }

  async getNotificationUnreadCount(): Promise<Result<number, ServiceError>> {
    const result = await this.fetchState();
    return result.success ? ok(result.data.unreadCount) : result;
  }
}

export const notificationAuthorityService = new NotificationAuthorityService();
