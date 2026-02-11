/**
 * Hook for the Coach Detail / Public Coach Profile screen (app/coach/[id].tsx).
 * Manages coach data, reviews, follow state, tabs, refresh.
 */

import { useState, useCallback } from 'react';
import { Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { coachService, type Coach, type PublicReview } from '@/services/coach-service';
import { createLogger } from '@/utils/logger';
import { combineResults, err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('CoachProfileScreen');

export type CoachTabId = 'about' | 'reviews' | 'sessions';

export const COACH_TABS: { id: CoachTabId; label: string; icon: string }[] = [
  { id: 'about', label: 'About', icon: 'person-outline' },
  { id: 'reviews', label: 'Reviews', icon: 'star-outline' },
  { id: 'sessions', label: 'Sessions', icon: 'calendar-outline' },
];

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const COVER_HEIGHT = 180;

interface CoachDetailData {
  coach: Coach | null;
  reviews: PublicReview[];
}

export function useCoachDetail(coachId: string | undefined) {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<CoachTabId>('about');
  const [isFollowing, setIsFollowing] = useState(false);

  const isOwnProfile = currentUser?.id === coachId;

  const loadCoach = useCallback(async () => {
    if (!coachId) {
      return ok<CoachDetailData>({
        coach: null,
        reviews: [],
      });
    }

    try {
      const [coachResult, reviewsResult] = await Promise.all([
        coachService.getCoach(coachId),
        coachService.getCoachReviews(coachId),
      ]);

      if (!coachResult.success && coachResult.error.code === 'NOT_FOUND') {
        return ok<CoachDetailData>({
          coach: null,
          reviews: [],
        });
      }

      const combined = combineResults([coachResult, reviewsResult] as const);
      if (!combined.success) {
        logger.error('Failed to load coach detail', combined.error);
        return err(combined.error);
      }

      const [coach, reviews] = combined.data;
      return ok<CoachDetailData>({ coach, reviews });
    } catch (loadError) {
      logger.error('Failed to load coach detail', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load coach profile.', loadError));
    }
  }, [coachId]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<CoachDetailData>({
    load: loadCoach,
    deps: [coachId],
    isEmpty: (value) => value.coach === null,
    refetchOnFocus: true,
  });

  const coach = data?.coach ?? null;
  const reviews = data?.reviews ?? [];

  const handleFollow = useCallback(() => setIsFollowing((f) => !f), []);
  const handleBook = useCallback(() => router.push(Routes.bookCoach(coachId!)), [coachId]);
  const handleMessage = useCallback(() => router.push(Routes.chat(`coach-${coachId}`)), [coachId]);

  return {
    coach,
    reviews,
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    activeTab,
    setActiveTab,
    isFollowing,
    isOwnProfile,
    handleRefresh: onRefresh,
    handleFollow,
    handleBook,
    handleMessage,
  } satisfies {
    coach: Coach | null;
    reviews: PublicReview[];
    loading: boolean;
    status: ScreenStatus;
    error: ServiceError | null;
    refreshing: boolean;
    onRefresh: () => void;
    retry: () => void;
    activeTab: CoachTabId;
    setActiveTab: (tab: CoachTabId) => void;
    isFollowing: boolean;
    isOwnProfile: boolean;
    handleRefresh: () => void;
    handleFollow: () => void;
    handleBook: () => void;
    handleMessage: () => void;
  };
}
