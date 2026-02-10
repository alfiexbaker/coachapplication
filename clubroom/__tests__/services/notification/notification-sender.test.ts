import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { notificationSender } from '@/services/notification/notification-sender';
import { storageService } from '@/services/storage-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('NotificationSenderService', () => {
  beforeEach(async () => {
    await storageService.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    await storageService.removeItem(STORAGE_KEYS.NOTIFICATION_PREFERENCES);
  });

  describe('notifyCoachNewBooking', () => {
    it('should create notification for coach', async () => {
      const params = {
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        parentName: 'Test Parent',
        childName: 'Test Child',
        date: '2026-03-15',
        bookingId: 'test-booking-' + Math.random().toString(36).slice(2),
      };

      await notificationSender.notifyCoachNewBooking(params);

      const notifications = await storageService.getItem(STORAGE_KEYS.NOTIFICATIONS, []);

      assert.ok(notifications.length > 0);
      assert.equal(notifications[0].recipientId, params.coachId);
      assert.equal(notifications[0].type, 'booking');
      assert.ok(notifications[0].body.includes(params.parentName));
    });
  });

  describe('notifyCoachBookingCancelled', () => {
    it('should create cancellation notification for coach', async () => {
      const params = {
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        parentName: 'Test Parent',
        date: '2026-03-15',
        bookingId: 'test-booking-' + Math.random().toString(36).slice(2),
      };

      await notificationSender.notifyCoachBookingCancelled(params);

      const notifications = await storageService.getItem(STORAGE_KEYS.NOTIFICATIONS, []);

      assert.ok(notifications.length > 0);
      assert.equal(notifications[0].recipientId, params.coachId);
      assert.ok(notifications[0].body.includes('cancelled'));
    });
  });

  describe('notifyCoachInviteAccepted', () => {
    it('should create invite accepted notification for coach', async () => {
      const params = {
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        parentName: 'Test Parent',
        childName: 'Test Child',
        inviteId: 'test-invite-' + Math.random().toString(36).slice(2),
      };

      await notificationSender.notifyCoachInviteAccepted(params);

      const notifications = await storageService.getItem(STORAGE_KEYS.NOTIFICATIONS, []);

      assert.ok(notifications.length > 0);
      assert.equal(notifications[0].recipientId, params.coachId);
      assert.ok(notifications[0].body.includes('accepted'));
    });
  });

  describe('notifyParentBookingConfirmed', () => {
    it('should create booking confirmation notification for parent', async () => {
      const params = {
        parentId: 'test-parent-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        childName: 'Test Child',
        date: '2026-03-15',
        bookingId: 'test-booking-' + Math.random().toString(36).slice(2),
      };

      await notificationSender.notifyParentBookingConfirmed(params);

      const notifications = await storageService.getItem(STORAGE_KEYS.NOTIFICATIONS, []);

      assert.ok(notifications.length > 0);
      assert.equal(notifications[0].recipientId, params.parentId);
      assert.ok(notifications[0].body.includes(params.coachName));
    });
  });

  describe('notifyParentSessionReminder', () => {
    it('should create session reminder notification for parent', async () => {
      const params = {
        parentId: 'test-parent-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        childName: 'Test Child',
        date: '2026-03-15',
        time: '14:00',
        location: 'Test Venue',
        bookingId: 'test-booking-' + Math.random().toString(36).slice(2),
      };

      await notificationSender.notifyParentSessionReminder(params);

      const notifications = await storageService.getItem(STORAGE_KEYS.NOTIFICATIONS, []);

      assert.ok(notifications.length > 0);
      assert.equal(notifications[0].recipientId, params.parentId);
      assert.ok(notifications[0].body.includes('reminder') || notifications[0].body.includes(params.time));
    });
  });

  describe('notifyCoachNewMessage', () => {
    it('should create new message notification for coach', async () => {
      const params = {
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        parentName: 'Test Parent',
        threadId: 'test-thread-' + Math.random().toString(36).slice(2),
      };

      await notificationSender.notifyCoachNewMessage(params);

      const notifications = await storageService.getItem(STORAGE_KEYS.NOTIFICATIONS, []);

      assert.ok(notifications.length > 0);
      assert.equal(notifications[0].recipientId, params.coachId);
      assert.ok(notifications[0].body.includes(params.parentName));
    });
  });

  describe('notifyParentNewMessage', () => {
    it('should create new message notification for parent', async () => {
      const params = {
        parentId: 'test-parent-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        threadId: 'test-thread-' + Math.random().toString(36).slice(2),
      };

      await notificationSender.notifyParentNewMessage(params);

      const notifications = await storageService.getItem(STORAGE_KEYS.NOTIFICATIONS, []);

      assert.ok(notifications.length > 0);
      assert.equal(notifications[0].recipientId, params.parentId);
      assert.ok(notifications[0].body.includes(params.coachName));
    });
  });

  describe('sendCustomNotification', () => {
    it('should create custom notification', async () => {
      const notification = {
        recipientId: 'test-user-' + Math.random().toString(36).slice(2),
        title: 'Test Title',
        body: 'Test Body',
        type: 'general' as const,
      };

      await notificationSender.sendCustomNotification(notification);

      const notifications = await storageService.getItem(STORAGE_KEYS.NOTIFICATIONS, []);

      assert.ok(notifications.length > 0);
      assert.equal(notifications[0].recipientId, notification.recipientId);
      assert.equal(notifications[0].title, notification.title);
      assert.equal(notifications[0].body, notification.body);
    });
  });
});
