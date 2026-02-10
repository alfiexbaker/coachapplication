/**
 * Booking Status Service Tests
 *
 * Tests for booking status transitions: confirmBooking,
 * checkAndTransitionStatus, scheduleSessionReminders.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { bookingStatusService } from '../../services/booking/booking-status-service';
import { bookingCrudService } from '../../services/booking/booking-crud-service';
import { apiClient } from '../../services/api-client';
import { eventBus, ServiceEvents } from '../../services/event-bus';

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
    status: 'PENDING' as const,
    location: 'Test Venue',
    sport: 'Football',
    price: 35,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('bookingStatusService', () => {
  beforeEach(async () => {
    await apiClient.remove('clubroom.bookings');
    eventBus.clearAll();
  });

  // ---------------------------------------------------------------------------
  // confirmBooking
  // ---------------------------------------------------------------------------
  describe('confirmBooking', () => {
    test('confirms a pending booking', async () => {
      const booking = makeBooking();
      await bookingCrudService.saveBookingDirect(booking);

      const result = await bookingStatusService.confirmBooking(booking.id);
      assert.equal(result.success, true);

      const updated = await bookingCrudService.getBooking(booking.id);
      assert.equal(updated?.status, 'CONFIRMED');
    });

    test('emits BOOKING_CONFIRMED event', async () => {
      const booking = makeBooking();
      await bookingCrudService.saveBookingDirect(booking);

      let emitted = false;
      eventBus.on(ServiceEvents.BOOKING_CONFIRMED, () => { emitted = true; });

      await bookingStatusService.confirmBooking(booking.id);
      assert.equal(emitted, true);
    });

    test('returns error for nonexistent booking', async () => {
      const result = await bookingStatusService.confirmBooking(`nonexistent_${rid()}`);
      assert.equal(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // checkAndTransitionStatus
  // ---------------------------------------------------------------------------
  describe('checkAndTransitionStatus', () => {
    test('transitions past confirmed booking to AWAITING_COMPLETION', async () => {
      const pastTime = new Date(Date.now() - 7200000).toISOString();
      const booking = makeBooking({ status: 'CONFIRMED', scheduledAt: pastTime, duration: 60 });
      await bookingCrudService.saveBookingDirect(booking);

      const result = await bookingStatusService.checkAndTransitionStatus(booking.id);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.status, 'AWAITING_COMPLETION');
      }
    });

    test('does not transition future confirmed booking', async () => {
      const futureTime = new Date(Date.now() + 86400000).toISOString();
      const booking = makeBooking({ status: 'CONFIRMED', scheduledAt: futureTime });
      await bookingCrudService.saveBookingDirect(booking);

      const result = await bookingStatusService.checkAndTransitionStatus(booking.id);
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.status, 'CONFIRMED');
      }
    });

    test('returns err for nonexistent booking', async () => {
      const result = await bookingStatusService.checkAndTransitionStatus(`nonexistent_${rid()}`);
      assert.equal(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // scheduleSessionReminders
  // ---------------------------------------------------------------------------
  describe('scheduleSessionReminders', () => {
    test('does not throw', async () => {
      await assert.doesNotReject(bookingStatusService.scheduleSessionReminders());
    });
  });
});
