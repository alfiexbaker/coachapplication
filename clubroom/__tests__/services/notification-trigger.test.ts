/**
 * Notification Trigger Tests
 *
 * Tests for the notification trigger module that bridges service
 * actions to local notifications. Verifies that each pre-defined
 * trigger creates the expected notification type and content.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { triggerNotification, notificationTriggers } from '@/services/notification-trigger';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

const rid = () => Math.random().toString(36).slice(2, 10);

describe('notification-trigger', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.NOTIFICATIONS);
  });

  // ---------------------------------------------------------------------------
  // triggerNotification (core)
  // ---------------------------------------------------------------------------
  describe('triggerNotification', () => {
    test('creates a notification in the store', async () => {
      await triggerNotification({
        type: 'booking_confirmed',
        recipientId: 'user_parent_1',
        recipientRole: 'parent',
        title: 'Booking Confirmed',
        body: 'Your session is booked',
        deepLink: '/bookings',
      });

      const notifications = await apiClient.get<unknown[]>(STORAGE_KEYS.NOTIFICATIONS, []);
      assert.ok(notifications.length >= 1);
    });

    test('maps booking-related types correctly', async () => {
      await triggerNotification({
        type: 'session_completed',
        recipientId: 'user_parent_1',
        recipientRole: 'parent',
        title: 'Session Done',
        body: 'Session has been completed',
      });

      const notifications = await apiClient.get<Array<{ type: string }>>(
        STORAGE_KEYS.NOTIFICATIONS,
        [],
      );
      const latest = notifications[notifications.length - 1];
      assert.equal(latest.type, 'booking');
    });

    test('maps message-related types correctly', async () => {
      await triggerNotification({
        type: 'new_message',
        recipientId: 'coach_1',
        recipientRole: 'coach',
        title: 'New Message',
        body: 'You have a new message',
      });

      const notifications = await apiClient.get<Array<{ type: string }>>(
        STORAGE_KEYS.NOTIFICATIONS,
        [],
      );
      const latest = notifications[notifications.length - 1];
      assert.equal(latest.type, 'message');
    });

    test('maps badge-related types correctly', async () => {
      await triggerNotification({
        type: 'badge_earned',
        recipientId: 'user_parent_1',
        recipientRole: 'parent',
        title: 'Badge Earned',
        body: 'New badge!',
      });

      const notifications = await apiClient.get<Array<{ type: string }>>(
        STORAGE_KEYS.NOTIFICATIONS,
        [],
      );
      const latest = notifications[notifications.length - 1];
      assert.equal(latest.type, 'badge');
    });

    test('maps review-related types correctly', async () => {
      await triggerNotification({
        type: 'new_review',
        recipientId: 'coach_1',
        recipientRole: 'coach',
        title: 'New Review',
        body: 'You received a review',
      });

      const notifications = await apiClient.get<Array<{ type: string }>>(
        STORAGE_KEYS.NOTIFICATIONS,
        [],
      );
      const latest = notifications[notifications.length - 1];
      assert.equal(latest.type, 'review');
    });

    test('maps payment-related types correctly', async () => {
      await triggerNotification({
        type: 'payment_received',
        recipientId: 'coach_1',
        recipientRole: 'coach',
        title: 'Payment',
        body: 'Payment received',
      });

      const notifications = await apiClient.get<Array<{ type: string }>>(
        STORAGE_KEYS.NOTIFICATIONS,
        [],
      );
      const latest = notifications[notifications.length - 1];
      assert.equal(latest.type, 'payment');
    });

    test('falls back to reminder for unknown types', async () => {
      await triggerNotification({
        type: 'some_unknown_action',
        recipientId: 'user_parent_1',
        recipientRole: 'parent',
        title: 'Reminder',
        body: 'Something happened',
      });

      const notifications = await apiClient.get<Array<{ type: string }>>(
        STORAGE_KEYS.NOTIFICATIONS,
        [],
      );
      const latest = notifications[notifications.length - 1];
      assert.equal(latest.type, 'reminder');
    });

    test('does not throw on failure', async () => {
      // Even if the underlying service fails, triggerNotification should
      // catch errors silently (logged, not thrown)
      const originalGet = apiClient.get.bind(apiClient);
      try {
        (apiClient as Record<string, unknown>).get = () => {
          throw new Error('Storage failure');
        };

        // Should not throw
        await triggerNotification({
          type: 'booking_confirmed',
          recipientId: 'user_parent_1',
          recipientRole: 'parent',
          title: 'Test',
          body: 'Test',
        });
      } finally {
        (apiClient as Record<string, unknown>).get = originalGet;
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Pre-defined triggers — Drill
  // ---------------------------------------------------------------------------
  describe('notificationTriggers.drill*', () => {
    test('drillAssigned creates parent notification', async () => {
      await notificationTriggers.drillAssigned(
        'Coach Sarah',
        'Passing Drill',
        'Liam',
        'user_parent_1',
      );

      const notifications = await apiClient.get<Array<{ title: string; body: string }>>(
        STORAGE_KEYS.NOTIFICATIONS,
        [],
      );
      const latest = notifications[notifications.length - 1];
      assert.ok(latest.title.includes('Drill'));
      assert.ok(latest.body.includes('Coach Sarah'));
      assert.ok(latest.body.includes('Passing Drill'));
    });

    test('drillCompleted creates coach notification', async () => {
      await notificationTriggers.drillCompleted('Liam', 'Finishing Drill', 'coach_1');

      const notifications = await apiClient.get<Array<{ title: string; body: string }>>(
        STORAGE_KEYS.NOTIFICATIONS,
        [],
      );
      const latest = notifications[notifications.length - 1];
      assert.ok(latest.title.includes('Completed'));
      assert.ok(latest.body.includes('Liam'));
    });
  });

  // ---------------------------------------------------------------------------
  // Pre-defined triggers — Events
  // ---------------------------------------------------------------------------
  describe('notificationTriggers.event*', () => {
    test('eventCreated includes event name and date', async () => {
      await notificationTriggers.eventCreated('Summer Camp', '15th July', 'user_parent_1');

      const notifications = await apiClient.get<Array<{ body: string }>>(
        STORAGE_KEYS.NOTIFICATIONS,
        [],
      );
      const latest = notifications[notifications.length - 1];
      assert.ok(latest.body.includes('Summer Camp'));
      assert.ok(latest.body.includes('15th July'));
    });

    test('eventCancelled includes event name', async () => {
      await notificationTriggers.eventCancelled('Winter Cup', 'user_parent_1');

      const notifications = await apiClient.get<Array<{ body: string }>>(
        STORAGE_KEYS.NOTIFICATIONS,
        [],
      );
      const latest = notifications[notifications.length - 1];
      assert.ok(latest.body.includes('Winter Cup'));
    });

    test('eventRsvp includes parent and response', async () => {
      await notificationTriggers.eventRsvp('Jane', 'Training Day', 'attending', 'coach_1');

      const notifications = await apiClient.get<Array<{ body: string }>>(
        STORAGE_KEYS.NOTIFICATIONS,
        [],
      );
      const latest = notifications[notifications.length - 1];
      assert.ok(latest.body.includes('Jane'));
      assert.ok(latest.body.includes('attending'));
    });
  });

  // ---------------------------------------------------------------------------
  // Pre-defined triggers — Booking
  // ---------------------------------------------------------------------------
  describe('notificationTriggers.booking*', () => {
    test('bookingConfirmed creates notification with coach and date', async () => {
      await notificationTriggers.bookingConfirmed('Coach Reuben', 'Mon 20th at 3pm', 'user_parent_1');

      const notifications = await apiClient.get<Array<{ title: string; body: string }>>(
        STORAGE_KEYS.NOTIFICATIONS,
        [],
      );
      const latest = notifications[notifications.length - 1];
      assert.ok(latest.title.includes('Confirmed'));
      assert.ok(latest.body.includes('Coach Reuben'));
    });

    test('bookingCancelled creates notification with details', async () => {
      await notificationTriggers.bookingCancelled(
        'Parent Jane',
        'Wed 22nd',
        'parent',
        'user_parent_1',
      );

      const notifications = await apiClient.get<Array<{ body: string }>>(
        STORAGE_KEYS.NOTIFICATIONS,
        [],
      );
      const latest = notifications[notifications.length - 1];
      assert.ok(latest.body.includes('Parent Jane'));
      assert.ok(latest.body.includes('Wed 22nd'));
    });
  });

  // ---------------------------------------------------------------------------
  // Pre-defined triggers — Invite
  // ---------------------------------------------------------------------------
  describe('notificationTriggers.invite*', () => {
    test('inviteAccepted notifies coach', async () => {
      await notificationTriggers.inviteAccepted('Jane Smith', 'Liam', 'coach_1');

      const notifications = await apiClient.get<Array<{ body: string }>>(
        STORAGE_KEYS.NOTIFICATIONS,
        [],
      );
      const latest = notifications[notifications.length - 1];
      assert.ok(latest.body.includes('Jane Smith'));
      assert.ok(latest.body.includes('Liam'));
    });

    test('inviteDeclined includes reason', async () => {
      await notificationTriggers.inviteDeclined(
        'Jane',
        'Liam',
        'Schedule conflict',
        'coach_1',
      );

      const notifications = await apiClient.get<Array<{ body: string }>>(
        STORAGE_KEYS.NOTIFICATIONS,
        [],
      );
      const latest = notifications[notifications.length - 1];
      assert.ok(latest.body.includes('Schedule conflict'));
    });

    test('inviteReceived notifies parent', async () => {
      await notificationTriggers.inviteReceived('Coach Sarah', 'Liam', 'user_parent_1');

      const notifications = await apiClient.get<Array<{ body: string }>>(
        STORAGE_KEYS.NOTIFICATIONS,
        [],
      );
      const latest = notifications[notifications.length - 1];
      assert.ok(latest.body.includes('Coach Sarah'));
      assert.ok(latest.body.includes('Liam'));
    });
  });

  // ---------------------------------------------------------------------------
  // Pre-defined triggers — Badge & Session
  // ---------------------------------------------------------------------------
  describe('notificationTriggers.badge and session', () => {
    test('badgeEarned creates notification', async () => {
      await notificationTriggers.badgeEarned('Liam', 'Golden Boot', 'user_parent_1');

      const notifications = await apiClient.get<Array<{ title: string; body: string }>>(
        STORAGE_KEYS.NOTIFICATIONS,
        [],
      );
      const latest = notifications[notifications.length - 1];
      assert.ok(latest.title.includes('Badge'));
      assert.ok(latest.body.includes('Golden Boot'));
    });

    test('sessionCompleted creates notification', async () => {
      await notificationTriggers.sessionCompleted('Coach Aiden', 'Liam', 'user_parent_1');

      const notifications = await apiClient.get<Array<{ body: string }>>(
        STORAGE_KEYS.NOTIFICATIONS,
        [],
      );
      const latest = notifications[notifications.length - 1];
      assert.ok(latest.body.includes('Coach Aiden'));
      assert.ok(latest.body.includes('Liam'));
    });

    test('noShowMarked creates notification', async () => {
      await notificationTriggers.noShowMarked('Liam', '15th March', 'user_parent_1');

      const notifications = await apiClient.get<Array<{ body: string }>>(
        STORAGE_KEYS.NOTIFICATIONS,
        [],
      );
      const latest = notifications[notifications.length - 1];
      assert.ok(latest.body.includes('no-show'));
      assert.ok(latest.body.includes('Liam'));
    });
  });

  // ---------------------------------------------------------------------------
  // Pre-defined triggers — Favourites (no-op)
  // ---------------------------------------------------------------------------
  describe('notificationTriggers.favouriteAdded', () => {
    test('resolves without creating a notification', async () => {
      const before = await apiClient.get<unknown[]>(STORAGE_KEYS.NOTIFICATIONS, []);
      const beforeCount = before.length;

      await notificationTriggers.favouriteAdded('coach_123');

      const after = await apiClient.get<unknown[]>(STORAGE_KEYS.NOTIFICATIONS, []);
      assert.equal(after.length, beforeCount);
    });
  });

  // ---------------------------------------------------------------------------
  // Pre-defined triggers — Group sessions
  // ---------------------------------------------------------------------------
  describe('notificationTriggers.groupSession*', () => {
    test('groupSessionCreated includes title and date', async () => {
      await notificationTriggers.groupSessionCreated('U12 Training', 'Sat 10am', 'user_parent_1');

      const notifications = await apiClient.get<Array<{ body: string }>>(
        STORAGE_KEYS.NOTIFICATIONS,
        [],
      );
      const latest = notifications[notifications.length - 1];
      assert.ok(latest.body.includes('U12 Training'));
      assert.ok(latest.body.includes('Sat 10am'));
    });

    test('groupRegistered includes athlete and session', async () => {
      await notificationTriggers.groupRegistered('Liam', 'U12 Training', 'coach_1');

      const notifications = await apiClient.get<Array<{ body: string }>>(
        STORAGE_KEYS.NOTIFICATIONS,
        [],
      );
      const latest = notifications[notifications.length - 1];
      assert.ok(latest.body.includes('Liam'));
      assert.ok(latest.body.includes('U12 Training'));
    });
  });
});
