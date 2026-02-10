"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const notification_preferences_1 = require("@/services/notification/notification-preferences");
const storage_service_1 = require("@/services/storage-service");
const storage_keys_1 = require("@/constants/storage-keys");
(0, node_test_1.describe)('NotificationPreferencesService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await storage_service_1.storageService.removeItem(storage_keys_1.STORAGE_KEYS.NOTIFICATION_PREFERENCES);
    });
    (0, node_test_1.describe)('getPreferences', () => {
        (0, node_test_1.it)('should create default preferences for new user', async () => {
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            const prefs = await notification_preferences_1.notificationPreferencesService.getPreferences(userId);
            strict_1.default.equal(prefs.userId, userId);
            strict_1.default.equal(prefs.channels.push, true);
            strict_1.default.equal(prefs.channels.email, true);
            strict_1.default.equal(prefs.channels.sms, false);
            strict_1.default.equal(prefs.quietHours.enabled, false);
        });
        (0, node_test_1.it)('should return existing preferences for known user', async () => {
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            const prefs1 = await notification_preferences_1.notificationPreferencesService.getPreferences(userId);
            const prefs2 = await notification_preferences_1.notificationPreferencesService.getPreferences(userId);
            strict_1.default.equal(prefs1.userId, prefs2.userId);
            strict_1.default.equal(prefs1.createdAt, prefs2.createdAt);
        });
    });
    (0, node_test_1.describe)('updatePreferences', () => {
        (0, node_test_1.it)('should update preferences and set updatedAt', async () => {
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            await notification_preferences_1.notificationPreferencesService.getPreferences(userId);
            const updated = await notification_preferences_1.notificationPreferencesService.updatePreferences(userId, {
                channels: { push: false, email: true, sms: false },
            });
            strict_1.default.equal(updated.channels.push, false);
            strict_1.default.ok(updated.updatedAt);
        });
        (0, node_test_1.it)('should preserve userId even if updates try to change it', async () => {
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            await notification_preferences_1.notificationPreferencesService.getPreferences(userId);
            const updated = await notification_preferences_1.notificationPreferencesService.updatePreferences(userId, {
                userId: 'different-user',
            });
            strict_1.default.equal(updated.userId, userId);
        });
    });
    (0, node_test_1.describe)('setQuietHours', () => {
        (0, node_test_1.it)('should set quiet hours with enabled=true', async () => {
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            const prefs = await notification_preferences_1.notificationPreferencesService.setQuietHours(userId, '22:00', '07:00', true);
            strict_1.default.equal(prefs.quietHours.enabled, true);
            strict_1.default.equal(prefs.quietHours.startTime, '22:00');
            strict_1.default.equal(prefs.quietHours.endTime, '07:00');
        });
    });
    (0, node_test_1.describe)('toggleQuietHours', () => {
        (0, node_test_1.it)('should toggle quiet hours enabled state', async () => {
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            await notification_preferences_1.notificationPreferencesService.setQuietHours(userId, '22:00', '07:00', true);
            const toggled = await notification_preferences_1.notificationPreferencesService.toggleQuietHours(userId, false);
            strict_1.default.equal(toggled.quietHours.enabled, false);
            strict_1.default.equal(toggled.quietHours.startTime, '22:00');
            strict_1.default.equal(toggled.quietHours.endTime, '07:00');
        });
    });
    (0, node_test_1.describe)('toggleChannel', () => {
        (0, node_test_1.it)('should toggle push channel', async () => {
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            const prefs = await notification_preferences_1.notificationPreferencesService.toggleChannel(userId, 'PUSH', false);
            strict_1.default.equal(prefs.channels.push, false);
        });
        (0, node_test_1.it)('should toggle email channel', async () => {
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            const prefs = await notification_preferences_1.notificationPreferencesService.toggleChannel(userId, 'EMAIL', false);
            strict_1.default.equal(prefs.channels.email, false);
        });
    });
    (0, node_test_1.describe)('muteCoach', () => {
        (0, node_test_1.it)('should add coach to muted list', async () => {
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
            const prefs = await notification_preferences_1.notificationPreferencesService.muteCoach(userId, coachId, 'Test Coach');
            strict_1.default.equal(prefs.mutedCoaches.length, 1);
            strict_1.default.equal(prefs.mutedCoaches[0].coachId, coachId);
            strict_1.default.equal(prefs.mutedCoaches[0].coachName, 'Test Coach');
        });
        (0, node_test_1.it)('should not add duplicate muted coach', async () => {
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
            await notification_preferences_1.notificationPreferencesService.muteCoach(userId, coachId, 'Test Coach');
            const prefs = await notification_preferences_1.notificationPreferencesService.muteCoach(userId, coachId, 'Test Coach');
            strict_1.default.equal(prefs.mutedCoaches.length, 1);
        });
    });
    (0, node_test_1.describe)('unmuteCoach', () => {
        (0, node_test_1.it)('should remove coach from muted list', async () => {
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
            await notification_preferences_1.notificationPreferencesService.muteCoach(userId, coachId, 'Test Coach');
            const prefs = await notification_preferences_1.notificationPreferencesService.unmuteCoach(userId, coachId);
            strict_1.default.equal(prefs.mutedCoaches.length, 0);
        });
    });
    (0, node_test_1.describe)('isCoachMuted', () => {
        (0, node_test_1.it)('should return true for muted coach', async () => {
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
            await notification_preferences_1.notificationPreferencesService.muteCoach(userId, coachId, 'Test Coach');
            const isMuted = await notification_preferences_1.notificationPreferencesService.isCoachMuted(userId, coachId);
            strict_1.default.equal(isMuted, true);
        });
        (0, node_test_1.it)('should return false for non-muted coach', async () => {
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
            const isMuted = await notification_preferences_1.notificationPreferencesService.isCoachMuted(userId, coachId);
            strict_1.default.equal(isMuted, false);
        });
    });
    (0, node_test_1.describe)('shouldSendNotification', () => {
        (0, node_test_1.it)('should return false when channel is disabled', async () => {
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            await notification_preferences_1.notificationPreferencesService.toggleChannel(userId, 'PUSH', false);
            const shouldSend = await notification_preferences_1.notificationPreferencesService.shouldSendNotification(userId, 'BOOKING_RECEIVED', 'PUSH');
            strict_1.default.equal(shouldSend, false);
        });
        (0, node_test_1.it)('should return false when coach is muted', async () => {
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
            await notification_preferences_1.notificationPreferencesService.muteCoach(userId, coachId, 'Test Coach');
            const shouldSend = await notification_preferences_1.notificationPreferencesService.shouldSendNotification(userId, 'BOOKING_RECEIVED', 'PUSH', coachId);
            strict_1.default.equal(shouldSend, false);
        });
        (0, node_test_1.it)('should return true when all conditions pass', async () => {
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            const shouldSend = await notification_preferences_1.notificationPreferencesService.shouldSendNotification(userId, 'BOOKING_RECEIVED', 'PUSH');
            strict_1.default.equal(shouldSend, true);
        });
    });
    (0, node_test_1.describe)('resetPreferences', () => {
        (0, node_test_1.it)('should reset to default preferences', async () => {
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            await notification_preferences_1.notificationPreferencesService.toggleChannel(userId, 'PUSH', false);
            await notification_preferences_1.notificationPreferencesService.muteCoach(userId, 'test-coach-' + Math.random().toString(36).slice(2), 'Test Coach');
            const reset = await notification_preferences_1.notificationPreferencesService.resetPreferences(userId);
            strict_1.default.equal(reset.channels.push, true);
            strict_1.default.equal(reset.mutedCoaches.length, 0);
        });
    });
});
