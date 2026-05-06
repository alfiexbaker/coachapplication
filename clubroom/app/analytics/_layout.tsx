import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';

/**
 * Analytics Stack Layout
 *
 * Provides navigation structure for analytics screens.
 * All screens use headerShown: false as they have custom headers.
 */
export default function AnalyticsLayout() {
  const { colors: palette } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="revenue" />
    </Stack>
  );
}
