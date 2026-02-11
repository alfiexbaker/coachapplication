/**
 * Notification Preferences Service
 *
 * Handles user notification preferences, channels, quiet hours, and muting.
 * Single responsibility: notification settings management.
 */

import { apiClient } from '../api-client';
import { createLogger } from '@/utils/logger';
import type {
  EnhancedNotificationPreferences,
  MutedCoach,
  NotificationChannel,
  QuietHours,
  NotificationType,
} from '@/constants/types';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { type Result, type ServiceError, ok, err, storageError } from '@/types/result';

const logger = createLogger('NotificationPreferences');

class NotificationPreferencesService {
  /**
   * Create default preferences for a new user.
   */
  private createDefaultPreferences(userId: string): EnhancedNotificationPreferences {
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
  private async loadAllPreferences(): Promise<EnhancedNotificationPreferences[]> {
    return apiClient.get<EnhancedNotificationPreferences[]>(
      STORAGE_KEYS.NOTIFICATION_PREFERENCES,
      [],
    );
  }

  /**
   * Save a user's preferences.
   */
  private async savePreferences(
    userId: string,
    prefs: EnhancedNotificationPreferences,
  ): Promise<void> {
    const all = await this.loadAllPreferences();
    const index = all.findIndex((p) => p.userId === userId);

    if (index >= 0) {
      all[index] = prefs;
    } else {
      all.push(prefs);
    }

    await apiClient.set(STORAGE_KEYS.NOTIFICATION_PREFERENCES, all);
  }

  /**
   * Load preferences for a user.
   */
  private async getPreferencesValue(userId: string): Promise<EnhancedNotificationPreferences> {
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
  async getPreferences(
    userId: string,
  ): Promise<Result<EnhancedNotificationPreferences, ServiceError>> {
    try {
      return ok(await this.getPreferencesValue(userId));
    } catch (error) {
      logger.error('Failed to get notification preferences', { userId, error });
      return err(storageError('Failed to load notification preferences'));
    }
  }

  /**
   * Update preferences for a user.
   */
  async updatePreferences(
    userId: string,
    updates: Partial<EnhancedNotificationPreferences>,
  ): Promise<Result<EnhancedNotificationPreferences, ServiceError>> {
    try {
      const current = await this.getPreferencesValue(userId);
      const updated: EnhancedNotificationPreferences = {
        ...current,
        ...updates,
        userId, // Preserve userId
        updatedAt: new Date().toISOString(),
      };

      await this.savePreferences(userId, updated);
      logger.info('Preferences updated', { userId });
      return ok(updated);
    } catch (error) {
      logger.error('Failed to update notification preferences', { userId, error });
      return err(storageError('Failed to update notification preferences'));
    }
  }

  /**
   * Set quiet hours for a user.
   */
  async setQuietHours(
    userId: string,
    startTime: string,
    endTime: string,
    enabled = true,
  ): Promise<Result<EnhancedNotificationPreferences, ServiceError>> {
    const quietHours: QuietHours = { enabled, startTime, endTime };
    return this.updatePreferences(userId, { quietHours });
  }

  /**
   * Toggle quiet hours on/off.
   */
  async toggleQuietHours(
    userId: string,
    enabled: boolean,
  ): Promise<Result<EnhancedNotificationPreferences, ServiceError>> {
    try {
      const current = await this.getPreferencesValue(userId);
      return this.updatePreferences(userId, {
        quietHours: { ...current.quietHours, enabled },
      });
    } catch (error) {
      logger.error('Failed to toggle quiet hours', { userId, enabled, error });
      return err(storageError('Failed to update quiet hours'));
    }
  }

  /**
   * Toggle a notification channel (push, email, sms).
   */
  async toggleChannel(
    userId: string,
    channel: NotificationChannel,
    enabled: boolean,
  ): Promise<Result<EnhancedNotificationPreferences, ServiceError>> {
    try {
      const current = await this.getPreferencesValue(userId);
      return this.updatePreferences(userId, {
        channels: {
          ...current.channels,
          [channel.toLowerCase()]: enabled,
        },
      });
    } catch (error) {
      logger.error('Failed to toggle notification channel', { userId, channel, enabled, error });
      return err(storageError('Failed to update notification channel'));
    }
  }

  /**
   * Toggle a specific notification type.
   */
  async toggleNotificationType(
    userId: string,
    type: NotificationType,
    enabled: boolean,
  ): Promise<Result<EnhancedNotificationPreferences, ServiceError>> {
    try {
      const current = await this.getPreferencesValue(userId);
      const currentTypePref = current.typePreferences[type] || {
        enabled: true,
        channels: ['PUSH', 'EMAIL'] as NotificationChannel[],
      };

      return this.updatePreferences(userId, {
        typePreferences: {
          ...current.typePreferences,
          [type]: { ...currentTypePref, enabled },
        },
      });
    } catch (error) {
      logger.error('Failed to toggle notification type', { userId, type, enabled, error });
      return err(storageError('Failed to update notification preferences'));
    }
  }

  /**
   * Set channels for a specific notification type.
   */
  async setNotificationTypeChannels(
    userId: string,
    type: NotificationType,
    channels: NotificationChannel[],
  ): Promise<Result<EnhancedNotificationPreferences, ServiceError>> {
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
    } catch (error) {
      logger.error('Failed to set notification type channels', { userId, type, error });
      return err(storageError('Failed to update notification preferences'));
    }
  }

  /**
   * Mute a coach (stop receiving notifications from them).
   */
  async muteCoach(
    userId: string,
    coachId: string,
    coachName: string,
    coachAvatar?: string,
    reason?: string,
  ): Promise<Result<EnhancedNotificationPreferences, ServiceError>> {
    try {
      const current = await this.getPreferencesValue(userId);

      if (current.mutedCoaches.some((mc) => mc.coachId === coachId)) {
        logger.info('Coach already muted', { userId, coachId });
        return ok(current);
      }

      const mutedCoach: MutedCoach = {
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
      return ok(updatedResult.data);
    } catch (error) {
      logger.error('Failed to mute coach', { userId, coachId, error });
      return err(storageError('Failed to update notification preferences'));
    }
  }

  /**
   * Unmute a coach.
   */
  async unmuteCoach(
    userId: string,
    coachId: string,
  ): Promise<Result<EnhancedNotificationPreferences, ServiceError>> {
    try {
      const current = await this.getPreferencesValue(userId);
      const updatedResult = await this.updatePreferences(userId, {
        mutedCoaches: current.mutedCoaches.filter((mc) => mc.coachId !== coachId),
      });
      if (!updatedResult.success) {
        return updatedResult;
      }

      logger.info('Coach unmuted', { userId, coachId });
      return ok(updatedResult.data);
    } catch (error) {
      logger.error('Failed to unmute coach', { userId, coachId, error });
      return err(storageError('Failed to update notification preferences'));
    }
  }

  /**
   * Get list of muted coaches for a user.
   */
  async getMutedCoaches(userId: string): Promise<Result<MutedCoach[], ServiceError>> {
    const prefsResult = await this.getPreferences(userId);
    if (!prefsResult.success) {
      return prefsResult;
    }
    return ok(prefsResult.data.mutedCoaches);
  }

  /**
   * Check if a coach is muted by a user.
   */
  async isCoachMuted(userId: string, coachId: string): Promise<Result<boolean, ServiceError>> {
    const mutedCoachesResult = await this.getMutedCoaches(userId);
    if (!mutedCoachesResult.success) {
      return mutedCoachesResult;
    }
    return ok(mutedCoachesResult.data.some((mc) => mc.coachId === coachId));
  }

  /**
   * Check if currently in quiet hours for a user.
   */
  async isInQuietHours(userId: string): Promise<Result<boolean, ServiceError>> {
    const prefsResult = await this.getPreferences(userId);
    if (!prefsResult.success) {
      return prefsResult;
    }
    const prefs = prefsResult.data;

    if (!prefs.quietHours.enabled) {
      return ok(false);
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const { startTime, endTime } = prefs.quietHours;

    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (startTime > endTime) {
      return ok(currentTime >= startTime || currentTime < endTime);
    }

    // Same day quiet hours (e.g., 14:00 to 16:00)
    return ok(currentTime >= startTime && currentTime < endTime);
  }

  /**
   * Check if a notification should be sent based on user preferences.
   */
  async shouldSendNotification(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
    coachId?: string,
  ): Promise<Result<boolean, ServiceError>> {
    const prefsResult = await this.getPreferences(userId);
    if (!prefsResult.success) {
      return prefsResult;
    }
    const prefs = prefsResult.data;

    // Check if channel is globally enabled
    const channelKey = channel.toLowerCase() as 'push' | 'email' | 'sms';
    if (!prefs.channels[channelKey]) {
      return ok(false);
    }

    // Check if coach is muted
    if (coachId && prefs.mutedCoaches.some((mc) => mc.coachId === coachId)) {
      return ok(false);
    }

    // Check type-specific preferences
    const typePref = prefs.typePreferences[type];
    if (typePref) {
      if (!typePref.enabled) {
        return ok(false);
      }
      if (!typePref.channels.includes(channel)) {
        return ok(false);
      }
    }

    // Check quiet hours (for push notifications)
    if (channel === 'PUSH') {
      const inQuietHoursResult = await this.isInQuietHours(userId);
      if (!inQuietHoursResult.success) {
        return inQuietHoursResult;
      }
      if (inQuietHoursResult.data) {
        return ok(false);
      }
    }

    return ok(true);
  }

  /**
   * Reset preferences to defaults.
   */
  async resetPreferences(
    userId: string,
  ): Promise<Result<EnhancedNotificationPreferences, ServiceError>> {
    try {
      const defaults = this.createDefaultPreferences(userId);
      await this.savePreferences(userId, defaults);
      logger.info('Preferences reset', { userId });
      return ok(defaults);
    } catch (error) {
      logger.error('Failed to reset notification preferences', { userId, error });
      return err(storageError('Failed to reset notification preferences'));
    }
  }
}

export const notificationPreferencesService = new NotificationPreferencesService();
