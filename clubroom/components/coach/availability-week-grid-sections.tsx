import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';
import { DAYS_SHORT } from './availability-week-grid-helpers';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

// ─── GridLegend ─────────────────────────────────────────────────

export interface GridLegendProps {
  palette: ThemeColors;
}

export const GridLegend = function GridLegend({ palette }: GridLegendProps) {
  return (
    <Row style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: palette.success }]} />
      <ThemedText style={[styles.legendLabel, { color: palette.muted }]}>Available</ThemedText>
      <ThemedText style={[styles.legendHint, { color: palette.muted }]}>Tap to toggle</ThemedText>
    </Row>
  );
};

// ─── DayColumnHeaders ───────────────────────────────────────────

export interface DayColumnHeadersProps {
  todayIndex: number;
  dayCounts: number[];
  palette: ThemeColors;
}

export const DayColumnHeaders = function DayColumnHeaders({
  todayIndex,
  dayCounts,
  palette,
}: DayColumnHeadersProps) {
  return (
    <Row style={styles.dayHeaderRow}>
      <View style={styles.hourLabel} />
      {DAYS_SHORT.map((day, i) => {
        const isToday = i === todayIndex;
        const hasSlots = dayCounts[i] > 0;
        return (
          <View key={day} style={styles.dayHeaderCell}>
            <ThemedText
              style={[
                styles.dayHeaderText,
                {
                  color: isToday ? palette.tint : hasSlots ? palette.success : palette.muted,
                  fontWeight: isToday ? '700' : '600',
                },
              ]}
            >
              {day}
            </ThemedText>
            {isToday && <View style={[styles.todayDot, { backgroundColor: palette.tint }]} />}
          </View>
        );
      })}
    </Row>
  );
};

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  legendRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  legendLabel: { ...Typography.caption },
  legendHint: { ...Typography.micro, fontStyle: 'italic' },
  dayHeaderRow: {
    alignItems: 'center',
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  dayHeaderText: { ...Typography.caption },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: Radii.xs,
    marginTop: Spacing.micro,
  },
  hourLabel: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
