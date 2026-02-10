/**
 * Notification Store Tests
 *
 * Tests for core notification CRUD, event emissions, and in-app listeners.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { notificationStore } from '../../services/notification/notification-store';
import type { ExtendedNotificationItem } from '../../services/notification/notification-store';
import { onTyped, ServiceEvents } from '../../services/event-bus';

function makeNotification(overrides: Partial<ExtendedNotificationItem> = {}): ExtendedNotificationItem {
  return {
    id: `notif_${Math.random().toString(36).slice(2, 9)}`,
    type: 'booking',
    title: 'Test Notification',
    body: 'Test body',
    timeLabel: 'Just now',
    read: false,
    recipientId: 'user_1',
    recipientRole: 'parent',
    ...overrides,
  };
}

describe('NotificationStore', () => {
  beforeEach(async () => {
    await notificationStore.clearAll();
    eventBus.clearAll();
  });

  describe('create + list', () => {
    test('creates a notification and lists it', async () => {
      const notif = makeNotification();
      await notificationStore.create(notif);

      const all = await notificationStore.list();
      assert.ok(all.length >= 1);
      assert.equal(all[0].id, notif.id);
    });

    test('sets createdAt if not provided', async () => {
      const notif = makeNotification();
      await notificationStore.create(notif);

      const all = await notificationStore.list();
      assert.ok(all[0].createdAt);
    });

    test('emits NOTIFICATION_CREATED event', async () => {
      let emitted = false;
      eventBus.on(ServiceEvents.NOTIFICATION_CREATED, () => { emitted = true; });

      await notificationStore.create(makeNotification());
      assert.equal(emitted, true);
    });
  });

  describe('markAsRead', () => {
    test('marks a notification as read', async () => {
      const notif = makeNotification({ read: false });
      await notificationStore.create(notif);

      const updated = await notificationStore.markAsRead(notif.id);
      const found = updated.find((n) => n.id === notif.id);
      assert.equal(found?.read, true);
    });

    test('emits NOTIFICATION_READ event', async () => {
      let readId = '';
      eventBus.on(ServiceEvents.NOTIFICATION_READ, (d: { notificationId: string }) => {
        readId = d.notificationId;
      });

      const notif = makeNotification();
      await notificationStore.create(notif);
      await notificationStore.markAsRead(notif.id);
      assert.equal(readId, notif.id);
    });
  });

  describe('markAllAsRead', () => {
    test('marks all notifications as read', async () => {
      await notificationStore.create(makeNotification({ id: 'a1' }));
      await notificationStore.create(makeNotification({ id: 'a2' }));

      const updated = await notificationStore.markAllAsRead();
      assert.ok(updated.every((n) => n.read === true));
    });
  });

  describe('dismiss', () => {
    test('removes a notification', async () => {
      const notif = makeNotification();
      await notificationStore.create(notif);

      const after = await notificationStore.dismiss(notif.id);
      assert.ok(!after.find((n) => n.id === notif.id));
    });

    test('emits NOTIFICATION_DISMISSED event', async () => {
      let dismissed = '';
      eventBus.on(ServiceEvents.NOTIFICATION_DISMISSED, (d: { notificationId: string }) => {
        dismissed = d.notificationId;
      });

      const notif = makeNotification();
      await notificationStore.create(notif);
      await notificationStore.dismiss(notif.id);
      assert.equal(dismissed, notif.id);
    });
  });

  describe('getUnreadCount', () => {
    test('counts unread notifications', async () => {
      await notificationStore.create(makeNotification({ id: 'u1', read: false, recipientId: 'user_1' }));
      await notificationStore.create(makeNotification({ id: 'u2', read: true, recipientId: 'user_1' }));

      const count = await notificationStore.getUnreadCount('user_1');
      assert.equal(count, 1);
    });
  });

  describe('getByRecipient', () => {
    test('filters by recipientId', async () => {
      await notificationStore.create(makeNotification({ id: 'r1', recipientId: 'user_1' }));
      await notificationStore.create(makeNotification({ id: 'r2', recipientId: 'user_2' }));

      const result = await notificationStore.getByRecipient('user_1');
      assert.equal(result.length, 1);
      assert.equal(result[0].recipientId, 'user_1');
    });
  });

  describe('getByType', () => {
    test('filters by notification type', async () => {
      await notificationStore.create(makeNotification({ id: 't1', type: 'booking' }));
      await notificationStore.create(makeNotification({ id: 't2', type: 'message' }));

      const bookings = await notificationStore.getByType('booking');
      assert.equal(bookings.length, 1);
      assert.equal(bookings[0].type, 'booking');
    });
  });

  describe('subscribe', () => {
    test('listener receives new notifications', async () => {
      const received: ExtendedNotificationItem[] = [];
      const unsub = notificationStore.subscribe((n) => received.push(n));

      await notificationStore.create(makeNotification());
      assert.equal(received.length, 1);

      unsub();
    });

    test('unsubscribe stops receiving', async () => {
      const received: ExtendedNotificationItem[] = [];
      const unsub = notificationStore.subscribe((n) => received.push(n));

      unsub();
      await notificationStore.create(makeNotification());
      assert.equal(received.length, 0);
    });
  });
});
