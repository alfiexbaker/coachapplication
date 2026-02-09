import { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { toDateStr } from '@/utils/format';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import type { FamilyCalendarEvent, FamilyMember } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { DAYS, MONTHS, ChildFilterRow, CalendarDayGrid, EventListSection } from './family-calendar-sections';

// ─── Types ──────────────────────────────────────────────────────────────────

interface FamilyCalendarProps {
  events: FamilyCalendarEvent[];
  members: FamilyMember[];
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  onEventPress?: (event: FamilyCalendarEvent) => void;
  selectedChildId?: string | null;
  onChildFilterChange?: (childId: string | null) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function FamilyCalendar({
  events,
  members,
  selectedDate = new Date(),
  onDateSelect,
  onEventPress,
  selectedChildId = null,
  onChildFilterChange,
}: FamilyCalendarProps) {
  const { colors: palette } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: { date: Date | null; isCurrentMonth: boolean }[] = [];
    for (let i = 0; i < startDay; i++) {
      days.push({ date: null, isCurrentMonth: false });
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    return days;
  }, [currentMonth]);

  const filteredEvents = useMemo(() => {
    if (!selectedChildId) return events;
    return events.filter((e) => e.childId === selectedChildId);
  }, [events, selectedChildId]);

  const getEventsForDate = useCallback(
    (date: Date | null): FamilyCalendarEvent[] => {
      if (!date) return [];
      const dateStr = toDateStr(date);
      return filteredEvents.filter((e) => e.start.split('T')[0] === dateStr);
    },
    [filteredEvents],
  );

  const isSelected = useCallback(
    (date: Date | null): boolean => {
      if (!date || !selectedDate) return false;
      return date.toDateString() === selectedDate.toDateString();
    },
    [selectedDate],
  );

  const isToday = useCallback((date: Date | null): boolean => {
    if (!date) return false;
    return date.toDateString() === new Date().toDateString();
  }, []);

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const selectedDateEvents = useMemo(() => getEventsForDate(selectedDate), [selectedDate, getEventsForDate]);

  return (
    <View style={styles.container}>
      <ChildFilterRow members={members} selectedChildId={selectedChildId} onChildFilterChange={onChildFilterChange} palette={palette} />

      <SurfaceCard style={styles.calendarCard}>
        {/* Month navigation */}
        <View style={styles.header}>
          <Clickable accessibilityLabel="Go back" onPress={goToPreviousMonth} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="defaultSemiBold" style={styles.monthTitle}>
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </ThemedText>
          <Clickable accessibilityLabel="Next" onPress={goToNextMonth} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color={palette.text} />
          </Clickable>
        </View>

        {/* Day headers */}
        <View style={styles.dayHeaders}>
          {DAYS.map((day) => (
            <View key={day} style={styles.dayHeaderCell}>
              <ThemedText style={[styles.dayHeaderText, { color: palette.muted }]}>{day}</ThemedText>
            </View>
          ))}
        </View>

        <CalendarDayGrid
          calendarData={calendarData}
          getEventsForDate={getEventsForDate}
          isSelected={isSelected}
          isToday={isToday}
          onDateSelect={onDateSelect}
          palette={palette}
        />
      </SurfaceCard>

      <EventListSection events={selectedDateEvents} selectedDate={selectedDate} onEventPress={onEventPress} palette={palette} />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { gap: Spacing.md },
  calendarCard: { padding: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: Spacing.sm },
  navButton: { padding: Spacing.xs },
  monthTitle: { ...Typography.subheading },
  dayHeaders: { flexDirection: 'row', marginBottom: Spacing.xs },
  dayHeaderCell: { flex: 1, alignItems: 'center', paddingVertical: Spacing.xs },
  dayHeaderText: { ...Typography.caption },
});
