/**
 * Hook for the Rate Coach screen.
 * Manages coach list, selection, rating form, and review submission.
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { apiClient } from '@/services/api-client';
import { useAuth } from '@/hooks/use-auth';
import type { Booking } from '@/constants/app-types';
import type { SessionOffering } from '@/constants/session-types';
import { createLogger } from '@/utils/logger';
import { getSessionOfferingCoachName } from '@/utils/session-display';

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

export function useRateCoach() {
  const { currentUser } = useAuth();

  const [coaches, setCoaches] = useState<CoachToRate[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<CoachToRate | null>(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadCoaches = useCallback(async () => {
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

      if (coachMap.size === 0) {
        coachMap.set('demo-coach-1', {
          id: 'demo-coach-1', name: 'Coach Sarah', photoUrl: 'https://i.pravatar.cc/100?u=sarah',
          sessionCount: 5, lastSession: new Date(Date.now() - 86400000 * 3).toISOString(), hasReview: false,
        });
        coachMap.set('demo-coach-2', {
          id: 'demo-coach-2', name: 'Coach Mike', photoUrl: 'https://i.pravatar.cc/100?u=mike',
          sessionCount: 3, lastSession: new Date(Date.now() - 86400000 * 7).toISOString(), hasReview: false,
        });
      }

      setCoaches(Array.from(coachMap.values()).sort((a, b) =>
        new Date(b.lastSession || 0).getTime() - new Date(a.lastSession || 0).getTime()
      ));
    } catch (error) {
      logger.error('Failed to load coaches', error);
    }
  }, [currentUser?.id]);

  useFocusEffect(useCallback(() => { loadCoaches(); }, [loadCoaches]));

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
    coaches, selectedCoach, rating, reviewText, submitting,
    setSelectedCoach, setRating, handleSubmitReview, toggleChip, goBack,
  };
}

export function formatCoachDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
