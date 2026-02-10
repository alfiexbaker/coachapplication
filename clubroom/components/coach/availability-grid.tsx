import { useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { AvailabilityTemplate } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { DAYS, HOURS } from './availability-grid-sections';
import { Row } from '@/components/primitives';

// Re-export for backward compat
export { DayScheduleView } from './availability-grid-sections';

interface AvailabilityGridProps {
  templates: AvailabilityTemplate[];
  onSlotPress: (dayOfWeek: number, hour: number) => void;
  onSlotLongPress?: (template: AvailabilityTemplate) => void;
  selectedDay?: number | null;
  onDaySelect?: (dayOfWeek: number | null) => void;
}

export function AvailabilityGrid({
  templates,
  onSlotPress,
  onSlotLongPress,
  selectedDay,
  onDaySelect,
}: AvailabilityGridProps) {
  const { colors: palette } = useTheme();

  const getSlotStatus = useCallback(
    (dayOfWeek: number, hour: number): { available: boolean; template?: AvailabilityTemplate } => {
      const template = templates.find((t) => {
        if (t.dayOfWeek !== dayOfWeek) return false;
        const [startHour] = t.startTime.split(':').map(Number);
        const [endHour] = t.endTime.split(':').map(Number);
        return hour >= startHour && hour < endHour;
      });
      return { available: !!template, template };
    },
    [templates]
  );

  const handleSlotPress = (dayOfWeek: number, hour: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSlotPress(dayOfWeek, hour);
  };

  const handleSlotLongPress = (dayOfWeek: number, hour: number) => {
    const { template } = getSlotStatus(dayOfWeek, hour);
    if (template && onSlotLongPress) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSlotLongPress(template);
    }
  };

  const handleDayPress = (dayOfWeek: number) => {
    if (onDaySelect) {
      onDaySelect(selectedDay === dayOfWeek ? null : dayOfWeek);
    }
  };

  const getDayTemplates = (dayOfWeek: number) => {
    return templates.filter((t) => t.dayOfWeek === dayOfWeek);
  };

  return (
    <View style={styles.container}>
      {/* Day Headers */}
      <Row style={styles.header}>
        <View style={styles.timeColumn} />
        {DAYS.map((day, index) => {
          const dayTemplates = getDayTemplates(index);
          const hasSlots = dayTemplates.length > 0;
          const isSelected = selectedDay === index;

          return (
            <Clickable
              key={day}
              onPress={() => handleDayPress(index)}
              style={[
                styles.dayHeader,
                {
                  backgroundColor: isSelected
                    ? withAlpha(palette.tint, 0.09)
                    : hasSlots
                    ? withAlpha(palette.success, 0.03)
                    : 'transparent',
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.dayText,
                  { color: isSelected ? palette.tint : hasSlots ? palette.success : palette.muted },
                ]}
              >
                {day}
              </ThemedText>
              {hasSlots && <View style={[styles.dayIndicator, { backgroundColor: palette.success }]} />}
            </Clickable>
          );
        })}
      </Row>

      {/* Grid */}
      <ScrollView style={styles.gridScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {HOURS.map((hour) => (
            <Row key={hour} style={styles.row}>
              <View style={styles.timeColumn}>
                <ThemedText style={[styles.timeText, { color: palette.muted }]}>
                  {hour.toString().padStart(2, '0')}:00
                </ThemedText>
              </View>

              {DAYS.map((_, dayIndex) => {
                const { available } = getSlotStatus(dayIndex, hour);
                const isSelected = selectedDay === dayIndex;

                return (
                  <Clickable
                    key={`${dayIndex}-${hour}`}
                    onPress={() => handleSlotPress(dayIndex, hour)}
                    onLongPress={() => handleSlotLongPress(dayIndex, hour)}
                    delayLongPress={500}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: available
                          ? withAlpha(palette.success, 0.12)
                          : isSelected
                          ? withAlpha(palette.tint, 0.03)
                          : palette.surface,
                        borderColor: available ? palette.success : palette.border,
                      },
                    ]}
                  >
                    {available && <View style={[styles.slotIndicator, { backgroundColor: palette.success }]} />}
                  </Clickable>
                );
              })}
            </Row>
          ))}
        </View>
      </ScrollView>

      {/* Legend */}
      <Row style={[styles.legend, { borderTopColor: palette.border }]}>
        <Row style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.success }]} />
          <ThemedText style={[styles.legendText, { color: palette.muted }]}>Available</ThemedText>
        </Row>
        <Row style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.border }]} />
          <ThemedText style={[styles.legendText, { color: palette.muted }]}>Not set</ThemedText>
        </Row>
        <ThemedText style={[styles.legendHint, { color: palette.muted }]}>
          Tap to add, long press to edit
        </ThemedText>
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs },
  timeColumn: { width: 50, alignItems: 'center', justifyContent: 'center' },
  dayHeader: { flex: 1, alignItems: 'center', paddingVertical: Spacing.xs, borderRadius: Radii.sm, marginHorizontal: 1 },
  dayText: { ...Typography.caption },
  dayIndicator: { width: 4, height: 4, borderRadius: Radii.xs, marginTop: Spacing.micro },
  gridScroll: { flex: 1 },
  grid: { paddingHorizontal: Spacing.xs },
  row: { height: 36 },
  timeText: { ...Typography.micro },
  cell: { flex: 1, marginHorizontal: 1, marginVertical: 1, borderRadius: Radii.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  slotIndicator: { width: 6, height: 6, borderRadius: Radii.xs },
  legend: { alignItems: 'center', justifyContent: 'center', gap: Spacing.lg, paddingVertical: Spacing.md, borderTopWidth: 1 },
  legendItem: { alignItems: 'center', gap: Spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: Radii.sm },
  legendText: { ...Typography.caption },
  legendHint: { ...Typography.caption, fontStyle: 'italic' },
});
