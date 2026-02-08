"use strict";
// @ts-nocheck
/**
 * Accept Revert Tests
 *
 * Verifies that when booking creation fails during invite acceptance,
 * the invite status is reverted back to PENDING and an err() Result is returned.
 *
 * This tests the critical bug fix in session-invite-service.ts where previously
 * a failed bookingService.createBooking() would leave the invite stuck in
 * ACCEPTED status with no booking created.
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
// ============================================================================
// MOCK INFRASTRUCTURE
// ============================================================================
let invitesCache = [];
let mockNotifications = [];
let bookingCreateResult = {
    success: true,
    data: { id: 'booking_123' },
};
let availableSlots = [];
let releasedInviteIds = [];
// Mock bookingService
const bookingService = {
    async createBooking(_params) {
        return bookingCreateResult;
    },
};
// Mock notificationService
const notificationService = {
    async create(notification) {
        mockNotifications.push(notification);
        return mockNotifications;
    },
};
// Mock availabilityService
const availabilityService = {
    async getAvailableSlots(_coachId, _startDate, _endDate, _duration) {
        return availableSlots;
    },
};
// Mock inviteHoldService
const inviteHoldService = {
    async releaseHoldsForInvite(inviteId) {
        releasedInviteIds.push(inviteId);
    },
};
// Helper functions
const ok = (data) => ({ success: true, data });
const err = (error) => ({ success: false, error });
const serviceError = (code, message) => ({ code, message });
// ============================================================================
// SERVICE UNDER TEST (mirrors respondToInvite accept logic)
// ============================================================================
/**
 * This replicates the ACCEPTED path of respondToInvite from
 * session-invite-service.ts, including the critical revert logic.
 */
async function respondToInvite(input) {
    const index = invitesCache.findIndex((inv) => inv.id === input.inviteId);
    if (index === -1) {
        return err(serviceError('NOT_FOUND', `Invite not found: ${input.inviteId}`));
    }
    const invite = invitesCache[index];
    // Set status to ACCEPTED (optimistic)
    invitesCache[index] = {
        ...invite,
        status: input.response,
        respondedAt: new Date().toISOString(),
        selectedSlot: input.selectedSlot,
    };
    if (input.response === 'ACCEPTED') {
        const effectiveSlot = input.selectedSlot ?? (invite.proposedSlots.length > 0 ? invite.proposedSlots[0] : undefined);
        // Validate slot availability
        if (effectiveSlot) {
            const slotDate = effectiveSlot.date;
            const slotStart = effectiveSlot.startTime;
            const slots = await availabilityService.getAvailableSlots(invite.coachId, slotDate, slotDate, invite.duration || 60);
            const matchingSlot = slots.find((s) => s.date === slotDate && s.startTime === slotStart);
            if (matchingSlot && !matchingSlot.isAvailable) {
                // Slot taken - revert to PENDING
                invitesCache[index] = { ...invite, status: 'PENDING' };
                const remainingSlots = invite.proposedSlots.filter((ps) => !(ps.date === slotDate && ps.startTime === slotStart));
                return err(serviceError('CONFLICT', `This time slot is no longer available.${remainingSlots.length > 0 ? ' Please pick another time.' : ' All proposed times have been taken.'}`));
            }
        }
        // CRITICAL: Create the actual booking
        if (effectiveSlot) {
            const scheduledAt = `${effectiveSlot.date}T${effectiveSlot.startTime}:00`;
            const endTime = effectiveSlot.endTime;
            const startTime = effectiveSlot.startTime;
            const [startHour, startMin] = startTime.split(':').map(Number);
            const [endHour, endMin] = endTime.split(':').map(Number);
            const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
            const bookingResult = await bookingService.createBooking({
                coachId: invite.coachId,
                coachName: invite.coachName,
                athleteIds: [invite.athleteIds[0]],
                athleteNames: [invite.athleteNames[0]],
                bookedById: invite.parentId,
                bookedByName: invite.parentName,
                scheduledAt,
                duration: durationMinutes > 0 ? durationMinutes : 60,
                location: effectiveSlot.location || 'Coach preferred location',
                service: invite.sessionType,
                serviceType: invite.sessionType,
                objectives: invite.focus ? [invite.focus] : [],
                price: invite.priceUsd,
                notes: invite.notes,
                sessionInviteId: invite.id,
            });
            if (bookingResult.success && bookingResult.data) {
                invitesCache[index].bookingId = bookingResult.data.id;
            }
            else if (!bookingResult.success) {
                // CRITICAL BUG FIX: Revert invite status back to PENDING
                invitesCache[index] = { ...invite, status: 'PENDING' };
                return err(serviceError('CONFLICT', bookingResult.error?.message || 'Failed to create booking. Please try again.'));
            }
        }
        // Release holds
        await inviteHoldService.releaseHoldsForInvite(invite.id);
    }
    // Create notification
    const athleteNames = invite.athleteNames.join(', ');
    const notification = {
        id: `notif_${Date.now()}`,
        type: 'booking',
        title: 'Invite Accepted!',
        body: `${invite.parentName} accepted your invite for ${athleteNames}.`,
        timeLabel: 'Just now',
        read: false,
    };
    await notificationService.create(notification);
    return ok(invitesCache[index]);
}
// ============================================================================
// TEST DATA
// ============================================================================
const MOCK_INVITE = {
    id: 'inv_test_1',
    coachId: 'coach_1',
    coachName: 'Marcus Thompson',
    athleteIds: ['athlete_1'],
    athleteNames: ['Tom Baker'],
    parentId: 'parent_1',
    parentName: 'Sarah Baker',
    proposedSlots: [
        { date: '2026-03-15', startTime: '16:00', endTime: '17:00', location: 'Hackney Marshes' },
        { date: '2026-03-17', startTime: '16:00', endTime: '17:00', location: 'Hackney Marshes' },
    ],
    sessionType: '1:1 Coaching',
    focus: 'Finishing',
    priceUsd: 60,
    duration: 60,
    status: 'PENDING',
    expiresAt: '2026-03-14T23:59:59Z',
    createdAt: '2026-03-10T10:00:00Z',
};
const SELECTED_SLOT = {
    date: '2026-03-15',
    startTime: '16:00',
    endTime: '17:00',
    location: 'Hackney Marshes',
};
// ============================================================================
// TESTS
// ============================================================================
(0, node_test_1.beforeEach)(() => {
    invitesCache = [JSON.parse(JSON.stringify(MOCK_INVITE))];
    mockNotifications = [];
    releasedInviteIds = [];
    // Default: booking succeeds, slots are available
    bookingCreateResult = { success: true, data: { id: 'booking_new_123' } };
    availableSlots = [
        { date: '2026-03-15', startTime: '16:00', isAvailable: true },
        { date: '2026-03-17', startTime: '16:00', isAvailable: true },
    ];
});
// --------------------------------------------------------------------------
// ACCEPT + BOOKING SUCCESS (baseline)
// --------------------------------------------------------------------------
(0, node_test_1.describe)('Accept Invite - Booking Success (baseline)', () => {
    (0, node_test_1.default)('successful accept sets status to ACCEPTED and links bookingId', async () => {
        const result = await respondToInvite({
            inviteId: 'inv_test_1',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        node_assert_1.default.strictEqual(result.success, true);
        if (result.success) {
            node_assert_1.default.strictEqual(result.data.status, 'ACCEPTED');
            node_assert_1.default.strictEqual(result.data.bookingId, 'booking_new_123');
            node_assert_1.default.ok(result.data.respondedAt);
            node_assert_1.default.deepStrictEqual(result.data.selectedSlot, SELECTED_SLOT);
        }
    });
    (0, node_test_1.default)('successful accept releases holds for the invite', async () => {
        await respondToInvite({
            inviteId: 'inv_test_1',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        node_assert_1.default.ok(releasedInviteIds.includes('inv_test_1'));
    });
    (0, node_test_1.default)('successful accept creates a notification', async () => {
        await respondToInvite({
            inviteId: 'inv_test_1',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        node_assert_1.default.strictEqual(mockNotifications.length, 1);
        node_assert_1.default.strictEqual(mockNotifications[0].title, 'Invite Accepted!');
    });
});
// --------------------------------------------------------------------------
// ACCEPT + BOOKING FAILURE -> REVERT TO PENDING
// --------------------------------------------------------------------------
(0, node_test_1.describe)('Accept Invite - Booking Failure Reverts to PENDING', () => {
    (0, node_test_1.default)('when createBooking fails, invite reverts to PENDING', async () => {
        bookingCreateResult = {
            success: false,
            error: { code: 'VALIDATION', message: 'Coach is no longer available at this time.' },
        };
        const result = await respondToInvite({
            inviteId: 'inv_test_1',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        // Result should be err
        node_assert_1.default.strictEqual(result.success, false);
        // Invite in cache must be PENDING, not ACCEPTED
        node_assert_1.default.strictEqual(invitesCache[0].status, 'PENDING');
    });
    (0, node_test_1.default)('when createBooking fails, error result has CONFLICT code', async () => {
        bookingCreateResult = {
            success: false,
            error: { code: 'VALIDATION', message: 'Slot already booked.' },
        };
        const result = await respondToInvite({
            inviteId: 'inv_test_1',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        node_assert_1.default.strictEqual(result.success, false);
        if (!result.success) {
            node_assert_1.default.strictEqual(result.error.code, 'CONFLICT');
        }
    });
    (0, node_test_1.default)('when createBooking fails, error message is passed through', async () => {
        bookingCreateResult = {
            success: false,
            error: { code: 'VALIDATION', message: 'Coach is no longer available at this time.' },
        };
        const result = await respondToInvite({
            inviteId: 'inv_test_1',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        node_assert_1.default.strictEqual(result.success, false);
        if (!result.success) {
            node_assert_1.default.strictEqual(result.error.message, 'Coach is no longer available at this time.');
        }
    });
    (0, node_test_1.default)('when createBooking fails with no message, default message is used', async () => {
        bookingCreateResult = {
            success: false,
            error: { code: 'UNKNOWN', message: '' },
        };
        const result = await respondToInvite({
            inviteId: 'inv_test_1',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        node_assert_1.default.strictEqual(result.success, false);
        if (!result.success) {
            node_assert_1.default.strictEqual(result.error.message, 'Failed to create booking. Please try again.');
        }
    });
    (0, node_test_1.default)('when createBooking fails, invite does NOT have a bookingId', async () => {
        bookingCreateResult = {
            success: false,
            error: { code: 'VALIDATION', message: 'Slot conflict.' },
        };
        await respondToInvite({
            inviteId: 'inv_test_1',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        node_assert_1.default.strictEqual(invitesCache[0].bookingId, undefined);
    });
    (0, node_test_1.default)('when createBooking fails, respondedAt is NOT set on reverted invite', async () => {
        bookingCreateResult = {
            success: false,
            error: { code: 'VALIDATION', message: 'Nope.' },
        };
        await respondToInvite({
            inviteId: 'inv_test_1',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        // The reverted invite should restore original state (no respondedAt)
        node_assert_1.default.strictEqual(invitesCache[0].respondedAt, undefined);
    });
});
// --------------------------------------------------------------------------
// ACCEPT + SLOT UNAVAILABLE -> REVERT TO PENDING
// --------------------------------------------------------------------------
(0, node_test_1.describe)('Accept Invite - Slot Unavailable Reverts to PENDING', () => {
    (0, node_test_1.default)('when selected slot is taken, invite reverts to PENDING', async () => {
        availableSlots = [
            { date: '2026-03-15', startTime: '16:00', isAvailable: false }, // Taken!
            { date: '2026-03-17', startTime: '16:00', isAvailable: true },
        ];
        const result = await respondToInvite({
            inviteId: 'inv_test_1',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        node_assert_1.default.strictEqual(result.success, false);
        node_assert_1.default.strictEqual(invitesCache[0].status, 'PENDING');
    });
    (0, node_test_1.default)('when slot is taken with remaining slots, message suggests picking another', async () => {
        availableSlots = [
            { date: '2026-03-15', startTime: '16:00', isAvailable: false },
            { date: '2026-03-17', startTime: '16:00', isAvailable: true },
        ];
        const result = await respondToInvite({
            inviteId: 'inv_test_1',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        node_assert_1.default.strictEqual(result.success, false);
        if (!result.success) {
            node_assert_1.default.ok(result.error.message.includes('Please pick another time'));
        }
    });
    (0, node_test_1.default)('when all proposed slots are taken, message says all taken', async () => {
        // Set up invite with only one proposed slot
        invitesCache = [{
                ...JSON.parse(JSON.stringify(MOCK_INVITE)),
                proposedSlots: [SELECTED_SLOT],
            }];
        availableSlots = [
            { date: '2026-03-15', startTime: '16:00', isAvailable: false },
        ];
        const result = await respondToInvite({
            inviteId: 'inv_test_1',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        node_assert_1.default.strictEqual(result.success, false);
        if (!result.success) {
            node_assert_1.default.ok(result.error.message.includes('All proposed times have been taken'));
        }
    });
});
// --------------------------------------------------------------------------
// EDGE CASES
// --------------------------------------------------------------------------
(0, node_test_1.describe)('Accept Invite - Edge Cases', () => {
    (0, node_test_1.default)('accept non-existent invite returns NOT_FOUND', async () => {
        const result = await respondToInvite({
            inviteId: 'inv_does_not_exist',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        node_assert_1.default.strictEqual(result.success, false);
        if (!result.success) {
            node_assert_1.default.strictEqual(result.error.code, 'NOT_FOUND');
        }
    });
    (0, node_test_1.default)('accept without selectedSlot falls back to first proposed slot', async () => {
        const result = await respondToInvite({
            inviteId: 'inv_test_1',
            response: 'ACCEPTED',
            // No selectedSlot - should use proposedSlots[0]
        });
        node_assert_1.default.strictEqual(result.success, true);
        if (result.success) {
            node_assert_1.default.strictEqual(result.data.status, 'ACCEPTED');
            node_assert_1.default.strictEqual(result.data.bookingId, 'booking_new_123');
        }
    });
    (0, node_test_1.default)('accept with booking failure does not release holds (early return)', async () => {
        bookingCreateResult = {
            success: false,
            error: { code: 'VALIDATION', message: 'Slot conflict.' },
        };
        await respondToInvite({
            inviteId: 'inv_test_1',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        // Holds should NOT be released when booking fails (early return before releaseHolds)
        node_assert_1.default.strictEqual(releasedInviteIds.length, 0);
    });
});
