/**
 * Notification Store Service
 *
 * Handles core notification CRUD operations and in-app listeners.
 * Single responsibility: notification data management.
 */

import { storageService } from '../storage-service';
import { createLogger } from '@/utils/logger';
import { emitTyped, ServiceEvents } from '../event-bus';
import type { NotificationItem } from '@/constants/types';
import { STORAGE_KEYS } from '@/constants/storage-keys';

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
  async list(): Promise<ExtendedNotificationItem[]> {
    return storageService.getItem<ExtendedNotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, []);
  }

  /**
   * Create a new notification.
   */
  async create(notification: ExtendedNotificationItem): Promise<ExtendedNotificationItem[]> {
    const fullNotification: ExtendedNotificationItem = {
      ...notification,
      createdAt: notification.createdAt || new Date().toISOString(),
      read: notification.read ?? false,
    };

    const current = await this.list();
    const updated = [fullNotification, ...current];
    await storageService.setItem(STORAGE_KEYS.NOTIFICATIONS, updated);

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

    return updated;
  }

  /**
   * Mark a notification as read.
   */
  async markAsRead(id: string): Promise<ExtendedNotificationItem[]> {
    const current = await this.list();
    const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
    await storageService.setItem(STORAGE_KEYS.NOTIFICATIONS, updated);

    emitTyped(ServiceEvents.NOTIFICATION_READ, { notificationId: id });

    return updated;
  }

  /**
   * Mark all notifications as read.
   */
  async markAllAsRead(): Promise<ExtendedNotificationItem[]> {
    const current = await this.list();
    const updated = current.map((n) => ({ ...n, read: true }));
    await storageService.setItem(STORAGE_KEYS.NOTIFICATIONS, updated);
    return updated;
  }

  /**
   * Mark a notification as handled (read + processed).
   */
  async markHandled(id: string): Promise<ExtendedNotificationItem | undefined> {
    const current = await this.list();
    const updated = current.map((n) =>
      n.id === id ? { ...n, read: true, handled: true } : n
    );
    await storageService.setItem(STORAGE_KEYS.NOTIFICATIONS, updated);
    return updated.find((n) => n.id === id);
  }

  /**
   * Dismiss a notification.
   */
  async dismiss(id: string): Promise<ExtendedNotificationItem[]> {
    const current = await this.list();
    const updated = current.filter((n) => n.id !== id);
    await storageService.setItem(STORAGE_KEYS.NOTIFICATIONS, updated);

    emitTyped(ServiceEvents.NOTIFICATION_DISMISSED, { notificationId: id });

    return updated;
  }

  /**
   * Clear all notifications.
   */
  async clearAll(): Promise<void> {
    await storageService.setItem(STORAGE_KEYS.NOTIFICATIONS, []);
  }

  /**
   * Get unread count for a user.
   */
  async getUnreadCount(recipientId?: string): Promise<number> {
    const notifications = await this.list();
    const filtered = recipientId
      ? notifications.filter((n) => n.recipientId === recipientId)
      : notifications;
    return filtered.filter((n) => !n.read).length;
  }

  /**
   * Get notifications for a specific recipient.
   */
  async getByRecipient(recipientId: string): Promise<ExtendedNotificationItem[]> {
    const notifications = await this.list();
    return notifications.filter((n) => n.recipientId === recipientId);
  }

  /**
   * Get notifications by type.
   */
  async getByType(type: NotificationItem['type']): Promise<ExtendedNotificationItem[]> {
    const notifications = await this.list();
    return notifications.filter((n) => n.type === type);
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
