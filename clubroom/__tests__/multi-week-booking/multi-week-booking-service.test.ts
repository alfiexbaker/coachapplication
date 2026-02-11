// @ts-nocheck
/**
 * Multi-Week Booking Service Tests
 *
 * Unit tests for the multi-week booking service that manages BookingSeries --
 * groups of bookings created together when a parent books multiple weeks.
 *
 * Tests cover:
 * - createSeries() with valid params (N bookings + series record)
 * - createSeries() validation errors (empty weeks, missing IDs, no athletes)
 * - getSeriesById() success + not-found
 * - getSeriesForUser() returns only that user's series
 * - getSeriesForCoach() returns only that coach's series
 * - cancelSeries() cancels all bookings + updates series status
 * - cancelSeries() for non-existent series
 * - SERIES_CREATED event emission after successful creation
 * - SERIES_UPDATED event emission after cancellation
 * - Location flows through from params to each booking
 * - createMultipleBookings() with seriesId + seriesIndex on each booking
 * - updateSeriesStatus() status transitions
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach, afterEach } from 'node:test';

import { multiWeekBookingService } from '../../services/multi-week-booking-service';
import { bookingCrudService } from '../../services/booking/booking-crud-service';
import { eventBus, ServiceEvents } from '../../services/event-bus';
import type { CreateSeriesParams } from '../../services/multi-week-booking-service';
import type { Booking } from '../../constants/app-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let testCounter = 0;

/** Generate a unique suffix for test IDs to avoid collisions. */
function uniqueId(prefix: string): string {
  testCounter += 1;
  return `${prefix}-${testCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Build valid CreateSeriesParams with unique IDs. */
function makeSeriesParams(overrides: Partial<CreateSeriesParams> = {}): CreateSeriesParams {
  return {
    createdById: uniqueId('parent'),
    createdByName: 'Test Parent',
    coachId: uniqueId('coach'),
    coachName: 'Coach Sarah',
    athleteIds: [uniqueId('athlete')],
    athleteNames: ['Tommy Test'],
    sessionType: '1-to-1',
    focus: 'Dribbling',
    pricePerSession: 40,
    selectedWeeks: ['2026-03-02', '2026-03-09', '2026-03-16'],
    startTime: '10:00',
    duration: 60,
    location: 'Central Park Pitch 3',
    patternLabel: 'Mon 10:00 x 3 weeks',
    notes: 'Focus on footwork',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

// Track emitted events for assertion
let emittedEvents: { event: string; data: unknown }[] = [];
let unsubscribers: (() => void)[] = [];

beforeEach(() => {
  // Reset event tracking
  emittedEvents = [];
  unsubscribers = [];

  // Listen for series events
  unsubscribers.push(
    eventBus.on(ServiceEvents.SERIES_CREATED, (data) => {
      emittedEvents.push({ event: ServiceEvents.SERIES_CREATED, data });
    })
  );
  unsubscribers.push(
    eventBus.on(ServiceEvents.SERIES_UPDATED, (data) => {
      emittedEvents.push({ event: ServiceEvents.SERIES_UPDATED, data });
    })
  );
  unsubscribers.push(
    eventBus.on(ServiceEvents.BOOKING_CREATED, (data) => {
      emittedEvents.push({ event: ServiceEvents.BOOKING_CREATED, data });
    })
  );
  unsubscribers.push(
    eventBus.on(ServiceEvents.BOOKING_CANCELLED, (data) => {
      emittedEvents.push({ event: ServiceEvents.BOOKING_CANCELLED, data });
    })
  );
});

afterEach(() => {
  // Unsubscribe all listeners
  for (const unsub of unsubscribers) {
    unsub();
  }
});

// ============================================================================
// CREATE SERIES TESTS
// ============================================================================

describe('MultiWeekBookingService - createSeries()', () => {
  test('creates N bookings + BookingSeries record with valid params', async () => {
    const params = makeSeriesParams();

    const result = await multiWeekBookingService.createSeries(params);

    assert.equal(result.success, true, 'Should succeed');
    assert.ok(result.data, 'Should return series data');

    const series = result.data;
    assert.ok(series.id, 'Series should have an ID');
    assert.equal(series.bookingIds.length, 3, 'Should have 3 booking IDs');
    assert.equal(series.createdById, params.createdById);
    assert.equal(series.createdByName, params.createdByName);
    assert.equal(series.coachId, params.coachId);
    assert.equal(series.coachName, params.coachName);
    assert.deepEqual(series.athleteIds, params.athleteIds);
    assert.deepEqual(series.athleteNames, params.athleteNames);
    assert.equal(series.sessionType, '1-to-1');
    assert.equal(series.focus, 'Dribbling');
    assert.equal(series.pricePerSession, 40);
    assert.equal(series.totalCost, 120); // 40 * 3 weeks
    assert.equal(series.location, 'Central Park Pitch 3');
    assert.equal(series.patternLabel, 'Mon 10:00 x 3 weeks');
    assert.equal(series.status, 'ACTIVE');
    assert.ok(series.createdAt, 'Should have createdAt');
    assert.deepEqual(series.selectedWeeks, params.selectedWeeks);
  });

  test('each created booking has correct fields including seriesId and seriesIndex', async () => {
    const params = makeSeriesParams();

    const result = await multiWeekBookingService.createSeries(params);
    assert.equal(result.success, true);

    const series = result.data;

    // Verify each booking was saved to storage
    for (let i = 0; i < series.bookingIds.length; i++) {
      const booking = await bookingCrudService.getBooking(series.bookingIds[i]);
      assert.ok(booking, `Booking ${i} should exist in storage`);
      assert.equal(booking.seriesId, series.id, `Booking ${i} should have seriesId`);
      assert.equal(booking.seriesIndex, i, `Booking ${i} should have seriesIndex ${i}`);
      assert.equal(booking.coachId, params.coachId);
      assert.equal(booking.coachName, params.coachName);
      assert.equal(booking.location, params.location);
      assert.equal(booking.duration, params.duration);
      assert.equal(booking.status, 'CONFIRMED');
      assert.equal(booking.price, 40);
      assert.ok(booking.scheduledAt.includes(params.selectedWeeks[i]));
      assert.ok(booking.scheduledAt.includes('10:00'));
    }
  });

  test('location flows through from params to each booking', async () => {
    const location = 'Riverside Training Ground, Field B';
    const params = makeSeriesParams({ location });

    const result = await multiWeekBookingService.createSeries(params);
    assert.equal(result.success, true);

    for (const bookingId of result.data.bookingIds) {
      const booking = await bookingCrudService.getBooking(bookingId);
      assert.ok(booking, 'Booking should exist');
      assert.equal(booking.location, location, 'Location should flow through to booking');
    }
  });

  test('totalCost is calculated as pricePerSession * number of weeks', async () => {
    const params = makeSeriesParams({
      pricePerSession: 55,
      selectedWeeks: ['2026-04-01', '2026-04-08', '2026-04-15', '2026-04-22'],
    });

    const result = await multiWeekBookingService.createSeries(params);
    assert.equal(result.success, true);
    assert.equal(result.data.totalCost, 220); // 55 * 4
  });

  test('totalCost is 0 when pricePerSession is undefined', async () => {
    const params = makeSeriesParams({ pricePerSession: undefined });

    const result = await multiWeekBookingService.createSeries(params);
    assert.equal(result.success, true);
    assert.equal(result.data.totalCost, 0);
  });

  test('SERIES_CREATED event is emitted after successful creation', async () => {
    const params = makeSeriesParams();

    const result = await multiWeekBookingService.createSeries(params);
    assert.equal(result.success, true);

    const seriesEvent = emittedEvents.find((e) => e.event === ServiceEvents.SERIES_CREATED);
    assert.ok(seriesEvent, 'SERIES_CREATED event should have been emitted');

    const payload = seriesEvent.data as {
      seriesId: string;
      coachId: string;
      coachName: string;
      createdById: string;
      bookingIds: string[];
      weekCount: number;
      totalCost: number;
      location: string;
    };
    assert.equal(payload.seriesId, result.data.id);
    assert.equal(payload.coachId, params.coachId);
    assert.equal(payload.coachName, params.coachName);
    assert.equal(payload.createdById, params.createdById);
    assert.equal(payload.bookingIds.length, 3);
    assert.equal(payload.weekCount, 3);
    assert.equal(payload.totalCost, 120);
    assert.equal(payload.location, params.location);
  });

  test('sessionInviteId is stored on series and bookings when provided', async () => {
    const inviteId = uniqueId('invite');
    const params = makeSeriesParams({ sessionInviteId: inviteId });

    const result = await multiWeekBookingService.createSeries(params);
    assert.equal(result.success, true);
    assert.equal(result.data.sessionInviteId, inviteId);

    // Verify bookings also have the invite ID
    const booking = await bookingCrudService.getBooking(result.data.bookingIds[0]);
    assert.ok(booking);
    assert.equal(booking.sessionInviteId, inviteId);
  });

  test('shared session is flagged when multiple athletes', async () => {
    const params = makeSeriesParams({
      athleteIds: [uniqueId('athlete'), uniqueId('athlete')],
      athleteNames: ['Tommy', 'Jenny'],
    });

    const result = await multiWeekBookingService.createSeries(params);
    assert.equal(result.success, true);

    const booking = await bookingCrudService.getBooking(result.data.bookingIds[0]);
    assert.ok(booking);
    assert.equal(booking.isSharedSession, true);
    assert.equal(booking.athleteIds?.length, 2);
  });
});

// ============================================================================
// CREATE SERIES VALIDATION ERROR TESTS
// ============================================================================

describe('MultiWeekBookingService - createSeries() validation errors', () => {
  test('returns error when selectedWeeks is empty', async () => {
    const params = makeSeriesParams({ selectedWeeks: [] });

    const result = await multiWeekBookingService.createSeries(params);

    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.equal(result.error.code, 'VALIDATION');
    assert.ok(result.error.message.includes('week'));
  });

  test('returns error when coachId is empty', async () => {
    const params = makeSeriesParams({ coachId: '' });

    const result = await multiWeekBookingService.createSeries(params);

    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.equal(result.error.code, 'VALIDATION');
    assert.ok(result.error.message.includes('required'));
  });

  test('returns error when createdById is empty', async () => {
    const params = makeSeriesParams({ createdById: '' });

    const result = await multiWeekBookingService.createSeries(params);

    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.equal(result.error.code, 'VALIDATION');
  });

  test('returns error when athleteIds is empty', async () => {
    const params = makeSeriesParams({ athleteIds: [] });

    const result = await multiWeekBookingService.createSeries(params);

    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.equal(result.error.code, 'VALIDATION');
    assert.ok(result.error.message.includes('athlete'));
  });

  test('no SERIES_CREATED event is emitted on validation failure', async () => {
    const params = makeSeriesParams({ selectedWeeks: [] });

    await multiWeekBookingService.createSeries(params);

    const seriesEvent = emittedEvents.find((e) => e.event === ServiceEvents.SERIES_CREATED);
    assert.equal(seriesEvent, undefined, 'No SERIES_CREATED should be emitted');
  });
});

// ============================================================================
// GET SERIES TESTS
// ============================================================================

describe('MultiWeekBookingService - getSeriesById()', () => {
  test('returns series with all fields for a valid ID', async () => {
    const params = makeSeriesParams();
    const createResult = await multiWeekBookingService.createSeries(params);
    assert.equal(createResult.success, true);

    const getResult = await multiWeekBookingService.getSeriesById(createResult.data.id);

    assert.equal(getResult.success, true);
    assert.ok(getResult.data);
    assert.equal(getResult.data.id, createResult.data.id);
    assert.equal(getResult.data.coachId, params.coachId);
    assert.equal(getResult.data.coachName, params.coachName);
    assert.equal(getResult.data.createdById, params.createdById);
    assert.equal(getResult.data.location, params.location);
    assert.equal(getResult.data.status, 'ACTIVE');
    assert.deepEqual(getResult.data.selectedWeeks, params.selectedWeeks);
    assert.equal(getResult.data.bookingIds.length, 3);
    assert.equal(getResult.data.totalCost, 120);
    assert.equal(getResult.data.patternLabel, params.patternLabel);
  });

  test('returns NOT_FOUND error for non-existent ID', async () => {
    const getResult = await multiWeekBookingService.getSeriesById('nonexistent-series-id');

    assert.equal(getResult.success, false);
    assert.ok(getResult.error);
    assert.equal(getResult.error.code, 'NOT_FOUND');
  });
});

// ============================================================================
// GET SERIES FOR USER TESTS
// ============================================================================

describe('MultiWeekBookingService - getSeriesForUser()', () => {
  test('returns only series created by the specified user', async () => {
    const userId1 = uniqueId('parent');
    const userId2 = uniqueId('parent');

    // Create series for user 1
    await multiWeekBookingService.createSeries(
      makeSeriesParams({ createdById: userId1, createdByName: 'User One' })
    );
    await multiWeekBookingService.createSeries(
      makeSeriesParams({ createdById: userId1, createdByName: 'User One' })
    );

    // Create series for user 2
    await multiWeekBookingService.createSeries(
      makeSeriesParams({ createdById: userId2, createdByName: 'User Two' })
    );

    const result = await multiWeekBookingService.getSeriesForUser(userId1);

    assert.equal(result.success, true);
    assert.ok(result.data);
    assert.equal(result.data.length, 2, 'Should return 2 series for user 1');
    assert.ok(
      result.data.every((s) => s.createdById === userId1),
      'All series should belong to user 1'
    );
  });

  test('returns empty array for user with no series', async () => {
    const result = await multiWeekBookingService.getSeriesForUser('no-series-user-xyz');

    assert.equal(result.success, true);
    assert.ok(result.data);
    assert.equal(result.data.length, 0);
  });
});

// ============================================================================
// GET SERIES FOR COACH TESTS
// ============================================================================

describe('MultiWeekBookingService - getSeriesForCoach()', () => {
  test('returns only series for the specified coach', async () => {
    const coachId1 = uniqueId('coach');
    const coachId2 = uniqueId('coach');

    await multiWeekBookingService.createSeries(
      makeSeriesParams({ coachId: coachId1, coachName: 'Coach A' })
    );
    await multiWeekBookingService.createSeries(
      makeSeriesParams({ coachId: coachId2, coachName: 'Coach B' })
    );

    const result = await multiWeekBookingService.getSeriesForCoach(coachId1);

    assert.equal(result.success, true);
    assert.ok(result.data);
    assert.equal(result.data.length, 1);
    assert.equal(result.data[0].coachId, coachId1);
  });
});

// ============================================================================
// CANCEL SERIES TESTS
// ============================================================================

describe('MultiWeekBookingService - cancelSeries()', () => {
  test('cancels all bookings in series and updates series status to CANCELLED', async () => {
    const params = makeSeriesParams();
    const createResult = await multiWeekBookingService.createSeries(params);
    assert.equal(createResult.success, true);

    const seriesId = createResult.data.id;
    const bookingIds = createResult.data.bookingIds;

    const cancelResult = await multiWeekBookingService.cancelSeries(seriesId, 'Change of plans');

    assert.equal(cancelResult.success, true);
    assert.ok(cancelResult.data);
    assert.equal(cancelResult.data.status, 'CANCELLED');

    // Verify each booking was cancelled
    for (const bookingId of bookingIds) {
      const booking = await bookingCrudService.getBooking(bookingId);
      assert.ok(booking, 'Booking should still exist');
      assert.equal(booking.status, 'CANCELLED', `Booking ${bookingId} should be cancelled`);
    }
  });

  test('emits SERIES_UPDATED event after cancellation', async () => {
    const params = makeSeriesParams();
    const createResult = await multiWeekBookingService.createSeries(params);
    assert.equal(createResult.success, true);

    // Clear events from creation
    emittedEvents = [];

    await multiWeekBookingService.cancelSeries(createResult.data.id, 'No longer needed');

    const updateEvent = emittedEvents.find((e) => e.event === ServiceEvents.SERIES_UPDATED);
    assert.ok(updateEvent, 'SERIES_UPDATED event should be emitted');

    const payload = updateEvent.data as {
      seriesId: string;
      status: string;
      changes: Record<string, unknown>;
    };
    assert.equal(payload.seriesId, createResult.data.id);
    assert.equal(payload.status, 'CANCELLED');
    assert.deepEqual(payload.changes, { reason: 'No longer needed' });
  });

  test('returns NOT_FOUND error for non-existent series', async () => {
    const cancelResult = await multiWeekBookingService.cancelSeries('nonexistent-series-id');

    assert.equal(cancelResult.success, false);
    assert.ok(cancelResult.error);
    assert.equal(cancelResult.error.code, 'NOT_FOUND');
  });

  test('getSeriesById returns CANCELLED status after cancel', async () => {
    const params = makeSeriesParams();
    const createResult = await multiWeekBookingService.createSeries(params);
    assert.equal(createResult.success, true);

    await multiWeekBookingService.cancelSeries(createResult.data.id);

    const getResult = await multiWeekBookingService.getSeriesById(createResult.data.id);
    assert.equal(getResult.success, true);
    assert.equal(getResult.data.status, 'CANCELLED');
  });
});

// ============================================================================
// CREATE MULTIPLE BOOKINGS TESTS (on BookingCrudService)
// ============================================================================

describe('BookingCrudService - createMultipleBookings()', () => {
  test('saves all bookings with seriesId and seriesIndex', async () => {
    const seriesId = uniqueId('series');
    const bookings: Booking[] = [
      {
        id: uniqueId('booking'),
        coachId: 'coach-1',
        coachName: 'Coach A',
        athleteIds: ['athlete-1'],
        athleteId: 'athlete-1',
        athleteName: 'Tom',
        bookedById: 'parent-1',
        scheduledAt: '2026-03-02T10:00:00',
        status: 'CONFIRMED',
        duration: 60,
        location: 'Field A',
        service: '1-to-1',
        serviceType: '1-to-1',
        price: 45,
        seriesId,
        seriesIndex: 0,
      },
      {
        id: uniqueId('booking'),
        coachId: 'coach-1',
        coachName: 'Coach A',
        athleteIds: ['athlete-1'],
        athleteId: 'athlete-1',
        athleteName: 'Tom',
        bookedById: 'parent-1',
        scheduledAt: '2026-03-09T10:00:00',
        status: 'CONFIRMED',
        duration: 60,
        location: 'Field A',
        service: '1-to-1',
        serviceType: '1-to-1',
        price: 45,
        seriesId,
        seriesIndex: 1,
      },
    ];

    const result = await bookingCrudService.createMultipleBookings(bookings);

    assert.equal(result.success, true);
    assert.ok(result.data);
    assert.equal(result.data.length, 2);

    // Verify from storage
    for (let i = 0; i < bookings.length; i++) {
      const stored = await bookingCrudService.getBooking(bookings[i].id);
      assert.ok(stored, `Booking ${i} should be in storage`);
      assert.equal(stored.seriesId, seriesId);
      assert.equal(stored.seriesIndex, i);
      assert.equal(stored.location, 'Field A');
    }
  });

  test('emits BOOKING_CREATED events for each booking in batch', async () => {
    // Clear events
    emittedEvents = [];

    const seriesId = uniqueId('series');
    const bookings: Booking[] = [
      {
        id: uniqueId('booking'),
        coachId: 'coach-batch',
        coachName: 'Coach Batch',
        athleteIds: ['ath-1'],
        athleteId: 'ath-1',
        athleteName: 'Ath One',
        bookedById: 'parent-batch',
        scheduledAt: '2026-04-01T09:00:00',
        status: 'CONFIRMED',
        duration: 60,
        location: 'Court 1',
        service: '1-to-1',
        price: 30,
        seriesId,
        seriesIndex: 0,
      },
      {
        id: uniqueId('booking'),
        coachId: 'coach-batch',
        coachName: 'Coach Batch',
        athleteIds: ['ath-1'],
        athleteId: 'ath-1',
        athleteName: 'Ath One',
        bookedById: 'parent-batch',
        scheduledAt: '2026-04-08T09:00:00',
        status: 'CONFIRMED',
        duration: 60,
        location: 'Court 1',
        service: '1-to-1',
        price: 30,
        seriesId,
        seriesIndex: 1,
      },
    ];

    await bookingCrudService.createMultipleBookings(bookings);

    const bookingEvents = emittedEvents.filter(
      (e) => e.event === ServiceEvents.BOOKING_CREATED
    );
    assert.equal(bookingEvents.length, 2, 'Should emit 2 BOOKING_CREATED events');
  });
});

// ============================================================================
// UPDATE SERIES STATUS TESTS
// ============================================================================

describe('MultiWeekBookingService - updateSeriesStatus()', () => {
  test('returns NOT_FOUND for non-existent series', async () => {
    const result = await multiWeekBookingService.updateSeriesStatus('nonexistent-series-xyz');

    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.equal(result.error.code, 'NOT_FOUND');
  });

  test('keeps ACTIVE status when no bookings have changed', async () => {
    const params = makeSeriesParams();
    const createResult = await multiWeekBookingService.createSeries(params);
    assert.equal(createResult.success, true);

    const updateResult = await multiWeekBookingService.updateSeriesStatus(createResult.data.id);

    assert.equal(updateResult.success, true);
    assert.equal(updateResult.data.status, 'ACTIVE');
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('MultiWeekBookingService - Edge Cases', () => {
  test('single week series works correctly', async () => {
    const params = makeSeriesParams({
      selectedWeeks: ['2026-06-01'],
    });

    const result = await multiWeekBookingService.createSeries(params);

    assert.equal(result.success, true);
    assert.equal(result.data.bookingIds.length, 1);
    assert.equal(result.data.totalCost, 40); // 40 * 1
    assert.equal(result.data.selectedWeeks.length, 1);
  });

  test('focus field is optional and passes through to booking objectives', async () => {
    const params = makeSeriesParams({ focus: undefined });

    const result = await multiWeekBookingService.createSeries(params);
    assert.equal(result.success, true);
    assert.equal(result.data.focus, undefined);

    const booking = await bookingCrudService.getBooking(result.data.bookingIds[0]);
    assert.ok(booking);
    assert.deepEqual(booking.objectives, []);
  });

  test('focus field populates booking objectives when provided', async () => {
    const params = makeSeriesParams({ focus: 'Ball control' });

    const result = await multiWeekBookingService.createSeries(params);
    assert.equal(result.success, true);

    const booking = await bookingCrudService.getBooking(result.data.bookingIds[0]);
    assert.ok(booking);
    assert.deepEqual(booking.objectives, ['Ball control']);
  });

  test('notes field is optional and defaults correctly', async () => {
    const params = makeSeriesParams({ notes: undefined });

    const result = await multiWeekBookingService.createSeries(params);
    assert.equal(result.success, true);

    const booking = await bookingCrudService.getBooking(result.data.bookingIds[0]);
    assert.ok(booking);
    assert.equal(booking.notes, '');
  });

  test('many weeks (8) creates correct number of bookings', async () => {
    const weeks = [
      '2026-05-04', '2026-05-11', '2026-05-18', '2026-05-25',
      '2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22',
    ];
    const params = makeSeriesParams({
      selectedWeeks: weeks,
      pricePerSession: 35,
    });

    const result = await multiWeekBookingService.createSeries(params);

    assert.equal(result.success, true);
    assert.equal(result.data.bookingIds.length, 8);
    assert.equal(result.data.totalCost, 280); // 35 * 8
  });
});
