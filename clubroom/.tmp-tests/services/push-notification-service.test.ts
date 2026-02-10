import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { pushNotificationService } from '@/services/push-notification-service';

describe('PushNotificationService', () => {
  describe('registerForPushNotifications', () => {
    it('should return null when expo-notifications not available', async () => {
      const result = await pushNotificationService.registerForPushNotifications();

      // In test environment, expo-notifications is not available
      assert.equal(result, null);
    });
  });

  describe('scheduleLocalNotification', () => {
    it('should return empty string when expo-notifications not available', async () => {
      const result = await pushNotificationService.scheduleLocalNotification({
        title: 'Test',
        body: 'Test notification',
      });

      assert.equal(result, '');
    });

    it('should accept optional data parameter', async () => {
      const result = await pushNotificationService.scheduleLocalNotification({
        title: 'Test',
        body: 'Test notification',
        data: { key: 'value' },
      });

      assert.equal(result, '');
    });

    it('should accept optional triggerSeconds parameter', async () => {
      const result = await pushNotificationService.scheduleLocalNotification({
        title: 'Test',
        body: 'Test notification',
        triggerSeconds: 60,
      });

      assert.equal(result, '');
    });
  });

  describe('cancelNotification', () => {
    it('should handle cancellation gracefully when not available', async () => {
      await pushNotificationService.cancelNotification('test-id');
      // Should not throw
      assert.ok(true);
    });
  });

  describe('cancelAllNotifications', () => {
    it('should handle cancel all gracefully when not available', async () => {
      await pushNotificationService.cancelAllNotifications();
      // Should not throw
      assert.ok(true);
    });
  });

  describe('setBadgeCount', () => {
    it('should handle badge count gracefully when not available', async () => {
      await pushNotificationService.setBadgeCount(5);
      // Should not throw
      assert.ok(true);
    });

    it('should accept zero badge count', async () => {
      await pushNotificationService.setBadgeCount(0);
      // Should not throw
      assert.ok(true);
    });
  });
});
