import { useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingState } from '@/components/ui/screen-states';
import { Routes } from '@/navigation/routes';

export default function CreateSessionInviteRedirect() {
  const params = useLocalSearchParams<{
    offeringId?: string;
    date?: string;
    athleteIds?: string;
    athleteId?: string;
    athleteNames?: string;
  }>();

  useEffect(() => {
    router.replace(
      Routes.sessionsCreateIntent({
        intent: 'existing',
        source: 'manual',
        offeringId: params.offeringId,
        date: params.date,
        athleteIds: params.athleteIds ?? params.athleteId,
        athleteNames: params.athleteNames,
      }),
    );
  }, [params.athleteId, params.athleteIds, params.athleteNames, params.date, params.offeringId]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <LoadingState variant="detail" />
    </SafeAreaView>
  );
}
