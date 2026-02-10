import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { notificationStore } from '@/services/notification/notification-store';
import { storageService } from '@/services/storage-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { onTyped, ServiceEvents } from '@/services/event-bus';

describe('NotificationStore', () => {
  beforeEach(async () => {
    await storageService.removeItem(STORAGE_KEYS.NOTIFICATIONS);
  });

  describe('list', () => {
    it('should return empty array when no notifications exist', async () => {
      const notifications = await notificationStore.list();

      assert.ok(Array.isArray(notifications));
      assert.equal(notifications.length, 0);
    });

    it('should return all notifications', async () => {
      const notification = {
        id: 'test-notif-' + Math.random().toString(36).slice(2),
        type: 'booking' as const,
        title: 'Test Notification',
        body: 'Test body',
        timeLabel: 'Just now',
        recipientId: 'test-user-' + Math.random().toString(36).slice(2),
      };

      await notificationStore.create(notification);

      const notifications = await notificationStore.list();

      assert.equal(notifications.length, 1);
    });
  });

  describe('create', () => {
    it('should create notification with createdAt timestamp', async () => {
      const notification = {
        id: 'test-notif-' + Math.random().toString(36).slice(2),
        type: 'booking' as const,
        title: 'Test Notification',
        body: 'Test body',
        timeLabel: 'Just now',
      };

      await notificationStore.create(notification);

      const notifications = await notificationStore.list();

      assert.equal(notifications.length, 1);
      assert.ok(notifications[0].createdAt);
    });

    it('should set read to false by default', async () => {
      const notification = {
        id: 'test-notif-' + Math.random().toString(36).slice(2),
        type: 'general' as const,
        title: 'Test Notification',
        body: 'Test body',
        timeLabel: 'Just now',
      };

      await notificationStore.create(notification);

      const notifications = await notificationStore.list();

      assert.equal(notifications[0].read, false);
    });

    it('should emit NOTIFICATION_CREATED event', async () => {
      const notification = {
        id: 'test-notif-' + Math.random().toString(36).slice(2),
        type: 'booking' as const,
        title: 'Test Notification',
        body: 'Test body',
        timeLabel: 'Just now',
        recipientId: 'test-user-' + Math.random().toString(36).slice(2),
      };

      const events: any[] = [];
      const unsub = onTyped(ServiceEvents.NOTIFICATION_CREATED, (payload) => {
        events.push(payload);
      });

      await notificationStore.create(notification);

      assert.equal(events.length, 1);
      assert.equal(events[0].notificationId, notification.id);

      unsub();
    });

    it('should prepend new notification to list', async () => {
      const notif1 = {
        id: 'test-notif-1-' + Math.random().toString(36).slice(2),
        type: 'general' as const,
        title: 'First',
        body: 'First notification',
        timeLabel: 'Just now',
      };

      const notif2 = {
        id: 'test-notif-2-' + Math.random().toString(36).slice(2),
        type: 'general' as const,
        title: 'Second',
        body: 'Second notification',
        timeLabel: 'Just now',
      };

      await notificationStore.create(notif1);
      await notificationStore.create(notif2);

      const notifications = await notificationStore.list();

      assert.equal(notifications.length, 2);
      assert.equal(notifications[0].id, notif2.id);
      assert.equal(notifications[1].id, notif1.id);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notification = {
        id: 'test-notif-' + Math.random().toString(36).slice(2),
        type: 'booking' as const,
        title: 'Test Notification',
        body: 'Test body',
        timeLabel: 'Just now',
      };

      await notificationStore.create(notification);
      await notificationStore.markAsRead(notification.id);

      const notifications = await notificationStore.list();

      assert.equal(notifications[0].read, true);
    });

    it('should emit NOTIFICATION_READ event', async () => {
      const notification = {
        id: 'test-notif-' + Math.random().toString(36).slice(2),
        type: 'booking' as const,
        title: 'Test Notification',
        body: 'Test body',
        timeLabel: 'Just now',
      };

      await notificationStore.create(notification);

      const events: any[] = [];
      const unsub = onTyped(ServiceEvents.NOTIFICATION_READ, (payload) => {
        events.push(payload);
      });

      await notificationStore.markAsRead(notification.id);

      assert.equal(events.length, 1);
      assert.equal(events[0].notificationId, notification.id);

      unsub();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      const notif1 = {
        id: 'test-notif-1-' + Math.random().toString(36).slice(2),
        type: 'general' as const,
        title: 'First',
        body: 'First notification',
        timeLabel: 'Just now',
      };

      const notif2 = {
        id: 'test-notif-2-' + Math.random().toString(36).slice(2),
        type: 'general' as const,
        title: 'Second',
        body: 'Second notification',
        timeLabel: 'Just now',
      };

      await notificationStore.create(notif1);
      await notificationStore.create(notif2);

      await notificationStore.markAllAsRead();

      const notifications = await notificationStore.list();

      assert.equal(notifications.every((n) => n.read === true), true);
    });
  });

  describe('delete', () => {
    it('should remove notification from list', async () => {
      const notification = {
        id: 'test-notif-' + Math.random().toString(36).slice(2),
        type: 'booking' as const,
        title: 'Test Notification',
        body: 'Test body',
        timeLabel: 'Just now',
      };

      await notificationStore.create(notification);
      await notificationStore.delete(notification.id);

      const notifications = await notificationStore.list();

      assert.equal(notifications.length, 0);
    });

    it('should handle deleting non-existent notification gracefully', async () => {
      await notificationStore.delete('non-existent-id');

      const notifications = await notificationStore.list();

      assert.equal(notifications.length, 0);
    });
  });

  describe('clear', () => {
    it('should remove all notifications', async () => {
      const notif1 = {
        id: 'test-notif-1-' + Math.random().toString(36).slice(2),
        type: 'general' as const,
        title: 'First',
        body: 'First notification',
        timeLabel: 'Just now',
      };

      const notif2 = {
        id: 'test-notif-2-' + Math.random().toString(36).slice(2),
        type: 'general' as const,
        title: 'Second',
        body: 'Second notification',
        timeLabel: 'Just now',
      };

      await notificationStore.create(notif1);
      await notificationStore.create(notif2);

      await notificationStore.clear();

      const notifications = await notificationStore.list();

      assert.equal(notifications.length, 0);
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      const notif1 = {
        id: 'test-notif-1-' + Math.random().toString(36).slice(2),
        type: 'general' as const,
        title: 'First',
        body: 'First notification',
        timeLabel: 'Just now',
      };

      const notif2 = {
        id: 'test-notif-2-' + Math.random().toString(36).slice(2),
        type: 'general' as const,
        title: 'Second',
        body: 'Second notification',
        timeLabel: 'Just now',
      };

      await notificationStore.create(notif1);
      await notificationStore.create(notif2);

      await notificationStore.markAsRead(notif1.id);

      const count = await notificationStore.getUnreadCount();

      assert.equal(count, 1);
    });

    it('should return 0 when all notifications are read', async () => {
      const notif = {
        id: 'test-notif-' + Math.random().toString(36).slice(2),
        type: 'general' as const,
        title: 'Test',
        body: 'Test notification',
        timeLabel: 'Just now',
      };

      await notificationStore.create(notif);
      await notificationStore.markAllAsRead();

      const count = await notificationStore.getUnreadCount();

      assert.equal(count, 0);
    });
  });
});
