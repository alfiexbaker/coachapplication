import { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// Re-export extracted items for backward compat
export { formatDate, groupByMonth, getEntryIcon, getDotColor, TimelineEntryRow } from './progress-timeline-sections';
export type { TimelineEntryType, TimelineEntry, TimelineEntryRowProps } from './progress-timeline-sections';

import { groupByMonth, TimelineEntryRow } from './progress-timeline-sections';
import type { TimelineEntry } from './progress-timeline-sections';

export interface ProgressTimelineProps {
  entries: TimelineEntry[];
}

export function ProgressTimeline({ entries }: ProgressTimelineProps) {
  const { colors: palette } = useTheme();

  const grouped = useMemo(() => groupByMonth(entries), [entries]);

  if (entries.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: palette.surface }]}>
        <Ionicons name="time-outline" size={32} color={palette.muted} />
        <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
          No progress entries yet
        </ThemedText>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {grouped.map((group) => (
        <View key={group.month} style={styles.monthGroup}>
          <View style={styles.monthHeader}>
            <View style={[styles.monthDot, { backgroundColor: palette.tint }]} />
            <ThemedText type="defaultSemiBold" style={[styles.monthTitle, { color: palette.text }]}>
              {group.month}
            </ThemedText>
          </View>
          {group.items.map((entry, idx) => (
            <TimelineEntryRow
              key={entry.id}
              entry={entry}
              isLast={idx === group.items.length - 1}
              palette={palette}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
    borderRadius: Radii.card,
  },
  emptyText: { ...Typography.body },
  monthGroup: {
    marginBottom: Spacing.md,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  monthDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.pill,
  },
  monthTitle: { ...Typography.subheading },
});
