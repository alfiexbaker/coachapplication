import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { bookingCommunicationsService } from '@/services/booking-communications-service';
import { notificationService } from '@/services/notification-service';
import type { Booking } from '@/constants/types';

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'booking_support_1',
    coachId: 'coach1',
    coachName: 'Director Kelly',
    clubId: 'club_lions',
    actingAs: 'club',
    commercialMode: 'ORG_OWNED',
    athleteIds: ['athlete_1'],
    athleteNames: ['Athlete One'],
    bookedById: 'parent_1',
    bookedByName: 'Parent One',
    status: 'CONFIRMED',
    scheduledAt: '2030-03-10T18:00:00.000Z',
    location: 'Main Pitch',
    service: 'Club Session',
    serviceType: 'COACHING',
    sessionSource: 'direct',
    sessionSourceEntityId: 'offering_support_1',
    createdAt: '2030-03-01T09:00:00.000Z',
    ...overrides,
  };
}

describe('bookingCommunicationsService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.NOTIFICATIONS);
  });

  it('routes org-owned support issues to org managers', async () => {
    const result = await bookingCommunicationsService.notifySupportIssueReported({
      booking: makeBooking(),
      category: 'safety',
      description: 'The family reported a safety concern after the session.',
    });

    assert.equal(result.success, true);

    const notifications = await notificationService.list();
    assert.equal(notifications.success, true);
    if (!notifications.success) return;

    const supportNotifications = notifications.data.filter(
      (item) => item.notificationType === 'SUPPORT_UPDATE',
    );
    assert.ok(supportNotifications.length >= 1);
    assert.ok(supportNotifications.some((item) => item.recipientId === 'coach1'));
    assert.ok(supportNotifications.every((item) => item.type === 'message'));
  });

  it('falls back to the delivery coach when direct support ownership sits with the coach', async () => {
    const result = await bookingCommunicationsService.notifySupportIssueReported({
      booking: makeBooking({
        id: 'booking_support_2',
        clubId: undefined,
        actingAs: 'self',
        commercialMode: undefined,
      }),
      category: 'quality',
      description: 'The family reported a quality issue.',
    });

    assert.equal(result.success, true);

    const notifications = await notificationService.list();
    assert.equal(notifications.success, true);
    if (!notifications.success) return;

    const supportNotifications = notifications.data.filter(
      (item) => item.notificationType === 'SUPPORT_UPDATE',
    );
    assert.equal(supportNotifications.length, 1);
    assert.equal(supportNotifications[0]?.recipientId, 'coach1');
  });
});
