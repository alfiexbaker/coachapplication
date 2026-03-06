import { useEffect, useRef } from 'react';

import { onTyped, ServiceEvents } from '@/services/event-bus';
import { useAuth } from '@/hooks/use-auth';
import { uiFeedback } from '@/services/ui-feedback';

export function useTokenExpiryAlert(): void {
  const { logout } = useAuth();
  const handlingExpiryRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onTyped(ServiceEvents.TOKEN_EXPIRED_BACKGROUND, () => {
      if (handlingExpiryRef.current) return;
      handlingExpiryRef.current = true;
      uiFeedback.showToast(
        'Session expired while the app was closed. Please log in again.',
        'error',
      );
      void logout().finally(() => {
        handlingExpiryRef.current = false;
      });
    });

    return unsubscribe;
  }, [logout]);
}
