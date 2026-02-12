import { useEffect } from 'react';
import { router } from 'expo-router';

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

  return <LoadingState variant="detail" />;
}
