/**
 * Notification Store Service
 *
 * Handles core notification CRUD operations and in-app listeners.
 * Single responsibility: notification data management.
 */

import { apiClient } from '../api-client';
import { createLogger } from '@/utils/logger';
import { emitTyped, ServiceEvents } from '../event-bus';
import type { NotificationItem } from '@/constants/types';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { type Result, type ServiceError, ok, err, storageError } from '@/types/result';

const logger = createLogger('NotificationStore');

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
}

/**
 * Listener for in-app notification toasts.
 */
type NotificationListener = (notification: ExtendedNotificationItem) => void;

class NotificationStore {
  private listeners: NotificationListener[] = [];

  /**
   * Get all notifications.
   */
  async list(): Promise<Result<ExtendedNotificationItem[], ServiceError>> {
    try {
      return ok(await apiClient.get<ExtendedNotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, []));
    } catch (error) {
      logger.error('Failed to list notifications', error);
      return err(storageError('Failed to load notifications'));
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

      const currentResult = await this.list();
      if (!currentResult.success) {
        return currentResult;
      }
      const updated = [fullNotification, ...currentResult.data];
      await apiClient.set(STORAGE_KEYS.NOTIFICATIONS, updated);

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

      return ok(updated);
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
      const currentResult = await this.list();
      if (!currentResult.success) {
        return currentResult;
      }
      const updated = currentResult.data.map((n) => (n.id === id ? { ...n, read: true } : n));
      await apiClient.set(STORAGE_KEYS.NOTIFICATIONS, updated);

      emitTyped(ServiceEvents.NOTIFICATION_READ, { notificationId: id });

      return ok(updated);
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
      const currentResult = await this.list();
      if (!currentResult.success) {
        return currentResult;
      }
      const updated = currentResult.data.map((n) => ({ ...n, read: true }));
      await apiClient.set(STORAGE_KEYS.NOTIFICATIONS, updated);
      return ok(updated);
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
      const currentResult = await this.list();
      if (!currentResult.success) {
        return currentResult;
      }
      const updated = currentResult.data.map((n) =>
        n.id === id ? { ...n, read: true, handled: true } : n,
      );
      await apiClient.set(STORAGE_KEYS.NOTIFICATIONS, updated);
      return ok(updated.find((n) => n.id === id));
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
      const currentResult = await this.list();
      if (!currentResult.success) {
        return currentResult;
      }
      const updated = currentResult.data.filter((n) => n.id !== id);
      await apiClient.set(STORAGE_KEYS.NOTIFICATIONS, updated);

      emitTyped(ServiceEvents.NOTIFICATION_DISMISSED, { notificationId: id });

      return ok(updated);
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
      await apiClient.set(STORAGE_KEYS.NOTIFICATIONS, []);
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
