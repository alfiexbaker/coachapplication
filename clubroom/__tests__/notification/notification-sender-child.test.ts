// @ts-nocheck
/**
 * Notification Sender — Child Identity Tests
 *
 * Verifies that the 3 notification methods updated in Phase 3
 * (notifyCoachBookingCancelled, notifyCoachInviteDeclined, notifyParentBookingConfirmed)
 * correctly include or omit child name in the notification body
 * based on the optional childName + isMultiChild parameters.
 *
 * Strategy: We import the real notificationSenderService and mock its
 * dependencies (notificationStore, notificationPreferencesService, pushNotificationService).
 * Since those are module singletons already loaded by test-register, we override
 * the relevant methods before each test.
 */

import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { notificationSenderService } from '@/services/notification/notification-sender';
import { notificationStore } from '@/services/notification/notification-store';
import { notificationPreferencesService } from '@/services/notification/notification-preferences';

// ============================================================================
// MOCK SETUP
// ============================================================================

/** Capture notifications created via notificationStore.create() */
let capturedNotifications: Array<{ title: string; body: string }> = [];

/** Original methods — restored after each test */
const originalCreate = notificationStore.create.bind(notificationStore);
const originalShouldSend = notificationPreferencesService.shouldSendNotification.bind(
  notificationPreferencesService,
);

beforeEach(() => {
  capturedNotifications = [];

  // Mock notificationStore.create to capture and succeed
  (notificationStore as any).create = async (notification: any) => {
    capturedNotifications.push({
      title: notification.title,
      body: notification.body ?? '',
    });
    return { success: true, data: [notification] };
  };

  // Mock shouldSendNotification to always allow
  (notificationPreferencesService as any).shouldSendNotification = async () => {
    return { success: true, data: true };
  };
});

// ============================================================================
// notifyCoachBookingCancelled
// ============================================================================

describe('notifyCoachBookingCancelled — child identity', () => {
  it('includes childName in body when childName + isMultiChild=true', async () => {
    const result = await notificationSenderService.notifyCoachBookingCancelled({
      coachId: 'coach_c1',
      parentName: 'Sarah Baker',
      childName: 'Tom',
      isMultiChild: true,
      date: '15 Mar',
      bookingId: 'bk_c1',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(capturedNotifications.length, 1);
    const body = capturedNotifications[0].body;
    assert.ok(
      body.includes("Tom's booking"),
      `Expected "Tom's booking" in body, got: "${body}"`,
    );
  });

  it('omits childName when childName is not provided (backward compat)', async () => {
    const result = await notificationSenderService.notifyCoachBookingCancelled({
      coachId: 'coach_c2',
      parentName: 'Sarah Baker',
      date: '15 Mar',
      bookingId: 'bk_c2',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(capturedNotifications.length, 1);
    const body = capturedNotifications[0].body;
    assert.ok(
      body.includes('cancelled booking for 15 Mar'),
      `Expected generic body, got: "${body}"`,
    );
    assert.ok(
      !body.includes("'s booking"),
      `Should NOT contain child possessive, got: "${body}"`,
    );
  });
});

// ============================================================================
// notifyCoachInviteDeclined
// ============================================================================

describe('notifyCoachInviteDeclined — child identity', () => {
  it('includes childName in body when childName is provided', async () => {
    const result = await notificationSenderService.notifyCoachInviteDeclined({
      coachId: 'coach_d1',
      parentName: 'Sarah Baker',
      childName: 'Lucy',
      inviteId: 'inv_d1',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(capturedNotifications.length, 1);
    const body = capturedNotifications[0].body;
    assert.ok(
      body.includes('for Lucy'),
      `Expected "for Lucy" in body, got: "${body}"`,
    );
  });

  it('omits childName when not provided (backward compat)', async () => {
    const result = await notificationSenderService.notifyCoachInviteDeclined({
      coachId: 'coach_d2',
      parentName: 'Sarah Baker',
      inviteId: 'inv_d2',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(capturedNotifications.length, 1);
    const body = capturedNotifications[0].body;
    assert.ok(
      body.includes('declined session invite'),
      `Expected generic decline text, got: "${body}"`,
    );
    assert.ok(
      !body.includes('for '),
      `Should NOT contain "for " child specifier when no child given, got: "${body}"`,
    );
  });
});

// ============================================================================
// notifyParentBookingConfirmed
// ============================================================================

describe('notifyParentBookingConfirmed — child identity', () => {
  it('includes childName in body when childName + isMultiChild=true', async () => {
    const result = await notificationSenderService.notifyParentBookingConfirmed({
      parentId: 'parent_p1',
      coachName: 'Marcus Thompson',
      childName: 'Tom',
      isMultiChild: true,
      date: '15 Mar',
      bookingId: 'bk_p1',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(capturedNotifications.length, 1);
    const body = capturedNotifications[0].body;
    assert.ok(
      body.includes("Tom's booking confirmed"),
      `Expected "Tom's booking confirmed" in body, got: "${body}"`,
    );
  });

  it('omits childName when not provided (backward compat)', async () => {
    const result = await notificationSenderService.notifyParentBookingConfirmed({
      parentId: 'parent_p2',
      coachName: 'Marcus Thompson',
      date: '15 Mar',
      bookingId: 'bk_p2',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(capturedNotifications.length, 1);
    const body = capturedNotifications[0].body;
    assert.ok(
      body.includes('Booking confirmed with Coach Marcus Thompson'),
      `Expected generic body, got: "${body}"`,
    );
    assert.ok(
      !body.includes("'s booking"),
      `Should NOT contain child possessive, got: "${body}"`,
    );
  });
});
