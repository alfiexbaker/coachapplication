import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { notificationStore } from '@/services/notification/notification-store';
import { notificationSenderService } from '@/services/notification/notification-sender';
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

describe('notificationSenderService', () => {
  beforeEach(async () => {
    seq = 0;
    await apiClient.set(STORAGE_KEYS.NOTIFICATIONS, []);
    await apiClient.set(STORAGE_KEYS.NOTIFICATION_PREFERENCES, []);
  });

  it('sends coach booking notification into store', async () => {
    const coachId = nextId('coach');
    expectOk(await notificationSenderService.notifyCoachNewBooking({
      coachId,
      parentName: 'Parent A',
      childName: 'Child A',
      date: '2026-03-15',
      bookingId: nextId('booking'),
    }));

    const notifications = expectOk(await notificationStore.getByRecipient(coachId));
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].type, 'booking');
    assert.ok(notifications[0].body.includes('Parent A'));
  });

  it('respects preferences and suppresses push notifications when disabled', async () => {
    const parentId = nextId('parent');
    expectOk(await notificationPreferencesService.toggleChannel(parentId, 'PUSH', false));

    expectOk(await notificationSenderService.notifyParentBookingConfirmed({
      parentId,
      coachName: 'Coach B',
      date: '2026-03-15',
      bookingId: nextId('booking'),
    }));

    const notifications = expectOk(await notificationStore.getByRecipient(parentId));
    assert.equal(notifications.length, 0);
  });
});
