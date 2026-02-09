import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { PeakHoursData } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

// Re-export extracted components for backward compat
export {
  DAY_LABELS, HOUR_START, HOUR_END,
  formatHour, getIntensityColor,
  HeatmapSummary, HeatmapLegend,
} from './peak-hours-heatmap-sections';
export type { HeatmapSummaryProps, HeatmapLegendProps } from './peak-hours-heatmap-sections';

import {
  DAY_LABELS, HOUR_START, HOUR_END,
  formatHour, getIntensityColor,
  HeatmapSummary, HeatmapLegend,
} from './peak-hours-heatmap-sections';

export interface PeakHoursHeatmapProps {
  data: PeakHoursData[];
  title?: string;
  subtitle?: string;
  busiestDay?: { dayName: string; sessionCount: number };
  busiestHour?: { hour: number; sessionCount: number };
  loading?: boolean;
  onPress?: () => void;
}

export function PeakHoursHeatmap({
  data,
  title = 'Peak Hours',
  subtitle,
  busiestDay,
  busiestHour,
  loading = false,
  onPress,
}: PeakHoursHeatmapProps) {
  const { colors: palette } = useTheme();

  const dataMap = new Map<string, PeakHoursData>();
  data.forEach((d) => {
    dataMap.set(`${d.dayOfWeek}-${d.hour}`, d);
  });

  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

  return (
    <SurfaceCard
      style={styles.card}
      loading={loading}
      onPress={onPress}
      tactile={!!onPress}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="time" size={20} color={palette.tint} />
          <ThemedText style={styles.title}>{title}</ThemedText>
        </View>
        {subtitle && (
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            {subtitle}
          </ThemedText>
        )}
      </View>

      <HeatmapSummary busiestDay={busiestDay} busiestHour={busiestHour} palette={palette} />

      {/* Heatmap grid */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.gridContainer}>
          {/* Header row with hour labels */}
          <View style={styles.headerRow}>
            <View style={styles.cornerCell} />
            {hours.map((hour) => (
              <View key={hour} style={styles.hourLabel}>
                <ThemedText style={[styles.hourText, { color: palette.muted }]}>
                  {formatHour(hour)}
                </ThemedText>
              </View>
            ))}
          </View>

          {/* Day rows */}
          {DAY_LABELS.map((dayLabel, dayIndex) => (
            <View key={dayLabel} style={styles.dayRow}>
              <View style={styles.dayLabel}>
                <ThemedText style={[styles.dayText, { color: palette.muted }]}>
                  {dayLabel}
                </ThemedText>
              </View>
              {hours.map((hour) => {
                const cellData = dataMap.get(`${dayIndex}-${hour}`);
                const intensity = cellData?.intensity ?? 0;
                const sessionCount = cellData?.sessionCount ?? 0;
                return (
                  <View
                    key={hour}
                    style={[
                      styles.cell,
                      { backgroundColor: getIntensityColor(intensity, palette) },
                    ]}
                  >
                    {sessionCount > 0 && (
                      <ThemedText
                        style={[
                          styles.cellText,
                          { color: intensity > 0.5 ? palette.onPrimary : palette.text },
                        ]}
                      >
                        {sessionCount}
                      </ThemedText>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      <HeatmapLegend palette={palette} />
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
  },
  header: {
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: { ...Typography.subheading },
  subtitle: { ...Typography.small, marginTop: Spacing.xxs },
  gridContainer: {
    paddingVertical: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xxs,
  },
  cornerCell: {
    width: 36,
    marginRight: Spacing.xxs,
  },
  hourLabel: {
    width: 28,
    marginHorizontal: Spacing.micro,
    alignItems: 'center',
  },
  hourText: { ...Typography.micro },
  dayRow: {
    flexDirection: 'row',
    marginVertical: Spacing.micro,
  },
  dayLabel: {
    width: 36,
    marginRight: Spacing.xxs,
    justifyContent: 'center',
  },
  dayText: { ...Typography.caption },
  cell: {
    width: 28,
    height: 24,
    marginHorizontal: Spacing.micro,
    borderRadius: Radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: { ...Typography.micro },
});
