/**
 * Coach Profile Screen — Coach's identity, posts, sessions, followers.
 *
 * State + logic: hooks/use-coach-profile.ts
 * Sub-components: components/coach/profile-*.tsx (pre-existing)
 */

import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/error-boundary';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { ProfileHeader } from '@/components/coach/profile-header';
import { ProfileTabBar, ProfileTabContent, type TabType } from '@/components/coach/profile-tabs';
import { ProfileQuickActions } from '@/components/coach/profile-quick-actions';
import { ProfilePostCard } from '@/components/coach/profile-post-card';
import { SessionDetailModal } from '@/components/sessions/session-detail-modal';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { useCoachProfile, type NormalizedPost } from '@/hooks/use-coach-profile';
import { useTheme } from '@/hooks/useTheme';

export default function CoachProfileScreen() {
  const { colors: palette } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('posts');

  const {
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
  } = useCoachProfile();

  const renderPostCard = useCallback(
    (post: NormalizedPost) => (
      <ProfilePostCard
        post={post}
        coachName={coach.fullName}
        coachAvatar={coach.profilePhotoUrl}
      />
    ),
    [coach.fullName, coach.profilePhotoUrl]
  );

  const handleCloseModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedOffering(null);
  }, [setShowDetailModal, setSelectedOffering]);

  // ── Loading state ──
  if (profileLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
        <ScreenHeader title="Coach Profile" subtitle="Your coaching identity" />
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  // ── Error state ──
  if (profileError) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
        <ScreenHeader title="Coach Profile" subtitle="Your coaching identity" />
        <ErrorState message={profileError} onRetry={loadProfileData} />
      </SafeAreaView>
    );
  }

  // ── Success state ──
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScreenHeader title="Coach Profile" subtitle="Your coaching identity" />
      <ScrollView showsVerticalScrollIndicator={false}>
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

        <ProfileTabBar activeTab={activeTab} onTabChange={setActiveTab} />

        <ErrorBoundary>
          <ProfileTabContent
            activeTab={activeTab}
            coach={coach}
            sessionOfferings={sessionOfferings}
            userRole={currentUser?.role}
            feedPosts={feedPosts}
            feedLoading={feedLoading}
            onComposePress={handleComposePress}
            onOfferingPress={handleOfferingPress}
            renderPostCard={renderPostCard}
          />
        </ErrorBoundary>

        <SessionDetailModal
          visible={showDetailModal}
          offering={selectedOffering}
          onClose={handleCloseModal}
          onUpdate={refreshOfferings}
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
