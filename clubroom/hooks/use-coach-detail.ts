/**
 * Hook for the Coach Detail / Public Coach Profile screen (app/coach/[id].tsx).
 * Manages coach data, reviews, follow state, tabs, refresh.
 */

import { Alert } from 'react-native';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { coachService, type Coach, type PublicReview } from '@/services/coach-service';
import { followService } from '@/services/follow-service';
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

type CoachConnectionState = 'self' | 'none' | 'outgoing_pending' | 'incoming_pending' | 'friends';

export function useCoachDetail(coachId: string | undefined) {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<CoachTabId>('about');
  const [connectionState, setConnectionState] = useState<CoachConnectionState>('none');
  const [incomingRequestId, setIncomingRequestId] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = currentUser?.id === coachId;

  const loadConnectionState = useCallback(async () => {
    if (!coachId || !currentUser?.id || isOwnProfile) {
      setConnectionState('self');
      setIncomingRequestId(null);
      return;
    }

    const [isFriends, requestsForCoach, requestsForCurrent] = await Promise.all([
      followService.areFriends(currentUser.id, coachId),
      followService.getPendingRequests(coachId),
      followService.getPendingRequests(currentUser.id),
    ]);

    if (isFriends) {
      setConnectionState('friends');
      setIncomingRequestId(null);
      return;
    }

    const incomingRequest = requestsForCurrent.find((request) => request.requesterId === coachId);
    if (incomingRequest) {
      setConnectionState('incoming_pending');
      setIncomingRequestId(incomingRequest.id);
      return;
    }

    const hasOutgoingRequest = requestsForCoach.some(
      (request) => request.requesterId === currentUser.id,
    );
    if (hasOutgoingRequest) {
      setConnectionState('outgoing_pending');
      setIncomingRequestId(null);
      return;
    }

    setConnectionState('none');
    setIncomingRequestId(null);
  }, [coachId, currentUser?.id, isOwnProfile]);

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
  const canFollowAction = useMemo(
    () =>
      !followLoading &&
      !isOwnProfile &&
      (connectionState === 'none' ||
        (connectionState === 'incoming_pending' && Boolean(incomingRequestId))),
    [connectionState, followLoading, incomingRequestId, isOwnProfile],
  );
  const followLabel = useMemo(() => {
    if (followLoading) return 'Updating...';
    if (connectionState === 'friends') return 'Friends';
    if (connectionState === 'outgoing_pending') return 'Request Sent';
    if (connectionState === 'incoming_pending') return 'Accept Request';
    return 'Add Friend';
  }, [connectionState, followLoading]);
  const isFollowing = connectionState === 'friends';

  useEffect(() => {
    void loadConnectionState().catch(() => {
      setConnectionState('none');
      setIncomingRequestId(null);
    });
  }, [loadConnectionState]);

  const handleFollow = useCallback(async () => {
    if (!coachId || !currentUser?.id || !canFollowAction || followLoading) return;

    setFollowLoading(true);
    try {
      if (connectionState === 'incoming_pending' && incomingRequestId) {
        await followService.respondToRequest(incomingRequestId, 'ACCEPTED');
      } else if (connectionState === 'none') {
        await followService.sendFollowRequest({
          requesterId: currentUser.id,
          requesterName: currentUser.fullName || currentUser.name || currentUser.username || 'User',
          targetId: coachId,
          targetName: coach?.name || 'Coach',
        });
      } else {
        return;
      }

      await loadConnectionState();
    } catch {
      Alert.alert('Unable to update request', 'Please try again in a moment.');
    } finally {
      setFollowLoading(false);
    }
  }, [
    canFollowAction,
    coach?.name,
    coachId,
    connectionState,
    currentUser?.fullName,
    currentUser?.id,
    currentUser?.name,
    currentUser?.username,
    followLoading,
    incomingRequestId,
    loadConnectionState,
  ]);
  const handleBook = useCallback(() => router.push(Routes.bookCoach(coachId!)), [coachId]);
  const handleMessage = useCallback(() => router.push(Routes.chat(`coach-${coachId}`)), [coachId]);
  const handleRefresh = useCallback(() => {
    onRefresh();
    void loadConnectionState();
  }, [loadConnectionState, onRefresh]);

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
    followLabel,
    canFollowAction,
    followLoading,
    isOwnProfile,
    handleRefresh,
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
    followLabel: string;
    canFollowAction: boolean;
    followLoading: boolean;
    isOwnProfile: boolean;
    handleRefresh: () => void;
    handleFollow: () => Promise<void>;
    handleBook: () => void;
    handleMessage: () => void;
  };
}
