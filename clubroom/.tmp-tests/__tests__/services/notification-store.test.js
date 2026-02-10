"use strict";
/**
 * Notification Store Tests
 *
 * Tests for core notification CRUD, event emissions, and in-app listeners.
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
const notification_store_1 = require("../../services/notification/notification-store");
const event_bus_1 = require("../../services/event-bus");
function makeNotification(overrides = {}) {
    return {
        id: `notif_${Math.random().toString(36).slice(2, 9)}`,
        type: 'booking',
        title: 'Test Notification',
        body: 'Test body',
        timeLabel: 'Just now',
        read: false,
        recipientId: 'user_1',
        recipientRole: 'parent',
        ...overrides,
    };
}
(0, node_test_1.describe)('NotificationStore', () => {
    (0, node_test_1.beforeEach)(async () => {
        await notification_store_1.notificationStore.clearAll();
        eventBus.clearAll();
    });
    (0, node_test_1.describe)('create + list', () => {
        (0, node_test_1.default)('creates a notification and lists it', async () => {
            const notif = makeNotification();
            await notification_store_1.notificationStore.create(notif);
            const all = await notification_store_1.notificationStore.list();
            strict_1.default.ok(all.length >= 1);
            strict_1.default.equal(all[0].id, notif.id);
        });
        (0, node_test_1.default)('sets createdAt if not provided', async () => {
            const notif = makeNotification();
            await notification_store_1.notificationStore.create(notif);
            const all = await notification_store_1.notificationStore.list();
            strict_1.default.ok(all[0].createdAt);
        });
        (0, node_test_1.default)('emits NOTIFICATION_CREATED event', async () => {
            let emitted = false;
            eventBus.on(event_bus_1.ServiceEvents.NOTIFICATION_CREATED, () => { emitted = true; });
            await notification_store_1.notificationStore.create(makeNotification());
            strict_1.default.equal(emitted, true);
        });
    });
    (0, node_test_1.describe)('markAsRead', () => {
        (0, node_test_1.default)('marks a notification as read', async () => {
            const notif = makeNotification({ read: false });
            await notification_store_1.notificationStore.create(notif);
            const updated = await notification_store_1.notificationStore.markAsRead(notif.id);
            const found = updated.find((n) => n.id === notif.id);
            strict_1.default.equal(found?.read, true);
        });
        (0, node_test_1.default)('emits NOTIFICATION_READ event', async () => {
            let readId = '';
            eventBus.on(event_bus_1.ServiceEvents.NOTIFICATION_READ, (d) => {
                readId = d.notificationId;
            });
            const notif = makeNotification();
            await notification_store_1.notificationStore.create(notif);
            await notification_store_1.notificationStore.markAsRead(notif.id);
            strict_1.default.equal(readId, notif.id);
        });
    });
    (0, node_test_1.describe)('markAllAsRead', () => {
        (0, node_test_1.default)('marks all notifications as read', async () => {
            await notification_store_1.notificationStore.create(makeNotification({ id: 'a1' }));
            await notification_store_1.notificationStore.create(makeNotification({ id: 'a2' }));
            const updated = await notification_store_1.notificationStore.markAllAsRead();
            strict_1.default.ok(updated.every((n) => n.read === true));
        });
    });
    (0, node_test_1.describe)('dismiss', () => {
        (0, node_test_1.default)('removes a notification', async () => {
            const notif = makeNotification();
            await notification_store_1.notificationStore.create(notif);
            const after = await notification_store_1.notificationStore.dismiss(notif.id);
            strict_1.default.ok(!after.find((n) => n.id === notif.id));
        });
        (0, node_test_1.default)('emits NOTIFICATION_DISMISSED event', async () => {
            let dismissed = '';
            eventBus.on(event_bus_1.ServiceEvents.NOTIFICATION_DISMISSED, (d) => {
                dismissed = d.notificationId;
            });
            const notif = makeNotification();
            await notification_store_1.notificationStore.create(notif);
            await notification_store_1.notificationStore.dismiss(notif.id);
            strict_1.default.equal(dismissed, notif.id);
        });
    });
    (0, node_test_1.describe)('getUnreadCount', () => {
        (0, node_test_1.default)('counts unread notifications', async () => {
            await notification_store_1.notificationStore.create(makeNotification({ id: 'u1', read: false, recipientId: 'user_1' }));
            await notification_store_1.notificationStore.create(makeNotification({ id: 'u2', read: true, recipientId: 'user_1' }));
            const count = await notification_store_1.notificationStore.getUnreadCount('user_1');
            strict_1.default.equal(count, 1);
        });
    });
    (0, node_test_1.describe)('getByRecipient', () => {
        (0, node_test_1.default)('filters by recipientId', async () => {
            await notification_store_1.notificationStore.create(makeNotification({ id: 'r1', recipientId: 'user_1' }));
            await notification_store_1.notificationStore.create(makeNotification({ id: 'r2', recipientId: 'user_2' }));
            const result = await notification_store_1.notificationStore.getByRecipient('user_1');
            strict_1.default.equal(result.length, 1);
            strict_1.default.equal(result[0].recipientId, 'user_1');
        });
    });
    (0, node_test_1.describe)('getByType', () => {
        (0, node_test_1.default)('filters by notification type', async () => {
            await notification_store_1.notificationStore.create(makeNotification({ id: 't1', type: 'booking' }));
            await notification_store_1.notificationStore.create(makeNotification({ id: 't2', type: 'message' }));
            const bookings = await notification_store_1.notificationStore.getByType('booking');
            strict_1.default.equal(bookings.length, 1);
            strict_1.default.equal(bookings[0].type, 'booking');
        });
    });
    (0, node_test_1.describe)('subscribe', () => {
        (0, node_test_1.default)('listener receives new notifications', async () => {
            const received = [];
            const unsub = notification_store_1.notificationStore.subscribe((n) => received.push(n));
            await notification_store_1.notificationStore.create(makeNotification());
            strict_1.default.equal(received.length, 1);
            unsub();
        });
        (0, node_test_1.default)('unsubscribe stops receiving', async () => {
            const received = [];
            const unsub = notification_store_1.notificationStore.subscribe((n) => received.push(n));
            unsub();
            await notification_store_1.notificationStore.create(makeNotification());
            strict_1.default.equal(received.length, 0);
        });
    });
});
