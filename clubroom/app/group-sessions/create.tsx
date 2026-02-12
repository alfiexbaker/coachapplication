import { useEffect } from 'react';
import { router } from 'expo-router';

import { LoadingState } from '@/components/ui/screen-states';
import { Routes } from '@/navigation/routes';

export default function CreateGroupSessionRedirect() {
  useEffect(() => {
    router.replace(
      Routes.sessionsCreateIntent({
        intent: 'new',
        source: 'manual',
        preset: 'group',
      }),
    );
  }, []);

  return <LoadingState variant="detail" />;
}
