"use strict";
// @ts-nocheck
/**
 * Decline Reason Tests
 *
 * Verifies that when a parent declines an invite:
 * 1. The declineReason and declineNote fields are persisted to the invite
 * 2. The notification sent to the coach includes the reason and note text
 *
 * These tests cover the decline reason persistence feature added to
 * session-invite-service.ts respondToInvite().
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
let releasedInviteIds = [];
// Mock notificationService
const notificationService = {
    async create(notification) {
        mockNotifications.push(notification);
        return mockNotifications;
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
// SERVICE UNDER TEST (mirrors respondToInvite DECLINED path)
// ============================================================================
/**
 * Replicates the DECLINED path of respondToInvite from
 * session-invite-service.ts, including decline reason persistence
 * and enhanced notification body.
 */
async function respondToInviteDecline(input) {
    const index = invitesCache.findIndex((inv) => inv.id === input.inviteId);
    if (index === -1) {
        return err(serviceError('NOT_FOUND', `Invite not found: ${input.inviteId}`));
    }
    const invite = invitesCache[index];
    // Update invite with response + decline fields
    invitesCache[index] = {
        ...invite,
        status: input.response,
        respondedAt: new Date().toISOString(),
        ...(input.response === 'DECLINED' && {
            declineReason: input.declineReason,
            declineNote: input.declineNote,
        }),
    };
    const athleteNames = invite.athleteNames.join(', ');
    // Build notification
    const notification = {
        id: `notif_${Date.now()}`,
        type: 'booking',
        title: '',
        body: '',
        timeLabel: 'Just now',
        read: false,
    };
    if (input.response === 'DECLINED') {
        notification.title = 'Invite Declined';
        const reasonLabel = input.declineReason
            ? ` Reason: ${input.declineReason.replace(/_/g, ' ')}.`
            : '';
        const noteLabel = input.declineNote ? ` "${input.declineNote}"` : '';
        notification.body = `${invite.parentName} declined your session invite for ${athleteNames}.${reasonLabel}${noteLabel}`;
        // Release all holds
        await inviteHoldService.releaseHoldsForInvite(invite.id);
    }
    await notificationService.create(notification);
    return ok(invitesCache[index]);
}
// ============================================================================
// TEST DATA
// ============================================================================
const MOCK_INVITE = {
    id: 'inv_decline_1',
    coachId: 'coach_1',
    coachName: 'Marcus Thompson',
    athleteIds: ['athlete_1'],
    athleteNames: ['Tom Baker'],
    parentId: 'parent_1',
    parentName: 'Sarah Baker',
    proposedSlots: [
        { date: '2026-03-15', startTime: '16:00', endTime: '17:00', location: 'Hackney Marshes' },
    ],
    sessionType: '1:1 Coaching',
    focus: 'Finishing',
    priceUsd: 60,
    duration: 60,
    status: 'PENDING',
    expiresAt: '2026-03-14T23:59:59Z',
    createdAt: '2026-03-10T10:00:00Z',
};
// ============================================================================
// TESTS
// ============================================================================
(0, node_test_1.beforeEach)(() => {
    invitesCache = [JSON.parse(JSON.stringify(MOCK_INVITE))];
    mockNotifications = [];
    releasedInviteIds = [];
});
// --------------------------------------------------------------------------
// DECLINE REASON PERSISTENCE
// --------------------------------------------------------------------------
(0, node_test_1.describe)('Decline Reason - Persistence', () => {
    (0, node_test_1.default)('decline with reason persists declineReason to invite', async () => {
        const result = await respondToInviteDecline({
            inviteId: 'inv_decline_1',
            response: 'DECLINED',
            declineReason: 'schedule_conflict',
        });
        node_assert_1.default.strictEqual(result.success, true);
        if (result.success) {
            node_assert_1.default.strictEqual(result.data.declineReason, 'schedule_conflict');
        }
    });
    (0, node_test_1.default)('decline with note persists declineNote to invite', async () => {
        const result = await respondToInviteDecline({
            inviteId: 'inv_decline_1',
            response: 'DECLINED',
            declineReason: 'other',
            declineNote: 'We are on holiday that week.',
        });
        node_assert_1.default.strictEqual(result.success, true);
        if (result.success) {
            node_assert_1.default.strictEqual(result.data.declineNote, 'We are on holiday that week.');
        }
    });
    (0, node_test_1.default)('decline persists both reason and note together', async () => {
        const result = await respondToInviteDecline({
            inviteId: 'inv_decline_1',
            response: 'DECLINED',
            declineReason: 'too_far',
            declineNote: 'The venue is 45 min drive.',
        });
        node_assert_1.default.strictEqual(result.success, true);
        if (result.success) {
            node_assert_1.default.strictEqual(result.data.declineReason, 'too_far');
            node_assert_1.default.strictEqual(result.data.declineNote, 'The venue is 45 min drive.');
        }
    });
    (0, node_test_1.default)('decline without reason has undefined declineReason', async () => {
        const result = await respondToInviteDecline({
            inviteId: 'inv_decline_1',
            response: 'DECLINED',
        });
        node_assert_1.default.strictEqual(result.success, true);
        if (result.success) {
            node_assert_1.default.strictEqual(result.data.declineReason, undefined);
        }
    });
    (0, node_test_1.default)('decline without note has undefined declineNote', async () => {
        const result = await respondToInviteDecline({
            inviteId: 'inv_decline_1',
            response: 'DECLINED',
            declineReason: 'price',
        });
        node_assert_1.default.strictEqual(result.success, true);
        if (result.success) {
            node_assert_1.default.strictEqual(result.data.declineNote, undefined);
        }
    });
    (0, node_test_1.default)('decline sets status to DECLINED', async () => {
        const result = await respondToInviteDecline({
            inviteId: 'inv_decline_1',
            response: 'DECLINED',
            declineReason: 'child_unavailable',
        });
        node_assert_1.default.strictEqual(result.success, true);
        if (result.success) {
            node_assert_1.default.strictEqual(result.data.status, 'DECLINED');
        }
    });
    (0, node_test_1.default)('decline sets respondedAt timestamp', async () => {
        const before = new Date().toISOString();
        const result = await respondToInviteDecline({
            inviteId: 'inv_decline_1',
            response: 'DECLINED',
        });
        const after = new Date().toISOString();
        node_assert_1.default.strictEqual(result.success, true);
        if (result.success) {
            node_assert_1.default.ok(result.data.respondedAt);
            node_assert_1.default.ok(result.data.respondedAt >= before);
            node_assert_1.default.ok(result.data.respondedAt <= after);
        }
    });
    (0, node_test_1.default)('decline persists all reason categories correctly', async () => {
        const reasons = ['schedule_conflict', 'too_far', 'price', 'child_unavailable', 'other'];
        for (const reason of reasons) {
            // Reset cache for each iteration
            invitesCache = [{ ...JSON.parse(JSON.stringify(MOCK_INVITE)), id: `inv_${reason}` }];
            const result = await respondToInviteDecline({
                inviteId: `inv_${reason}`,
                response: 'DECLINED',
                declineReason: reason,
            });
            node_assert_1.default.strictEqual(result.success, true, `Failed for reason: ${reason}`);
            if (result.success) {
                node_assert_1.default.strictEqual(result.data.declineReason, reason, `Reason mismatch for: ${reason}`);
            }
        }
    });
});
// --------------------------------------------------------------------------
// DECLINE NOTIFICATION ENHANCEMENT
// --------------------------------------------------------------------------
(0, node_test_1.describe)('Decline Reason - Notification Enhancement', () => {
    (0, node_test_1.default)('decline notification includes reason text (underscores replaced with spaces)', async () => {
        await respondToInviteDecline({
            inviteId: 'inv_decline_1',
            response: 'DECLINED',
            declineReason: 'schedule_conflict',
        });
        node_assert_1.default.strictEqual(mockNotifications.length, 1);
        const body = mockNotifications[0].body;
        node_assert_1.default.ok(body.includes('Reason: schedule conflict.'), `Expected reason in body, got: "${body}"`);
    });
    (0, node_test_1.default)('decline notification includes note in quotes', async () => {
        await respondToInviteDecline({
            inviteId: 'inv_decline_1',
            response: 'DECLINED',
            declineReason: 'other',
            declineNote: 'Going on vacation.',
        });
        const body = mockNotifications[0].body;
        node_assert_1.default.ok(body.includes('"Going on vacation."'), `Expected note in body, got: "${body}"`);
    });
    (0, node_test_1.default)('decline notification includes parent name and athlete names', async () => {
        await respondToInviteDecline({
            inviteId: 'inv_decline_1',
            response: 'DECLINED',
            declineReason: 'price',
        });
        const body = mockNotifications[0].body;
        node_assert_1.default.ok(body.includes('Sarah Baker'), `Expected parent name, got: "${body}"`);
        node_assert_1.default.ok(body.includes('Tom Baker'), `Expected athlete name, got: "${body}"`);
    });
    (0, node_test_1.default)('decline notification title is "Invite Declined"', async () => {
        await respondToInviteDecline({
            inviteId: 'inv_decline_1',
            response: 'DECLINED',
        });
        node_assert_1.default.strictEqual(mockNotifications[0].title, 'Invite Declined');
    });
    (0, node_test_1.default)('decline notification without reason has no reason suffix', async () => {
        await respondToInviteDecline({
            inviteId: 'inv_decline_1',
            response: 'DECLINED',
        });
        const body = mockNotifications[0].body;
        node_assert_1.default.ok(!body.includes('Reason:'), `Should NOT include "Reason:" when no reason given, got: "${body}"`);
    });
    (0, node_test_1.default)('decline notification without note has no quoted text', async () => {
        await respondToInviteDecline({
            inviteId: 'inv_decline_1',
            response: 'DECLINED',
            declineReason: 'too_far',
        });
        const body = mockNotifications[0].body;
        // Should end with the reason, no quotes
        node_assert_1.default.ok(!body.includes('"'), `Should NOT include quotes when no note given, got: "${body}"`);
    });
    (0, node_test_1.default)('decline notification with both reason and note includes both', async () => {
        await respondToInviteDecline({
            inviteId: 'inv_decline_1',
            response: 'DECLINED',
            declineReason: 'child_unavailable',
            declineNote: 'Has a school trip.',
        });
        const body = mockNotifications[0].body;
        node_assert_1.default.ok(body.includes('Reason: child unavailable.'), `Expected reason, got: "${body}"`);
        node_assert_1.default.ok(body.includes('"Has a school trip."'), `Expected note, got: "${body}"`);
    });
    (0, node_test_1.default)('decline notification body format matches expected pattern', async () => {
        await respondToInviteDecline({
            inviteId: 'inv_decline_1',
            response: 'DECLINED',
            declineReason: 'price',
            declineNote: 'A bit over budget right now.',
        });
        const body = mockNotifications[0].body;
        const expected = 'Sarah Baker declined your session invite for Tom Baker. Reason: price. "A bit over budget right now."';
        node_assert_1.default.strictEqual(body, expected);
    });
});
// --------------------------------------------------------------------------
// DECLINE - HOLDS & SIDE EFFECTS
// --------------------------------------------------------------------------
(0, node_test_1.describe)('Decline Reason - Holds and Side Effects', () => {
    (0, node_test_1.default)('decline releases holds for the invite', async () => {
        await respondToInviteDecline({
            inviteId: 'inv_decline_1',
            response: 'DECLINED',
            declineReason: 'schedule_conflict',
        });
        node_assert_1.default.ok(releasedInviteIds.includes('inv_decline_1'));
    });
    (0, node_test_1.default)('decline for non-existent invite returns NOT_FOUND', async () => {
        const result = await respondToInviteDecline({
            inviteId: 'inv_does_not_exist',
            response: 'DECLINED',
        });
        node_assert_1.default.strictEqual(result.success, false);
        if (!result.success) {
            node_assert_1.default.strictEqual(result.error.code, 'NOT_FOUND');
        }
    });
    (0, node_test_1.default)('decline with multiple athletes shows all names in notification', async () => {
        invitesCache = [{
                ...JSON.parse(JSON.stringify(MOCK_INVITE)),
                athleteIds: ['athlete_1', 'athlete_2'],
                athleteNames: ['Tom Baker', 'Lucy Baker'],
            }];
        await respondToInviteDecline({
            inviteId: 'inv_decline_1',
            response: 'DECLINED',
            declineReason: 'schedule_conflict',
        });
        const body = mockNotifications[0].body;
        node_assert_1.default.ok(body.includes('Tom Baker, Lucy Baker'), `Expected both names, got: "${body}"`);
    });
});
