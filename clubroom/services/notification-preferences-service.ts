import { NotificationType } from '@/constants/types';
import { storageService } from './storage-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('NotificationPreferencesService');
const STORAGE_KEY = '@notification_preferences';

// ============================================================================
// TYPES
// ============================================================================

export type ReminderTiming = 0 | 1 | 24 | 48; // 0 = disabled, 1/24/48 hours before

export interface NotificationPreferences {
  // Push notification settings
  pushEnabled: boolean;
  sessionReminders: boolean;
  sessionReminderHours: ReminderTiming;
  messageNotifications: boolean;
  bookingUpdates: boolean;
  badgeNotifications: boolean;
  clubAnnouncements: boolean;

  // Email notification settings
  emailEnabled: boolean;
  emailSessionSummary: boolean;
  emailWeeklyDigest: boolean;
  emailPromotions: boolean;

  // Coach-specific settings
  newBookingAlerts: boolean;
  cancellationAlerts: boolean;
  payoutNotifications: boolean;

  // Parent-specific settings
  childActivityAlerts: boolean;
  progressUpdates: boolean;

  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00" format
  quietHoursEnd: string;   // "07:00" format
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  // Push notifications - enabled by default
  pushEnabled: true,
  sessionReminders: true,
  sessionReminderHours: 24, // 24 hours before
  messageNotifications: true,
  bookingUpdates: true,
  badgeNotifications: true,
  clubAnnouncements: true,

  // Email notifications
  emailEnabled: true,
  emailSessionSummary: true,
  emailWeeklyDigest: false,
  emailPromotions: false,

  // Coach-specific
  newBookingAlerts: true,
  cancellationAlerts: true,
  payoutNotifications: true,

  // Parent-specific
  childActivityAlerts: true,
  progressUpdates: true,

  // Quiet hours - disabled by default
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

// Map notification types to preference keys
const NOTIFICATION_TYPE_MAP: Record<NotificationType, keyof NotificationPreferences | null> = {
  'BOOKING_RECEIVED': 'newBookingAlerts',
  'BOOKING_CONFIRMED': 'bookingUpdates',
  'BOOKING_CANCELLED': 'cancellationAlerts',
  'SESSION_REMINDER': 'sessionReminders',
  'MESSAGE_RECEIVED': 'messageNotifications',
  'SESSION_INVITE': 'bookingUpdates',
  'SESSION_INVITE_RESPONSE': 'bookingUpdates',
  'REVIEW_REQUEST': null, // Always send
  'REVIEW_RECEIVED': null, // Always send
  'BADGE_AWARDED': 'badgeNotifications',
  'WAITLIST_AVAILABLE': 'bookingUpdates',
  'PAYMENT_RECEIVED': 'payoutNotifications',
  'PAYMENT_FAILED': null, // Always send - critical
  'GOAL_COMPLETED': 'progressUpdates',
  'VIDEO_SHARED': 'childActivityAlerts',
  'MATCH_INVITE': 'clubAnnouncements',
  'MATCH_RESPONSE': 'clubAnnouncements',
  'MATCH_LINEUP': 'clubAnnouncements',
  'MATCH_REMINDER': 'sessionReminders',
  'MATCH_CANCELLED': 'clubAnnouncements',
  'SESSION_AVAILABLE': 'clubAnnouncements',
  'EVENT_CREATED': 'clubAnnouncements',
  'MATCH_CREATED': 'clubAnnouncements',
};

// ============================================================================
// SERVICE
// ============================================================================

class NotificationPreferencesService {
  private cache: Map<string, NotificationPreferences> = new Map();
  private loadingPromises: Map<string, Promise<NotificationPreferences>> = new Map();

  /**
   * Get the storage key for a user
   */
  private getStorageKey(userId: string): string {
    return `${STORAGE_KEY}_${userId}`;
  }

  /**
   * Get notification preferences for a user
   * Uses caching for performance
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    // Check cache first
    const cached = this.cache.get(userId);
    if (cached) {
      return cached;
    }

    // Check if already loading
    const existingPromise = this.loadingPromises.get(userId);
    if (existingPromise) {
      return existingPromise;
    }

    // Load from storage
    const loadPromise = this.loadPreferences(userId);
    this.loadingPromises.set(userId, loadPromise);

    try {
      const preferences = await loadPromise;
      this.cache.set(userId, preferences);
      return preferences;
    } finally {
      this.loadingPromises.delete(userId);
    }
  }

  /**
   * Load preferences from storage
   */
  private async loadPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const key = this.getStorageKey(userId);
      const stored = await storageService.getItem<Partial<NotificationPreferences> | null>(key, null);

      if (stored) {
        // Merge with defaults to ensure all keys exist
        const merged = { ...DEFAULT_PREFERENCES, ...stored };
        logger.debug('preferences_loaded', { userId, hasStoredPrefs: true });
        return merged;
      }

      logger.debug('preferences_loaded', { userId, hasStoredPrefs: false, usingDefaults: true });
      return { ...DEFAULT_PREFERENCES };
    } catch (error) {
      logger.error('preferences_load_error', { userId, error });
      return { ...DEFAULT_PREFERENCES };
    }
  }

  /**
   * Update notification preferences for a user
   */
  async updatePreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const current = await this.getPreferences(userId);
      const updated = { ...current, ...updates };

      const key = this.getStorageKey(userId);
      await storageService.setItem(key, updated);

      // Update cache
      this.cache.set(userId, updated);

      logger.info('preferences_updated', {
        userId,
        updatedKeys: Object.keys(updates),
      });

      return updated;
    } catch (error) {
      logger.error('preferences_update_error', { userId, error });
      throw error;
    }
  }

  /**
   * Check if a notification should be sent based on user preferences
   */
  async shouldNotify(userId: string, type: NotificationType): Promise<boolean> {
    try {
      const preferences = await this.getPreferences(userId);

      // If push is disabled globally, don't send any push notifications
      if (!preferences.pushEnabled) {
        logger.debug('notification_blocked', { userId, type, reason: 'push_disabled' });
        return false;
      }

      // Check quiet hours
      const inQuietHours = await this.isQuietHours(userId);
      if (inQuietHours) {
        logger.debug('notification_blocked', { userId, type, reason: 'quiet_hours' });
        return false;
      }

      // Check type-specific preference
      const preferenceKey = NOTIFICATION_TYPE_MAP[type];
      if (preferenceKey === null) {
        // Critical notifications always sent
        return true;
      }

      const isEnabled = preferences[preferenceKey] as boolean;
      if (!isEnabled) {
        logger.debug('notification_blocked', { userId, type, reason: `${preferenceKey}_disabled` });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('should_notify_error', { userId, type, error });
      // Default to allowing notification on error
      return true;
    }
  }

  /**
   * Check if session reminders are enabled and get the timing
   */
  async getSessionReminderTiming(userId: string): Promise<ReminderTiming> {
    const preferences = await this.getPreferences(userId);
    if (!preferences.pushEnabled || !preferences.sessionReminders) {
      return 0; // Disabled
    }
    return preferences.sessionReminderHours;
  }

  /**
   * Check if currently in quiet hours for a user
   */
  async isQuietHours(userId: string): Promise<boolean> {
    try {
      const preferences = await this.getPreferences(userId);

      if (!preferences.quietHoursEnabled) {
        return false;
      }

      const now = new Date();
      const currentTime = this.formatTime(now.getHours(), now.getMinutes());
      const start = preferences.quietHoursStart;
      const end = preferences.quietHoursEnd;

      return this.isTimeInRange(currentTime, start, end);
    } catch (error) {
      logger.error('quiet_hours_check_error', { userId, error });
      return false;
    }
  }

  /**
   * Format hours and minutes to HH:MM string
   */
  private formatTime(hours: number, minutes: number): string {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * Check if a time is within a range (handles overnight ranges)
   */
  private isTimeInRange(time: string, start: string, end: string): boolean {
    // If start <= end (e.g., 09:00 to 17:00)
    if (start <= end) {
      return time >= start && time < end;
    }

    // If start > end (overnight, e.g., 22:00 to 07:00)
    return time >= start || time < end;
  }

  /**
   * Clear cache for a user (useful after logout)
   */
  clearCache(userId?: string): void {
    if (userId) {
      this.cache.delete(userId);
    } else {
      this.cache.clear();
    }
    logger.debug('cache_cleared', { userId: userId || 'all' });
  }

  /**
   * Reset preferences to defaults for a user
   */
  async resetToDefaults(userId: string): Promise<NotificationPreferences> {
    const key = this.getStorageKey(userId);
    await storageService.setItem(key, DEFAULT_PREFERENCES);
    this.cache.set(userId, { ...DEFAULT_PREFERENCES });
    logger.info('preferences_reset', { userId });
    return { ...DEFAULT_PREFERENCES };
  }
}

export const notificationPreferencesService = new NotificationPreferencesService();
