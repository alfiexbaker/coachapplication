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

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Row } from '@/components/primitives/row';
import { CoachDetailHero } from '@/components/coach/coach-detail-hero';
import { CoachDetailAbout } from '@/components/coach/coach-detail-about';
import { CoachDetailReviews } from '@/components/coach/coach-detail-reviews';
import { CoachDetailSessions } from '@/components/coach/coach-detail-sessions';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Typography } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useCoachDetail, COACH_TABS } from '@/hooks/use-coach-detail';

export default function CoachProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const p = useCoachDetail(id);

  if (p.status === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (p.status === 'error') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <ErrorState
          message={p.error?.message ?? 'Failed to load coach profile.'}
          onRetry={p.retry}
        />
      </SafeAreaView>
    );
  }

  if (p.status === 'empty' || !p.coach) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.centered}>
          <EmptyState
            icon="person-circle-outline"
            title="Coach not found"
            message="This coach profile is unavailable."
            actionLabel="Go back"
            onPressAction={() => router.back()}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={p.refreshing}
            onRefresh={p.onRefresh}
            tintColor={palette.tint}
          />
        }
      >
        <CoachDetailHero
          coach={p.coach}
          isOwnProfile={p.isOwnProfile}
          isFollowing={p.isFollowing}
          onFollow={p.handleFollow}
          onMessage={p.handleMessage}
        />

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

        {/* Tab Content */}
        <View style={styles.tabContentContainer}>
          {p.activeTab === 'about' && <CoachDetailAbout coach={p.coach} />}
          {p.activeTab === 'reviews' && <CoachDetailReviews coach={p.coach} reviews={p.reviews} />}
          {p.activeTab === 'sessions' && (
            <CoachDetailSessions coach={p.coach} onBook={p.handleBook} />
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
              £{p.coach.minPriceUsd}
            </ThemedText>
          </View>
          <Button onPress={p.handleBook} style={{ flex: 1 }}>
            Book Session
          </Button>
        </Row>
      )}
    </SafeAreaView>
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
  tabBar: { borderBottomWidth: 1, marginTop: Spacing.md },
  tab: { flex: 1, paddingVertical: Spacing.md },
  tabContentContainer: { paddingBottom: Spacing.lg },
  fixedFooter: {
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  footerPrice: { alignItems: 'center' },
});
