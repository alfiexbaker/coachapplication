/**
 * Coach Profile Screen — coach identity, updates, sessions, and public network signals.
 *
 * State + logic: hooks/use-coach-profile.ts
 * Sub-components: components/coach/profile-*.tsx (pre-existing)
 */

import { useState, useCallback } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/error-boundary';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { ProfileHeader } from '@/components/coach/profile-header';
import { ProfileTabBar, ProfileTabContent, type TabType } from '@/components/coach/profile-tabs';
import { ProfileQuickActions } from '@/components/coach/profile-quick-actions';
import { ProfilePostCard } from '@/components/coach/profile-post-card';
import { SessionDetailModal } from '@/components/sessions/session-detail-modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
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
    handleSignOut,
  } = useCoachProfile();

  const renderPostCard = useCallback(
    (post: NormalizedPost) => (
      <ProfilePostCard
        post={post}
        coachName={coach.fullName}
        coachAvatar={coach.profilePhotoUrl}
        contextLabel={post.clubName}
      />
    ),
    [coach.fullName, coach.profilePhotoUrl],
  );

  const handleCloseModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedOffering(null);
  }, [setShowDetailModal, setSelectedOffering]);

  const renderShell = useCallback(
    (children: ReactNode) => (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <ScreenHeader title="Coach Profile" />
        {children}
      </SafeAreaView>
    ),
    [palette.background],
  );

  // ── Loading state ──
  if (profileLoading) {
    return renderShell(<LoadingState variant="detail" />);
  }

  // ── Error state ──
  if (profileError) {
    return renderShell(<ErrorState message={profileError} onRetry={loadProfileData} />);
  }

  if (!currentUser) {
    return renderShell(
      <EmptyState
        icon="person-outline"
        title="Sign in required"
        message="Please sign in to view and manage your coach profile."
      />,
    );
  }

  // ── Success state ──
  return renderShell(
    <>
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
    </>,
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
