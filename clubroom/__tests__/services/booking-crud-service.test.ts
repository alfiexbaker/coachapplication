/**
 * Booking CRUD Service Tests
 *
 * Tests for draft management, list, getBooking, getById, updateBooking,
 * cancel, saveBookingDirect, createMultipleBookings.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { bookingCrudService } from '../../services/booking/booking-crud-service';
import { apiClient } from '../../services/api-client';
import { onTyped, ServiceEvents } from '../../services/event-bus';
import type { Booking } from '../../constants/app-types';

const rid = () => Math.random().toString(36).slice(2, 10);

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: `bk_${rid()}`,
    coachId: `coach_${rid()}`,
    coachName: 'Test Coach',
    athleteId: `ath_${rid()}`,
    athleteIds: [`ath_${rid()}`],
    athleteName: 'Test Athlete',
    bookedById: `parent_${rid()}`,
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    status: 'CONFIRMED',
    duration: 60,
    location: 'Test Venue',
    service: '1-on-1',
    serviceType: '1-on-1',
    objectives: [],
    price: 25,
    notes: '',
    createdAt: new Date().toISOString(),
    ...overrides,
  } as Booking;
}

describe('bookingCrudService', () => {
  beforeEach(async () => {
    await apiClient.remove('clubroom.bookings');
    bookingCrudService.resetDraft();
    eventBus.clearAll();
  });

  // ---------------------------------------------------------------------------
  // Draft methods
  // ---------------------------------------------------------------------------
  describe('draft', () => {
    test('getDraft returns empty object initially', () => {
      const draft = bookingCrudService.getDraft();
      assert.deepEqual(draft, {});
    });

    test('updateDraft merges fields', () => {
      bookingCrudService.updateDraft({ sessionType: '1-on-1', duration: 60 });
      bookingCrudService.updateDraft({ duration: 90, notes: 'Test' });
      const draft = bookingCrudService.getDraft();
      assert.equal(draft.sessionType, '1-on-1');
      assert.equal(draft.duration, 90);
      assert.equal(draft.notes, 'Test');
    });

    test('resetDraft clears all fields', () => {
      bookingCrudService.updateDraft({ sessionType: '1-on-1' });
      bookingCrudService.resetDraft();
      assert.deepEqual(bookingCrudService.getDraft(), {});
    });
  });

  // ---------------------------------------------------------------------------
  // saveBookingDirect + list + getBooking + getById
  // ---------------------------------------------------------------------------
  describe('CRUD', () => {
    test('saveBookingDirect stores booking', async () => {
      const booking = makeBooking();
      const result = await bookingCrudService.saveBookingDirect(booking);
      assert.equal(result.success, true);

      const found = await bookingCrudService.getBooking(booking.id);
      assert.ok(found);
      assert.equal(found!.id, booking.id);
    });

    test('list returns all saved bookings', async () => {
      await bookingCrudService.saveBookingDirect(makeBooking());
      await bookingCrudService.saveBookingDirect(makeBooking());

      const all = await bookingCrudService.list();
      assert.ok(all.length >= 2);
    });

    test('getBooking returns null for unknown id', async () => {
      const found = await bookingCrudService.getBooking(`unknown_${rid()}`);
      assert.equal(found, null);
    });

    test('getById returns undefined for unknown id', async () => {
      const found = await bookingCrudService.getById(`unknown_${rid()}`);
      assert.equal(found, undefined);
    });
  });

  // ---------------------------------------------------------------------------
  // updateBooking
  // ---------------------------------------------------------------------------
  describe('updateBooking', () => {
    test('updates booking and returns ok', async () => {
      const booking = makeBooking();
      await bookingCrudService.saveBookingDirect(booking);

      const result = await bookingCrudService.updateBooking(booking.id, {
        notes: 'Updated notes',
        duration: 90,
      });
      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.notes, 'Updated notes');
        assert.equal(result.data.duration, 90);
      }
    });

    test('returns err for unknown booking', async () => {
      const result = await bookingCrudService.updateBooking(`unknown_${rid()}`, { notes: 'X' });
      assert.equal(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // cancel
  // ---------------------------------------------------------------------------
  describe('cancel', () => {
    test('sets status to CANCELLED and emits event', async () => {
      let emitted = false;
      eventBus.on(ServiceEvents.BOOKING_CANCELLED, () => {
        emitted = true;
      });

      const booking = makeBooking();
      await bookingCrudService.saveBookingDirect(booking);

      const cancelled = await bookingCrudService.cancel(booking.id, 'No longer needed', 'parent');
      assert.ok(cancelled);
      assert.equal(cancelled!.status, 'CANCELLED');
      assert.equal(emitted, true);
    });
  });

  // ---------------------------------------------------------------------------
  // createMultipleBookings
  // ---------------------------------------------------------------------------
  describe('createMultipleBookings', () => {
    test('saves all bookings and emits events', async () => {
      let emitCount = 0;
      eventBus.on(ServiceEvents.BOOKING_CREATED, () => {
        emitCount++;
      });

      const bookings = [makeBooking(), makeBooking(), makeBooking()];
      const result = await bookingCrudService.createMultipleBookings(bookings);

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.length, 3);
      }
      assert.equal(emitCount, 3);
    });
  });

  // ---------------------------------------------------------------------------
  // updateStatus
  // ---------------------------------------------------------------------------
  describe('updateStatus', () => {
    test('changes booking status', async () => {
      const booking = makeBooking({ status: 'PENDING' as Booking['status'] });
      await bookingCrudService.saveBookingDirect(booking);

      const updated = await bookingCrudService.updateStatus(booking.id, 'CONFIRMED');
      assert.ok(updated);
      assert.equal(updated!.status, 'CONFIRMED');
    });
  });
});
