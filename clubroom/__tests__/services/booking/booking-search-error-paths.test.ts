import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { bookingSearchService } from '@/services/booking/booking-search-service';
import { bookingCrudService } from '@/services/booking/booking-crud-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

function restoreMockMode(original?: PropertyDescriptor): void {
  if (original) {
    Object.defineProperty(apiClient, 'isMockMode', original);
  } else {
    delete (apiClient as unknown as { isMockMode?: boolean }).isMockMode;
  }
}

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

  it('surfaces API mode list failures for user bookings', async () => {
    const originalIsMockMode = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
    const originalList = bookingCrudService.list;

    Object.defineProperty(apiClient, 'isMockMode', {
      configurable: true,
      get: () => false,
    });
    bookingCrudService.list = async () => {
      throw new Error('booking API unavailable');
    };

    try {
      await assert.rejects(
        () => bookingSearchService.getBookingsForUser('parent-api-read-fail', 'parent'),
        /booking API unavailable/,
      );
    } finally {
      bookingCrudService.list = originalList;
      restoreMockMode(originalIsMockMode);
    }
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
