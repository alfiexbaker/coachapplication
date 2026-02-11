"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importStar(require("node:test"));
const multi_week_booking_service_1 = require("../../services/multi-week-booking-service");
const booking_crud_service_1 = require("../../services/booking/booking-crud-service");
const event_bus_1 = require("../../services/event-bus");
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let testCounter = 0;
/** Generate a unique suffix for test IDs to avoid collisions. */
function uniqueId(prefix) {
    testCounter += 1;
    return `${prefix}-${testCounter}-${Math.random().toString(36).slice(2, 8)}`;
}
/** Build valid CreateSeriesParams with unique IDs. */
function makeSeriesParams(overrides = {}) {
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
let emittedEvents = [];
let unsubscribers = [];
(0, node_test_1.beforeEach)(() => {
    // Reset event tracking
    emittedEvents = [];
    unsubscribers = [];
    // Listen for series events
    unsubscribers.push(event_bus_1.eventBus.on(event_bus_1.ServiceEvents.SERIES_CREATED, (data) => {
        emittedEvents.push({ event: event_bus_1.ServiceEvents.SERIES_CREATED, data });
    }));
    unsubscribers.push(event_bus_1.eventBus.on(event_bus_1.ServiceEvents.SERIES_UPDATED, (data) => {
        emittedEvents.push({ event: event_bus_1.ServiceEvents.SERIES_UPDATED, data });
    }));
    unsubscribers.push(event_bus_1.eventBus.on(event_bus_1.ServiceEvents.BOOKING_CREATED, (data) => {
        emittedEvents.push({ event: event_bus_1.ServiceEvents.BOOKING_CREATED, data });
    }));
    unsubscribers.push(event_bus_1.eventBus.on(event_bus_1.ServiceEvents.BOOKING_CANCELLED, (data) => {
        emittedEvents.push({ event: event_bus_1.ServiceEvents.BOOKING_CANCELLED, data });
    }));
});
(0, node_test_1.afterEach)(() => {
    // Unsubscribe all listeners
    for (const unsub of unsubscribers) {
        unsub();
    }
});
// ============================================================================
// CREATE SERIES TESTS
// ============================================================================
(0, node_test_1.describe)('MultiWeekBookingService - createSeries()', () => {
    (0, node_test_1.default)('creates N bookings + BookingSeries record with valid params', async () => {
        const params = makeSeriesParams();
        const result = await multi_week_booking_service_1.multiWeekBookingService.createSeries(params);
        strict_1.default.equal(result.success, true, 'Should succeed');
        strict_1.default.ok(result.data, 'Should return series data');
        const series = result.data;
        strict_1.default.ok(series.id, 'Series should have an ID');
        strict_1.default.equal(series.bookingIds.length, 3, 'Should have 3 booking IDs');
        strict_1.default.equal(series.createdById, params.createdById);
        strict_1.default.equal(series.createdByName, params.createdByName);
        strict_1.default.equal(series.coachId, params.coachId);
        strict_1.default.equal(series.coachName, params.coachName);
        strict_1.default.deepEqual(series.athleteIds, params.athleteIds);
        strict_1.default.deepEqual(series.athleteNames, params.athleteNames);
        strict_1.default.equal(series.sessionType, '1-to-1');
        strict_1.default.equal(series.focus, 'Dribbling');
        strict_1.default.equal(series.pricePerSession, 40);
        strict_1.default.equal(series.totalCost, 120); // 40 * 3 weeks
        strict_1.default.equal(series.location, 'Central Park Pitch 3');
        strict_1.default.equal(series.patternLabel, 'Mon 10:00 x 3 weeks');
        strict_1.default.equal(series.status, 'ACTIVE');
        strict_1.default.ok(series.createdAt, 'Should have createdAt');
        strict_1.default.deepEqual(series.selectedWeeks, params.selectedWeeks);
    });
    (0, node_test_1.default)('each created booking has correct fields including seriesId and seriesIndex', async () => {
        const params = makeSeriesParams();
        const result = await multi_week_booking_service_1.multiWeekBookingService.createSeries(params);
        strict_1.default.equal(result.success, true);
        const series = result.data;
        // Verify each booking was saved to storage
        for (let i = 0; i < series.bookingIds.length; i++) {
            const booking = await booking_crud_service_1.bookingCrudService.getBooking(series.bookingIds[i]);
            strict_1.default.ok(booking, `Booking ${i} should exist in storage`);
            strict_1.default.equal(booking.seriesId, series.id, `Booking ${i} should have seriesId`);
            strict_1.default.equal(booking.seriesIndex, i, `Booking ${i} should have seriesIndex ${i}`);
            strict_1.default.equal(booking.coachId, params.coachId);
            strict_1.default.equal(booking.coachName, params.coachName);
            strict_1.default.equal(booking.location, params.location);
            strict_1.default.equal(booking.duration, params.duration);
            strict_1.default.equal(booking.status, 'CONFIRMED');
            strict_1.default.equal(booking.price, 40);
            strict_1.default.ok(booking.scheduledAt.includes(params.selectedWeeks[i]));
            strict_1.default.ok(booking.scheduledAt.includes('10:00'));
        }
    });
    (0, node_test_1.default)('location flows through from params to each booking', async () => {
        const location = 'Riverside Training Ground, Field B';
        const params = makeSeriesParams({ location });
        const result = await multi_week_booking_service_1.multiWeekBookingService.createSeries(params);
        strict_1.default.equal(result.success, true);
        for (const bookingId of result.data.bookingIds) {
            const booking = await booking_crud_service_1.bookingCrudService.getBooking(bookingId);
            strict_1.default.ok(booking, 'Booking should exist');
            strict_1.default.equal(booking.location, location, 'Location should flow through to booking');
        }
    });
    (0, node_test_1.default)('totalCost is calculated as pricePerSession * number of weeks', async () => {
        const params = makeSeriesParams({
            pricePerSession: 55,
            selectedWeeks: ['2026-04-01', '2026-04-08', '2026-04-15', '2026-04-22'],
        });
        const result = await multi_week_booking_service_1.multiWeekBookingService.createSeries(params);
        strict_1.default.equal(result.success, true);
        strict_1.default.equal(result.data.totalCost, 220); // 55 * 4
    });
    (0, node_test_1.default)('totalCost is 0 when pricePerSession is undefined', async () => {
        const params = makeSeriesParams({ pricePerSession: undefined });
        const result = await multi_week_booking_service_1.multiWeekBookingService.createSeries(params);
        strict_1.default.equal(result.success, true);
        strict_1.default.equal(result.data.totalCost, 0);
    });
    (0, node_test_1.default)('SERIES_CREATED event is emitted after successful creation', async () => {
        const params = makeSeriesParams();
        const result = await multi_week_booking_service_1.multiWeekBookingService.createSeries(params);
        strict_1.default.equal(result.success, true);
        const seriesEvent = emittedEvents.find((e) => e.event === event_bus_1.ServiceEvents.SERIES_CREATED);
        strict_1.default.ok(seriesEvent, 'SERIES_CREATED event should have been emitted');
        const payload = seriesEvent.data;
        strict_1.default.equal(payload.seriesId, result.data.id);
        strict_1.default.equal(payload.coachId, params.coachId);
        strict_1.default.equal(payload.coachName, params.coachName);
        strict_1.default.equal(payload.createdById, params.createdById);
        strict_1.default.equal(payload.bookingIds.length, 3);
        strict_1.default.equal(payload.weekCount, 3);
        strict_1.default.equal(payload.totalCost, 120);
        strict_1.default.equal(payload.location, params.location);
    });
    (0, node_test_1.default)('sessionInviteId is stored on series and bookings when provided', async () => {
        const inviteId = uniqueId('invite');
        const params = makeSeriesParams({ sessionInviteId: inviteId });
        const result = await multi_week_booking_service_1.multiWeekBookingService.createSeries(params);
        strict_1.default.equal(result.success, true);
        strict_1.default.equal(result.data.sessionInviteId, inviteId);
        // Verify bookings also have the invite ID
        const booking = await booking_crud_service_1.bookingCrudService.getBooking(result.data.bookingIds[0]);
        strict_1.default.ok(booking);
        strict_1.default.equal(booking.sessionInviteId, inviteId);
    });
    (0, node_test_1.default)('shared session is flagged when multiple athletes', async () => {
        const params = makeSeriesParams({
            athleteIds: [uniqueId('athlete'), uniqueId('athlete')],
            athleteNames: ['Tommy', 'Jenny'],
        });
        const result = await multi_week_booking_service_1.multiWeekBookingService.createSeries(params);
        strict_1.default.equal(result.success, true);
        const booking = await booking_crud_service_1.bookingCrudService.getBooking(result.data.bookingIds[0]);
        strict_1.default.ok(booking);
        strict_1.default.equal(booking.isSharedSession, true);
        strict_1.default.equal(booking.athleteIds?.length, 2);
    });
});
// ============================================================================
// CREATE SERIES VALIDATION ERROR TESTS
// ============================================================================
(0, node_test_1.describe)('MultiWeekBookingService - createSeries() validation errors', () => {
    (0, node_test_1.default)('returns error when selectedWeeks is empty', async () => {
        const params = makeSeriesParams({ selectedWeeks: [] });
        const result = await multi_week_booking_service_1.multiWeekBookingService.createSeries(params);
        strict_1.default.equal(result.success, false);
        strict_1.default.ok(result.error);
        strict_1.default.equal(result.error.code, 'VALIDATION');
        strict_1.default.ok(result.error.message.includes('week'));
    });
    (0, node_test_1.default)('returns error when coachId is empty', async () => {
        const params = makeSeriesParams({ coachId: '' });
        const result = await multi_week_booking_service_1.multiWeekBookingService.createSeries(params);
        strict_1.default.equal(result.success, false);
        strict_1.default.ok(result.error);
        strict_1.default.equal(result.error.code, 'VALIDATION');
        strict_1.default.ok(result.error.message.includes('required'));
    });
    (0, node_test_1.default)('returns error when createdById is empty', async () => {
        const params = makeSeriesParams({ createdById: '' });
        const result = await multi_week_booking_service_1.multiWeekBookingService.createSeries(params);
        strict_1.default.equal(result.success, false);
        strict_1.default.ok(result.error);
        strict_1.default.equal(result.error.code, 'VALIDATION');
    });
    (0, node_test_1.default)('returns error when athleteIds is empty', async () => {
        const params = makeSeriesParams({ athleteIds: [] });
        const result = await multi_week_booking_service_1.multiWeekBookingService.createSeries(params);
        strict_1.default.equal(result.success, false);
        strict_1.default.ok(result.error);
        strict_1.default.equal(result.error.code, 'VALIDATION');
        strict_1.default.ok(result.error.message.includes('athlete'));
    });
    (0, node_test_1.default)('no SERIES_CREATED event is emitted on validation failure', async () => {
        const params = makeSeriesParams({ selectedWeeks: [] });
        await multi_week_booking_service_1.multiWeekBookingService.createSeries(params);
        const seriesEvent = emittedEvents.find((e) => e.event === event_bus_1.ServiceEvents.SERIES_CREATED);
        strict_1.default.equal(seriesEvent, undefined, 'No SERIES_CREATED should be emitted');
    });
});
// ============================================================================
// GET SERIES TESTS
// ============================================================================
(0, node_test_1.describe)('MultiWeekBookingService - getSeriesById()', () => {
    (0, node_test_1.default)('returns series with all fields for a valid ID', async () => {
        const params = makeSeriesParams();
        const createResult = await multi_week_booking_service_1.multiWeekBookingService.createSeries(params);
        strict_1.default.equal(createResult.success, true);
        const getResult = await multi_week_booking_service_1.multiWeekBookingService.getSeriesById(createResult.data.id);
        strict_1.default.equal(getResult.success, true);
        strict_1.default.ok(getResult.data);
        strict_1.default.equal(getResult.data.id, createResult.data.id);
        strict_1.default.equal(getResult.data.coachId, params.coachId);
        strict_1.default.equal(getResult.data.coachName, params.coachName);
        strict_1.default.equal(getResult.data.createdById, params.createdById);
        strict_1.default.equal(getResult.data.location, params.location);
        strict_1.default.equal(getResult.data.status, 'ACTIVE');
        strict_1.default.deepEqual(getResult.data.selectedWeeks, params.selectedWeeks);
        strict_1.default.equal(getResult.data.bookingIds.length, 3);
        strict_1.default.equal(getResult.data.totalCost, 120);
        strict_1.default.equal(getResult.data.patternLabel, params.patternLabel);
    });
    (0, node_test_1.default)('returns NOT_FOUND error for non-existent ID', async () => {
        const getResult = await multi_week_booking_service_1.multiWeekBookingService.getSeriesById('nonexistent-series-id');
        strict_1.default.equal(getResult.success, false);
        strict_1.default.ok(getResult.error);
        strict_1.default.equal(getResult.error.code, 'NOT_FOUND');
    });
});
// ============================================================================
// GET SERIES FOR USER TESTS
// ============================================================================
(0, node_test_1.describe)('MultiWeekBookingService - getSeriesForUser()', () => {
    (0, node_test_1.default)('returns only series created by the specified user', async () => {
        const userId1 = uniqueId('parent');
        const userId2 = uniqueId('parent');
        // Create series for user 1
        await multi_week_booking_service_1.multiWeekBookingService.createSeries(makeSeriesParams({ createdById: userId1, createdByName: 'User One' }));
        await multi_week_booking_service_1.multiWeekBookingService.createSeries(makeSeriesParams({ createdById: userId1, createdByName: 'User One' }));
        // Create series for user 2
        await multi_week_booking_service_1.multiWeekBookingService.createSeries(makeSeriesParams({ createdById: userId2, createdByName: 'User Two' }));
        const result = await multi_week_booking_service_1.multiWeekBookingService.getSeriesForUser(userId1);
        strict_1.default.equal(result.success, true);
        strict_1.default.ok(result.data);
        strict_1.default.equal(result.data.length, 2, 'Should return 2 series for user 1');
        strict_1.default.ok(result.data.every((s) => s.createdById === userId1), 'All series should belong to user 1');
    });
    (0, node_test_1.default)('returns empty array for user with no series', async () => {
        const result = await multi_week_booking_service_1.multiWeekBookingService.getSeriesForUser('no-series-user-xyz');
        strict_1.default.equal(result.success, true);
        strict_1.default.ok(result.data);
        strict_1.default.equal(result.data.length, 0);
    });
});
// ============================================================================
// GET SERIES FOR COACH TESTS
// ============================================================================
(0, node_test_1.describe)('MultiWeekBookingService - getSeriesForCoach()', () => {
    (0, node_test_1.default)('returns only series for the specified coach', async () => {
        const coachId1 = uniqueId('coach');
        const coachId2 = uniqueId('coach');
        await multi_week_booking_service_1.multiWeekBookingService.createSeries(makeSeriesParams({ coachId: coachId1, coachName: 'Coach A' }));
        await multi_week_booking_service_1.multiWeekBookingService.createSeries(makeSeriesParams({ coachId: coachId2, coachName: 'Coach B' }));
        const result = await multi_week_booking_service_1.multiWeekBookingService.getSeriesForCoach(coachId1);
        strict_1.default.equal(result.success, true);
        strict_1.default.ok(result.data);
        strict_1.default.equal(result.data.length, 1);
        strict_1.default.equal(result.data[0].coachId, coachId1);
    });
});
// ============================================================================
// CANCEL SERIES TESTS
// ============================================================================
(0, node_test_1.describe)('MultiWeekBookingService - cancelSeries()', () => {
    (0, node_test_1.default)('cancels all bookings in series and updates series status to CANCELLED', async () => {
        const params = makeSeriesParams();
        const createResult = await multi_week_booking_service_1.multiWeekBookingService.createSeries(params);
        strict_1.default.equal(createResult.success, true);
        const seriesId = createResult.data.id;
        const bookingIds = createResult.data.bookingIds;
        const cancelResult = await multi_week_booking_service_1.multiWeekBookingService.cancelSeries(seriesId, 'Change of plans');
        strict_1.default.equal(cancelResult.success, true);
        strict_1.default.ok(cancelResult.data);
        strict_1.default.equal(cancelResult.data.status, 'CANCELLED');
        // Verify each booking was cancelled
        for (const bookingId of bookingIds) {
            const booking = await booking_crud_service_1.bookingCrudService.getBooking(bookingId);
            strict_1.default.ok(booking, 'Booking should still exist');
            strict_1.default.equal(booking.status, 'CANCELLED', `Booking ${bookingId} should be cancelled`);
        }
    });
    (0, node_test_1.default)('emits SERIES_UPDATED event after cancellation', async () => {
        const params = makeSeriesParams();
        const createResult = await multi_week_booking_service_1.multiWeekBookingService.createSeries(params);
        strict_1.default.equal(createResult.success, true);
        // Clear events from creation
        emittedEvents = [];
        await multi_week_booking_service_1.multiWeekBookingService.cancelSeries(createResult.data.id, 'No longer needed');
        const updateEvent = emittedEvents.find((e) => e.event === event_bus_1.ServiceEvents.SERIES_UPDATED);
        strict_1.default.ok(updateEvent, 'SERIES_UPDATED event should be emitted');
        const payload = updateEvent.data;
        strict_1.default.equal(payload.seriesId, createResult.data.id);
        strict_1.default.equal(payload.status, 'CANCELLED');
        strict_1.default.deepEqual(payload.changes, { reason: 'No longer needed' });
    });
    (0, node_test_1.default)('returns NOT_FOUND error for non-existent series', async () => {
        const cancelResult = await multi_week_booking_service_1.multiWeekBookingService.cancelSeries('nonexistent-series-id');
        strict_1.default.equal(cancelResult.success, false);
        strict_1.default.ok(cancelResult.error);
        strict_1.default.equal(cancelResult.error.code, 'NOT_FOUND');
    });
    (0, node_test_1.default)('getSeriesById returns CANCELLED status after cancel', async () => {
        const params = makeSeriesParams();
        const createResult = await multi_week_booking_service_1.multiWeekBookingService.createSeries(params);
        strict_1.default.equal(createResult.success, true);
        await multi_week_booking_service_1.multiWeekBookingService.cancelSeries(createResult.data.id);
        const getResult = await multi_week_booking_service_1.multiWeekBookingService.getSeriesById(createResult.data.id);
        strict_1.default.equal(getResult.success, true);
        strict_1.default.equal(getResult.data.status, 'CANCELLED');
    });
});
// ============================================================================
// CREATE MULTIPLE BOOKINGS TESTS (on BookingCrudService)
// ============================================================================
(0, node_test_1.describe)('BookingCrudService - createMultipleBookings()', () => {
    (0, node_test_1.default)('saves all bookings with seriesId and seriesIndex', async () => {
        const seriesId = uniqueId('series');
        const bookings = [
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
        const result = await booking_crud_service_1.bookingCrudService.createMultipleBookings(bookings);
        strict_1.default.equal(result.success, true);
        strict_1.default.ok(result.data);
        strict_1.default.equal(result.data.length, 2);
        // Verify from storage
        for (let i = 0; i < bookings.length; i++) {
            const stored = await booking_crud_service_1.bookingCrudService.getBooking(bookings[i].id);
            strict_1.default.ok(stored, `Booking ${i} should be in storage`);
            strict_1.default.equal(stored.seriesId, seriesId);
            strict_1.default.equal(stored.seriesIndex, i);
            strict_1.default.equal(stored.location, 'Field A');
        }
    });
    (0, node_test_1.default)('emits BOOKING_CREATED events for each booking in batch', async () => {
        // Clear events
        emittedEvents = [];
        const seriesId = uniqueId('series');
        const bookings = [
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
        await booking_crud_service_1.bookingCrudService.createMultipleBookings(bookings);
        const bookingEvents = emittedEvents.filter((e) => e.event === event_bus_1.ServiceEvents.BOOKING_CREATED);
        strict_1.default.equal(bookingEvents.length, 2, 'Should emit 2 BOOKING_CREATED events');
    });
});
// ============================================================================
// UPDATE SERIES STATUS TESTS
// ============================================================================
(0, node_test_1.describe)('MultiWeekBookingService - updateSeriesStatus()', () => {
    (0, node_test_1.default)('returns NOT_FOUND for non-existent series', async () => {
        const result = await multi_week_booking_service_1.multiWeekBookingService.updateSeriesStatus('nonexistent-series-xyz');
        strict_1.default.equal(result.success, false);
        strict_1.default.ok(result.error);
        strict_1.default.equal(result.error.code, 'NOT_FOUND');
    });
    (0, node_test_1.default)('keeps ACTIVE status when no bookings have changed', async () => {
        const params = makeSeriesParams();
        const createResult = await multi_week_booking_service_1.multiWeekBookingService.createSeries(params);
        strict_1.default.equal(createResult.success, true);
        const updateResult = await multi_week_booking_service_1.multiWeekBookingService.updateSeriesStatus(createResult.data.id);
        strict_1.default.equal(updateResult.success, true);
        strict_1.default.equal(updateResult.data.status, 'ACTIVE');
    });
});
// ============================================================================
// EDGE CASES
// ============================================================================
(0, node_test_1.describe)('MultiWeekBookingService - Edge Cases', () => {
    (0, node_test_1.default)('single week series works correctly', async () => {
        const params = makeSeriesParams({
            selectedWeeks: ['2026-06-01'],
        });
        const result = await multi_week_booking_service_1.multiWeekBookingService.createSeries(params);
        strict_1.default.equal(result.success, true);
        strict_1.default.equal(result.data.bookingIds.length, 1);
        strict_1.default.equal(result.data.totalCost, 40); // 40 * 1
        strict_1.default.equal(result.data.selectedWeeks.length, 1);
    });
    (0, node_test_1.default)('focus field is optional and passes through to booking objectives', async () => {
        const params = makeSeriesParams({ focus: undefined });
        const result = await multi_week_booking_service_1.multiWeekBookingService.createSeries(params);
        strict_1.default.equal(result.success, true);
        strict_1.default.equal(result.data.focus, undefined);
        const booking = await booking_crud_service_1.bookingCrudService.getBooking(result.data.bookingIds[0]);
        strict_1.default.ok(booking);
        strict_1.default.deepEqual(booking.objectives, []);
    });
    (0, node_test_1.default)('focus field populates booking objectives when provided', async () => {
        const params = makeSeriesParams({ focus: 'Ball control' });
        const result = await multi_week_booking_service_1.multiWeekBookingService.createSeries(params);
        strict_1.default.equal(result.success, true);
        const booking = await booking_crud_service_1.bookingCrudService.getBooking(result.data.bookingIds[0]);
        strict_1.default.ok(booking);
        strict_1.default.deepEqual(booking.objectives, ['Ball control']);
    });
    (0, node_test_1.default)('notes field is optional and defaults correctly', async () => {
        const params = makeSeriesParams({ notes: undefined });
        const result = await multi_week_booking_service_1.multiWeekBookingService.createSeries(params);
        strict_1.default.equal(result.success, true);
        const booking = await booking_crud_service_1.bookingCrudService.getBooking(result.data.bookingIds[0]);
        strict_1.default.ok(booking);
        strict_1.default.equal(booking.notes, '');
    });
    (0, node_test_1.default)('many weeks (8) creates correct number of bookings', async () => {
        const weeks = [
            '2026-05-04', '2026-05-11', '2026-05-18', '2026-05-25',
            '2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22',
        ];
        const params = makeSeriesParams({
            selectedWeeks: weeks,
            pricePerSession: 35,
        });
        const result = await multi_week_booking_service_1.multiWeekBookingService.createSeries(params);
        strict_1.default.equal(result.success, true);
        strict_1.default.equal(result.data.bookingIds.length, 8);
        strict_1.default.equal(result.data.totalCost, 280); // 35 * 8
    });
});
