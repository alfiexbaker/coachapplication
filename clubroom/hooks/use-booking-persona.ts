import { useMemo } from 'react';

import { useAuth } from '@/hooks/use-auth';

export type BookingPersona = 'parent' | 'athlete' | 'guest';

export function useBookingPersona() {
  const { currentUser } = useAuth();

  return useMemo(() => {
    if (!currentUser) {
      return { persona: 'guest' as BookingPersona, isParent: false, userId: undefined };
    }
    const isParent = currentUser.role === 'PARENT';
    return {
      persona: isParent ? ('parent' as const) : ('athlete' as const),
      isParent,
      userId: currentUser.id,
      role: currentUser.role,
    };
  }, [currentUser]);
}
