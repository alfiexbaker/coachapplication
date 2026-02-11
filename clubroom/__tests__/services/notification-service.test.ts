import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { notificationService } from '@/services/notification-service';
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

describe('notificationService', () => {
  beforeEach(async () => {
    seq = 0;
    await apiClient.set(STORAGE_KEYS.NOTIFICATIONS, []);
    await apiClient.set(STORAGE_KEYS.NOTIFICATION_PREFERENCES, []);
    expectOk(await notificationService.clearAll());
  });

  describe('core CRUD wrapper', () => {
    it('creates, lists, and marks notifications as read', async () => {
      const id = nextId('notif');
      expectOk(await notificationService.create({
        id,
        type: 'booking',
        title: 'Booking',
        body: 'New booking',
        timeLabel: 'Now',
        read: false,
        recipientId: 'user_1',
      }));

      const listed = expectOk(await notificationService.list());
      assert.ok(listed.some((notification) => notification.id === id));

      expectOk(await notificationService.markAsRead(id));
      const unreadCount = expectOk(await notificationService.getUnreadCount('user_1'));
      assert.equal(unreadCount, 0);
    });

    it('notifies subscribers on creation', async () => {
      const received: string[] = [];
      const unsubscribe = notificationService.subscribe((notification) => {
        received.push(notification.id);
      });

      const id = nextId('notif');
      expectOk(await notificationService.create({
        id,
        type: 'message',
        title: 'Message',
        body: 'New message',
        timeLabel: 'Now',
        read: false,
      }));

      assert.deepEqual(received, [id]);
      unsubscribe();
    });
  });

  describe('preferences wrapper', () => {
    it('mutes/unmutes coach and updates send eligibility', async () => {
      const userId = nextId('user');
      const coachId = nextId('coach');

      const muted = expectOk(await notificationService.muteCoach(userId, coachId, 'Coach One'));
      assert.ok(muted.mutedCoaches.some((coach) => coach.coachId === coachId));

      const mutedCheck = expectOk(await notificationService.isCoachMuted(userId, coachId));
      assert.equal(mutedCheck, true);

      const shouldSendMuted = expectOk(await notificationService.shouldSendNotification(
        userId,
        'BOOKING_RECEIVED',
        'PUSH',
        coachId,
      ));
      assert.strictEqual(shouldSendMuted, false);

      const unmuted = expectOk(await notificationService.unmuteCoach(userId, coachId));
      assert.ok(!unmuted.mutedCoaches.some((coach) => coach.coachId === coachId));
    });
  });
});
