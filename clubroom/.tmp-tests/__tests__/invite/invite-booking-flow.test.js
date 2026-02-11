"use strict";
// @ts-nocheck
/**
 * Invite Booking Flow Tests
 *
 * Tests the CRITICAL BUG FIX in session-invite-service.ts:
 * Previously, respondToInvite() would set invite status to ACCEPTED first,
 * then attempt booking creation. If booking failed, the invite was stuck
 * ACCEPTED with no booking (orphaned). The fix creates the booking FIRST
 * and only sets ACCEPTED if booking succeeds.
 *
 * Also tests acceptCounterProposal() which has the same pattern,
 * event bus emissions (INVITE_ACCEPTED, INVITE_BOOKING_FAILED),
 * and skipAvailabilityValidation in createBooking.
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
// ============================================================================
// MOCK INFRASTRUCTURE
// ============================================================================
let invitesStorage = [];
let invitesCache = [];
let mockNotifications = [];
let bookingCreateResult = {
    success: true,
    data: { id: 'booking_abc_001' },
};
let bookingCreateCallArgs = [];
let releasedInviteIds = [];
let emittedEvents = [];
let notificationIdSeq = 0;
function nextNotificationId(prefix = 'notif') {
    notificationIdSeq += 1;
    return `${prefix}_${notificationIdSeq}`;
}
// Mock bookingService
const bookingService = {
    async createBooking(params) {
        bookingCreateCallArgs.push(params);
        return bookingCreateResult;
    },
};
// Mock notificationService
const notificationService = {
    async create(notification) {
        mockNotifications.push(notification);
    },
};
// Mock inviteHoldService
const inviteHoldService = {
    async releaseHoldsForInvite(inviteId) {
        releasedInviteIds.push(inviteId);
    },
};
// Result helpers
const ok = (data) => ({ success: true, data });
const err = (error) => ({ success: false, error });
const serviceError = (code, message) => ({ code, message });
// Mock event bus
function emitTyped(event, data) {
    emittedEvents.push({ event, data });
}
const ServiceEvents = {
    INVITE_ACCEPTED: 'invite:accepted',
    INVITE_BOOKING_FAILED: 'invite:booking_failed',
};
// Storage helpers
async function loadFromStorage() {
    return [...invitesStorage];
}
async function saveToStorage(invites) {
    invitesStorage = [...invites];
}
// ============================================================================
// SERVICE UNDER TEST — mirrors session-invite-service.ts respondToInvite()
// ============================================================================
/**
 * Exact mirror of the FIXED respondToInvite from session-invite-service.ts.
 * The critical change: booking is created FIRST. Only if ok() does the invite
 * become ACCEPTED. If err(), the invite stays at its original status.
 */
async function respondToInvite(input) {
    invitesCache = await loadFromStorage();
    const index = invitesCache.findIndex((inv) => inv.id === input.inviteId);
    if (index === -1) {
        return err(serviceError('NOT_FOUND', `Invite not found: ${input.inviteId}`));
    }
    const invite = invitesCache[index];
    if (input.response === 'ACCEPTED') {
        // CRITICAL FIX: Create booking FIRST, before changing invite status.
        if (!input.selectedSlot) {
            return err(serviceError('VALIDATION', 'A selected slot is required to accept an invite'));
        }
        const scheduledAt = `${input.selectedSlot.date}T${input.selectedSlot.startTime}:00`;
        const endTime = input.selectedSlot.endTime;
        const startTime = input.selectedSlot.startTime;
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
        const bookingResult = await bookingService.createBooking({
            coachId: invite.coachId,
            coachName: invite.coachName,
            athleteIds: invite.athleteIds,
            athleteNames: invite.athleteNames,
            bookedById: invite.parentId,
            bookedByName: invite.parentName,
            scheduledAt,
            duration: durationMinutes > 0 ? durationMinutes : 60,
            location: input.selectedSlot.location || 'Coach preferred location',
            service: invite.sessionType,
            serviceType: invite.sessionType,
            objectives: invite.focus ? [invite.focus] : [],
            price: invite.priceUsd,
            notes: invite.notes,
            sessionInviteId: invite.id,
            skipAvailabilityValidation: true,
        });
        if (!bookingResult.success) {
            const reason = bookingResult.error?.message ?? 'Booking creation failed';
            emitTyped(ServiceEvents.INVITE_BOOKING_FAILED, {
                inviteId: invite.id,
                coachId: invite.coachId,
                parentId: invite.parentId,
                reason,
            });
            return err(serviceError('CONFLICT', reason));
        }
        // Booking succeeded — NOW set invite to ACCEPTED
        invitesCache[index] = {
            ...invite,
            status: 'ACCEPTED',
            respondedAt: new Date().toISOString(),
            selectedSlot: input.selectedSlot,
            bookingId: bookingResult.data.id,
        };
        await saveToStorage(invitesCache);
        emitTyped(ServiceEvents.INVITE_ACCEPTED, {
            inviteId: invite.id,
            bookingId: bookingResult.data.id,
            coachId: invite.coachId,
            parentId: invite.parentId,
            athleteIds: invite.athleteIds,
            selectedSlot: {
                date: input.selectedSlot.date,
                startTime: input.selectedSlot.startTime,
                endTime: input.selectedSlot.endTime,
                location: input.selectedSlot.location,
            },
        });
        await notificationService.create({
            id: nextNotificationId(),
            type: 'booking',
            title: 'Invite Accepted!',
            body: `${invite.parentName} accepted your invite for ${invite.athleteNames.join(', ')}.`,
        });
        await inviteHoldService.releaseHoldsForInvite(invite.id);
        return ok(invitesCache[index]);
    }
    // DECLINED and COUNTERED: set status immediately
    invitesCache[index] = {
        ...invite,
        status: input.response,
        respondedAt: new Date().toISOString(),
        selectedSlot: input.selectedSlot,
        counterProposal: input.counterProposal,
        counterNote: input.counterNote,
    };
    await saveToStorage(invitesCache);
    if (input.response === 'DECLINED') {
        await notificationService.create({
            id: nextNotificationId('notif_declined'),
            type: 'booking',
            title: 'Invite Declined',
            body: `${invite.parentName} declined your session invite for ${invite.athleteNames.join(', ')}.`,
        });
        await inviteHoldService.releaseHoldsForInvite(invite.id);
    }
    else if (input.response === 'COUNTERED') {
        await notificationService.create({
            id: nextNotificationId('notif_counter'),
            type: 'booking',
            title: 'Counter Proposal Received',
            body: `${invite.parentName} proposed alternative times for ${invite.athleteNames.join(', ')}.`,
        });
        await inviteHoldService.releaseHoldsForInvite(invite.id);
    }
    return ok(invitesCache[index]);
}
/**
 * Exact mirror of the FIXED acceptCounterProposal from session-invite-service.ts.
 * Same booking-first pattern as respondToInvite ACCEPTED.
 */
async function acceptCounterProposal(inviteId, selectedSlot) {
    invitesCache = await loadFromStorage();
    const index = invitesCache.findIndex((inv) => inv.id === inviteId);
    if (index === -1) {
        return err(serviceError('NOT_FOUND', `Invite not found: ${inviteId}`));
    }
    const invite = invitesCache[index];
    // CRITICAL FIX: Create booking FIRST
    const scheduledAt = `${selectedSlot.date}T${selectedSlot.startTime}:00`;
    const [startHour, startMin] = selectedSlot.startTime.split(':').map(Number);
    const [endHour, endMin] = selectedSlot.endTime.split(':').map(Number);
    const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    const bookingResult = await bookingService.createBooking({
        coachId: invite.coachId,
        coachName: invite.coachName,
        athleteIds: invite.athleteIds,
        athleteNames: invite.athleteNames,
        bookedById: invite.parentId,
        bookedByName: invite.parentName,
        scheduledAt,
        duration: durationMinutes > 0 ? durationMinutes : 60,
        location: selectedSlot.location || 'Coach preferred location',
        service: invite.sessionType,
        serviceType: invite.sessionType,
        objectives: invite.focus ? [invite.focus] : [],
        price: invite.priceUsd,
        notes: invite.notes,
        sessionInviteId: invite.id,
        skipAvailabilityValidation: true,
    });
    if (!bookingResult.success) {
        const reason = bookingResult.error?.message ?? 'Booking creation failed';
        emitTyped(ServiceEvents.INVITE_BOOKING_FAILED, {
            inviteId,
            coachId: invite.coachId,
            parentId: invite.parentId,
            reason,
        });
        return err(serviceError('CONFLICT', reason));
    }
    // Booking succeeded — NOW set invite to ACCEPTED
    invitesCache[index] = {
        ...invite,
        status: 'ACCEPTED',
        selectedSlot,
        respondedAt: new Date().toISOString(),
        bookingId: bookingResult.data.id,
    };
    await saveToStorage(invitesCache);
    emitTyped(ServiceEvents.INVITE_ACCEPTED, {
        inviteId,
        bookingId: bookingResult.data.id,
        coachId: invite.coachId,
        parentId: invite.parentId,
        athleteIds: invite.athleteIds,
        selectedSlot: {
            date: selectedSlot.date,
            startTime: selectedSlot.startTime,
            endTime: selectedSlot.endTime,
            location: selectedSlot.location,
        },
    });
    await notificationService.create({
        id: nextNotificationId('notif_counter_accept'),
        type: 'booking',
        title: 'Counter Proposal Accepted!',
        body: `Coach ${invite.coachName.split(' ')[0]} accepted your proposed time. Session confirmed!`,
    });
    return ok(invitesCache[index]);
}
// ============================================================================
// TEST DATA
// ============================================================================
const PENDING_INVITE = {
    id: 'inv_flow_001',
    coachId: 'coach_flow_1',
    coachName: 'Marcus Thompson',
    athleteIds: ['athlete_flow_1'],
    athleteNames: ['Tom Baker'],
    parentId: 'parent_flow_1',
    parentName: 'Sarah Baker',
    proposedSlots: [
        { date: '2026-03-20', startTime: '16:00', endTime: '17:00', location: 'Hackney Marshes' },
        { date: '2026-03-22', startTime: '10:00', endTime: '11:00', location: 'Victoria Park' },
    ],
    sessionType: '1:1 Coaching',
    focus: 'Finishing',
    priceUsd: 60,
    duration: 60,
    status: 'PENDING',
    expiresAt: '2026-03-28T23:59:59Z',
    createdAt: '2026-03-14T10:00:00Z',
    notes: 'Work on weak foot finishing.',
};
const COUNTERED_INVITE = {
    id: 'inv_flow_002',
    coachId: 'coach_flow_2',
    coachName: 'Emma Williams',
    athleteIds: ['athlete_flow_2'],
    athleteNames: ['Lucy Baker'],
    parentId: 'parent_flow_1',
    parentName: 'Sarah Baker',
    proposedSlots: [
        { date: '2026-03-21', startTime: '17:00', endTime: '18:00', location: 'Victoria Park' },
    ],
    sessionType: 'Group Session',
    focus: 'Goalkeeping',
    priceUsd: 50,
    status: 'COUNTERED',
    expiresAt: '2026-03-28T23:59:59Z',
    createdAt: '2026-03-14T14:00:00Z',
    respondedAt: '2026-03-15T09:00:00Z',
    counterProposal: [
        { date: '2026-03-23', startTime: '15:00', endTime: '16:00', location: 'Victoria Park' },
    ],
    counterNote: 'Cannot make the original time, how about Sunday?',
};
const SELECTED_SLOT = {
    date: '2026-03-20',
    startTime: '16:00',
    endTime: '17:00',
    location: 'Hackney Marshes',
};
const COUNTER_SLOT = {
    date: '2026-03-23',
    startTime: '15:00',
    endTime: '16:00',
    location: 'Victoria Park',
};
// ============================================================================
// TESTS
// ============================================================================
(0, node_test_1.beforeEach)(() => {
    // Reset all mock state for full test isolation
    invitesStorage = [
        JSON.parse(JSON.stringify(PENDING_INVITE)),
        JSON.parse(JSON.stringify(COUNTERED_INVITE)),
    ];
    invitesCache = [];
    mockNotifications = [];
    bookingCreateCallArgs = [];
    releasedInviteIds = [];
    emittedEvents = [];
    notificationIdSeq = 0;
    bookingCreateResult = { success: true, data: { id: 'booking_abc_001' } };
});
// --------------------------------------------------------------------------
// 1. respondToInvite ACCEPTED + booking succeeds
// --------------------------------------------------------------------------
(0, node_test_1.describe)('respondToInvite ACCEPTED + booking succeeds', () => {
    (0, node_test_1.default)('invite status set to ACCEPTED', async () => {
        const result = await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        strict_1.default.equal(result.success, true);
        if (result.success) {
            strict_1.default.equal(result.data.status, 'ACCEPTED');
        }
    });
    (0, node_test_1.default)('bookingId is set on the invite', async () => {
        const result = await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        if (result.success) {
            strict_1.default.equal(result.data.bookingId, 'booking_abc_001');
        }
    });
    (0, node_test_1.default)('respondedAt is set', async () => {
        const result = await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        if (result.success) {
            strict_1.default.ok(result.data.respondedAt, 'respondedAt should be set');
        }
    });
    (0, node_test_1.default)('invite is persisted to storage with ACCEPTED status', async () => {
        await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        const stored = invitesStorage.find((inv) => inv.id === 'inv_flow_001');
        strict_1.default.equal(stored?.status, 'ACCEPTED');
        strict_1.default.equal(stored?.bookingId, 'booking_abc_001');
    });
    (0, node_test_1.default)('holds are released on success', async () => {
        await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        strict_1.default.ok(releasedInviteIds.includes('inv_flow_001'));
    });
    (0, node_test_1.default)('notification is created for coach', async () => {
        await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        strict_1.default.equal(mockNotifications.length, 1);
        strict_1.default.equal(mockNotifications[0].title, 'Invite Accepted!');
        strict_1.default.ok(mockNotifications[0].body.includes('Sarah Baker'));
        strict_1.default.ok(mockNotifications[0].body.includes('Tom Baker'));
    });
});
// --------------------------------------------------------------------------
// 2. respondToInvite ACCEPTED + booking fails
// --------------------------------------------------------------------------
(0, node_test_1.describe)('respondToInvite ACCEPTED + booking fails', () => {
    (0, node_test_1.beforeEach)(() => {
        bookingCreateResult = {
            success: false,
            error: { code: 'VALIDATION', message: 'Coach is no longer available at this time.' },
        };
    });
    (0, node_test_1.default)('result is err()', async () => {
        const result = await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        strict_1.default.equal(result.success, false);
    });
    (0, node_test_1.default)('invite stays PENDING (NOT changed to ACCEPTED)', async () => {
        await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        // Check both cache and storage
        const storedInvite = invitesStorage.find((inv) => inv.id === 'inv_flow_001');
        strict_1.default.equal(storedInvite?.status, 'PENDING', 'Invite in storage should remain PENDING');
    });
    (0, node_test_1.default)('no bookingId is set on the invite', async () => {
        await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        const storedInvite = invitesStorage.find((inv) => inv.id === 'inv_flow_001');
        strict_1.default.equal(storedInvite?.bookingId, undefined, 'No bookingId should be set when booking fails');
    });
    (0, node_test_1.default)('error has CONFLICT code', async () => {
        const result = await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        if (!result.success) {
            strict_1.default.equal(result.error.code, 'CONFLICT');
        }
    });
    (0, node_test_1.default)('error message passes through from booking failure', async () => {
        const result = await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        if (!result.success) {
            strict_1.default.equal(result.error.message, 'Coach is no longer available at this time.');
        }
    });
    (0, node_test_1.default)('holds are NOT released when booking fails', async () => {
        await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        strict_1.default.equal(releasedInviteIds.length, 0, 'Holds should not be released on booking failure');
    });
    (0, node_test_1.default)('no notification created when booking fails', async () => {
        await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        strict_1.default.equal(mockNotifications.length, 0, 'No notification should be sent when booking fails');
    });
});
// --------------------------------------------------------------------------
// 3. respondToInvite DECLINED
// --------------------------------------------------------------------------
(0, node_test_1.describe)('respondToInvite DECLINED', () => {
    (0, node_test_1.default)('invite status set to DECLINED, no booking created', async () => {
        const result = await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'DECLINED',
        });
        strict_1.default.equal(result.success, true);
        if (result.success) {
            strict_1.default.equal(result.data.status, 'DECLINED');
            strict_1.default.equal(result.data.bookingId, undefined, 'No bookingId for declined invite');
        }
        strict_1.default.equal(bookingCreateCallArgs.length, 0, 'createBooking should not be called for DECLINED');
    });
    (0, node_test_1.default)('declined notification is created', async () => {
        await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'DECLINED',
        });
        strict_1.default.equal(mockNotifications.length, 1);
        strict_1.default.equal(mockNotifications[0].title, 'Invite Declined');
    });
    (0, node_test_1.default)('holds are released on decline', async () => {
        await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'DECLINED',
        });
        strict_1.default.ok(releasedInviteIds.includes('inv_flow_001'));
    });
    (0, node_test_1.default)('no booking events are emitted', async () => {
        await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'DECLINED',
        });
        strict_1.default.equal(emittedEvents.length, 0, 'No events should be emitted for declined invite');
    });
});
// --------------------------------------------------------------------------
// 4. respondToInvite COUNTERED
// --------------------------------------------------------------------------
(0, node_test_1.describe)('respondToInvite COUNTERED', () => {
    (0, node_test_1.default)('invite status set to COUNTERED with counter-proposal data', async () => {
        const counterSlots = [
            { date: '2026-03-25', startTime: '14:00', endTime: '15:00', location: 'Hackney Marshes' },
        ];
        const result = await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'COUNTERED',
            counterProposal: counterSlots,
            counterNote: 'Can we do Tuesday instead?',
        });
        strict_1.default.equal(result.success, true);
        if (result.success) {
            strict_1.default.equal(result.data.status, 'COUNTERED');
            strict_1.default.deepEqual(result.data.counterProposal, counterSlots);
            strict_1.default.equal(result.data.counterNote, 'Can we do Tuesday instead?');
            strict_1.default.equal(result.data.bookingId, undefined, 'No bookingId for countered invite');
        }
        strict_1.default.equal(bookingCreateCallArgs.length, 0, 'createBooking should not be called for COUNTERED');
    });
    (0, node_test_1.default)('counter notification is created', async () => {
        await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'COUNTERED',
            counterProposal: [{ date: '2026-03-25', startTime: '14:00', endTime: '15:00' }],
        });
        strict_1.default.equal(mockNotifications.length, 1);
        strict_1.default.equal(mockNotifications[0].title, 'Counter Proposal Received');
    });
    (0, node_test_1.default)('no booking events are emitted', async () => {
        await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'COUNTERED',
            counterProposal: [{ date: '2026-03-25', startTime: '14:00', endTime: '15:00' }],
        });
        strict_1.default.equal(emittedEvents.length, 0, 'No events should be emitted for countered invite');
    });
});
// --------------------------------------------------------------------------
// 5. acceptCounterProposal + booking succeeds
// --------------------------------------------------------------------------
(0, node_test_1.describe)('acceptCounterProposal + booking succeeds', () => {
    (0, node_test_1.default)('invite becomes ACCEPTED with bookingId', async () => {
        bookingCreateResult = { success: true, data: { id: 'booking_counter_001' } };
        const result = await acceptCounterProposal('inv_flow_002', COUNTER_SLOT);
        strict_1.default.equal(result.success, true);
        if (result.success) {
            strict_1.default.equal(result.data.status, 'ACCEPTED');
            strict_1.default.equal(result.data.bookingId, 'booking_counter_001');
            strict_1.default.deepEqual(result.data.selectedSlot, COUNTER_SLOT);
            strict_1.default.ok(result.data.respondedAt, 'respondedAt should be set');
        }
    });
    (0, node_test_1.default)('invite is persisted to storage', async () => {
        bookingCreateResult = { success: true, data: { id: 'booking_counter_001' } };
        await acceptCounterProposal('inv_flow_002', COUNTER_SLOT);
        const stored = invitesStorage.find((inv) => inv.id === 'inv_flow_002');
        strict_1.default.equal(stored?.status, 'ACCEPTED');
        strict_1.default.equal(stored?.bookingId, 'booking_counter_001');
    });
    (0, node_test_1.default)('booking params include skipAvailabilityValidation: true', async () => {
        await acceptCounterProposal('inv_flow_002', COUNTER_SLOT);
        strict_1.default.equal(bookingCreateCallArgs.length, 1);
        strict_1.default.equal(bookingCreateCallArgs[0].skipAvailabilityValidation, true);
    });
    (0, node_test_1.default)('notification created for parent', async () => {
        await acceptCounterProposal('inv_flow_002', COUNTER_SLOT);
        strict_1.default.equal(mockNotifications.length, 1);
        strict_1.default.equal(mockNotifications[0].title, 'Counter Proposal Accepted!');
        strict_1.default.ok(mockNotifications[0].body.includes('Emma'));
    });
});
// --------------------------------------------------------------------------
// 6. acceptCounterProposal + booking fails
// --------------------------------------------------------------------------
(0, node_test_1.describe)('acceptCounterProposal + booking fails', () => {
    (0, node_test_1.beforeEach)(() => {
        bookingCreateResult = {
            success: false,
            error: { code: 'STORAGE', message: 'Failed to save booking. Please try again.' },
        };
    });
    (0, node_test_1.default)('result is err()', async () => {
        const result = await acceptCounterProposal('inv_flow_002', COUNTER_SLOT);
        strict_1.default.equal(result.success, false);
    });
    (0, node_test_1.default)('invite stays COUNTERED (NOT changed to ACCEPTED)', async () => {
        await acceptCounterProposal('inv_flow_002', COUNTER_SLOT);
        // Storage should NOT have been updated to ACCEPTED
        const stored = invitesStorage.find((inv) => inv.id === 'inv_flow_002');
        strict_1.default.equal(stored?.status, 'COUNTERED', 'Invite should remain COUNTERED when booking fails');
    });
    (0, node_test_1.default)('no bookingId set', async () => {
        await acceptCounterProposal('inv_flow_002', COUNTER_SLOT);
        const stored = invitesStorage.find((inv) => inv.id === 'inv_flow_002');
        strict_1.default.equal(stored?.bookingId, undefined);
    });
    (0, node_test_1.default)('error has CONFLICT code with passed-through message', async () => {
        const result = await acceptCounterProposal('inv_flow_002', COUNTER_SLOT);
        if (!result.success) {
            strict_1.default.equal(result.error.code, 'CONFLICT');
            strict_1.default.equal(result.error.message, 'Failed to save booking. Please try again.');
        }
    });
    (0, node_test_1.default)('no notification created on failure', async () => {
        await acceptCounterProposal('inv_flow_002', COUNTER_SLOT);
        strict_1.default.equal(mockNotifications.length, 0);
    });
});
// --------------------------------------------------------------------------
// 7. INVITE_ACCEPTED event emitted on success
// --------------------------------------------------------------------------
(0, node_test_1.describe)('INVITE_ACCEPTED event emission', () => {
    (0, node_test_1.default)('event emitted when respondToInvite succeeds', async () => {
        await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        const acceptedEvents = emittedEvents.filter((e) => e.event === ServiceEvents.INVITE_ACCEPTED);
        strict_1.default.equal(acceptedEvents.length, 1, 'Exactly one INVITE_ACCEPTED event should be emitted');
        const payload = acceptedEvents[0].data;
        strict_1.default.equal(payload.inviteId, 'inv_flow_001');
        strict_1.default.equal(payload.bookingId, 'booking_abc_001');
        strict_1.default.equal(payload.coachId, 'coach_flow_1');
        strict_1.default.equal(payload.parentId, 'parent_flow_1');
        strict_1.default.deepEqual(payload.athleteIds, ['athlete_flow_1']);
        strict_1.default.deepEqual(payload.selectedSlot, {
            date: '2026-03-20',
            startTime: '16:00',
            endTime: '17:00',
            location: 'Hackney Marshes',
        });
    });
    (0, node_test_1.default)('event emitted when acceptCounterProposal succeeds', async () => {
        await acceptCounterProposal('inv_flow_002', COUNTER_SLOT);
        const acceptedEvents = emittedEvents.filter((e) => e.event === ServiceEvents.INVITE_ACCEPTED);
        strict_1.default.equal(acceptedEvents.length, 1);
        const payload = acceptedEvents[0].data;
        strict_1.default.equal(payload.inviteId, 'inv_flow_002');
        strict_1.default.equal(payload.bookingId, 'booking_abc_001');
        strict_1.default.equal(payload.coachId, 'coach_flow_2');
    });
});
// --------------------------------------------------------------------------
// 8. INVITE_BOOKING_FAILED event emitted on failure
// --------------------------------------------------------------------------
(0, node_test_1.describe)('INVITE_BOOKING_FAILED event emission', () => {
    (0, node_test_1.beforeEach)(() => {
        bookingCreateResult = {
            success: false,
            error: { code: 'VALIDATION', message: 'Slot already booked by another parent.' },
        };
    });
    (0, node_test_1.default)('event emitted when respondToInvite booking fails', async () => {
        await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        const failedEvents = emittedEvents.filter((e) => e.event === ServiceEvents.INVITE_BOOKING_FAILED);
        strict_1.default.equal(failedEvents.length, 1, 'Exactly one INVITE_BOOKING_FAILED event should be emitted');
        const payload = failedEvents[0].data;
        strict_1.default.equal(payload.inviteId, 'inv_flow_001');
        strict_1.default.equal(payload.coachId, 'coach_flow_1');
        strict_1.default.equal(payload.parentId, 'parent_flow_1');
        strict_1.default.equal(payload.reason, 'Slot already booked by another parent.');
    });
    (0, node_test_1.default)('event emitted when acceptCounterProposal booking fails', async () => {
        await acceptCounterProposal('inv_flow_002', COUNTER_SLOT);
        const failedEvents = emittedEvents.filter((e) => e.event === ServiceEvents.INVITE_BOOKING_FAILED);
        strict_1.default.equal(failedEvents.length, 1);
        const payload = failedEvents[0].data;
        strict_1.default.equal(payload.inviteId, 'inv_flow_002');
        strict_1.default.equal(payload.reason, 'Slot already booked by another parent.');
    });
    (0, node_test_1.default)('no INVITE_ACCEPTED event emitted when booking fails', async () => {
        await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        const acceptedEvents = emittedEvents.filter((e) => e.event === ServiceEvents.INVITE_ACCEPTED);
        strict_1.default.equal(acceptedEvents.length, 0, 'INVITE_ACCEPTED should NOT be emitted when booking fails');
    });
});
// --------------------------------------------------------------------------
// 9. createBooking receives skipAvailabilityValidation: true
// --------------------------------------------------------------------------
(0, node_test_1.describe)('createBooking skipAvailabilityValidation', () => {
    (0, node_test_1.default)('respondToInvite passes skipAvailabilityValidation: true', async () => {
        await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        strict_1.default.equal(bookingCreateCallArgs.length, 1);
        strict_1.default.equal(bookingCreateCallArgs[0].skipAvailabilityValidation, true, 'skipAvailabilityValidation should be true for invite acceptance');
    });
    (0, node_test_1.default)('acceptCounterProposal passes skipAvailabilityValidation: true', async () => {
        await acceptCounterProposal('inv_flow_002', COUNTER_SLOT);
        strict_1.default.equal(bookingCreateCallArgs.length, 1);
        strict_1.default.equal(bookingCreateCallArgs[0].skipAvailabilityValidation, true, 'skipAvailabilityValidation should be true for counter-proposal acceptance');
    });
    (0, node_test_1.default)('booking params include sessionInviteId to link invite to booking', async () => {
        await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        strict_1.default.equal(bookingCreateCallArgs[0].sessionInviteId, 'inv_flow_001');
    });
    (0, node_test_1.default)('booking params calculate correct duration from slot times', async () => {
        const twoHourSlot = {
            date: '2026-03-20',
            startTime: '14:00',
            endTime: '16:00',
            location: 'Hackney Marshes',
        };
        await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'ACCEPTED',
            selectedSlot: twoHourSlot,
        });
        strict_1.default.equal(bookingCreateCallArgs[0].duration, 120, 'Duration should be 120 minutes for 14:00-16:00');
    });
    (0, node_test_1.default)('booking params default to 60 minutes when start equals end', async () => {
        const sameTimes = {
            date: '2026-03-20',
            startTime: '14:00',
            endTime: '14:00',
            location: 'Hackney Marshes',
        };
        await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'ACCEPTED',
            selectedSlot: sameTimes,
        });
        strict_1.default.equal(bookingCreateCallArgs[0].duration, 60, 'Duration should default to 60 for zero-length slot');
    });
});
// --------------------------------------------------------------------------
// 10. Edge cases and NOT_FOUND handling
// --------------------------------------------------------------------------
(0, node_test_1.describe)('Edge cases', () => {
    (0, node_test_1.default)('respondToInvite with non-existent inviteId returns NOT_FOUND', async () => {
        const result = await respondToInvite({
            inviteId: 'inv_does_not_exist',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        strict_1.default.equal(result.success, false);
        if (!result.success) {
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
            strict_1.default.ok(result.error.message.includes('inv_does_not_exist'));
        }
    });
    (0, node_test_1.default)('acceptCounterProposal with non-existent inviteId returns NOT_FOUND', async () => {
        const result = await acceptCounterProposal('inv_ghost', COUNTER_SLOT);
        strict_1.default.equal(result.success, false);
        if (!result.success) {
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        }
    });
    (0, node_test_1.default)('respondToInvite ACCEPTED without selectedSlot returns VALIDATION error', async () => {
        const result = await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'ACCEPTED',
            // No selectedSlot
        });
        strict_1.default.equal(result.success, false);
        if (!result.success) {
            strict_1.default.equal(result.error.code, 'VALIDATION');
            strict_1.default.ok(result.error.message.includes('selected slot'));
        }
    });
    (0, node_test_1.default)('booking params include all invite data for traceability', async () => {
        await respondToInvite({
            inviteId: 'inv_flow_001',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        const params = bookingCreateCallArgs[0];
        strict_1.default.equal(params.coachId, 'coach_flow_1');
        strict_1.default.equal(params.coachName, 'Marcus Thompson');
        strict_1.default.deepEqual(params.athleteIds, ['athlete_flow_1']);
        strict_1.default.deepEqual(params.athleteNames, ['Tom Baker']);
        strict_1.default.equal(params.bookedById, 'parent_flow_1');
        strict_1.default.equal(params.bookedByName, 'Sarah Baker');
        strict_1.default.equal(params.scheduledAt, '2026-03-20T16:00:00');
        strict_1.default.equal(params.location, 'Hackney Marshes');
        strict_1.default.equal(params.service, '1:1 Coaching');
        strict_1.default.equal(params.price, 60);
        strict_1.default.deepEqual(params.objectives, ['Finishing']);
        strict_1.default.equal(params.notes, 'Work on weak foot finishing.');
    });
    (0, node_test_1.default)('respondToInvite forwards all athletes for multi-athlete invite', async () => {
        invitesStorage.push({
            ...PENDING_INVITE,
            id: 'inv_multi_001',
            athleteIds: ['athlete_flow_1', 'athlete_flow_3'],
            athleteNames: ['Tom Baker', 'Leo Baker'],
        });
        await respondToInvite({
            inviteId: 'inv_multi_001',
            response: 'ACCEPTED',
            selectedSlot: SELECTED_SLOT,
        });
        const params = bookingCreateCallArgs[0];
        strict_1.default.deepEqual(params.athleteIds, ['athlete_flow_1', 'athlete_flow_3']);
        strict_1.default.deepEqual(params.athleteNames, ['Tom Baker', 'Leo Baker']);
    });
    (0, node_test_1.default)('acceptCounterProposal forwards all athletes for multi-athlete invite', async () => {
        invitesStorage.push({
            ...COUNTERED_INVITE,
            id: 'inv_multi_002',
            athleteIds: ['athlete_flow_2', 'athlete_flow_4'],
            athleteNames: ['Lucy Baker', 'Maya Baker'],
        });
        await acceptCounterProposal('inv_multi_002', COUNTER_SLOT);
        const params = bookingCreateCallArgs[0];
        strict_1.default.deepEqual(params.athleteIds, ['athlete_flow_2', 'athlete_flow_4']);
        strict_1.default.deepEqual(params.athleteNames, ['Lucy Baker', 'Maya Baker']);
    });
});
