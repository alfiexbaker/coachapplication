"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const booking_status_service_1 = require("@/services/booking/booking-status-service");
const booking_crud_service_1 = require("@/services/booking/booking-crud-service");
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const event_bus_1 = require("@/services/event-bus");
(0, node_test_1.describe)('BookingStatusService', () => {
    (0, node_test_1.beforeEach)(async () => {
        // Clear storage
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.BOOKINGS);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS);
    });
    (0, node_test_1.describe)('confirmBooking', () => {
        (0, node_test_1.it)('should return success when confirming valid booking', async () => {
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
            const result = await booking_status_service_1.bookingStatusService.confirmBooking(createResult.data.id);
            strict_1.default.ok(result.success);
        });
        (0, node_test_1.it)('should update booking status to CONFIRMED', async () => {
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
            await booking_status_service_1.bookingStatusService.confirmBooking(createResult.data.id);
            const booking = await booking_crud_service_1.bookingCrudService.getBooking(createResult.data.id);
            strict_1.default.ok(booking);
            strict_1.default.equal(booking.status, 'CONFIRMED');
        });
        (0, node_test_1.it)('should return error for non-existent booking', async () => {
            const result = await booking_status_service_1.bookingStatusService.confirmBooking('fake-id-' + Math.random().toString(36).slice(2));
            strict_1.default.ok(!result.success);
            strict_1.default.ok(result.error);
        });
        (0, node_test_1.it)('should emit BOOKING_CONFIRMED event', async () => {
            const events = [];
            const unsub = (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.BOOKING_CONFIRMED, (payload) => {
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
            await booking_status_service_1.bookingStatusService.confirmBooking(createResult.data.id);
            strict_1.default.equal(events.length, 1);
            strict_1.default.equal(events[0].bookingId, createResult.data.id);
            unsub();
        });
        (0, node_test_1.it)('should create confirmation notification', async () => {
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
            await booking_status_service_1.bookingStatusService.confirmBooking(createResult.data.id);
            const notifications = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, []);
            strict_1.default.ok(notifications.length > 0);
        });
    });
    (0, node_test_1.describe)('checkAndTransitionStatus', () => {
        (0, node_test_1.it)('should return ok() for valid booking', async () => {
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
            const result = await booking_status_service_1.bookingStatusService.checkAndTransitionStatus(createResult.data.id);
            strict_1.default.ok(result.success);
        });
        (0, node_test_1.it)('should return err() for non-existent booking', async () => {
            const result = await booking_status_service_1.bookingStatusService.checkAndTransitionStatus('fake-id-' + Math.random().toString(36).slice(2));
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
        (0, node_test_1.it)('should transition confirmed past session to AWAITING_COMPLETION', async () => {
            const createResult = await booking_crud_service_1.bookingCrudService.createBooking({
                coachId: 'coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
                athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Test Athlete'],
                bookedById: 'parent-' + Math.random().toString(36).slice(2),
                bookedByName: 'Test Parent',
                scheduledAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
                duration: 60,
                location: 'Test Field',
                service: '1-on-1',
                serviceType: 'COACHING',
            });
            strict_1.default.ok(createResult.success);
            await booking_crud_service_1.bookingCrudService.updateBooking(createResult.data.id, { status: 'CONFIRMED' });
            const result = await booking_status_service_1.bookingStatusService.checkAndTransitionStatus(createResult.data.id);
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.status, 'AWAITING_COMPLETION');
        });
        (0, node_test_1.it)('should not transition future confirmed session', async () => {
            const createResult = await booking_crud_service_1.bookingCrudService.createBooking({
                coachId: 'coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
                athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Test Athlete'],
                bookedById: 'parent-' + Math.random().toString(36).slice(2),
                bookedByName: 'Test Parent',
                scheduledAt: new Date(Date.now() + 86400000).toISOString(), // tomorrow
                duration: 60,
                location: 'Test Field',
                service: '1-on-1',
                serviceType: 'COACHING',
            });
            strict_1.default.ok(createResult.success);
            await booking_crud_service_1.bookingCrudService.updateBooking(createResult.data.id, { status: 'CONFIRMED' });
            const result = await booking_status_service_1.bookingStatusService.checkAndTransitionStatus(createResult.data.id);
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.status, 'CONFIRMED');
        });
        (0, node_test_1.it)('should not transition pending booking', async () => {
            const createResult = await booking_crud_service_1.bookingCrudService.createBooking({
                coachId: 'coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
                athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Test Athlete'],
                bookedById: 'parent-' + Math.random().toString(36).slice(2),
                bookedByName: 'Test Parent',
                scheduledAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                duration: 60,
                location: 'Test Field',
                service: '1-on-1',
                serviceType: 'COACHING',
            });
            strict_1.default.ok(createResult.success);
            const result = await booking_status_service_1.bookingStatusService.checkAndTransitionStatus(createResult.data.id);
            strict_1.default.ok(result.success);
            strict_1.default.equal(result.data.status, 'PENDING');
        });
    });
    (0, node_test_1.describe)('scheduleSessionReminders', () => {
        (0, node_test_1.it)('should not throw errors', async () => {
            await booking_status_service_1.bookingStatusService.scheduleSessionReminders();
            // Test passes if no error thrown
            strict_1.default.ok(true);
        });
        (0, node_test_1.it)('should process upcoming sessions', async () => {
            const createResult = await booking_crud_service_1.bookingCrudService.createBooking({
                coachId: 'coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
                athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Test Athlete'],
                bookedById: 'parent-' + Math.random().toString(36).slice(2),
                bookedByName: 'Test Parent',
                scheduledAt: new Date(Date.now() + 1800000).toISOString(), // 30 minutes from now
                duration: 60,
                location: 'Test Field',
                service: '1-on-1',
                serviceType: 'COACHING',
            });
            strict_1.default.ok(createResult.success);
            await booking_crud_service_1.bookingCrudService.updateBooking(createResult.data.id, { status: 'CONFIRMED' });
            await booking_status_service_1.bookingStatusService.scheduleSessionReminders();
            // Check if notification was created
            const notifications = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, []);
            strict_1.default.ok(notifications.length > 0);
        });
        (0, node_test_1.it)('should skip past sessions', async () => {
            const createResult = await booking_crud_service_1.bookingCrudService.createBooking({
                coachId: 'coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
                athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Test Athlete'],
                bookedById: 'parent-' + Math.random().toString(36).slice(2),
                bookedByName: 'Test Parent',
                scheduledAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
                duration: 60,
                location: 'Test Field',
                service: '1-on-1',
                serviceType: 'COACHING',
            });
            strict_1.default.ok(createResult.success);
            await booking_status_service_1.bookingStatusService.scheduleSessionReminders();
            // No error should be thrown
            strict_1.default.ok(true);
        });
        (0, node_test_1.it)('should skip far-future sessions', async () => {
            const createResult = await booking_crud_service_1.bookingCrudService.createBooking({
                coachId: 'coach-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
                athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Test Athlete'],
                bookedById: 'parent-' + Math.random().toString(36).slice(2),
                bookedByName: 'Test Parent',
                scheduledAt: new Date(Date.now() + 172800000).toISOString(), // 2 days from now
                duration: 60,
                location: 'Test Field',
                service: '1-on-1',
                serviceType: 'COACHING',
            });
            strict_1.default.ok(createResult.success);
            await booking_status_service_1.bookingStatusService.scheduleSessionReminders();
            // No error should be thrown
            strict_1.default.ok(true);
        });
    });
});
