/**
 * useCoachProfile — State + data loading for the Coach Profile screen.
 *
 * Manages profile data, connection state, profile updates, session offerings,
 * go-live toggle, and profile completion checks.
 */

import { useState, useEffect } from 'react';

import { router } from 'expo-router';

import { authService } from '@/services/auth-service';
import { apiClient } from '@/services/api-client';
import { listSelfCoachOfferingsFromApi } from '@/services/coach-offering-api';
import { followService } from '@/services/follow-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { socialFeedService, type AggregatedFeedPost } from '@/services/social-feed-service';
import { discoverService } from '@/services/discover-service';
import type { SessionOffering, ClubFeedPost, CoachProfile } from '@/constants/types';
import { useAuth } from '@/hooks/use-auth';
import { Routes } from '@/navigation/routes';
import { createLogger } from '@/utils/logger';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally, runSyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('CoachProfile');

export interface NormalizedPost {
  id: string;
  content: string;
  createdAt: string;
  likes: number;
  comments: number;
  mediaUrls?: string[];
  mediaType?: string;
  clubName?: string;
  clubBadge?: string;
}

export interface ProfileCompletionCheck {
  label: string;
  done: boolean;
  icon: string;
}

export interface ProfileCompletion {
  checks: ProfileCompletionCheck[];
  completed: number;
  total: number;
  percentage: number;
}

export interface UseCoachProfileResult {
  // Core data
  coach: CoachProfile;
  currentUser: ReturnType<typeof useAuth>['currentUser'];
  isOwnProfile: boolean;

  // Loading / error
  profileLoading: boolean;
  profileError: string | null;
  loadProfileData: () => Promise<void>;

  // Following
  isFollowing: boolean;
  followerCount: number;
  followLoading: boolean;
  handleFollowToggle: () => Promise<void>;

  // Feed
  feedPosts: NormalizedPost[];
  feedLoading: boolean;

  // Session offerings
  sessionOfferings: SessionOffering[];
  selectedOffering: SessionOffering | null;
  showDetailModal: boolean;
  setSelectedOffering: (offering: SessionOffering | null) => void;
  setShowDetailModal: (show: boolean) => void;
  handleOfferingPress: (offering: SessionOffering) => void;
  refreshOfferings: () => Promise<void>;

  // Go-Live
  isLive: boolean;
  liveLoading: boolean;
  canGoLive: boolean;
  profileCompletion: ProfileCompletion;
  handleGoLiveToggle: (value: boolean) => Promise<void>;

  // Actions
  handleSignOut: () => Promise<void>;
  renderPostCard: (post: NormalizedPost) => {
    post: NormalizedPost;
    coachName: string;
    coachAvatar: string;
  };
}

type CurrentUser = ReturnType<typeof useAuth>['currentUser'];

function normalizePost(
  post: ClubFeedPost & { clubName?: string; clubBadge?: string },
): NormalizedPost {
  return {
    id: post.id,
    content: post.body,
    createdAt: post.createdAt,
    likes: post.reactionCount ?? 0,
    comments: post.commentCount ?? 0,
    mediaUrls: post.imageUrl ? [post.imageUrl] : undefined,
    mediaType: post.imageUrl ? 'photo' : undefined,
    clubName: post.clubName,
    clubBadge: post.clubBadge,
  };
}

function getProfileCompletion(coach: CoachProfile | undefined): ProfileCompletion {
  const checks: ProfileCompletionCheck[] = [
    { label: 'Profile photo', done: !!coach?.profilePhotoUrl, icon: 'camera' },
    { label: 'Bio written', done: !!(coach?.bio || coach?.shortBio), icon: 'document-text' },
    {
      label: 'Hourly rate set',
      done: !!(coach?.sessionRate && coach.sessionRate > 0),
      icon: 'cash',
    },
    {
      label: 'At least 1 certification',
      done: !!(coach?.certifications && coach.certifications.length > 0),
      icon: 'ribbon',
    },
    { label: 'Availability set', done: true, icon: 'calendar' },
  ];
  const completed = checks.filter((c) => c.done).length;
  return {
    checks,
    completed,
    total: checks.length,
    percentage: Math.round((completed / checks.length) * 100),
  };
}

function buildFallbackCoach(currentUser: ReturnType<typeof useAuth>['currentUser']): CoachProfile {
  const coachName = currentUser?.fullName || currentUser?.name || 'Coach';

  return {
    id: currentUser?.id || 'coach-fallback',
    fullName: coachName,
    primarySport: 'Football',
    sports: ['Football'],
    city: 'London',
    state: 'England',
    distanceMiles: 0,
    rating: { average: 4.5, reviewCount: 0 },
    priceRange: { min: 50, max: 50, unitLabel: 'per session' },
    sessionRate: 50,
    nextAvailability: new Date().toISOString(),
    badges: [],
    sessionFormats: ['In-person'],
    shortBio: '',
    profilePhotoUrl: '',
    coverPhotoUrl: '',
    footballFocuses: ['Dribbling'],
    location: { lat: 51.5074, lng: -0.1278 },
    joinedDate: new Date().toISOString(),
    totalSessions: 0,
    experiences: [],
    certifications: [],
    posts: [],
    photoGallery: [],
    videoGallery: [],
    languages: [],
    achievements: [],
  };
}

async function loadCoachOfferingsIntoState(
  activeCoach: CoachProfile,
  setSessionOfferings: (offerings: SessionOffering[]) => void,
) {
  if (apiClient.isMockMode) {
    const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
    setSessionOfferings(
      offerings.filter(
        (offering) => offering.coachId === activeCoach.id && offering.status === 'active',
      ),
    );
    return;
  }

  const scheduledAt = activeCoach.nextAvailability || new Date().toISOString();
  const result = await listSelfCoachOfferingsFromApi(activeCoach.id, scheduledAt);
  if (!result.success) {
    throw new Error(result.error.message);
  }

  setSessionOfferings(result.data);
}

async function loadCoachProfileDataIntoState(
  currentUser: CurrentUser,
  targets: {
    setCoach: (coach: CoachProfile) => void;
    setIsFollowing: (value: boolean) => void;
    setFollowerCount: (value: number) => void;
    setProfileError: (value: string | null) => void;
    setProfileLoading: (value: boolean) => void;
    setSessionOfferings: (offerings: SessionOffering[]) => void;
  },
) {
  targets.setProfileError(null);
  targets.setProfileLoading(true);

  await runAsyncTryCatchFinally(
    async () => {
      let activeCoach = buildFallbackCoach(currentUser);
      const coachesResult = await discoverService.getAllCoaches();
      if (coachesResult.success && coachesResult.data.length > 0) {
        activeCoach =
          coachesResult.data.find((candidate) => candidate.id === currentUser?.id) ?? activeCoach;
      }
      targets.setCoach(activeCoach);

      const results = await Promise.allSettled([
        (async () => {
          if (!currentUser) return;
          const [following, count] = await Promise.all([
            followService.isFollowing(currentUser.id, activeCoach.id),
            followService.getFollowerCount(activeCoach.id),
          ]);
          targets.setIsFollowing(following);
          targets.setFollowerCount(count);
        })(),
        loadCoachOfferingsIntoState(activeCoach, targets.setSessionOfferings),
      ]);
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        targets.setProfileError('Some profile data failed to load.');
      }
    },
    async (error) => {
      targets.setProfileError('Failed to load profile data. Please try again.');
      logger.error('Failed to load profile data:', error);
    },
    () => {
      targets.setProfileLoading(false);
    },
  );
}

function loadCoachFeedPostsIntoState(
  coachId: string,
  targets: {
    setFeedLoading: (value: boolean) => void;
    setFeedPosts: (posts: NormalizedPost[]) => void;
  },
) {
  targets.setFeedLoading(true);
  runSyncTryCatchFinally(
    () => {
      const posts = socialFeedService.getFollowingFeed([coachId], 'all') as AggregatedFeedPost[];
      targets.setFeedPosts(posts.map(normalizePost));
    },
    (error) => {
      logger.error('Failed to load feed posts', error);
    },
    () => {
      targets.setFeedLoading(false);
    },
  );
}

export function useCoachProfile(): UseCoachProfileResult {
  const { currentUser, logout } = useAuth();
  const [coach, setCoach] = useState<CoachProfile | null>(null);

  // Loading and error state
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Connection state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  // Profile updates state
  const [feedPosts, setFeedPosts] = useState<NormalizedPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  // Session offerings
  const [sessionOfferings, setSessionOfferings] = useState<SessionOffering[]>([]);
  const [selectedOffering, setSelectedOffering] = useState<SessionOffering | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Go-Live state
  const [localLiveState, setLocalLiveState] = useState<{
    userId: string | undefined;
    value: boolean;
  } | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);

  const resolvedCoach = coach ?? buildFallbackCoach(currentUser);
  const isOwnProfile = currentUser?.role === 'COACH' && currentUser?.id === resolvedCoach.id;
  const profileCompletion = getProfileCompletion(resolvedCoach);
  const canGoLive = profileCompletion.percentage >= 80;
  const hasLocalLiveState = Boolean(localLiveState && localLiveState.userId === currentUser?.id);
  const isLive = hasLocalLiveState ? localLiveState!.value : (currentUser?.isLive ?? false);

  // ── Load all profile data ──
  const loadProfileData = async () =>
    loadCoachProfileDataIntoState(currentUser, {
      setCoach,
      setIsFollowing,
      setFollowerCount,
      setProfileError,
      setProfileLoading,
      setSessionOfferings,
    });

  useEffect(() => {
    void loadCoachProfileDataIntoState(currentUser, {
      setCoach,
      setIsFollowing,
      setFollowerCount,
      setProfileError,
      setProfileLoading,
      setSessionOfferings,
    });
  }, [currentUser]);

  // ── Load profile updates ──
  const loadFeedPosts = () =>
    loadCoachFeedPostsIntoState(resolvedCoach.id, {
      setFeedLoading,
      setFeedPosts,
    });

  useEffect(() => {
    loadCoachFeedPostsIntoState(resolvedCoach.id, {
      setFeedLoading,
      setFeedPosts,
    });
  }, [resolvedCoach.id]);

  useEffect(() => {
    const unsub = onTyped(ServiceEvents.COACH_POST_CREATED, ({ coachId }) => {
      if (coachId === resolvedCoach.id) {
        loadCoachFeedPostsIntoState(resolvedCoach.id, {
          setFeedLoading,
          setFeedPosts,
        });
      }
    });
    return unsub;
  }, [resolvedCoach.id]);

  // ── Connection toggle ──
  const handleFollowToggle = async () => {
    if (!currentUser || followLoading) return;
    setFollowLoading(true);

    await runAsyncTryCatchFinally(
      async () => {
        if (isFollowing) {
          await followService.unfollow(currentUser.id, resolvedCoach.id);
          setIsFollowing(false);
          setFollowerCount((prev) => Math.max(0, prev - 1));
        } else {
          await followService.follow({
            followerId: currentUser.id,
            followerName: currentUser.name || currentUser.fullName || 'User',
            followerType: currentUser.role === 'COACH' ? 'COACH' : 'USER',
            followingId: resolvedCoach.id,
            followingName: resolvedCoach.fullName,
            followingType: 'COACH',
          });
          setIsFollowing(true);
          setFollowerCount((prev) => prev + 1);
        }
      },
      async (error) => {
        logger.error('Failed to toggle follow:', error);
      },
      () => {
        setFollowLoading(false);
      },
    );
  };

  // ── Go-Live toggle ──
  const handleGoLiveToggle = async (value: boolean) => {
    if (!currentUser?.id) return;
    if (!canGoLive && value) {
      uiFeedback.showToast('You need to complete at least 80% of your profile before going live.');
      return;
    }
    setLiveLoading(true);

    await runAsyncTryCatchFinally(
      async () => {
        const result = await authService.updateProfile({ isLive: value });
        if (!result.success) {
          throw new Error(result.error.message);
        }
        setLocalLiveState({
          userId: currentUser.id,
          value: result.data.user.isLive ?? value,
        });
        if (value) {
          uiFeedback.showToast('Athletes can now discover and book sessions with you.', 'success');
        } else {
          uiFeedback.showToast('Your profile is now offline.', 'success');
        }
      },
      async (error) => {
        logger.error('Failed to update live status:', error);
        uiFeedback.showToast('Failed to update your status. Please try again.', 'error');
      },
      () => {
        setLiveLoading(false);
      },
    );
  };

  // ── Offering press ──
  const handleOfferingPress = (offering: SessionOffering) => {
    setSelectedOffering(offering);
    setShowDetailModal(true);
  };

  // ── Refresh offerings ──
  const refreshOfferings = async () => {
    await loadCoachOfferingsIntoState(resolvedCoach, setSessionOfferings);
  };

  const handleSignOut = async () => {
    await logout();
    router.replace(Routes.ROOT);
  };

  // ── Post card data ──
  const renderPostCard = (post: NormalizedPost) => ({
    post,
    coachName: resolvedCoach.fullName,
    coachAvatar: resolvedCoach.profilePhotoUrl,
  });

  return {
    coach: resolvedCoach,
    currentUser,
    isOwnProfile,
    profileLoading,
    profileError,
    loadProfileData,
    isFollowing,
    followerCount,
    followLoading,
    handleFollowToggle,
    feedPosts,
    feedLoading,
    sessionOfferings,
    selectedOffering,
    showDetailModal,
    setSelectedOffering,
    setShowDetailModal,
    handleOfferingPress,
    refreshOfferings,
    isLive,
    liveLoading,
    canGoLive,
    profileCompletion,
    handleGoLiveToggle,
    handleSignOut,
    renderPostCard,
  };
}
