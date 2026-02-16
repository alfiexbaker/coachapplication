"use strict";
// @ts-nocheck
/**
 * Notification Sender — Child Identity Tests
 *
 * Verifies that the 3 notification methods updated in Phase 3
 * (notifyCoachBookingCancelled, notifyCoachInviteDeclined, notifyParentBookingConfirmed)
 * correctly include or omit child name in the notification body
 * based on the optional childName + isMultiChild parameters.
 *
 * Strategy: We import the real notificationSenderService and mock its
 * dependencies (notificationStore, notificationPreferencesService, pushNotificationService).
 * Since those are module singletons already loaded by test-register, we override
 * the relevant methods before each test.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const notification_sender_1 = require("@/services/notification/notification-sender");
const notification_store_1 = require("@/services/notification/notification-store");
const notification_preferences_1 = require("@/services/notification/notification-preferences");
// ============================================================================
// MOCK SETUP
// ============================================================================
/** Capture notifications created via notificationStore.create() */
let capturedNotifications = [];
/** Original methods — restored after each test */
const originalCreate = notification_store_1.notificationStore.create.bind(notification_store_1.notificationStore);
const originalShouldSend = notification_preferences_1.notificationPreferencesService.shouldSendNotification.bind(notification_preferences_1.notificationPreferencesService);
(0, node_test_1.beforeEach)(() => {
    capturedNotifications = [];
    // Mock notificationStore.create to capture and succeed
    notification_store_1.notificationStore.create = async (notification) => {
        capturedNotifications.push({
            title: notification.title,
            body: notification.body ?? '',
        });
        return { success: true, data: [notification] };
    };
    // Mock shouldSendNotification to always allow
    notification_preferences_1.notificationPreferencesService.shouldSendNotification = async () => {
        return { success: true, data: true };
    };
});
// ============================================================================
// notifyCoachBookingCancelled
// ============================================================================
(0, node_test_1.describe)('notifyCoachBookingCancelled — child identity', () => {
    (0, node_test_1.it)('includes childName in body when childName + isMultiChild=true', async () => {
        const result = await notification_sender_1.notificationSenderService.notifyCoachBookingCancelled({
            coachId: 'coach_c1',
            parentName: 'Sarah Baker',
            childName: 'Tom',
            isMultiChild: true,
            date: '15 Mar',
            bookingId: 'bk_c1',
        });
        strict_1.default.strictEqual(result.success, true);
        strict_1.default.strictEqual(capturedNotifications.length, 1);
        const body = capturedNotifications[0].body;
        strict_1.default.ok(body.includes("Tom's booking"), `Expected "Tom's booking" in body, got: "${body}"`);
    });
    (0, node_test_1.it)('omits childName when childName is not provided (backward compat)', async () => {
        const result = await notification_sender_1.notificationSenderService.notifyCoachBookingCancelled({
            coachId: 'coach_c2',
            parentName: 'Sarah Baker',
            date: '15 Mar',
            bookingId: 'bk_c2',
        });
        strict_1.default.strictEqual(result.success, true);
        strict_1.default.strictEqual(capturedNotifications.length, 1);
        const body = capturedNotifications[0].body;
        strict_1.default.ok(body.includes('cancelled booking for 15 Mar'), `Expected generic body, got: "${body}"`);
        strict_1.default.ok(!body.includes("'s booking"), `Should NOT contain child possessive, got: "${body}"`);
    });
});
// ============================================================================
// notifyCoachInviteDeclined
// ============================================================================
(0, node_test_1.describe)('notifyCoachInviteDeclined — child identity', () => {
    (0, node_test_1.it)('includes childName in body when childName is provided', async () => {
        const result = await notification_sender_1.notificationSenderService.notifyCoachInviteDeclined({
            coachId: 'coach_d1',
            parentName: 'Sarah Baker',
            childName: 'Lucy',
            inviteId: 'inv_d1',
        });
        strict_1.default.strictEqual(result.success, true);
        strict_1.default.strictEqual(capturedNotifications.length, 1);
        const body = capturedNotifications[0].body;
        strict_1.default.ok(body.includes('for Lucy'), `Expected "for Lucy" in body, got: "${body}"`);
    });
    (0, node_test_1.it)('omits childName when not provided (backward compat)', async () => {
        const result = await notification_sender_1.notificationSenderService.notifyCoachInviteDeclined({
            coachId: 'coach_d2',
            parentName: 'Sarah Baker',
            inviteId: 'inv_d2',
        });
        strict_1.default.strictEqual(result.success, true);
        strict_1.default.strictEqual(capturedNotifications.length, 1);
        const body = capturedNotifications[0].body;
        strict_1.default.ok(body.includes('declined session invite'), `Expected generic decline text, got: "${body}"`);
        strict_1.default.ok(!body.includes('for '), `Should NOT contain "for " child specifier when no child given, got: "${body}"`);
    });
});
// ============================================================================
// notifyParentBookingConfirmed
// ============================================================================
(0, node_test_1.describe)('notifyParentBookingConfirmed — child identity', () => {
    (0, node_test_1.it)('includes childName in body when childName + isMultiChild=true', async () => {
        const result = await notification_sender_1.notificationSenderService.notifyParentBookingConfirmed({
            parentId: 'parent_p1',
            coachName: 'Marcus Thompson',
            childName: 'Tom',
            isMultiChild: true,
            date: '15 Mar',
            bookingId: 'bk_p1',
        });
        strict_1.default.strictEqual(result.success, true);
        strict_1.default.strictEqual(capturedNotifications.length, 1);
        const body = capturedNotifications[0].body;
        strict_1.default.ok(body.includes("Tom's booking confirmed"), `Expected "Tom's booking confirmed" in body, got: "${body}"`);
    });
    (0, node_test_1.it)('omits childName when not provided (backward compat)', async () => {
        const result = await notification_sender_1.notificationSenderService.notifyParentBookingConfirmed({
            parentId: 'parent_p2',
            coachName: 'Marcus Thompson',
            date: '15 Mar',
            bookingId: 'bk_p2',
        });
        strict_1.default.strictEqual(result.success, true);
        strict_1.default.strictEqual(capturedNotifications.length, 1);
        const body = capturedNotifications[0].body;
        strict_1.default.ok(body.includes('Booking confirmed with Coach Marcus Thompson'), `Expected generic body, got: "${body}"`);
        strict_1.default.ok(!body.includes("'s booking"), `Should NOT contain child possessive, got: "${body}"`);
    });
});
