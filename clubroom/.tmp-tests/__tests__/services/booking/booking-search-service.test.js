"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const booking_search_service_1 = require("@/services/booking/booking-search-service");
const booking_crud_service_1 = require("@/services/booking/booking-crud-service");
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const poc_accounts_1 = require("@/constants/poc-accounts");
(0, node_test_1.describe)('BookingSearchService', () => {
    (0, node_test_1.beforeEach)(async () => {
        // Clear storage
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.BOOKINGS);
    });
    (0, node_test_1.describe)('getBookingsForUser', () => {
        (0, node_test_1.it)('should return empty array when no bookings exist', async () => {
            const bookings = await booking_search_service_1.bookingSearchService.getBookingsForUser('coach1', 'coach');
            strict_1.default.ok(Array.isArray(bookings));
            strict_1.default.equal(bookings.length, 0);
        });
        (0, node_test_1.it)('should filter bookings by coach', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const otherCoachId = 'coach-' + Math.random().toString(36).slice(2);
            // Create booking for coachId
            await booking_crud_service_1.bookingCrudService.createBooking({
                coachId,
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
                skipAvailabilityValidation: true,
            });
            // Create booking for other coach
            await booking_crud_service_1.bookingCrudService.createBooking({
                coachId: otherCoachId,
                coachName: 'Coach 2',
                athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Athlete 2'],
                bookedById: 'parent-' + Math.random().toString(36).slice(2),
                bookedByName: 'Parent',
                scheduledAt: new Date(Date.now() + 86400000).toISOString(),
                duration: 60,
                location: 'Field',
                service: '1-on-1',
                serviceType: 'COACHING',
                skipAvailabilityValidation: true,
            });
            const bookings = await booking_search_service_1.bookingSearchService.getBookingsForUser(coachId, 'coach');
            strict_1.default.equal(bookings.length, 1);
            strict_1.default.equal(bookings[0].coachId, coachId);
        });
        (0, node_test_1.it)('should filter bookings by parent', async () => {
            const parentId = 'parent-' + Math.random().toString(36).slice(2);
            await booking_crud_service_1.bookingCrudService.createBooking({
                coachId: 'coach-' + Math.random().toString(36).slice(2),
                coachName: 'Coach',
                athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Athlete'],
                bookedById: parentId,
                bookedByName: 'Parent',
                scheduledAt: new Date(Date.now() + 86400000).toISOString(),
                duration: 60,
                location: 'Field',
                service: '1-on-1',
                serviceType: 'COACHING',
                skipAvailabilityValidation: true,
            });
            const bookings = await booking_search_service_1.bookingSearchService.getBookingsForUser(parentId, 'parent');
            strict_1.default.equal(bookings.length, 1);
            strict_1.default.equal(bookings[0].bookedById, parentId);
        });
        (0, node_test_1.it)('should filter bookings by athlete', async () => {
            const athleteId = 'athlete-' + Math.random().toString(36).slice(2);
            await booking_crud_service_1.bookingCrudService.createBooking({
                coachId: 'coach-' + Math.random().toString(36).slice(2),
                coachName: 'Coach',
                athleteIds: [athleteId],
                athleteNames: ['Athlete'],
                bookedById: 'parent-' + Math.random().toString(36).slice(2),
                bookedByName: 'Parent',
                scheduledAt: new Date(Date.now() + 86400000).toISOString(),
                duration: 60,
                location: 'Field',
                service: '1-on-1',
                serviceType: 'COACHING',
                skipAvailabilityValidation: true,
            });
            const bookings = await booking_search_service_1.bookingSearchService.getBookingsForUser(athleteId, 'athlete');
            strict_1.default.equal(bookings.length, 1);
            strict_1.default.equal(bookings[0].athleteId, athleteId);
        });
        (0, node_test_1.it)('matches canonical id aliases for coach/parent/athlete', async () => {
            await booking_crud_service_1.bookingCrudService.createBooking({
                coachId: poc_accounts_1.POC_ACCOUNT_IDS.coachStorage,
                coachName: 'Coach Alias',
                athleteIds: [poc_accounts_1.POC_ACCOUNT_IDS.athleteStorage],
                athleteNames: ['Athlete Alias'],
                bookedById: poc_accounts_1.POC_ACCOUNT_IDS.parent,
                bookedByName: 'Parent Alias',
                scheduledAt: new Date(Date.now() + 86400000).toISOString(),
                duration: 60,
                location: 'Field',
                service: '1-on-1',
                serviceType: 'COACHING',
                skipAvailabilityValidation: true,
            });
            const coachBookings = await booking_search_service_1.bookingSearchService.getBookingsForUser(poc_accounts_1.POC_ACCOUNT_IDS.coach, 'coach');
            const parentBookings = await booking_search_service_1.bookingSearchService.getBookingsForUser(poc_accounts_1.POC_ACCOUNT_IDS.parent, 'parent');
            const athleteBookings = await booking_search_service_1.bookingSearchService.getBookingsForUser(poc_accounts_1.POC_ACCOUNT_IDS.athlete, 'athlete');
            strict_1.default.equal(coachBookings.length, 1);
            strict_1.default.equal(parentBookings.length, 1);
            strict_1.default.equal(athleteBookings.length, 1);
        });
        (0, node_test_1.it)('should handle errors and return empty array', async () => {
            const bookings = await booking_search_service_1.bookingSearchService.getBookingsForUser('invalid-user', 'coach');
            strict_1.default.ok(Array.isArray(bookings));
        });
    });
    (0, node_test_1.describe)('getAwaitingCompletion', () => {
        (0, node_test_1.it)('should return bookings with AWAITING_COMPLETION status', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const createResult = await booking_crud_service_1.bookingCrudService.createBooking({
                coachId,
                coachName: 'Coach',
                athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Athlete'],
                bookedById: 'parent-' + Math.random().toString(36).slice(2),
                bookedByName: 'Parent',
                scheduledAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                duration: 60,
                location: 'Field',
                service: '1-on-1',
                serviceType: 'COACHING',
                skipAvailabilityValidation: true,
            });
            // Update to AWAITING_COMPLETION
            if (createResult.success) {
                await booking_crud_service_1.bookingCrudService.updateBooking(createResult.data.id, {
                    status: 'AWAITING_COMPLETION',
                });
            }
            const bookings = await booking_search_service_1.bookingSearchService.getAwaitingCompletion(coachId);
            strict_1.default.ok(bookings.length > 0);
            strict_1.default.equal(bookings[0].status, 'AWAITING_COMPLETION');
        });
        (0, node_test_1.it)('should include confirmed sessions that have passed', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            await booking_crud_service_1.bookingCrudService.createBooking({
                coachId,
                coachName: 'Coach',
                athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Athlete'],
                bookedById: 'parent-' + Math.random().toString(36).slice(2),
                bookedByName: 'Parent',
                scheduledAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
                duration: 60,
                location: 'Field',
                service: '1-on-1',
                serviceType: 'COACHING',
                skipAvailabilityValidation: true,
            });
            const bookings = await booking_search_service_1.bookingSearchService.getAwaitingCompletion(coachId);
            // Should auto-detect the past confirmed session
            strict_1.default.ok(bookings.length > 0);
        });
        (0, node_test_1.it)('should not include future confirmed sessions', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            await booking_crud_service_1.bookingCrudService.createBooking({
                coachId,
                coachName: 'Coach',
                athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Athlete'],
                bookedById: 'parent-' + Math.random().toString(36).slice(2),
                bookedByName: 'Parent',
                scheduledAt: new Date(Date.now() + 86400000).toISOString(), // tomorrow
                duration: 60,
                location: 'Field',
                service: '1-on-1',
                serviceType: 'COACHING',
                skipAvailabilityValidation: true,
            });
            const bookings = await booking_search_service_1.bookingSearchService.getAwaitingCompletion(coachId);
            // Future sessions should not be included
            strict_1.default.equal(bookings.length, 0);
        });
        (0, node_test_1.it)('should filter by coach id', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const otherCoachId = 'coach-' + Math.random().toString(36).slice(2);
            const createResult = await booking_crud_service_1.bookingCrudService.createBooking({
                coachId: otherCoachId,
                coachName: 'Other Coach',
                athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Athlete'],
                bookedById: 'parent-' + Math.random().toString(36).slice(2),
                bookedByName: 'Parent',
                scheduledAt: new Date(Date.now() - 3600000).toISOString(),
                duration: 60,
                location: 'Field',
                service: '1-on-1',
                serviceType: 'COACHING',
                skipAvailabilityValidation: true,
            });
            if (createResult.success) {
                await booking_crud_service_1.bookingCrudService.updateBooking(createResult.data.id, {
                    status: 'AWAITING_COMPLETION',
                });
            }
            const bookings = await booking_search_service_1.bookingSearchService.getAwaitingCompletion(coachId);
            strict_1.default.equal(bookings.length, 0);
        });
        (0, node_test_1.it)('matches coach alias in awaiting completion lookup', async () => {
            const createResult = await booking_crud_service_1.bookingCrudService.createBooking({
                coachId: poc_accounts_1.POC_ACCOUNT_IDS.coachStorage,
                coachName: 'Alias Coach',
                athleteIds: [poc_accounts_1.POC_ACCOUNT_IDS.athleteStorage],
                athleteNames: ['Alias Athlete'],
                bookedById: poc_accounts_1.POC_ACCOUNT_IDS.parent,
                bookedByName: 'Parent',
                scheduledAt: new Date(Date.now() - 3600000).toISOString(),
                duration: 60,
                location: 'Field',
                service: '1-on-1',
                serviceType: 'COACHING',
                skipAvailabilityValidation: true,
            });
            if (createResult.success) {
                await booking_crud_service_1.bookingCrudService.updateBooking(createResult.data.id, { status: 'AWAITING_COMPLETION' });
            }
            const bookings = await booking_search_service_1.bookingSearchService.getAwaitingCompletion(poc_accounts_1.POC_ACCOUNT_IDS.coach);
            strict_1.default.equal(bookings.length, 1);
        });
    });
    (0, node_test_1.describe)('getUpcomingBookings', () => {
        (0, node_test_1.it)('should return future confirmed bookings', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const createResult = await booking_crud_service_1.bookingCrudService.createBooking({
                coachId,
                coachName: 'Coach',
                athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Athlete'],
                bookedById: 'parent-' + Math.random().toString(36).slice(2),
                bookedByName: 'Parent',
                scheduledAt: new Date(Date.now() + 86400000).toISOString(), // tomorrow
                duration: 60,
                location: 'Field',
                service: '1-on-1',
                serviceType: 'COACHING',
                skipAvailabilityValidation: true,
            });
            if (createResult.success) {
                await booking_crud_service_1.bookingCrudService.updateBooking(createResult.data.id, { status: 'CONFIRMED' });
            }
            const bookings = await booking_search_service_1.bookingSearchService.getUpcomingBookings(coachId);
            strict_1.default.ok(bookings.length > 0);
            strict_1.default.equal(bookings[0].status, 'CONFIRMED');
        });
        (0, node_test_1.it)('should return future pending bookings', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            await booking_crud_service_1.bookingCrudService.createBooking({
                coachId,
                coachName: 'Coach',
                athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Athlete'],
                bookedById: 'parent-' + Math.random().toString(36).slice(2),
                bookedByName: 'Parent',
                scheduledAt: new Date(Date.now() + 86400000).toISOString(),
                duration: 60,
                location: 'Field',
                service: '1-on-1',
                serviceType: 'COACHING',
                skipAvailabilityValidation: true,
            });
            const bookings = await booking_search_service_1.bookingSearchService.getUpcomingBookings(coachId);
            strict_1.default.ok(bookings.length > 0);
            strict_1.default.ok(['CONFIRMED', 'PENDING'].includes(bookings[0].status));
        });
        (0, node_test_1.it)('should not include past bookings', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const createResult = await booking_crud_service_1.bookingCrudService.createBooking({
                coachId,
                coachName: 'Coach',
                athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Athlete'],
                bookedById: 'parent-' + Math.random().toString(36).slice(2),
                bookedByName: 'Parent',
                scheduledAt: new Date(Date.now() - 86400000).toISOString(), // yesterday
                duration: 60,
                location: 'Field',
                service: '1-on-1',
                serviceType: 'COACHING',
                skipAvailabilityValidation: true,
            });
            if (createResult.success) {
                await booking_crud_service_1.bookingCrudService.updateBooking(createResult.data.id, { status: 'CONFIRMED' });
            }
            const bookings = await booking_search_service_1.bookingSearchService.getUpcomingBookings(coachId);
            strict_1.default.equal(bookings.length, 0);
        });
        (0, node_test_1.it)('should not include cancelled bookings', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const createResult = await booking_crud_service_1.bookingCrudService.createBooking({
                coachId,
                coachName: 'Coach',
                athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Athlete'],
                bookedById: 'parent-' + Math.random().toString(36).slice(2),
                bookedByName: 'Parent',
                scheduledAt: new Date(Date.now() + 86400000).toISOString(),
                duration: 60,
                location: 'Field',
                service: '1-on-1',
                serviceType: 'COACHING',
                skipAvailabilityValidation: true,
            });
            if (createResult.success) {
                await booking_crud_service_1.bookingCrudService.cancel(createResult.data.id, 'Test', 'coach');
            }
            const bookings = await booking_search_service_1.bookingSearchService.getUpcomingBookings(coachId);
            strict_1.default.equal(bookings.length, 0);
        });
        (0, node_test_1.it)('should filter by coach id', async () => {
            const coachId = 'coach-' + Math.random().toString(36).slice(2);
            const otherCoachId = 'coach-' + Math.random().toString(36).slice(2);
            await booking_crud_service_1.bookingCrudService.createBooking({
                coachId: otherCoachId,
                coachName: 'Other Coach',
                athleteIds: ['athlete-' + Math.random().toString(36).slice(2)],
                athleteNames: ['Athlete'],
                bookedById: 'parent-' + Math.random().toString(36).slice(2),
                bookedByName: 'Parent',
                scheduledAt: new Date(Date.now() + 86400000).toISOString(),
                duration: 60,
                location: 'Field',
                service: '1-on-1',
                serviceType: 'COACHING',
                skipAvailabilityValidation: true,
            });
            const bookings = await booking_search_service_1.bookingSearchService.getUpcomingBookings(coachId);
            strict_1.default.equal(bookings.length, 0);
        });
        (0, node_test_1.it)('matches coach alias in upcoming booking lookup', async () => {
            const createResult = await booking_crud_service_1.bookingCrudService.createBooking({
                coachId: poc_accounts_1.POC_ACCOUNT_IDS.coachStorage,
                coachName: 'Alias Coach',
                athleteIds: [poc_accounts_1.POC_ACCOUNT_IDS.athleteStorage],
                athleteNames: ['Alias Athlete'],
                bookedById: poc_accounts_1.POC_ACCOUNT_IDS.parent,
                bookedByName: 'Parent',
                scheduledAt: new Date(Date.now() + 86400000).toISOString(),
                duration: 60,
                location: 'Field',
                service: '1-on-1',
                serviceType: 'COACHING',
                skipAvailabilityValidation: true,
            });
            if (createResult.success) {
                await booking_crud_service_1.bookingCrudService.updateBooking(createResult.data.id, { status: 'CONFIRMED' });
            }
            const bookings = await booking_search_service_1.bookingSearchService.getUpcomingBookings(poc_accounts_1.POC_ACCOUNT_IDS.coach);
            strict_1.default.equal(bookings.length, 1);
        });
    });
});
