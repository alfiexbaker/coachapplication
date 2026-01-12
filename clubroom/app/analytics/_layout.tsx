import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Analytics Stack Layout
 *
 * Provides navigation structure for analytics screens.
 * All screens use headerShown: false as they have custom headers.
 */
export default function AnalyticsLayout() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

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
      <Stack.Screen name="retention" />
    </Stack>
  );
}
