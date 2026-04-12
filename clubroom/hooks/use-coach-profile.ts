/**
 * useCoachProfile — State + data loading for the Coach Profile screen.
 *
 * Manages profile data, connection state, profile updates, session offerings,
 * go-live toggle, and profile completion checks.
 */

import { useState, useEffect, useCallback } from 'react';

import { router } from 'expo-router';

import { authService } from '@/services/auth-service';
import { apiFetch, apiClient } from '@/services/api-client';
import { followService } from '@/services/follow-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { socialFeedService, type AggregatedFeedPost } from '@/services/social-feed-service';
import { discoverService } from '@/services/discover-service';
import type { SessionOffering, ClubFeedPost, CoachProfile } from '@/constants/types';
import { useAuth } from '@/hooks/use-auth';
import { Routes } from '@/navigation/routes';
import { createLogger } from '@/utils/logger';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('CoachProfile');

interface ApiCoachOffering {
  id: string;
  coachUserId: string;
  title: string;
  description?: string;
  serviceType?: string;
  capacity?: number;
  defaultLocation?: string;
  durationMinutes?: number;
  priceMinor?: number;
  active?: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface ApiCoachOfferingsResponse {
  offerings: ApiCoachOffering[];
}

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
  handleComposePress: () => void;
  handleSignOut: () => Promise<void>;
  renderPostCard: (post: NormalizedPost) => {
    post: NormalizedPost;
    coachName: string;
    coachAvatar: string;
  };
}

function normalizePost(post: ClubFeedPost & { clubName?: string; clubBadge?: string }): NormalizedPost {
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

function mapApiCoachOfferingToSessionOffering(
  offering: ApiCoachOffering,
  coachId: string,
  scheduledAt: string,
): SessionOffering {
  return {
    id: offering.id,
    source: 'direct',
    sourceEntityId: offering.id,
    coachId,
    title: offering.title,
    description: offering.description,
    sessionType: offering.serviceType === 'group' ? 'group' : '1on1',
    maxParticipants: Math.max(1, offering.capacity ?? 1),
    location: offering.defaultLocation || 'Location confirmed after booking',
    scheduledAt,
    isRecurring: false,
    recurrenceType: 'none',
    status: offering.active === false ? 'cancelled' : 'active',
    registrations: [],
    createdAt: offering.createdAt,
    updatedAt: offering.updatedAt,
    duration: offering.durationMinutes ?? 60,
    price: typeof offering.priceMinor === 'number' ? offering.priceMinor / 100 : undefined,
  };
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
  const [isLive, setIsLive] = useState(currentUser?.isLive ?? false);
  const [liveLoading, setLiveLoading] = useState(false);

  const resolvedCoach = coach ?? buildFallbackCoach(currentUser);
  const isOwnProfile = currentUser?.role === 'COACH' && currentUser?.id === resolvedCoach.id;
  const profileCompletion = getProfileCompletion(resolvedCoach);
  const canGoLive = profileCompletion.percentage >= 80;

  const loadCoachOfferings = useCallback(
    async (activeCoach: CoachProfile) => {
      if (apiClient.isMockMode) {
        const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
        setSessionOfferings(
          offerings.filter((offering) => offering.coachId === activeCoach.id && offering.status === 'active'),
        );
        return;
      }

      const result = await apiFetch<ApiCoachOfferingsResponse>('/v1/coaches/me/offerings', {
        method: 'GET',
      });
      if (!result.success) {
        throw new Error(result.error.message);
      }

      const scheduledAt = activeCoach.nextAvailability || new Date().toISOString();
      setSessionOfferings(
        result.data.offerings
          .filter((offering) => offering.active !== false)
          .map((offering) => mapApiCoachOfferingToSessionOffering(offering, activeCoach.id, scheduledAt)),
      );
    },
    [],
  );

  // ── Load all profile data ──
  const loadProfileData = useCallback(async () => {
    setProfileError(null);
    setProfileLoading(true);
    try {
      let activeCoach = buildFallbackCoach(currentUser);
      const coachesResult = await discoverService.getAllCoaches();
      if (coachesResult.success && coachesResult.data.length > 0) {
        activeCoach =
          coachesResult.data.find((candidate) => candidate.id === currentUser?.id) ??
          activeCoach;
      }
      setCoach(activeCoach);

      const results = await Promise.allSettled([
        (async () => {
          if (!currentUser) return;
          const [following, count] = await Promise.all([
            followService.isFollowing(currentUser.id, activeCoach.id),
            followService.getFollowerCount(activeCoach.id),
          ]);
          setIsFollowing(following);
          setFollowerCount(count);
        })(),
        loadCoachOfferings(activeCoach),
      ]);
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        setProfileError('Some profile data failed to load.');
      }
    } catch (error) {
      setProfileError('Failed to load profile data. Please try again.');
      logger.error('Failed to load profile data:', error);
    } finally {
      setProfileLoading(false);
    }
  }, [currentUser, loadCoachOfferings]);

  useEffect(() => {
    setIsLive(currentUser?.isLive ?? false);
  }, [currentUser?.isLive]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  // ── Load profile updates ──
  const loadFeedPosts = useCallback(() => {
    setFeedLoading(true);
    try {
      const posts = socialFeedService.getFollowingFeed([resolvedCoach.id], 'all') as AggregatedFeedPost[];
      setFeedPosts(posts.map(normalizePost));
    } catch (error) {
      logger.error('Failed to load feed posts', error);
    } finally {
      setFeedLoading(false);
    }
  }, [resolvedCoach.id]);

  useEffect(() => {
    loadFeedPosts();
  }, [loadFeedPosts]);

  useEffect(() => {
    const unsub = onTyped(ServiceEvents.COACH_POST_CREATED, ({ coachId }) => {
      if (coachId === resolvedCoach.id) {
        loadFeedPosts();
      }
    });
    return unsub;
  }, [loadFeedPosts, resolvedCoach.id]);

  // ── Connection toggle ──
  const handleFollowToggle = useCallback(async () => {
    if (!currentUser || followLoading) return;
    setFollowLoading(true);
    try {
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
    } catch (error) {
      logger.error('Failed to toggle follow:', error);
    } finally {
      setFollowLoading(false);
    }
  }, [currentUser, isFollowing, followLoading, resolvedCoach]);

  // ── Go-Live toggle ──
  const handleGoLiveToggle = useCallback(
    async (value: boolean) => {
      if (!canGoLive && value) {
        uiFeedback.showToast(
          'You need to complete at least 80% of your profile before going live.',
        );
        return;
      }
      setLiveLoading(true);
      try {
        const result = await authService.updateProfile({ isLive: value });
        if (!result.success) {
          throw new Error(result.error.message);
        }
        setIsLive(result.data.user.isLive ?? value);
        if (value) {
          uiFeedback.showToast('Athletes can now discover and book sessions with you.', 'success');
        } else {
          uiFeedback.showToast('Your profile is now offline.', 'success');
        }
      } catch (error) {
        logger.error('Failed to update live status:', error);
        uiFeedback.showToast('Failed to update your status. Please try again.', 'error');
      } finally {
        setLiveLoading(false);
      }
    },
    [canGoLive],
  );

  // ── Offering press ──
  const handleOfferingPress = useCallback((offering: SessionOffering) => {
    setSelectedOffering(offering);
    setShowDetailModal(true);
  }, []);

  // ── Refresh offerings ──
  const refreshOfferings = useCallback(async () => {
    await loadCoachOfferings(resolvedCoach);
  }, [loadCoachOfferings, resolvedCoach]);

  // ── Navigation handlers ──
  const handleComposePress = useCallback(() => {
    router.push(Routes.MODAL_CREATE_POST);
  }, []);

  const handleSignOut = useCallback(async () => {
    await logout();
    router.replace(Routes.ROOT);
  }, [logout]);

  // ── Post card data ──
  const renderPostCard = useCallback(
    (post: NormalizedPost) => ({
      post,
      coachName: resolvedCoach.fullName,
      coachAvatar: resolvedCoach.profilePhotoUrl,
    }),
    [resolvedCoach.fullName, resolvedCoach.profilePhotoUrl],
  );

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
    handleComposePress,
    handleSignOut,
    renderPostCard,
  };
}
