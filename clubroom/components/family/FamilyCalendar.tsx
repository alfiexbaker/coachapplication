import { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { FamilyCalendarEvent, FamilyMember } from '@/constants/types';

interface FamilyCalendarProps {
  /** Calendar events */
  events: FamilyCalendarEvent[];
  /** Family members for filtering */
  members: FamilyMember[];
  /** Selected date */
  selectedDate?: Date;
  /** Date selection handler */
  onDateSelect?: (date: Date) => void;
  /** Event press handler */
  onEventPress?: (event: FamilyCalendarEvent) => void;
  /** Selected child filter (null = all children) */
  selectedChildId?: string | null;
  /** Child filter change handler */
  onChildFilterChange?: (childId: string | null) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * FamilyCalendar shows all children's sessions in one calendar view.
 * Events are color-coded by child for easy identification.
 */
export function FamilyCalendar({
  events,
  members,
  selectedDate = new Date(),
  onDateSelect,
  onEventPress,
  selectedChildId = null,
  onChildFilterChange,
}: FamilyCalendarProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

  // Get calendar grid data
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: Array<{ date: Date | null; isCurrentMonth: boolean }> = [];

    // Add empty slots for days before the first of the month
    for (let i = 0; i < startDay; i++) {
      days.push({ date: null, isCurrentMonth: false });
    }

    // Add days of the month
    for (let i = 1; i <= totalDays; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    return days;
  }, [currentMonth]);

  // Filter events by selected child
  const filteredEvents = useMemo(() => {
    if (!selectedChildId) return events;
    return events.filter((e) => e.childId === selectedChildId);
  }, [events, selectedChildId]);

  // Get events for a specific date
  const getEventsForDate = useCallback(
    (date: Date | null): FamilyCalendarEvent[] => {
      if (!date) return [];
      const dateStr = date.toISOString().split('T')[0];
      return filteredEvents.filter((e) => e.start.split('T')[0] === dateStr);
    },
    [filteredEvents]
  );

  // Check if date is selected
  const isSelected = useCallback(
    (date: Date | null): boolean => {
      if (!date || !selectedDate) return false;
      return date.toDateString() === selectedDate.toDateString();
    },
    [selectedDate]
  );

  // Check if date is today
  const isToday = useCallback((date: Date | null): boolean => {
    if (!date) return false;
    return date.toDateString() === new Date().toDateString();
  }, []);

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    return getEventsForDate(selectedDate);
  }, [selectedDate, getEventsForDate]);

  return (
    <View style={styles.container}>
      {/* Child Filter */}
      {members.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Clickable
            onPress={() => onChildFilterChange?.(null)}
            style={[
              styles.filterChip,
              { borderColor: palette.border },
              selectedChildId === null && { backgroundColor: palette.tint, borderColor: palette.tint },
            ]}
          >
            <ThemedText
              style={[
                styles.filterChipText,
                selectedChildId === null && { color: '#FFFFFF' },
              ]}
            >
              All Children
            </ThemedText>
          </Clickable>
          {members.map((member) => (
            <Clickable
              key={member.id}
              onPress={() => onChildFilterChange?.(member.id)}
              style={[
                styles.filterChip,
                { borderColor: member.colorCode },
                selectedChildId === member.id && { backgroundColor: member.colorCode },
              ]}
            >
              <View
                style={[
                  styles.filterDot,
                  { backgroundColor: member.colorCode },
                  selectedChildId === member.id && { backgroundColor: '#FFFFFF' },
                ]}
              />
              <ThemedText
                style={[
                  styles.filterChipText,
                  selectedChildId === member.id && { color: '#FFFFFF' },
                ]}
              >
                {member.name.split(' ')[0]}
              </ThemedText>
            </Clickable>
          ))}
        </ScrollView>
      )}

      {/* Calendar Header */}
      <SurfaceCard style={styles.calendarCard}>
        <View style={styles.header}>
          <Clickable onPress={goToPreviousMonth} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="defaultSemiBold" style={styles.monthTitle}>
            {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </ThemedText>
          <Clickable onPress={goToNextMonth} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color={palette.text} />
          </Clickable>
        </View>

        {/* Day Headers */}
        <View style={styles.dayHeaders}>
          {DAYS.map((day) => (
            <View key={day} style={styles.dayHeaderCell}>
              <ThemedText style={[styles.dayHeaderText, { color: palette.muted }]}>
                {day}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.grid}>
          {calendarData.map((item, index) => {
            const dateEvents = getEventsForDate(item.date);
            const hasEvents = dateEvents.length > 0;
            const selected = isSelected(item.date);
            const today = isToday(item.date);

            return (
              <Clickable
                key={index}
                onPress={() => item.date && onDateSelect?.(item.date)}
                disabled={!item.date}
                style={styles.dayCell}
              >
                <View
                  style={[
                    styles.dayContent,
                    selected && { backgroundColor: palette.tint },
                    today && !selected && { borderColor: palette.tint, borderWidth: 1 },
                  ]}
                >
                  {item.date && (
                    <ThemedText
                      style={[
                        styles.dayText,
                        selected && { color: '#FFFFFF' },
                        !item.isCurrentMonth && { color: palette.muted },
                      ]}
                    >
                      {item.date.getDate()}
                    </ThemedText>
                  )}
                </View>
                {/* Event Dots */}
                {hasEvents && (
                  <View style={styles.eventDots}>
                    {dateEvents.slice(0, 3).map((event, i) => (
                      <View
                        key={i}
                        style={[styles.eventDot, { backgroundColor: event.colorCode }]}
                      />
                    ))}
                  </View>
                )}
              </Clickable>
            );
          })}
        </View>
      </SurfaceCard>

      {/* Selected Date Events */}
      {selectedDateEvents.length > 0 && (
        <View style={styles.eventsSection}>
          <ThemedText type="defaultSemiBold" style={styles.eventsSectionTitle}>
            {selectedDate.toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </ThemedText>
          {selectedDateEvents.map((event) => (
            <Clickable
              key={event.id}
              onPress={() => onEventPress?.(event)}
            >
              <SurfaceCard style={styles.eventCard}>
                <View
                  style={[styles.eventColorBar, { backgroundColor: event.colorCode }]}
                />
                <View style={styles.eventContent}>
                  <View style={styles.eventHeader}>
                    <ThemedText type="defaultSemiBold">{event.title}</ThemedText>
                    <ThemedText style={[styles.eventTime, { color: palette.muted }]}>
                      {new Date(event.start).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </ThemedText>
                  </View>
                  <View style={styles.eventMeta}>
                    <View style={styles.eventMetaItem}>
                      <Ionicons name="person" size={12} color={palette.muted} />
                      <ThemedText style={[styles.eventMetaText, { color: palette.muted }]}>
                        {event.childName}
                      </ThemedText>
                    </View>
                    {event.coachName && (
                      <View style={styles.eventMetaItem}>
                        <Ionicons name="school" size={12} color={palette.muted} />
                        <ThemedText style={[styles.eventMetaText, { color: palette.muted }]}>
                          {event.coachName}
                        </ThemedText>
                      </View>
                    )}
                    {event.location && (
                      <View style={styles.eventMetaItem}>
                        <Ionicons name="location" size={12} color={palette.muted} />
                        <ThemedText style={[styles.eventMetaText, { color: palette.muted }]}>
                          {event.location}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              </SurfaceCard>
            </Clickable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  calendarCard: {
    padding: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.sm,
  },
  navButton: {
    padding: Spacing.xs,
  },
  monthTitle: {
    fontSize: 16,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayContent: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  eventDots: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
    position: 'absolute',
    bottom: 4,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  eventsSection: {
    gap: Spacing.sm,
  },
  eventsSectionTitle: {
    fontSize: 14,
  },
  eventCard: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  eventColorBar: {
    width: 4,
  },
  eventContent: {
    flex: 1,
    padding: Spacing.sm,
    gap: 6,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTime: {
    fontSize: 13,
  },
  eventMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventMetaText: {
    fontSize: 12,
  },
});
