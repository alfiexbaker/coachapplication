/**
 * Smart Slots — Heatmap grid visualization.
 */
import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { Spacing, Radii, Typography, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

import type { DayHeatmapData } from './smart-slots-data';
import { getHeatColor, getHeatTextColor } from './smart-slots-data';
import { Row } from '@/components/primitives';

function HeatmapGridInner({ data }: { data: DayHeatmapData[] }) {
  const { colors, scheme } = useTheme();
  const timeLabels = data[0]?.slots.map((s) => s.time) ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }, Shadows[scheme].card]}>
      {/* Time header */}
      <Row style={styles.headerRow}>
        <View style={styles.dayLabelCell} />
        {timeLabels.map((t) => (
          <View key={t} style={styles.timeCell}>
            <Text style={[styles.timeLabel, { color: colors.muted }]}>{t}</Text>
          </View>
        ))}
      </Row>

      {/* Day rows */}
      {data.map((dayData) => (
        <Row key={dayData.day} style={styles.dayRow}>
          <View style={styles.dayLabelCell}>
            <Text style={[styles.dayLabel, { color: colors.muted }]}>{dayData.shortDay}</Text>
          </View>
          {dayData.slots.map((slot) => (
            <View
              key={`${dayData.day}-${slot.time}`}
              style={[styles.heatCell, { backgroundColor: getHeatColor(slot.bookingRate, colors) }]}
            >
              {slot.bookingRate > 0 && (
                <Text
                  style={[styles.heatText, { color: getHeatTextColor(slot.bookingRate, colors) }]}
                >
                  {Math.round(slot.bookingRate * 100)}
                </Text>
              )}
            </View>
          ))}
        </Row>
      ))}

      {/* Legend */}
      <Row style={styles.legend}>
        <Text style={[styles.legendLabel, { color: colors.muted }]}>Less busy</Text>
        {[0.1, 0.3, 0.6, 0.8, 0.95].map((rate) => (
          <View
            key={rate}
            style={[styles.legendSwatch, { backgroundColor: getHeatColor(rate, colors) }]}
          />
        ))}
        <Text style={[styles.legendLabel, { color: colors.muted }]}>More busy</Text>
      </Row>
    </View>
  );
}

export const HeatmapGrid = memo(HeatmapGridInner);

const styles = StyleSheet.create({
  container: { borderRadius: Radii.card, padding: Spacing.sm },
  headerRow: { marginBottom: Spacing.xxs },
  dayLabelCell: { width: 36, justifyContent: 'center' },
  timeCell: { flex: 1, alignItems: 'center' },
  timeLabel: { ...Typography.caption, fontSize: Typography.micro.fontSize },
  dayRow: { marginBottom: Spacing.micro },
  dayLabel: { ...Typography.caption },
  heatCell: {
    flex: 1,
    aspectRatio: 1.4,
    borderRadius: Radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1,
  },
  heatText: { ...Typography.micro },
  legend: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.xs,
  },
  legendLabel: { ...Typography.caption, fontSize: Typography.micro.fontSize },
  legendSwatch: { width: 16, height: 10, borderRadius: Radii.xs },
});
