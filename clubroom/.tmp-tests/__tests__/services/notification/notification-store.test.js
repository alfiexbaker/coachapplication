"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const notification_store_1 = require("@/services/notification/notification-store");
const storage_service_1 = require("@/services/storage-service");
const storage_keys_1 = require("@/constants/storage-keys");
const event_bus_1 = require("@/services/event-bus");
(0, node_test_1.describe)('NotificationStore', () => {
    (0, node_test_1.beforeEach)(async () => {
        await storage_service_1.storageService.removeItem(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS);
    });
    (0, node_test_1.describe)('list', () => {
        (0, node_test_1.it)('should return empty array when no notifications exist', async () => {
            const notifications = await notification_store_1.notificationStore.list();
            strict_1.default.ok(Array.isArray(notifications));
            strict_1.default.equal(notifications.length, 0);
        });
        (0, node_test_1.it)('should return all notifications', async () => {
            const notification = {
                id: 'test-notif-' + Math.random().toString(36).slice(2),
                type: 'booking',
                title: 'Test Notification',
                body: 'Test body',
                timeLabel: 'Just now',
                recipientId: 'test-user-' + Math.random().toString(36).slice(2),
            };
            await notification_store_1.notificationStore.create(notification);
            const notifications = await notification_store_1.notificationStore.list();
            strict_1.default.equal(notifications.length, 1);
        });
    });
    (0, node_test_1.describe)('create', () => {
        (0, node_test_1.it)('should create notification with createdAt timestamp', async () => {
            const notification = {
                id: 'test-notif-' + Math.random().toString(36).slice(2),
                type: 'booking',
                title: 'Test Notification',
                body: 'Test body',
                timeLabel: 'Just now',
            };
            await notification_store_1.notificationStore.create(notification);
            const notifications = await notification_store_1.notificationStore.list();
            strict_1.default.equal(notifications.length, 1);
            strict_1.default.ok(notifications[0].createdAt);
        });
        (0, node_test_1.it)('should set read to false by default', async () => {
            const notification = {
                id: 'test-notif-' + Math.random().toString(36).slice(2),
                type: 'general',
                title: 'Test Notification',
                body: 'Test body',
                timeLabel: 'Just now',
            };
            await notification_store_1.notificationStore.create(notification);
            const notifications = await notification_store_1.notificationStore.list();
            strict_1.default.equal(notifications[0].read, false);
        });
        (0, node_test_1.it)('should emit NOTIFICATION_CREATED event', async () => {
            const notification = {
                id: 'test-notif-' + Math.random().toString(36).slice(2),
                type: 'booking',
                title: 'Test Notification',
                body: 'Test body',
                timeLabel: 'Just now',
                recipientId: 'test-user-' + Math.random().toString(36).slice(2),
            };
            const events = [];
            const unsub = (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.NOTIFICATION_CREATED, (payload) => {
                events.push(payload);
            });
            await notification_store_1.notificationStore.create(notification);
            strict_1.default.equal(events.length, 1);
            strict_1.default.equal(events[0].notificationId, notification.id);
            unsub();
        });
        (0, node_test_1.it)('should prepend new notification to list', async () => {
            const notif1 = {
                id: 'test-notif-1-' + Math.random().toString(36).slice(2),
                type: 'general',
                title: 'First',
                body: 'First notification',
                timeLabel: 'Just now',
            };
            const notif2 = {
                id: 'test-notif-2-' + Math.random().toString(36).slice(2),
                type: 'general',
                title: 'Second',
                body: 'Second notification',
                timeLabel: 'Just now',
            };
            await notification_store_1.notificationStore.create(notif1);
            await notification_store_1.notificationStore.create(notif2);
            const notifications = await notification_store_1.notificationStore.list();
            strict_1.default.equal(notifications.length, 2);
            strict_1.default.equal(notifications[0].id, notif2.id);
            strict_1.default.equal(notifications[1].id, notif1.id);
        });
    });
    (0, node_test_1.describe)('markAsRead', () => {
        (0, node_test_1.it)('should mark notification as read', async () => {
            const notification = {
                id: 'test-notif-' + Math.random().toString(36).slice(2),
                type: 'booking',
                title: 'Test Notification',
                body: 'Test body',
                timeLabel: 'Just now',
            };
            await notification_store_1.notificationStore.create(notification);
            await notification_store_1.notificationStore.markAsRead(notification.id);
            const notifications = await notification_store_1.notificationStore.list();
            strict_1.default.equal(notifications[0].read, true);
        });
        (0, node_test_1.it)('should emit NOTIFICATION_READ event', async () => {
            const notification = {
                id: 'test-notif-' + Math.random().toString(36).slice(2),
                type: 'booking',
                title: 'Test Notification',
                body: 'Test body',
                timeLabel: 'Just now',
            };
            await notification_store_1.notificationStore.create(notification);
            const events = [];
            const unsub = (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.NOTIFICATION_READ, (payload) => {
                events.push(payload);
            });
            await notification_store_1.notificationStore.markAsRead(notification.id);
            strict_1.default.equal(events.length, 1);
            strict_1.default.equal(events[0].notificationId, notification.id);
            unsub();
        });
    });
    (0, node_test_1.describe)('markAllAsRead', () => {
        (0, node_test_1.it)('should mark all notifications as read', async () => {
            const notif1 = {
                id: 'test-notif-1-' + Math.random().toString(36).slice(2),
                type: 'general',
                title: 'First',
                body: 'First notification',
                timeLabel: 'Just now',
            };
            const notif2 = {
                id: 'test-notif-2-' + Math.random().toString(36).slice(2),
                type: 'general',
                title: 'Second',
                body: 'Second notification',
                timeLabel: 'Just now',
            };
            await notification_store_1.notificationStore.create(notif1);
            await notification_store_1.notificationStore.create(notif2);
            await notification_store_1.notificationStore.markAllAsRead();
            const notifications = await notification_store_1.notificationStore.list();
            strict_1.default.equal(notifications.every((n) => n.read === true), true);
        });
    });
    (0, node_test_1.describe)('delete', () => {
        (0, node_test_1.it)('should remove notification from list', async () => {
            const notification = {
                id: 'test-notif-' + Math.random().toString(36).slice(2),
                type: 'booking',
                title: 'Test Notification',
                body: 'Test body',
                timeLabel: 'Just now',
            };
            await notification_store_1.notificationStore.create(notification);
            await notification_store_1.notificationStore.delete(notification.id);
            const notifications = await notification_store_1.notificationStore.list();
            strict_1.default.equal(notifications.length, 0);
        });
        (0, node_test_1.it)('should handle deleting non-existent notification gracefully', async () => {
            await notification_store_1.notificationStore.delete('non-existent-id');
            const notifications = await notification_store_1.notificationStore.list();
            strict_1.default.equal(notifications.length, 0);
        });
    });
    (0, node_test_1.describe)('clear', () => {
        (0, node_test_1.it)('should remove all notifications', async () => {
            const notif1 = {
                id: 'test-notif-1-' + Math.random().toString(36).slice(2),
                type: 'general',
                title: 'First',
                body: 'First notification',
                timeLabel: 'Just now',
            };
            const notif2 = {
                id: 'test-notif-2-' + Math.random().toString(36).slice(2),
                type: 'general',
                title: 'Second',
                body: 'Second notification',
                timeLabel: 'Just now',
            };
            await notification_store_1.notificationStore.create(notif1);
            await notification_store_1.notificationStore.create(notif2);
            await notification_store_1.notificationStore.clear();
            const notifications = await notification_store_1.notificationStore.list();
            strict_1.default.equal(notifications.length, 0);
        });
    });
    (0, node_test_1.describe)('getUnreadCount', () => {
        (0, node_test_1.it)('should return count of unread notifications', async () => {
            const notif1 = {
                id: 'test-notif-1-' + Math.random().toString(36).slice(2),
                type: 'general',
                title: 'First',
                body: 'First notification',
                timeLabel: 'Just now',
            };
            const notif2 = {
                id: 'test-notif-2-' + Math.random().toString(36).slice(2),
                type: 'general',
                title: 'Second',
                body: 'Second notification',
                timeLabel: 'Just now',
            };
            await notification_store_1.notificationStore.create(notif1);
            await notification_store_1.notificationStore.create(notif2);
            await notification_store_1.notificationStore.markAsRead(notif1.id);
            const count = await notification_store_1.notificationStore.getUnreadCount();
            strict_1.default.equal(count, 1);
        });
        (0, node_test_1.it)('should return 0 when all notifications are read', async () => {
            const notif = {
                id: 'test-notif-' + Math.random().toString(36).slice(2),
                type: 'general',
                title: 'Test',
                body: 'Test notification',
                timeLabel: 'Just now',
            };
            await notification_store_1.notificationStore.create(notif);
            await notification_store_1.notificationStore.markAllAsRead();
            const count = await notification_store_1.notificationStore.getUnreadCount();
            strict_1.default.equal(count, 0);
        });
    });
});
