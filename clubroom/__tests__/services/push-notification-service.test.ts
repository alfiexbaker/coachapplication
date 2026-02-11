import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pushNotificationService } from '@/services/push-notification-service';

describe('pushNotificationService', () => {
  it('register call does not throw and returns nullable token', async () => {
    const token = await pushNotificationService.registerForPushNotifications();
    assert.ok(token === null || typeof token === 'string');
  });

  it('schedules local notification safely in test runtime', async () => {
    const id = await pushNotificationService.scheduleLocalNotification({
      title: 'Test Notification',
      body: 'Hello',
      data: { type: 'test' },
    });
    assert.equal(typeof id, 'string');
  });

  it('cancel and badge APIs are no-op safe', async () => {
    await pushNotificationService.cancelNotification('non-existent-id');
    await pushNotificationService.cancelAllNotifications();
    await pushNotificationService.setBadgeCount(2);
    assert.ok(true);
  });
});
