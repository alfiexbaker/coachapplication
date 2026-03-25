import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildNotificationBadgeState } from '@/services/notification/notification-attention';
import type { ExtendedNotificationItem } from '@/services/notification-service';

describe('buildNotificationBadgeState', () => {
  it('counts only actionable unread notifications and dedupes messages by thread', () => {
    const state = buildNotificationBadgeState(
      [
        {
          id: 'message-1',
          type: 'message',
          notificationType: 'MESSAGE_RECEIVED',
          title: 'Message',
          body: 'First message',
          data: { threadId: 'thread-1' },
          recipientId: 'user-1',
          read: false,
        },
        {
          id: 'message-2',
          type: 'message',
          notificationType: 'MESSAGE_RECEIVED',
          title: 'Message',
          body: 'Second message',
          data: { threadId: 'thread-1' },
          recipientId: 'user-1',
          read: false,
        },
        {
          id: 'booking-1',
          type: 'booking',
          notificationType: 'BOOKING_CONFIRMED',
          title: 'Booking confirmed',
          body: 'Confirmed',
          data: { bookingId: 'booking-1' },
          recipientId: 'user-1',
          read: false,
        },
        {
          id: 'club-update-1',
          type: 'community',
          notificationType: 'CLUB_UPDATE',
          title: 'Club Update',
          body: 'New post',
          recipientId: 'user-1',
          read: false,
        },
      ],
      'user-1',
      Date.parse('2026-03-23T12:00:00.000Z'),
    );

    assert.equal(state.actionableCount, 2);
    assert.equal(state.passiveUnreadCount, 1);
    assert.equal(state.label, '2');
    assert.equal(state.variant, 'count');
  });

  it('falls back to a passive dot when only passive unread notifications remain', () => {
    const state = buildNotificationBadgeState(
      [
        {
          id: 'badge-1',
          type: 'badge',
          notificationType: 'BADGE_AWARDED',
          title: 'Badge earned',
          body: 'Great work',
          recipientId: 'user-1',
          read: false,
        },
      ],
      'user-1',
    );

    assert.equal(state.actionableCount, 0);
    assert.equal(state.passiveUnreadCount, 1);
    assert.equal(state.variant, 'dot');
    assert.equal(state.label, undefined);
  });

  it('ignores expired reminders and caps overloaded badges at 9 plus', () => {
    const items: ExtendedNotificationItem[] = Array.from({ length: 12 }, (_, index) => ({
      id: `booking-${index}`,
      type: 'booking' as const,
      notificationType: 'BOOKING_RECEIVED' as const,
      title: 'Booking',
      body: 'New booking',
      data: { bookingId: `booking-${index}` },
      recipientId: 'user-1',
      read: false,
    }));

    items.push({
      id: 'reminder-expired',
      type: 'reminder',
      notificationType: 'SESSION_REMINDER',
      title: 'Reminder',
      body: 'Expired reminder',
      recipientId: 'user-1',
      read: false,
      expiresAt: '2026-03-23T11:00:00.000Z',
    });

    const state = buildNotificationBadgeState(
      items,
      'user-1',
      Date.parse('2026-03-23T12:00:00.000Z'),
    );

    assert.equal(state.actionableCount, 12);
    assert.equal(state.passiveUnreadCount, 0);
    assert.equal(state.label, '9+');
    assert.equal(state.variant, 'count');
  });
});
