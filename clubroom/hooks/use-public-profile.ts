/**
 * Hook for the Public Coach Profile screen.
 * Manages coach data loading, reviews, tab state, and navigation handlers.
 */

import { useState } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { coachService, type Coach, type PublicReview } from '@/services/coach-service';
import { apiClient } from '@/services/api-client';
import { listPublicCoachOfferingsFromApi } from '@/services/coach-offering-api';
import { Components } from '@/constants/theme';
import type { Ionicons } from '@expo/vector-icons';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { combineResults, err, ok, serviceError, type ServiceError } from '@/types/result';
import { createLogger } from '@/utils/logger';
import { useAuth } from '@/hooks/use-auth';
import { blockService } from '@/services/block-service';
import { uiFeedback } from '@/services/ui-feedback';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { SessionOffering } from '@/constants/types';
import {
  getCoachProfileOfferings,
  summarizeCoachOfferings,
} from '@/utils/coach-profile-offerings';
import type { ScreenPendingState } from '@/hooks/use-screen-core';

const logger = createLogger('PublicProfileScreen');

export type ProfileTabId = 'about' | 'specialties' | 'qualifications' | 'reviews';

export interface ProfileTabDef {
  id: ProfileTabId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const PROFILE_TABS: ProfileTabDef[] = [
  { id: 'about', label: 'About', icon: 'person-outline' },
  { id: 'specialties', label: 'Specialties', icon: 'football-outline' },
  { id: 'qualifications', label: 'Qualifications', icon: 'ribbon-outline' },
  { id: 'reviews', label: 'Reviews', icon: 'star-outline' },
];

export interface SessionType {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string;
  isTrialAvailable?: boolean;
  trialPrice?: number;
}

export const MOCK_SESSION_TYPES: SessionType[] = [
  {
    id: 'st-1',
    name: '1-on-1 Session',
    duration: 60,
    price: 45,
    description: "Personalised coaching tailored to your child's needs",
  },
  {
    id: 'st-2',
    name: 'Small Group (2-4)',
    duration: 60,
    price: 30,
    description: 'Train with peers in a small focused group',
    isTrialAvailable: true,
    trialPrice: 15,
  },
  {
    id: 'st-3',
    name: 'Assessment Session',
    duration: 45,
    price: 35,
    description: 'Full skills assessment with written report',
  },
];

export function renderStars(rating: number, starColor: string) {
  const stars: { name: 'star' | 'star-half' | 'star-outline'; color: string }[] = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push({ name: 'star', color: starColor });
    } else if (i === fullStars && hasHalf) {
      stars.push({ name: 'star-half', color: starColor });
    } else {
      stars.push({ name: 'star-outline', color: starColor });
    }
  }
  return stars;
}

export const COVER_HEIGHT = 200;
export const AVATAR_SIZE = Components.avatar.xl + 16; // 96

interface PublicProfileData {
  coach: Coach | null;
  reviews: PublicReview[];
  sessionOfferings: SessionOffering[];
}

export function usePublicProfile(coachId: string) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTabId>('about');
  const [showShareSheet, setShowShareSheet] = useState(false);

  const loadProfile = async () => {
    if (!coachId) {
      return ok<PublicProfileData>({
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
        return ok<PublicProfileData>({
          coach: null,
          reviews: [],
          sessionOfferings: [],
        });
      }

      const combined = combineResults([coachResult, reviewsResult, offeringsResult] as const);
      if (!combined.success) {
        logger.error('Failed to load public profile', combined.error);
        return err(combined.error);
      }

      const [coach, reviews, sessionOfferings] = combined.data;
      return ok<PublicProfileData>({
        coach,
        reviews,
        sessionOfferings,
      });
    } catch (loadError) {
      logger.error('Failed to load public profile', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load public profile.', loadError));
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
  } = useScreen<PublicProfileData>({
    load: loadProfile,
    deps: [coachId],
    isEmpty: (value) => value.coach === null,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: coachId || null,
  });

  const coach = data?.coach ?? null;
  const reviews = data?.reviews ?? [];
  const sessionOfferings = data?.sessionOfferings ?? [];
  const offeringSummary = summarizeCoachOfferings(sessionOfferings);
  const blockedStatus = useScreen<boolean>({
    load: async () => {
      if (!coachId || !currentUser?.id) {
        return ok(false);
      }
      return blockService.isBlocked(currentUser.id, coachId);
    },
    deps: [coachId, currentUser?.id],
    isEmpty: () => false,
  });
  const isBlocked = blockedStatus.data ?? false;

  const handleBook = () => {
    if (isBlocked) {
      uiFeedback.showToast('Booking is unavailable while this coach is blocked.', 'error');
      return;
    }
    router.push(Routes.bookCoach(coachId));
  };
  const handleOfferingPress = (offering: SessionOffering) => {
    if (isBlocked) {
      uiFeedback.showToast('Booking is unavailable while this coach is blocked.', 'error');
      return;
    }
    router.push(
      Routes.bookCoach(coachId, {
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

  const openShareSheet = () => setShowShareSheet(true);
  const closeShareSheet = () => setShowShareSheet(false);

  const profileUrl = `https://clubroom.app/coach/${coachId}`;

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
    showShareSheet,
    openShareSheet,
    closeShareSheet,
    handleRefresh: onRefresh,
    handleBook,
    handleOfferingPress,
    handleMessage,
    profileUrl,
    isBlocked,
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
    activeTab: ProfileTabId;
    setActiveTab: (tab: ProfileTabId) => void;
    showShareSheet: boolean;
    openShareSheet: () => void;
    closeShareSheet: () => void;
    handleRefresh: () => void;
    handleBook: () => void;
    handleOfferingPress: (offering: SessionOffering) => void;
    handleMessage: () => void;
    profileUrl: string;
    isBlocked: boolean;
  };
}
