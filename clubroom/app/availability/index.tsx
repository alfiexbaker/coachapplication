/**
 * Availability Index - Redirect
 *
 * This file redirects to the main availability tab.
 * The primary availability management is in (tabs)/availability.tsx
 */

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AvailabilityRedirect() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  useEffect(() => {
    // Redirect to the main availability tab
    router.replace('/(tabs)/availability');
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ActivityIndicator size="large" color={palette.tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
