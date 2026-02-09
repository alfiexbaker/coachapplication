/**
 * Hook for the Subscribe (recurring booking) screen.
 * Manages coach selection, athlete resolution, and subscription creation.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { recurringBookingService } from '@/services/recurring-booking-service';
import { MOCK_USERS, MOCK_COACH_PROFILES, getChildrenForParent } from '@/constants/mock-data';
import { hasChildren } from '@/utils/user-helpers';
import { createLogger } from '@/utils/logger';
import type { CreateRecurringBookingParams } from '@/constants/types';

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

export function useSubscribe() {
  const { currentUser } = useAuth();
  const params = useLocalSearchParams<{ coachId?: string }>();

  const [selectedCoach, setSelectedCoach] = useState<CoachOption | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const coaches = useMemo<CoachOption[]>(() => {
    const coachUsers = MOCK_USERS.filter((u) => u.role === 'COACH');
    return coachUsers.map((coach) => {
      const profile = MOCK_COACH_PROFILES.find((p) => p.userId === coach.id);
      return {
        id: coach.id, name: coach.name,
        photoUrl: `https://i.pravatar.cc/100?u=${coach.id}`,
        sessionTypes: profile?.specialties ?? ['1-on-1 Training'],
        pricePerSession: profile?.sessionRate ?? 50,
        location: profile?.availability?.[0]?.location ?? 'TBD',
        rating: profile?.rating ?? 4.5,
        totalSessions: profile?.totalSessions ?? 0,
      };
    });
  }, []);

  const athletes = useMemo(() => {
    if (!currentUser?.id || currentUser.role === 'COACH') return undefined;
    if (hasChildren(currentUser)) {
      const children = getChildrenForParent(currentUser.id);
      return children.map((child) => ({ id: child.id, name: child.name }));
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
        Alert.alert('Error', result.error || 'Failed to create subscription.');
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
    currentUser, selectedCoach, submitting, coaches, athletes,
    setSelectedCoach, handleSubmit, handleCancel, clearCoach,
  };
}
