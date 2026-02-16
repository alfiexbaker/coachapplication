"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const notification_store_1 = require("@/services/notification/notification-store");
function expectOk(result) {
    strict_1.default.equal(result.success, true);
    return result.data;
}
let seq = 0;
function nextId(prefix) {
    seq += 1;
    return `${prefix}_${seq}`;
}
(0, node_test_1.describe)('notificationStore', () => {
    (0, node_test_1.beforeEach)(async () => {
        seq = 0;
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, []);
    });
    (0, node_test_1.describe)('create/list', () => {
        (0, node_test_1.it)('creates notifications and prepends newest first', async () => {
            const first = {
                id: nextId('notif'),
                type: 'booking',
                title: 'First',
                body: 'First body',
                timeLabel: 'Now',
            };
            const second = {
                id: nextId('notif'),
                type: 'message',
                title: 'Second',
                body: 'Second body',
                timeLabel: 'Now',
            };
            expectOk(await notification_store_1.notificationStore.create(first));
            expectOk(await notification_store_1.notificationStore.create(second));
            const notifications = expectOk(await notification_store_1.notificationStore.list());
            strict_1.default.equal(notifications.length, 2);
            strict_1.default.equal(notifications[0].id, second.id);
            strict_1.default.equal(notifications[1].id, first.id);
            strict_1.default.ok(notifications[0].createdAt);
            strict_1.default.equal(notifications[0].read, false);
        });
    });
    (0, node_test_1.describe)('read states', () => {
        (0, node_test_1.it)('marks single and all notifications as read', async () => {
            const idA = nextId('notif');
            const idB = nextId('notif');
            expectOk(await notification_store_1.notificationStore.create({
                id: idA,
                type: 'booking',
                title: 'A',
                body: 'A',
                timeLabel: 'Now',
            }));
            expectOk(await notification_store_1.notificationStore.create({
                id: idB,
                type: 'booking',
                title: 'B',
                body: 'B',
                timeLabel: 'Now',
            }));
            expectOk(await notification_store_1.notificationStore.markAsRead(idA));
            let unread = expectOk(await notification_store_1.notificationStore.getUnreadCount());
            strict_1.default.equal(unread, 1);
            expectOk(await notification_store_1.notificationStore.markAllAsRead());
            unread = expectOk(await notification_store_1.notificationStore.getUnreadCount());
            strict_1.default.equal(unread, 0);
        });
    });
    (0, node_test_1.describe)('dismiss/clear', () => {
        (0, node_test_1.it)('dismisses a single notification and clears all', async () => {
            const idA = nextId('notif');
            const idB = nextId('notif');
            expectOk(await notification_store_1.notificationStore.create({
                id: idA,
                type: 'message',
                title: 'A',
                body: 'A',
                timeLabel: 'Now',
            }));
            expectOk(await notification_store_1.notificationStore.create({
                id: idB,
                type: 'message',
                title: 'B',
                body: 'B',
                timeLabel: 'Now',
            }));
            const afterDismiss = expectOk(await notification_store_1.notificationStore.dismiss(idA));
            strict_1.default.equal(afterDismiss.length, 1);
            strict_1.default.equal(afterDismiss[0].id, idB);
            expectOk(await notification_store_1.notificationStore.clearAll());
            const empty = expectOk(await notification_store_1.notificationStore.list());
            strict_1.default.deepEqual(empty, []);
        });
    });
});
