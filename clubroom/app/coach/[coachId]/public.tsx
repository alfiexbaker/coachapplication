/**
 * Public Coach Profile Screen
 *
 * Read-only profile with cover photo, avatar, tabs (About/Specialties/Qualifications/Reviews).
 * All state/logic in usePublicProfile hook. Sections in components/coach/public-profile-*.tsx.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ViewStyle, TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ShareProfile } from '@/components/coach/share-profile';
import { PublicProfileHero } from '@/components/coach/public-profile-hero';
import { PublicProfileAbout } from '@/components/coach/public-profile-about';
import { PublicProfileSpecialties } from '@/components/coach/public-profile-specialties';
import { PublicProfileCredentials } from '@/components/coach/public-profile-credentials';
import { PublicProfileReviews } from '@/components/coach/public-profile-reviews';
import {
  LoadingState,
  ErrorState,
  EmptyState,
  SectionSkeleton,
  SubmitProgressState,
} from '@/components/ui/screen-states';
import { RetainedTabPanels } from '@/components/ui/retained-tab-panels';
import { Spacing, Components, Typography } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { usePublicProfile, PROFILE_TABS } from '@/hooks/use-public-profile';

export default function PublicCoachProfileScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const profile = usePublicProfile(coachId);
  const renderStateShell = (content: ReactNode) => (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      {content}
    </SafeAreaView>
  );
  const renderMainShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      {content}
    </SafeAreaView>
  );

  if (profile.showLoadingState) {
    return renderStateShell(<LoadingState variant="detail" />);
  }

  if (profile.status === 'error') {
    return renderStateShell(
      <ErrorState
        message={profile.error?.message ?? 'Failed to load coach profile.'}
        onRetry={profile.retry}
      />,
    );
  }

  if (profile.status === 'empty' || !profile.coach) {
    return renderStateShell(
      <View style={styles.centered}>
        <EmptyState
          icon="person-circle-outline"
          title="Coach not found"
          message="This profile is unavailable or may have been removed."
          actionLabel="Go back"
          onPressAction={() => router.back()}
        />
      </View>,
    );
  }

  const showPendingPaneSkeleton =
    profile.showSectionSkeleton && !profile.hasRequestedTruthfulFrame;

  return renderMainShell(
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={profile.refreshing}
            onRefresh={profile.onRefresh}
            tintColor={palette.tint}
          />
        }
      >
        <PublicProfileHero
          coach={profile.coach}
          onShare={profile.openShareSheet}
          onBook={profile.handleBook}
          onMessage={profile.handleMessage}
          offeringSummary={profile.offeringSummary}
          isBlocked={profile.isBlocked}
        />

        {/* Tab Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
          style={[styles.tabBar, { borderBottomColor: palette.border }]}
        >
          {PROFILE_TABS.map((tab) => {
            const isActive = profile.activeTab === tab.id;
            return (
              <Clickable
                key={tab.id}
                onPress={() => profile.setActiveTab(tab.id)}
                style={
                  [
                    styles.tab,
                    isActive && { borderBottomColor: palette.tint, borderBottomWidth: 2 },
                  ].filter(Boolean) as ViewStyle[]
                }
              >
                <Row align="center" gap={Spacing.xs / 2}>
                  <Ionicons
                    name={tab.icon}
                    size={Components.icon.md}
                    color={isActive ? palette.tint : palette.muted}
                  />
                  <ThemedText
                    style={
                      [
                        Typography.small,
                        { color: isActive ? palette.tint : palette.muted },
                        isActive && { fontWeight: '600' },
                      ].filter(Boolean) as TextStyle[]
                    }
                  >
                    {tab.label}
                  </ThemedText>
                </Row>
              </Clickable>
            );
          })}
        </ScrollView>

        {/* Tab Content */}
        {profile.refreshing ? (
          <SubmitProgressState label="Refreshing profile" style={styles.pendingState} />
        ) : null}

        <View style={styles.tabContentContainer}>
          {showPendingPaneSkeleton ? (
            <SectionSkeleton
              variant={
                profile.activeTab === 'reviews' ? 'list' : profile.activeTab === 'about' ? 'schedule' : 'tab-pane'
              }
            />
          ) : (
            <RetainedTabPanels
              activeTab={profile.activeTab}
              panels={[
                {
                  id: 'about',
                  content: (
                    <PublicProfileAbout
                      coach={profile.coach}
                      sessionOfferings={profile.sessionOfferings}
                      offeringSummary={profile.offeringSummary}
                      onOfferingPress={profile.handleOfferingPress}
                      onBook={profile.handleBook}
                    />
                  ),
                },
                {
                  id: 'specialties',
                  content: <PublicProfileSpecialties coach={profile.coach} />,
                },
                {
                  id: 'qualifications',
                  content: <PublicProfileCredentials coach={profile.coach} />,
                },
                {
                  id: 'reviews',
                  content: <PublicProfileReviews coach={profile.coach} reviews={profile.reviews} />,
                },
              ]}
            />
          )}
        </View>
      </ScrollView>

      {profile.showShareSheet && (
        <ShareProfile
          coachId={coachId!}
          coachName={profile.coach.name}
          profileUrl={profile.profileUrl}
          onClose={profile.closeShareSheet}
        />
      )}
    </>,
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  tabBar: { borderBottomWidth: 1, marginTop: Spacing.md },
  tabBarContent: { paddingHorizontal: Spacing.sm },
  tab: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm },
  pendingState: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  tabContentContainer: { paddingBottom: Spacing['3xl'] },
});
