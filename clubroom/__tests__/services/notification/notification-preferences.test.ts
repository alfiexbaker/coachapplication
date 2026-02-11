import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { notificationPreferencesService } from '@/services/notification/notification-preferences';
import type { Result, ServiceError } from '@/types/result';

function expectOk<T>(result: Result<T, ServiceError>): T {
  assert.equal(result.success, true);
  return result.data;
}

let seq = 0;

function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq}`;
}

describe('notificationPreferencesService', () => {
  beforeEach(async () => {
    seq = 0;
    await apiClient.set(STORAGE_KEYS.NOTIFICATION_PREFERENCES, []);
  });

  describe('get/update', () => {
    it('creates defaults for new user and updates channels', async () => {
      const userId = nextId('user');
      const defaults = expectOk(await notificationPreferencesService.getPreferences(userId));

      assert.equal(defaults.userId, userId);
      assert.equal(defaults.channels.push, true);
      assert.equal(defaults.channels.email, true);
      assert.equal(defaults.channels.sms, false);

      const updated = expectOk(await notificationPreferencesService.toggleChannel(userId, 'PUSH', false));
      assert.equal(updated.channels.push, false);
      assert.equal(updated.userId, userId);
    });
  });

  describe('quiet hours', () => {
    it('sets and toggles quiet hours', async () => {
      const userId = nextId('user');
      const setResult = expectOk(await notificationPreferencesService.setQuietHours(userId, '22:00', '07:00', true));
      assert.equal(setResult.quietHours.enabled, true);
      assert.equal(setResult.quietHours.startTime, '22:00');

      const toggled = expectOk(await notificationPreferencesService.toggleQuietHours(userId, false));
      assert.equal(toggled.quietHours.enabled, false);
    });
  });

  describe('mute flow', () => {
    it('mutes and unmutes coach with shouldSend check', async () => {
      const userId = nextId('user');
      const coachId = nextId('coach');

      const muted = expectOk(await notificationPreferencesService.muteCoach(
        userId,
        coachId,
        'Coach Example',
      ));
      assert.ok(muted.mutedCoaches.some((coach) => coach.coachId === coachId));

      const isMuted = expectOk(await notificationPreferencesService.isCoachMuted(userId, coachId));
      assert.equal(isMuted, true);

      const shouldSend = expectOk(await notificationPreferencesService.shouldSendNotification(
        userId,
        'BOOKING_RECEIVED',
        'PUSH',
        coachId,
      ));
      assert.equal(shouldSend, false);

      const unmuted = expectOk(await notificationPreferencesService.unmuteCoach(userId, coachId));
      assert.ok(!unmuted.mutedCoaches.some((coach) => coach.coachId === coachId));
    });
  });

  describe('reset', () => {
    it('resets preferences back to defaults', async () => {
      const userId = nextId('user');
      expectOk(await notificationPreferencesService.toggleChannel(userId, 'PUSH', false));
      expectOk(await notificationPreferencesService.muteCoach(userId, nextId('coach'), 'Muted Coach'));

      const reset = expectOk(await notificationPreferencesService.resetPreferences(userId));
      assert.equal(reset.channels.push, true);
      assert.equal(reset.mutedCoaches.length, 0);
    });
  });
});
