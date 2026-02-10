import { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { DAYS_OF_WEEK, type CalendarDay } from '@/hooks/use-availability-calendar';
import type { AvailabilitySlot } from '@/constants/types';
import { Row } from '@/components/primitives';

interface CalendarGridProps {
  calendarDays: CalendarDay[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}

export const CalendarGrid = memo(function CalendarGrid({ calendarDays, selectedDate, onSelectDate }: CalendarGridProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.calendar}>
      <Row style={styles.weekHeader}>
        {DAYS_OF_WEEK.map(day => (
          <View key={day} style={styles.dayHeaderCell}>
            <ThemedText style={[styles.dayHeaderText, { color: palette.muted }]}>{day}</ThemedText>
          </View>
        ))}
      </Row>
      <Row style={styles.daysGrid}>
        {calendarDays.map((day, index) => {
          const isSelected = selectedDate?.toDateString() === day.date.toDateString();
          return (
            <Pressable key={index} onPress={() => onSelectDate(day.date)}
              style={[styles.dayCell, !day.isCurrentMonth && styles.otherMonthDay, isSelected && { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
              <ThemedText style={[styles.dayNumber, !day.isCurrentMonth && { color: palette.muted }, day.isToday && { color: palette.tint, fontWeight: '700' }, isSelected && { color: palette.tint }]}>
                {day.dayOfMonth}
              </ThemedText>
              <Row style={styles.indicators}>
                {day.isBlocked && <View style={[styles.indicator, { backgroundColor: palette.error }]} />}
                {day.hasAvailability && !day.isBlocked && <View style={[styles.indicator, { backgroundColor: palette.success }]} />}
                {day.bookingCount > 0 && <View style={[styles.indicator, { backgroundColor: palette.tint }]} />}
              </Row>
            </Pressable>
          );
        })}
      </Row>
    </SurfaceCard>
  );
});

interface DayDetailProps {
  selectedDate: Date;
  selectedSlots: AvailabilitySlot[];
  formatTime: (time: string) => string;
  onBlockDate: () => void;
  onAddTemplate: () => void;
}

export const CalendarDayDetail = memo(function CalendarDayDetail({ selectedDate, selectedSlots, formatTime, onBlockDate, onAddTemplate }: DayDetailProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.detailsCard}>
      <Row style={styles.detailsHeader}>
        <ThemedText type="subtitle">{selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</ThemedText>
        <Row style={styles.detailsActions}>
          <Pressable style={[styles.actionButton, { backgroundColor: withAlpha(palette.error, 0.09) }]} onPress={onBlockDate}>
            <Ionicons name="close-circle-outline" size={18} color={palette.error} />
          </Pressable>
          <Pressable style={[styles.actionButton, { backgroundColor: withAlpha(palette.tint, 0.09) }]} onPress={onAddTemplate}>
            <Ionicons name="add-circle-outline" size={18} color={palette.tint} />
          </Pressable>
        </Row>
      </Row>

      {selectedSlots.length === 0 ? (
        <View style={styles.noSlots}>
          <Ionicons name="calendar-outline" size={32} color={palette.muted} />
          <ThemedText style={{ color: palette.muted, marginTop: Spacing.xs }}>No availability set for this day</ThemedText>
        </View>
      ) : (
        <View style={styles.slotsList}>
          {selectedSlots.map((slot, index) => (
            <View key={index} style={[styles.slotItem, { borderLeftColor: slot.isAvailable ? palette.success : palette.tint }]}>
              <Row style={styles.slotTime}>
                <ThemedText type="defaultSemiBold">{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</ThemedText>
                <View style={[styles.slotStatus, { backgroundColor: slot.isAvailable ? withAlpha(palette.success, 0.09) : withAlpha(palette.tint, 0.09) }]}>
                  <ThemedText style={[styles.slotStatusText, { color: slot.isAvailable ? palette.success : palette.tint }]}>
                    {slot.isAvailable ? 'Available' : 'Booked'}
                  </ThemedText>
                </View>
              </Row>
              {slot.location && (
                <Row style={styles.slotLocation}>
                  <Ionicons name="location-outline" size={14} color={palette.muted} />
                  <ThemedText style={[styles.slotLocationText, { color: palette.muted }]}>{slot.location}</ThemedText>
                </Row>
              )}
            </View>
          ))}
        </View>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  calendar: { padding: Spacing.sm },
  weekHeader: { marginBottom: Spacing.xs },
  dayHeaderCell: { flex: 1, alignItems: 'center', paddingVertical: Spacing.xs },
  dayHeaderText: { ...Typography.caption },
  daysGrid: { flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: Radii.sm },
  otherMonthDay: { opacity: 0.4 },
  dayNumber: { ...Typography.bodySmall },
  indicators: { gap: Spacing.micro, marginTop: Spacing.micro, height: 6 },
  indicator: { width: 6, height: 6, borderRadius: Radii.xs },
  detailsCard: { padding: Spacing.md, gap: Spacing.sm },
  detailsHeader: { justifyContent: 'space-between', alignItems: 'center' },
  detailsActions: { gap: Spacing.sm },
  actionButton: { width: 36, height: 36, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  noSlots: { alignItems: 'center', paddingVertical: Spacing.lg },
  slotsList: { gap: Spacing.sm },
  slotItem: { paddingLeft: Spacing.md, paddingVertical: Spacing.sm, borderLeftWidth: 3 },
  slotTime: { alignItems: 'center', justifyContent: 'space-between' },
  slotStatus: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.micro, borderRadius: Radii.sm },
  slotStatusText: { ...Typography.caption },
  slotLocation: { alignItems: 'center', gap: Spacing.xxs, marginTop: Spacing.xxs },
  slotLocationText: { ...Typography.caption },
});
