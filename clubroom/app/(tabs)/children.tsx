/**
 * Children Hub Screen — Parent view of all child profiles.
 *
 * Composes: StatsRow, RecentBadges, ChildCards, HubSections, QuickActions.
 * Data loading delegated to useChildrenHub hook.
 */

import { useCallback } from 'react';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageContainer } from '@/components/primitives/page-container';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { Column } from '@/components/primitives/column';
import { EmptyState } from '@/components/ui/empty-state';
import { ThemedText } from '@/components/themed-text';
import { Routes } from '@/navigation/routes';
import { Spacing, Typography } from '@/constants/theme';

import { useChildrenHub } from '@/hooks/use-children-hub';
import { ChildrenStatsRow } from '@/components/family/children-stats-row';
import { ChildrenRecentBadges } from '@/components/family/children-recent-badges';
import { ChildrenChildCard } from '@/components/family/children-child-card';
import { ChildrenHubSections } from '@/components/family/children-hub-sections';
import { ChildrenQuickActions } from '@/components/family/children-quick-actions';

export default function ChildrenHubScreen() {
  const {
    currentUser,
    children,
    childStats,
    recentBadges,
    totalSessions,
    totalBadges,
    totalUnseenBadges,
    handleViewBadge,
  } = useChildrenHub();

  const handleAddChild = useCallback(() => {
    router.push(Routes.MODAL_ADD_CHILD);
  }, []);

  const handleBadgeView = useCallback(
    (badge: Parameters<typeof handleViewBadge>[0]) => {
      handleViewBadge(badge);
      router.push(Routes.childBadges(badge.athleteId));
    },
    [handleViewBadge],
  );

  // Navigate to first child's progress, or stay on this screen if multiple
  const progressRoute = children.length === 1
    ? `/development/child-progress/${children[0].id}`
    : '/(tabs)/children';

  if (!currentUser) return null;

  return (
    <PageContainer
      header={
        <ScreenHeader
          title="My Children"
          subtitle="Manage your family"
          action={{ icon: 'add', onPress: handleAddChild }}
        />
      }
      gap={Spacing.md}
    >
      <ChildrenStatsRow
        childCount={children.length}
        totalSessions={totalSessions}
        totalUnseenBadges={totalUnseenBadges}
      />

      <ChildrenRecentBadges
        badges={recentBadges}
        onViewBadge={handleBadgeView}
      />

      {children.length > 0 ? (
        <Column gap="xs">
          <ThemedText type="defaultSemiBold" style={{ ...Typography.bodySmall, marginBottom: Spacing.xs }}>
            My Children
          </ThemedText>
          <Column gap="sm">
            {children.map((child, index) => (
              <ChildrenChildCard
                key={child.id}
                child={child}
                stats={childStats[child.id] || { sessions: 0, badges: 0, avgRating: 0, unseenBadges: 0 }}
                index={index}
              />
            ))}
          </Column>
        </Column>
      ) : (
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <EmptyState
            icon="people-outline"
            title="No Children Added"
            message="Add children to your account to track their development and progress"
            actionLabel="Add Child"
            onPressAction={handleAddChild}
          />
        </Animated.View>
      )}

      <ChildrenHubSections
        totalSessions={totalSessions}
        totalBadges={totalBadges}
        totalUnseenBadges={totalUnseenBadges}
        progressRoute={progressRoute}
      />

      <ChildrenQuickActions />
    </PageContainer>
  );
}
