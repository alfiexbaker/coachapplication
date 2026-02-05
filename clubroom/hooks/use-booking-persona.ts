import { useMemo } from 'react';

import { useAuth } from '@/hooks/use-auth';

export type BookingPersona = 'parent' | 'athlete' | 'guest';

// Helper to check if user has children
const hasChildren = (user: { children?: { childId: string }[] } | null): boolean => {
  return Boolean(user?.children && user.children.length > 0);
};

export function useBookingPersona() {
  const { currentUser } = useAuth();

  return useMemo(() => {
    if (!currentUser) {
      return { persona: 'guest' as BookingPersona, hasChildren: false, userId: undefined };
    }
    const userHasChildren = hasChildren(currentUser);
    return {
      persona: userHasChildren ? ('parent' as const) : ('athlete' as const),
      hasChildren: userHasChildren,
      userId: currentUser.id,
      role: currentUser.role,
    };
  }, [currentUser]);
}
