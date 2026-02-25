import { useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { AvailabilityTemplate, AvailabilityOverride } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import {
  DAYS_SHORT,
  HOURS,
  formatHourLabel,
  GridLegend,
  DayColumnHeaders,
} from './availability-week-grid-sections';
import { Row } from '@/components/primitives';

// Re-export extracted components for backward compat
export {
  DAYS_SHORT,
  HOURS,
  formatHourLabel,
  GridLegend,
  DayColumnHeaders,
} from './availability-week-grid-sections';
export type { GridLegendProps, DayColumnHeadersProps } from './availability-week-grid-sections';

interface AvailabilityWeekGridProps {
  templates: AvailabilityTemplate[];
  overrides?: AvailabilityOverride[];
  onSlotPress: (dayOfWeek: number, hour: number) => void;
  onSlotLongPress?: (template: AvailabilityTemplate) => void;
}

export function AvailabilityWeekGrid({
  templates,
  overrides = [],
  onSlotPress,
  onSlotLongPress,
}: AvailabilityWeekGridProps) {
  const { colors: palette } = useTheme();
  const todayIndex = new Date().getDay();

  const slotLookup = useMemo(() => {
    const lookup = new Map<string, AvailabilityTemplate>();
    for (const t of templates) {
      const [startH] = t.startTime.split(':').map(Number);
      const [endH] = t.endTime.split(':').map(Number);
      for (let h = startH; h < endH; h++) {
        lookup.set(`${t.dayOfWeek}-${h}`, t);
      }
    }
    return lookup;
  }, [templates]);

  const getSlotTemplate = useCallback(
    (day: number, hour: number) => slotLookup.get(`${day}-${hour}`),
    [slotLookup],
  );

  const handlePress = (day: number, hour: number) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSlotPress(day, hour);
  };

  const handleLongPress = (day: number, hour: number) => {
    const template = getSlotTemplate(day, hour);
    if (template && onSlotLongPress) {
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSlotLongPress(template);
    }
  };

  const dayCounts = useMemo(() => {
    const counts: number[] = [0, 0, 0, 0, 0, 0, 0];
    for (const t of templates) counts[t.dayOfWeek]++;
    return counts;
  }, [templates]);

  return (
    <SurfaceCard style={styles.container}>
      <Row style={styles.headerRow}>
        <ThemedText type="defaultSemiBold">Weekly Overview</ThemedText>
        <GridLegend palette={palette} />
      </Row>

      <DayColumnHeaders todayIndex={todayIndex} dayCounts={dayCounts} palette={palette} />

      <ScrollView
        style={styles.gridScroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {HOURS.map((hour) => (
          <Row key={hour} style={styles.gridRow}>
            <View style={styles.hourLabel}>
              <ThemedText style={[styles.hourText, { color: palette.muted }]}>
                {formatHourLabel(hour)}
              </ThemedText>
            </View>
            {DAYS_SHORT.map((_, dayIndex) => {
              const isAvailable = !!getSlotTemplate(dayIndex, hour);
              return (
                <Clickable
                  key={`${dayIndex}-${hour}`}
                  onPress={() => handlePress(dayIndex, hour)}
                  onLongPress={() => handleLongPress(dayIndex, hour)}
                  delayLongPress={500}
                  style={[
                    styles.gridCell,
                    {
                      backgroundColor: isAvailable
                        ? withAlpha(palette.success, 0.15)
                        : palette.background,
                      borderColor: isAvailable ? withAlpha(palette.success, 0.38) : palette.border,
                    },
                  ]}
                >
                  {isAvailable && (
                    <View style={[styles.cellIndicator, { backgroundColor: palette.success }]} />
                  )}
                </Clickable>
              );
            })}
          </Row>
        ))}
      </ScrollView>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  headerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  gridScroll: {
    maxHeight: 280,
  },
  gridRow: {
    alignItems: 'center',
    height: 28,
  },
  hourLabel: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hourText: {
    fontSize: Typography.micro.fontSize,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  gridCell: {
    flex: 1,
    height: 24,
    marginHorizontal: 1,
    marginVertical: 1,
    borderRadius: Radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellIndicator: {
    width: 5,
    height: 5,
    borderRadius: Radii.xs,
  },
});
