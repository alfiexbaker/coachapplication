/**
 * Notification Sender Service Tests
 *
 * Tests for the notification sender which applies preference filters.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { notificationSenderService } from '../../services/notification/notification-sender';

describe('notificationSenderService', () => {
  test('exports notificationSenderService', () => {
    assert.ok(notificationSenderService);
  });

  describe('coach notification triggers', () => {
    test('has notifyCoachNewBooking method', () => {
      assert.equal(typeof notificationSenderService.notifyCoachNewBooking, 'function');
    });

    test('has notifyCoachBookingCancelled method', () => {
      assert.equal(typeof notificationSenderService.notifyCoachBookingCancelled, 'function');
    });

    test('has notifyCoachInviteAccepted method', () => {
      assert.equal(typeof notificationSenderService.notifyCoachInviteAccepted, 'function');
    });

    test('has notifyCoachNewReview method', () => {
      assert.equal(typeof notificationSenderService.notifyCoachNewReview, 'function');
    });
  });

  describe('parent notification triggers', () => {
    test('has notifyParentBookingConfirmed method', () => {
      assert.equal(typeof notificationSenderService.notifyParentBookingConfirmed, 'function');
    });

    test('has notifyParentSessionInvite method', () => {
      assert.equal(typeof notificationSenderService.notifyParentSessionInvite, 'function');
    });

    test('has notifyParentBadgeAwarded method', () => {
      assert.equal(typeof notificationSenderService.notifyParentBadgeAwarded, 'function');
    });
  });

  describe('notifyCoachNewBooking', () => {
    test('does not throw when called', async () => {
      await assert.doesNotReject(async () => {
        await notificationSenderService.notifyCoachNewBooking({
          coachId: 'coach_1',
          parentName: 'Parent',
          childName: 'Child',
          date: '2026-06-15',
          bookingId: 'bk_1',
        });
      });
    });
  });

  describe('notifyParentBookingConfirmed', () => {
    test('does not throw when called', async () => {
      await assert.doesNotReject(async () => {
        await notificationSenderService.notifyParentBookingConfirmed({
          parentId: 'parent_1',
          coachName: 'Coach',
          date: '2026-06-15',
          bookingId: 'bk_1',
        });
      });
    });
  });
});
