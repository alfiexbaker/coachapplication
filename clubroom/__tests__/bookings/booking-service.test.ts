import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { bookingService } from '@/services/booking-service';
import type { CreateBookingParams } from '@/services/booking-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { socialFeedService } from '@/services/social-feed-service';

function createParams(id: string, overrides: Partial<CreateBookingParams> = {}): CreateBookingParams {
  return {
    coachId: `coach-${id}`,
    coachName: `Coach ${id}`,
    athleteIds: [`athlete-${id}`],
    athleteNames: [`Athlete ${id}`],
    bookedById: `parent-${id}`,
    bookedByName: `Parent ${id}`,
    scheduledAt: '2030-01-10T10:00:00.000Z',
    duration: 60,
    location: 'Main Pitch',
    service: '1-on-1 Coaching',
    serviceType: 'COACHING',
    objectives: ['Passing'],
    price: 50,
    notes: 'Bring cones',
    skipAvailabilityValidation: true,
    ...overrides,
  };
}

describe('bookingService (real facade)', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.BOOKINGS);
    await apiClient.remove(STORAGE_KEYS.NOTIFICATIONS);
    bookingService.resetDraft();
  });

  it('manages booking draft state through facade methods', () => {
    assert.deepEqual(bookingService.getDraft(), {});

    bookingService.updateDraft({ sessionType: '1-on-1', duration: 60 });
    const draft = bookingService.getDraft();

    assert.equal(draft.sessionType, '1-on-1');
    assert.equal(draft.duration, 60);

    bookingService.resetDraft();
    assert.deepEqual(bookingService.getDraft(), {});
  });

  it('creates booking through real service and emits BOOKING_CREATED', async () => {
    let createdEventBookingId = '';
    const unsubscribe = onTyped(ServiceEvents.BOOKING_CREATED, (payload) => {
      createdEventBookingId = payload.bookingId;
    });

    const result = await bookingService.createBooking(createParams('01'));

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.ok(result.data.id.startsWith('booking_'));
    assert.equal(result.data.coachId, 'coach-01');
    assert.equal(result.data.status, 'CONFIRMED');
    assert.equal(createdEventBookingId, result.data.id);

    unsubscribe();
  });

  it('returns validation error when availability validation fails', async () => {
    const result = await bookingService.createBooking(
      createParams('02', {
        scheduledAt: '2030-01-10T07:00:00.000Z',
        skipAvailabilityValidation: false,
      })
    );

    assert.equal(result.success, false);
    if (result.success) return;

    assert.equal(result.error.code, 'VALIDATION');
  });

  it('cancels a created booking through facade', async () => {
    const created = await bookingService.createBooking(createParams('03'));
    assert.equal(created.success, true);
    if (!created.success) return;

    const cancelled = await bookingService.cancel(created.data.id, 'COACH', 'coach');

    assert.ok(cancelled);
    assert.equal(cancelled?.status, 'CANCELLED');
    assert.equal(cancelled?.cancellationReason, 'COACH');
  });

  it('reopens a cancelled booking through facade', async () => {
    const created = await bookingService.createBooking(createParams('03-reopen'));
    assert.equal(created.success, true);
    if (!created.success) return;

    const cancelled = await bookingService.cancel(created.data.id, 'PARENT', 'parent');
    assert.ok(cancelled);

    const reopened = await bookingService.reopen(created.data.id, 'parent');

    assert.ok(reopened);
    assert.equal(reopened?.status, 'CONFIRMED');
    assert.equal(reopened?.cancelledAt, undefined);
  });

  it('does not cancel past bookings', async () => {
    const created = await bookingService.createBooking(
      createParams('03-past', { scheduledAt: '2025-01-10T10:00:00.000Z' }),
    );
    assert.equal(created.success, true);
    if (!created.success) return;

    const cancelled = await bookingService.cancel(created.data.id, 'PARENT', 'parent');
    assert.equal(cancelled, undefined);

    const stillActive = await bookingService.getBooking(created.data.id);
    assert.equal(stillActive?.status, 'CONFIRMED');
  });

  it('filters bookings by role through getBookingsForUser', async () => {
    const one = await bookingService.createBooking(createParams('04'));
    const two = await bookingService.createBooking(
      createParams('05', {
        coachId: 'coach-04',
        bookedById: 'parent-05',
      })
    );

    assert.equal(one.success, true);
    assert.equal(two.success, true);

    const coachBookings = await bookingService.getBookingsForUser('coach-04', 'coach');
    const parentBookings = await bookingService.getBookingsForUser('parent-05', 'parent');
    const athleteBookings = await bookingService.getBookingsForUser('athlete-04', 'athlete');

    assert.equal(coachBookings.length, 2);
    assert.equal(parentBookings.length, 1);
    assert.equal(parentBookings[0]?.bookedById, 'parent-05');
    assert.equal(athleteBookings.length, 1);
    assert.equal(athleteBookings[0]?.athleteId, 'athlete-04');
  });

  it('persists org commercial ownership metadata on org-managed bookings', async () => {
    const result = await bookingService.createBooking(
      createParams('06', {
        clubId: 'academy-001',
        actingAs: 'club',
        commercialMode: 'ORG_OWNED',
        ownerCoachId: 'owner-01',
        assigneeCoachId: 'coach-06-assigned',
        createdByUserId: 'owner-01',
      }),
    );

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.data.clubId, 'academy-001');
    assert.equal(result.data.actingAs, 'club');
    assert.equal(result.data.commercialMode, 'ORG_OWNED');
    assert.equal(result.data.ownerCoachId, 'owner-01');
    assert.equal(result.data.assigneeCoachId, 'coach-06-assigned');
    assert.equal(result.data.createdByUserId, 'owner-01');
  });

  it('does not rewrite existing booking ownership when club commercial mode changes later', async () => {
    const clubId = 'club_lions';
    const originalClub = await socialFeedService.getClub(clubId);

    assert.ok(originalClub);
    if (!originalClub) return;

    const created = await bookingService.createBooking(
      createParams('07', {
        clubId,
        actingAs: 'club',
        commercialMode: 'COACH_OWNED',
        ownerCoachId: 'owner-07',
        assigneeCoachId: 'coach-07-assigned',
        createdByUserId: 'owner-07',
      }),
    );

    assert.equal(created.success, true);
    if (!created.success) return;

    try {
      await socialFeedService.updateClubCommercialMode(clubId, 'ORG_OWNED');

      const stored = await bookingService.getBooking(created.data.id);
      assert.equal(stored?.commercialMode, 'COACH_OWNED');
      assert.equal(stored?.assigneeCoachId, 'coach-07-assigned');
    } finally {
      await socialFeedService.updateClubCommercialMode(
        clubId,
        originalClub.commercialMode ?? 'COACH_OWNED',
      );
    }
  });
});
