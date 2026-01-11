import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import LoginScreen from '@/components/auth/login-screen';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { ErrorBoundary } from '@/components/error-boundary';
import { createLogger } from '@/utils/logger';
import { ThemeProvider as AppThemeProvider } from '@/hooks/theme-provider';
import { NotificationToastProvider } from '@/components/notification/notification-toast';
import { ToastProvider } from '@/components/ui/toast';

const logger = createLogger('RootLayout');

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigation() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, currentUser } = useAuth();

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
        <AppThemeProvider>
          <AuthProvider>
            <RootNavigation />
          </AuthProvider>
        </AppThemeProvider>
      </ErrorBoundary>
    );
  }
