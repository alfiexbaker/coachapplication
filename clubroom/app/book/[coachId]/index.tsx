import { useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingState } from '@/components/ui/screen-states';
import { Routes } from '@/navigation/routes';

export default function BookCoachEntryScreen() {
  const { coachId, offeringId, source, childId, weeks } = useLocalSearchParams<{
    coachId: string;
    offeringId?: string;
    source?: string;
    childId?: string;
    weeks?: string;
  }>();

  useEffect(() => {
    if (!coachId) {
      router.replace(Routes.BOOK_COACH);
      return;
    }

    router.replace(
      Routes.bookSessionType(coachId, {
        offeringId,
        source,
        childId,
        weeks,
      }),
    );
  }, [childId, coachId, offeringId, source, weeks]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <LoadingState variant="detail" />
    </SafeAreaView>
  );
}
