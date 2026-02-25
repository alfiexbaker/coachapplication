import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { bookingSearchService } from '@/services/booking/booking-search-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('BookingSearchService — error paths', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.BOOKINGS);
  });

  it('should return empty array for unknown userId', async () => {
    const bookings = await bookingSearchService.getBookingsForUser(
      'nonexistent-user-' + Math.random().toString(36).slice(2),
      'coach',
    );

    assert.ok(Array.isArray(bookings));
    assert.equal(bookings.length, 0);
  });

  it('should return empty array when no bookings match filter', async () => {
    const bookings = await bookingSearchService.getUpcomingBookings(
      'nocoach-' + Math.random().toString(36).slice(2),
    );

    assert.ok(Array.isArray(bookings));
    assert.equal(bookings.length, 0);
  });

  it('should return empty for awaiting completion with no bookings', async () => {
    const bookings = await bookingSearchService.getAwaitingCompletion(
      'nocoach-' + Math.random().toString(36).slice(2),
    );

    assert.ok(Array.isArray(bookings));
    assert.equal(bookings.length, 0);
  });
});
