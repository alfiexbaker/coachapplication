import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function BookingsLayout() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
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
      }}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false, // Hide header on main bookings list
        }}
      />
      <Stack.Screen
        name="today"
        options={{
          headerShown: false, // Hide header on today's sessions dashboard
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Session Details',
        }}
      />
      <Stack.Screen
        name="objectives"
        options={{
          title: 'My Objectives',
        }}
      />
      <Stack.Screen
        name="statistics"
        options={{
          title: 'Progress & Stats',
        }}
      />
      <Stack.Screen
        name="session-feedback"
        options={{
          title: 'Session Feedback',
        }}
      />
      <Stack.Screen
        name="report-problem"
        options={{
          title: 'Report Problem',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
