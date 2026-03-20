import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { Href } from 'expo-router';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography } from '@/constants/theme';
import type { ClubActivity } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { Routes } from '@/navigation/routes';
import { ClubScheduleActivityCard } from './ClubScheduleActivityCard';

function defaultActivityPress(activity: ClubActivity) {
  if (activity.source === 'match') {
    router.push(Routes.match(activity.sourceEntityId));
    return;
  }
  if (activity.source === 'group_session') {
    router.push(Routes.groupSession(activity.sourceEntityId));
    return;
  }
  router.push(Routes.event(activity.sourceEntityId));
}

export interface ClubActivitiesPanelProps {
  activities: ClubActivity[];
  isCoach: boolean;
  maxItems?: number;
  onActivityPress?: (activity: ClubActivity) => void;
  showCreateActions?: boolean;
  viewAllHref?: Href;
}

export const ClubActivitiesPanel = memo(function ClubActivitiesPanel({
  activities,
  isCoach,
  maxItems = 5,
  onActivityPress,
  showCreateActions = true,
  viewAllHref,
}: ClubActivitiesPanelProps) {
  const { colors } = useTheme();
  const visibleActivities = useMemo(() => activities.slice(0, maxItems), [activities, maxItems]);

  return (
    <SurfaceCard style={styles.card}>
      <Row justify="between" align="center" gap="md">
        <Column flex>
          <Row align="center" gap="sm">
            <Ionicons name="calendar" size={20} color={colors.tint} />
            <ThemedText type="defaultSemiBold">Schedule</ThemedText>
          </Row>
        </Column>

        {viewAllHref ? (
          <Clickable
            style={styles.viewAllButton}
            onPress={() => router.push(viewAllHref)}
            accessibilityLabel="Open full schedule"
          >
            <ThemedText style={[Typography.caption, { color: colors.tint }]}>Open</ThemedText>
            <Ionicons name="chevron-forward" size={16} color={colors.tint} />
          </Clickable>
        ) : null}

        {isCoach && showCreateActions && (
          <Row align="center" gap="xs">
            <Clickable
              style={[styles.secondaryButton, { borderColor: colors.tint }]}
              onPress={() => router.push(Routes.EVENTS_CREATE)}
            >
              <ThemedText style={[Typography.caption, { color: colors.tint }]}>Event</ThemedText>
            </Clickable>
            <Clickable
              style={[styles.primaryButton, { backgroundColor: colors.tint }]}
              onPress={() => router.push(Routes.GROUP_SESSIONS_CREATE)}
            >
              <ThemedText style={[Typography.caption, { color: colors.onPrimary }]}>
                Training
              </ThemedText>
            </Clickable>
            <Clickable
              style={[styles.secondaryButton, { borderColor: colors.warning }]}
              onPress={() => router.push(Routes.MATCHES_CREATE)}
            >
              <ThemedText style={[Typography.caption, { color: colors.warning }]}>Match</ThemedText>
            </Clickable>
          </Row>
        )}
      </Row>

      {visibleActivities.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-clear-outline" size={28} color={colors.muted} />
          <ThemedText style={[Typography.small, { color: colors.muted, textAlign: 'center' }]}>
            No scheduled items yet.
          </ThemedText>
        </View>
      ) : (
        <Column gap="sm">
          {visibleActivities.map((activity) => (
            <ClubScheduleActivityCard
              key={activity.id}
              activity={activity}
              compact
              onPress={() =>
                onActivityPress ? onActivityPress(activity) : defaultActivityPress(activity)
              }
            />
          ))}
        </Column>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.md,
  },
  primaryButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
  },
  secondaryButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  viewAllButton: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
});
