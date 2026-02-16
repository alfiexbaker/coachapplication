"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const push_notification_service_1 = require("@/services/push-notification-service");
(0, node_test_1.describe)('pushNotificationService', () => {
    (0, node_test_1.it)('register call does not throw and returns nullable token', async () => {
        const token = await push_notification_service_1.pushNotificationService.registerForPushNotifications();
        strict_1.default.ok(token === null || typeof token === 'string');
    });
    (0, node_test_1.it)('schedules local notification safely in test runtime', async () => {
        const id = await push_notification_service_1.pushNotificationService.scheduleLocalNotification({
            title: 'Test Notification',
            body: 'Hello',
            data: { type: 'test' },
        });
        strict_1.default.equal(typeof id, 'string');
    });
    (0, node_test_1.it)('cancel and badge APIs are no-op safe', async () => {
        await push_notification_service_1.pushNotificationService.cancelNotification('non-existent-id');
        await push_notification_service_1.pushNotificationService.cancelAllNotifications();
        await push_notification_service_1.pushNotificationService.setBadgeCount(2);
        strict_1.default.ok(true);
    });
});
