"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const booking_service_1 = require("@/services/booking-service");
const event_bus_1 = require("@/services/event-bus");
function createParams(id, overrides = {}) {
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
(0, node_test_1.describe)('bookingService (real facade)', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.BOOKINGS);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS);
        booking_service_1.bookingService.resetDraft();
    });
    (0, node_test_1.it)('manages booking draft state through facade methods', () => {
        strict_1.default.deepEqual(booking_service_1.bookingService.getDraft(), {});
        booking_service_1.bookingService.updateDraft({ sessionType: '1-on-1', duration: 60 });
        const draft = booking_service_1.bookingService.getDraft();
        strict_1.default.equal(draft.sessionType, '1-on-1');
        strict_1.default.equal(draft.duration, 60);
        booking_service_1.bookingService.resetDraft();
        strict_1.default.deepEqual(booking_service_1.bookingService.getDraft(), {});
    });
    (0, node_test_1.it)('creates booking through real service and emits BOOKING_CREATED', async () => {
        let createdEventBookingId = '';
        const unsubscribe = (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.BOOKING_CREATED, (payload) => {
            createdEventBookingId = payload.bookingId;
        });
        const result = await booking_service_1.bookingService.createBooking(createParams('01'));
        strict_1.default.equal(result.success, true);
        if (!result.success)
            return;
        strict_1.default.ok(result.data.id.startsWith('booking_'));
        strict_1.default.equal(result.data.coachId, 'coach-01');
        strict_1.default.equal(result.data.status, 'CONFIRMED');
        strict_1.default.equal(createdEventBookingId, result.data.id);
        unsubscribe();
    });
    (0, node_test_1.it)('returns validation error when availability validation fails', async () => {
        const result = await booking_service_1.bookingService.createBooking(createParams('02', {
            scheduledAt: '2030-01-10T07:00:00.000Z',
            skipAvailabilityValidation: false,
        }));
        strict_1.default.equal(result.success, false);
        if (result.success)
            return;
        strict_1.default.equal(result.error.code, 'VALIDATION');
    });
    (0, node_test_1.it)('cancels a created booking through facade', async () => {
        const created = await booking_service_1.bookingService.createBooking(createParams('03'));
        strict_1.default.equal(created.success, true);
        if (!created.success)
            return;
        const cancelled = await booking_service_1.bookingService.cancel(created.data.id, 'COACH', 'coach');
        strict_1.default.ok(cancelled);
        strict_1.default.equal(cancelled?.status, 'CANCELLED');
        strict_1.default.equal(cancelled?.cancellationReason, 'COACH');
    });
    (0, node_test_1.it)('does not cancel past bookings', async () => {
        const created = await booking_service_1.bookingService.createBooking(createParams('03-past', { scheduledAt: '2025-01-10T10:00:00.000Z' }));
        strict_1.default.equal(created.success, true);
        if (!created.success)
            return;
        const cancelled = await booking_service_1.bookingService.cancel(created.data.id, 'PARENT', 'parent');
        strict_1.default.equal(cancelled, undefined);
        const stillActive = await booking_service_1.bookingService.getBooking(created.data.id);
        strict_1.default.equal(stillActive?.status, 'CONFIRMED');
    });
    (0, node_test_1.it)('filters bookings by role through getBookingsForUser', async () => {
        const one = await booking_service_1.bookingService.createBooking(createParams('04'));
        const two = await booking_service_1.bookingService.createBooking(createParams('05', {
            coachId: 'coach-04',
            bookedById: 'parent-05',
        }));
        strict_1.default.equal(one.success, true);
        strict_1.default.equal(two.success, true);
        const coachBookings = await booking_service_1.bookingService.getBookingsForUser('coach-04', 'coach');
        const parentBookings = await booking_service_1.bookingService.getBookingsForUser('parent-05', 'parent');
        const athleteBookings = await booking_service_1.bookingService.getBookingsForUser('athlete-04', 'athlete');
        strict_1.default.equal(coachBookings.length, 2);
        strict_1.default.equal(parentBookings.length, 1);
        strict_1.default.equal(parentBookings[0]?.bookedById, 'parent-05');
        strict_1.default.equal(athleteBookings.length, 1);
        strict_1.default.equal(athleteBookings[0]?.athleteId, 'athlete-04');
    });
});
