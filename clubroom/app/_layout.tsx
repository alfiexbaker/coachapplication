import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import LoginScreen from '@/components/auth/login-screen';
import { useTheme } from '@/hooks/useTheme';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { ChildProvider } from '@/hooks/use-child-context';
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
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require('expo-notifications');
  } catch {
    // expo-notifications not installed
  }
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
    if (!Notifications || !isAuthenticated || Platform.OS === 'web') return;

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

    try {
      const getLastResponse = Notifications.getLastNotificationResponseAsync;
      if (typeof getLastResponse === 'function') {
        void getLastResponse.call(Notifications).then((response) => {
          if (response) {
            handleResponse(response);
          }
        });
      }
    } catch (error) {
      logger.warn('Skipping initial notification response check on unsupported platform', {
        error,
      });
    }

    try {
      notificationResponseSubscription.current =
        Notifications.addNotificationResponseReceivedListener((response) => {
          handleResponse(response);
        });
    } catch (error) {
      logger.warn('Skipping notification response listener on unsupported platform', {
        error,
      });
      notificationResponseSubscription.current = null;
    }

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
            <Stack screenOptions={{ headerShown: false }} />
            <OfflineBanner />
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          </NotificationToastProvider>
        </ToastProvider>
      ) : (
        <>
          <LoginScreen />
          <StatusBar style="light" />
        </>
      )}
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  logger.info('App initializing');

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <AppThemeProvider>
          <AuthProvider>
            <ChildProvider>
              <RootNavigation />
            </ChildProvider>
          </AuthProvider>
        </AppThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
