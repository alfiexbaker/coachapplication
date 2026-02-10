"use strict";
/**
 * Booking Search Service Tests
 *
 * Tests for booking queries: getBookingsForUser, getAwaitingCompletion,
 * getUpcomingBookings. Seeds data through bookingCrudService.
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
const booking_search_service_1 = require("../../services/booking/booking-search-service");
const booking_crud_service_1 = require("../../services/booking/booking-crud-service");
const api_client_1 = require("../../services/api-client");
const rid = () => Math.random().toString(36).slice(2, 10);
function makeBooking(overrides = {}) {
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
        status: 'CONFIRMED',
        location: 'Test Venue',
        sport: 'Football',
        price: 35,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...overrides,
    };
}
(0, node_test_1.describe)('bookingSearchService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove('clubroom.bookings');
    });
    // ---------------------------------------------------------------------------
    // getBookingsForUser
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getBookingsForUser', () => {
        (0, node_test_1.default)('returns bookings for coach role', async () => {
            const coachId = `coach_${rid()}`;
            await booking_crud_service_1.bookingCrudService.saveBookingDirect(makeBooking({ coachId }));
            await booking_crud_service_1.bookingCrudService.saveBookingDirect(makeBooking({ coachId }));
            await booking_crud_service_1.bookingCrudService.saveBookingDirect(makeBooking());
            const results = await booking_search_service_1.bookingSearchService.getBookingsForUser(coachId, 'coach');
            strict_1.default.equal(results.length, 2);
        });
        (0, node_test_1.default)('returns bookings for parent role', async () => {
            const parentId = `parent_${rid()}`;
            await booking_crud_service_1.bookingCrudService.saveBookingDirect(makeBooking({ bookedById: parentId }));
            const results = await booking_search_service_1.bookingSearchService.getBookingsForUser(parentId, 'parent');
            strict_1.default.equal(results.length, 1);
        });
        (0, node_test_1.default)('returns bookings for athlete role', async () => {
            const athleteId = `ath_${rid()}`;
            await booking_crud_service_1.bookingCrudService.saveBookingDirect(makeBooking({ athleteId }));
            const results = await booking_search_service_1.bookingSearchService.getBookingsForUser(athleteId, 'athlete');
            strict_1.default.equal(results.length, 1);
        });
        (0, node_test_1.default)('returns empty for unknown user', async () => {
            const results = await booking_search_service_1.bookingSearchService.getBookingsForUser(`unknown_${rid()}`, 'coach');
            strict_1.default.equal(results.length, 0);
        });
    });
    // ---------------------------------------------------------------------------
    // getAwaitingCompletion
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getAwaitingCompletion', () => {
        (0, node_test_1.default)('returns bookings with AWAITING_COMPLETION status', async () => {
            const coachId = `coach_${rid()}`;
            await booking_crud_service_1.bookingCrudService.saveBookingDirect(makeBooking({ coachId, status: 'AWAITING_COMPLETION' }));
            await booking_crud_service_1.bookingCrudService.saveBookingDirect(makeBooking({ coachId, status: 'CONFIRMED', scheduledAt: new Date(Date.now() + 86400000).toISOString() }));
            const results = await booking_search_service_1.bookingSearchService.getAwaitingCompletion(coachId);
            strict_1.default.ok(results.length >= 1);
        });
        (0, node_test_1.default)('includes past confirmed sessions', async () => {
            const coachId = `coach_${rid()}`;
            const pastTime = new Date(Date.now() - 7200000).toISOString();
            await booking_crud_service_1.bookingCrudService.saveBookingDirect(makeBooking({ coachId, status: 'CONFIRMED', scheduledAt: pastTime, duration: 60 }));
            const results = await booking_search_service_1.bookingSearchService.getAwaitingCompletion(coachId);
            strict_1.default.ok(results.length >= 1);
        });
    });
    // ---------------------------------------------------------------------------
    // getUpcomingBookings
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getUpcomingBookings', () => {
        (0, node_test_1.default)('returns future confirmed/pending bookings for coach', async () => {
            const coachId = `coach_${rid()}`;
            const futureTime = new Date(Date.now() + 86400000).toISOString();
            await booking_crud_service_1.bookingCrudService.saveBookingDirect(makeBooking({ coachId, status: 'CONFIRMED', scheduledAt: futureTime }));
            await booking_crud_service_1.bookingCrudService.saveBookingDirect(makeBooking({ coachId, status: 'PENDING', scheduledAt: futureTime }));
            await booking_crud_service_1.bookingCrudService.saveBookingDirect(makeBooking({ coachId, status: 'CANCELLED', scheduledAt: futureTime }));
            const results = await booking_search_service_1.bookingSearchService.getUpcomingBookings(coachId);
            strict_1.default.equal(results.length, 2);
        });
        (0, node_test_1.default)('excludes past bookings', async () => {
            const coachId = `coach_${rid()}`;
            const pastTime = new Date(Date.now() - 86400000).toISOString();
            await booking_crud_service_1.bookingCrudService.saveBookingDirect(makeBooking({ coachId, status: 'CONFIRMED', scheduledAt: pastTime }));
            const results = await booking_search_service_1.bookingSearchService.getUpcomingBookings(coachId);
            strict_1.default.equal(results.length, 0);
        });
    });
});
