/**
 * Hook for the Subscribe (recurring booking) screen.
 * Manages coach selection, athlete resolution, and subscription creation.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { recurringBookingService } from '@/services/recurring-booking-service';
import { discoverService } from '@/services/discover-service';
import { hasChildren } from '@/utils/user-helpers';
import { createLogger } from '@/utils/logger';
import type { CreateRecurringBookingParams, CoachProfile } from '@/constants/types';
import { ok } from '@/types/result';

const logger = createLogger('SubscribeScreen');

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
  pricePerSession: coach.sessionRate ?? coach.priceRange.minUsd,
  location: coach.city ? `${coach.city}, ${coach.state}` : 'TBD',
  rating: coach.rating.average,
  totalSessions: coach.totalSessions,
});

export function useSubscribe() {
  const { currentUser, availableUsers } = useAuth();
  const params = useLocalSearchParams<{ coachId?: string }>();

  const [selectedCoach, setSelectedCoach] = useState<CoachOption | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadCoaches = useCallback(async () => {
    const result = await discoverService.getAllCoaches();
    if (result.success && result.data.length > 0) {
      return ok(result.data.map(mapCoachProfileToOption));
    }

    const fallbackCoaches = availableUsers
      .filter((user) => user.role === 'COACH')
      .map((coach) => ({
        id: coach.id,
        name: coach.name || coach.fullName || 'Coach',
        photoUrl: coach.avatar,
        sessionTypes: ['1-on-1 Training'],
        pricePerSession: 50,
        location: coach.postcode || 'TBD',
        rating: 4.5,
        totalSessions: 0,
      }));

    return ok(fallbackCoaches);
  }, [availableUsers]);

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
  const coaches = coachesData ?? [];

  const athletes = useMemo(() => {
    if (!currentUser?.id || currentUser.role === 'COACH') return undefined;
    if (hasChildren(currentUser)) {
      const children = currentUser.children || [];
      return children.map((child) => ({ id: child.childId, name: child.childName || 'Child' }));
    }
    return [{ id: currentUser.id, name: currentUser.fullName || 'Me' }];
  }, [currentUser]);

  useEffect(() => {
    if (params.coachId) {
      const coach = coaches.find((c) => c.id === params.coachId);
      if (coach) setSelectedCoach(coach);
    }
  }, [params.coachId, coaches]);

  const handleSubmit = useCallback(async (formParams: CreateRecurringBookingParams) => {
    setSubmitting(true);
    try {
      const result = await recurringBookingService.createRecurring(formParams);
      if (result.success) {
        Alert.alert('Subscription Created', 'Your recurring booking has been set up successfully!', [
          { text: 'View Subscriptions', onPress: () => router.replace(Routes.BOOKINGS_RECURRING) },
        ]);
      } else {
        Alert.alert('Error', result.error?.message || 'Failed to create subscription.');
      }
    } catch (error) {
      logger.error('Failed to create subscription', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, []);

  const handleCancel = useCallback(() => router.back(), []);
  const clearCoach = useCallback(() => setSelectedCoach(null), []);

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
