/**
 * Hook for the Subscribe (recurring booking) screen.
 * Manages coach selection, athlete resolution, and subscription creation.
 */

import { useState, useEffect, startTransition } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { api } from '@/constants/config';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { useScreen } from '@/hooks/use-screen';
import { recurringBookingService } from '@/services/recurring-booking-service';
import { discoverService } from '@/services/discover-service';
import { createLogger } from '@/utils/logger';
import type { CreateRecurringBookingParams, CoachProfile } from '@/constants/types';
import { err, ok } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';
import { runAsyncTryCatchFinally } from '@/utils/async-control';
const logger = createLogger('SubscribeScreen');
const EMPTY_COACHES: CoachOption[] = [];
export interface CoachOption {
  id: string;
  name: string;
  photoUrl?: string;
  sessionTypes: string[];
  pricePerSession: number;
  location: string;
  rating: number;
  totalSessions: number;
}
const mapCoachProfileToOption = (coach: CoachProfile): CoachOption => ({
  id: coach.id,
  name: coach.fullName,
  photoUrl: coach.profilePhotoUrl,
  sessionTypes: coach.footballFocuses?.length > 0 ? coach.footballFocuses : ['1-on-1 Training'],
  pricePerSession: coach.sessionRate ?? coach.priceRange.min,
  location: coach.city ? `${coach.city}, ${coach.state}` : 'TBD',
  rating: coach.rating.average,
  totalSessions: coach.totalSessions,
});
export function useSubscribe() {
  const { currentUser, availableUsers } = useAuth();
  const { children: contextChildren, isParent } = useChildContext();
  const params = useLocalSearchParams<{
    coachId?: string;
  }>();
  const [selectedCoach, setSelectedCoach] = useState<CoachOption | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const loadCoaches = async () => {
    const result = await discoverService.getAllCoaches();
    if (result.success) {
      const apiCoaches = result.data.map(mapCoachProfileToOption);
      if (apiCoaches.length > 0 || !api.useMock) {
        return ok(apiCoaches);
      }
    } else if (!api.useMock) {
      return err(result.error);
    }

    const fallbackCoaches = availableUsers.flatMap((user) =>
      user.role === 'COACH'
        ? [
            {
              id: user.id,
              name: user.name || user.fullName || 'Coach',
              photoUrl: user.avatar,
              sessionTypes: ['1-on-1 Training'],
              pricePerSession: 50,
              location: user.postcode || 'TBD',
              rating: 4.5,
              totalSessions: 0,
            },
          ]
        : [],
    );
    return ok(fallbackCoaches);
  };
  const {
    data: coachesData,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    colors,
  } = useScreen<CoachOption[]>({
    load: loadCoaches,
    deps: [loadCoaches],
    isEmpty: (list) => list.length === 0,
    refetchOnFocus: true,
  });
  const coaches = coachesData ?? EMPTY_COACHES;
  const athletes = (() => {
    if (!currentUser?.id || currentUser.role === 'COACH') return undefined;
    const selfName = (
      currentUser.fullName ||
      currentUser.name ||
      currentUser.username ||
      ''
    ).trim();
    if (isParent) {
      return contextChildren.map((c) => ({
        id: c.id,
        name: c.name,
      }));
    }
    if (!selfName) {
      return undefined;
    }
    return [
      {
        id: currentUser.id,
        name: selfName,
      },
    ];
  })();
  useEffect(() => {
    if (params.coachId) {
      const coach = coaches.find((c) => c.id === params.coachId);
      if (coach)
        startTransition(() => {
          setSelectedCoach(coach);
        });
    }
  }, [params.coachId, coaches]);
  const handleSubmit = async (formParams: CreateRecurringBookingParams) => {
    setSubmitting(true);
    await runAsyncTryCatchFinally(
      async () => {
        const result = await recurringBookingService.createRecurring(formParams);
        if (result.success) {
          uiFeedback.showToast('Your recurring sessions are on your schedule.', 'success');
          router.replace(Routes.SCHEDULE);
        } else {
          uiFeedback.showToast(result.error?.message || 'Failed to create subscription.', 'error');
        }
      },
      async (error) => {
        logger.error('Failed to create subscription', error);
        uiFeedback.showToast('An unexpected error occurred. Please try again.', 'error');
      },
      () => {
        setSubmitting(false);
      },
    );
  };
  const handleCancel = () => router.back();
  const clearCoach = () => setSelectedCoach(null);
  return {
    currentUser,
    selectedCoach,
    submitting,
    coaches,
    athletes,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    colors,
    setSelectedCoach,
    handleSubmit,
    handleCancel,
    clearCoach,
  };
}
