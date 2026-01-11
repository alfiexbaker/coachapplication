import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus } from 'react-native';
import 'react-native-reanimated';

import LoginScreen from '@/components/auth/login-screen';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { ErrorBoundary } from '@/components/error-boundary';
import { createLogger } from '@/utils/logger';
import { ThemeProvider as AppThemeProvider } from '@/hooks/theme-provider';
import { NotificationToastProvider } from '@/components/notification/notification-toast';
import { ToastProvider } from '@/components/ui/toast';
import { NetworkProvider } from '@/hooks/use-network-status';
import { OfflineBanner } from '@/components/ui/offline-banner';
import { sessionReminderService } from '@/services/session-reminder-service';

const logger = createLogger('RootLayout');

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigation() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, currentUser } = useAuth();

  // Start session reminder service when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      logger.info('Starting session reminder service');
      sessionReminderService.start();

      // Also check reminders when app comes back to foreground
      const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          logger.debug('App came to foreground, triggering reminder check');
          sessionReminderService.triggerCheck();
        }
      });

      return () => {
        sessionReminderService.stop();
        subscription.remove();
      };
    }
  }, [isAuthenticated]);

  logger.debug('RootNavigation rendered', {
    isAuthenticated,
    colorScheme,
    userRole: currentUser?.role,
    username: currentUser?.username
  });

    return (
      <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {isAuthenticated ? (
          <ToastProvider>
            <NotificationToastProvider>
              <OfflineBanner />
              <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
              <Stack.Screen
                name="(modal)/post-detail"
                options={{
                  presentation: 'modal',
                  headerShown: false,
                  animation: 'slide_from_bottom'
                }}
              />
              <Stack.Screen
                name="(modal)/create-post"
                options={{
                  presentation: 'modal',
                  headerShown: false,
                  animation: 'slide_from_bottom'
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
            </Stack>
              <StatusBar style="auto" />
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
        <NetworkProvider>
          <AppThemeProvider>
            <AuthProvider>
              <RootNavigation />
            </AuthProvider>
          </AppThemeProvider>
        </NetworkProvider>
      </ErrorBoundary>
    );
  }
