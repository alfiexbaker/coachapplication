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
const notification_sender_1 = require("@/services/notification/notification-sender");
const notification_preferences_1 = require("@/services/notification/notification-preferences");
function expectOk(result) {
    strict_1.default.equal(result.success, true);
    return result.data;
}
let seq = 0;
function nextId(prefix) {
    seq += 1;
    return `${prefix}_${seq}`;
}
(0, node_test_1.describe)('notificationSenderService', () => {
    (0, node_test_1.beforeEach)(async () => {
        seq = 0;
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.NOTIFICATIONS, []);
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.NOTIFICATION_PREFERENCES, []);
    });
    (0, node_test_1.it)('sends coach booking notification into store', async () => {
        const coachId = nextId('coach');
        expectOk(await notification_sender_1.notificationSenderService.notifyCoachNewBooking({
            coachId,
            parentName: 'Parent A',
            childName: 'Child A',
            date: '2026-03-15',
            bookingId: nextId('booking'),
        }));
        const notifications = expectOk(await notification_store_1.notificationStore.getByRecipient(coachId));
        strict_1.default.equal(notifications.length, 1);
        strict_1.default.equal(notifications[0].type, 'booking');
        strict_1.default.ok(notifications[0].body.includes('Parent A'));
    });
    (0, node_test_1.it)('respects preferences and suppresses push notifications when disabled', async () => {
        const parentId = nextId('parent');
        expectOk(await notification_preferences_1.notificationPreferencesService.toggleChannel(parentId, 'PUSH', false));
        expectOk(await notification_sender_1.notificationSenderService.notifyParentBookingConfirmed({
            parentId,
            coachName: 'Coach B',
            date: '2026-03-15',
            bookingId: nextId('booking'),
        }));
        const notifications = expectOk(await notification_store_1.notificationStore.getByRecipient(parentId));
        strict_1.default.equal(notifications.length, 0);
    });
});
