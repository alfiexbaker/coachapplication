/**
 * usePushNotifications Hook
 *
 * Handles push notification setup, permission request, and token registration.
 * Provides the Expo push token for server registration.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { pushNotificationService } from '@/services/push-notification-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('usePushNotifications');

// Lazy-load expo-notifications
let Notifications: typeof import('expo-notifications') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require('expo-notifications');
} catch {
  // Not installed
}

/** Shape of an Expo notification received in the foreground */
interface NotificationContent {
  title: string | null;
  body: string | null;
  data: Record<string, unknown>;
}

interface ExpoNotification {
  date: number;
  request: {
    identifier: string;
    content: NotificationContent;
    trigger: unknown;
  };
}

/** Subscription handle returned by Expo notification listeners */
interface Subscription {
  remove: () => void;
}

interface UsePushNotificationsResult {
  /** The Expo push token, or null if not registered */
  expoPushToken: string | null;
  /** Whether the hook is still setting up */
  isLoading: boolean;
  /** Whether notification permissions were granted */
  isPermissionGranted: boolean;
  /** Last notification received while app is in foreground */
  lastNotification: ExpoNotification | null;
  /** Request permission and register for push notifications */
  requestPermission: () => Promise<string | null>;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [lastNotification, setLastNotification] = useState<ExpoNotification | null>(null);

  const notificationListener = useRef<Subscription | null>(null);
  const responseListener = useRef<Subscription | null>(null);

  const requestPermission = useCallback(async () => {
    try {
      const token = await pushNotificationService.registerForPushNotifications();
      if (token) {
        setExpoPushToken(token);
        setIsPermissionGranted(true);
        logger.success('Push notification token registered');
      }
      return token;
    } catch (error) {
      logger.error('Failed to request push notification permission', error);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      // Register for push notifications on mount
      const token = await pushNotificationService.registerForPushNotifications();
      if (mounted && token) {
        setExpoPushToken(token);
        setIsPermissionGranted(true);
      }
      if (mounted) {
        setIsLoading(false);
      }
    };

    setup();

    // Listen for incoming notifications (foreground)
    if (Notifications) {
      notificationListener.current = Notifications.addNotificationReceivedListener(
        (notification) => {
          if (mounted) {
            setLastNotification(notification);
            logger.info('Notification received in foreground', {
              title: notification.request.content.title,
            });
          }
        }
      );

      // Listen for notification responses (user tapped notification)
      // Deep linking is handled in _layout.tsx
      responseListener.current = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          logger.info('Notification tapped', {
            data: response.notification.request.content.data,
          });
        }
      );
    }

    return () => {
      mounted = false;
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return {
    expoPushToken,
    isLoading,
    isPermissionGranted,
    lastNotification,
    requestPermission,
  };
}
