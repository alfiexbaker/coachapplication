/**
 * Push Notification Service
 *
 * Manages push notification registration, scheduling, and badge counts
 * using expo-notifications. Falls back gracefully if the package is not
 * installed or permissions are denied.
 */

import { Platform } from 'react-native';
import { createLogger } from '@/utils/logger';

const logger = createLogger('PushNotificationService');

// Lazy-load expo-notifications to avoid crash if not installed
let Notifications: typeof import('expo-notifications') | null = null;
let Device: any = null;

try {
  Notifications = require('expo-notifications');
} catch {
  logger.warn('expo-notifications not installed. Push notifications disabled.');
}

try {
  Device = require('expo-device');
} catch {
  logger.warn('expo-device not installed. Device checks disabled.');
}

// ============================================================================
// CONFIGURATION
// ============================================================================

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ============================================================================
// SERVICE
// ============================================================================

export const pushNotificationService = {
  /**
   * Register for push notifications and return the Expo push token.
   * Returns null if registration fails or permissions are denied.
   */
  async registerForPushNotifications(): Promise<string | null> {
    if (!Notifications) {
      logger.warn('expo-notifications not available');
      return null;
    }

    // Must be a physical device for push notifications
    if (Device && !Device.isDevice) {
      logger.warn('Push notifications require a physical device');
      return null;
    }

    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        logger.warn('Push notification permission denied');
        return null;
      }

      // Get the Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: undefined, // Uses the project ID from app.json
      });

      const token = tokenData.data;
      logger.success('Push notification token obtained', { token: token.substring(0, 20) + '...' });

      // Configure Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0F172A',
        });
      }

      return token;
    } catch (error) {
      logger.error('Failed to register for push notifications', error);
      return null;
    }
  },

  /**
   * Schedule a local notification.
   * Returns the notification identifier or empty string on failure.
   */
  async scheduleLocalNotification(params: {
    title: string;
    body: string;
    data?: Record<string, any>;
    triggerSeconds?: number;
  }): Promise<string> {
    if (!Notifications) {
      logger.warn('expo-notifications not available, skipping local notification');
      return '';
    }

    try {
      const trigger = params.triggerSeconds
        ? { seconds: params.triggerSeconds, repeats: false }
        : null;

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: params.title,
          body: params.body,
          data: params.data || {},
          sound: 'default',
        },
        trigger: trigger as any,
      });

      logger.info('Local notification scheduled', { id, title: params.title });
      return id;
    } catch (error) {
      logger.error('Failed to schedule local notification', error);
      return '';
    }
  },

  /**
   * Cancel a scheduled notification by its identifier.
   */
  async cancelNotification(id: string): Promise<void> {
    if (!Notifications) return;

    try {
      await Notifications.cancelScheduledNotificationAsync(id);
      logger.info('Notification cancelled', { id });
    } catch (error) {
      logger.error('Failed to cancel notification', error);
    }
  },

  /**
   * Cancel all scheduled notifications.
   */
  async cancelAllNotifications(): Promise<void> {
    if (!Notifications) return;

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      logger.info('All notifications cancelled');
    } catch (error) {
      logger.error('Failed to cancel all notifications', error);
    }
  },

  /**
   * Set the app badge count (iOS).
   */
  async setBadgeCount(count: number): Promise<void> {
    if (!Notifications) return;

    try {
      await Notifications.setBadgeCountAsync(count);
      logger.debug('Badge count set', { count });
    } catch (error) {
      logger.error('Failed to set badge count', error);
    }
  },
};
