import { useState, useEffect, useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Alert } from 'react-native';

import { apiClient } from '@/services/api-client';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { Colors, Spacing } from '@/constants/theme';
import { coachProfiles } from '@/constants/mock-data';
import type { SessionOffering } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { SessionDetailModal } from '@/components/sessions/session-detail-modal';
import { followService } from '@/services/follow-service';
import { createLogger } from '@/utils/logger';

import { ErrorBoundary } from '@/components/error-boundary';
import { ProfileHeader } from '@/components/coach/profile-header';
import { ProfileTabBar, ProfileTabContent, type TabType } from '@/components/coach/profile-tabs';
import { ProfileQuickActions } from '@/components/coach/profile-quick-actions';
import { ProfilePostCard } from '@/components/coach/profile-post-card';

const logger = createLogger('CoachProfile');

export default function CoachProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser, logout } = useAuth();

  const coach = coachProfiles[0];

  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [sessionOfferings, setSessionOfferings] = useState<SessionOffering[]>([]);
  const [selectedOffering, setSelectedOffering] = useState<SessionOffering | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Following state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  // Go-Live state
  const [isLive, setIsLive] = useState(currentUser?.isLive ?? false);
  const [liveLoading, setLiveLoading] = useState(false);

  const isOwnProfile = currentUser?.role === 'COACH' && currentUser?.id === coach?.id;

  // ── Follow data ──
  useEffect(() => {
    const loadFollowData = async () => {
      if (!currentUser || !coach) return;
      try {
        const [following, count] = await Promise.all([
          followService.isFollowing(currentUser.id, coach.id),
          followService.getFollowerCount(coach.id),
        ]);
        setIsFollowing(following);
        setFollowerCount(count);
      } catch (error) {
        logger.error('Failed to load follow data:', error);
      }
    };
    loadFollowData();
  }, [currentUser, coach]);

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

  // ── Profile completion ──
  const getProfileCompletion = () => {
    const checks = [
      { label: 'Profile photo', done: !!coach?.profilePhotoUrl, icon: 'camera' },
      { label: 'Bio written', done: !!(coach?.bio || coach?.shortBio), icon: 'document-text' },
      { label: 'Hourly rate set', done: !!(coach?.sessionRate && coach.sessionRate > 0), icon: 'cash' },
      { label: 'At least 1 certification', done: !!(coach?.certifications && coach.certifications.length > 0), icon: 'ribbon' },
      { label: 'Availability set', done: true, icon: 'calendar' },
    ];
    const completed = checks.filter((c) => c.done).length;
    return { checks, completed, total: checks.length, percentage: Math.round((completed / checks.length) * 100) };
  };

  const profileCompletion = getProfileCompletion();
  const canGoLive = profileCompletion.percentage >= 80;

  const handleGoLiveToggle = async (value: boolean) => {
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
  };

  // ── Session offerings ──
  useEffect(() => {
    const loadSessionOfferings = async () => {
      try {
        const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
        setSessionOfferings(offerings.filter((o) => o.coachId === coach.id && o.status === 'active'));
      } catch (error) {
        logger.error('Failed to load session offerings', error);
      }
    };
    loadSessionOfferings();
  }, [coach.id]);

  // ── Post card renderer ──
  const renderPostCard = useCallback(
    (post: { id: string; content: string; createdAt: string; likes: number; comments: number; mediaUrls?: string[]; mediaType?: string }) => (
      <ProfilePostCard post={post} coachName={coach.fullName} coachAvatar={coach.profilePhotoUrl} />
    ),
    [coach.fullName, coach.profilePhotoUrl],
  );

  const handleSignOut = useCallback(async () => {
    await logout();
    router.replace(Routes.ROOT);
  }, [logout]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScreenHeader title="Coach Profile" subtitle="Your coaching identity" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Go-Live + Quick Access (coach only) */}
        {currentUser?.role === 'COACH' && (
          <ProfileQuickActions
            isLive={isLive}
            liveLoading={liveLoading}
            completionPercentage={profileCompletion.percentage}
            canGoLive={canGoLive}
            completionChecks={profileCompletion.checks}
            onGoLiveToggle={handleGoLiveToggle}
            onSignOut={handleSignOut}
          />
        )}

        {/* Header: cover photo, avatar, stats, follow */}
        <ErrorBoundary>
          <ProfileHeader
            coach={coach}
            followerCount={followerCount}
            isFollowing={isFollowing}
            followLoading={followLoading}
            isOwnProfile={isOwnProfile}
            userRole={currentUser?.role}
            isLoggedIn={!!currentUser}
            onFollowToggle={handleFollowToggle}
          />
        </ErrorBoundary>

        {/* Tab bar */}
        <ProfileTabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab content */}
        <ErrorBoundary>
          <ProfileTabContent
            activeTab={activeTab}
            coach={coach}
            sessionOfferings={sessionOfferings}
            userRole={currentUser?.role}
            onOfferingPress={(offering) => {
              setSelectedOffering(offering);
              setShowDetailModal(true);
            }}
            renderPostCard={renderPostCard}
          />
        </ErrorBoundary>

        {/* Session Detail Modal */}
        <SessionDetailModal
          visible={showDetailModal}
          offering={selectedOffering}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedOffering(null);
          }}
          onUpdate={async () => {
            const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
            setSessionOfferings(offerings.filter((o) => o.coachId === coach.id && o.status === 'active'));
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
