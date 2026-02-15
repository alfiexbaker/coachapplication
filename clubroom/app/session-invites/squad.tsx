import { useEffect } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingState } from '@/components/ui/screen-states';
import { Routes } from '@/navigation/routes';

export default function SquadInviteRedirect() {
  useEffect(() => {
    router.replace(
      Routes.sessionsCreateIntent({
        intent: 'existing',
        source: 'group_manage',
      }),
    );
  }, []);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <LoadingState variant="detail" />
    </SafeAreaView>
  );
}
