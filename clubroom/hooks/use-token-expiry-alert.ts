import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { onTyped, ServiceEvents } from '@/services/event-bus';
import { useAuth } from '@/hooks/use-auth';

export function useTokenExpiryAlert(): void {
  const { logout } = useAuth();
  const alertOpenRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onTyped(ServiceEvents.TOKEN_EXPIRED_BACKGROUND, () => {
      if (alertOpenRef.current) return;
      alertOpenRef.current = true;

      Alert.alert(
        'Session Expired',
        'Your session expired while the app was closed. Please log in again.',
        [
          {
            text: 'OK',
            onPress: () => {
              alertOpenRef.current = false;
              void logout();
            },
          },
        ],
        {
          cancelable: false,
          onDismiss: () => {
            alertOpenRef.current = false;
          },
        },
      );
    });

    return unsubscribe;
  }, [logout]);
}
