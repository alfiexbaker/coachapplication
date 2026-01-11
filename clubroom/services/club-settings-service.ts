/**
 * Club Settings Service
 *
 * Handles club configuration and settings management.
 * Only coaches and admins can modify settings.
 *
 * API Integration Notes:
 * - GET /api/clubs/:id/settings - Get club settings
 * - PATCH /api/clubs/:id/settings - Update settings
 * - POST /api/clubs/:id/settings/regenerate-code - Regenerate invite code
 * - DELETE /api/clubs/:id - Delete club
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClubRole } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const STORAGE_KEY_PREFIX = '@club_settings_';
const logger = createLogger('ClubSettingsService');

export interface ClubSettings {
  clubId: string;
  name: string;
  description: string;
  photoUri?: string;
  inviteCode: string;
  isPublic: boolean;
  // Notification preferences
  notifyOnNewSession: boolean;
  notifyOnNewPost: boolean;
  notifyOnNewMatch: boolean;
  notifyOnNewEvent: boolean;
  // Session reminders
  sessionReminderHours: number; // Hours before session to send reminder (0 = disabled)
  // Updated timestamp
  updatedAt: string;
}

// Default settings for a new club
function getDefaultSettings(clubId: string, clubName: string, inviteCode: string): ClubSettings {
  return {
    clubId,
    name: clubName,
    description: '',
    inviteCode,
    isPublic: false,
    notifyOnNewSession: true,
    notifyOnNewPost: true,
    notifyOnNewMatch: true,
    notifyOnNewEvent: true,
    sessionReminderHours: 24,
    updatedAt: new Date().toISOString(),
  };
}

// Generate a random invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous characters
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const clubSettingsService = {
  /**
   * Get settings for a club
   */
  async getClubSettings(clubId: string, clubName?: string, existingInviteCode?: string): Promise<ClubSettings> {
    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${clubId}`);
      if (stored) {
        const settings = JSON.parse(stored) as ClubSettings;
        logger.info('settings_loaded', { clubId });
        return settings;
      }
    } catch (error) {
      logger.error('settings_load_error', { clubId, error });
    }

    // Return default settings if none exist
    const defaults = getDefaultSettings(
      clubId,
      clubName || 'Club',
      existingInviteCode || generateInviteCode()
    );
    logger.info('settings_defaults_used', { clubId });
    return defaults;
  },

  /**
   * Update club settings
   */
  async updateClubSettings(
    clubId: string,
    updates: Partial<Omit<ClubSettings, 'clubId' | 'updatedAt'>>
  ): Promise<ClubSettings> {
    const current = await this.getClubSettings(clubId);
    const updated: ClubSettings = {
      ...current,
      ...updates,
      clubId, // Ensure clubId is not changed
      updatedAt: new Date().toISOString(),
    };

    try {
      await AsyncStorage.setItem(`${STORAGE_KEY_PREFIX}${clubId}`, JSON.stringify(updated));
      logger.info('settings_updated', { clubId, updates: Object.keys(updates) });
    } catch (error) {
      logger.error('settings_save_error', { clubId, error });
      throw error;
    }

    return updated;
  },

  /**
   * Regenerate the club invite code
   */
  async regenerateInviteCode(clubId: string): Promise<string> {
    const newCode = generateInviteCode();
    await this.updateClubSettings(clubId, { inviteCode: newCode });
    logger.info('invite_code_regenerated', { clubId });
    return newCode;
  },

  /**
   * Delete club settings (called when club is deleted)
   */
  async deleteClubSettings(clubId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${STORAGE_KEY_PREFIX}${clubId}`);
      logger.info('settings_deleted', { clubId });
    } catch (error) {
      logger.error('settings_delete_error', { clubId, error });
    }
  },

  /**
   * Check if user can manage club settings
   */
  canManageSettings(userRole: ClubRole): boolean {
    return ['OWNER', 'ADMIN', 'HEAD_COACH'].includes(userRole);
  },

  /**
   * Check if user can delete club
   */
  canDeleteClub(userRole: ClubRole): boolean {
    return userRole === 'OWNER';
  },

  /**
   * Update club name (also updates in main club data)
   */
  async updateClubName(clubId: string, newName: string): Promise<void> {
    await this.updateClubSettings(clubId, { name: newName });
    // In a real app, this would also update the main club record
    logger.info('club_name_updated', { clubId, newName });
  },

  /**
   * Update club description
   */
  async updateClubDescription(clubId: string, description: string): Promise<void> {
    await this.updateClubSettings(clubId, { description });
    logger.info('club_description_updated', { clubId });
  },

  /**
   * Update club photo
   */
  async updateClubPhoto(clubId: string, photoUri: string): Promise<void> {
    await this.updateClubSettings(clubId, { photoUri });
    logger.info('club_photo_updated', { clubId });
  },

  /**
   * Update privacy setting
   */
  async updatePrivacy(clubId: string, isPublic: boolean): Promise<void> {
    await this.updateClubSettings(clubId, { isPublic });
    logger.info('club_privacy_updated', { clubId, isPublic });
  },

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    clubId: string,
    preferences: {
      notifyOnNewSession?: boolean;
      notifyOnNewPost?: boolean;
      notifyOnNewMatch?: boolean;
      notifyOnNewEvent?: boolean;
      sessionReminderHours?: number;
    }
  ): Promise<void> {
    await this.updateClubSettings(clubId, preferences);
    logger.info('club_notification_prefs_updated', { clubId, preferences });
  },

  /**
   * Check if notifications are enabled for a specific type
   */
  async shouldNotify(
    clubId: string,
    type: 'session' | 'post' | 'match' | 'event'
  ): Promise<boolean> {
    const settings = await this.getClubSettings(clubId);
    switch (type) {
      case 'session':
        return settings.notifyOnNewSession;
      case 'post':
        return settings.notifyOnNewPost;
      case 'match':
        return settings.notifyOnNewMatch;
      case 'event':
        return settings.notifyOnNewEvent;
      default:
        return true;
    }
  },

  /**
   * Get session reminder hours
   */
  async getSessionReminderHours(clubId: string): Promise<number> {
    const settings = await this.getClubSettings(clubId);
    return settings.sessionReminderHours;
  },
};
