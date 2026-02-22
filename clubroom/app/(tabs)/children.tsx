/**
 * Children Hub Screen — Parent view of all child profiles.
 *
 * Composes: StatsRow, RecentBadges, ChildCards.
 * Data loading delegated to useChildrenHub hook.
 */

import { useCallback } from 'react';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageContainer } from '@/components/primitives/page-container';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { Column } from '@/components/primitives/column';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { ThemedText } from '@/components/themed-text';
import { Routes } from '@/navigation/routes';
import { Spacing, Typography } from '@/constants/theme';

import { useChildrenHub } from '@/hooks/use-children-hub';
import { ChildrenStatsRow } from '@/components/family/children-stats-row';
import { ChildrenRecentBadges } from '@/components/family/children-recent-badges';
import { ChildrenChildCard } from '@/components/family/children-child-card';

export default function ChildrenHubScreen() {
  const {
    currentUser,
    children,
    childStats,
    recentBadges,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    totalSessions,
    totalUnseenBadges,
    activeChildId,
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

  if (status === 'loading') {
    return (
      <PageContainer
        header={<ScreenHeader title="My Children" subtitle="Manage your family" />}
        gap={Spacing.md}
      >
        <LoadingState variant="list" />
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer
        header={<ScreenHeader title="My Children" subtitle="Manage your family" />}
        gap={Spacing.md}
      >
        <ErrorState
          message={error?.message ?? 'Failed to load children hub data.'}
          onRetry={retry}
        />
      </PageContainer>
    );
  }

  if (!currentUser) {
    return (
      <PageContainer
        header={<ScreenHeader title="My Children" subtitle="Manage your family" />}
        gap={Spacing.md}
      >
        <EmptyState
          icon="person-outline"
          title="Sign in required"
          message="Please sign in to manage your children and track development."
        />
      </PageContainer>
    );
  }

  if (status === 'empty') {
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
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        <ChildrenStatsRow childCount={0} totalSessions={0} totalUnseenBadges={0} />

        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <EmptyState
            icon="people-outline"
            title="No Children Added"
            message="Add children to your account to track their development and progress"
            actionLabel="Add Child"
            onPressAction={handleAddChild}
          />
        </Animated.View>
      </PageContainer>
    );
  }

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
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <ChildrenStatsRow
        childCount={children.length}
        totalSessions={totalSessions}
        totalUnseenBadges={totalUnseenBadges}
      />

      <ChildrenRecentBadges badges={recentBadges} onViewBadge={handleBadgeView} />

      <Column gap="xs">
        <ThemedText
          type="defaultSemiBold"
          style={{ ...Typography.bodySmall, marginBottom: Spacing.xs }}
        >
          My Children
        </ThemedText>
        <Column gap="sm">
          {children.map((child, index) => (
            <ChildrenChildCard
              key={child.id}
              child={child}
              stats={
                childStats[child.id] || { sessions: 0, badges: 0, avgRating: 0, unseenBadges: 0 }
              }
              index={index}
              isActive={activeChildId === child.id}
            />
          ))}
        </Column>
      </Column>
    </PageContainer>
  );
}
