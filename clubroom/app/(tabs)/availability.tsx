/**
 * Availability Screen - Redirect
 *
 * This screen now redirects to the Schedule tab's Availability segment.
 * Kept for backward compatibility (deep links, onboarding checklist references).
 */

import { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LoadingState } from '@/components/ui/screen-states';
import { useTheme } from '@/hooks/useTheme';

export default function AvailabilityScreen() {
  const { colors } = useTheme();

  useEffect(() => {
    router.replace({
      pathname: '/(tabs)/schedule',
      params: { segment: 'availability' },
    });
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <LoadingState variant="detail" />
    </SafeAreaView>
  );
}
