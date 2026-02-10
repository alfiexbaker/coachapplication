/**
 * Club Calendar Screen
 *
 * Monthly calendar view with sessions, matches, and events.
 * Supports squad filtering and day-level event listing.
 */

import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { CalendarGrid } from '@/components/club/calendar-grid';
import { CalendarEventList } from '@/components/club/calendar-event-list';
import { CalendarSquadFilter } from '@/components/club/calendar-squad-filter';
import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useClubCalendar, MONTH_LABELS } from '@/hooks/use-club-calendar';

export default function CalendarScreen() {
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const {
    year, month, selectedDay, setSelectedDay,
    loading, squads, squadFilter, setSquadFilter,
    eventsByDate, selectedEvents, weeks,
    isToday, handlePrevMonth, handleNextMonth,
  } = useClubCalendar();

  return (
    <PageContainer header={<PageHeader title="Calendar" showBack subtitle={`${MONTH_LABELS[month]} ${year}`} />}>
      {squads.length > 0 && (
        <CalendarSquadFilter squads={squads} selected={squadFilter} onSelect={setSquadFilter} />
      )}

      {/* Month Navigation */}
      <Row align="center" justify="space-between">
        <Clickable onPress={handlePrevMonth} accessibilityLabel="Previous month" style={[styles.navButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="chevron-back" size={Components.icon.md} color={colors.foreground} />
        </Clickable>
        <ThemedText style={[Typography.heading, { color: colors.foreground }]}>
          {MONTH_LABELS[month]} {year}
        </ThemedText>
        <Clickable onPress={handleNextMonth} accessibilityLabel="Next month" style={[styles.navButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="chevron-forward" size={Components.icon.md} color={colors.foreground} />
        </Clickable>
      </Row>

      {/* Legend */}
      <Row gap="md" justify="center">
        <LegendItem color={colors.tint} label="Session" />
        <LegendItem color={colors.error} label="Match" />
        <LegendItem color={colors.success} label="Event" />
      </Row>

      {/* Calendar Grid */}
      <CalendarGrid
        year={year} month={month} selectedDay={selectedDay}
        weeks={weeks} eventsByDate={eventsByDate} loading={loading}
        isToday={isToday} onSelectDay={setSelectedDay}
      />

      {/* Selected Day Events */}
      {selectedDay !== null && (
        <CalendarEventList year={year} month={month} selectedDay={selectedDay} events={selectedEvents} />
      )}
    </PageContainer>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  return (
    <Row gap="xxs" align="center">
      <View style={[styles.dot, { backgroundColor: color }]} />
      <ThemedText style={[Typography.small, { color: colors.muted }]}>{label}</ThemedText>
    </Row>
  );
}

const styles = StyleSheet.create({
  navButton: { width: Components.button.height, height: Components.button.height, borderRadius: Radii.button, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: Radii.xs },
});
