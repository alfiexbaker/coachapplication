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
import { AppAlertProvider } from '@/components/ui/app-alert';
import { AppActionSheetProvider } from '@/components/ui/action-sheet';
import { AppPromptProvider } from '@/components/ui/input-sheet';
import { ToastProvider } from '@/components/ui/toast';
import { OfflineBanner } from '@/components/ui/offline-banner';
import { pushNotificationService } from '@/services/push-notification-service';
import { initAutoFlush } from '@/services/offline-queue';
import { navigateToDeepLink } from '@/utils/deep-link';
import { appLifecycleService } from '@/services/app-lifecycle-service';
import { authService } from '@/services/auth-service';
import { useTokenExpiryAlert } from '@/hooks/use-token-expiry-alert';
import { notificationStore } from '@/services/notification';
import { preApiLiveModeService } from '@/services/pre-api-live-mode-service';
import { BookingFlowProvider } from '@/context/booking-flow-context';
import {
  markSentryAppLoaded,
  setSentryUser,
  wrapRootWithSentry,
} from '@/services/observability/sentry-service';

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

export function RootNavigation() {
  const { scheme: colorScheme } = useTheme();
  const { isAuthenticated, isLoading, currentUser } = useAuth();
  const notificationResponseSubscription = useRef<{ remove: () => void } | null>(null);
  const currentUserId = currentUser?.id;
  const currentUserRole = currentUser?.role;
  const currentUserEmail = currentUser?.email;
  const currentUsername = currentUser?.username;
  const currentUserName = currentUser?.name;
  const currentUserFullName = currentUser?.fullName;
  const currentUserDisplayName = currentUserFullName || currentUserName || currentUsername;
  useTokenExpiryAlert();

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
    void notificationStore.migrateRouteAliases();
  }, [isAuthenticated]);

  useEffect(() => {
    const unsubscribe = initAutoFlush();
    logger.info('Offline queue auto-flush initialized');
    return unsubscribe;
  }, []);

  useEffect(() => {
    appLifecycleService.init();
    authService.initTokenExpiryMonitor();

    return () => {
      authService.cleanupTokenExpiryMonitor();
      appLifecycleService.cleanup();
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !currentUserId || !currentUserRole || !currentUserDisplayName) {
      preApiLiveModeService.stop();
      return;
    }

    void preApiLiveModeService.start({
      userId: currentUserId,
      role: currentUserRole,
      displayName: currentUserDisplayName,
    });

    return () => {
      preApiLiveModeService.stop();
    };
  }, [isAuthenticated, currentUserDisplayName, currentUserId, currentUserRole]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    markSentryAppLoaded();
  }, [isLoading]);

  useEffect(() => {
    if (!isAuthenticated || !currentUserId || !currentUserRole || !currentUsername) {
      setSentryUser(null);
      return;
    }

    setSentryUser({
      id: currentUserId,
      email: currentUserEmail,
      username: currentUsername,
      name: currentUserDisplayName,
      role: currentUserRole,
    });
  }, [
    currentUserDisplayName,
    currentUserEmail,
    currentUserId,
    currentUserRole,
    currentUsername,
    isAuthenticated,
  ]);

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
          <AppAlertProvider>
            <AppActionSheetProvider>
              <AppPromptProvider>
                <BookingFlowProvider>
                  <NotificationToastProvider>
                    <Stack initialRouteName="(tabs)" screenOptions={{ headerShown: false }} />
                    <OfflineBanner />
                    <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
                  </NotificationToastProvider>
                </BookingFlowProvider>
              </AppPromptProvider>
            </AppActionSheetProvider>
          </AppAlertProvider>
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

export function RootLayout() {
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

const SentryRootLayout = wrapRootWithSentry(RootLayout);

export default SentryRootLayout;
