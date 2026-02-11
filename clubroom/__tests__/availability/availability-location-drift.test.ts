/**
 * Availability Location Drift & Bulk Update Tests
 *
 * Tests the new service methods added for Coach-Side Location Improvements:
 *
 *   1. updateBookingLocations(bookingIds, newLocation) — bulk-updates location on bookings
 *   2. checkLocationDrift(coachId, dayOfWeek, newLocation) — finds future bookings
 *      on a day-of-week with a different location
 *   3. checkConflicts() expanded return — now includes `id` and `location` fields
 */

import assert from 'node:assert';
import { describe, it, beforeEach } from 'node:test';

import { apiClient } from '@/services/api-client';
import { availabilityService } from '@/services/availability-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { Booking } from '@/constants/app-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resetStorage(): Promise<void> {
  await apiClient.set(STORAGE_KEYS.AVAILABILITY_TEMPLATES, []);
  await apiClient.set(STORAGE_KEYS.AVAILABILITY_OVERRIDES, []);
  await apiClient.set(STORAGE_KEYS.BOOKINGS, []);
  await apiClient.set(STORAGE_KEYS.SESSION_OFFERINGS, []);
  await apiClient.set(STORAGE_KEYS.INVITE_SLOT_HOLDS, []);
}

const COACH_ID = 'coach_loc_drift';
const OTHER_COACH_ID = 'coach_other';

/**
 * Build a minimal Booking object for testing.
 * scheduledAt is an ISO string; dayOfWeek is derived from it.
 */
function makeBooking(overrides: Partial<Booking> & { id: string; scheduledAt: string }): Booking {
  return {
    coachId: COACH_ID,
    status: 'CONFIRMED',
    location: 'Hyde Park',
    ...overrides,
  } as Booking;
}

/**
 * Return the next occurrence (today or later) of a given dayOfWeek (0=Sun..6=Sat),
 * offset by `weeksAhead` weeks, formatted as an ISO date+time string.
 * This mirrors the logic inside checkLocationDrift so our test bookings
 * will always land on dates the method is looking at.
 */
function futureDate(dayOfWeek: number, weeksAhead: number, time: string = '10:00'): string {
  const today = new Date();
  const diff = ((dayOfWeek - today.getDay() + 7) % 7) + weeksAhead * 7;
  const d = new Date(today);
  d.setDate(today.getDate() + diff);
  const dateStr = d.toISOString().split('T')[0];
  return `${dateStr}T${time}:00`;
}

// ---------------------------------------------------------------------------
// Test Suite 1: updateBookingLocations
// ---------------------------------------------------------------------------

describe('updateBookingLocations', () => {
  beforeEach(async () => {
    await resetStorage();
  });

  it('updates location on specified booking IDs', async () => {
    const bookings: Booking[] = [
      makeBooking({ id: 'b1', scheduledAt: '2026-03-02T10:00:00', location: 'Hyde Park' }),
      makeBooking({ id: 'b2', scheduledAt: '2026-03-02T11:00:00', location: 'Hyde Park' }),
    ];
    await apiClient.set(STORAGE_KEYS.BOOKINGS, bookings);

    await availabilityService.updateBookingLocations(['b1', 'b2'], 'Victoria Park');

    const stored = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    assert.strictEqual(stored[0].location, 'Victoria Park', 'b1 should be updated');
    assert.strictEqual(stored[1].location, 'Victoria Park', 'b2 should be updated');
  });

  it('does not change bookings not in the ID list', async () => {
    const bookings: Booking[] = [
      makeBooking({ id: 'b1', scheduledAt: '2026-03-02T10:00:00', location: 'Hyde Park' }),
      makeBooking({ id: 'b2', scheduledAt: '2026-03-02T11:00:00', location: 'Regent Park' }),
    ];
    await apiClient.set(STORAGE_KEYS.BOOKINGS, bookings);

    await availabilityService.updateBookingLocations(['b1'], 'Victoria Park');

    const stored = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    assert.strictEqual(stored[0].location, 'Victoria Park', 'b1 should be updated');
    assert.strictEqual(stored[1].location, 'Regent Park', 'b2 should remain unchanged');
  });

  it('does nothing when bookingIds is empty', async () => {
    const bookings: Booking[] = [
      makeBooking({ id: 'b1', scheduledAt: '2026-03-02T10:00:00', location: 'Hyde Park' }),
    ];
    await apiClient.set(STORAGE_KEYS.BOOKINGS, bookings);

    await availabilityService.updateBookingLocations([], 'Victoria Park');

    const stored = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    assert.strictEqual(stored[0].location, 'Hyde Park', 'booking should remain unchanged');
  });

  it('handles case where booking ID does not exist (no error)', async () => {
    const bookings: Booking[] = [
      makeBooking({ id: 'b1', scheduledAt: '2026-03-02T10:00:00', location: 'Hyde Park' }),
    ];
    await apiClient.set(STORAGE_KEYS.BOOKINGS, bookings);

    // Should not throw
    await availabilityService.updateBookingLocations(['nonexistent_id'], 'Victoria Park');

    const stored = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    assert.strictEqual(stored[0].location, 'Hyde Park', 'existing booking should remain unchanged');
  });
});

// ---------------------------------------------------------------------------
// Test Suite 2: checkLocationDrift
// ---------------------------------------------------------------------------

describe('checkLocationDrift', () => {
  beforeEach(async () => {
    await resetStorage();
  });

  it('returns affected bookings when future bookings exist at a different location', async () => {
    // Use Wednesday (dayOfWeek=3) for this test
    const DOW = 3 as const;
    const bookings: Booking[] = [
      makeBooking({
        id: 'b1',
        scheduledAt: futureDate(DOW, 0),
        location: 'Hyde Park',
      }),
      makeBooking({
        id: 'b2',
        scheduledAt: futureDate(DOW, 1),
        location: 'Hyde Park',
      }),
    ];
    await apiClient.set(STORAGE_KEYS.BOOKINGS, bookings);

    const result = await availabilityService.checkLocationDrift(COACH_ID, DOW, 'Victoria Park');

    assert.strictEqual(result.affectedCount, 2, 'Should find 2 affected bookings');
    assert.strictEqual(result.affectedBookings.length, 2);
    assert.strictEqual(result.affectedBookings[0].location, 'Hyde Park');
    assert.ok(result.affectedBookings[0].id, 'Should include booking id');
  });

  it('returns empty when all future bookings are at the same location as newLocation', async () => {
    const DOW = 4 as const; // Thursday
    const bookings: Booking[] = [
      makeBooking({
        id: 'b1',
        scheduledAt: futureDate(DOW, 0),
        location: 'Victoria Park',
      }),
      makeBooking({
        id: 'b2',
        scheduledAt: futureDate(DOW, 1),
        location: 'Victoria Park',
      }),
    ];
    await apiClient.set(STORAGE_KEYS.BOOKINGS, bookings);

    const result = await availabilityService.checkLocationDrift(COACH_ID, DOW, 'Victoria Park');

    assert.strictEqual(result.affectedCount, 0, 'No bookings should be affected');
    assert.strictEqual(result.affectedBookings.length, 0);
  });

  it('returns empty when no bookings exist on that day-of-week', async () => {
    // Seed bookings on Monday (1), but query for Saturday (6)
    const bookings: Booking[] = [
      makeBooking({
        id: 'b1',
        scheduledAt: futureDate(1, 0), // Monday
        location: 'Hyde Park',
      }),
    ];
    await apiClient.set(STORAGE_KEYS.BOOKINGS, bookings);

    const result = await availabilityService.checkLocationDrift(COACH_ID, 6, 'Victoria Park');

    assert.strictEqual(result.affectedCount, 0, 'No bookings on Saturday');
    assert.strictEqual(result.affectedBookings.length, 0);
  });

  it('ignores cancelled bookings', async () => {
    const DOW = 2 as const; // Tuesday
    const bookings: Booking[] = [
      makeBooking({
        id: 'b_cancelled',
        scheduledAt: futureDate(DOW, 0),
        location: 'Hyde Park',
        status: 'CANCELLED',
      }),
      makeBooking({
        id: 'b_active',
        scheduledAt: futureDate(DOW, 1),
        location: 'Hyde Park',
        status: 'CONFIRMED',
      }),
    ];
    await apiClient.set(STORAGE_KEYS.BOOKINGS, bookings);

    const result = await availabilityService.checkLocationDrift(COACH_ID, DOW, 'Victoria Park');

    assert.strictEqual(result.affectedCount, 1, 'Only non-cancelled booking should be affected');
    assert.strictEqual(result.affectedBookings[0].id, 'b_active');
  });

  it('only looks at bookings for the specified coachId', async () => {
    const DOW = 5 as const; // Friday
    const bookings: Booking[] = [
      makeBooking({
        id: 'b_mine',
        coachId: COACH_ID,
        scheduledAt: futureDate(DOW, 0),
        location: 'Hyde Park',
      }),
      makeBooking({
        id: 'b_other',
        coachId: OTHER_COACH_ID,
        scheduledAt: futureDate(DOW, 0),
        location: 'Hyde Park',
      }),
    ];
    await apiClient.set(STORAGE_KEYS.BOOKINGS, bookings);

    const result = await availabilityService.checkLocationDrift(COACH_ID, DOW, 'Victoria Park');

    assert.strictEqual(result.affectedCount, 1, 'Only our coach booking should be found');
    assert.strictEqual(result.affectedBookings[0].id, 'b_mine');
  });
});

// ---------------------------------------------------------------------------
// Test Suite 3: checkConflicts expanded return
// ---------------------------------------------------------------------------

describe('checkConflicts – id and location in bookings', () => {
  beforeEach(async () => {
    await resetStorage();
  });

  it('returned bookings include id and location fields', async () => {
    const targetDate = '2026-04-06'; // A Monday well in the future
    const bookings: Booking[] = [
      makeBooking({
        id: 'conflict_b1',
        scheduledAt: `${targetDate}T09:00:00`,
        location: 'Battersea Park',
      }),
    ];
    await apiClient.set(STORAGE_KEYS.BOOKINGS, bookings);

    const result = await availabilityService.checkConflicts(COACH_ID, [targetDate]);

    assert.strictEqual(result.bookingCount, 1, 'Should find 1 conflicting booking');
    assert.strictEqual(result.bookings.length, 1);

    const b = result.bookings[0];
    assert.strictEqual(b.id, 'conflict_b1', 'Should include the booking id');
    assert.strictEqual(b.location, 'Battersea Park', 'Should include the booking location');
    assert.strictEqual(b.date, targetDate, 'Should include the date');
    assert.strictEqual(b.time, '09:00', 'Should include the time');
  });
});
