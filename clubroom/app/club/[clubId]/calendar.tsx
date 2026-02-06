import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii, Components, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  clubService,
  type CalendarEvent,
  type CalendarEventType,
} from '@/services/club-service';

// ============================================================================
// HELPERS
// ============================================================================

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDateKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function getEventColor(type: CalendarEventType, palette: typeof Colors.light): string {
  switch (type) {
    case 'session':
      return palette.tint;
    case 'match':
      return palette.error;
    case 'event':
      return palette.success;
    default:
      return palette.muted;
  }
}

// ============================================================================
// EVENT DOT
// ============================================================================

function EventDot({ color }: { color: string }) {
  return <View style={[styles.eventDot, { backgroundColor: color }]} />;
}

// ============================================================================
// DAY CELL
// ============================================================================

function DayCell({
  day,
  isToday,
  isSelected,
  events,
  onPress,
  palette,
}: {
  day: number | null;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
  onPress: () => void;
  palette: typeof Colors.light;
}) {
  if (day === null) {
    return <View style={styles.dayCell} />;
  }

  // Deduplicate event types for dots
  const uniqueTypes = Array.from(new Set(events.map((e) => e.type)));

  return (
    <Clickable
      onPress={onPress}
      accessibilityLabel={`Day ${day}, ${events.length} events`}
      style={{
        ...styles.dayCell,
        backgroundColor: isSelected
          ? palette.tint
          : isToday
            ? withAlpha(palette.tint, 0.09)
            : 'transparent',
        borderRadius: Radii.sm,
      }}
    >
      <ThemedText
        style={{
          ...Typography.body,
          color: isSelected ? Colors.light.onPrimary : isToday ? palette.tint : palette.foreground,
          fontWeight: isToday || isSelected ? '600' : '400',
        }}
      >
        {day}
      </ThemedText>
      <View style={styles.dotsRow}>
        {uniqueTypes.slice(0, 3).map((type) => (
          <EventDot
            key={type}
            color={isSelected ? Colors.light.onPrimary : getEventColor(type, palette)}
          />
        ))}
      </View>
    </Clickable>
  );
}

// ============================================================================
// EVENT LIST ITEM
// ============================================================================

function EventListItem({
  event,
  palette,
}: {
  event: CalendarEvent;
  palette: typeof Colors.light;
}) {
  const typeColor = getEventColor(event.type, palette);
  const typeLabel = event.type.charAt(0).toUpperCase() + event.type.slice(1);

  return (
    <View style={[styles.eventItem, { borderLeftColor: typeColor }]}>
      <View style={styles.eventItemHeader}>
        <View
          style={[
            styles.eventTypePill,
            { backgroundColor: withAlpha(typeColor, 0.09) },
          ]}
        >
          <ThemedText style={{ ...Typography.micro, color: typeColor }}>
            {typeLabel}
          </ThemedText>
        </View>
        <ThemedText style={{ ...Typography.small, color: palette.muted }}>
          {event.startTime} - {event.endTime}
        </ThemedText>
      </View>
      <ThemedText style={{ ...Typography.bodySemiBold, color: palette.foreground }}>
        {event.title}
      </ThemedText>
      {(event.location || event.squadName) && (
        <View style={styles.eventMeta}>
          {event.location ? (
            <View style={styles.eventMetaItem}>
              <Ionicons name="location-outline" size={Components.icon.sm} color={palette.muted} />
              <ThemedText style={{ ...Typography.small, color: palette.muted }}>
                {event.location}
              </ThemedText>
            </View>
          ) : null}
          {event.squadName ? (
            <View style={styles.eventMetaItem}>
              <Ionicons name="people-outline" size={Components.icon.sm} color={palette.muted} />
              <ThemedText style={{ ...Typography.small, color: palette.muted }}>
                {event.squadName}
              </ThemedText>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

// ============================================================================
// SQUAD FILTER
// ============================================================================

function SquadFilter({
  squads,
  selected,
  onSelect,
  palette,
}: {
  squads: { id: string; name: string }[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  palette: typeof Colors.light;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    >
      <Clickable
        onPress={() => onSelect(null)}
        accessibilityLabel="All squads"
        style={{
          paddingHorizontal: Spacing.sm,
          paddingVertical: Spacing.xs / 2,
          borderRadius: Radii.pill,
          backgroundColor: selected === null ? palette.tint : palette.surface,
          borderWidth: 1,
          borderColor: selected === null ? palette.tint : palette.border,
        }}
      >
        <ThemedText
          style={{
            ...Typography.caption,
            color: selected === null ? Colors.light.onPrimary : palette.muted,
          }}
        >
          All
        </ThemedText>
      </Clickable>
      {squads.map((squad) => (
        <Clickable
          key={squad.id}
          onPress={() => onSelect(squad.id === selected ? null : squad.id)}
          accessibilityLabel={`Filter by ${squad.name}`}
          style={{
            paddingHorizontal: Spacing.sm,
            paddingVertical: Spacing.xs / 2,
            borderRadius: Radii.pill,
            backgroundColor: selected === squad.id ? palette.tint : palette.surface,
            borderWidth: 1,
            borderColor: selected === squad.id ? palette.tint : palette.border,
          }}
        >
          <ThemedText
            style={{
              ...Typography.caption,
              color: selected === squad.id ? Colors.light.onPrimary : palette.muted,
            }}
          >
            {squad.name}
          </ThemedText>
        </Clickable>
      ))}
    </ScrollView>
  );
}

// ============================================================================
// MAIN SCREEN
// ============================================================================

export default function CalendarScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [squads, setSquads] = useState<{ id: string; name: string }[]>([]);
  const [squadFilter, setSquadFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load events for the current month
  useEffect(() => {
    if (!clubId) return;
    setLoading(true);
    (async () => {
      try {
        const [calEvents, calSquads] = await Promise.all([
          clubService.getCalendarEvents(clubId, {
            year,
            month,
            squadId: squadFilter ?? undefined,
          }),
          clubService.getCalendarSquads(clubId),
        ]);
        setEvents(calEvents);
        setSquads(calSquads);
      } catch {
        // handled by service
      } finally {
        setLoading(false);
      }
    })();
  }, [clubId, year, month, squadFilter]);

  // Build a map of date -> events
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const event of events) {
      if (!map[event.date]) map[event.date] = [];
      map[event.date].push(event);
    }
    return map;
  }, [events]);

  // Events for the selected day
  const selectedDateKey = selectedDay !== null
    ? formatDateKey(year, month, selectedDay)
    : null;
  const selectedEvents = selectedDateKey ? eventsByDate[selectedDateKey] ?? [] : [];

  // Calendar grid
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDayOfWeek(year, month);
  const totalCells = Math.ceil((daysInMonth + firstDayOfWeek) / 7) * 7;
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const day = i - firstDayOfWeek + 1;
    calendarCells.push(day >= 1 && day <= daysInMonth ? day : null);
  }
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < calendarCells.length; i += 7) {
    weeks.push(calendarCells.slice(i, i + 7));
  }

  const isToday = (day: number) =>
    year === now.getFullYear() && month === now.getMonth() && day === now.getDate();

  const handlePrevMonth = useCallback(() => {
    setSelectedDay(null);
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  }, [month]);

  const handleNextMonth = useCallback(() => {
    setSelectedDay(null);
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  }, [month]);

  return (
    <PageContainer
      header={
        <PageHeader
          title="Calendar"
          showBack
          subtitle={`${MONTH_LABELS[month]} ${year}`}
        />
      }
    >
      {/* Squad Filter */}
      {squads.length > 0 && (
        <SquadFilter
          squads={squads}
          selected={squadFilter}
          onSelect={setSquadFilter}
          palette={palette}
        />
      )}

      {/* Month Navigation */}
      <View style={styles.monthNav}>
        <Clickable
          onPress={handlePrevMonth}
          accessibilityLabel="Previous month"
          style={{
            width: Components.button.height,
            height: Components.button.height,
            borderRadius: Radii.button,
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="chevron-back" size={Components.icon.md} color={palette.foreground} />
        </Clickable>

        <ThemedText style={{ ...Typography.heading, color: palette.foreground }}>
          {MONTH_LABELS[month]} {year}
        </ThemedText>

        <Clickable
          onPress={handleNextMonth}
          accessibilityLabel="Next month"
          style={{
            width: Components.button.height,
            height: Components.button.height,
            borderRadius: Radii.button,
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="chevron-forward" size={Components.icon.md} color={palette.foreground} />
        </Clickable>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <EventDot color={palette.tint} />
          <ThemedText style={{ ...Typography.small, color: palette.muted }}>Session</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <EventDot color={palette.error} />
          <ThemedText style={{ ...Typography.small, color: palette.muted }}>Match</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <EventDot color={palette.success} />
          <ThemedText style={{ ...Typography.small, color: palette.muted }}>Event</ThemedText>
        </View>
      </View>

      {/* Calendar Grid */}
      <SurfaceCard style={styles.calendarCard} tactile={false}>
        {/* Weekday Headers */}
        <View style={styles.weekRow}>
          {WEEKDAY_LABELS.map((label) => (
            <View key={label} style={styles.weekdayCell}>
              <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
                {label}
              </ThemedText>
            </View>
          ))}
        </View>

        {loading ? (
          <View style={styles.calendarLoading}>
            <ActivityIndicator size="small" color={palette.tint} />
          </View>
        ) : (
          weeks.map((week, weekIdx) => (
            <View key={weekIdx} style={styles.weekRow}>
              {week.map((day, dayIdx) => {
                const dateKey = day !== null ? formatDateKey(year, month, day) : '';
                const dayEvents = day !== null ? eventsByDate[dateKey] ?? [] : [];
                return (
                  <DayCell
                    key={dayIdx}
                    day={day}
                    isToday={day !== null && isToday(day)}
                    isSelected={day !== null && day === selectedDay}
                    events={dayEvents}
                    onPress={() => {
                      if (day !== null) setSelectedDay(day);
                    }}
                    palette={palette}
                  />
                );
              })}
            </View>
          ))
        )}
      </SurfaceCard>

      {/* Selected Day Events */}
      {selectedDay !== null && (
        <View style={styles.selectedDaySection}>
          <ThemedText style={{ ...Typography.subheading, color: palette.foreground }}>
            {new Date(year, month, selectedDay).toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </ThemedText>

          {selectedEvents.length > 0 ? (
            selectedEvents.map((event) => (
              <EventListItem key={event.id} event={event} palette={palette} />
            ))
          ) : (
            <View style={styles.emptyDay}>
              <Ionicons name="calendar-outline" size={Components.icon.xl} color={palette.muted} />
              <ThemedText style={{ ...Typography.body, color: palette.muted }}>
                No events on this day
              </ThemedText>
            </View>
          )}
        </View>
      )}
    </PageContainer>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legend: {
    flexDirection: 'row',
    gap: Spacing.md,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  filterRow: {
    gap: Spacing.xs,
    paddingVertical: Spacing.xs / 2,
  },
  calendarCard: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  calendarLoading: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs / 2,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    minHeight: 44,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: Spacing.micro,
    height: 6,
    alignItems: 'center',
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: Radii.xs,
  },
  selectedDaySection: {
    gap: Spacing.sm,
  },
  eventItem: {
    borderLeftWidth: 3,
    paddingLeft: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs / 2,
  },
  eventItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventTypePill: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
  },
  eventMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  emptyDay: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
});
