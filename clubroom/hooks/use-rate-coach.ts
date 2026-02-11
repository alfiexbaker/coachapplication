/**
 * Hook for the Rate Coach screen.
 * Manages coach list, selection, rating form, and review submission.
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { apiClient } from '@/services/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import type { Booking } from '@/constants/app-types';
import type { SessionOffering } from '@/constants/session-types';
import { createLogger } from '@/utils/logger';
import { getSessionOfferingCoachName } from '@/utils/session-display';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('RateCoachScreen');

/** Stored review shape (superset of display-only CoachReview from user-types) */
interface StoredReview {
  id: string;
  coachId: string;
  coachName?: string;
  userId?: string;
  userName: string;
  parentName: string;
  rating: number;
  text: string;
  content: string;
  createdAt: string;
  sessionDate: string;
}

export interface CoachToRate {
  id: string;
  name: string;
  photoUrl?: string;
  sessionCount: number;
  lastSession?: string;
  hasReview: boolean;
}

const FEEDBACK_CHIPS = ['Great Communication', 'Patient', 'Knowledgeable', 'Motivating', 'Punctual', 'Friendly'];

const RATING_LABELS: Record<number, string> = {
  1: 'Needs improvement', 2: 'Fair', 3: 'Good', 4: 'Great!', 5: 'Excellent!',
};

export { FEEDBACK_CHIPS, RATING_LABELS };

interface RateCoachData {
  coaches: CoachToRate[];
}

export interface UseRateCoachResult {
  coaches: CoachToRate[];
  selectedCoach: CoachToRate | null;
  rating: number;
  reviewText: string;
  submitting: boolean;
  status: ScreenStatus;
  error: ServiceError | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  setSelectedCoach: (coach: CoachToRate | null) => void;
  setRating: (rating: number) => void;
  handleSubmitReview: () => Promise<void>;
  toggleChip: (label: string) => void;
  goBack: () => void;
}

export function useRateCoach() {
  const { currentUser } = useAuth();

  const [selectedCoach, setSelectedCoach] = useState<CoachToRate | null>(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadCoaches = useCallback(async () => {
    if (!currentUser?.id) {
      return ok<RateCoachData>({ coaches: [] });
    }

    try {
      const bookings = await apiClient.get<Booking[]>('session_bookings', []);
      const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
      const reviews = await apiClient.get<StoredReview[]>('coach_reviews', []);
      const reviewedCoachIds = new Set(reviews.map((r) => r.coachId));

      const coachMap = new Map<string, CoachToRate>();

      for (const booking of bookings) {
        if (booking.status === 'COMPLETED') {
          const existing = coachMap.get(booking.coachId);
          if (existing) {
            existing.sessionCount++;
            if (!existing.lastSession || new Date(booking.scheduledAt) > new Date(existing.lastSession)) {
              existing.lastSession = booking.scheduledAt;
            }
          } else {
            coachMap.set(booking.coachId, {
              id: booking.coachId, name: booking.coachName,
              photoUrl: `https://i.pravatar.cc/100?u=${booking.coachId}`,
              sessionCount: 1, lastSession: booking.scheduledAt,
              hasReview: reviewedCoachIds.has(booking.coachId),
            });
          }
        }
      }

      for (const offering of offerings) {
        const userReg = offering.registrations?.find(
          (r) => r.userId === currentUser?.id && r.status === 'confirmed'
        );
        if (userReg && new Date(offering.scheduledAt) < new Date()) {
          const existing = coachMap.get(offering.coachId);
          if (existing) { existing.sessionCount++; }
          else {
            coachMap.set(offering.coachId, {
              id: offering.coachId, name: getSessionOfferingCoachName(offering),
              photoUrl: `https://i.pravatar.cc/100?u=${offering.coachId}`,
              sessionCount: 1, lastSession: offering.scheduledAt,
              hasReview: reviewedCoachIds.has(offering.coachId),
            });
          }
        }
      }

      const sortedCoaches = Array.from(coachMap.values()).sort((a, b) =>
        new Date(b.lastSession || 0).getTime() - new Date(a.lastSession || 0).getTime()
      );

      return ok<RateCoachData>({ coaches: sortedCoaches });
    } catch (loadError) {
      logger.error('Failed to load coaches', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load coaches to rate. Pull down to refresh.', loadError));
    }
  }, [currentUser?.id]);

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<RateCoachData>({
    load: loadCoaches,
    deps: [currentUser?.id],
    isEmpty: (value) => value.coaches.length === 0,
    refetchOnFocus: true,
  });

  const coaches = data?.coaches ?? [];

  const handleSubmitReview = useCallback(async () => {
    if (!selectedCoach || rating === 0) {
      Alert.alert('Missing Rating', 'Please select a star rating');
      return;
    }
    setSubmitting(true);
    try {
      const reviews = await apiClient.get<StoredReview[]>('coach_reviews', []);
      const userName = currentUser?.fullName || currentUser?.username || 'Anonymous';
      const newReview: StoredReview = {
        id: `review_${Date.now()}`, coachId: selectedCoach.id, coachName: selectedCoach.name,
        userId: currentUser?.id ?? '', userName, parentName: userName, rating,
        text: reviewText.trim(), content: reviewText.trim(),
        createdAt: new Date().toISOString(), sessionDate: new Date().toISOString(),
      };
      reviews.push(newReview);
      await apiClient.set('coach_reviews', reviews);
      logger.info('Review submitted', { coachId: selectedCoach.id, rating });
      Alert.alert('Review Submitted', `Thank you for rating ${selectedCoach.name}!`,
        [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error) {
      logger.error('Failed to submit review', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally { setSubmitting(false); }
  }, [selectedCoach, rating, reviewText, currentUser]);

  const toggleChip = useCallback((label: string) => {
    setReviewText((prev) => {
      if (prev.includes(label)) return prev.replace(label + '. ', '').replace(label, '');
      return prev ? prev + ' ' + label + '.' : label + '.';
    });
  }, []);

  const goBack = useCallback(() => {
    if (selectedCoach) setSelectedCoach(null);
    else router.back();
  }, [selectedCoach]);

  return {
    coaches,
    selectedCoach,
    rating,
    reviewText,
    submitting,
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    loading: status === 'loading',
    refreshing,
    onRefresh,
    retry,
    setSelectedCoach,
    setRating,
    handleSubmitReview,
    toggleChip,
    goBack,
  } satisfies UseRateCoachResult;
}

export function formatCoachDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
