"use strict";
/**
 * Notification Preferences Service
 *
 * Handles user notification preferences, channels, quiet hours, and muting.
 * Single responsibility: notification settings management.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationPreferencesService = void 0;
const api_client_1 = require("../api-client");
const logger_1 = require("@/utils/logger");
const storage_keys_1 = require("@/constants/storage-keys");
const result_1 = require("@/types/result");
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
        return api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.NOTIFICATION_PREFERENCES, []);
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
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.NOTIFICATION_PREFERENCES, all);
    }
    /**
     * Load preferences for a user.
     */
    async getPreferencesValue(userId) {
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
     * Get preferences for a user.
     */
    async getPreferences(userId) {
        try {
            return (0, result_1.ok)(await this.getPreferencesValue(userId));
        }
        catch (error) {
            logger.error('Failed to get notification preferences', { userId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to load notification preferences'));
        }
    }
    /**
     * Update preferences for a user.
     */
    async updatePreferences(userId, updates) {
        try {
            const current = await this.getPreferencesValue(userId);
            const updated = {
                ...current,
                ...updates,
                userId, // Preserve userId
                updatedAt: new Date().toISOString(),
            };
            await this.savePreferences(userId, updated);
            logger.info('Preferences updated', { userId });
            return (0, result_1.ok)(updated);
        }
        catch (error) {
            logger.error('Failed to update notification preferences', { userId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to update notification preferences'));
        }
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
        try {
            const current = await this.getPreferencesValue(userId);
            return this.updatePreferences(userId, {
                quietHours: { ...current.quietHours, enabled },
            });
        }
        catch (error) {
            logger.error('Failed to toggle quiet hours', { userId, enabled, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to update quiet hours'));
        }
    }
    /**
     * Toggle a notification channel (push, email, sms).
     */
    async toggleChannel(userId, channel, enabled) {
        try {
            const current = await this.getPreferencesValue(userId);
            return this.updatePreferences(userId, {
                channels: {
                    ...current.channels,
                    [channel.toLowerCase()]: enabled,
                },
            });
        }
        catch (error) {
            logger.error('Failed to toggle notification channel', { userId, channel, enabled, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to update notification channel'));
        }
    }
    /**
     * Toggle a specific notification type.
     */
    async toggleNotificationType(userId, type, enabled) {
        try {
            const current = await this.getPreferencesValue(userId);
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
        catch (error) {
            logger.error('Failed to toggle notification type', { userId, type, enabled, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to update notification preferences'));
        }
    }
    /**
     * Set channels for a specific notification type.
     */
    async setNotificationTypeChannels(userId, type, channels) {
        try {
            const current = await this.getPreferencesValue(userId);
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
        catch (error) {
            logger.error('Failed to set notification type channels', { userId, type, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to update notification preferences'));
        }
    }
    /**
     * Mute a coach (stop receiving notifications from them).
     */
    async muteCoach(userId, coachId, coachName, coachAvatar, reason) {
        try {
            const current = await this.getPreferencesValue(userId);
            if (current.mutedCoaches.some((mc) => mc.coachId === coachId)) {
                logger.info('Coach already muted', { userId, coachId });
                return (0, result_1.ok)(current);
            }
            const mutedCoach = {
                coachId,
                coachName,
                coachAvatar,
                mutedAt: new Date().toISOString(),
                reason,
            };
            const updatedResult = await this.updatePreferences(userId, {
                mutedCoaches: [...current.mutedCoaches, mutedCoach],
            });
            if (!updatedResult.success) {
                return updatedResult;
            }
            logger.info('Coach muted', { userId, coachId, coachName });
            return (0, result_1.ok)(updatedResult.data);
        }
        catch (error) {
            logger.error('Failed to mute coach', { userId, coachId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to update notification preferences'));
        }
    }
    /**
     * Unmute a coach.
     */
    async unmuteCoach(userId, coachId) {
        try {
            const current = await this.getPreferencesValue(userId);
            const updatedResult = await this.updatePreferences(userId, {
                mutedCoaches: current.mutedCoaches.filter((mc) => mc.coachId !== coachId),
            });
            if (!updatedResult.success) {
                return updatedResult;
            }
            logger.info('Coach unmuted', { userId, coachId });
            return (0, result_1.ok)(updatedResult.data);
        }
        catch (error) {
            logger.error('Failed to unmute coach', { userId, coachId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to update notification preferences'));
        }
    }
    /**
     * Get list of muted coaches for a user.
     */
    async getMutedCoaches(userId) {
        const prefsResult = await this.getPreferences(userId);
        if (!prefsResult.success) {
            return prefsResult;
        }
        return (0, result_1.ok)(prefsResult.data.mutedCoaches);
    }
    /**
     * Check if a coach is muted by a user.
     */
    async isCoachMuted(userId, coachId) {
        const mutedCoachesResult = await this.getMutedCoaches(userId);
        if (!mutedCoachesResult.success) {
            return mutedCoachesResult;
        }
        return (0, result_1.ok)(mutedCoachesResult.data.some((mc) => mc.coachId === coachId));
    }
    /**
     * Check if currently in quiet hours for a user.
     */
    async isInQuietHours(userId) {
        const prefsResult = await this.getPreferences(userId);
        if (!prefsResult.success) {
            return prefsResult;
        }
        const prefs = prefsResult.data;
        if (!prefs.quietHours.enabled) {
            return (0, result_1.ok)(false);
        }
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const { startTime, endTime } = prefs.quietHours;
        // Handle overnight quiet hours (e.g., 22:00 to 07:00)
        if (startTime > endTime) {
            return (0, result_1.ok)(currentTime >= startTime || currentTime < endTime);
        }
        // Same day quiet hours (e.g., 14:00 to 16:00)
        return (0, result_1.ok)(currentTime >= startTime && currentTime < endTime);
    }
    /**
     * Check if a notification should be sent based on user preferences.
     */
    async shouldSendNotification(userId, type, channel, coachId) {
        const prefsResult = await this.getPreferences(userId);
        if (!prefsResult.success) {
            return prefsResult;
        }
        const prefs = prefsResult.data;
        // Check if channel is globally enabled
        const channelKey = channel.toLowerCase();
        if (!prefs.channels[channelKey]) {
            return (0, result_1.ok)(false);
        }
        // Check if coach is muted
        if (coachId && prefs.mutedCoaches.some((mc) => mc.coachId === coachId)) {
            return (0, result_1.ok)(false);
        }
        // Check type-specific preferences
        const typePref = prefs.typePreferences[type];
        if (typePref) {
            if (!typePref.enabled) {
                return (0, result_1.ok)(false);
            }
            if (!typePref.channels.includes(channel)) {
                return (0, result_1.ok)(false);
            }
        }
        // Check quiet hours (for push notifications)
        if (channel === 'PUSH') {
            const inQuietHoursResult = await this.isInQuietHours(userId);
            if (!inQuietHoursResult.success) {
                return inQuietHoursResult;
            }
            if (inQuietHoursResult.data) {
                return (0, result_1.ok)(false);
            }
        }
        return (0, result_1.ok)(true);
    }
    /**
     * Reset preferences to defaults.
     */
    async resetPreferences(userId) {
        try {
            const defaults = this.createDefaultPreferences(userId);
            await this.savePreferences(userId, defaults);
            logger.info('Preferences reset', { userId });
            return (0, result_1.ok)(defaults);
        }
        catch (error) {
            logger.error('Failed to reset notification preferences', { userId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to reset notification preferences'));
        }
    }
}
exports.notificationPreferencesService = new NotificationPreferencesService();
