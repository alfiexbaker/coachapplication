"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const notification_service_1 = require("@/services/notification-service");
function expectOk(result) {
    strict_1.default.equal(result.success, true);
    return result.data;
}
let seq = 0;
function nextId(prefix) {
    seq += 1;
    return `${prefix}_${seq}`;
}
(0, node_test_1.describe)('notificationService', () => {
    (0, node_test_1.beforeEach)(async () => {
        seq = 0;
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, []);
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.NOTIFICATION_PREFERENCES, []);
        expectOk(await notification_service_1.notificationService.clearAll());
    });
    (0, node_test_1.describe)('core CRUD wrapper', () => {
        (0, node_test_1.it)('creates, lists, and marks notifications as read', async () => {
            const id = nextId('notif');
            expectOk(await notification_service_1.notificationService.create({
                id,
                type: 'booking',
                title: 'Booking',
                body: 'New booking',
                timeLabel: 'Now',
                read: false,
                recipientId: 'user_1',
            }));
            const listed = expectOk(await notification_service_1.notificationService.list());
            strict_1.default.ok(listed.some((notification) => notification.id === id));
            expectOk(await notification_service_1.notificationService.markAsRead(id));
            const unreadCount = expectOk(await notification_service_1.notificationService.getUnreadCount('user_1'));
            strict_1.default.equal(unreadCount, 0);
        });
        (0, node_test_1.it)('notifies subscribers on creation', async () => {
            const received = [];
            const unsubscribe = notification_service_1.notificationService.subscribe((notification) => {
                received.push(notification.id);
            });
            const id = nextId('notif');
            expectOk(await notification_service_1.notificationService.create({
                id,
                type: 'message',
                title: 'Message',
                body: 'New message',
                timeLabel: 'Now',
                read: false,
            }));
            strict_1.default.deepEqual(received, [id]);
            unsubscribe();
        });
    });
    (0, node_test_1.describe)('preferences wrapper', () => {
        (0, node_test_1.it)('mutes/unmutes coach and updates send eligibility', async () => {
            const userId = nextId('user');
            const coachId = nextId('coach');
            const muted = expectOk(await notification_service_1.notificationService.muteCoach(userId, coachId, 'Coach One'));
            strict_1.default.ok(muted.mutedCoaches.some((coach) => coach.coachId === coachId));
            const mutedCheck = expectOk(await notification_service_1.notificationService.isCoachMuted(userId, coachId));
            strict_1.default.equal(mutedCheck, true);
            const shouldSendMuted = expectOk(await notification_service_1.notificationService.shouldSendNotification(userId, 'BOOKING_RECEIVED', 'PUSH', coachId));
            strict_1.default.strictEqual(shouldSendMuted, false);
            const unmuted = expectOk(await notification_service_1.notificationService.unmuteCoach(userId, coachId));
            strict_1.default.ok(!unmuted.mutedCoaches.some((coach) => coach.coachId === coachId));
        });
    });
});
