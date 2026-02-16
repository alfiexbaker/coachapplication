"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
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
(0, node_test_1.describe)('notificationPreferencesService', () => {
    (0, node_test_1.beforeEach)(async () => {
        seq = 0;
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.NOTIFICATION_PREFERENCES, []);
    });
    (0, node_test_1.describe)('get/update', () => {
        (0, node_test_1.it)('creates defaults for new user and updates channels', async () => {
            const userId = nextId('user');
            const defaults = expectOk(await notification_preferences_1.notificationPreferencesService.getPreferences(userId));
            strict_1.default.equal(defaults.userId, userId);
            strict_1.default.equal(defaults.channels.push, true);
            strict_1.default.equal(defaults.channels.email, true);
            strict_1.default.equal(defaults.channels.sms, false);
            const updated = expectOk(await notification_preferences_1.notificationPreferencesService.toggleChannel(userId, 'PUSH', false));
            strict_1.default.equal(updated.channels.push, false);
            strict_1.default.equal(updated.userId, userId);
        });
    });
    (0, node_test_1.describe)('quiet hours', () => {
        (0, node_test_1.it)('sets and toggles quiet hours', async () => {
            const userId = nextId('user');
            const setResult = expectOk(await notification_preferences_1.notificationPreferencesService.setQuietHours(userId, '22:00', '07:00', true));
            strict_1.default.equal(setResult.quietHours.enabled, true);
            strict_1.default.equal(setResult.quietHours.startTime, '22:00');
            const toggled = expectOk(await notification_preferences_1.notificationPreferencesService.toggleQuietHours(userId, false));
            strict_1.default.equal(toggled.quietHours.enabled, false);
        });
    });
    (0, node_test_1.describe)('mute flow', () => {
        (0, node_test_1.it)('mutes and unmutes coach with shouldSend check', async () => {
            const userId = nextId('user');
            const coachId = nextId('coach');
            const muted = expectOk(await notification_preferences_1.notificationPreferencesService.muteCoach(userId, coachId, 'Coach Example'));
            strict_1.default.ok(muted.mutedCoaches.some((coach) => coach.coachId === coachId));
            const isMuted = expectOk(await notification_preferences_1.notificationPreferencesService.isCoachMuted(userId, coachId));
            strict_1.default.equal(isMuted, true);
            const shouldSend = expectOk(await notification_preferences_1.notificationPreferencesService.shouldSendNotification(userId, 'BOOKING_RECEIVED', 'PUSH', coachId));
            strict_1.default.equal(shouldSend, false);
            const unmuted = expectOk(await notification_preferences_1.notificationPreferencesService.unmuteCoach(userId, coachId));
            strict_1.default.ok(!unmuted.mutedCoaches.some((coach) => coach.coachId === coachId));
        });
    });
    (0, node_test_1.describe)('reset', () => {
        (0, node_test_1.it)('resets preferences back to defaults', async () => {
            const userId = nextId('user');
            expectOk(await notification_preferences_1.notificationPreferencesService.toggleChannel(userId, 'PUSH', false));
            expectOk(await notification_preferences_1.notificationPreferencesService.muteCoach(userId, nextId('coach'), 'Muted Coach'));
            const reset = expectOk(await notification_preferences_1.notificationPreferencesService.resetPreferences(userId));
            strict_1.default.equal(reset.channels.push, true);
            strict_1.default.equal(reset.mutedCoaches.length, 0);
        });
    });
});
