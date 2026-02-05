/**
 * Notification Preferences Service
 *
 * Handles user notification preferences, channels, quiet hours, and muting.
 * Single responsibility: notification settings management.
 */

import { storageService } from '../storage-service';
import { createLogger } from '@/utils/logger';
import type {
  EnhancedNotificationPreferences,
  MutedCoach,
  NotificationChannel,
  QuietHours,
  NotificationType,
} from '@/constants/types';

const PREFERENCES_STORAGE_KEY = 'clubroom.notification_preferences';
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
    return storageService.getItem<EnhancedNotificationPreferences[]>(
      PREFERENCES_STORAGE_KEY,
      []
    );
  }

  /**
   * Save a user's preferences.
   */
  private async savePreferences(
    userId: string,
    prefs: EnhancedNotificationPreferences
  ): Promise<void> {
    const all = await this.loadAllPreferences();
    const index = all.findIndex((p) => p.userId === userId);

    if (index >= 0) {
      all[index] = prefs;
    } else {
      all.push(prefs);
    }

    await storageService.setItem(PREFERENCES_STORAGE_KEY, all);
  }

  /**
   * Get preferences for a user.
   */
  async getPreferences(userId: string): Promise<EnhancedNotificationPreferences> {
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
  async updatePreferences(
    userId: string,
    updates: Partial<EnhancedNotificationPreferences>
  ): Promise<EnhancedNotificationPreferences> {
    const current = await this.getPreferences(userId);
    const updated: EnhancedNotificationPreferences = {
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
  async setQuietHours(
    userId: string,
    startTime: string,
    endTime: string,
    enabled = true
  ): Promise<EnhancedNotificationPreferences> {
    const quietHours: QuietHours = { enabled, startTime, endTime };
    return this.updatePreferences(userId, { quietHours });
  }

  /**
   * Toggle quiet hours on/off.
   */
  async toggleQuietHours(
    userId: string,
    enabled: boolean
  ): Promise<EnhancedNotificationPreferences> {
    const current = await this.getPreferences(userId);
    return this.updatePreferences(userId, {
      quietHours: { ...current.quietHours, enabled },
    });
  }

  /**
   * Toggle a notification channel (push, email, sms).
   */
  async toggleChannel(
    userId: string,
    channel: NotificationChannel,
    enabled: boolean
  ): Promise<EnhancedNotificationPreferences> {
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
  async toggleNotificationType(
    userId: string,
    type: NotificationType,
    enabled: boolean
  ): Promise<EnhancedNotificationPreferences> {
    const current = await this.getPreferences(userId);
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
  }

  /**
   * Set channels for a specific notification type.
   */
  async setNotificationTypeChannels(
    userId: string,
    type: NotificationType,
    channels: NotificationChannel[]
  ): Promise<EnhancedNotificationPreferences> {
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
  async muteCoach(
    userId: string,
    coachId: string,
    coachName: string,
    coachAvatar?: string,
    reason?: string
  ): Promise<EnhancedNotificationPreferences> {
    const current = await this.getPreferences(userId);

    if (current.mutedCoaches.some((mc) => mc.coachId === coachId)) {
      logger.info('Coach already muted', { userId, coachId });
      return current;
    }

    const mutedCoach: MutedCoach = {
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
  async unmuteCoach(
    userId: string,
    coachId: string
  ): Promise<EnhancedNotificationPreferences> {
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
  async getMutedCoaches(userId: string): Promise<MutedCoach[]> {
    const prefs = await this.getPreferences(userId);
    return prefs.mutedCoaches;
  }

  /**
   * Check if a coach is muted by a user.
   */
  async isCoachMuted(userId: string, coachId: string): Promise<boolean> {
    const mutedCoaches = await this.getMutedCoaches(userId);
    return mutedCoaches.some((mc) => mc.coachId === coachId);
  }

  /**
   * Check if currently in quiet hours for a user.
   */
  async isInQuietHours(userId: string): Promise<boolean> {
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
  async shouldSendNotification(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel,
    coachId?: string
  ): Promise<boolean> {
    const prefs = await this.getPreferences(userId);

    // Check if channel is globally enabled
    const channelKey = channel.toLowerCase() as 'push' | 'email' | 'sms';
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
  async resetPreferences(userId: string): Promise<EnhancedNotificationPreferences> {
    const defaults = this.createDefaultPreferences(userId);
    await this.savePreferences(userId, defaults);
    logger.info('Preferences reset', { userId });
    return defaults;
  }
}

export const notificationPreferencesService = new NotificationPreferencesService();
