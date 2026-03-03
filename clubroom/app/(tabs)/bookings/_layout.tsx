import { Stack } from 'expo-router';
import { ErrorBoundary } from '@/components/error-boundary';
import { useTheme } from '@/hooks/useTheme';

export default function BookingsLayout() {
  const { colors: palette } = useTheme();

  return (
    <ErrorBoundary>
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: palette.background,
          },
          headerTintColor: palette.foreground,
          headerShadowVisible: false,
          headerBackTitle: 'Back',
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false, // Hide header on main bookings list
          }}
        />
        <Stack.Screen
          name="[id]"
          options={{
            title: 'Session Details',
          }}
        />
        <Stack.Screen
          name="report-problem"
          options={{
            title: 'Report Problem',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="session-feedback"
          options={{
            title: 'Session Feedback',
            presentation: 'modal',
          }}
        />
      </Stack>
    </ErrorBoundary>
  );
}
