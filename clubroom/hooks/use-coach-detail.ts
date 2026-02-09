/**
 * Hook for the Coach Detail / Public Coach Profile screen (app/coach/[id].tsx).
 * Manages coach data, reviews, follow state, tabs, refresh.
 */

import { useState, useCallback, useEffect } from 'react';
import { Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { coachService, type Coach, type PublicReview } from '@/services/coach-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CoachProfileScreen');

export type CoachTabId = 'about' | 'reviews' | 'sessions';

export const COACH_TABS: { id: CoachTabId; label: string; icon: string }[] = [
  { id: 'about', label: 'About', icon: 'person-outline' },
  { id: 'reviews', label: 'Reviews', icon: 'star-outline' },
  { id: 'sessions', label: 'Sessions', icon: 'calendar-outline' },
];

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const COVER_HEIGHT = 180;

export function useCoachDetail(coachId: string | undefined) {
  const { currentUser } = useAuth();

  const [coach, setCoach] = useState<Coach | null>(null);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<CoachTabId>('about');
  const [isFollowing, setIsFollowing] = useState(false);

  const isOwnProfile = currentUser?.id === coachId;

  const loadCoach = useCallback(async () => {
    if (!coachId) return;
    try {
      const data = await coachService.getCoach(coachId);
      setCoach(data);
      const reviewData = await coachService.getCoachReviews(coachId);
      setReviews(reviewData);
    } catch (error) {
      logger.error('Failed to load coach:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [coachId]);

  useEffect(() => { loadCoach(); }, [loadCoach]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadCoach();
  }, [loadCoach]);

  const handleFollow = useCallback(() => setIsFollowing((f) => !f), []);
  const handleBook = useCallback(() => router.push(Routes.bookCoach(coachId!)), [coachId]);
  const handleMessage = useCallback(() => router.push(Routes.chat(`coach-${coachId}`)), [coachId]);

  return {
    coach, reviews, loading, refreshing, activeTab, setActiveTab,
    isFollowing, isOwnProfile,
    handleRefresh, handleFollow, handleBook, handleMessage,
  };
}
