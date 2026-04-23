/**
 * UserHomeScreen — Composition root.
 * Athlete/parent home: stats, streak, quick actions, next session, badges, clubs.
 */
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
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
import { SubmitProgressState } from '@/components/ui/screen-states';
import {
  Skeleton,
  SkeletonCircle,
  SkeletonCluster,
  SkeletonPill,
  SkeletonText,
} from '@/components/ui/skeleton';
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

function HomeDataSkeleton({
  showProgress,
  showStreak,
  showRecentResults,
  showClubHighlights,
  showRecentBadges,
  showClubs,
}: {
  showProgress: boolean;
  showStreak: boolean;
  showRecentResults: boolean;
  showClubHighlights: boolean;
  showRecentBadges: boolean;
  showClubs: boolean;
}) {
  const { colors: palette } = useTheme();

  return (
    <SkeletonCluster gap={Spacing.sm} style={styles.skeletonStack} accessibilityLabel="Loading home sections">
      {showProgress ? (
        <SubmitProgressState label="Switching profile" style={styles.progressState} />
      ) : null}

      <SurfaceCard style={[styles.skeletonCard, styles.skeletonStatsCard]}>
        <Row align="center" justify="space-between" gap="sm">
          {Array.from({ length: 3 }).map((_, index) => (
            <View key={index} style={styles.skeletonStatItem}>
              <Row align="center" gap="xs">
                <SkeletonCircle size={36} accessibilityLabel={`Loading stat icon ${index + 1}`} />
                <View style={styles.skeletonStatText}>
                  <Skeleton width={40} height={18} accessibilityLabel={`Loading stat value ${index + 1}`} />
                  <Skeleton width={52} height={11} accessibilityLabel={`Loading stat label ${index + 1}`} />
                </View>
              </Row>
            </View>
          ))}
        </Row>
      </SurfaceCard>

      {showStreak ? (
        <SurfaceCard style={[styles.skeletonCard, styles.skeletonStreakCard]}>
          <Row align="center" gap="sm">
            <SkeletonCircle size={40} accessibilityLabel="Loading streak icon" />
            <View style={styles.flex}>
              <Skeleton width="30%" height={18} accessibilityLabel="Loading streak value" />
              <SkeletonText
                lines={2}
                widths={['54%', '68%']}
                accessibilityLabel="Loading streak detail"
              />
            </View>
            <Skeleton width={18} height={18} accessibilityLabel="Loading streak navigation" />
          </Row>
        </SurfaceCard>
      ) : null}

      <QuickActionsGrid />

      <SurfaceCard style={[styles.skeletonCard, styles.skeletonSessionCard]}>
        <Row align="center" gap="sm">
          <SkeletonCircle size={44} accessibilityLabel="Loading next session icon" />
          <View style={styles.flex}>
            <Skeleton width="28%" height={12} accessibilityLabel="Loading session label" />
            <SkeletonText
              lines={3}
              widths={['56%', '46%', '68%']}
              accessibilityLabel="Loading next session"
            />
          </View>
          <Skeleton width={16} height={16} accessibilityLabel="Loading session navigation" />
        </Row>
      </SurfaceCard>

      {showRecentResults ? (
        <SurfaceCard style={styles.skeletonCard}>
          <SkeletonCluster gap={Spacing.sm} accessibilityLabel="Loading recent results">
            <View style={styles.skeletonSectionHeader}>
              <Skeleton width="34%" height={16} accessibilityLabel="Loading recent results heading" />
              <Skeleton width={64} height={12} accessibilityLabel="Loading recent results action" />
            </View>
            {Array.from({ length: 2 }).map((_, index) => (
              <Row key={index} align="center" gap="sm">
                <View style={styles.flex}>
                  <Skeleton width="62%" height={14} accessibilityLabel={`Loading result title ${index + 1}`} />
                  <Skeleton width="54%" height={11} accessibilityLabel={`Loading result meta ${index + 1}`} />
                </View>
                <View style={styles.skeletonScoreBlock}>
                  <Skeleton width={42} height={16} accessibilityLabel={`Loading result score ${index + 1}`} />
                  <Skeleton width={14} height={11} accessibilityLabel={`Loading result outcome ${index + 1}`} />
                </View>
              </Row>
            ))}
          </SkeletonCluster>
        </SurfaceCard>
      ) : null}

      {showClubHighlights ? (
        <SurfaceCard style={styles.skeletonCard}>
          <SkeletonCluster gap={Spacing.sm} accessibilityLabel="Loading club highlights">
            <View style={styles.skeletonSectionHeader}>
              <Skeleton width="30%" height={16} accessibilityLabel="Loading club highlights heading" />
              <Skeleton width={60} height={12} accessibilityLabel="Loading club highlights action" />
            </View>
            {Array.from({ length: 2 }).map((_, index) => (
              <View key={index} style={styles.skeletonHighlightCard}>
                <Row align="center" gap="xs">
                  <SkeletonCircle size={20} accessibilityLabel={`Loading highlight icon ${index + 1}`} />
                  <Skeleton width="48%" height={11} accessibilityLabel={`Loading highlight meta ${index + 1}`} />
                </Row>
                <Skeleton width="56%" height={14} accessibilityLabel={`Loading highlight title ${index + 1}`} />
                <SkeletonText
                  lines={2}
                  widths={['100%', '74%']}
                  accessibilityLabel={`Loading highlight body ${index + 1}`}
                />
              </View>
            ))}
          </SkeletonCluster>
        </SurfaceCard>
      ) : null}

      {showRecentBadges ? (
        <SurfaceCard style={styles.skeletonCard}>
          <SkeletonCluster gap={Spacing.sm} accessibilityLabel="Loading recent badges">
            <View style={styles.skeletonSectionHeader}>
              <Skeleton width="28%" height={16} accessibilityLabel="Loading badges heading" />
              <Skeleton width={52} height={12} accessibilityLabel="Loading badges action" />
            </View>
            <Row gap="sm">
              {Array.from({ length: 2 }).map((_, index) => (
                <View key={index} style={styles.skeletonBadgeCard}>
                  <SkeletonCircle size={34} accessibilityLabel={`Loading badge icon ${index + 1}`} />
                  <Skeleton width="82%" height={12} accessibilityLabel={`Loading badge title ${index + 1}`} />
                  <SkeletonPill width={58} height={18} accessibilityLabel={`Loading badge tag ${index + 1}`} />
                </View>
              ))}
            </Row>
          </SkeletonCluster>
        </SurfaceCard>
      ) : null}

      {showClubs ? (
        <SurfaceCard style={styles.skeletonCard}>
          <SkeletonCluster gap={Spacing.sm} accessibilityLabel="Loading clubs">
            <View style={styles.skeletonSectionHeader}>
              <Skeleton width="22%" height={16} accessibilityLabel="Loading clubs heading" />
              <Skeleton width={52} height={12} accessibilityLabel="Loading clubs action" />
            </View>
            <Row align="center" gap="sm" style={styles.skeletonListRow}>
              <SkeletonCircle size={40} accessibilityLabel="Loading club avatar one" />
              <View style={styles.flex}>
                <Skeleton width="42%" height={14} accessibilityLabel="Loading club name one" />
                <Skeleton width="64%" height={11} accessibilityLabel="Loading club detail one" />
              </View>
              <Skeleton width={16} height={16} accessibilityLabel="Loading club navigation one" />
            </Row>
            <Row align="center" gap="sm" style={styles.skeletonListRow}>
              <SkeletonCircle size={40} accessibilityLabel="Loading club avatar two" />
              <View style={styles.flex}>
                <Skeleton width="38%" height={14} accessibilityLabel="Loading club name two" />
                <Skeleton width="58%" height={11} accessibilityLabel="Loading club detail two" />
              </View>
              <Skeleton width={16} height={16} accessibilityLabel="Loading club navigation two" />
            </Row>
          </SkeletonCluster>
        </SurfaceCard>
      ) : null}

      {showProgress ? (
        <View style={[styles.skeletonHint, { backgroundColor: palette.surfaceSecondary }]}>
          <ThemedText style={[styles.skeletonHintText, { color: palette.muted }]}>
            Keeping the current shell stable while the next home frame resolves.
          </ThemedText>
        </View>
      ) : null}
    </SkeletonCluster>
  );
}

export function UserHomeScreen() {
  const { colors: palette } = useTheme();
  const {
    currentUser,
    refreshing,
    loading,
    showSectionSkeleton,
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

  const showHomeDataSkeleton = loading || showSectionSkeleton;
  const showOptionalSections = showSectionSkeleton;
  const showStreakSkeleton = loading ? false : Boolean(streakInfo);
  const showRecentResultsSkeleton =
    loading ? false : recentResults.length > 0;
  const showClubHighlightsSkeleton =
    loading ? false : clubHighlights.length > 0;
  const showRecentBadgesSkeleton =
    loading ? false : recentBadges.length > 0;
  const showClubsSkeleton =
    loading ? false : clubs.length > 0;
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

        {showHomeDataSkeleton ? (
          <HomeDataSkeleton
            showProgress={showSectionSkeleton}
            showStreak={showOptionalSections && showStreakSkeleton}
            showRecentResults={showOptionalSections && showRecentResultsSkeleton}
            showClubHighlights={showOptionalSections && showClubHighlightsSkeleton}
            showRecentBadges={showOptionalSections && showRecentBadgesSkeleton}
            showClubs={showOptionalSections && showClubsSkeleton}
          />
        ) : (
          <>
            <StatsRow stats={stats} />
            {streakInfo && <StreakCard streakInfo={streakInfo} />}
            <QuickActionsGrid />
            <NextSessionCard booking={nextSession} />
            <RecentResultsSection results={recentResults} />
            <ClubHighlightsSection highlights={clubHighlights} />
            <RecentBadgesSection badges={recentBadges} />
            <MyClubsSection clubs={clubs} />
          </>
        )}
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
  flex: {
    flex: 1,
  },
  progressState: {
    marginBottom: Spacing.xs,
  },
  skeletonStack: {
    paddingBottom: Spacing.xs,
  },
  skeletonCard: {
    gap: Spacing.sm,
  },
  skeletonStatsCard: {
    paddingVertical: Spacing.sm,
  },
  skeletonStatItem: {
    flex: 1,
  },
  skeletonStatText: {
    gap: Spacing.xxs,
  },
  skeletonSessionCard: {
    paddingVertical: Spacing.md,
  },
  skeletonStreakCard: {
    paddingVertical: Spacing.sm,
  },
  skeletonListRow: {
    minWidth: 0,
  },
  skeletonSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  skeletonScoreBlock: {
    alignItems: 'flex-end',
    gap: Spacing.xxs,
  },
  skeletonHighlightCard: {
    gap: Spacing.xs,
  },
  skeletonBadgeCard: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.sm,
  },
  skeletonHint: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  skeletonHintText: {
    ...Typography.caption,
  },
});
