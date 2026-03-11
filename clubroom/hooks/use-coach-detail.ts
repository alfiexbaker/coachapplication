/**
 * Hook for the Coach Detail / Public Coach Profile screen (app/coach/[id].tsx).
 * Manages coach data, reviews, follow state, tabs, refresh.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { coachService, type Coach, type PublicReview } from '@/services/coach-service';
import { followService } from '@/services/follow-service';
import { blockService } from '@/services/block-service';
import { createLogger } from '@/utils/logger';
import { combineResults, err, ok, serviceError, type ServiceError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';
import {
  getCoachRelationshipDisplay,
  type CoachConnectionState,
} from '@/utils/coach-conversion';

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
  const [connectionState, setConnectionState] = useState<CoachConnectionState>('none');
  const [incomingRequestId, setIncomingRequestId] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const isOwnProfile = currentUser?.id === coachId;

  const loadConnectionState = useCallback(async () => {
    if (!coachId || !currentUser?.id || isOwnProfile) {
      setConnectionState('self');
      setIncomingRequestId(null);
      setIsBlocked(false);
      return;
    }

    const [isFriends, requestsForCoach, requestsForCurrent, blockedResult] = await Promise.all([
      followService.areFriends(currentUser.id, coachId),
      followService.getPendingRequests(coachId),
      followService.getPendingRequests(currentUser.id),
      blockService.isBlocked(currentUser.id, coachId),
    ]);
    setIsBlocked(blockedResult.success ? blockedResult.data : false);

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
      !isBlocked &&
      (connectionState === 'none' ||
        (connectionState === 'incoming_pending' && Boolean(incomingRequestId))),
    [connectionState, followLoading, incomingRequestId, isBlocked, isOwnProfile],
  );
  const followLabel = useMemo(() => {
    if (followLoading) return 'Updating...';
    return getCoachRelationshipDisplay(connectionState, { blocked: isBlocked }).relationshipLabel;
  }, [connectionState, followLoading, isBlocked]);
  const isFollowing = connectionState === 'friends';
  const relationshipDisplay = useMemo(
    () => getCoachRelationshipDisplay(connectionState, { blocked: isBlocked }),
    [connectionState, isBlocked],
  );

  useEffect(() => {
    void loadConnectionState().catch(() => {
      setConnectionState('none');
      setIncomingRequestId(null);
      setIsBlocked(false);
    });
  }, [loadConnectionState]);

  const handleFollow = useCallback(async () => {
    if (!coachId || !currentUser?.id || !canFollowAction || followLoading || isBlocked) return;

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
      uiFeedback.showToast('Please try again in a moment.', 'error');
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
  const handleBook = useCallback(() => {
    if (isBlocked) {
      uiFeedback.showToast('Booking is unavailable while this coach is blocked.', 'error');
      return;
    }
    router.push(Routes.bookCoach(coachId!));
  }, [coachId, isBlocked]);
  const handleMessage = useCallback(() => {
    if (isBlocked) {
      uiFeedback.showToast('Contact is unavailable while this coach is blocked.', 'error');
      return;
    }
    router.push(Routes.chat(`coach-${coachId}`));
  }, [coachId, isBlocked]);
  const handleRefresh = useCallback(() => {
    onRefresh();
    void loadConnectionState();
  }, [loadConnectionState, onRefresh]);

  const handleBlock = useCallback(async () => {
    if (!coachId || !currentUser?.id || isOwnProfile) return;

    const confirmed = await uiFeedback.confirm({
      title: `Block ${coach?.name || 'this coach'}?`,
      message: 'They will no longer be able to message you or appear in your discovery and booking surfaces where blocking is enforced.',
      confirmText: 'Block coach',
      cancelText: 'Cancel',
      destructive: true,
    });

    if (!confirmed) return;

    const result = await blockService.blockUser(currentUser.id, coachId);
    if (!result.success) {
      uiFeedback.showToast(result.error.message || 'Failed to block coach.', 'error');
      return;
    }

    uiFeedback.showToast(`${coach?.name || 'Coach'} has been blocked.`, 'success');
    router.back();
  }, [coach?.name, coachId, currentUser?.id, isOwnProfile]);

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
    isBlocked,
    relationshipDisplay,
    handleRefresh,
    handleFollow,
    handleBook,
    handleMessage,
    handleBlock,
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
    isBlocked: boolean;
    relationshipDisplay: ReturnType<typeof getCoachRelationshipDisplay>;
    handleRefresh: () => void;
    handleFollow: () => Promise<void>;
    handleBook: () => void;
    handleMessage: () => void;
    handleBlock: () => Promise<void>;
  };
}
