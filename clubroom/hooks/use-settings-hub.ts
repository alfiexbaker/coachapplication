import { useCallback } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { isCoach as checkIsCoach } from '@/utils/user-helpers';
import { createLogger } from '@/utils/logger';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('useSettingsHub');

export function useSettingsHub() {
  const { currentUser, logout } = useAuth();

  const isCoach = checkIsCoach(currentUser);
  const { children } = useChildContext();
  const childCount = children.length;

  const handleLogout = useCallback(() => {
    uiFeedback.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          logger.press('ConfirmLogout', { userId: currentUser?.id });
          await logout();
          logger.info('Logout complete - returning to login screen');
        },
      },
    ]);
  }, [currentUser, logout]);

  return { currentUser, isCoach, childCount, handleLogout };
}
