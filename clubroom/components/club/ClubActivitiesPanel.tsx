import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ClubActivity } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { Routes } from '@/navigation/routes';

function formatActivitySchedule(startsAt: string): string {
  const date = new Date(startsAt);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(price?: number, currency: string = 'GBP'): string {
  if (!price) {
    return 'Free';
  }

  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      maximumFractionDigits: price % 1 === 0 ? 0 : 2,
    }).format(price);
  } catch {
    return `${currency} ${price}`;
  }
}

function getActivityIcon(activity: ClubActivity): keyof typeof Ionicons.glyphMap {
  if (activity.kind === 'training') {
    return 'football';
  }
  return 'calendar-outline';
}

function getActivityTint(activity: ClubActivity, colors: ReturnType<typeof useTheme>['colors']): string {
  switch (activity.accessScope) {
    case 'mixed':
      return colors.success;
    case 'squad':
      return colors.info;
    case 'public':
      return colors.success;
    case 'private':
      return colors.warning;
    case 'club':
      return colors.tint;
  }
}

function defaultActivityPress(activity: ClubActivity) {
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
}

export const ClubActivitiesPanel = memo(function ClubActivitiesPanel({
  activities,
  isCoach,
  maxItems = 5,
  onActivityPress,
  showCreateActions = true,
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
          </Row>
        )}
      </Row>

      {visibleActivities.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-clear-outline" size={28} color={colors.muted} />
          <ThemedText style={[Typography.small, { color: colors.muted, textAlign: 'center' }]}>
            No upcoming club activities yet.
          </ThemedText>
        </View>
      ) : (
        <Column gap="sm">
          {visibleActivities.map((activity) => {
            const tint = getActivityTint(activity, colors);

            return (
              <Clickable
                key={activity.id}
                style={[styles.activityRow, { borderColor: colors.border }]}
                onPress={() =>
                  onActivityPress ? onActivityPress(activity) : defaultActivityPress(activity)
                }
                accessibilityLabel={`${activity.title}, ${activity.accessLabel}, ${activity.participationLabel}`}
              >
                <Row align="flex-start" gap="sm">
                  <View
                    style={[
                      styles.activityIcon,
                      { backgroundColor: withAlpha(tint, 0.1) },
                    ]}
                  >
                    <Ionicons name={getActivityIcon(activity)} size={18} color={tint} />
                  </View>

                  <Column flex gap="xxs">
                    <Row justify="between" align="center" gap="sm">
                      <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.title}>
                        {activity.title}
                      </ThemedText>
                      <ThemedText style={[Typography.smallSemiBold, { color: tint }]}>
                        {formatPrice(activity.price, activity.currency)}
                      </ThemedText>
                    </Row>

                    <Row style={styles.badgeRow}>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: withAlpha(colors.tint, 0.08) },
                        ]}
                      >
                        <ThemedText style={[Typography.micro, { color: colors.tint }]}>
                          {activity.typeLabel}
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: withAlpha(tint, 0.1) },
                        ]}
                      >
                        <ThemedText style={[Typography.micro, { color: tint }]}>
                          {activity.accessLabel}
                        </ThemedText>
                      </View>
                      {activity.status === 'full' && (
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: withAlpha(colors.warning, 0.12) },
                          ]}
                        >
                          <ThemedText style={[Typography.micro, { color: colors.warning }]}>
                            Full
                          </ThemedText>
                        </View>
                      )}
                    </Row>

                    <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                      {formatActivitySchedule(activity.startsAt)}
                      {' · '}
                      {activity.locationLabel}
                    </ThemedText>
                    <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                      {activity.participationLabel}
                      {' · '}
                      {activity.audienceLabel}
                    </ThemedText>
                  </Column>
                </Row>
              </Clickable>
            );
          })}
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
  emptyState: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  activityRow: {
    borderBottomWidth: 1,
    paddingBottom: Spacing.sm,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  title: {
    flex: 1,
    ...Typography.bodySmall,
  },
  badgeRow: {
    flexWrap: 'wrap',
    gap: Spacing.xxs,
  },
  badge: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
});
