import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ClubActivity } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

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
  if (price == null || price <= 0) {
    return 'Free';
  }

  try {
    return price.toLocaleString('en-GB', {
      style: 'currency',
      currency,
      maximumFractionDigits: price % 1 === 0 ? 0 : 2,
    });
  } catch {
    return `${currency} ${price}`;
  }
}

function getActivityIcon(activity: ClubActivity): keyof typeof Ionicons.glyphMap {
  switch (activity.kind) {
    case 'training':
      return 'football';
    case 'match':
      return 'trophy';
    case 'informational':
      return 'calendar-outline';
  }
}

function getActivityTint(activity: ClubActivity, colors: ReturnType<typeof useTheme>['colors']): string {
  if (activity.kind === 'match') {
    return colors.warning;
  }

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

function getStatusLabel(activity: ClubActivity): string | null {
  switch (activity.status) {
    case 'full':
      return 'Full';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'in_progress':
      return 'Live';
    default:
      return null;
  }
}

export interface ClubScheduleActivityCardProps {
  activity: ClubActivity;
  onPress: () => void;
  compact?: boolean;
}

export function ClubScheduleActivityCard({
  activity,
  onPress,
  compact = false,
}: ClubScheduleActivityCardProps) {
  const { colors } = useTheme();
  const tint = getActivityTint(activity, colors);
  const statusLabel = getStatusLabel(activity);

  return (
    <Clickable
      style={[
        styles.activityRow,
        { borderColor: colors.border },
        compact ? styles.compactRow : null,
      ]}
      onPress={onPress}
      accessibilityLabel={`${activity.title}, ${activity.accessLabel}, ${activity.participationLabel}`}
    >
      <Row align="flex-start" gap="sm">
        <View style={[styles.activityIcon, { backgroundColor: withAlpha(tint, 0.1) }]}>
          <Ionicons name={getActivityIcon(activity)} size={18} color={tint} />
        </View>

        <Column flex gap="xxs">
          <Row justify="between" align="center" gap="sm">
            <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.title}>
              {activity.title}
            </ThemedText>
            <ThemedText style={[Typography.smallSemiBold, { color: tint }]}>
              {activity.kind === 'match' ? activity.homeAwayLabel ?? activity.typeLabel : formatPrice(activity.price, activity.currency)}
            </ThemedText>
          </Row>

          <Row style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: withAlpha(colors.tint, 0.08) }]}>
              <ThemedText style={[Typography.micro, { color: colors.tint }]}>
                {activity.typeLabel}
              </ThemedText>
            </View>
            <View style={[styles.badge, { backgroundColor: withAlpha(tint, 0.1) }]}>
              <ThemedText style={[Typography.micro, { color: tint }]}>
                {activity.accessLabel}
              </ThemedText>
            </View>
            {statusLabel ? (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      activity.status === 'cancelled'
                        ? withAlpha(colors.error, 0.12)
                        : withAlpha(colors.warning, 0.12),
                  },
                ]}
              >
                <ThemedText
                  style={[
                    Typography.micro,
                    { color: activity.status === 'cancelled' ? colors.error : colors.warning },
                  ]}
                >
                  {statusLabel}
                </ThemedText>
              </View>
            ) : null}
          </Row>

          <ThemedText style={[Typography.caption, { color: colors.muted }]}>
            {formatActivitySchedule(activity.startsAt)}
            {' · '}
            {activity.locationLabel}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: colors.muted }]} numberOfLines={2}>
            {activity.participationLabel}
            {' · '}
            {activity.audienceLabel}
            {activity.resultLabel ? ` · ${activity.resultLabel}` : ''}
          </ThemedText>
        </Column>
      </Row>
    </Clickable>
  );
}

const styles = StyleSheet.create({
  activityRow: {
    borderBottomWidth: 1,
    paddingBottom: Spacing.sm,
  },
  compactRow: {
    paddingBottom: Spacing.xs,
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
