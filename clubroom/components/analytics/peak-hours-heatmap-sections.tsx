import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

// ─── Constants ──────────────────────────────────────────────────

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const HOUR_START = 6;
export const HOUR_END = 21;

// ─── Helpers ────────────────────────────────────────────────────

export function formatHour(hour: number): string {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
}

export function getIntensityColor(intensity: number, palette: ThemeColors): string {
  if (intensity === 0) return palette.border;
  if (intensity < 0.25) return withAlpha(palette.tint, 0.19);
  if (intensity < 0.5) return withAlpha(palette.tint, 0.31);
  if (intensity < 0.75) return withAlpha(palette.tint, 0.5);
  return palette.tint;
}

// ─── HeatmapSummary ─────────────────────────────────────────────

export interface HeatmapSummaryProps {
  busiestDay?: { dayName: string; sessionCount: number };
  busiestHour?: { hour: number; sessionCount: number };
  palette: ThemeColors;
}

export const HeatmapSummary = memo(function HeatmapSummary({
  busiestDay,
  busiestHour,
  palette,
}: HeatmapSummaryProps) {
  if (!busiestDay && !busiestHour) return null;

  return (
    <Row style={styles.summaryRow}>
      {busiestDay && (
        <View style={styles.summaryItem}>
          <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
            Busiest Day
          </ThemedText>
          <ThemedText style={styles.summaryValue}>{busiestDay.dayName}</ThemedText>
          <ThemedText style={[styles.summaryDetail, { color: palette.muted }]}>
            {busiestDay.sessionCount} sessions
          </ThemedText>
        </View>
      )}
      {busiestHour && (
        <View style={styles.summaryItem}>
          <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
            Busiest Hour
          </ThemedText>
          <ThemedText style={styles.summaryValue}>{formatHour(busiestHour.hour)}</ThemedText>
          <ThemedText style={[styles.summaryDetail, { color: palette.muted }]}>
            {busiestHour.sessionCount} sessions
          </ThemedText>
        </View>
      )}
    </Row>
  );
});

// ─── HeatmapLegend ──────────────────────────────────────────────

export interface HeatmapLegendProps {
  palette: ThemeColors;
}

export const HeatmapLegend = memo(function HeatmapLegend({ palette }: HeatmapLegendProps) {
  return (
    <Row style={styles.legend}>
      <ThemedText style={[styles.legendLabel, { color: palette.muted }]}>Less</ThemedText>
      <Row style={styles.legendScale}>
        {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
          <View
            key={intensity}
            style={[
              styles.legendCell,
              { backgroundColor: getIntensityColor(intensity, palette) },
            ]}
          />
        ))}
      </Row>
      <ThemedText style={[styles.legendLabel, { color: palette.muted }]}>More</ThemedText>
    </Row>
  );
});

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  summaryRow: {
    marginBottom: Spacing.md,
    gap: Spacing.lg,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.micro,
  },
  summaryValue: { ...Typography.heading },
  summaryDetail: { ...Typography.caption, marginTop: Spacing.micro },
  legend: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  legendLabel: { ...Typography.micro },
  legendScale: {
    gap: Spacing.micro,
  },
  legendCell: {
    width: 16,
    height: 12,
    borderRadius: Radii.xs,
  },
});
