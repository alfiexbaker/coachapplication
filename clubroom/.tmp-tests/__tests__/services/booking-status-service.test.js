"use strict";
/**
 * Booking Status Service Tests
 *
 * Tests for booking status transitions: confirmBooking,
 * checkAndTransitionStatus, scheduleSessionReminders.
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
const booking_status_service_1 = require("../../services/booking/booking-status-service");
const booking_crud_service_1 = require("../../services/booking/booking-crud-service");
const api_client_1 = require("../../services/api-client");
const event_bus_1 = require("../../services/event-bus");
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
        status: 'PENDING',
        location: 'Test Venue',
        sport: 'Football',
        price: 35,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...overrides,
    };
}
(0, node_test_1.describe)('bookingStatusService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove('clubroom.bookings');
        event_bus_1.eventBus.clearAll();
    });
    // ---------------------------------------------------------------------------
    // confirmBooking
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('confirmBooking', () => {
        (0, node_test_1.default)('confirms a pending booking', async () => {
            const booking = makeBooking();
            await booking_crud_service_1.bookingCrudService.saveBookingDirect(booking);
            const result = await booking_status_service_1.bookingStatusService.confirmBooking(booking.id);
            strict_1.default.equal(result.success, true);
            const updated = await booking_crud_service_1.bookingCrudService.getBooking(booking.id);
            strict_1.default.equal(updated?.status, 'CONFIRMED');
        });
        (0, node_test_1.default)('emits BOOKING_CONFIRMED event', async () => {
            const booking = makeBooking();
            await booking_crud_service_1.bookingCrudService.saveBookingDirect(booking);
            let emitted = false;
            event_bus_1.eventBus.on(event_bus_1.ServiceEvents.BOOKING_CONFIRMED, () => { emitted = true; });
            await booking_status_service_1.bookingStatusService.confirmBooking(booking.id);
            strict_1.default.equal(emitted, true);
        });
        (0, node_test_1.default)('returns error for nonexistent booking', async () => {
            const result = await booking_status_service_1.bookingStatusService.confirmBooking(`nonexistent_${rid()}`);
            strict_1.default.equal(result.success, false);
        });
    });
    // ---------------------------------------------------------------------------
    // checkAndTransitionStatus
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('checkAndTransitionStatus', () => {
        (0, node_test_1.default)('transitions past confirmed booking to AWAITING_COMPLETION', async () => {
            const pastTime = new Date(Date.now() - 7200000).toISOString();
            const booking = makeBooking({ status: 'CONFIRMED', scheduledAt: pastTime, duration: 60 });
            await booking_crud_service_1.bookingCrudService.saveBookingDirect(booking);
            const result = await booking_status_service_1.bookingStatusService.checkAndTransitionStatus(booking.id);
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.status, 'AWAITING_COMPLETION');
            }
        });
        (0, node_test_1.default)('does not transition future confirmed booking', async () => {
            const futureTime = new Date(Date.now() + 86400000).toISOString();
            const booking = makeBooking({ status: 'CONFIRMED', scheduledAt: futureTime });
            await booking_crud_service_1.bookingCrudService.saveBookingDirect(booking);
            const result = await booking_status_service_1.bookingStatusService.checkAndTransitionStatus(booking.id);
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.status, 'CONFIRMED');
            }
        });
        (0, node_test_1.default)('returns err for nonexistent booking', async () => {
            const result = await booking_status_service_1.bookingStatusService.checkAndTransitionStatus(`nonexistent_${rid()}`);
            strict_1.default.equal(result.success, false);
        });
    });
    // ---------------------------------------------------------------------------
    // scheduleSessionReminders
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('scheduleSessionReminders', () => {
        (0, node_test_1.default)('does not throw', async () => {
            await strict_1.default.doesNotReject(booking_status_service_1.bookingStatusService.scheduleSessionReminders());
        });
    });
});
