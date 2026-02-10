"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const notification_sender_1 = require("@/services/notification/notification-sender");
const storage_service_1 = require("@/services/storage-service");
const storage_keys_1 = require("@/constants/storage-keys");
(0, node_test_1.describe)('NotificationSenderService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await storage_service_1.storageService.removeItem(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS);
        await storage_service_1.storageService.removeItem(storage_keys_1.STORAGE_KEYS.NOTIFICATION_PREFERENCES);
    });
    (0, node_test_1.describe)('notifyCoachNewBooking', () => {
        (0, node_test_1.it)('should create notification for coach', async () => {
            const params = {
                coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                parentName: 'Test Parent',
                childName: 'Test Child',
                date: '2026-03-15',
                bookingId: 'test-booking-' + Math.random().toString(36).slice(2),
            };
            await notification_sender_1.notificationSender.notifyCoachNewBooking(params);
            const notifications = await storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, []);
            strict_1.default.ok(notifications.length > 0);
            strict_1.default.equal(notifications[0].recipientId, params.coachId);
            strict_1.default.equal(notifications[0].type, 'booking');
            strict_1.default.ok(notifications[0].body.includes(params.parentName));
        });
    });
    (0, node_test_1.describe)('notifyCoachBookingCancelled', () => {
        (0, node_test_1.it)('should create cancellation notification for coach', async () => {
            const params = {
                coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                parentName: 'Test Parent',
                date: '2026-03-15',
                bookingId: 'test-booking-' + Math.random().toString(36).slice(2),
            };
            await notification_sender_1.notificationSender.notifyCoachBookingCancelled(params);
            const notifications = await storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, []);
            strict_1.default.ok(notifications.length > 0);
            strict_1.default.equal(notifications[0].recipientId, params.coachId);
            strict_1.default.ok(notifications[0].body.includes('cancelled'));
        });
    });
    (0, node_test_1.describe)('notifyCoachInviteAccepted', () => {
        (0, node_test_1.it)('should create invite accepted notification for coach', async () => {
            const params = {
                coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                parentName: 'Test Parent',
                childName: 'Test Child',
                inviteId: 'test-invite-' + Math.random().toString(36).slice(2),
            };
            await notification_sender_1.notificationSender.notifyCoachInviteAccepted(params);
            const notifications = await storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, []);
            strict_1.default.ok(notifications.length > 0);
            strict_1.default.equal(notifications[0].recipientId, params.coachId);
            strict_1.default.ok(notifications[0].body.includes('accepted'));
        });
    });
    (0, node_test_1.describe)('notifyParentBookingConfirmed', () => {
        (0, node_test_1.it)('should create booking confirmation notification for parent', async () => {
            const params = {
                parentId: 'test-parent-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
                childName: 'Test Child',
                date: '2026-03-15',
                bookingId: 'test-booking-' + Math.random().toString(36).slice(2),
            };
            await notification_sender_1.notificationSender.notifyParentBookingConfirmed(params);
            const notifications = await storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, []);
            strict_1.default.ok(notifications.length > 0);
            strict_1.default.equal(notifications[0].recipientId, params.parentId);
            strict_1.default.ok(notifications[0].body.includes(params.coachName));
        });
    });
    (0, node_test_1.describe)('notifyParentSessionReminder', () => {
        (0, node_test_1.it)('should create session reminder notification for parent', async () => {
            const params = {
                parentId: 'test-parent-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
                childName: 'Test Child',
                date: '2026-03-15',
                time: '14:00',
                location: 'Test Venue',
                bookingId: 'test-booking-' + Math.random().toString(36).slice(2),
            };
            await notification_sender_1.notificationSender.notifyParentSessionReminder(params);
            const notifications = await storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, []);
            strict_1.default.ok(notifications.length > 0);
            strict_1.default.equal(notifications[0].recipientId, params.parentId);
            strict_1.default.ok(notifications[0].body.includes('reminder') || notifications[0].body.includes(params.time));
        });
    });
    (0, node_test_1.describe)('notifyCoachNewMessage', () => {
        (0, node_test_1.it)('should create new message notification for coach', async () => {
            const params = {
                coachId: 'test-coach-' + Math.random().toString(36).slice(2),
                parentName: 'Test Parent',
                threadId: 'test-thread-' + Math.random().toString(36).slice(2),
            };
            await notification_sender_1.notificationSender.notifyCoachNewMessage(params);
            const notifications = await storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, []);
            strict_1.default.ok(notifications.length > 0);
            strict_1.default.equal(notifications[0].recipientId, params.coachId);
            strict_1.default.ok(notifications[0].body.includes(params.parentName));
        });
    });
    (0, node_test_1.describe)('notifyParentNewMessage', () => {
        (0, node_test_1.it)('should create new message notification for parent', async () => {
            const params = {
                parentId: 'test-parent-' + Math.random().toString(36).slice(2),
                coachName: 'Test Coach',
                threadId: 'test-thread-' + Math.random().toString(36).slice(2),
            };
            await notification_sender_1.notificationSender.notifyParentNewMessage(params);
            const notifications = await storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, []);
            strict_1.default.ok(notifications.length > 0);
            strict_1.default.equal(notifications[0].recipientId, params.parentId);
            strict_1.default.ok(notifications[0].body.includes(params.coachName));
        });
    });
    (0, node_test_1.describe)('sendCustomNotification', () => {
        (0, node_test_1.it)('should create custom notification', async () => {
            const notification = {
                recipientId: 'test-user-' + Math.random().toString(36).slice(2),
                title: 'Test Title',
                body: 'Test Body',
                type: 'general',
            };
            await notification_sender_1.notificationSender.sendCustomNotification(notification);
            const notifications = await storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, []);
            strict_1.default.ok(notifications.length > 0);
            strict_1.default.equal(notifications[0].recipientId, notification.recipientId);
            strict_1.default.equal(notifications[0].title, notification.title);
            strict_1.default.equal(notifications[0].body, notification.body);
        });
    });
});
