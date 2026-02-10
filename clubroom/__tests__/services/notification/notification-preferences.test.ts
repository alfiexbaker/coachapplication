import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { notificationPreferencesService } from '@/services/notification/notification-preferences';
import { storageService } from '@/services/storage-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('NotificationPreferencesService', () => {
  beforeEach(async () => {
    await storageService.removeItem(STORAGE_KEYS.NOTIFICATION_PREFERENCES);
  });

  describe('getPreferences', () => {
    it('should create default preferences for new user', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const prefs = await notificationPreferencesService.getPreferences(userId);

      assert.equal(prefs.userId, userId);
      assert.equal(prefs.channels.push, true);
      assert.equal(prefs.channels.email, true);
      assert.equal(prefs.channels.sms, false);
      assert.equal(prefs.quietHours.enabled, false);
    });

    it('should return existing preferences for known user', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const prefs1 = await notificationPreferencesService.getPreferences(userId);
      const prefs2 = await notificationPreferencesService.getPreferences(userId);

      assert.equal(prefs1.userId, prefs2.userId);
      assert.equal(prefs1.createdAt, prefs2.createdAt);
    });
  });

  describe('updatePreferences', () => {
    it('should update preferences and set updatedAt', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      await notificationPreferencesService.getPreferences(userId);

      const updated = await notificationPreferencesService.updatePreferences(userId, {
        channels: { push: false, email: true, sms: false },
      });

      assert.equal(updated.channels.push, false);
      assert.ok(updated.updatedAt);
    });

    it('should preserve userId even if updates try to change it', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      await notificationPreferencesService.getPreferences(userId);

      const updated = await notificationPreferencesService.updatePreferences(userId, {
        userId: 'different-user',
      } as any);

      assert.equal(updated.userId, userId);
    });
  });

  describe('setQuietHours', () => {
    it('should set quiet hours with enabled=true', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const prefs = await notificationPreferencesService.setQuietHours(
        userId,
        '22:00',
        '07:00',
        true
      );

      assert.equal(prefs.quietHours.enabled, true);
      assert.equal(prefs.quietHours.startTime, '22:00');
      assert.equal(prefs.quietHours.endTime, '07:00');
    });
  });

  describe('toggleQuietHours', () => {
    it('should toggle quiet hours enabled state', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      await notificationPreferencesService.setQuietHours(userId, '22:00', '07:00', true);

      const toggled = await notificationPreferencesService.toggleQuietHours(userId, false);

      assert.equal(toggled.quietHours.enabled, false);
      assert.equal(toggled.quietHours.startTime, '22:00');
      assert.equal(toggled.quietHours.endTime, '07:00');
    });
  });

  describe('toggleChannel', () => {
    it('should toggle push channel', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const prefs = await notificationPreferencesService.toggleChannel(userId, 'PUSH', false);

      assert.equal(prefs.channels.push, false);
    });

    it('should toggle email channel', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const prefs = await notificationPreferencesService.toggleChannel(userId, 'EMAIL', false);

      assert.equal(prefs.channels.email, false);
    });
  });

  describe('muteCoach', () => {
    it('should add coach to muted list', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      const prefs = await notificationPreferencesService.muteCoach(
        userId,
        coachId,
        'Test Coach'
      );

      assert.equal(prefs.mutedCoaches.length, 1);
      assert.equal(prefs.mutedCoaches[0].coachId, coachId);
      assert.equal(prefs.mutedCoaches[0].coachName, 'Test Coach');
    });

    it('should not add duplicate muted coach', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      await notificationPreferencesService.muteCoach(userId, coachId, 'Test Coach');
      const prefs = await notificationPreferencesService.muteCoach(userId, coachId, 'Test Coach');

      assert.equal(prefs.mutedCoaches.length, 1);
    });
  });

  describe('unmuteCoach', () => {
    it('should remove coach from muted list', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      await notificationPreferencesService.muteCoach(userId, coachId, 'Test Coach');

      const prefs = await notificationPreferencesService.unmuteCoach(userId, coachId);

      assert.equal(prefs.mutedCoaches.length, 0);
    });
  });

  describe('isCoachMuted', () => {
    it('should return true for muted coach', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      await notificationPreferencesService.muteCoach(userId, coachId, 'Test Coach');

      const isMuted = await notificationPreferencesService.isCoachMuted(userId, coachId);

      assert.equal(isMuted, true);
    });

    it('should return false for non-muted coach', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      const isMuted = await notificationPreferencesService.isCoachMuted(userId, coachId);

      assert.equal(isMuted, false);
    });
  });

  describe('shouldSendNotification', () => {
    it('should return false when channel is disabled', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      await notificationPreferencesService.toggleChannel(userId, 'PUSH', false);

      const shouldSend = await notificationPreferencesService.shouldSendNotification(
        userId,
        'BOOKING_RECEIVED',
        'PUSH'
      );

      assert.equal(shouldSend, false);
    });

    it('should return false when coach is muted', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      await notificationPreferencesService.muteCoach(userId, coachId, 'Test Coach');

      const shouldSend = await notificationPreferencesService.shouldSendNotification(
        userId,
        'BOOKING_RECEIVED',
        'PUSH',
        coachId
      );

      assert.equal(shouldSend, false);
    });

    it('should return true when all conditions pass', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const shouldSend = await notificationPreferencesService.shouldSendNotification(
        userId,
        'BOOKING_RECEIVED',
        'PUSH'
      );

      assert.equal(shouldSend, true);
    });
  });

  describe('resetPreferences', () => {
    it('should reset to default preferences', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      await notificationPreferencesService.toggleChannel(userId, 'PUSH', false);
      await notificationPreferencesService.muteCoach(
        userId,
        'test-coach-' + Math.random().toString(36).slice(2),
        'Test Coach'
      );

      const reset = await notificationPreferencesService.resetPreferences(userId);

      assert.equal(reset.channels.push, true);
      assert.equal(reset.mutedCoaches.length, 0);
    });
  });
});
