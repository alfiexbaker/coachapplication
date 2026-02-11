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
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';

export default function AvailabilityScreen() {
  const { colors } = useScreen<null>({
    load: async () => ok(null),
    isEmpty: () => false,
  });

  useEffect(() => {
    router.replace({
      pathname: '/(tabs)/schedule',
      params: { segment: 'availability' },
    });
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <LoadingState variant="detail" />
    </SafeAreaView>
  );
}
