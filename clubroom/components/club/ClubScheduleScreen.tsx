import { FlatList, RefreshControl, StyleSheet, View, type ListRenderItemInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Href } from 'expo-router';

import { Clickable } from '@/components/primitives/clickable';
import { PageHeader } from '@/components/primitives/page-header';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { ClubScheduleActivityCard } from '@/components/club/ClubScheduleActivityCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/hooks/useTheme';
import { useClubSchedule, CLUB_SCHEDULE_FILTERS } from '@/hooks/use-club-schedule';
import type { ClubScheduleDayGroup, ClubScheduleFilter } from '@/utils/club-schedule-display';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import type { ClubActivity } from '@/constants/types';

export interface ClubScheduleScreenProps {
  clubId?: string;
  squadId?: string;
  scope: 'club' | 'squad';
}

function getEmptyMessage(filter: ClubScheduleFilter, scope: 'club' | 'squad'): string {
  if (filter === 'completed') {
    return scope === 'club'
      ? 'Completed club items will land here.'
      : 'Completed team items will land here.';
  }

  if (filter === 'matches') {
    return scope === 'club'
      ? 'Matches will appear here once they are scheduled.'
      : 'Team matches will appear here once they are scheduled.';
  }

  if (filter === 'training') {
    return scope === 'club'
      ? 'Training sessions will appear here once they are scheduled.'
      : 'Team training will appear here once it is scheduled.';
  }

  if (filter === 'events') {
    return scope === 'club'
      ? 'Events will appear here once they are published.'
      : 'Team-relevant events will appear here once they are published.';
  }

  return scope === 'club'
    ? 'This club does not have any schedule items yet.'
    : 'This team does not have any schedule items yet.';
}

function getPrimaryCreateHref(_scope: 'club' | 'squad', _clubId?: string, _squadId?: string): Href {
  return Routes.GROUP_SESSIONS_CREATE;
}

function getEmptyTitle(filter: ClubScheduleFilter): string {
  return `No ${CLUB_SCHEDULE_FILTERS.find((item) => item.key === filter)?.label.toLowerCase() ?? 'schedule'} items`;
}

export function ClubScheduleScreen({ clubId, squadId, scope }: ClubScheduleScreenProps) {
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const schedule = useClubSchedule({ clubId, squadId });
  const canCreateItems = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';

  const title = scope === 'club' ? 'Club Schedule' : 'Team Schedule';
  const subtitle = (() => {
    if (scope === 'club') {
      return schedule.club?.name ?? 'Everything happening next';
    }
    return schedule.squad?.name ?? 'Everything this team is doing next';
  })();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (scope === 'club' && clubId) {
      router.replace(Routes.club(clubId));
      return;
    }
    if (scope === 'squad' && squadId) {
      router.replace(Routes.clubSquad(squadId));
      return;
    }
    router.replace(Routes.MY_CLUBS);
  };

  const handleActivityPress = (activityId: string, activityClubId?: string) => {
    const resolvedClubId = activityClubId ?? clubId ?? schedule.squad?.clubId;
    if (!resolvedClubId) {
      return;
    }

    router.push(Routes.clubActivity(resolvedClubId, activityId));
  };
  const filterItems = getClubScheduleFilterItems(
    schedule.filter,
    schedule.counts,
    colors,
    schedule.setFilter,
  );
  const groupItems = getClubScheduleGroupItems(
    schedule.groupedActivities,
    colors,
    handleActivityPress,
  );
  const emptyState = (
    <EmptyState
      icon="calendar-clear-outline"
      title={getEmptyTitle(schedule.filter)}
      message={getEmptyMessage(schedule.filter, scope)}
    />
  );
  const listHeader = (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterScroll}
      contentContainerStyle={styles.filterContent}
      data={filterItems}
      keyExtractor={keyClubScheduleFilterItem}
      renderItem={renderClubScheduleFilterItem}
    />
  );

  if (schedule.status === 'loading') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title={title} subtitle={subtitle} showBack onBackPress={handleBack} />
        <LoadingState variant="schedule" />
      </View>
    );
  }

  if (schedule.error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PageHeader title={title} subtitle={subtitle} showBack onBackPress={handleBack} />
        <ErrorState message={schedule.error.message} onRetry={schedule.retry} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        showBack
        onBackPress={handleBack}
        right={
          canCreateItems ? (
            <Row align="center" gap="xs">
              <Clickable
                style={[styles.headerAction, { borderColor: colors.border }]}
                onPress={() => router.push(Routes.EVENTS_CREATE)}
                accessibilityLabel="Create event"
              >
                <Ionicons name="calendar-outline" size={18} color={colors.tint} />
              </Clickable>
              <Clickable
                style={[styles.headerAction, { borderColor: colors.border }]}
                onPress={() => router.push(getPrimaryCreateHref(scope, clubId, squadId))}
                accessibilityLabel="Create training"
              >
                <Ionicons name="football-outline" size={18} color={colors.tint} />
              </Clickable>
              <Clickable
                style={[styles.headerAction, { borderColor: colors.border }]}
                onPress={() => router.push(Routes.MATCHES_CREATE)}
                accessibilityLabel="Create match"
              >
                <Ionicons name="trophy-outline" size={18} color={colors.tint} />
              </Clickable>
            </Row>
          ) : undefined
        }
      />

      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        data={groupItems}
        keyExtractor={keyClubScheduleGroupItem}
        renderItem={renderClubScheduleGroupItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyState}
        refreshControl={
          <RefreshControl
            refreshing={schedule.refreshing}
            onRefresh={schedule.onRefresh}
            tintColor={colors.tint}
            colors={[colors.tint]}
          />
        }
      />
    </View>
  );
}

interface ClubScheduleFilterItem {
  key: ClubScheduleFilter;
  active: boolean;
  count: number;
  icon: string;
  label: string;
  colors: ThemeColors;
  onPress: () => void;
}

function getClubScheduleFilterItems(
  selectedFilter: ClubScheduleFilter,
  counts: Record<ClubScheduleFilter, number>,
  colors: ThemeColors,
  onSelectFilter: (filter: ClubScheduleFilter) => void,
): ClubScheduleFilterItem[] {
  return CLUB_SCHEDULE_FILTERS.map((filter) => ({
    key: filter.key,
    active: selectedFilter === filter.key,
    count: counts[filter.key],
    icon: filter.icon,
    label: filter.label,
    colors,
    onPress: () => onSelectFilter(filter.key),
  }));
}

function keyClubScheduleFilterItem(item: ClubScheduleFilterItem): string {
  return item.key;
}

function renderClubScheduleFilterItem({ item }: ListRenderItemInfo<ClubScheduleFilterItem>) {
  return (
    <Clickable
      style={[
        styles.filterChip,
        {
          borderColor: item.active ? item.colors.tint : item.colors.border,
          backgroundColor: item.active ? withAlpha(item.colors.tint, 0.09) : item.colors.surface,
        },
      ]}
      onPress={item.onPress}
    >
      <Row align="center" gap="xs">
        <Ionicons
          name={item.icon as keyof typeof Ionicons.glyphMap}
          size={15}
          color={item.active ? item.colors.tint : item.colors.muted}
        />
        <ThemedText
          style={[
            Typography.smallSemiBold,
            { color: item.active ? item.colors.tint : item.colors.foreground },
          ]}
        >
          {item.label}
        </ThemedText>
        <View
          style={[
            styles.countBadge,
            {
              backgroundColor: item.active ? item.colors.tint : withAlpha(item.colors.muted, 0.16),
            },
          ]}
        >
          <ThemedText
            style={[
              Typography.micro,
              { color: item.active ? item.colors.onPrimary : item.colors.foreground },
            ]}
          >
            {item.count}
          </ThemedText>
        </View>
      </Row>
    </Clickable>
  );
}

interface ClubScheduleActivityItem {
  key: string;
  activity: ClubActivity;
  onPress: () => void;
}

interface ClubScheduleGroupItem {
  key: string;
  title: string;
  activities: ClubScheduleActivityItem[];
  colors: ThemeColors;
}

function getClubScheduleGroupItems(
  groups: ClubScheduleDayGroup[],
  colors: ThemeColors,
  onActivityPress: (activityId: string, activityClubId?: string) => void,
): ClubScheduleGroupItem[] {
  return groups.map((group) => ({
    key: group.key,
    title: group.title,
    colors,
    activities: group.items.map((activity) => ({
      key: activity.id,
      activity,
      onPress: () => onActivityPress(activity.id, activity.clubId),
    })),
  }));
}

function keyClubScheduleGroupItem(item: ClubScheduleGroupItem): string {
  return item.key;
}

function renderClubScheduleGroupItem({ item }: ListRenderItemInfo<ClubScheduleGroupItem>) {
  return (
    <View style={styles.group}>
      <Row align="center" justify="between" style={styles.groupHeader}>
        <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
        <ThemedText style={[Typography.caption, { color: item.colors.muted }]}>
          {item.activities.length} item{item.activities.length === 1 ? '' : 's'}
        </ThemedText>
      </Row>

      <SurfaceCard style={styles.groupCard}>
        {item.activities.map((activityItem) => (
          <ClubScheduleActivityCard
            key={activityItem.key}
            activity={activityItem.activity}
            onPress={activityItem.onPress}
          />
        ))}
      </SurfaceCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl * 2,
    gap: Spacing.md,
  },
  headerAction: {
    width: 38,
    height: 38,
    borderRadius: Radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterContent: {
    gap: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  countBadge: {
    minWidth: 20,
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
    alignItems: 'center',
  },
  group: {
    gap: Spacing.xs,
  },
  groupHeader: {
    paddingHorizontal: Spacing.xs,
  },
  groupCard: {
    gap: Spacing.md,
  },
});
