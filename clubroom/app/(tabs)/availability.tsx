/**
 * Availability Screen - Redirect
 *
 * This screen now redirects to the Schedule tab's Availability segment.
 * Kept for backward compatibility (deep links, onboarding checklist references).
 */

import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';

export default function AvailabilityScreen() {
  useEffect(() => {
    router.replace({
      pathname: '/(tabs)/schedule',
      params: { segment: 'availability' },
    });
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ThemedText>Redirecting...</ThemedText>
    </View>
  );
}
