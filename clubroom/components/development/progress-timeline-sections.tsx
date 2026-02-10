import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { useTheme, ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

// ─── Types ──────────────────────────────────────────────────────

export type TimelineEntryType = 'session' | 'badge' | 'goal' | 'skill_change';

export interface TimelineEntry {
  id: string;
  type: TimelineEntryType;
  title: string;
  description: string;
  date: string;
}

// ─── Helpers ────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function groupByMonth(
  entries: TimelineEntry[],
): { month: string; items: TimelineEntry[] }[] {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const groups = new Map<string, TimelineEntry[]>();
  sorted.forEach((entry) => {
    const d = new Date(entry.date);
    const key = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  });

  return Array.from(groups.entries()).map(([month, items]) => ({ month, items }));
}

export function getEntryIcon(
  type: TimelineEntryType,
): { name: keyof typeof Ionicons.glyphMap; colorKey: 'success' | 'warning' | 'tint' | 'muted' } {
  switch (type) {
    case 'session': return { name: 'football-outline', colorKey: 'success' };
    case 'badge': return { name: 'ribbon-outline', colorKey: 'warning' };
    case 'goal': return { name: 'flag-outline', colorKey: 'tint' };
    case 'skill_change': return { name: 'trending-up-outline', colorKey: 'success' };
    default: return { name: 'ellipse', colorKey: 'muted' };
  }
}

export function getDotColor(type: TimelineEntryType, palette: ThemeColors): string {
  switch (type) {
    case 'session': return palette.success;
    case 'badge': return palette.warning;
    case 'goal': return palette.tint;
    case 'skill_change': return palette.success;
    default: return palette.muted;
  }
}

// ─── TimelineEntryRow ───────────────────────────────────────────

export interface TimelineEntryRowProps {
  entry: TimelineEntry;
  isLast: boolean;
  palette: ThemeColors;
}

export const TimelineEntryRow = memo(function TimelineEntryRow({
  entry,
  isLast,
  palette,
}: TimelineEntryRowProps) {
  const icon = getEntryIcon(entry.type);
  const dotColor = getDotColor(entry.type, palette);

  return (
    <Row style={styles.entryRow}>
      <View style={styles.spine}>
        <View style={[styles.dot, { backgroundColor: dotColor }]}>
          <Ionicons name={icon.name} size={12} color={palette.surface} />
        </View>
        {!isLast && (
          <View style={[styles.connector, { backgroundColor: palette.border }]} />
        )}
      </View>
      <View
        style={[
          styles.entryContent,
          { backgroundColor: palette.surface, borderColor: palette.border },
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
    </Row>
  );
});

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  entryRow: {
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
  entryTitle: { ...Typography.bodySemiBold },
  entryDescription: { ...Typography.small },
  entryDate: { ...Typography.caption, marginTop: Spacing.xs / 2 },
});
