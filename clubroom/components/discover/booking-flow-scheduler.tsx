/**
 * BookingFlowScheduler -- Calendar day grid + slot list for session scheduling.
 */
import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatFullDate, formatMonthDay, formatTimeRange, formatWeekday } from '@/utils/format';

import type { DayAvailability, SlotInstance } from './booking-flow-types';

interface BookingFlowSchedulerProps {
  availability: DayAvailability[];
  selectedDayId: string | undefined;
  selectedSlotId: string | undefined;
  onSelectDay: (id: string) => void;
  onSelectSlot: (id: string) => void;
}

function BookingFlowSchedulerInner({ availability, selectedDayId, selectedSlotId, onSelectDay, onSelectSlot }: BookingFlowSchedulerProps) {
  const { colors: palette } = useTheme();
  const selectedDay = availability.find((d) => d.id === selectedDayId);

  const handleDayPress = useCallback((id: string) => onSelectDay(id), [onSelectDay]);
  const handleSlotPress = useCallback((id: string) => onSelectSlot(id), [onSelectSlot]);

  return (
    <SurfaceCard style={styles.schedulerCard}>
      <View style={styles.schedulerHeader}>
        <View>
          <ThemedText type="subtitle">2 {'\u00B7'} Schedule a session</ThemedText>
          <ThemedText style={styles.schedulerSubtitle}>
            Pick a day that works—live calendar sync keeps cancellations low.
          </ThemedText>
        </View>
        <View style={[styles.liveBadge, { backgroundColor: withAlpha(palette.secondary, 0.09) }]}>
          <Ionicons name="time-outline" size={16} color={palette.secondary} />
          <ThemedText style={[styles.badgeLabel, { color: palette.secondary }]}>Live sync</ThemedText>
        </View>
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {availability.map((day) => {
          const isSelected = day.id === selectedDayId;
          const hasSlots = day.slots.length > 0;
          return (
            <Clickable
              key={day.id}
              style={[
                styles.calendarDay,
                { borderColor: isSelected ? palette.tint : palette.border, backgroundColor: isSelected ? withAlpha(palette.tint, 0.07) : palette.surface },
                !hasSlots && { borderStyle: 'dashed' as const, opacity: 0.55 },
              ]}
              accessibilityLabel={`Select ${formatFullDate(day.date)}`}
              onPress={() => handleDayPress(day.id)}>
              <ThemedText style={styles.calendarWeekday}>{formatWeekday(day.date)}</ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.calendarDate}>{formatMonthDay(day.date)}</ThemedText>
              <ThemedText style={styles.calendarMeta}>{hasSlots ? `${day.slots.length} slots` : 'Coach travel'}</ThemedText>
            </Clickable>
          );
        })}
      </View>

      {/* Slot list */}
      <View style={styles.slotList}>
        {selectedDay && selectedDay.slots.length === 0 ? (
          <View style={[styles.emptySlots, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <Ionicons name="airplane-outline" size={20} color={palette.icon} />
            <ThemedText type="defaultSemiBold">Coach on the road</ThemedText>
            <ThemedText style={styles.schedulerSubtitle}>Pick a different day—travel days block scheduling.</ThemedText>
          </View>
        ) : null}
        {selectedDay?.slots.map((slot: SlotInstance) => {
          const isSelected = slot.id === selectedSlotId;
          return (
            <Clickable
              key={slot.id}
              style={[
                styles.slotCard,
                { borderColor: isSelected ? palette.tint : palette.border, backgroundColor: isSelected ? withAlpha(palette.tint, 0.07) : palette.surface },
              ]}
              onPress={() => handleSlotPress(slot.id)}>
              <View style={styles.slotHeader}>
                <ThemedText type="defaultSemiBold">{slot.title}</ThemedText>
                <ThemedText style={styles.slotTime}>{formatTimeRange(slot.start, slot.durationMinutes)}</ThemedText>
              </View>
              <ThemedText style={styles.slotFocus}>{slot.focus}</ThemedText>
              <View style={styles.slotTag}>
                <Ionicons name="radio-outline" size={14} color={palette.secondary} />
                <ThemedText style={[styles.badgeLabel, { color: palette.secondary }]}>{slot.tag}</ThemedText>
              </View>
            </Clickable>
          );
        })}
      </View>
    </SurfaceCard>
  );
}

export const BookingFlowScheduler = memo(BookingFlowSchedulerInner);

const styles = StyleSheet.create({
  schedulerCard: { gap: Spacing.md },
  schedulerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  schedulerSubtitle: { opacity: 0.75, marginTop: Spacing.micro },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, borderRadius: Radii.pill, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs },
  badgeLabel: { ...Typography.caption, textTransform: 'uppercase' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  calendarDay: { flex: 1, minWidth: 90, borderWidth: 1, borderRadius: Radii.md, padding: Spacing.sm, gap: Spacing.micro },
  calendarWeekday: { fontWeight: '600', opacity: 0.75 },
  calendarDate: { ...Typography.heading },
  calendarMeta: { opacity: 0.7 },
  slotList: { gap: Spacing.sm },
  slotCard: { borderWidth: 1, borderRadius: Radii.md, padding: Spacing.sm, gap: Spacing.xs / 2 },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slotTime: { opacity: 0.7 },
  slotFocus: { opacity: 0.85 },
  slotTag: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  emptySlots: { alignItems: 'center', gap: Spacing.xs / 2, padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1 },
});
