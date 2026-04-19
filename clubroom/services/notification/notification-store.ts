/**
 * Notification Store Service
 *
 * Handles core notification CRUD operations and in-app listeners.
 * Single responsibility: notification data management.
 */

import { createLogger } from '@/utils/logger';
import { emitTyped, ServiceEvents } from '../event-bus';
import type { NotificationItem } from '@/constants/types';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { type Result, type ServiceError, ok, err, storageError } from '@/types/result';
import { resolveDeepLink } from '@/utils/deep-link';
import { api } from '@/constants/config';
import {
  communityMediaAuthorityService,
  mergeById,
  type AuthorityNotificationItem,
} from '../community-media-authority-service';
import { getLocalOverlayValue, setLocalOverlayValue } from '../local-overlay-store';

const logger = createLogger('NotificationStore');
const USE_MOCK = api.useMock;

/**
 * Extended notification with additional metadata.
 */
export interface ExtendedNotificationItem extends NotificationItem {
  recipientId?: string;
  recipientRole?: 'coach' | 'parent';
  deepLink?: string;
  createdAt?: string;
  expiresAt?: string;
  data?: Record<string, string>;
  notificationType?: string;
  dismissed?: boolean;
}

/**
 * Listener for in-app notification toasts.
 */
type NotificationListener = (notification: ExtendedNotificationItem) => void;

class NotificationStore {
  private listeners: NotificationListener[] = [];

  private async loadLocalOverlays(): Promise<ExtendedNotificationItem[]> {
    return getLocalOverlayValue<ExtendedNotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  }

  private async saveLocalOverlays(items: ExtendedNotificationItem[]): Promise<void> {
    await setLocalOverlayValue(STORAGE_KEYS.NOTIFICATIONS, items);
  }

  private async listAuthoritative(): Promise<Result<AuthorityNotificationItem[], ServiceError>> {
    return communityMediaAuthorityService.listNotifications();
  }

  private upsertOverlay(
    overlays: ExtendedNotificationItem[],
    nextItem: ExtendedNotificationItem,
  ): ExtendedNotificationItem[] {
    const next = overlays.filter((item) => item.id !== nextItem.id);
    next.unshift(nextItem);
    return next;
  }

  /**
   * Get all notifications.
   */
  async list(): Promise<Result<ExtendedNotificationItem[], ServiceError>> {
    try {
      if (!USE_MOCK) {
        const [authoritativeResult, overlays] = await Promise.all([
          this.listAuthoritative(),
          this.loadLocalOverlays(),
        ]);
        if (!authoritativeResult.success) {
          return authoritativeResult;
        }

        return ok(
          mergeById(authoritativeResult.data, overlays)
            .filter((item) => !item.dismissed)
            .sort(
              (left, right) =>
                new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime(),
            ),
        );
      }

      return ok(await this.loadLocalOverlays());
    } catch (error) {
      logger.error('Failed to list notifications', error);
      return err(storageError('Failed to load notifications'));
    }
  }

  async migrateRouteAliases(): Promise<Result<number, ServiceError>> {
    try {
      const alreadyMigrated = await getLocalOverlayValue<boolean>(
        STORAGE_KEYS.NOTIFICATION_ROUTE_ALIAS_MIGRATION_V1,
        false,
      );
      if (alreadyMigrated) {
        return ok(0);
      }

      const currentItems = await this.loadLocalOverlays();

      let changed = 0;
      const updated = currentItems.map((notification) => {
        if (!notification.deepLink) {
          return notification;
        }
        const resolved = resolveDeepLink(notification.deepLink);
        if (!resolved || typeof resolved !== 'string' || resolved === notification.deepLink) {
          return notification;
        }
        changed += 1;
        return { ...notification, deepLink: resolved };
      });

      if (changed > 0) {
        await this.saveLocalOverlays(updated);
        logger.info('Migrated notification deep links to current routes', { changed });
      }

      await setLocalOverlayValue(STORAGE_KEYS.NOTIFICATION_ROUTE_ALIAS_MIGRATION_V1, true);
      return ok(changed);
    } catch (error) {
      logger.error('Failed to migrate notification route aliases', error);
      return err(storageError('Failed to migrate notification route aliases'));
    }
  }

  /**
   * Create a new notification.
   */
  async create(
    notification: ExtendedNotificationItem,
  ): Promise<Result<ExtendedNotificationItem[], ServiceError>> {
    try {
      const fullNotification: ExtendedNotificationItem = {
        ...notification,
        createdAt: notification.createdAt || new Date().toISOString(),
        read: notification.read ?? false,
      };

      const overlays = await this.loadLocalOverlays();
      const updated = this.upsertOverlay(overlays, fullNotification);
      await this.saveLocalOverlays(updated);

      // Notify in-app listeners for toasts
      this.notifyListeners(fullNotification);

      // Emit event for other services
      emitTyped(ServiceEvents.NOTIFICATION_CREATED, {
        notificationId: notification.id,
        userId: notification.recipientId ?? '',
        type: notification.type,
      });

      logger.info('Notification created', {
        id: notification.id,
        type: notification.type,
        recipientId: notification.recipientId,
      });

      return this.list();
    } catch (error) {
      logger.error('Failed to create notification', { notification, error });
      return err(storageError('Failed to create notification'));
    }
  }

  /**
   * Mark a notification as read.
   */
  async markAsRead(id: string): Promise<Result<ExtendedNotificationItem[], ServiceError>> {
    try {
      const [currentResult, overlays] = await Promise.all([this.list(), this.loadLocalOverlays()]);
      if (!currentResult.success) {
        return currentResult;
      }
      const existing = currentResult.data.find((item) => item.id === id);
      if (!existing) {
        return ok(currentResult.data);
      }

      await this.saveLocalOverlays(this.upsertOverlay(overlays, { ...existing, read: true }));

      emitTyped(ServiceEvents.NOTIFICATION_READ, { notificationId: id });

      return this.list();
    } catch (error) {
      logger.error('Failed to mark notification as read', { id, error });
      return err(storageError('Failed to update notification'));
    }
  }

  /**
   * Mark all notifications as read.
   */
  async markAllAsRead(): Promise<Result<ExtendedNotificationItem[], ServiceError>> {
    try {
      const [currentResult, overlays] = await Promise.all([this.list(), this.loadLocalOverlays()]);
      if (!currentResult.success) {
        return currentResult;
      }

      const updatedOverlays = currentResult.data.reduce(
        (items, notification) => this.upsertOverlay(items, { ...notification, read: true }),
        overlays,
      );
      await this.saveLocalOverlays(updatedOverlays);
      emitTyped(ServiceEvents.NOTIFICATION_READ, { notificationId: '*' });
      return this.list();
    } catch (error) {
      logger.error('Failed to mark all notifications as read', error);
      return err(storageError('Failed to update notifications'));
    }
  }

  /**
   * Mark a notification as handled (read + processed).
   */
  async markHandled(
    id: string,
  ): Promise<Result<ExtendedNotificationItem | undefined, ServiceError>> {
    try {
      const [currentResult, overlays] = await Promise.all([this.list(), this.loadLocalOverlays()]);
      if (!currentResult.success) {
        return currentResult;
      }
      const existing = currentResult.data.find((item) => item.id === id);
      if (!existing) {
        return ok(undefined);
      }

      await this.saveLocalOverlays(
        this.upsertOverlay(overlays, { ...existing, read: true, handled: true }),
      );
      emitTyped(ServiceEvents.NOTIFICATION_READ, { notificationId: id });
      return ok({ ...existing, read: true, handled: true });
    } catch (error) {
      logger.error('Failed to mark notification as handled', { id, error });
      return err(storageError('Failed to update notification'));
    }
  }

  /**
   * Dismiss a notification.
   */
  async dismiss(id: string): Promise<Result<ExtendedNotificationItem[], ServiceError>> {
    try {
      const [currentResult, overlays] = await Promise.all([this.list(), this.loadLocalOverlays()]);
      if (!currentResult.success) {
        return currentResult;
      }
      const existing = currentResult.data.find((item) => item.id === id);
      if (!existing) {
        return ok(currentResult.data);
      }

      await this.saveLocalOverlays(
        this.upsertOverlay(overlays, { ...existing, dismissed: true }),
      );

      emitTyped(ServiceEvents.NOTIFICATION_DISMISSED, { notificationId: id });

      return this.list();
    } catch (error) {
      logger.error('Failed to dismiss notification', { id, error });
      return err(storageError('Failed to dismiss notification'));
    }
  }

  /**
   * Clear all notifications.
   */
  async clearAll(): Promise<Result<void, ServiceError>> {
    try {
      if (!USE_MOCK) {
        const [currentResult, overlays] = await Promise.all([this.list(), this.loadLocalOverlays()]);
        if (!currentResult.success) {
          return currentResult;
        }

        const nextOverlays = currentResult.data.reduce(
          (items, notification) =>
            this.upsertOverlay(items, { ...notification, dismissed: true }),
          overlays,
        );
        await this.saveLocalOverlays(nextOverlays);
      } else {
        await this.saveLocalOverlays([]);
      }
      emitTyped(ServiceEvents.NOTIFICATION_DISMISSED, { notificationId: '*' });
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to clear notifications', error);
      return err(storageError('Failed to clear notifications'));
    }
  }

  /**
   * Get unread count for a user.
   */
  async getUnreadCount(recipientId?: string): Promise<Result<number, ServiceError>> {
    const listResult = await this.list();
    if (!listResult.success) {
      return listResult;
    }
    const filtered = recipientId
      ? listResult.data.filter((n) => n.recipientId === recipientId)
      : listResult.data;
    return ok(filtered.filter((n) => !n.read).length);
  }

  /**
   * Get notifications for a specific recipient.
   */
  async getByRecipient(
    recipientId: string,
  ): Promise<Result<ExtendedNotificationItem[], ServiceError>> {
    const listResult = await this.list();
    if (!listResult.success) {
      return listResult;
    }
    return ok(listResult.data.filter((n) => n.recipientId === recipientId));
  }

  /**
   * Get notifications by type.
   */
  async getByType(
    type: NotificationItem['type'],
  ): Promise<Result<ExtendedNotificationItem[], ServiceError>> {
    const listResult = await this.list();
    if (!listResult.success) {
      return listResult;
    }
    return ok(listResult.data.filter((n) => n.type === type));
  }

  /**
   * Subscribe to new notifications (for in-app toasts).
   * Returns unsubscribe function.
   */
  subscribe(listener: NotificationListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of a new notification.
   */
  private notifyListeners(notification: ExtendedNotificationItem): void {
    this.listeners.forEach((listener) => {
      try {
        listener(notification);
      } catch (error) {
        logger.error('Listener error', { error });
      }
    });
  }
}

export const notificationStore = new NotificationStore();
