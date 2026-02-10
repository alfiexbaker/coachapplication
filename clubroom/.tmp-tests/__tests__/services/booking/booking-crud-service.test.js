"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const booking_crud_service_1 = require("@/services/booking/booking-crud-service");
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const event_bus_1 = require("@/services/event-bus");
(0, node_test_1.describe)('BookingCrudService', () => {
    (0, node_test_1.beforeEach)(async () => {
        // Clear storage and reset draft
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.BOOKINGS);
        booking_crud_service_1.bookingCrudService.resetDraft();
    });
    (0, node_test_1.describe)('draft management', () => {
        (0, node_test_1.it)('should get empty draft initially', () => {
            const draft = booking_crud_service_1.bookingCrudService.getDraft();
            strict_1.default.deepEqual(draft, {});
        });
        (0, node_test_1.it)('should update draft with partial data', () => {
            booking_crud_service_1.bookingCrudService.updateDraft({ sessionType: '1-on-1', duration: 60 });
            const draft = booking_crud_service_1.bookingCrudService.getDraft();
            strict_1.default.equal(draft.sessionType, '1-on-1');
            strict_1.default.equal(draft.duration, 60);
        });
        (0, node_test_1.it)('should merge draft updates', () => {
            booking_crud_service_1.bookingCrudService.updateDraft({ sessionType: '1-on-1' });
            booking_crud_service_1.bookingCrudService.updateDraft({ duration: 60 });
            const draft = booking_crud_service_1.bookingCrudService.getDraft();
            strict_1.default.equal(draft.sessionType, '1-on-1');
            strict_1.default.equal(draft.duration, 60);
        });
        (0, node_test_1.it)('should reset draft to empty', () => {
            booking_crud_service_1.bookingCrudService.updateDraft({ sessionType: '1-on-1', duration: 60 });
            booking_crud_service_1.bookingCrudService.resetDraft();
            const draft = booking_crud_service_1.bookingCrudService.getDraft();
            strict_1.default.deepEqual(draft, {});
        });
    });
    (0, node_test_1.describe)('create', () => {
        (0, node_test_1.it)('should return ok() when creating valid booking', async () => {
            const params = {
                coachId: 'coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
                athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Test Athlete'],
                bookedById: 'parent-' + Math.random().toString(36).slice(2),
                bookedByName: 'Test Parent',
                scheduledAt: new Date(Date.now() + 86400000).toISOString(),
                duration: 60,
                location: 'Test Field',
                service: '1-on-1 Coaching',
                serviceType: 'COACHING',
                price: 50,
            };
            const result = await booking_crud_service_1.bookingCrudService.createBooking(params);
            strict_1.default.ok(result.success);
            strict_1.default.ok(result.data.id);
            strict_1.default.equal(result.data.coachId, params.coachId);
            strict_1.default.equal(result.data.status, 'PENDING');
        });
        (0, node_test_1.it)('should return err() when scheduledAt is missing', async () => {
            const params = {
                coachId: 'coach1',
                coachName: 'Test Coach',
                athleteIds: ['athlete1'],
                athleteNames: ['Test Athlete'],
                bookedById: 'parent1',
                bookedByName: 'Test Parent',
                scheduledAt: '',
                duration: 60,
                location: 'Test Field',
                service: '1-on-1 Coaching',
                serviceType: 'COACHING',
            };
            const result = await booking_crud_service_1.bookingCrudService.createBooking(params);
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'VALIDATION_ERROR');
        });
        (0, node_test_1.it)('should emit BOOKING_CREATED event on success', async () => {
            const events = [];
            const unsub = (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.BOOKING_CREATED, (payload) => {
                events.push(payload);
            });
            const params = {
                coachId: 'coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
                athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Test Athlete'],
                bookedById: 'parent-' + Math.random().toString(36).slice(2),
                bookedByName: 'Test Parent',
                scheduledAt: new Date(Date.now() + 86400000).toISOString(),
                duration: 60,
                location: 'Test Field',
                service: '1-on-1 Coaching',
                serviceType: 'COACHING',
            };
            await booking_crud_service_1.bookingCrudService.createBooking(params);
            strict_1.default.equal(events.length, 1);
            strict_1.default.equal(events[0].coachId, params.coachId);
            unsub();
        });
        (0, node_test_1.it)('should handle multiple athletes in booking', async () => {
            const athleteIds = [
                'athlete-' + Math.random().toString(36).slice(2),
                'athlete-' + Math.random().toString(36).slice(2),
            ];
            const params = {
                coachId: 'coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
                athleteIds,
                athleteNames: ['Athlete 1', 'Athlete 2'],
                bookedById: 'parent-' + Math.random().toString(36).slice(2),
                bookedByName: 'Test Parent',
                scheduledAt: new Date(Date.now() + 86400000).toISOString(),
                duration: 60,
                location: 'Test Field',
                service: 'Group Session',
                serviceType: 'GROUP',
            };
            const result = await booking_crud_service_1.bookingCrudService.createBooking(params);
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.athleteIds?.length, 2);
        });
    });
    (0, node_test_1.describe)('list', () => {
        (0, node_test_1.it)('should return empty array initially', async () => {
            const bookings = await booking_crud_service_1.bookingCrudService.list();
            strict_1.default.ok(Array.isArray(bookings));
            strict_1.default.equal(bookings.length, 0);
        });
        (0, node_test_1.it)('should return all bookings after creation', async () => {
            await booking_crud_service_1.bookingCrudService.createBooking({
                coachId: 'coach-' + Math.random().toString(36).slice(2),
                coachName: 'Coach 1',
                athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Athlete 1'],
                bookedById: 'parent-' + Math.random().toString(36).slice(2),
                bookedByName: 'Parent',
                scheduledAt: new Date(Date.now() + 86400000).toISOString(),
                duration: 60,
                location: 'Field',
                service: '1-on-1',
                serviceType: 'COACHING',
            });
            const bookings = await booking_crud_service_1.bookingCrudService.list();
            strict_1.default.equal(bookings.length, 1);
        });
    });
    (0, node_test_1.describe)('getBooking', () => {
        (0, node_test_1.it)('should return booking by id', async () => {
            const createResult = await booking_crud_service_1.bookingCrudService.createBooking({
                coachId: 'coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
                athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Test Athlete'],
                bookedById: 'parent-' + Math.random().toString(36).slice(2),
                bookedByName: 'Test Parent',
                scheduledAt: new Date(Date.now() + 86400000).toISOString(),
                duration: 60,
                location: 'Test Field',
                service: '1-on-1',
                serviceType: 'COACHING',
            });
            strict_1.default.ok(createResult.success);
            const booking = await booking_crud_service_1.bookingCrudService.getBooking(createResult.data.id);
            strict_1.default.ok(booking);
            strict_1.default.equal(booking.id, createResult.data.id);
        });
        (0, node_test_1.it)('should return null for non-existent booking', async () => {
            const booking = await booking_crud_service_1.bookingCrudService.getBooking('fake-id-' + Math.random().toString(36).slice(2));
            strict_1.default.equal(booking, null);
        });
    });
    (0, node_test_1.describe)('updateBooking', () => {
        (0, node_test_1.it)('should return ok() and update booking', async () => {
            const createResult = await booking_crud_service_1.bookingCrudService.createBooking({
                coachId: 'coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
                athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Test Athlete'],
                bookedById: 'parent-' + Math.random().toString(36).slice(2),
                bookedByName: 'Test Parent',
                scheduledAt: new Date(Date.now() + 86400000).toISOString(),
                duration: 60,
                location: 'Test Field',
                service: '1-on-1',
                serviceType: 'COACHING',
            });
            strict_1.default.ok(createResult.success);
            const updateResult = await booking_crud_service_1.bookingCrudService.updateBooking(createResult.data.id, {
                status: 'CONFIRMED',
                notes: 'Updated notes',
            });
            strict_1.default.ok(updateResult.success);
            strict_1.default.equal(updateResult.data.status, 'CONFIRMED');
            strict_1.default.equal(updateResult.data.notes, 'Updated notes');
        });
        (0, node_test_1.it)('should return error for non-existent booking', async () => {
            const result = await booking_crud_service_1.bookingCrudService.updateBooking('fake-id-' + Math.random().toString(36).slice(2), {
                status: 'CONFIRMED',
            });
            strict_1.default.ok(!result.success);
        });
    });
    (0, node_test_1.describe)('cancel', () => {
        (0, node_test_1.it)('should return ok() and cancel booking', async () => {
            const createResult = await booking_crud_service_1.bookingCrudService.createBooking({
                coachId: 'coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
                athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Test Athlete'],
                bookedById: 'parent-' + Math.random().toString(36).slice(2),
                bookedByName: 'Test Parent',
                scheduledAt: new Date(Date.now() + 86400000).toISOString(),
                duration: 60,
                location: 'Test Field',
                service: '1-on-1',
                serviceType: 'COACHING',
            });
            strict_1.default.ok(createResult.success);
            const cancelResult = await booking_crud_service_1.bookingCrudService.cancel(createResult.data.id, 'COACH', 'coach1', 'Schedule conflict');
            strict_1.default.ok(cancelResult.success);
            strict_1.default.equal(cancelResult.data.status, 'CANCELLED');
            strict_1.default.ok(cancelResult.data.cancelledAt);
            strict_1.default.equal(cancelResult.data.cancelledByRole, 'COACH');
        });
        (0, node_test_1.it)('should return err() for non-existent booking', async () => {
            const result = await booking_crud_service_1.bookingCrudService.cancel('fake-id-' + Math.random().toString(36).slice(2), 'COACH', 'coach1', 'Test');
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
        (0, node_test_1.it)('should emit BOOKING_CANCELLED event', async () => {
            const events = [];
            const unsub = (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.BOOKING_CANCELLED, (payload) => {
                events.push(payload);
            });
            const createResult = await booking_crud_service_1.bookingCrudService.createBooking({
                coachId: 'coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
                athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Test Athlete'],
                bookedById: 'parent-' + Math.random().toString(36).slice(2),
                bookedByName: 'Test Parent',
                scheduledAt: new Date(Date.now() + 86400000).toISOString(),
                duration: 60,
                location: 'Test Field',
                service: '1-on-1',
                serviceType: 'COACHING',
            });
            strict_1.default.ok(createResult.success);
            await booking_crud_service_1.bookingCrudService.cancel(createResult.data.id, 'COACH', 'coach1', 'Test reason');
            strict_1.default.equal(events.length, 1);
            strict_1.default.equal(events[0].bookingId, createResult.data.id);
            unsub();
        });
    });
});
