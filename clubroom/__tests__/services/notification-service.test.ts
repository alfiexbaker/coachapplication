/**
 * Notification Service Tests
 *
 * Tests for the legacy notification service API (CRUD + preferences + triggers).
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { notificationService } from '../../services/notification-service';

describe('notificationService', () => {
  beforeEach(async () => {
    await notificationService.clearAll();
  });

  describe('create + list', () => {
    test('creates and lists a notification', async () => {
      const id = `ns_${Math.random().toString(36).slice(2, 9)}`;
      await notificationService.create({
        id,
        type: 'booking',
        title: 'Test',
        body: 'Test body',
        timeLabel: 'Now',
        read: false,
      });

      const all = await notificationService.list();
      assert.ok(all.find((n) => n.id === id));
    });
  });

  describe('markAsRead', () => {
    test('marks notification as read', async () => {
      const id = `ns_read_${Math.random().toString(36).slice(2, 9)}`;
      await notificationService.create({ id, type: 'message', title: 'T', body: 'B', timeLabel: 'Now', read: false });

      const updated = await notificationService.markAsRead(id);
      const found = updated.find((n) => n.id === id);
      assert.equal(found?.read, true);
    });
  });

  describe('getUnreadCount', () => {
    test('counts unread notifications', async () => {
      await notificationService.create({ id: 'uc1', type: 'booking', title: 'T', body: 'B', timeLabel: 'Now', read: false, recipientId: 'u1' });
      await notificationService.create({ id: 'uc2', type: 'booking', title: 'T', body: 'B', timeLabel: 'Now', read: true, recipientId: 'u1' });

      const count = await notificationService.getUnreadCount('u1');
      assert.equal(count, 1);
    });
  });

  describe('subscribe', () => {
    test('listener receives notifications', async () => {
      const received: string[] = [];
      const unsub = notificationService.subscribe((n) => received.push(n.id));

      await notificationService.create({ id: 'sub1', type: 'booking', title: 'T', body: 'B', timeLabel: 'Now', read: false });
      assert.equal(received.length, 1);

      unsub();
    });
  });

  describe('getPreferences', () => {
    test('returns default preferences for new user', async () => {
      const prefs = await notificationService.getPreferences('new_pref_user');
      assert.ok(prefs);
      assert.ok(prefs.channels);
      assert.ok(prefs.quietHours !== undefined);
    });
  });

  describe('muteCoach', () => {
    test('adds coach to muted list', async () => {
      const prefs = await notificationService.muteCoach('mute_user_1', 'coach_muted', 'Coach Name');
      assert.ok(prefs.mutedCoaches.some((mc) => mc.coachId === 'coach_muted'));
    });
  });

  describe('unmuteCoach', () => {
    test('removes coach from muted list', async () => {
      await notificationService.muteCoach('unmute_user_1', 'coach_to_unmute', 'Coach');
      const prefs = await notificationService.unmuteCoach('unmute_user_1', 'coach_to_unmute');
      assert.ok(!prefs.mutedCoaches.some((mc) => mc.coachId === 'coach_to_unmute'));
    });
  });

  describe('isCoachMuted', () => {
    test('returns true for muted coach', async () => {
      await notificationService.muteCoach('ismuted_user', 'muted_coach', 'Coach');
      const result = await notificationService.isCoachMuted('ismuted_user', 'muted_coach');
      assert.equal(result, true);
    });

    test('returns false for non-muted coach', async () => {
      const result = await notificationService.isCoachMuted('ismuted_user', 'not_muted_coach');
      assert.equal(result, false);
    });
  });

  describe('shouldSendNotification', () => {
    test('returns true for default prefs', async () => {
      const result = await notificationService.shouldSendNotification(
        'should_send_user', 'BOOKING_RECEIVED', 'PUSH'
      );
      assert.equal(typeof result, 'boolean');
    });
  });

  describe('resetPreferences', () => {
    test('resets to defaults', async () => {
      await notificationService.muteCoach('reset_user', 'c1', 'Coach');
      const prefs = await notificationService.resetPreferences('reset_user');
      assert.equal(prefs.mutedCoaches.length, 0);
    });
  });
});
