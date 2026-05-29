/**
 * Hook for the Coach Detail / Public Coach Profile screen (app/coach/[id].tsx).
 * Manages coach data, reviews, connection state, tabs, and refresh.
 */

import { useState, useEffect, startTransition } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { coachService, type Coach, type PublicReview } from '@/services/coach-service';
import { apiClient } from '@/services/api-client';
import { listPublicCoachOfferingsFromApi } from '@/services/coach-offering-api';
import { followService } from '@/services/follow-service';
import { blockService } from '@/services/block-service';
import { createLogger } from '@/utils/logger';
import { combineResults, err, ok, serviceError, type ServiceError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';
import { getCoachRelationshipDisplay, type CoachConnectionState } from '@/utils/coach-conversion';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { SessionOffering } from '@/constants/types';
import { getCoachProfileOfferings, summarizeCoachOfferings } from '@/utils/coach-profile-offerings';
import type { ScreenPendingState } from '@/hooks/use-screen-core';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('CoachProfileScreen');

export type CoachTabId = 'about' | 'reviews' | 'sessions';

export const COACH_TABS: { id: CoachTabId; label: string; icon: string }[] = [
  { id: 'about', label: 'About', icon: 'person-outline' },
  { id: 'reviews', label: 'Reviews', icon: 'star-outline' },
  { id: 'sessions', label: 'Sessions', icon: 'calendar-outline' },
];

export const COVER_HEIGHT = 180;

interface CoachDetailData {
  coach: Coach | null;
  reviews: PublicReview[];
  sessionOfferings: SessionOffering[];
}

interface CoachConnectionSnapshot {
  connectionState: CoachConnectionState;
  incomingRequestId: string | null;
  isBlocked: boolean;
}

async function getCoachConnectionSnapshot(
  currentUserId: string | undefined,
  coachId: string | undefined,
  isOwnProfile: boolean,
): Promise<CoachConnectionSnapshot> {
  if (!coachId || !currentUserId || isOwnProfile) {
    return {
      connectionState: 'self',
      incomingRequestId: null,
      isBlocked: false,
    };
  }

  const [isFriends, requestsForCoach, requestsForCurrent, blockedResult] = await Promise.all([
    followService.areFriends(currentUserId, coachId),
    followService.getPendingRequests(coachId),
    followService.getPendingRequests(currentUserId),
    blockService.isBlocked(currentUserId, coachId),
  ]);
  const isBlocked = blockedResult.success ? blockedResult.data : false;

  if (isFriends) {
    return {
      connectionState: 'connected',
      incomingRequestId: null,
      isBlocked,
    };
  }

  const incomingRequest = requestsForCurrent.find((request) => request.requesterId === coachId);
  if (incomingRequest) {
    return {
      connectionState: 'incoming_pending',
      incomingRequestId: incomingRequest.id,
      isBlocked,
    };
  }

  const hasOutgoingRequest = requestsForCoach.some(
    (request) => request.requesterId === currentUserId,
  );
  if (hasOutgoingRequest) {
    return {
      connectionState: 'outgoing_pending',
      incomingRequestId: null,
      isBlocked,
    };
  }

  return {
    connectionState: 'none',
    incomingRequestId: null,
    isBlocked,
  };
}

function applyCoachConnectionSnapshot(
  snapshot: CoachConnectionSnapshot,
  setConnectionState: (state: CoachConnectionState) => void,
  setIncomingRequestId: (requestId: string | null) => void,
  setIsBlocked: (isBlocked: boolean) => void,
) {
  setConnectionState(snapshot.connectionState);
  setIncomingRequestId(snapshot.incomingRequestId);
  setIsBlocked(snapshot.isBlocked);
}

export function useCoachDetail(coachId: string | undefined) {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<CoachTabId>('about');
  const [connectionState, setConnectionState] = useState<CoachConnectionState>('none');
  const [incomingRequestId, setIncomingRequestId] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const currentUserId = currentUser?.id;
  const isOwnProfile = currentUser?.id === coachId;

  const loadCoach = async () => {
    if (!coachId) {
      return ok<CoachDetailData>({
        coach: null,
        reviews: [],
        sessionOfferings: [],
      });
    }

    try {
      const offeringsResultPromise = apiClient.isMockMode
        ? apiClient
            .get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, [])
            .then((offerings) => ok(getCoachProfileOfferings(offerings, coachId)))
        : listPublicCoachOfferingsFromApi(coachId, new Date().toISOString()).then((result) =>
            result.success ? ok(getCoachProfileOfferings(result.data, coachId)) : result,
          );

      const [coachResult, reviewsResult, offeringsResult] = await Promise.all([
        coachService.getCoach(coachId),
        coachService.getCoachReviews(coachId),
        offeringsResultPromise,
      ]);

      if (!coachResult.success && coachResult.error.code === 'NOT_FOUND') {
        return ok<CoachDetailData>({
          coach: null,
          reviews: [],
          sessionOfferings: [],
        });
      }

      const combined = combineResults([coachResult, reviewsResult, offeringsResult] as const);
      if (!combined.success) {
        logger.error('Failed to load coach detail', combined.error);
        return err(combined.error);
      }

      const [coach, reviews, sessionOfferings] = combined.data;
      return ok<CoachDetailData>({
        coach,
        reviews,
        sessionOfferings,
      });
    } catch (loadError) {
      logger.error('Failed to load coach detail', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load coach profile.', loadError));
    }
  };

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    pendingState,
    showLoadingState,
    showSectionSkeleton,
    hasTruthfulFrame,
    hasRequestedTruthfulFrame,
  } = useScreen<CoachDetailData>({
    load: loadCoach,
    deps: [coachId],
    isEmpty: (value) => value.coach === null,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: coachId ?? null,
  });

  const coach = data?.coach ?? null;
  const reviews = data?.reviews ?? [];
  const sessionOfferings = data?.sessionOfferings ?? [];
  const offeringSummary = summarizeCoachOfferings(sessionOfferings);
  const canFollowAction =
    !followLoading &&
    !isOwnProfile &&
    !isBlocked &&
    (connectionState === 'none' ||
      (connectionState === 'incoming_pending' && Boolean(incomingRequestId)));
  const followLabel = (() => {
    if (followLoading) return 'Updating...';
    return getCoachRelationshipDisplay(connectionState, { blocked: isBlocked }).relationshipLabel;
  })();
  const isFollowing = connectionState === 'connected';
  const relationshipDisplay = getCoachRelationshipDisplay(connectionState, { blocked: isBlocked });

  useEffect(() => {
    startTransition(() => {
      void getCoachConnectionSnapshot(currentUserId, coachId, isOwnProfile)
        .then((snapshot) => {
          applyCoachConnectionSnapshot(
            snapshot,
            setConnectionState,
            setIncomingRequestId,
            setIsBlocked,
          );
        })
        .catch(() => {
          applyCoachConnectionSnapshot(
            { connectionState: 'none', incomingRequestId: null, isBlocked: false },
            setConnectionState,
            setIncomingRequestId,
            setIsBlocked,
          );
        });
    });
  }, [currentUserId, coachId, isOwnProfile]);

  const handleFollow = async () => {
    if (!coachId || !currentUser?.id || !canFollowAction || followLoading || isBlocked) return;

    setFollowLoading(true);

    return await runAsyncTryCatchFinally(
      async () => {
        if (connectionState === 'incoming_pending' && incomingRequestId) {
          await followService.respondToRequest(incomingRequestId, 'ACCEPTED');
        } else if (connectionState === 'none') {
          await followService.sendFollowRequest({
            requesterId: currentUser.id,
            requesterName:
              currentUser.fullName || currentUser.name || currentUser.username || 'User',
            targetId: coachId,
            targetName: coach?.name || 'Coach',
          });
        } else {
          return;
        }

        const snapshot = await getCoachConnectionSnapshot(currentUser.id, coachId, isOwnProfile);
        applyCoachConnectionSnapshot(
          snapshot,
          setConnectionState,
          setIncomingRequestId,
          setIsBlocked,
        );
      },
      async (error) => {
        uiFeedback.showToast('Please try again in a moment.', 'error');
      },
      () => {
        setFollowLoading(false);
      },
    );
  };
  const handleBook = () => {
    if (isBlocked) {
      uiFeedback.showToast('Booking is unavailable while this coach is blocked.', 'error');
      return;
    }
    router.push(Routes.bookCoach(coachId!));
  };
  const handleOfferingPress = (offering: SessionOffering) => {
    if (isBlocked) {
      uiFeedback.showToast('Booking is unavailable while this coach is blocked.', 'error');
      return;
    }
    router.push(
      Routes.bookCoach(coachId!, {
        offeringId: offering.id,
        source: offering.source === 'event' ? 'event_profile' : 'coach_profile',
      }),
    );
  };
  const handleMessage = () => {
    if (isBlocked) {
      uiFeedback.showToast('Contact is unavailable while this coach is blocked.', 'error');
      return;
    }
    router.push(Routes.chat(`coach-${coachId}`));
  };
  const handleRefresh = () => {
    onRefresh();
    void getCoachConnectionSnapshot(currentUserId, coachId, isOwnProfile).then((snapshot) => {
      applyCoachConnectionSnapshot(
        snapshot,
        setConnectionState,
        setIncomingRequestId,
        setIsBlocked,
      );
    });
  };

  const handleBlock = async () => {
    if (!coachId || !currentUser?.id || isOwnProfile) return;

    const confirmed = await uiFeedback.confirm({
      title: `Block ${coach?.name || 'this coach'}?`,
      message:
        'They will no longer be able to message you or appear in your discovery and booking surfaces where blocking is enforced.',
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
  };

  return {
    coach,
    reviews,
    sessionOfferings,
    offeringSummary,
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    pendingState,
    showLoadingState,
    showSectionSkeleton,
    hasTruthfulFrame,
    hasRequestedTruthfulFrame,
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
    handleOfferingPress,
    handleMessage,
    handleBlock,
  } satisfies {
    coach: Coach | null;
    reviews: PublicReview[];
    sessionOfferings: SessionOffering[];
    offeringSummary: ReturnType<typeof summarizeCoachOfferings>;
    loading: boolean;
    status: ScreenStatus;
    error: ServiceError | null;
    refreshing: boolean;
    onRefresh: () => void;
    retry: () => void;
    pendingState: ScreenPendingState;
    showLoadingState: boolean;
    showSectionSkeleton: boolean;
    hasTruthfulFrame: boolean;
    hasRequestedTruthfulFrame: boolean;
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
    handleOfferingPress: (offering: SessionOffering) => void;
    handleMessage: () => void;
    handleBlock: () => Promise<void>;
  };
}
