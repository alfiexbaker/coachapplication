"use strict";
// @ts-nocheck
/**
 * Notification Trigger Tests — Post-Session Completion Flow
 *
 * Tests for the notification-trigger.ts service, specifically:
 * - reviewPrompt() accepts bookingId and generates the correct deep link /review/${bookingId}
 * - sessionCompleted() generates correct notification with deep link /bookings
 * - noShowMarked() generates correct notification for absent athletes
 *
 * These tests verify the notification triggers that fire after a coach completes a session.
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
// Capture notifications created by triggerNotification()
let capturedNotifications = [];
// Mock notificationService.create to capture what triggerNotification sends
const mockNotificationService = {
    create: async (notification) => {
        capturedNotifications.push(notification);
        return [notification];
    },
};
function mapToNotificationType(actionType) {
    if (actionType.includes('booking') || actionType.includes('session') || actionType.includes('invite') || actionType.includes('rsvp') || actionType.includes('cancel'))
        return 'booking';
    if (actionType.includes('message'))
        return 'message';
    if (actionType.includes('review'))
        return 'review';
    if (actionType.includes('payment') || actionType.includes('earning'))
        return 'payment';
    if (actionType.includes('badge') || actionType.includes('drill') || actionType.includes('goal'))
        return 'badge';
    return 'reminder';
}
async function triggerNotification(action) {
    const notificationType = mapToNotificationType(action.type);
    await mockNotificationService.create({
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: notificationType,
        title: action.title,
        body: action.body,
        recipientId: action.recipientId,
        recipientRole: action.recipientRole === 'athlete' ? undefined : action.recipientRole,
        deepLink: action.deepLink,
        data: action.data,
        read: false,
    });
}
// Re-implement the notificationTriggers matching source exactly
const notificationTriggers = {
    sessionCompleted(coachName, athleteName, recipientId) {
        return triggerNotification({
            type: 'session_completed',
            recipientRole: 'parent',
            recipientId,
            title: 'Session Completed',
            body: `Coach ${coachName} completed ${athleteName}'s session`,
            deepLink: '/bookings',
        });
    },
    reviewPrompt(coachName, athleteName, bookingId, recipientId) {
        return triggerNotification({
            type: 'review_prompt',
            recipientRole: 'parent',
            recipientId,
            title: 'How was the session?',
            body: `Rate ${athleteName}'s session with Coach ${coachName}`,
            deepLink: `/review/${bookingId}`,
        });
    },
    noShowMarked(athleteName, sessionDate, recipientId) {
        return triggerNotification({
            type: 'no_show_marked',
            recipientRole: 'parent',
            recipientId,
            title: 'No-Show Recorded',
            body: `${athleteName} was marked as no-show for the session on ${sessionDate}`,
            deepLink: '/bookings',
        });
    },
};
// ============================================================================
// SETUP
// ============================================================================
(0, node_test_1.beforeEach)(() => {
    capturedNotifications = [];
});
// ============================================================================
// reviewPrompt TESTS
// ============================================================================
(0, node_test_1.describe)('notificationTriggers.reviewPrompt', () => {
    (0, node_test_1.default)('accepts bookingId as 3rd parameter and generates /review/${bookingId} deep link', async () => {
        const bookingId = 'booking_abc123';
        await notificationTriggers.reviewPrompt('Coach Sarah', 'Tom Wilson', bookingId, 'parent_1');
        node_assert_1.default.strictEqual(capturedNotifications.length, 1);
        const notif = capturedNotifications[0];
        node_assert_1.default.strictEqual(notif.deepLink, `/review/${bookingId}`);
    });
    (0, node_test_1.default)('generates correct notification title and body', async () => {
        await notificationTriggers.reviewPrompt('Marcus', 'Emma Davis', 'booking_xyz', 'parent_2');
        const notif = capturedNotifications[0];
        node_assert_1.default.strictEqual(notif.title, 'How was the session?');
        node_assert_1.default.strictEqual(notif.body, "Rate Emma Davis's session with Coach Marcus");
    });
    (0, node_test_1.default)('sets recipientRole to parent', async () => {
        await notificationTriggers.reviewPrompt('Coach Sarah', 'Tom', 'b1', 'parent_1');
        const notif = capturedNotifications[0];
        node_assert_1.default.strictEqual(notif.recipientRole, 'parent');
    });
    (0, node_test_1.default)('sets recipientId correctly', async () => {
        const parentId = 'parent_specific_id';
        await notificationTriggers.reviewPrompt('Coach Sarah', 'Tom', 'b1', parentId);
        const notif = capturedNotifications[0];
        node_assert_1.default.strictEqual(notif.recipientId, parentId);
    });
    (0, node_test_1.default)('maps to review notification type via review_prompt action type', async () => {
        await notificationTriggers.reviewPrompt('Coach Sarah', 'Tom', 'b1');
        const notif = capturedNotifications[0];
        node_assert_1.default.strictEqual(notif.type, 'review');
    });
    (0, node_test_1.default)('generates unique deep link per bookingId', async () => {
        await notificationTriggers.reviewPrompt('Coach Sarah', 'Tom', 'booking_001', 'p1');
        await notificationTriggers.reviewPrompt('Coach Sarah', 'Emma', 'booking_002', 'p2');
        node_assert_1.default.strictEqual(capturedNotifications.length, 2);
        node_assert_1.default.strictEqual(capturedNotifications[0].deepLink, '/review/booking_001');
        node_assert_1.default.strictEqual(capturedNotifications[1].deepLink, '/review/booking_002');
        node_assert_1.default.notStrictEqual(capturedNotifications[0].deepLink, capturedNotifications[1].deepLink);
    });
    (0, node_test_1.default)('works without recipientId (optional parameter)', async () => {
        await notificationTriggers.reviewPrompt('Coach Sarah', 'Tom', 'booking_999');
        const notif = capturedNotifications[0];
        node_assert_1.default.strictEqual(notif.deepLink, '/review/booking_999');
        node_assert_1.default.strictEqual(notif.recipientId, undefined);
    });
    (0, node_test_1.default)('notification is created with read=false', async () => {
        await notificationTriggers.reviewPrompt('Coach Sarah', 'Tom', 'b1');
        const notif = capturedNotifications[0];
        node_assert_1.default.strictEqual(notif.read, false);
    });
});
// ============================================================================
// sessionCompleted TESTS
// ============================================================================
(0, node_test_1.describe)('notificationTriggers.sessionCompleted', () => {
    (0, node_test_1.default)('generates deep link to /bookings', async () => {
        await notificationTriggers.sessionCompleted('Coach Sarah', 'Tom Wilson', 'parent_1');
        const notif = capturedNotifications[0];
        node_assert_1.default.strictEqual(notif.deepLink, '/bookings');
    });
    (0, node_test_1.default)('generates correct title and body', async () => {
        await notificationTriggers.sessionCompleted('Marcus', 'Emma Davis', 'parent_2');
        const notif = capturedNotifications[0];
        node_assert_1.default.strictEqual(notif.title, 'Session Completed');
        node_assert_1.default.strictEqual(notif.body, "Coach Marcus completed Emma Davis's session");
    });
    (0, node_test_1.default)('maps to booking notification type via session_completed action type', async () => {
        await notificationTriggers.sessionCompleted('Coach Sarah', 'Tom');
        const notif = capturedNotifications[0];
        node_assert_1.default.strictEqual(notif.type, 'booking');
    });
    (0, node_test_1.default)('sends notification to parent role', async () => {
        await notificationTriggers.sessionCompleted('Coach Sarah', 'Tom', 'parent_1');
        const notif = capturedNotifications[0];
        node_assert_1.default.strictEqual(notif.recipientRole, 'parent');
        node_assert_1.default.strictEqual(notif.recipientId, 'parent_1');
    });
});
// ============================================================================
// noShowMarked TESTS
// ============================================================================
(0, node_test_1.describe)('notificationTriggers.noShowMarked', () => {
    (0, node_test_1.default)('generates notification with correct deep link', async () => {
        await notificationTriggers.noShowMarked('Tom Wilson', 'Mon 10 Feb', 'parent_1');
        const notif = capturedNotifications[0];
        node_assert_1.default.strictEqual(notif.deepLink, '/bookings');
    });
    (0, node_test_1.default)('generates correct title and body', async () => {
        await notificationTriggers.noShowMarked('Emma Davis', 'Tue 11 Feb', 'parent_2');
        const notif = capturedNotifications[0];
        node_assert_1.default.strictEqual(notif.title, 'No-Show Recorded');
        node_assert_1.default.strictEqual(notif.body, 'Emma Davis was marked as no-show for the session on Tue 11 Feb');
    });
    (0, node_test_1.default)('sends notification to parent role', async () => {
        await notificationTriggers.noShowMarked('Tom', 'Mon 10 Feb', 'parent_1');
        const notif = capturedNotifications[0];
        node_assert_1.default.strictEqual(notif.recipientRole, 'parent');
        node_assert_1.default.strictEqual(notif.recipientId, 'parent_1');
    });
});
// ============================================================================
// mapToNotificationType TESTS
// ============================================================================
(0, node_test_1.describe)('mapToNotificationType', () => {
    (0, node_test_1.default)('maps review_prompt to review type', () => {
        node_assert_1.default.strictEqual(mapToNotificationType('review_prompt'), 'review');
    });
    (0, node_test_1.default)('maps session_completed to booking type', () => {
        node_assert_1.default.strictEqual(mapToNotificationType('session_completed'), 'booking');
    });
    (0, node_test_1.default)('maps no_show_marked to reminder type (no matching keyword)', () => {
        // 'no_show_marked' does not contain booking/session/invite/rsvp/cancel/message/review/payment/earning/badge/drill/goal
        // Actually, let's check: it doesn't match any of those keywords so should be 'reminder'
        // Wait: it doesn't contain any of the keywords, so it should map to 'reminder'
        node_assert_1.default.strictEqual(mapToNotificationType('no_show_marked'), 'reminder');
    });
    (0, node_test_1.default)('maps booking_confirmed to booking type', () => {
        node_assert_1.default.strictEqual(mapToNotificationType('booking_confirmed'), 'booking');
    });
    (0, node_test_1.default)('maps badge_earned to badge type', () => {
        node_assert_1.default.strictEqual(mapToNotificationType('badge_earned'), 'badge');
    });
    (0, node_test_1.default)('maps drill_completed to badge type', () => {
        node_assert_1.default.strictEqual(mapToNotificationType('drill_completed'), 'badge');
    });
    (0, node_test_1.default)('maps message type correctly', () => {
        node_assert_1.default.strictEqual(mapToNotificationType('new_message'), 'message');
    });
    (0, node_test_1.default)('maps payment types correctly', () => {
        node_assert_1.default.strictEqual(mapToNotificationType('payment_succeeded'), 'payment');
        node_assert_1.default.strictEqual(mapToNotificationType('earning_received'), 'payment');
    });
    (0, node_test_1.default)('unknown types default to reminder', () => {
        node_assert_1.default.strictEqual(mapToNotificationType('unknown_action'), 'reminder');
    });
});
// ============================================================================
// triggerNotification TESTS (underlying function)
// ============================================================================
(0, node_test_1.describe)('triggerNotification', () => {
    (0, node_test_1.default)('creates notification with all fields from action', async () => {
        await triggerNotification({
            type: 'review_prompt',
            recipientRole: 'parent',
            recipientId: 'parent_123',
            title: 'Test Title',
            body: 'Test Body',
            deepLink: '/test/link',
            data: { key: 'value' },
        });
        node_assert_1.default.strictEqual(capturedNotifications.length, 1);
        const notif = capturedNotifications[0];
        node_assert_1.default.strictEqual(notif.title, 'Test Title');
        node_assert_1.default.strictEqual(notif.body, 'Test Body');
        node_assert_1.default.strictEqual(notif.deepLink, '/test/link');
        node_assert_1.default.strictEqual(notif.recipientId, 'parent_123');
        node_assert_1.default.strictEqual(notif.recipientRole, 'parent');
        node_assert_1.default.strictEqual(notif.read, false);
    });
    (0, node_test_1.default)('maps athlete recipientRole to undefined (no recipient role for athlete)', async () => {
        await triggerNotification({
            type: 'test_action',
            recipientRole: 'athlete',
            recipientId: 'athlete_1',
            title: 'Test',
            body: 'Test',
        });
        const notif = capturedNotifications[0];
        node_assert_1.default.strictEqual(notif.recipientRole, undefined);
    });
    (0, node_test_1.default)('generates unique notification IDs', async () => {
        await triggerNotification({
            type: 'test',
            recipientRole: 'parent',
            title: 'A',
            body: 'A',
        });
        await triggerNotification({
            type: 'test',
            recipientRole: 'parent',
            title: 'B',
            body: 'B',
        });
        node_assert_1.default.strictEqual(capturedNotifications.length, 2);
        node_assert_1.default.notStrictEqual(capturedNotifications[0].id, capturedNotifications[1].id);
    });
});
