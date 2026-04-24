/**
 * Coach Detail / Public Coach Profile
 *
 * Viewable by anyone — bio, reviews, sessions, booking CTA.
 * All state/logic in useCoachDetail hook. Tabs extracted into sub-components.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Row } from '@/components/primitives/row';
import { CoachDetailHero } from '@/components/coach/coach-detail-hero';
import { CoachDetailAbout } from '@/components/coach/coach-detail-about';
import { CoachDetailReviews } from '@/components/coach/coach-detail-reviews';
import { CoachDetailSessions } from '@/components/coach/coach-detail-sessions';
import {
  LoadingState,
  ErrorState,
  EmptyState,
  SectionSkeleton,
  SubmitProgressState,
} from '@/components/ui/screen-states';
import { RetainedTabPanels } from '@/components/ui/retained-tab-panels';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useCoachDetail, COACH_TABS } from '@/hooks/use-coach-detail';

export default function CoachProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const p = useCoachDetail(id);
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

  if (p.showLoadingState) {
    return renderStateShell(<LoadingState variant="detail" />);
  }

  if (p.status === 'error') {
    return renderStateShell(
      <ErrorState
        message={p.error?.message ?? 'Failed to load coach profile.'}
        onRetry={p.retry}
      />,
    );
  }

  if (p.status === 'empty' || !p.coach) {
    return renderStateShell(
      <View style={styles.centered}>
        <EmptyState
          icon="person-circle-outline"
          title="Coach not found"
          message="This coach profile is unavailable."
          actionLabel="Go back"
          onPressAction={() => router.back()}
        />
      </View>,
    );
  }

  const showPendingPaneSkeleton = p.showSectionSkeleton && !p.hasRequestedTruthfulFrame;

  return renderMainShell(
    <>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={p.refreshing}
            onRefresh={p.handleRefresh}
            tintColor={palette.tint}
          />
        }
      >
        <CoachDetailHero
          coach={p.coach}
          isOwnProfile={p.isOwnProfile}
          isFollowing={p.isFollowing}
          followLabel={p.followLabel}
          canFollowAction={p.canFollowAction}
          followLoading={p.followLoading}
          followIconName={p.relationshipDisplay.relationshipIcon as keyof typeof Ionicons.glyphMap}
          contactLabel={p.relationshipDisplay.contactLabel}
          profileSummary={p.relationshipDisplay.profileSummary}
          offeringSummary={p.offeringSummary}
          isBlocked={p.isBlocked}
          onFollow={p.handleFollow}
          onMessage={p.handleMessage}
        />

        {!p.isOwnProfile ? (
          <View style={styles.profileActions}>
            <View
              style={[
                styles.businessCard,
                {
                  backgroundColor: withAlpha(palette.tint, 0.05),
                  borderColor: withAlpha(palette.tint, 0.14),
                },
              ]}
            >
              <ThemedText style={styles.businessTitle}>Why people book here</ThemedText>
              <ThemedText style={[styles.businessBody, { color: palette.muted }]}>
                {p.relationshipDisplay.contactDetail}
              </ThemedText>
              <Row style={styles.valueRow}>
                {(p.coach.footballFocuses ?? []).slice(0, 3).map((focus) => (
                  <View
                    key={focus}
                    style={[
                      styles.valuePill,
                      { backgroundColor: withAlpha(palette.tint, 0.08) },
                    ]}
                  >
                    <ThemedText style={[styles.valuePillText, { color: palette.tint }]}>
                      {focus}
                    </ThemedText>
                  </View>
                ))}
              </Row>
            </View>
            <Button onPress={() => void p.handleBlock()} variant="outline">
              Block Coach
            </Button>
          </View>
        ) : null}

        {/* Tabs */}
        <Row style={[styles.tabBar, { borderBottomColor: palette.border }]}>
          {COACH_TABS.map((tab) => (
            <Clickable
              key={tab.id}
              onPress={() => p.setActiveTab(tab.id)}
              style={
                [
                  styles.tab,
                  p.activeTab === tab.id
                    ? { borderBottomColor: palette.tint, borderBottomWidth: 2 }
                    : undefined,
                ].filter(Boolean) as ViewStyle[]
              }
            >
              <Row align="center" justify="center" gap="xxs">
                <Ionicons
                  name={tab.icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={p.activeTab === tab.id ? palette.tint : palette.muted}
                />
                <ThemedText
                  style={{
                    color: p.activeTab === tab.id ? palette.tint : palette.muted,
                    fontWeight: p.activeTab === tab.id ? '600' : '400',
                  }}
                >
                  {tab.label}
                </ThemedText>
              </Row>
            </Clickable>
          ))}
        </Row>

        {p.refreshing ? (
          <SubmitProgressState label="Refreshing coach" style={styles.pendingState} />
        ) : null}

        {/* Tab Content */}
        <View style={styles.tabContentContainer}>
          {showPendingPaneSkeleton ? (
            <SectionSkeleton variant={p.activeTab === 'sessions' ? 'schedule' : 'tab-pane'} />
          ) : (
            <RetainedTabPanels
              activeTab={p.activeTab}
              panels={[
                {
                  id: 'about',
                  content: <CoachDetailAbout coach={p.coach} />,
                },
                {
                  id: 'reviews',
                  content: <CoachDetailReviews coach={p.coach} reviews={p.reviews} />,
                },
                {
                  id: 'sessions',
                  content: (
                    <CoachDetailSessions
                      coach={p.coach}
                      sessionOfferings={p.sessionOfferings}
                      offeringSummary={p.offeringSummary}
                      onBook={p.handleBook}
                      onOfferingPress={p.handleOfferingPress}
                    />
                  ),
                },
              ]}
            />
          )}
        </View>
      </ScrollView>

      {/* Fixed Book Footer */}
      {!p.isOwnProfile && (
        <Row
          style={[
            styles.fixedFooter,
            { backgroundColor: palette.background, borderTopColor: palette.border },
          ]}
        >
          <View style={styles.footerPrice}>
            <ThemedText style={{ color: palette.muted, ...Typography.caption }}>From</ThemedText>
            <ThemedText type="title" style={{ color: palette.tint }}>
              £{p.coach.minPrice}
            </ThemedText>
          </View>
          <Button onPress={p.handleBook} style={{ flex: 1 }} disabled={p.isBlocked}>
            Book Session
          </Button>
        </Row>
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
  scroll: {
    flex: 1,
  },
  profileActions: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  businessCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  businessTitle: {
    ...Typography.bodySemiBold,
  },
  businessBody: {
    ...Typography.bodySmall,
  },
  valueRow: {
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  valuePill: {
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
  },
  valuePillText: {
    ...Typography.caption,
  },
  tabBar: { borderBottomWidth: 1, marginTop: Spacing.md },
  tab: { flex: 1, paddingVertical: Spacing.md },
  pendingState: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  tabContentContainer: { paddingBottom: Spacing.lg, paddingTop: Spacing.sm },
  fixedFooter: {
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  footerPrice: { alignItems: 'center' },
});
