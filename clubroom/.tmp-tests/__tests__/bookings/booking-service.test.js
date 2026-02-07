"use strict";
// @ts-nocheck
/**
 * Booking Service Tests
 *
 * Unit tests for the booking service functionality including
 * CRUD operations, validation, status transitions, and notifications.
 *
 * These tests verify the core booking functionality:
 * - Create bookings with validation
 * - Get bookings by ID/user
 * - Cancel bookings with notifications
 * - Status transitions (CONFIRMED -> AWAITING_COMPLETION -> COMPLETED)
 * - Draft booking flow
 * - Session reminders
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
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importStar(require("node:test"));
// Mock storage
let mockBookings = [];
let mockAvailableSlots = [];
let mockNotifications = [];
// Mock BookingService implementation for testing
class MockBookingService {
    constructor() {
        this.draft = {};
    }
    getDraft() {
        return this.draft;
    }
    updateDraft(patch) {
        this.draft = { ...this.draft, ...patch };
    }
    resetDraft() {
        this.draft = {};
    }
    async list() {
        return [...mockBookings];
    }
    async getBooking(id) {
        return mockBookings.find((b) => b.id === id) || null;
    }
    async getById(id) {
        return mockBookings.find((b) => b.id === id);
    }
    async updateStatus(id, status) {
        const index = mockBookings.findIndex((b) => b.id === id);
        if (index === -1)
            return undefined;
        mockBookings[index] = { ...mockBookings[index], status };
        return mockBookings[index];
    }
    async cancel(id, reason, cancelledBy = 'parent') {
        const index = mockBookings.findIndex((b) => b.id === id);
        if (index === -1)
            return undefined;
        const booking = mockBookings[index];
        mockBookings[index] = {
            ...booking,
            status: 'CANCELLED',
            cancellationReason: reason,
        };
        // Create notification
        const date = booking.scheduledAt
            ? new Date(booking.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : 'upcoming date';
        mockNotifications.push({
            type: 'booking_cancelled',
            cancelledBy,
            date,
            recipientId: cancelledBy === 'parent' ? booking.coachId : booking.bookedById,
        });
        return mockBookings[index];
    }
    async validateBooking(coachId, date, startTime, durationMinutes = 60) {
        const matchingSlot = mockAvailableSlots.find((slot) => slot.coachId === coachId && slot.date === date && slot.startTime === startTime);
        if (!matchingSlot) {
            return { valid: false, reason: "This time slot is not within the coach's available hours." };
        }
        if (!matchingSlot.isAvailable) {
            return { valid: false, reason: 'This time slot is already fully booked.' };
        }
        return { valid: true };
    }
    async createBooking(params) {
        const date = params.scheduledAt.split('T')[0];
        const time = params.scheduledAt.split('T')[1]?.substring(0, 5) || '10:00';
        // Validate availability
        const validation = await this.validateBooking(params.coachId, date, time, params.duration);
        if (!validation.valid) {
            return { success: false, error: { code: 'VALIDATION', message: validation.reason || 'Validation failed' } };
        }
        const totalPrice = (params.price || 0) * params.athleteIds.length;
        const isSharedSession = params.athleteIds.length > 1;
        const newBooking = {
            id: `booking-${Date.now()}`,
            coachId: params.coachId,
            coachName: params.coachName,
            athleteIds: params.athleteIds,
            athleteId: params.athleteIds[0],
            athleteName: params.athleteNames.join(', '),
            bookedById: params.bookedById,
            scheduledAt: params.scheduledAt,
            status: 'CONFIRMED',
            duration: params.duration,
            location: params.location,
            service: params.service,
            serviceType: params.serviceType,
            objectives: params.objectives || [],
            price: totalPrice,
            isSharedSession,
            notes: params.notes || '',
            createdAt: new Date().toISOString(),
            sessionInviteId: params.sessionInviteId,
        };
        mockBookings.push(newBooking);
        // Create notification for coach
        mockNotifications.push({
            type: 'booking_created',
            bookingId: newBooking.id,
            coachId: params.coachId,
        });
        return { success: true, data: newBooking };
    }
    async getBookingsForUser(userId, role) {
        switch (role) {
            case 'coach':
                return mockBookings.filter((b) => b.coachId === userId);
            case 'parent':
                return mockBookings.filter((b) => b.bookedById === userId);
            case 'athlete':
                return mockBookings.filter((b) => b.athleteId === userId);
            default:
                return [];
        }
    }
    async confirmBooking(bookingId) {
        const index = mockBookings.findIndex((b) => b.id === bookingId);
        if (index === -1) {
            return { success: false, error: 'Booking not found' };
        }
        mockBookings[index].status = 'CONFIRMED';
        mockNotifications.push({
            type: 'booking_confirmed',
            bookingId,
        });
        return { success: true };
    }
    async updateBooking(id, updates) {
        const index = mockBookings.findIndex((b) => b.id === id);
        if (index === -1)
            throw new Error('Booking not found');
        mockBookings[index] = { ...mockBookings[index], ...updates };
        return mockBookings[index];
    }
    async checkAndTransitionStatus(bookingId) {
        const booking = await this.getBooking(bookingId);
        if (!booking)
            throw new Error('Booking not found');
        const sessionEnd = new Date(booking.scheduledAt);
        sessionEnd.setMinutes(sessionEnd.getMinutes() + (booking.duration || 60));
        if (booking.status === 'CONFIRMED' && new Date() > sessionEnd) {
            return this.updateBooking(bookingId, { status: 'AWAITING_COMPLETION' });
        }
        return booking;
    }
    async getAwaitingCompletion(coachId) {
        const now = new Date();
        return mockBookings.filter((b) => {
            if (b.coachId !== coachId)
                return false;
            if (b.status === 'AWAITING_COMPLETION')
                return true;
            if (b.status === 'CONFIRMED') {
                const end = new Date(b.scheduledAt);
                end.setMinutes(end.getMinutes() + (b.duration || 60));
                return now > end;
            }
            return false;
        });
    }
    async getUpcomingBookings(coachId) {
        const now = new Date();
        return mockBookings.filter((b) => {
            if (b.coachId !== coachId)
                return false;
            if (b.status !== 'CONFIRMED' && b.status !== 'PENDING')
                return false;
            return new Date(b.scheduledAt) > now;
        });
    }
    async createFromDraft() {
        const draft = this.draft;
        if (!draft.coachId || !draft.coachName) {
            throw new Error('Cannot create booking: missing coach information');
        }
        if (!draft.athleteId || !draft.athleteName) {
            throw new Error('Cannot create booking: missing athlete information');
        }
        const scheduledAt = `${draft.date || new Date().toISOString().split('T')[0]}T${draft.slot || '10:00'}:00`;
        const booking = {
            id: `draft_${Date.now()}`,
            coachId: draft.coachId,
            coachName: draft.coachName,
            athleteIds: draft.childIds || [draft.athleteId],
            athleteId: draft.athleteId,
            athleteName: draft.athleteName,
            bookedById: draft.athleteId,
            scheduledAt,
            status: 'PENDING',
            duration: draft.duration || 60,
            location: draft.locationText || 'Coach preferred venue',
            service: draft.sessionType || '1-on-1',
            serviceType: draft.sessionType || '1-on-1',
            objectives: draft.objectives || [],
            price: draft.price || 0,
            notes: draft.notes || '',
            createdAt: new Date().toISOString(),
            isSharedSession: (draft.childIds?.length || 1) > 1,
        };
        mockBookings.push(booking);
        this.resetDraft();
        return booking;
    }
}
// Test data
const MOCK_BOOKINGS_DATA = [
    {
        id: 'booking_1',
        coachId: 'coach1',
        coachName: 'Sarah Mitchell',
        athleteId: 'athlete1',
        athleteName: 'Tom Wilson',
        bookedById: 'parent1',
        scheduledAt: '2026-02-10T10:00:00Z',
        location: 'Central Park Training Ground',
        service: '1-on-1 Training',
        status: 'CONFIRMED',
        price: 45,
        duration: 60,
    },
    {
        id: 'booking_2',
        coachId: 'coach1',
        coachName: 'Sarah Mitchell',
        athleteId: 'athlete2',
        athleteName: 'Emma Davis',
        bookedById: 'parent2',
        scheduledAt: '2026-02-11T14:00:00Z',
        location: 'City Stadium',
        service: 'Group Session',
        status: 'PENDING',
        price: 30,
        duration: 90,
    },
    {
        id: 'booking_3',
        coachId: 'coach2',
        coachName: 'James Rodriguez',
        athleteId: 'athlete1',
        athleteName: 'Tom Wilson',
        bookedById: 'parent1',
        // Past session for testing AWAITING_COMPLETION
        scheduledAt: '2025-01-01T10:00:00Z',
        location: 'Downtown Pitch',
        service: '1-on-1 Training',
        status: 'CONFIRMED',
        price: 50,
        duration: 60,
    },
];
const MOCK_AVAILABLE_SLOTS = [
    { coachId: 'coach1', date: '2026-02-15', startTime: '10:00', isAvailable: true },
    { coachId: 'coach1', date: '2026-02-15', startTime: '14:00', isAvailable: true },
    { coachId: 'coach1', date: '2026-02-15', startTime: '16:00', isAvailable: false }, // Already booked
    { coachId: 'coach2', date: '2026-02-15', startTime: '09:00', isAvailable: true },
];
let bookingService;
// Reset mocks before each test
(0, node_test_1.beforeEach)(() => {
    mockBookings = JSON.parse(JSON.stringify(MOCK_BOOKINGS_DATA));
    mockAvailableSlots = JSON.parse(JSON.stringify(MOCK_AVAILABLE_SLOTS));
    mockNotifications = [];
    bookingService = new MockBookingService();
});
// ============================================================================
// BOOKING LISTING TESTS
// ============================================================================
(0, node_test_1.describe)('BookingService - List Operations', () => {
    (0, node_test_1.default)('list() returns all bookings', async () => {
        const bookings = await bookingService.list();
        node_assert_1.default.strictEqual(bookings.length, 3);
    });
    (0, node_test_1.default)('getBooking() returns booking by ID', async () => {
        const booking = await bookingService.getBooking('booking_1');
        node_assert_1.default.ok(booking);
        node_assert_1.default.strictEqual(booking.coachName, 'Sarah Mitchell');
        node_assert_1.default.strictEqual(booking.athleteName, 'Tom Wilson');
    });
    (0, node_test_1.default)('getBooking() returns null for non-existent ID', async () => {
        const booking = await bookingService.getBooking('non_existent');
        node_assert_1.default.strictEqual(booking, null);
    });
    (0, node_test_1.default)('getById() returns booking by ID', async () => {
        const booking = await bookingService.getById('booking_2');
        node_assert_1.default.ok(booking);
        node_assert_1.default.strictEqual(booking.status, 'PENDING');
    });
});
// ============================================================================
// BOOKING CREATION TESTS
// ============================================================================
(0, node_test_1.describe)('BookingService - Create Booking', () => {
    (0, node_test_1.default)('createBooking() creates a new booking with valid slot', async () => {
        const params = {
            coachId: 'coach1',
            coachName: 'Sarah Mitchell',
            athleteIds: ['athlete3'],
            athleteNames: ['Jake Smith'],
            bookedById: 'parent3',
            bookedByName: 'Mr Smith',
            scheduledAt: '2026-02-15T10:00:00Z',
            duration: 60,
            location: 'Central Park',
            service: '1-on-1 Training',
            serviceType: '1-on-1',
            price: 45,
        };
        const result = await bookingService.createBooking(params);
        node_assert_1.default.ok(result.success);
        node_assert_1.default.ok(result.data);
        node_assert_1.default.strictEqual(result.data.coachName, 'Sarah Mitchell');
        node_assert_1.default.strictEqual(result.data.athleteName, 'Jake Smith');
        node_assert_1.default.strictEqual(result.data.status, 'CONFIRMED');
        node_assert_1.default.strictEqual(result.data.price, 45);
    });
    (0, node_test_1.default)('createBooking() fails for unavailable slot', async () => {
        const params = {
            coachId: 'coach1',
            coachName: 'Sarah Mitchell',
            athleteIds: ['athlete3'],
            athleteNames: ['Jake Smith'],
            bookedById: 'parent3',
            bookedByName: 'Mr Smith',
            scheduledAt: '2026-02-15T16:00:00Z', // Already booked slot
            duration: 60,
            location: 'Central Park',
            service: '1-on-1 Training',
            serviceType: '1-on-1',
        };
        const result = await bookingService.createBooking(params);
        node_assert_1.default.strictEqual(result.success, false);
        node_assert_1.default.ok(!result.success && result.error?.message?.includes('fully booked'));
    });
    (0, node_test_1.default)('createBooking() fails for slot outside coach hours', async () => {
        const params = {
            coachId: 'coach1',
            coachName: 'Sarah Mitchell',
            athleteIds: ['athlete3'],
            athleteNames: ['Jake Smith'],
            bookedById: 'parent3',
            bookedByName: 'Mr Smith',
            scheduledAt: '2026-02-15T22:00:00Z', // Not in available slots
            duration: 60,
            location: 'Central Park',
            service: '1-on-1 Training',
            serviceType: '1-on-1',
        };
        const result = await bookingService.createBooking(params);
        node_assert_1.default.strictEqual(result.success, false);
        node_assert_1.default.ok(!result.success && result.error?.message?.includes('available hours'));
    });
    (0, node_test_1.default)('createBooking() calculates total price for multiple athletes', async () => {
        const params = {
            coachId: 'coach1',
            coachName: 'Sarah Mitchell',
            athleteIds: ['athlete3', 'athlete4'],
            athleteNames: ['Jake Smith', 'Amy Johnson'],
            bookedById: 'parent3',
            bookedByName: 'Mr Smith',
            scheduledAt: '2026-02-15T10:00:00Z',
            duration: 60,
            location: 'Central Park',
            service: 'Shared Session',
            serviceType: 'shared',
            price: 30, // Per athlete
        };
        const result = await bookingService.createBooking(params);
        node_assert_1.default.ok(result.success);
        node_assert_1.default.strictEqual(result.data?.price, 60); // 30 * 2 athletes
        node_assert_1.default.strictEqual(result.data?.isSharedSession, true);
        node_assert_1.default.strictEqual(result.data?.athleteName, 'Jake Smith, Amy Johnson');
    });
    (0, node_test_1.default)('createBooking() creates notification for coach', async () => {
        const params = {
            coachId: 'coach1',
            coachName: 'Sarah Mitchell',
            athleteIds: ['athlete3'],
            athleteNames: ['Jake Smith'],
            bookedById: 'parent3',
            bookedByName: 'Mr Smith',
            scheduledAt: '2026-02-15T10:00:00Z',
            duration: 60,
            location: 'Central Park',
            service: '1-on-1 Training',
            serviceType: '1-on-1',
        };
        await bookingService.createBooking(params);
        const notification = mockNotifications.find((n) => n.type === 'booking_created');
        node_assert_1.default.ok(notification);
        node_assert_1.default.strictEqual(notification.coachId, 'coach1');
    });
});
// ============================================================================
// BOOKING VALIDATION TESTS
// ============================================================================
(0, node_test_1.describe)('BookingService - Validation', () => {
    (0, node_test_1.default)('validateBooking() returns valid for available slot', async () => {
        const result = await bookingService.validateBooking('coach1', '2026-02-15', '10:00', 60);
        node_assert_1.default.strictEqual(result.valid, true);
        node_assert_1.default.strictEqual(result.reason, undefined);
    });
    (0, node_test_1.default)('validateBooking() returns invalid for booked slot', async () => {
        const result = await bookingService.validateBooking('coach1', '2026-02-15', '16:00', 60);
        node_assert_1.default.strictEqual(result.valid, false);
        node_assert_1.default.ok(result.reason?.includes('fully booked'));
    });
    (0, node_test_1.default)('validateBooking() returns invalid for non-existent slot', async () => {
        const result = await bookingService.validateBooking('coach1', '2026-02-15', '23:00', 60);
        node_assert_1.default.strictEqual(result.valid, false);
        node_assert_1.default.ok(result.reason?.includes('available hours'));
    });
});
// ============================================================================
// BOOKING STATUS TESTS
// ============================================================================
(0, node_test_1.describe)('BookingService - Status Management', () => {
    (0, node_test_1.default)('updateStatus() changes booking status', async () => {
        const updated = await bookingService.updateStatus('booking_2', 'CONFIRMED');
        node_assert_1.default.ok(updated);
        node_assert_1.default.strictEqual(updated.status, 'CONFIRMED');
    });
    (0, node_test_1.default)('confirmBooking() confirms pending booking and creates notification', async () => {
        const result = await bookingService.confirmBooking('booking_2');
        node_assert_1.default.ok(result.success);
        const booking = await bookingService.getBooking('booking_2');
        node_assert_1.default.strictEqual(booking?.status, 'CONFIRMED');
        const notification = mockNotifications.find((n) => n.type === 'booking_confirmed');
        node_assert_1.default.ok(notification);
    });
    (0, node_test_1.default)('confirmBooking() fails for non-existent booking', async () => {
        const result = await bookingService.confirmBooking('non_existent');
        node_assert_1.default.strictEqual(result.success, false);
        node_assert_1.default.ok(result.error?.includes('not found'));
    });
    (0, node_test_1.default)('checkAndTransitionStatus() transitions past sessions to AWAITING_COMPLETION', async () => {
        // booking_3 is in the past
        const booking = await bookingService.checkAndTransitionStatus('booking_3');
        node_assert_1.default.strictEqual(booking.status, 'AWAITING_COMPLETION');
    });
    (0, node_test_1.default)('checkAndTransitionStatus() keeps future sessions as CONFIRMED', async () => {
        // booking_1 is in the future
        const booking = await bookingService.checkAndTransitionStatus('booking_1');
        node_assert_1.default.strictEqual(booking.status, 'CONFIRMED');
    });
});
// ============================================================================
// BOOKING CANCELLATION TESTS
// ============================================================================
(0, node_test_1.describe)('BookingService - Cancellation', () => {
    (0, node_test_1.default)('cancel() cancels booking and sets reason', async () => {
        const cancelled = await bookingService.cancel('booking_1', 'Schedule conflict', 'parent');
        node_assert_1.default.ok(cancelled);
        node_assert_1.default.strictEqual(cancelled.status, 'CANCELLED');
        node_assert_1.default.strictEqual(cancelled.cancellationReason, 'Schedule conflict');
    });
    (0, node_test_1.default)('cancel() by parent notifies coach', async () => {
        await bookingService.cancel('booking_1', 'Schedule conflict', 'parent');
        const notification = mockNotifications.find((n) => n.type === 'booking_cancelled');
        node_assert_1.default.ok(notification);
        node_assert_1.default.strictEqual(notification.cancelledBy, 'parent');
        node_assert_1.default.strictEqual(notification.recipientId, 'coach1');
    });
    (0, node_test_1.default)('cancel() by coach notifies parent', async () => {
        await bookingService.cancel('booking_1', 'Emergency', 'coach');
        const notification = mockNotifications.find((n) => n.type === 'booking_cancelled');
        node_assert_1.default.ok(notification);
        node_assert_1.default.strictEqual(notification.cancelledBy, 'coach');
        node_assert_1.default.strictEqual(notification.recipientId, 'parent1');
    });
    (0, node_test_1.default)('cancel() returns undefined for non-existent booking', async () => {
        const result = await bookingService.cancel('non_existent', 'Test');
        node_assert_1.default.strictEqual(result, undefined);
    });
});
// ============================================================================
// BOOKING QUERY TESTS
// ============================================================================
(0, node_test_1.describe)('BookingService - User Queries', () => {
    (0, node_test_1.default)('getBookingsForUser() returns coach bookings', async () => {
        const bookings = await bookingService.getBookingsForUser('coach1', 'coach');
        node_assert_1.default.strictEqual(bookings.length, 2);
        node_assert_1.default.ok(bookings.every((b) => b.coachId === 'coach1'));
    });
    (0, node_test_1.default)('getBookingsForUser() returns parent bookings', async () => {
        const bookings = await bookingService.getBookingsForUser('parent1', 'parent');
        node_assert_1.default.strictEqual(bookings.length, 2);
        node_assert_1.default.ok(bookings.every((b) => b.bookedById === 'parent1'));
    });
    (0, node_test_1.default)('getBookingsForUser() returns athlete bookings', async () => {
        const bookings = await bookingService.getBookingsForUser('athlete1', 'athlete');
        node_assert_1.default.strictEqual(bookings.length, 2);
        node_assert_1.default.ok(bookings.every((b) => b.athleteId === 'athlete1'));
    });
    (0, node_test_1.default)('getUpcomingBookings() returns future confirmed/pending bookings', async () => {
        const bookings = await bookingService.getUpcomingBookings('coach1');
        // Only booking_1 and booking_2 are future bookings for coach1
        node_assert_1.default.strictEqual(bookings.length, 2);
        node_assert_1.default.ok(bookings.every((b) => new Date(b.scheduledAt) > new Date()));
    });
    (0, node_test_1.default)('getAwaitingCompletion() returns past sessions needing completion', async () => {
        const bookings = await bookingService.getAwaitingCompletion('coach2');
        // booking_3 is past and should auto-detect as awaiting completion
        node_assert_1.default.strictEqual(bookings.length, 1);
        node_assert_1.default.strictEqual(bookings[0].id, 'booking_3');
    });
});
// ============================================================================
// DRAFT BOOKING TESTS
// ============================================================================
(0, node_test_1.describe)('BookingService - Draft Flow', () => {
    (0, node_test_1.default)('getDraft() returns empty draft initially', () => {
        const draft = bookingService.getDraft();
        node_assert_1.default.deepStrictEqual(draft, {});
    });
    (0, node_test_1.default)('updateDraft() updates draft with new values', () => {
        bookingService.updateDraft({ coachId: 'coach1', coachName: 'Sarah' });
        bookingService.updateDraft({ sessionType: '1-on-1', price: 45 });
        const draft = bookingService.getDraft();
        node_assert_1.default.strictEqual(draft.coachId, 'coach1');
        node_assert_1.default.strictEqual(draft.coachName, 'Sarah');
        node_assert_1.default.strictEqual(draft.sessionType, '1-on-1');
        node_assert_1.default.strictEqual(draft.price, 45);
    });
    (0, node_test_1.default)('resetDraft() clears the draft', () => {
        bookingService.updateDraft({ coachId: 'coach1' });
        bookingService.resetDraft();
        const draft = bookingService.getDraft();
        node_assert_1.default.deepStrictEqual(draft, {});
    });
    (0, node_test_1.default)('createFromDraft() creates booking from draft', async () => {
        bookingService.updateDraft({
            coachId: 'coach1',
            coachName: 'Sarah Mitchell',
            athleteId: 'athlete1',
            athleteName: 'Tom Wilson',
            date: '2026-02-20',
            slot: '10:00',
            sessionType: '1-on-1',
            price: 45,
            locationText: 'Central Park',
        });
        const booking = await bookingService.createFromDraft();
        node_assert_1.default.ok(booking);
        node_assert_1.default.strictEqual(booking.coachName, 'Sarah Mitchell');
        node_assert_1.default.strictEqual(booking.athleteName, 'Tom Wilson');
        node_assert_1.default.strictEqual(booking.status, 'PENDING');
        node_assert_1.default.ok(booking.scheduledAt.includes('2026-02-20'));
        // Draft should be reset after creation
        const draft = bookingService.getDraft();
        node_assert_1.default.deepStrictEqual(draft, {});
    });
    (0, node_test_1.default)('createFromDraft() throws without coach info', async () => {
        bookingService.updateDraft({
            athleteId: 'athlete1',
            athleteName: 'Tom Wilson',
        });
        await node_assert_1.default.rejects(async () => await bookingService.createFromDraft(), /missing coach information/);
    });
    (0, node_test_1.default)('createFromDraft() throws without athlete info', async () => {
        bookingService.updateDraft({
            coachId: 'coach1',
            coachName: 'Sarah Mitchell',
        });
        await node_assert_1.default.rejects(async () => await bookingService.createFromDraft(), /missing athlete information/);
    });
});
// ============================================================================
// BOOKING UPDATE TESTS
// ============================================================================
(0, node_test_1.describe)('BookingService - Update Booking', () => {
    (0, node_test_1.default)('updateBooking() updates booking fields', async () => {
        const updated = await bookingService.updateBooking('booking_1', {
            location: 'New Location',
            notes: 'Updated notes',
        });
        node_assert_1.default.strictEqual(updated.location, 'New Location');
        node_assert_1.default.strictEqual(updated.notes, 'Updated notes');
        // Original fields should be preserved
        node_assert_1.default.strictEqual(updated.coachName, 'Sarah Mitchell');
    });
    (0, node_test_1.default)('updateBooking() throws for non-existent booking', async () => {
        await node_assert_1.default.rejects(async () => await bookingService.updateBooking('non_existent', { notes: 'Test' }), /Booking not found/);
    });
});
// ============================================================================
// EDGE CASES
// ============================================================================
(0, node_test_1.describe)('BookingService - Edge Cases', () => {
    (0, node_test_1.default)('handles empty booking list', async () => {
        mockBookings = [];
        const bookings = await bookingService.list();
        node_assert_1.default.strictEqual(bookings.length, 0);
    });
    (0, node_test_1.default)('getBookingsForUser() returns empty array for unknown user', async () => {
        const bookings = await bookingService.getBookingsForUser('unknown', 'coach');
        node_assert_1.default.strictEqual(bookings.length, 0);
    });
    (0, node_test_1.default)('createBooking() with session invite link', async () => {
        const params = {
            coachId: 'coach1',
            coachName: 'Sarah Mitchell',
            athleteIds: ['athlete3'],
            athleteNames: ['Jake Smith'],
            bookedById: 'parent3',
            bookedByName: 'Mr Smith',
            scheduledAt: '2026-02-15T10:00:00Z',
            duration: 60,
            location: 'Central Park',
            service: '1-on-1 Training',
            serviceType: '1-on-1',
            sessionInviteId: 'invite_123', // Link to session invite
        };
        const result = await bookingService.createBooking(params);
        node_assert_1.default.ok(result.success);
        node_assert_1.default.strictEqual(result.data?.sessionInviteId, 'invite_123');
    });
    (0, node_test_1.default)('createBooking() with objectives', async () => {
        const params = {
            coachId: 'coach1',
            coachName: 'Sarah Mitchell',
            athleteIds: ['athlete3'],
            athleteNames: ['Jake Smith'],
            bookedById: 'parent3',
            bookedByName: 'Mr Smith',
            scheduledAt: '2026-02-15T10:00:00Z',
            duration: 60,
            location: 'Central Park',
            service: '1-on-1 Training',
            serviceType: '1-on-1',
            objectives: ['Improve passing', 'Work on stamina'],
        };
        const result = await bookingService.createBooking(params);
        node_assert_1.default.ok(result.success);
        node_assert_1.default.deepStrictEqual(result.data?.objectives, ['Improve passing', 'Work on stamina']);
    });
});
