import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme, type ThemeColors } from '@/hooks/useTheme';
import { WEEKDAY_LABELS, formatDateKey } from '@/hooks/use-club-calendar';
import type { CalendarEvent, CalendarEventType } from '@/services/club-service';
import { Row } from '@/components/primitives';
import { Skeleton } from '@/components/ui/skeleton';

function getEventColor(type: CalendarEventType, colors: ThemeColors): string {
  switch (type) {
    case 'session':
      return colors.tint;
    case 'match':
      return colors.error;
    case 'event':
      return colors.success;
    default:
      return colors.muted;
  }
}

function getWeekKey(year: number, month: number, week: (number | null)[]): string {
  return week.map((day) => (day === null ? 'empty' : formatDateKey(year, month, day))).join('|');
}

function getCalendarCellKey(
  year: number,
  month: number,
  week: (number | null)[],
  day: number | null,
  dayIndex: number,
): string {
  if (day !== null) {
    return formatDateKey(year, month, day);
  }

  const nearestDayIndex = week.findIndex((candidate) => candidate !== null);
  const nearestDay = nearestDayIndex >= 0 ? week[nearestDayIndex] : 1;
  const placeholderDate = new Date(year, month, (nearestDay ?? 1) + dayIndex - nearestDayIndex);
  return `empty-${formatDateKey(
    placeholderDate.getFullYear(),
    placeholderDate.getMonth(),
    placeholderDate.getDate(),
  )}`;
}

interface CalendarGridProps {
  year: number;
  month: number;
  selectedDay: number | null;
  weeks: (number | null)[][];
  eventsByDate: Record<string, CalendarEvent[]>;
  loading: boolean;
  isToday: (day: number) => boolean;
  onSelectDay: (day: number) => void;
}

export const CalendarGrid = function CalendarGrid({
  year,
  month,
  selectedDay,
  weeks,
  eventsByDate,
  loading,
  isToday,
  onSelectDay,
}: CalendarGridProps) {
  const { colors } = useTheme();

  return (
    <SurfaceCard style={styles.card} tactile={false}>
      {/* Weekday headers */}
      <Row style={styles.weekRow}>
        {WEEKDAY_LABELS.map((label) => (
          <View key={label} style={styles.weekdayCell}>
            <ThemedText style={[Typography.caption, { color: colors.muted }]}>{label}</ThemedText>
          </View>
        ))}
      </Row>

      {loading
        ? weeks.map((week) => (
            <Row key={`loading-${getWeekKey(year, month, week)}`} style={styles.weekRow}>
              {week.map((day, dayIdx) => (
                <View
                  key={getCalendarCellKey(year, month, week, day, dayIdx)}
                  style={styles.dayCell}
                >
                  {day === null ? null : (
                    <>
                      <Skeleton
                        width={18}
                        height={16}
                        radius={Radii.xs}
                        accessibilityLabel="Loading calendar day"
                      />
                      <Row style={styles.dotsRow}>
                        <Skeleton width={5} height={5} radius={Radii.xs} />
                        <Skeleton width={5} height={5} radius={Radii.xs} />
                      </Row>
                    </>
                  )}
                </View>
              ))}
            </Row>
          ))
        : weeks.map((week) => (
            <Row key={getWeekKey(year, month, week)} style={styles.weekRow}>
              {week.map((day, dayIdx) => {
                if (day === null) {
                  return (
                    <View
                      key={getCalendarCellKey(year, month, week, day, dayIdx)}
                      style={styles.dayCell}
                    />
                  );
                }

                const dateKey = formatDateKey(year, month, day);
                const dayEvents = eventsByDate[dateKey] ?? [];
                const uniqueTypes = Array.from(new Set(dayEvents.map((e) => e.type)));
                const today = isToday(day);
                const selected = day === selectedDay;

                return (
                  <Clickable
                    key={dateKey}
                    onPress={() => onSelectDay(day)}
                    accessibilityLabel={`Day ${day}, ${dayEvents.length} events`}
                    style={[
                      styles.dayCell,
                      {
                        backgroundColor: selected
                          ? colors.tint
                          : today
                            ? withAlpha(colors.tint, 0.09)
                            : 'transparent',
                        borderRadius: Radii.sm,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        Typography.body,
                        {
                          color: selected
                            ? colors.onPrimary
                            : today
                              ? colors.tint
                              : colors.foreground,
                          fontWeight: today || selected ? '600' : '400',
                        },
                      ]}
                    >
                      {day}
                    </ThemedText>
                    <Row style={styles.dotsRow}>
                      {uniqueTypes.slice(0, 3).map((type) => (
                        <View
                          key={type}
                          style={[
                            styles.dot,
                            {
                              backgroundColor: selected
                                ? colors.onPrimary
                                : getEventColor(type, colors),
                            },
                          ]}
                        />
                      ))}
                    </Row>
                  </Clickable>
                );
              })}
            </Row>
          ))}
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  card: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.xs },
  weekRow: {},
  weekdayCell: { flex: 1, alignItems: 'center', paddingVertical: Spacing.xs / 2 },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    minHeight: 44,
  },
  dotsRow: { gap: Spacing.micro, height: 6, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: Radii.xs },
});
