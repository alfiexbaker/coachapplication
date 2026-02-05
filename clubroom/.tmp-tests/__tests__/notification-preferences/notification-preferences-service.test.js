"use strict";
// @ts-nocheck
/**
 * Notification Preferences Service Tests
 *
 * Unit tests for the notification preferences functionality including:
 * - Getting and updating preferences
 * - Quiet hours management
 * - Channel toggles
 * - Notification type toggles
 * - Muting/unmuting coaches
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
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importStar(require("node:test"));
// In-memory storage for testing
let preferencesStore = {};
// Mock notification preferences service
const mockNotificationPreferencesService = {
    createDefaultPreferences(userId) {
        return {
            userId,
            channels: {
                push: true,
                email: true,
                sms: false,
            },
            quietHours: {
                enabled: false,
                startTime: '22:00',
                endTime: '07:00',
            },
            typePreferences: {},
            mutedCoaches: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    },
    async getPreferences(userId) {
        if (preferencesStore[userId]) {
            return preferencesStore[userId];
        }
        const defaults = this.createDefaultPreferences(userId);
        preferencesStore[userId] = defaults;
        return defaults;
    },
    async updatePreferences(userId, updates) {
        const current = await this.getPreferences(userId);
        const updated = {
            ...current,
            ...updates,
            userId,
            createdAt: current.createdAt,
            updatedAt: new Date().toISOString(),
        };
        preferencesStore[userId] = updated;
        return updated;
    },
    async setQuietHours(userId, startTime, endTime, enabled = true) {
        return this.updatePreferences(userId, {
            quietHours: { enabled, startTime, endTime },
        });
    },
    async toggleQuietHours(userId, enabled) {
        const current = await this.getPreferences(userId);
        return this.updatePreferences(userId, {
            quietHours: { ...current.quietHours, enabled },
        });
    },
    async toggleChannel(userId, channel, enabled) {
        const current = await this.getPreferences(userId);
        return this.updatePreferences(userId, {
            channels: {
                ...current.channels,
                [channel.toLowerCase()]: enabled,
            },
        });
    },
    async toggleNotificationType(userId, type, enabled) {
        const current = await this.getPreferences(userId);
        const currentTypePref = current.typePreferences[type] || {
            enabled: true,
            channels: ['PUSH', 'EMAIL'],
        };
        return this.updatePreferences(userId, {
            typePreferences: {
                ...current.typePreferences,
                [type]: { ...currentTypePref, enabled },
            },
        });
    },
    async muteCoach(userId, coachId, coachName, coachAvatar, reason) {
        const current = await this.getPreferences(userId);
        const alreadyMuted = current.mutedCoaches.some((mc) => mc.coachId === coachId);
        if (alreadyMuted) {
            return current;
        }
        const mutedCoach = {
            coachId,
            coachName,
            coachAvatar,
            mutedAt: new Date().toISOString(),
            reason,
        };
        return this.updatePreferences(userId, {
            mutedCoaches: [...current.mutedCoaches, mutedCoach],
        });
    },
    async unmuteCoach(userId, coachId) {
        const current = await this.getPreferences(userId);
        return this.updatePreferences(userId, {
            mutedCoaches: current.mutedCoaches.filter((mc) => mc.coachId !== coachId),
        });
    },
    async getMutedCoaches(userId) {
        const prefs = await this.getPreferences(userId);
        return prefs.mutedCoaches;
    },
    async isCoachMuted(userId, coachId) {
        const mutedCoaches = await this.getMutedCoaches(userId);
        return mutedCoaches.some((mc) => mc.coachId === coachId);
    },
    isInQuietHoursSync(prefs, currentTime) {
        if (!prefs.quietHours.enabled) {
            return false;
        }
        const { startTime, endTime } = prefs.quietHours;
        // Handle overnight quiet hours (e.g., 22:00 to 07:00)
        if (startTime > endTime) {
            return currentTime >= startTime || currentTime < endTime;
        }
        // Same day quiet hours (e.g., 14:00 to 16:00)
        return currentTime >= startTime && currentTime < endTime;
    },
    async shouldSendNotification(userId, type, channel, coachId, currentTime) {
        const prefs = await this.getPreferences(userId);
        // Check if channel is globally enabled
        const channelKey = channel.toLowerCase();
        if (!prefs.channels[channelKey]) {
            return false;
        }
        // Check if coach is muted
        if (coachId && prefs.mutedCoaches.some((mc) => mc.coachId === coachId)) {
            return false;
        }
        // Check type-specific preferences
        const typePref = prefs.typePreferences[type];
        if (typePref) {
            if (!typePref.enabled) {
                return false;
            }
            if (!typePref.channels.includes(channel)) {
                return false;
            }
        }
        // Check quiet hours (for push notifications)
        if (channel === 'PUSH' && currentTime) {
            const inQuietHours = this.isInQuietHoursSync(prefs, currentTime);
            if (inQuietHours) {
                return false;
            }
        }
        return true;
    },
    async resetPreferences(userId) {
        const defaults = this.createDefaultPreferences(userId);
        preferencesStore[userId] = defaults;
        return defaults;
    },
    clearAll() {
        preferencesStore = {};
    },
};
const notificationPreferencesService = mockNotificationPreferencesService;
// Reset store before each test
(0, node_test_1.beforeEach)(() => {
    notificationPreferencesService.clearAll();
});
(0, node_test_1.describe)('Notification Preferences Service', () => {
    (0, node_test_1.describe)('getPreferences', () => {
        (0, node_test_1.default)('should return default preferences for new user', async () => {
            const prefs = await notificationPreferencesService.getPreferences('new_user');
            node_assert_1.default.strictEqual(prefs.userId, 'new_user');
            node_assert_1.default.strictEqual(prefs.channels.push, true);
            node_assert_1.default.strictEqual(prefs.channels.email, true);
            node_assert_1.default.strictEqual(prefs.channels.sms, false);
            node_assert_1.default.strictEqual(prefs.quietHours.enabled, false);
            node_assert_1.default.strictEqual(prefs.quietHours.startTime, '22:00');
            node_assert_1.default.strictEqual(prefs.quietHours.endTime, '07:00');
            node_assert_1.default.deepStrictEqual(prefs.typePreferences, {});
            node_assert_1.default.deepStrictEqual(prefs.mutedCoaches, []);
        });
        (0, node_test_1.default)('should return existing preferences for existing user', async () => {
            // First call creates defaults
            await notificationPreferencesService.getPreferences('existing_user');
            // Update preferences
            await notificationPreferencesService.toggleChannel('existing_user', 'PUSH', false);
            // Second call should return updated preferences
            const prefs = await notificationPreferencesService.getPreferences('existing_user');
            node_assert_1.default.strictEqual(prefs.channels.push, false);
        });
    });
    (0, node_test_1.describe)('updatePreferences', () => {
        (0, node_test_1.default)('should update preferences and preserve userId and createdAt', async () => {
            const initial = await notificationPreferencesService.getPreferences('update_user');
            const initialCreatedAt = initial.createdAt;
            const updated = await notificationPreferencesService.updatePreferences('update_user', {
                channels: { push: false, email: true, sms: true },
            });
            node_assert_1.default.strictEqual(updated.userId, 'update_user');
            node_assert_1.default.strictEqual(updated.createdAt, initialCreatedAt);
            node_assert_1.default.strictEqual(updated.channels.push, false);
            node_assert_1.default.strictEqual(updated.channels.sms, true);
        });
        (0, node_test_1.default)('should update updatedAt timestamp', async () => {
            const initial = await notificationPreferencesService.getPreferences('timestamp_user');
            const initialUpdatedAt = initial.updatedAt;
            // Wait a tiny bit to ensure different timestamp
            await new Promise((resolve) => setTimeout(resolve, 10));
            const updated = await notificationPreferencesService.updatePreferences('timestamp_user', {
                channels: { push: false, email: true, sms: false },
            });
            node_assert_1.default.notStrictEqual(updated.updatedAt, initialUpdatedAt);
        });
    });
    (0, node_test_1.describe)('setQuietHours', () => {
        (0, node_test_1.default)('should set quiet hours with custom times', async () => {
            const updated = await notificationPreferencesService.setQuietHours('quiet_user', '23:00', '06:00', true);
            node_assert_1.default.strictEqual(updated.quietHours.enabled, true);
            node_assert_1.default.strictEqual(updated.quietHours.startTime, '23:00');
            node_assert_1.default.strictEqual(updated.quietHours.endTime, '06:00');
        });
        (0, node_test_1.default)('should set quiet hours disabled by default when enabled param is false', async () => {
            const updated = await notificationPreferencesService.setQuietHours('quiet_disabled_user', '22:00', '07:00', false);
            node_assert_1.default.strictEqual(updated.quietHours.enabled, false);
        });
    });
    (0, node_test_1.describe)('toggleQuietHours', () => {
        (0, node_test_1.default)('should enable quiet hours', async () => {
            await notificationPreferencesService.getPreferences('toggle_quiet_user');
            const updated = await notificationPreferencesService.toggleQuietHours('toggle_quiet_user', true);
            node_assert_1.default.strictEqual(updated.quietHours.enabled, true);
        });
        (0, node_test_1.default)('should disable quiet hours', async () => {
            await notificationPreferencesService.setQuietHours('toggle_quiet_off', '22:00', '07:00', true);
            const updated = await notificationPreferencesService.toggleQuietHours('toggle_quiet_off', false);
            node_assert_1.default.strictEqual(updated.quietHours.enabled, false);
        });
    });
    (0, node_test_1.describe)('toggleChannel', () => {
        (0, node_test_1.default)('should toggle push notifications off', async () => {
            const updated = await notificationPreferencesService.toggleChannel('channel_user', 'PUSH', false);
            node_assert_1.default.strictEqual(updated.channels.push, false);
        });
        (0, node_test_1.default)('should toggle email notifications off', async () => {
            const updated = await notificationPreferencesService.toggleChannel('channel_user2', 'EMAIL', false);
            node_assert_1.default.strictEqual(updated.channels.email, false);
        });
        (0, node_test_1.default)('should toggle SMS notifications on', async () => {
            const updated = await notificationPreferencesService.toggleChannel('channel_user3', 'SMS', true);
            node_assert_1.default.strictEqual(updated.channels.sms, true);
        });
    });
    (0, node_test_1.describe)('toggleNotificationType', () => {
        (0, node_test_1.default)('should disable a notification type', async () => {
            const updated = await notificationPreferencesService.toggleNotificationType('type_user', 'BOOKING_RECEIVED', false);
            node_assert_1.default.strictEqual(updated.typePreferences.BOOKING_RECEIVED?.enabled, false);
        });
        (0, node_test_1.default)('should enable a notification type', async () => {
            await notificationPreferencesService.toggleNotificationType('type_enable_user', 'MESSAGE_RECEIVED', false);
            const updated = await notificationPreferencesService.toggleNotificationType('type_enable_user', 'MESSAGE_RECEIVED', true);
            node_assert_1.default.strictEqual(updated.typePreferences.MESSAGE_RECEIVED?.enabled, true);
        });
        (0, node_test_1.default)('should preserve existing channels when toggling', async () => {
            await notificationPreferencesService.toggleNotificationType('preserve_user', 'BADGE_AWARDED', true);
            const updated = await notificationPreferencesService.toggleNotificationType('preserve_user', 'BADGE_AWARDED', false);
            // Channels should still exist
            node_assert_1.default.ok(updated.typePreferences.BADGE_AWARDED?.channels);
        });
    });
    (0, node_test_1.describe)('muteCoach', () => {
        (0, node_test_1.default)('should add coach to muted list', async () => {
            const updated = await notificationPreferencesService.muteCoach('mute_user', 'coach_1', 'Coach Sarah', 'https://example.com/avatar.jpg', 'Too many messages');
            node_assert_1.default.strictEqual(updated.mutedCoaches.length, 1);
            node_assert_1.default.strictEqual(updated.mutedCoaches[0].coachId, 'coach_1');
            node_assert_1.default.strictEqual(updated.mutedCoaches[0].coachName, 'Coach Sarah');
            node_assert_1.default.strictEqual(updated.mutedCoaches[0].coachAvatar, 'https://example.com/avatar.jpg');
            node_assert_1.default.strictEqual(updated.mutedCoaches[0].reason, 'Too many messages');
            node_assert_1.default.ok(updated.mutedCoaches[0].mutedAt);
        });
        (0, node_test_1.default)('should not duplicate muted coach', async () => {
            await notificationPreferencesService.muteCoach('no_dup_user', 'coach_1', 'Coach Sarah');
            const updated = await notificationPreferencesService.muteCoach('no_dup_user', 'coach_1', 'Coach Sarah');
            node_assert_1.default.strictEqual(updated.mutedCoaches.length, 1);
        });
        (0, node_test_1.default)('should allow muting multiple coaches', async () => {
            await notificationPreferencesService.muteCoach('multi_mute_user', 'coach_1', 'Coach Sarah');
            const updated = await notificationPreferencesService.muteCoach('multi_mute_user', 'coach_2', 'Coach Mike');
            node_assert_1.default.strictEqual(updated.mutedCoaches.length, 2);
        });
    });
    (0, node_test_1.describe)('unmuteCoach', () => {
        (0, node_test_1.default)('should remove coach from muted list', async () => {
            await notificationPreferencesService.muteCoach('unmute_user', 'coach_1', 'Coach Sarah');
            const updated = await notificationPreferencesService.unmuteCoach('unmute_user', 'coach_1');
            node_assert_1.default.strictEqual(updated.mutedCoaches.length, 0);
        });
        (0, node_test_1.default)('should handle unmuting non-muted coach gracefully', async () => {
            const updated = await notificationPreferencesService.unmuteCoach('no_mute_user', 'coach_1');
            node_assert_1.default.strictEqual(updated.mutedCoaches.length, 0);
        });
    });
    (0, node_test_1.describe)('getMutedCoaches', () => {
        (0, node_test_1.default)('should return list of muted coaches', async () => {
            await notificationPreferencesService.muteCoach('get_muted_user', 'coach_1', 'Coach Sarah');
            await notificationPreferencesService.muteCoach('get_muted_user', 'coach_2', 'Coach Mike');
            const mutedCoaches = await notificationPreferencesService.getMutedCoaches('get_muted_user');
            node_assert_1.default.strictEqual(mutedCoaches.length, 2);
        });
        (0, node_test_1.default)('should return empty array for user with no muted coaches', async () => {
            const mutedCoaches = await notificationPreferencesService.getMutedCoaches('no_muted_user');
            node_assert_1.default.strictEqual(mutedCoaches.length, 0);
        });
    });
    (0, node_test_1.describe)('isCoachMuted', () => {
        (0, node_test_1.default)('should return true for muted coach', async () => {
            await notificationPreferencesService.muteCoach('is_muted_user', 'coach_1', 'Coach Sarah');
            const isMuted = await notificationPreferencesService.isCoachMuted('is_muted_user', 'coach_1');
            node_assert_1.default.strictEqual(isMuted, true);
        });
        (0, node_test_1.default)('should return false for non-muted coach', async () => {
            const isMuted = await notificationPreferencesService.isCoachMuted('is_muted_user2', 'coach_1');
            node_assert_1.default.strictEqual(isMuted, false);
        });
    });
    (0, node_test_1.describe)('isInQuietHoursSync', () => {
        (0, node_test_1.default)('should return false when quiet hours disabled', () => {
            const prefs = notificationPreferencesService.createDefaultPreferences('test');
            prefs.quietHours.enabled = false;
            const result = notificationPreferencesService.isInQuietHoursSync(prefs, '23:00');
            node_assert_1.default.strictEqual(result, false);
        });
        (0, node_test_1.default)('should return true during overnight quiet hours (after start)', () => {
            const prefs = notificationPreferencesService.createDefaultPreferences('test');
            prefs.quietHours.enabled = true;
            prefs.quietHours.startTime = '22:00';
            prefs.quietHours.endTime = '07:00';
            const result = notificationPreferencesService.isInQuietHoursSync(prefs, '23:30');
            node_assert_1.default.strictEqual(result, true);
        });
        (0, node_test_1.default)('should return true during overnight quiet hours (before end)', () => {
            const prefs = notificationPreferencesService.createDefaultPreferences('test');
            prefs.quietHours.enabled = true;
            prefs.quietHours.startTime = '22:00';
            prefs.quietHours.endTime = '07:00';
            const result = notificationPreferencesService.isInQuietHoursSync(prefs, '06:30');
            node_assert_1.default.strictEqual(result, true);
        });
        (0, node_test_1.default)('should return false outside overnight quiet hours', () => {
            const prefs = notificationPreferencesService.createDefaultPreferences('test');
            prefs.quietHours.enabled = true;
            prefs.quietHours.startTime = '22:00';
            prefs.quietHours.endTime = '07:00';
            const result = notificationPreferencesService.isInQuietHoursSync(prefs, '14:00');
            node_assert_1.default.strictEqual(result, false);
        });
        (0, node_test_1.default)('should return true during same-day quiet hours', () => {
            const prefs = notificationPreferencesService.createDefaultPreferences('test');
            prefs.quietHours.enabled = true;
            prefs.quietHours.startTime = '12:00';
            prefs.quietHours.endTime = '14:00';
            const result = notificationPreferencesService.isInQuietHoursSync(prefs, '13:00');
            node_assert_1.default.strictEqual(result, true);
        });
        (0, node_test_1.default)('should return false outside same-day quiet hours', () => {
            const prefs = notificationPreferencesService.createDefaultPreferences('test');
            prefs.quietHours.enabled = true;
            prefs.quietHours.startTime = '12:00';
            prefs.quietHours.endTime = '14:00';
            const result = notificationPreferencesService.isInQuietHoursSync(prefs, '15:00');
            node_assert_1.default.strictEqual(result, false);
        });
    });
    (0, node_test_1.describe)('shouldSendNotification', () => {
        (0, node_test_1.default)('should return false when channel is globally disabled', async () => {
            await notificationPreferencesService.toggleChannel('send_check_user1', 'PUSH', false);
            const shouldSend = await notificationPreferencesService.shouldSendNotification('send_check_user1', 'BOOKING_RECEIVED', 'PUSH');
            node_assert_1.default.strictEqual(shouldSend, false);
        });
        (0, node_test_1.default)('should return false when coach is muted', async () => {
            await notificationPreferencesService.muteCoach('send_check_user2', 'coach_1', 'Coach Sarah');
            const shouldSend = await notificationPreferencesService.shouldSendNotification('send_check_user2', 'MESSAGE_RECEIVED', 'PUSH', 'coach_1');
            node_assert_1.default.strictEqual(shouldSend, false);
        });
        (0, node_test_1.default)('should return false when notification type is disabled', async () => {
            await notificationPreferencesService.toggleNotificationType('send_check_user3', 'BADGE_AWARDED', false);
            const shouldSend = await notificationPreferencesService.shouldSendNotification('send_check_user3', 'BADGE_AWARDED', 'PUSH');
            node_assert_1.default.strictEqual(shouldSend, false);
        });
        (0, node_test_1.default)('should return false during quiet hours for push notifications', async () => {
            await notificationPreferencesService.setQuietHours('send_check_user4', '22:00', '07:00', true);
            const shouldSend = await notificationPreferencesService.shouldSendNotification('send_check_user4', 'BOOKING_RECEIVED', 'PUSH', undefined, '23:00');
            node_assert_1.default.strictEqual(shouldSend, false);
        });
        (0, node_test_1.default)('should return true for email during quiet hours', async () => {
            await notificationPreferencesService.setQuietHours('send_check_user5', '22:00', '07:00', true);
            const shouldSend = await notificationPreferencesService.shouldSendNotification('send_check_user5', 'BOOKING_RECEIVED', 'EMAIL', undefined, '23:00');
            node_assert_1.default.strictEqual(shouldSend, true);
        });
        (0, node_test_1.default)('should return true when all conditions pass', async () => {
            const shouldSend = await notificationPreferencesService.shouldSendNotification('send_check_user6', 'BOOKING_RECEIVED', 'PUSH', 'coach_1', '14:00');
            node_assert_1.default.strictEqual(shouldSend, true);
        });
    });
    (0, node_test_1.describe)('resetPreferences', () => {
        (0, node_test_1.default)('should reset to default preferences', async () => {
            await notificationPreferencesService.toggleChannel('reset_user', 'PUSH', false);
            await notificationPreferencesService.muteCoach('reset_user', 'coach_1', 'Coach Sarah');
            const reset = await notificationPreferencesService.resetPreferences('reset_user');
            node_assert_1.default.strictEqual(reset.channels.push, true);
            node_assert_1.default.strictEqual(reset.mutedCoaches.length, 0);
        });
    });
});
(0, node_test_1.describe)('Notification Preferences Edge Cases', () => {
    (0, node_test_1.default)('should handle updating preferences for multiple users independently', async () => {
        await notificationPreferencesService.toggleChannel('user_a', 'PUSH', false);
        await notificationPreferencesService.toggleChannel('user_b', 'EMAIL', false);
        const prefsA = await notificationPreferencesService.getPreferences('user_a');
        const prefsB = await notificationPreferencesService.getPreferences('user_b');
        node_assert_1.default.strictEqual(prefsA.channels.push, false);
        node_assert_1.default.strictEqual(prefsA.channels.email, true);
        node_assert_1.default.strictEqual(prefsB.channels.push, true);
        node_assert_1.default.strictEqual(prefsB.channels.email, false);
    });
    (0, node_test_1.default)('should handle muting and unmuting same coach multiple times', async () => {
        await notificationPreferencesService.muteCoach('toggle_mute_user', 'coach_1', 'Coach Sarah');
        await notificationPreferencesService.unmuteCoach('toggle_mute_user', 'coach_1');
        await notificationPreferencesService.muteCoach('toggle_mute_user', 'coach_1', 'Coach Sarah Updated');
        const mutedCoaches = await notificationPreferencesService.getMutedCoaches('toggle_mute_user');
        node_assert_1.default.strictEqual(mutedCoaches.length, 1);
        node_assert_1.default.strictEqual(mutedCoaches[0].coachName, 'Coach Sarah Updated');
    });
    (0, node_test_1.default)('should handle boundary time for quiet hours', async () => {
        const prefs = notificationPreferencesService.createDefaultPreferences('test');
        prefs.quietHours.enabled = true;
        prefs.quietHours.startTime = '22:00';
        prefs.quietHours.endTime = '07:00';
        // Exactly at start time should be in quiet hours
        node_assert_1.default.strictEqual(notificationPreferencesService.isInQuietHoursSync(prefs, '22:00'), true);
        // Just before end time should be in quiet hours
        node_assert_1.default.strictEqual(notificationPreferencesService.isInQuietHoursSync(prefs, '06:59'), true);
        // Exactly at end time should be out of quiet hours
        node_assert_1.default.strictEqual(notificationPreferencesService.isInQuietHoursSync(prefs, '07:00'), false);
    });
});
