import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { PeakHoursData } from '@/constants/types';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_START = 6;
const HOUR_END = 21;

export interface PeakHoursHeatmapProps {
  /** Peak hours data for the heatmap */
  data: PeakHoursData[];
  /** Title for the heatmap */
  title?: string;
  /** Subtitle or description */
  subtitle?: string;
  /** Busiest day info */
  busiestDay?: { dayName: string; sessionCount: number };
  /** Busiest hour info */
  busiestHour?: { hour: number; sessionCount: number };
  /** Whether the heatmap is loading */
  loading?: boolean;
  /** Callback when heatmap is pressed */
  onPress?: () => void;
}

/**
 * PeakHoursHeatmap displays a visual grid showing session density
 * by hour and day of week. Helps coaches identify busy times.
 */
export function PeakHoursHeatmap({
  data,
  title = 'Peak Hours',
  subtitle,
  busiestDay,
  busiestHour,
  loading = false,
  onPress,
}: PeakHoursHeatmapProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Build a lookup map for quick access
  const dataMap = new Map<string, PeakHoursData>();
  data.forEach((d) => {
    dataMap.set(`${d.dayOfWeek}-${d.hour}`, d);
  });

  const getIntensityColor = (intensity: number): string => {
    if (intensity === 0) return palette.border;
    if (intensity < 0.25) return palette.tint + '30';
    if (intensity < 0.5) return palette.tint + '50';
    if (intensity < 0.75) return palette.tint + '80';
    return palette.tint;
  };

  const formatHour = (hour: number): string => {
    if (hour === 0) return '12am';
    if (hour === 12) return '12pm';
    if (hour < 12) return `${hour}am`;
    return `${hour - 12}pm`;
  };

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

      {/* Summary stats */}
      {(busiestDay || busiestHour) && (
        <View style={styles.summaryRow}>
          {busiestDay && (
            <View style={styles.summaryItem}>
              <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
                Busiest Day
              </ThemedText>
              <ThemedText style={styles.summaryValue}>
                {busiestDay.dayName}
              </ThemedText>
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
              <ThemedText style={styles.summaryValue}>
                {formatHour(busiestHour.hour)}
              </ThemedText>
              <ThemedText style={[styles.summaryDetail, { color: palette.muted }]}>
                {busiestHour.sessionCount} sessions
              </ThemedText>
            </View>
          )}
        </View>
      )}

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
                      { backgroundColor: getIntensityColor(intensity) },
                    ]}
                  >
                    {sessionCount > 0 && (
                      <ThemedText
                        style={[
                          styles.cellText,
                          { color: intensity > 0.5 ? '#fff' : palette.text },
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

      {/* Legend */}
      <View style={styles.legend}>
        <ThemedText style={[styles.legendLabel, { color: palette.muted }]}>
          Less
        </ThemedText>
        <View style={styles.legendScale}>
          {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
            <View
              key={intensity}
              style={[
                styles.legendCell,
                { backgroundColor: getIntensityColor(intensity) },
              ]}
            />
          ))}
        </View>
        <ThemedText style={[styles.legendLabel, { color: palette.muted }]}>
          More
        </ThemedText>
      </View>
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
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    gap: Spacing.lg,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  summaryDetail: {
    fontSize: 12,
    marginTop: 2,
  },
  gridContainer: {
    paddingVertical: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  cornerCell: {
    width: 36,
    marginRight: 4,
  },
  hourLabel: {
    width: 28,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  hourText: {
    fontSize: 9,
    fontWeight: '500',
  },
  dayRow: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  dayLabel: {
    width: 36,
    marginRight: 4,
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 11,
    fontWeight: '500',
  },
  cell: {
    width: 28,
    height: 24,
    marginHorizontal: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 9,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  legendLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  legendScale: {
    flexDirection: 'row',
    gap: 2,
  },
  legendCell: {
    width: 16,
    height: 12,
    borderRadius: 2,
  },
});
