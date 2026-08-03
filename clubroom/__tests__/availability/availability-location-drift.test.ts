import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import type { Booking } from '@/constants/app-types';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { availabilityService } from '@/services/availability-service';

const COACH_ID = 'coach_location_authority';
const LOCAL_BOOKING: Booking = {
  id: 'booking_local_only',
  coachId: COACH_ID,
  status: 'CONFIRMED',
  location: 'Hyde Park',
  scheduledAt: '2026-08-03T10:00:00.000Z',
} as Booking;

async function seedLocalBookingMirror(): Promise<void> {
  await apiClient.set(STORAGE_KEYS.BOOKINGS, [LOCAL_BOOKING]);
  await apiClient.set(STORAGE_KEYS.INVITE_SLOT_HOLDS, []);
}

describe('availability booking location authority', () => {
  beforeEach(seedLocalBookingMirror);

  it('rejects direct local booking location updates without backend authority', async () => {
    await assert.rejects(
      () =>
        availabilityService.updateBookingLocations(
          [LOCAL_BOOKING.id],
          'Victoria Park',
        ),
      /requires backend booking update authority/,
    );

    const stored = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    assert.equal(stored[0]?.location, LOCAL_BOOKING.location);
  });

  it('does not derive location drift from a device-local booking mirror', async () => {
    assert.deepEqual(await availabilityService.checkLocationDrift(COACH_ID, 1, 'Victoria Park'), {
      affectedBookings: [],
      affectedCount: 0,
    });
  });

  it('does not report device-local bookings as availability conflicts', async () => {
    assert.deepEqual(await availabilityService.checkConflicts(COACH_ID, ['2026-08-03']), {
      bookingCount: 0,
      holdCount: 0,
      bookings: [],
      holds: [],
    });
  });
});
