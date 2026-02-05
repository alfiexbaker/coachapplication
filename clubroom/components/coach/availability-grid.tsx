import { useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { AvailabilityTemplate } from '@/constants/types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6am to 8pm

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Calculate which cells have availability
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

  // Get templates for a specific day
  const getDayTemplates = (dayOfWeek: number) => {
    return templates.filter((t) => t.dayOfWeek === dayOfWeek);
  };

  return (
    <View style={styles.container}>
      {/* Day Headers */}
      <View style={styles.header}>
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
                    ? `${palette.tint}15`
                    : hasSlots
                    ? `${palette.success}08`
                    : 'transparent',
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.dayText,
                  {
                    color: isSelected ? palette.tint : hasSlots ? palette.success : palette.muted,
                  },
                ]}
              >
                {day}
              </ThemedText>
              {hasSlots && (
                <View style={[styles.dayIndicator, { backgroundColor: palette.success }]} />
              )}
            </Clickable>
          );
        })}
      </View>

      {/* Grid */}
      <ScrollView style={styles.gridScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {HOURS.map((hour) => (
            <View key={hour} style={styles.row}>
              {/* Time Label */}
              <View style={styles.timeColumn}>
                <ThemedText style={[styles.timeText, { color: palette.muted }]}>
                  {hour.toString().padStart(2, '0')}:00
                </ThemedText>
              </View>

              {/* Day Cells */}
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
                          ? `${palette.success}20`
                          : isSelected
                          ? `${palette.tint}08`
                          : palette.surface,
                        borderColor: available ? palette.success : palette.border,
                      },
                    ]}
                  >
                    {available && (
                      <View
                        style={[styles.slotIndicator, { backgroundColor: palette.success }]}
                      />
                    )}
                  </Clickable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={[styles.legend, { borderTopColor: palette.border }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.success }]} />
          <ThemedText style={[styles.legendText, { color: palette.muted }]}>Available</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: palette.border }]} />
          <ThemedText style={[styles.legendText, { color: palette.muted }]}>Not set</ThemedText>
        </View>
        <ThemedText style={[styles.legendHint, { color: palette.muted }]}>
          Tap to add, long press to edit
        </ThemedText>
      </View>
    </View>
  );
}

interface DayScheduleViewProps {
  dayOfWeek: number;
  templates: AvailabilityTemplate[];
  onEditTemplate: (template: AvailabilityTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onAddTemplate: () => void;
}

export function DayScheduleView({
  dayOfWeek,
  templates,
  onEditTemplate,
  onDeleteTemplate,
  onAddTemplate,
}: DayScheduleViewProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const dayTemplates = templates.filter((t) => t.dayOfWeek === dayOfWeek);

  return (
    <View style={styles.daySchedule}>
      <View style={styles.dayScheduleHeader}>
        <ThemedText type="subtitle">{FULL_DAYS[dayOfWeek]}</ThemedText>
        <Clickable
          onPress={onAddTemplate}
          style={[styles.addButton, { backgroundColor: palette.tint }]}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <ThemedText style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>
            Add Slot
          </ThemedText>
        </Clickable>
      </View>

      {dayTemplates.length === 0 ? (
        <View style={[styles.emptyDay, { backgroundColor: palette.surface }]}>
          <Ionicons name="calendar-outline" size={32} color={palette.muted} />
          <ThemedText style={{ color: palette.muted, marginTop: Spacing.sm }}>
            No availability set for this day
          </ThemedText>
        </View>
      ) : (
        <View style={styles.slotsList}>
          {dayTemplates
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
            .map((template) => (
              <View
                key={template.id}
                style={[styles.slotCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
              >
                <View style={[styles.slotTime, { backgroundColor: `${palette.success}15` }]}>
                  <ThemedText type="defaultSemiBold" style={{ color: palette.success }}>
                    {template.startTime}
                  </ThemedText>
                  <ThemedText style={{ color: palette.muted, fontSize: 12 }}>to</ThemedText>
                  <ThemedText type="defaultSemiBold" style={{ color: palette.success }}>
                    {template.endTime}
                  </ThemedText>
                </View>

                <View style={styles.slotInfo}>
                  {template.location && (
                    <View style={styles.slotDetail}>
                      <Ionicons name="location-outline" size={14} color={palette.muted} />
                      <ThemedText style={[styles.slotDetailText, { color: palette.text }]}>
                        {template.location}
                      </ThemedText>
                    </View>
                  )}
                  <View style={styles.slotDetail}>
                    <Ionicons name="people-outline" size={14} color={palette.muted} />
                    <ThemedText style={[styles.slotDetailText, { color: palette.muted }]}>
                      Max {template.maxConcurrent} booking{template.maxConcurrent !== 1 ? 's' : ''}
                    </ThemedText>
                  </View>
                  <View style={styles.slotDetail}>
                    <Ionicons name="time-outline" size={14} color={palette.muted} />
                    <ThemedText style={[styles.slotDetailText, { color: palette.muted }]}>
                      {template.bufferMinutes} min buffer
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.slotActions}>
                  <Clickable
                    onPress={() => onEditTemplate(template)}
                    style={[styles.slotActionButton, { borderColor: palette.border }]}
                  >
                    <Ionicons name="pencil-outline" size={16} color={palette.tint} />
                  </Clickable>
                  <Clickable
                    onPress={() => onDeleteTemplate(template.id)}
                    style={[styles.slotActionButton, { borderColor: palette.border }]}
                  >
                    <Ionicons name="trash-outline" size={16} color={palette.error} />
                  </Clickable>
                </View>
              </View>
            ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  timeColumn: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    marginHorizontal: 1,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  gridScroll: {
    flex: 1,
  },
  grid: {
    paddingHorizontal: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    height: 36,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  cell: {
    flex: 1,
    marginHorizontal: 1,
    marginVertical: 1,
    borderRadius: Radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
  },
  legendHint: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  daySchedule: {
    gap: Spacing.md,
  },
  dayScheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
  },
  emptyDay: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: Radii.md,
  },
  slotsList: {
    gap: Spacing.sm,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  slotTime: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.sm,
  },
  slotInfo: {
    flex: 1,
    gap: 4,
  },
  slotDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  slotDetailText: {
    fontSize: 13,
  },
  slotActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  slotActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
