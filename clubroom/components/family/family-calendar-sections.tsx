import { memo } from 'react';
import { StyleSheet, View, ScrollView, ViewStyle } from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { FamilyCalendarEvent, FamilyMember } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

// Re-export EventListSection for backward compat
export { EventListSection } from './event-list-section';

// ─── Constants ──────────────────────────────────────────────────────────────

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// ─── ChildFilterRow ─────────────────────────────────────────────────────────

type ChildFilterRowProps = {
  members: FamilyMember[];
  selectedChildId: string | null;
  onChildFilterChange?: (childId: string | null) => void;
  palette: ThemeColors;
};

export const ChildFilterRow = memo(function ChildFilterRow({
  members,
  selectedChildId,
  onChildFilterChange,
  palette,
}: ChildFilterRowProps) {
  if (members.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    >
      <Clickable
        onPress={() => onChildFilterChange?.(null)}
        style={
          [
            styles.filterChip,
            { borderColor: palette.border },
            selectedChildId === null
              ? { backgroundColor: palette.tint, borderColor: palette.tint }
              : undefined,
          ].filter(Boolean) as ViewStyle[]
        }
      >
        <ThemedText
          style={[
            styles.filterChipText,
            selectedChildId === null ? { color: palette.onPrimary } : undefined,
          ]}
        >
          All Children
        </ThemedText>
      </Clickable>
      {members.map((member) => (
        <Clickable
          key={member.id}
          onPress={() => onChildFilterChange?.(member.id)}
          style={
            [
              styles.filterChip,
              { borderColor: member.colorCode },
              selectedChildId === member.id ? { backgroundColor: member.colorCode } : undefined,
            ].filter(Boolean) as ViewStyle[]
          }
        >
          <View
            style={[
              styles.filterDot,
              { backgroundColor: member.colorCode },
              selectedChildId === member.id ? { backgroundColor: palette.surface } : undefined,
            ]}
          />
          <ThemedText
            style={[
              styles.filterChipText,
              selectedChildId === member.id ? { color: palette.onPrimary } : undefined,
            ]}
          >
            {member.name.split(' ')[0]}
          </ThemedText>
        </Clickable>
      ))}
    </ScrollView>
  );
});

// ─── CalendarDayGrid ────────────────────────────────────────────────────────

type CalendarDay = { date: Date | null; isCurrentMonth: boolean };

type CalendarDayGridProps = {
  calendarData: CalendarDay[];
  getEventsForDate: (date: Date | null) => FamilyCalendarEvent[];
  isSelected: (date: Date | null) => boolean;
  isToday: (date: Date | null) => boolean;
  onDateSelect?: (date: Date) => void;
  palette: ThemeColors;
  hasConflictsForDate: (date: Date | null) => boolean;
};

export const CalendarDayGrid = memo(function CalendarDayGrid({
  calendarData,
  getEventsForDate,
  isSelected,
  isToday,
  onDateSelect,
  palette,
  hasConflictsForDate,
}: CalendarDayGridProps) {
  return (
    <Row style={styles.grid}>
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
                selected ? { backgroundColor: palette.tint } : undefined,
                today && !selected ? { borderColor: palette.tint, borderWidth: 1 } : undefined,
              ]}
            >
              {item.date && (
                <ThemedText
                  style={[
                    styles.dayText,
                    selected ? { color: palette.onPrimary } : undefined,
                    !item.isCurrentMonth ? { color: palette.muted } : undefined,
                  ]}
                >
                  {item.date.getDate()}
                </ThemedText>
              )}
            </View>
            {hasEvents && (
              <Row style={styles.eventDots}>
                {dateEvents.slice(0, 3).map((event, i) => (
                  <View key={i} style={[styles.eventDot, { backgroundColor: event.colorCode }]} />
                ))}
                {hasConflictsForDate(item.date) && (
                  <View style={[styles.conflictDot, { backgroundColor: palette.warning }]} />
                )}
              </Row>
            )}
          </Clickable>
        );
      })}
    </Row>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: Spacing.xs, paddingVertical: Spacing.xs },
  filterChip: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  filterDot: { width: 8, height: 8, borderRadius: Radii.xs },
  filterChipText: { ...Typography.smallSemiBold },
  grid: { flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.micro,
  },
  dayContent: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { ...Typography.bodySmallSemiBold },
  eventDots: { gap: Spacing.micro, marginTop: Spacing.micro, position: 'absolute', bottom: Spacing.xxs },
  eventDot: { width: 4, height: 4, borderRadius: Radii.xs },
  conflictDot: { width: 6, height: 6, borderRadius: Radii.xs },
});
