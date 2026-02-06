import { useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii, Typography  , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { AvailabilityTemplate, AvailabilityOverride } from '@/constants/types';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7am to 7pm

const formatHourLabel = (hour: number): string => {
  if (hour === 12) return '12p';
  if (hour > 12) return `${hour - 12}p`;
  return `${hour}a`;
};

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const todayIndex = new Date().getDay();

  // Build lookup for quick cell checks
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

  // Build blocked day lookup for overrides on today's date range
  const blockedDays = useMemo(() => {
    const blocked = new Set<string>();
    for (const o of overrides) {
      if (o.isBlocked) {
        blocked.add(o.date);
      }
    }
    return blocked;
  }, [overrides]);

  const getSlotTemplate = useCallback(
    (day: number, hour: number): AvailabilityTemplate | undefined => {
      return slotLookup.get(`${day}-${hour}`);
    },
    [slotLookup],
  );

  const handlePress = (day: number, hour: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSlotPress(day, hour);
  };

  const handleLongPress = (day: number, hour: number) => {
    const template = getSlotTemplate(day, hour);
    if (template && onSlotLongPress) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSlotLongPress(template);
    }
  };

  // Count slots per day for the header summary
  const dayCounts = useMemo(() => {
    const counts: number[] = [0, 0, 0, 0, 0, 0, 0];
    for (const t of templates) {
      counts[t.dayOfWeek]++;
    }
    return counts;
  }, [templates]);

  return (
    <SurfaceCard style={styles.container}>
      <View style={styles.headerRow}>
        <ThemedText type="defaultSemiBold">Weekly Overview</ThemedText>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: palette.success }]} />
          <ThemedText style={[styles.legendLabel, { color: palette.muted }]}>
            Available
          </ThemedText>
          <ThemedText style={[styles.legendHint, { color: palette.muted }]}>
            Tap to toggle
          </ThemedText>
        </View>
      </View>

      {/* Day column headers */}
      <View style={styles.dayHeaderRow}>
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
                    color: isToday
                      ? palette.tint
                      : hasSlots
                      ? palette.success
                      : palette.muted,
                    fontWeight: isToday ? '700' : '600',
                  },
                ]}
              >
                {day}
              </ThemedText>
              {isToday && (
                <View style={[styles.todayDot, { backgroundColor: palette.tint }]} />
              )}
            </View>
          );
        })}
      </View>

      {/* Scrollable grid body */}
      <ScrollView
        style={styles.gridScroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {HOURS.map((hour) => (
          <View key={hour} style={styles.gridRow}>
            {/* Hour label */}
            <View style={styles.hourLabel}>
              <ThemedText style={[styles.hourText, { color: palette.muted }]}>
                {formatHourLabel(hour)}
              </ThemedText>
            </View>

            {/* Day cells */}
            {DAYS_SHORT.map((_, dayIndex) => {
              const template = getSlotTemplate(dayIndex, hour);
              const isAvailable = !!template;

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
                      borderColor: isAvailable
                        ? withAlpha(palette.success, 0.38)
                        : palette.border,
                    },
                  ]}
                >
                  {isAvailable && (
                    <View
                      style={[styles.cellIndicator, { backgroundColor: palette.success }]}
                    />
                  )}
                </Clickable>
              );
            })}
          </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  legendLabel: {
    ...Typography.caption,
  },
  legendHint: {
    ...Typography.micro,
    fontStyle: 'italic',
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  dayHeaderText: {
    ...Typography.caption,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: Radii.xs,
    marginTop: Spacing.micro,
  },
  gridScroll: {
    maxHeight: 280,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
  },
  hourLabel: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hourText: {
    ...Typography.micro,
    fontSize: 9,
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
