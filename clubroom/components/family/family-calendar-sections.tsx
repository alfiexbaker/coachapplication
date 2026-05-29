import { StyleSheet, View, FlatList, ViewStyle, type ListRenderItemInfo } from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { FamilyCalendarEvent, FamilyMember } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

// Re-export EventListSection for backward compat
export { EventListSection } from './event-list-section';

// ─── ChildFilterRow ─────────────────────────────────────────────────────────

type ChildFilterRowProps = {
  members: FamilyMember[];
  selectedChildId: string | null;
  onChildFilterChange?: (childId: string | null) => void;
  palette: ThemeColors;
};

export const ChildFilterRow = function ChildFilterRow({
  members,
  selectedChildId,
  onChildFilterChange,
  palette,
}: ChildFilterRowProps) {
  if (members.length <= 1) return null;
  const filterItems = getChildFilterItems(members, selectedChildId, onChildFilterChange, palette);

  return (
    <FlatList
      horizontal
      data={filterItems}
      keyExtractor={keyChildFilterItem}
      renderItem={renderChildFilterItem}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    />
  );
};

interface ChildFilterItem {
  key: string;
  label: string;
  colorCode: string;
  selected: boolean;
  isAll: boolean;
  palette: ThemeColors;
  onPress: () => void;
}

function getChildFilterItems(
  members: FamilyMember[],
  selectedChildId: string | null,
  onChildFilterChange: ((childId: string | null) => void) | undefined,
  palette: ThemeColors,
): ChildFilterItem[] {
  return [
    {
      key: 'all',
      label: 'All Children',
      colorCode: palette.border,
      selected: selectedChildId === null,
      isAll: true,
      palette,
      onPress: () => onChildFilterChange?.(null),
    },
    ...members.map((member) => ({
      key: member.id,
      label: member.name.split(' ')[0],
      colorCode: member.colorCode,
      selected: selectedChildId === member.id,
      isAll: false,
      palette,
      onPress: () => onChildFilterChange?.(member.id),
    })),
  ];
}

function keyChildFilterItem(item: ChildFilterItem) {
  return item.key;
}

function renderChildFilterItem({ item }: ListRenderItemInfo<ChildFilterItem>) {
  return (
    <Clickable
      onPress={item.onPress}
      style={
        [
          styles.filterChip,
          { borderColor: item.isAll ? item.palette.border : item.colorCode },
          item.selected
            ? {
                backgroundColor: item.isAll ? item.palette.tint : item.colorCode,
                borderColor: item.isAll ? item.palette.tint : item.colorCode,
              }
            : undefined,
        ].filter(Boolean) as ViewStyle[]
      }
    >
      {!item.isAll && (
        <View
          style={[
            styles.filterDot,
            { backgroundColor: item.colorCode },
            item.selected ? { backgroundColor: item.palette.surface } : undefined,
          ]}
        />
      )}
      <ThemedText
        style={[
          styles.filterChipText,
          item.selected ? { color: item.palette.onPrimary } : undefined,
        ]}
      >
        {item.label}
      </ThemedText>
    </Clickable>
  );
}

// ─── CalendarDayGrid ────────────────────────────────────────────────────────

type CalendarDay = { date: Date | null; isCurrentMonth: boolean };

function getCalendarDayKey(calendarData: CalendarDay[], item: CalendarDay, dayIndex: number) {
  if (item.date) {
    return item.date.toISOString();
  }

  const nearestDayIndex = calendarData.findIndex((candidate) => candidate.date);
  const nearestDate = calendarData[nearestDayIndex]?.date ?? new Date(0);
  const placeholderDate = new Date(nearestDate);
  placeholderDate.setDate(nearestDate.getDate() + dayIndex - nearestDayIndex);
  return `empty-${placeholderDate.toISOString()}`;
}

type CalendarDayGridProps = {
  calendarData: CalendarDay[];
  getEventsForDate: (date: Date | null) => FamilyCalendarEvent[];
  isSelected: (date: Date | null) => boolean;
  isToday: (date: Date | null) => boolean;
  onDateSelect?: (date: Date) => void;
  palette: ThemeColors;
  hasConflictsForDate: (date: Date | null) => boolean;
};

export const CalendarDayGrid = function CalendarDayGrid({
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
            key={getCalendarDayKey(calendarData, item, index)}
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
                {dateEvents.slice(0, 3).map((event) => (
                  <View
                    key={event.id}
                    style={[styles.eventDot, { backgroundColor: event.colorCode }]}
                  />
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
};

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
  eventDots: {
    gap: Spacing.micro,
    marginTop: Spacing.micro,
    position: 'absolute',
    bottom: Spacing.xxs,
  },
  eventDot: { width: 4, height: 4, borderRadius: Radii.xs },
  conflictDot: { width: 6, height: 6, borderRadius: Radii.xs },
});
