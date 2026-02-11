import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { notificationStore } from '@/services/notification/notification-store';
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

describe('notificationStore', () => {
  beforeEach(async () => {
    seq = 0;
    await apiClient.set(STORAGE_KEYS.NOTIFICATIONS, []);
  });

  describe('create/list', () => {
    it('creates notifications and prepends newest first', async () => {
      const first = {
        id: nextId('notif'),
        type: 'booking' as const,
        title: 'First',
        body: 'First body',
        timeLabel: 'Now',
      };
      const second = {
        id: nextId('notif'),
        type: 'message' as const,
        title: 'Second',
        body: 'Second body',
        timeLabel: 'Now',
      };

      expectOk(await notificationStore.create(first));
      expectOk(await notificationStore.create(second));

      const notifications = expectOk(await notificationStore.list());
      assert.equal(notifications.length, 2);
      assert.equal(notifications[0].id, second.id);
      assert.equal(notifications[1].id, first.id);
      assert.ok(notifications[0].createdAt);
      assert.equal(notifications[0].read, false);
    });
  });

  describe('read states', () => {
    it('marks single and all notifications as read', async () => {
      const idA = nextId('notif');
      const idB = nextId('notif');

      expectOk(await notificationStore.create({
        id: idA,
        type: 'booking',
        title: 'A',
        body: 'A',
        timeLabel: 'Now',
      }));
      expectOk(await notificationStore.create({
        id: idB,
        type: 'booking',
        title: 'B',
        body: 'B',
        timeLabel: 'Now',
      }));

      expectOk(await notificationStore.markAsRead(idA));
      let unread = expectOk(await notificationStore.getUnreadCount());
      assert.equal(unread, 1);

      expectOk(await notificationStore.markAllAsRead());
      unread = expectOk(await notificationStore.getUnreadCount());
      assert.equal(unread, 0);
    });
  });

  describe('dismiss/clear', () => {
    it('dismisses a single notification and clears all', async () => {
      const idA = nextId('notif');
      const idB = nextId('notif');

      expectOk(await notificationStore.create({
        id: idA,
        type: 'message',
        title: 'A',
        body: 'A',
        timeLabel: 'Now',
      }));
      expectOk(await notificationStore.create({
        id: idB,
        type: 'message',
        title: 'B',
        body: 'B',
        timeLabel: 'Now',
      }));

      const afterDismiss = expectOk(await notificationStore.dismiss(idA));
      assert.equal(afterDismiss.length, 1);
      assert.equal(afterDismiss[0].id, idB);

      expectOk(await notificationStore.clearAll());
      const empty = expectOk(await notificationStore.list());
      assert.deepEqual(empty, []);
    });
  });
});
