"use strict";
/**
 * Booking CRUD Service Tests
 *
 * Tests for draft management, list, getBooking, getById, updateBooking,
 * cancel, saveBookingDirect, createMultipleBookings.
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
    };
}
(0, node_test_1.describe)('bookingCrudService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove('clubroom.bookings');
        booking_crud_service_1.bookingCrudService.resetDraft();
        eventBus.clearAll();
    });
    // ---------------------------------------------------------------------------
    // Draft methods
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('draft', () => {
        (0, node_test_1.default)('getDraft returns empty object initially', () => {
            const draft = booking_crud_service_1.bookingCrudService.getDraft();
            strict_1.default.deepEqual(draft, {});
        });
        (0, node_test_1.default)('updateDraft merges fields', () => {
            booking_crud_service_1.bookingCrudService.updateDraft({ sessionType: '1-on-1', duration: 60 });
            booking_crud_service_1.bookingCrudService.updateDraft({ duration: 90, notes: 'Test' });
            const draft = booking_crud_service_1.bookingCrudService.getDraft();
            strict_1.default.equal(draft.sessionType, '1-on-1');
            strict_1.default.equal(draft.duration, 90);
            strict_1.default.equal(draft.notes, 'Test');
        });
        (0, node_test_1.default)('resetDraft clears all fields', () => {
            booking_crud_service_1.bookingCrudService.updateDraft({ sessionType: '1-on-1' });
            booking_crud_service_1.bookingCrudService.resetDraft();
            strict_1.default.deepEqual(booking_crud_service_1.bookingCrudService.getDraft(), {});
        });
    });
    // ---------------------------------------------------------------------------
    // saveBookingDirect + list + getBooking + getById
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('CRUD', () => {
        (0, node_test_1.default)('saveBookingDirect stores booking', async () => {
            const booking = makeBooking();
            const result = await booking_crud_service_1.bookingCrudService.saveBookingDirect(booking);
            strict_1.default.equal(result.success, true);
            const found = await booking_crud_service_1.bookingCrudService.getBooking(booking.id);
            strict_1.default.ok(found);
            strict_1.default.equal(found.id, booking.id);
        });
        (0, node_test_1.default)('list returns all saved bookings', async () => {
            await booking_crud_service_1.bookingCrudService.saveBookingDirect(makeBooking());
            await booking_crud_service_1.bookingCrudService.saveBookingDirect(makeBooking());
            const all = await booking_crud_service_1.bookingCrudService.list();
            strict_1.default.ok(all.length >= 2);
        });
        (0, node_test_1.default)('getBooking returns null for unknown id', async () => {
            const found = await booking_crud_service_1.bookingCrudService.getBooking(`unknown_${rid()}`);
            strict_1.default.equal(found, null);
        });
        (0, node_test_1.default)('getById returns undefined for unknown id', async () => {
            const found = await booking_crud_service_1.bookingCrudService.getById(`unknown_${rid()}`);
            strict_1.default.equal(found, undefined);
        });
    });
    // ---------------------------------------------------------------------------
    // updateBooking
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('updateBooking', () => {
        (0, node_test_1.default)('updates booking and returns ok', async () => {
            const booking = makeBooking();
            await booking_crud_service_1.bookingCrudService.saveBookingDirect(booking);
            const result = await booking_crud_service_1.bookingCrudService.updateBooking(booking.id, {
                notes: 'Updated notes',
                duration: 90,
            });
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.notes, 'Updated notes');
                strict_1.default.equal(result.data.duration, 90);
            }
        });
        (0, node_test_1.default)('returns err for unknown booking', async () => {
            const result = await booking_crud_service_1.bookingCrudService.updateBooking(`unknown_${rid()}`, { notes: 'X' });
            strict_1.default.equal(result.success, false);
        });
    });
    // ---------------------------------------------------------------------------
    // cancel
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('cancel', () => {
        (0, node_test_1.default)('sets status to CANCELLED and emits event', async () => {
            let emitted = false;
            eventBus.on(event_bus_1.ServiceEvents.BOOKING_CANCELLED, () => {
                emitted = true;
            });
            const booking = makeBooking();
            await booking_crud_service_1.bookingCrudService.saveBookingDirect(booking);
            const cancelled = await booking_crud_service_1.bookingCrudService.cancel(booking.id, 'No longer needed', 'parent');
            strict_1.default.ok(cancelled);
            strict_1.default.equal(cancelled.status, 'CANCELLED');
            strict_1.default.equal(emitted, true);
        });
    });
    // ---------------------------------------------------------------------------
    // createMultipleBookings
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('createMultipleBookings', () => {
        (0, node_test_1.default)('saves all bookings and emits events', async () => {
            let emitCount = 0;
            eventBus.on(event_bus_1.ServiceEvents.BOOKING_CREATED, () => {
                emitCount++;
            });
            const bookings = [makeBooking(), makeBooking(), makeBooking()];
            const result = await booking_crud_service_1.bookingCrudService.createMultipleBookings(bookings);
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.length, 3);
            }
            strict_1.default.equal(emitCount, 3);
        });
    });
    // ---------------------------------------------------------------------------
    // updateStatus
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('updateStatus', () => {
        (0, node_test_1.default)('changes booking status', async () => {
            const booking = makeBooking({ status: 'PENDING' });
            await booking_crud_service_1.bookingCrudService.saveBookingDirect(booking);
            const updated = await booking_crud_service_1.bookingCrudService.updateStatus(booking.id, 'CONFIRMED');
            strict_1.default.ok(updated);
            strict_1.default.equal(updated.status, 'CONFIRMED');
        });
    });
});
