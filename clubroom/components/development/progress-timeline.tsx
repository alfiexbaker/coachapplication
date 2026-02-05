import { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/* ---------- Types ---------- */

export type TimelineEntryType = 'session' | 'badge' | 'goal' | 'skill_change';

export interface TimelineEntry {
  id: string;
  type: TimelineEntryType;
  title: string;
  description: string;
  date: string; // ISO date string
}

export interface ProgressTimelineProps {
  entries: TimelineEntry[];
}

/* ---------- Helpers ---------- */

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function groupByMonth(
  entries: TimelineEntry[],
): { month: string; items: TimelineEntry[] }[] {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const groups: Map<string, TimelineEntry[]> = new Map();

  sorted.forEach((entry) => {
    const d = new Date(entry.date);
    const key = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(entry);
  });

  return Array.from(groups.entries()).map(([month, items]) => ({
    month,
    items,
  }));
}

function getEntryIcon(
  type: TimelineEntryType,
): { name: keyof typeof Ionicons.glyphMap; colorKey: 'success' | 'warning' | 'tint' | 'muted' } {
  switch (type) {
    case 'session':
      return { name: 'football-outline', colorKey: 'success' };
    case 'badge':
      return { name: 'ribbon-outline', colorKey: 'warning' };
    case 'goal':
      return { name: 'flag-outline', colorKey: 'tint' };
    case 'skill_change':
      return { name: 'trending-up-outline', colorKey: 'success' };
    default:
      return { name: 'ellipse', colorKey: 'muted' };
  }
}

function getDotColor(type: TimelineEntryType, palette: Palette): string {
  switch (type) {
    case 'session':
      return palette.success;
    case 'badge':
      return palette.warning;
    case 'goal':
      return palette.tint;
    case 'skill_change':
      return palette.success;
    default:
      return palette.muted;
  }
}

type Palette = (typeof Colors)['light'];

/* ---------- Component ---------- */

export function ProgressTimeline({ entries }: ProgressTimelineProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

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
          {/* Month header */}
          <View style={styles.monthHeader}>
            <View style={[styles.monthDot, { backgroundColor: palette.tint }]} />
            <ThemedText
              type="defaultSemiBold"
              style={[styles.monthTitle, { color: palette.text }]}
            >
              {group.month}
            </ThemedText>
          </View>

          {/* Entries */}
          {group.items.map((entry, idx) => {
            const icon = getEntryIcon(entry.type);
            const dotColor = getDotColor(entry.type, palette);
            const isLast = idx === group.items.length - 1;

            return (
              <View key={entry.id} style={styles.entryRow}>
                {/* Timeline spine */}
                <View style={styles.spine}>
                  <View style={[styles.dot, { backgroundColor: dotColor }]}>
                    <Ionicons name={icon.name} size={12} color={palette.surface} />
                  </View>
                  {!isLast && (
                    <View style={[styles.connector, { backgroundColor: palette.border }]} />
                  )}
                </View>

                {/* Content */}
                <View
                  style={[
                    styles.entryContent,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <ThemedText type="defaultSemiBold" style={styles.entryTitle}>
                    {entry.title}
                  </ThemedText>
                  <ThemedText style={[styles.entryDescription, { color: palette.muted }]}>
                    {entry.description}
                  </ThemedText>
                  <ThemedText style={[styles.entryDate, { color: palette.muted }]}>
                    {formatDate(entry.date)}
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

/* ---------- Styles ---------- */

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
  emptyText: {
    ...Typography.body,
  },
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
  monthTitle: {
    ...Typography.subheading,
  },
  entryRow: {
    flexDirection: 'row',
    marginLeft: Spacing.xs,
  },
  spine: {
    alignItems: 'center',
    width: Spacing.lg,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: Spacing.sm,
  },
  entryContent: {
    flex: 1,
    marginLeft: Spacing.sm,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: Spacing.xs / 2,
  },
  entryTitle: {
    ...Typography.bodySemiBold,
  },
  entryDescription: {
    ...Typography.small,
  },
  entryDate: {
    ...Typography.caption,
    marginTop: Spacing.xs / 2,
  },
});
