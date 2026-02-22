import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SquadActivityItem, SquadActivitySummary } from '@/services/progress/progress-squad-activity-service';

interface SquadActivityFeedProps {
  items: SquadActivityItem[];
  summary: SquadActivitySummary;
  onViewAll?: () => void;
}

function iconForType(type: SquadActivityItem['type']): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'session_completed':
      return 'checkmark-done-circle-outline';
    case 'badge_earned':
      return 'ribbon-outline';
    case 'feedback_received':
      return 'chatbubble-ellipses-outline';
    case 'practice_logged':
      return 'stopwatch-outline';
  }
}

function accentForType(type: SquadActivityItem['type']): string {
  switch (type) {
    case 'session_completed':
      return '#0EA5E9';
    case 'badge_earned':
      return '#F59E0B';
    case 'feedback_received':
      return '#8B5CF6';
    case 'practice_logged':
      return '#10B981';
  }
}

function formatRelative(iso: string): string {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) {
    return '';
  }
  const diffMs = Date.now() - timestamp;
  if (diffMs < 60 * 1000) {
    return 'Now';
  }
  if (diffMs < 60 * 60 * 1000) {
    return `${Math.max(1, Math.round(diffMs / (60 * 1000)))}m`;
  }
  if (diffMs < 24 * 60 * 60 * 1000) {
    return `${Math.max(1, Math.round(diffMs / (60 * 60 * 1000)))}h`;
  }
  if (diffMs < 7 * 24 * 60 * 60 * 1000) {
    return `${Math.max(1, Math.round(diffMs / (24 * 60 * 60 * 1000)))}d`;
  }
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(iso));
}

export const SquadActivityFeed = memo(function SquadActivityFeed({
  items,
  summary,
  onViewAll,
}: SquadActivityFeedProps) {
  const { colors } = useTheme();

  const visibleItems = useMemo(() => items.slice(0, 5), [items]);
  if (visibleItems.length === 0) {
    return null;
  }

  const subtitle = `${summary.activeToday} active today · ${summary.sessionsThisWeek} sessions this week`;

  return (
    <SurfaceCard style={styles.card}>
      <Column gap="xs">
        <Row align="center" justify="between">
          <Column gap="micro">
            <ThemedText style={styles.title}>Squad Activity</ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</ThemedText>
          </Column>
          {onViewAll ? (
            <Clickable onPress={onViewAll} accessibilityLabel="View all squad activity" accessibilityRole="button">
              <ThemedText style={[styles.viewAll, { color: colors.tint }]}>View all</ThemedText>
            </Clickable>
          ) : null}
        </Row>

        <Column gap="xxs">
          {visibleItems.map((item) => {
            const accent = accentForType(item.type);
            return (
              <Row
                key={item.id}
                align="start"
                gap="xs"
                style={[
                  styles.row,
                  { borderColor: withAlpha(colors.border, 0.8), backgroundColor: withAlpha(colors.surface, 0.4) },
                ]}
              >
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: withAlpha(accent, 0.14),
                      borderColor: withAlpha(accent, 0.28),
                    },
                  ]}
                >
                  <Ionicons name={iconForType(item.type)} size={14} color={accent} />
                </View>

                <Column gap="micro" style={styles.content}>
                  <Row align="center" gap="xxs" wrap>
                    <ThemedText style={styles.itemTitle}>{item.title}</ThemedText>
                    {item.isSelf ? (
                      <View
                        style={[
                          styles.selfChip,
                          { backgroundColor: withAlpha(colors.tint, 0.12), borderColor: withAlpha(colors.tint, 0.2) },
                        ]}
                      >
                        <ThemedText style={[styles.selfChipText, { color: colors.tint }]}>You</ThemedText>
                      </View>
                    ) : null}
                  </Row>
                  <ThemedText style={[styles.itemDetail, { color: colors.muted }]} numberOfLines={2}>
                    {item.detail}
                  </ThemedText>
                </Column>

                <ThemedText style={[styles.time, { color: colors.muted }]}>{formatRelative(item.happenedAt)}</ThemedText>
              </Row>
            );
          })}
        </Column>
      </Column>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  title: {
    ...Typography.subheading,
    fontWeight: '700',
  },
  subtitle: {
    ...Typography.caption,
  },
  viewAll: {
    ...Typography.caption,
    fontWeight: '600',
  },
  row: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.xs,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 2,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    ...Typography.bodySmallSemiBold,
    flexShrink: 1,
  },
  itemDetail: {
    ...Typography.caption,
  },
  time: {
    ...Typography.micro,
    fontWeight: '600',
    paddingTop: 2,
  },
  selfChip: {
    paddingHorizontal: 6,
    minHeight: 18,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfChipText: {
    ...Typography.micro,
    fontWeight: '700',
  },
});
