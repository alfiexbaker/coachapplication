import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Clickable } from '@/components/primitives/clickable';
import { PageHeader } from '@/components/primitives/page-header';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { ClubScheduleActivityCard } from '@/components/club/ClubScheduleActivityCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useClubSchedule, CLUB_SCHEDULE_FILTERS } from '@/hooks/use-club-schedule';
import type { ClubScheduleFilter } from '@/utils/club-schedule-display';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';

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

export function ClubScheduleScreen({ clubId, squadId, scope }: ClubScheduleScreenProps) {
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const schedule = useClubSchedule({ clubId, squadId });
  const canCreateItems = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';

  const title = scope === 'club' ? 'Club Schedule' : 'Team Schedule';
  const subtitle = useMemo(() => {
    if (scope === 'club') {
      return schedule.club?.name ?? 'Everything happening next';
    }
    return schedule.squad?.name ?? 'Everything this team is doing next';
  }, [scope, schedule.club?.name, schedule.squad?.name]);

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

  if (schedule.status === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <PageHeader title={title} subtitle={subtitle} showBack onBackPress={handleBack} />
        <LoadingState variant="schedule" />
      </SafeAreaView>
    );
  }

  if (schedule.error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <PageHeader title={title} subtitle={subtitle} showBack onBackPress={handleBack} />
        <ErrorState message={schedule.error.message} onRetry={schedule.retry} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        showBack
        onBackPress={handleBack}
        right={canCreateItems ? (
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
        ) : undefined}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={schedule.refreshing}
            onRefresh={schedule.onRefresh}
            tintColor={colors.tint}
            colors={[colors.tint]}
          />
        }
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {CLUB_SCHEDULE_FILTERS.map((filter) => {
            const active = schedule.filter === filter.key;
            const count = schedule.counts[filter.key];

            return (
              <Clickable
                key={filter.key}
                style={[
                  styles.filterChip,
                  {
                    borderColor: active ? colors.tint : colors.border,
                    backgroundColor: active ? withAlpha(colors.tint, 0.09) : colors.surface,
                  },
                ]}
                onPress={() => schedule.setFilter(filter.key)}
              >
                <Row align="center" gap="xs">
                  <Ionicons
                    name={filter.icon as keyof typeof Ionicons.glyphMap}
                    size={15}
                    color={active ? colors.tint : colors.muted}
                  />
                  <ThemedText
                    style={[
                      Typography.smallSemiBold,
                      { color: active ? colors.tint : colors.foreground },
                    ]}
                  >
                    {filter.label}
                  </ThemedText>
                  <View
                    style={[
                      styles.countBadge,
                      {
                        backgroundColor: active ? colors.tint : withAlpha(colors.muted, 0.16),
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        Typography.micro,
                        { color: active ? colors.onPrimary : colors.foreground },
                      ]}
                    >
                      {count}
                    </ThemedText>
                  </View>
                </Row>
              </Clickable>
            );
          })}
        </ScrollView>

        {schedule.groupedActivities.length === 0 ? (
          <EmptyState
            icon="calendar-clear-outline"
            title={`No ${CLUB_SCHEDULE_FILTERS.find((filter) => filter.key === schedule.filter)?.label.toLowerCase() ?? 'schedule'} items`}
            message={getEmptyMessage(schedule.filter, scope)}
          />
        ) : (
          schedule.groupedActivities.map((group) => (
            <View key={group.key} style={styles.group}>
              <Row align="center" justify="between" style={styles.groupHeader}>
                <ThemedText type="defaultSemiBold">{group.title}</ThemedText>
                <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                  {group.items.length} item{group.items.length === 1 ? '' : 's'}
                </ThemedText>
              </Row>

              <SurfaceCard style={styles.groupCard}>
                {group.items.map((activity) => (
                  <ClubScheduleActivityCard
                    key={activity.id}
                    activity={activity}
                    onPress={() => handleActivityPress(activity.id, activity.clubId)}
                  />
                ))}
              </SurfaceCard>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
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
