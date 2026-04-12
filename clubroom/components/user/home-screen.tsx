/**
 * UserHomeScreen — Composition root.
 * Athlete/parent home: stats, streak, quick actions, next session, badges, clubs.
 */
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Row } from '@/components/primitives/row';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { NotificationBell } from '@/components/ui/notification-bell';
import { Avatar } from '@/components/ui/primitives/Avatar';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useHomeScreen } from '@/hooks/use-home-screen';
import { useDemoWalkthroughVisibility } from '@/hooks/use-demo-walkthrough-visibility';
import { Routes } from '@/navigation/routes';
import { DemoWalkthroughCard } from '@/components/ui/demo-walkthrough-card';
import { buildPrimaryDemoWalkthrough } from '@/utils/demo-walkthrough';
import {
  StatsRow,
  StreakCard,
  QuickActionsGrid,
  NextSessionCard,
  RecentBadgesSection,
  MyClubsSection,
  RecentResultsSection,
  ClubHighlightsSection,
} from './home-screen-sections';

export function UserHomeScreen() {
  const { colors: palette } = useTheme();
  const {
    currentUser,
    refreshing,
    loading,
    error,
    recentBadges,
    clubs,
    recentResults,
    clubHighlights,
    stats,
    streakInfo,
    selectedChild,
    isViewingSelfProfile,
    canSelfSwitchProfile,
    handleToggleSelfChildProfile,
    onRefresh,
    upcomingBookings,
    hasChildProfiles,
    contextChildren,
  } = useHomeScreen();

  const nextSession = upcomingBookings[0];
  const hasChildReferences = (currentUser?.children?.length ?? 0) > 0;
  const isNewParent = hasChildReferences && !hasChildProfiles && contextChildren.length === 0;
  const showChildCard = Boolean(selectedChild);
  const walkthrough =
    !currentUser || hasChildProfiles || hasChildReferences
      ? null
      : buildPrimaryDemoWalkthrough({
          user: currentUser,
          hasChildProfiles,
        });
  const { walkthrough: visibleWalkthrough, dismissWalkthrough } = useDemoWalkthroughVisibility(
    currentUser?.id,
    walkthrough,
  );

  if (!currentUser) return null;

  const profileName = isViewingSelfProfile
    ? currentUser.name || currentUser.fullName || 'You'
    : selectedChild?.name || 'Child';
  const profileMeta = isViewingSelfProfile
    ? 'Your profile'
    : selectedChild?.age != null
      ? `Age ${selectedChild.age}`
      : 'Child profile';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.tint}
            colors={[palette.tint]}
          />
        }
      >
        <Row align="start" justify="space-between" gap="sm" style={styles.header}>
          <View style={styles.headerCopy}>
            <ThemedText type="title" style={styles.title}>
              Hey, {currentUser.name?.split(' ')[0] || 'Athlete'}
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
              Your training journey
            </ThemedText>
          </View>
          <NotificationBell size={20} />
        </Row>

        {showChildCard && selectedChild ? (
          <SurfaceCard style={[styles.singleChildCard, { borderColor: palette.border }]}>
            <Column gap="xs">
              <Row align="center" gap="sm" style={styles.childIdentityRow}>
                <Avatar
                  uri={isViewingSelfProfile ? undefined : selectedChild.avatarUrl}
                  name={profileName}
                  size="md"
                />
                <Column flex gap="micro" style={styles.childIdentityCopy}>
                  <ThemedText type="defaultSemiBold" numberOfLines={1}>
                    {profileName}
                  </ThemedText>
                  <ThemedText style={[styles.singleChildMeta, { color: palette.muted }]} numberOfLines={1}>
                    {profileMeta}
                  </ThemedText>
                </Column>
              </Row>
              {canSelfSwitchProfile && (
                <Clickable
                  onPress={handleToggleSelfChildProfile}
                  accessibilityLabel="Switch between your profile and active child"
                  style={[styles.addChildMiniButton, { backgroundColor: withAlpha(palette.tint, 0.08) }]}
                >
                  <Ionicons name="swap-horizontal-outline" size={16} color={palette.tint} />
                  <ThemedText style={[styles.addChildMiniLabel, { color: palette.tint }]}>
                    {isViewingSelfProfile
                      ? `Switch to ${selectedChild.name}`
                      : `Switch to ${(currentUser.name || currentUser.fullName || 'You').split(' ')[0]}`}
                  </ThemedText>
                </Clickable>
              )}
            </Column>
          </SurfaceCard>
        ) : null}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.tint} />
          </View>
        )}

        {error && !loading && (
          <Row
            align="center"
            gap="sm"
            style={[
              styles.errorContainer,
              { backgroundColor: withAlpha(palette.error, 0.06), borderColor: palette.error },
            ]}
          >
            <Ionicons name="alert-circle" size={20} color={palette.error} />
            <ThemedText style={[styles.errorText, { color: palette.error }]}>{error}</ThemedText>
          </Row>
        )}

        {isNewParent ? (
          <SurfaceCard style={[styles.onboardingCard, { borderColor: palette.border }]}>
            <Column gap="sm">
              <ThemedText type="subtitle">Welcome to Clubroom</ThemedText>
              <ThemedText style={[styles.onboardingSubtitle, { color: palette.muted }]}>
                Add your child first, then you can find coaches and book sessions.
              </ThemedText>
              <Clickable
                onPress={() => router.push(Routes.MODAL_ADD_CHILD)}
                style={[styles.primaryCta, { backgroundColor: palette.tint }]}
              >
                <Row align="center" justify="center" gap="xs">
                  <Ionicons name="person-add-outline" size={18} color={palette.onPrimary} />
                  <ThemedText style={[styles.ctaText, { color: palette.onPrimary }]}>
                    Add Your Child
                  </ThemedText>
                </Row>
              </Clickable>
              <Clickable
                onPress={() => router.push(Routes.DISCOVER_MAP)}
                style={[styles.secondaryCta, { borderColor: palette.border }]}
              >
                <Row align="center" justify="center" gap="xs">
                  <Ionicons name="search-outline" size={18} color={palette.tint} />
                  <ThemedText style={[styles.ctaText, { color: palette.tint }]}>
                    Browse Coaches
                  </ThemedText>
                </Row>
              </Clickable>
            </Column>
          </SurfaceCard>
        ) : null}

        {visibleWalkthrough ? (
          <DemoWalkthroughCard
            walkthrough={visibleWalkthrough}
            onPressStep={(step) => router.push(step.route)}
            onDismiss={dismissWalkthrough}
          />
        ) : null}

        <StatsRow stats={stats} />
        {streakInfo && <StreakCard streakInfo={streakInfo} />}
        <QuickActionsGrid />
        <NextSessionCard booking={nextSession} />
        <RecentResultsSection results={recentResults} />
        <ClubHighlightsSection highlights={clubHighlights} />
        <RecentBadgesSection badges={recentBadges} />
        <MyClubsSection clubs={clubs} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  header: { marginBottom: Spacing.xs },
  headerCopy: { flex: 1, minWidth: 0, gap: Spacing.xs },
  title: { ...Typography.display, letterSpacing: -0.6 },
  subtitle: { ...Typography.bodySmall, fontWeight: '500' },
  loadingContainer: { padding: Spacing['2xl'], alignItems: 'center', justifyContent: 'center' },
  errorContainer: { padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1 },
  errorText: { ...Typography.bodySmall, flex: 1 },
  onboardingCard: {
    borderWidth: 1,
    padding: Spacing.md,
  },
  onboardingSubtitle: {
    ...Typography.bodySmall,
  },
  primaryCta: {
    borderRadius: Radii.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  secondaryCta: {
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  ctaText: {
    ...Typography.bodySmallSemiBold,
  },
  singleChildCard: {
    borderWidth: 1,
    padding: Spacing.sm,
  },
  childIdentityRow: {
    minWidth: 0,
  },
  childIdentityCopy: {
    minWidth: 0,
  },
  singleChildMeta: {
    ...Typography.caption,
  },
  addChildMiniButton: {
    minHeight: 36,
    flex: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
  },
  addChildMiniLabel: {
    ...Typography.caption,
    fontWeight: '600',
  },
});
