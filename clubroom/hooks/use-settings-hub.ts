import { useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { isCoach as checkIsCoach } from '@/utils/user-helpers';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useSettingsHub');

export function useSettingsHub() {
  const { currentUser, logout } = useAuth();

  const isCoach = checkIsCoach(currentUser);
  const { isParent: userHasChildren } = useChildContext();

  const handleLogout = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          logger.press('ConfirmLogout', { userId: currentUser?.id });
          await logout();
          logger.info('Logout complete - returning to login screen');
          router.replace(Routes.ROOT);
        },
      },
    ]);
  }, [currentUser, logout]);

  return { currentUser, isCoach, userHasChildren, handleLogout };
}
