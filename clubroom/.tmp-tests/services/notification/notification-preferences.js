"use strict";
/**
 * Notification Preferences Service
 *
 * Handles user notification preferences, channels, quiet hours, and muting.
 * Single responsibility: notification settings management.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationPreferencesService = void 0;
const storage_service_1 = require("../storage-service");
const logger_1 = require("@/utils/logger");
const storage_keys_1 = require("@/constants/storage-keys");
const logger = (0, logger_1.createLogger)('NotificationPreferences');
class NotificationPreferencesService {
    /**
     * Create default preferences for a new user.
     */
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
    }
    /**
     * Load all preferences from storage.
     */
    async loadAllPreferences() {
        return storage_service_1.storageService.getItem(storage_keys_1.STORAGE_KEYS.NOTIFICATION_PREFERENCES, []);
    }
    /**
     * Save a user's preferences.
     */
    async savePreferences(userId, prefs) {
        const all = await this.loadAllPreferences();
        const index = all.findIndex((p) => p.userId === userId);
        if (index >= 0) {
            all[index] = prefs;
        }
        else {
            all.push(prefs);
        }
        await storage_service_1.storageService.setItem(storage_keys_1.STORAGE_KEYS.NOTIFICATION_PREFERENCES, all);
    }
    /**
     * Get preferences for a user.
     */
    async getPreferences(userId) {
        const all = await this.loadAllPreferences();
        const existing = all.find((p) => p.userId === userId);
        if (existing) {
            return existing;
        }
        // Create and save defaults
        const defaults = this.createDefaultPreferences(userId);
        await this.savePreferences(userId, defaults);
        return defaults;
    }
    /**
     * Update preferences for a user.
     */
    async updatePreferences(userId, updates) {
        const current = await this.getPreferences(userId);
        const updated = {
            ...current,
            ...updates,
            userId, // Preserve userId
            updatedAt: new Date().toISOString(),
        };
        await this.savePreferences(userId, updated);
        logger.info('Preferences updated', { userId });
        return updated;
    }
    /**
     * Set quiet hours for a user.
     */
    async setQuietHours(userId, startTime, endTime, enabled = true) {
        const quietHours = { enabled, startTime, endTime };
        return this.updatePreferences(userId, { quietHours });
    }
    /**
     * Toggle quiet hours on/off.
     */
    async toggleQuietHours(userId, enabled) {
        const current = await this.getPreferences(userId);
        return this.updatePreferences(userId, {
            quietHours: { ...current.quietHours, enabled },
        });
    }
    /**
     * Toggle a notification channel (push, email, sms).
     */
    async toggleChannel(userId, channel, enabled) {
        const current = await this.getPreferences(userId);
        return this.updatePreferences(userId, {
            channels: {
                ...current.channels,
                [channel.toLowerCase()]: enabled,
            },
        });
    }
    /**
     * Toggle a specific notification type.
     */
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
    }
    /**
     * Set channels for a specific notification type.
     */
    async setNotificationTypeChannels(userId, type, channels) {
        const current = await this.getPreferences(userId);
        const currentTypePref = current.typePreferences[type] || {
            enabled: true,
            channels: [],
        };
        return this.updatePreferences(userId, {
            typePreferences: {
                ...current.typePreferences,
                [type]: { ...currentTypePref, channels },
            },
        });
    }
    /**
     * Mute a coach (stop receiving notifications from them).
     */
    async muteCoach(userId, coachId, coachName, coachAvatar, reason) {
        const current = await this.getPreferences(userId);
        if (current.mutedCoaches.some((mc) => mc.coachId === coachId)) {
            logger.info('Coach already muted', { userId, coachId });
            return current;
        }
        const mutedCoach = {
            coachId,
            coachName,
            coachAvatar,
            mutedAt: new Date().toISOString(),
            reason,
        };
        const updated = await this.updatePreferences(userId, {
            mutedCoaches: [...current.mutedCoaches, mutedCoach],
        });
        logger.info('Coach muted', { userId, coachId, coachName });
        return updated;
    }
    /**
     * Unmute a coach.
     */
    async unmuteCoach(userId, coachId) {
        const current = await this.getPreferences(userId);
        const updated = await this.updatePreferences(userId, {
            mutedCoaches: current.mutedCoaches.filter((mc) => mc.coachId !== coachId),
        });
        logger.info('Coach unmuted', { userId, coachId });
        return updated;
    }
    /**
     * Get list of muted coaches for a user.
     */
    async getMutedCoaches(userId) {
        const prefs = await this.getPreferences(userId);
        return prefs.mutedCoaches;
    }
    /**
     * Check if a coach is muted by a user.
     */
    async isCoachMuted(userId, coachId) {
        const mutedCoaches = await this.getMutedCoaches(userId);
        return mutedCoaches.some((mc) => mc.coachId === coachId);
    }
    /**
     * Check if currently in quiet hours for a user.
     */
    async isInQuietHours(userId) {
        const prefs = await this.getPreferences(userId);
        if (!prefs.quietHours.enabled) {
            return false;
        }
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const { startTime, endTime } = prefs.quietHours;
        // Handle overnight quiet hours (e.g., 22:00 to 07:00)
        if (startTime > endTime) {
            return currentTime >= startTime || currentTime < endTime;
        }
        // Same day quiet hours (e.g., 14:00 to 16:00)
        return currentTime >= startTime && currentTime < endTime;
    }
    /**
     * Check if a notification should be sent based on user preferences.
     */
    async shouldSendNotification(userId, type, channel, coachId) {
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
        if (channel === 'PUSH') {
            const inQuietHours = await this.isInQuietHours(userId);
            if (inQuietHours) {
                return false;
            }
        }
        return true;
    }
    /**
     * Reset preferences to defaults.
     */
    async resetPreferences(userId) {
        const defaults = this.createDefaultPreferences(userId);
        await this.savePreferences(userId, defaults);
        logger.info('Preferences reset', { userId });
        return defaults;
    }
}
exports.notificationPreferencesService = new NotificationPreferencesService();
