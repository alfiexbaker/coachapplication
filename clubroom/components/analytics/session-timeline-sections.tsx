/**
 * Extracted sub-components for SessionTimeline.
 *
 * SessionEvent — event type definition.
 * EVENT_ICONS — icon/color map per event type.
 * TimelineEmptyState — empty "no activity" view.
 * TimelineEventRow — single event in vertical timeline.
 * HorizontalTimelineItem — single card in horizontal timeline.
 */

import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SessionEvent {
  id: string;
  date: string;
  type: 'SESSION' | 'GOAL_SET' | 'GOAL_COMPLETED' | 'MILESTONE' | 'VIDEO' | 'ASSESSMENT';
  title: string;
  subtitle?: string;
  coach?: string;
  rating?: number;
  focus?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

// Decorative: categorical timeline event colors (not themeable)
export const EVENT_ICONS: Record<SessionEvent['type'], { icon: string; color: string }> = {
  SESSION: { icon: 'football', color: '#4CAF50' },
  GOAL_SET: { icon: 'flag', color: '#2196F3' },
  GOAL_COMPLETED: { icon: 'trophy', color: '#FFB800' },
  MILESTONE: { icon: 'checkmark-circle', color: '#9C27B0' },
  VIDEO: { icon: 'videocam', color: '#E91E63' },
  ASSESSMENT: { icon: 'clipboard', color: '#00BCD4' },
} as const;

// ─── TimelineEmptyState ──────────────────────────────────────────────────────

interface TimelineEmptyStateProps {
  palette: ThemeColors;
}

export const TimelineEmptyState = memo(function TimelineEmptyState({
  palette,
}: TimelineEmptyStateProps) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="time-outline" size={32} color={palette.muted} />
      <ThemedText style={{ color: palette.muted, marginTop: Spacing.sm }}>
        No recent activity
      </ThemedText>
    </View>
  );
});

// ─── TimelineEventRow ────────────────────────────────────────────────────────

interface TimelineEventRowProps {
  event: SessionEvent;
  isLast: boolean;
  onPress?: (event: SessionEvent) => void;
  palette: ThemeColors;
}

export const TimelineEventRow = memo(function TimelineEventRow({
  event,
  isLast,
  onPress,
  palette,
}: TimelineEventRowProps) {
  const iconConfig = EVENT_ICONS[event.type];

  return (
    <Clickable
      onPress={() => onPress?.(event)}
      disabled={!onPress}
      style={styles.eventRow}
    >
      {/* Timeline Line */}
      <View style={styles.timelineColumn}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: withAlpha(iconConfig.color, 0.09) },
          ]}
        >
          <Ionicons
            name={iconConfig.icon as keyof typeof Ionicons.glyphMap}
            size={16}
            color={iconConfig.color}
          />
        </View>
        {!isLast && (
          <View style={[styles.timelineLine, { backgroundColor: palette.border }]} />
        )}
      </View>

      {/* Event Content */}
      <View style={styles.eventContent}>
        <Row style={styles.eventHeader}>
          <ThemedText type="defaultSemiBold" style={styles.eventTitle}>
            {event.title}
          </ThemedText>
          <ThemedText style={[styles.eventDate, { color: palette.muted }]}>
            {new Date(event.date).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
            })}
          </ThemedText>
        </Row>

        {event.subtitle && (
          <ThemedText style={[styles.eventSubtitle, { color: palette.muted }]}>
            {event.subtitle}
          </ThemedText>
        )}

        <Row style={styles.eventMeta}>
          {event.coach && (
            <Row style={styles.metaItem}>
              <Ionicons name="person-outline" size={12} color={palette.muted} />
              <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                {event.coach}
              </ThemedText>
            </Row>
          )}
          {event.focus && (
            <Row style={styles.metaItem}>
              <Ionicons name="football-outline" size={12} color={palette.muted} />
              <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                {event.focus}
              </ThemedText>
            </Row>
          )}
          {event.rating && (
            <Row style={styles.metaItem}>
              <Ionicons name="star" size={12} color={palette.rating} />
              <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                {event.rating.toFixed(1)}
              </ThemedText>
            </Row>
          )}
        </Row>
      </View>
    </Clickable>
  );
});

// ─── HorizontalTimelineItem ──────────────────────────────────────────────────

interface HorizontalTimelineItemProps {
  event: SessionEvent;
  showConnector: boolean;
  onPress?: (event: SessionEvent) => void;
  palette: ThemeColors;
}

export const HorizontalTimelineItem = memo(function HorizontalTimelineItem({
  event,
  showConnector,
  onPress,
  palette,
}: HorizontalTimelineItemProps) {
  const iconConfig = EVENT_ICONS[event.type];

  return (
    <Row style={styles.horizontalItem}>
      {showConnector && (
        <View style={[styles.horizontalLine, { backgroundColor: palette.border }]} />
      )}

      <Clickable
        onPress={() => onPress?.(event)}
        disabled={!onPress}
        style={[styles.horizontalCard, { backgroundColor: palette.surface }]}
      >
        <View
          style={[styles.horizontalIcon, { backgroundColor: withAlpha(iconConfig.color, 0.09) }]}
        >
          <Ionicons name={iconConfig.icon as keyof typeof Ionicons.glyphMap} size={18} color={iconConfig.color} />
        </View>
        <ThemedText style={styles.horizontalDate}>
          {new Date(event.date).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          })}
        </ThemedText>
        <ThemedText style={styles.horizontalTitle} numberOfLines={2}>
          {event.title}
        </ThemedText>
      </Clickable>
    </Row>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  monthGroup: {
    gap: Spacing.sm,
  },
  monthLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventsContainer: {
    gap: 0,
  },
  eventRow: {
    gap: Spacing.md,
  },
  timelineColumn: {
    alignItems: 'center',
    width: 32,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    minHeight: 20,
    marginVertical: Spacing.xxs,
  },
  eventContent: {
    flex: 1,
    paddingBottom: Spacing.md,
    gap: Spacing.xxs,
  },
  eventHeader: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  eventTitle: { ...Typography.bodySmall, flex: 1 },
  eventDate: { ...Typography.caption },
  eventSubtitle: { ...Typography.small },
  eventMeta: {
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.micro,
  },
  metaItem: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  metaText: { ...Typography.caption },
  horizontalContainer: {
    paddingVertical: Spacing.sm,
    gap: 0,
  },
  horizontalItem: {
    alignItems: 'center',
  },
  horizontalLine: {
    width: 20,
    height: 2,
  },
  horizontalCard: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    width: 100,
    gap: Spacing.xs,
  },
  horizontalIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalDate: { ...Typography.caption },
  horizontalTitle: { ...Typography.caption, textAlign: 'center' },
});
