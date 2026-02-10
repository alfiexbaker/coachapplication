/**
 * Booking Search Service Tests
 *
 * Tests for booking queries: getBookingsForUser, getAwaitingCompletion,
 * getUpcomingBookings. Seeds data through bookingCrudService.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { bookingSearchService } from '../../services/booking/booking-search-service';
import { bookingCrudService } from '../../services/booking/booking-crud-service';
import { apiClient } from '../../services/api-client';

const rid = () => Math.random().toString(36).slice(2, 10);

function makeBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: `bk_${rid()}`,
    coachId: `coach_${rid()}`,
    coachName: 'Test Coach',
    athleteId: `ath_${rid()}`,
    athleteName: 'Test Athlete',
    bookedById: `parent_${rid()}`,
    bookedByName: 'Test Parent',
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    duration: 60,
    status: 'CONFIRMED' as const,
    location: 'Test Venue',
    sport: 'Football',
    price: 35,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('bookingSearchService', () => {
  beforeEach(async () => {
    await apiClient.remove('clubroom.bookings');
  });

  // ---------------------------------------------------------------------------
  // getBookingsForUser
  // ---------------------------------------------------------------------------
  describe('getBookingsForUser', () => {
    test('returns bookings for coach role', async () => {
      const coachId = `coach_${rid()}`;
      await bookingCrudService.saveBookingDirect(makeBooking({ coachId }));
      await bookingCrudService.saveBookingDirect(makeBooking({ coachId }));
      await bookingCrudService.saveBookingDirect(makeBooking());

      const results = await bookingSearchService.getBookingsForUser(coachId, 'coach');
      assert.equal(results.length, 2);
    });

    test('returns bookings for parent role', async () => {
      const parentId = `parent_${rid()}`;
      await bookingCrudService.saveBookingDirect(makeBooking({ bookedById: parentId }));

      const results = await bookingSearchService.getBookingsForUser(parentId, 'parent');
      assert.equal(results.length, 1);
    });

    test('returns bookings for athlete role', async () => {
      const athleteId = `ath_${rid()}`;
      await bookingCrudService.saveBookingDirect(makeBooking({ athleteId }));

      const results = await bookingSearchService.getBookingsForUser(athleteId, 'athlete');
      assert.equal(results.length, 1);
    });

    test('returns empty for unknown user', async () => {
      const results = await bookingSearchService.getBookingsForUser(`unknown_${rid()}`, 'coach');
      assert.equal(results.length, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // getAwaitingCompletion
  // ---------------------------------------------------------------------------
  describe('getAwaitingCompletion', () => {
    test('returns bookings with AWAITING_COMPLETION status', async () => {
      const coachId = `coach_${rid()}`;
      await bookingCrudService.saveBookingDirect(
        makeBooking({ coachId, status: 'AWAITING_COMPLETION' })
      );
      await bookingCrudService.saveBookingDirect(
        makeBooking({ coachId, status: 'CONFIRMED', scheduledAt: new Date(Date.now() + 86400000).toISOString() })
      );

      const results = await bookingSearchService.getAwaitingCompletion(coachId);
      assert.ok(results.length >= 1);
    });

    test('includes past confirmed sessions', async () => {
      const coachId = `coach_${rid()}`;
      const pastTime = new Date(Date.now() - 7200000).toISOString();
      await bookingCrudService.saveBookingDirect(
        makeBooking({ coachId, status: 'CONFIRMED', scheduledAt: pastTime, duration: 60 })
      );

      const results = await bookingSearchService.getAwaitingCompletion(coachId);
      assert.ok(results.length >= 1);
    });
  });

  // ---------------------------------------------------------------------------
  // getUpcomingBookings
  // ---------------------------------------------------------------------------
  describe('getUpcomingBookings', () => {
    test('returns future confirmed/pending bookings for coach', async () => {
      const coachId = `coach_${rid()}`;
      const futureTime = new Date(Date.now() + 86400000).toISOString();
      await bookingCrudService.saveBookingDirect(
        makeBooking({ coachId, status: 'CONFIRMED', scheduledAt: futureTime })
      );
      await bookingCrudService.saveBookingDirect(
        makeBooking({ coachId, status: 'PENDING', scheduledAt: futureTime })
      );
      await bookingCrudService.saveBookingDirect(
        makeBooking({ coachId, status: 'CANCELLED', scheduledAt: futureTime })
      );

      const results = await bookingSearchService.getUpcomingBookings(coachId);
      assert.equal(results.length, 2);
    });

    test('excludes past bookings', async () => {
      const coachId = `coach_${rid()}`;
      const pastTime = new Date(Date.now() - 86400000).toISOString();
      await bookingCrudService.saveBookingDirect(
        makeBooking({ coachId, status: 'CONFIRMED', scheduledAt: pastTime })
      );

      const results = await bookingSearchService.getUpcomingBookings(coachId);
      assert.equal(results.length, 0);
    });
  });
});
