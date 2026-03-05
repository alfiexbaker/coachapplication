import { useEffect, useRef } from 'react';

import { onTyped, ServiceEvents } from '@/services/event-bus';
import { useAuth } from '@/hooks/use-auth';
import { uiFeedback } from '@/services/ui-feedback';

export function useTokenExpiryAlert(): void {
  const { logout } = useAuth();
  const alertOpenRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onTyped(ServiceEvents.TOKEN_EXPIRED_BACKGROUND, () => {
      if (alertOpenRef.current) return;
      alertOpenRef.current = true;

      uiFeedback.alert(
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
