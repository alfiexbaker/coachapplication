/**
 * useCoachProfile — State + data loading for the Coach Profile screen.
 *
 * Manages profile data, following state, feed posts, session offerings,
 * go-live toggle, and profile completion checks.
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import { apiClient } from '@/services/api-client';
import { followService } from '@/services/follow-service';
import { socialFeedService } from '@/services/social-feed-service';
import { coachProfiles } from '@/constants/mock-data';
import type { SessionOffering, ClubFeedPost, CoachProfile } from '@/constants/types';
import { useAuth } from '@/hooks/use-auth';
import { Routes } from '@/navigation/routes';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CoachProfile');

export interface NormalizedPost {
  id: string;
  content: string;
  createdAt: string;
  likes: number;
  comments: number;
  mediaUrls?: string[];
  mediaType?: string;
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
  renderPostCard: (post: NormalizedPost) => { post: NormalizedPost; coachName: string; coachAvatar: string };
}

function normalizePost(post: ClubFeedPost): NormalizedPost {
  return {
    id: post.id,
    content: post.body,
    createdAt: post.createdAt,
    likes: post.reactionCount ?? 0,
    comments: post.commentCount ?? 0,
    mediaUrls: post.imageUrl ? [post.imageUrl] : undefined,
    mediaType: post.imageUrl ? 'photo' : undefined,
  };
}

function getProfileCompletion(coach: CoachProfile | undefined): ProfileCompletion {
  const checks: ProfileCompletionCheck[] = [
    { label: 'Profile photo', done: !!coach?.profilePhotoUrl, icon: 'camera' },
    { label: 'Bio written', done: !!(coach?.bio || coach?.shortBio), icon: 'document-text' },
    { label: 'Hourly rate set', done: !!(coach?.sessionRate && coach.sessionRate > 0), icon: 'cash' },
    { label: 'At least 1 certification', done: !!(coach?.certifications && coach.certifications.length > 0), icon: 'ribbon' },
    { label: 'Availability set', done: true, icon: 'calendar' },
  ];
  const completed = checks.filter((c) => c.done).length;
  return { checks, completed, total: checks.length, percentage: Math.round((completed / checks.length) * 100) };
}

export function useCoachProfile(): UseCoachProfileResult {
  const { currentUser, logout } = useAuth();
  const coach = coachProfiles[0];

  // Loading and error state
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Following state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  // Feed posts state
  const [feedPosts, setFeedPosts] = useState<NormalizedPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  // Session offerings
  const [sessionOfferings, setSessionOfferings] = useState<SessionOffering[]>([]);
  const [selectedOffering, setSelectedOffering] = useState<SessionOffering | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Go-Live state
  const [isLive, setIsLive] = useState(currentUser?.isLive ?? false);
  const [liveLoading, setLiveLoading] = useState(false);

  const isOwnProfile = currentUser?.role === 'COACH' && currentUser?.id === coach?.id;
  const profileCompletion = getProfileCompletion(coach);
  const canGoLive = profileCompletion.percentage >= 80;

  // ── Load all profile data ──
  const loadProfileData = useCallback(async () => {
    setProfileError(null);
    setProfileLoading(true);
    try {
      const results = await Promise.allSettled([
        (async () => {
          if (!currentUser || !coach) return;
          const [following, count] = await Promise.all([
            followService.isFollowing(currentUser.id, coach.id),
            followService.getFollowerCount(coach.id),
          ]);
          setIsFollowing(following);
          setFollowerCount(count);
        })(),
        (async () => {
          const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
          setSessionOfferings(offerings.filter((o) => o.coachId === coach.id && o.status === 'active'));
        })(),
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
  }, [currentUser, coach]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  // ── Load feed posts ──
  const loadFeedPosts = useCallback(() => {
    if (!coach) return;
    setFeedLoading(true);
    try {
      const posts = socialFeedService.getPersonalFeed(coach.id);
      setFeedPosts(posts.map(normalizePost));
    } catch (error) {
      logger.error('Failed to load feed posts', error);
    } finally {
      setFeedLoading(false);
    }
  }, [coach]);

  useEffect(() => {
    loadFeedPosts();
  }, [loadFeedPosts]);

  // ── Follow toggle ──
  const handleFollowToggle = useCallback(async () => {
    if (!currentUser || !coach || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await followService.unfollow(currentUser.id, coach.id);
        setIsFollowing(false);
        setFollowerCount((prev) => Math.max(0, prev - 1));
      } else {
        await followService.follow({
          followerId: currentUser.id,
          followerName: currentUser.name || currentUser.fullName || 'User',
          followerType: currentUser.role === 'COACH' ? 'COACH' : 'USER',
          followingId: coach.id,
          followingName: coach.fullName,
          followingType: 'COACH',
          followingAvatar: coach.profilePhotoUrl,
        });
        setIsFollowing(true);
        setFollowerCount((prev) => prev + 1);
      }
    } catch (error) {
      logger.error('Failed to toggle follow:', error);
    } finally {
      setFollowLoading(false);
    }
  }, [currentUser, coach, isFollowing, followLoading]);

  // ── Go-Live toggle ──
  const handleGoLiveToggle = useCallback(async (value: boolean) => {
    if (!canGoLive && value) {
      Alert.alert('Complete Your Profile', 'You need to complete at least 80% of your profile before going live.', [{ text: 'OK' }]);
      return;
    }
    setLiveLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsLive(value);
      if (value) {
        Alert.alert("You're Live!", 'Athletes can now discover and book sessions with you.', [{ text: 'Great!' }]);
      }
    } catch (error) {
      logger.error('Failed to update live status:', error);
      Alert.alert('Error', 'Failed to update your status. Please try again.');
    } finally {
      setLiveLoading(false);
    }
  }, [canGoLive]);

  // ── Offering press ──
  const handleOfferingPress = useCallback((offering: SessionOffering) => {
    setSelectedOffering(offering);
    setShowDetailModal(true);
  }, []);

  // ── Refresh offerings ──
  const refreshOfferings = useCallback(async () => {
    const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
    setSessionOfferings(offerings.filter((o) => o.coachId === coach.id && o.status === 'active'));
  }, [coach]);

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
      coachName: coach.fullName,
      coachAvatar: coach.profilePhotoUrl,
    }),
    [coach.fullName, coach.profilePhotoUrl]
  );

  return {
    coach,
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
