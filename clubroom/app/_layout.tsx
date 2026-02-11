import { useEffect, useRef } from 'react';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import LoginScreen from '@/components/auth/login-screen';
import { useTheme } from '@/hooks/useTheme';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { ErrorBoundary } from '@/components/error-boundary';
import { createLogger } from '@/utils/logger';
import { ThemeProvider as AppThemeProvider } from '@/hooks/theme-provider';
import { NotificationToastProvider } from '@/components/notification/notification-toast';
import { ToastProvider } from '@/components/ui/toast';
import { OfflineBanner } from '@/components/ui/offline-banner';
import { pushNotificationService } from '@/services/push-notification-service';
import { navigateToDeepLink } from '@/utils/deep-link';

// Lazy-load expo-notifications for deep linking
let Notifications: typeof import('expo-notifications') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require('expo-notifications');
} catch {
  // expo-notifications not installed
}

const logger = createLogger('RootLayout');

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigation() {
  const { scheme: colorScheme } = useTheme();
  const { isAuthenticated, currentUser } = useAuth();
  const notificationResponseSubscription = useRef<{ remove: () => void } | null>(null);

  logger.debug('RootNavigation rendered', {
    isAuthenticated,
    colorScheme,
    userRole: currentUser?.role,
    username: currentUser?.username,
  });

  // Register push token for authenticated users.
  useEffect(() => {
    if (!isAuthenticated) return;
    void pushNotificationService.registerForPushNotifications();
  }, [isAuthenticated]);

  // Deep linking: handle notification taps and initial launch tap.
  useEffect(() => {
    if (!Notifications || !isAuthenticated) return;

    const handleResponse = (response: {
      notification: { request: { content: { data: Record<string, unknown> } } };
    }) => {
      const data = response.notification.request.content.data;
      logger.info('Notification tapped — deep linking', { data });

      const navigated = navigateToDeepLink(router, data?.deepLink);
      if (!navigated) {
        logger.warn('Ignored invalid deep link in notification payload', { data });
      }
    };

    void Notifications.getLastNotificationResponseAsync?.().then((response) => {
      if (response) {
        handleResponse(response);
      }
    });

    notificationResponseSubscription.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        handleResponse(response);
      });

    return () => {
      if (notificationResponseSubscription.current) {
        notificationResponseSubscription.current.remove();
      }
    };
  }, [isAuthenticated]);

  return (
    <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {isAuthenticated ? (
        <ToastProvider>
          <NotificationToastProvider>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="(modal)/post-detail"
                options={{
                  presentation: 'modal',
                  headerShown: false,
                  animation: 'slide_from_bottom',
                }}
              />
              <Stack.Screen
                name="(modal)/create-post"
                options={{
                  presentation: 'modal',
                  headerShown: false,
                  animation: 'slide_from_bottom',
                }}
              />
              <Stack.Screen
                name="(modal)/add-child"
                options={{
                  presentation: 'modal',
                  headerShown: false,
                  animation: 'slide_from_bottom',
                }}
              />
              <Stack.Screen
                name="book-coach"
                options={{
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="confirm-booking"
                options={{
                  presentation: 'modal',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="settings"
                options={{
                  headerShown: false,
                  animation: 'slide_from_right',
                }}
              />
              <Stack.Screen
                name="skills"
                options={{
                  headerShown: false,
                  animation: 'slide_from_right',
                }}
              />
            </Stack>
            <StatusBar style="auto" />
            <OfflineBanner />
          </NotificationToastProvider>
        </ToastProvider>
      ) : (
        <>
          <LoginScreen />
          <StatusBar style="auto" />
        </>
      )}
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  logger.info('App initializing');

  return (
    <ErrorBoundary>
      <AppThemeProvider>
        <AuthProvider>
          <RootNavigation />
        </AuthProvider>
      </AppThemeProvider>
    </ErrorBoundary>
  );
}
