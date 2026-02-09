import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import { useTheme, type ThemeColors } from '@/hooks/useTheme';
import type { CalendarEvent, CalendarEventType } from '@/services/club-service';

function getEventColor(type: CalendarEventType, colors: ThemeColors): string {
  switch (type) {
    case 'session': return colors.tint;
    case 'match': return colors.error;
    case 'event': return colors.success;
    default: return colors.muted;
  }
}

interface CalendarEventListProps {
  year: number;
  month: number;
  selectedDay: number;
  events: CalendarEvent[];
}

export const CalendarEventList = memo(function CalendarEventList({ year, month, selectedDay, events }: CalendarEventListProps) {
  const { colors } = useTheme();

  const dateLabel = new Date(year, month, selectedDay).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <View style={styles.section}>
      <ThemedText style={[Typography.subheading, { color: colors.foreground }]}>{dateLabel}</ThemedText>

      {events.length > 0 ? (
        events.map((event) => {
          const typeColor = getEventColor(event.type, colors);
          const typeLabel = event.type.charAt(0).toUpperCase() + event.type.slice(1);

          return (
            <View key={event.id} style={[styles.item, { borderLeftColor: typeColor }]}>
              <Row align="center" justify="space-between">
                <View style={[styles.pill, { backgroundColor: withAlpha(typeColor, 0.09) }]}>
                  <ThemedText style={[Typography.micro, { color: typeColor }]}>{typeLabel}</ThemedText>
                </View>
                <ThemedText style={[Typography.small, { color: colors.muted }]}>
                  {event.startTime} - {event.endTime}
                </ThemedText>
              </Row>
              <ThemedText style={[Typography.bodySemiBold, { color: colors.foreground }]}>{event.title}</ThemedText>
              {(event.location || event.squadName) && (
                <Row gap="md">
                  {event.location && (
                    <Row gap="xxs" align="center">
                      <Ionicons name="location-outline" size={Components.icon.sm} color={colors.muted} />
                      <ThemedText style={[Typography.small, { color: colors.muted }]}>{event.location}</ThemedText>
                    </Row>
                  )}
                  {event.squadName && (
                    <Row gap="xxs" align="center">
                      <Ionicons name="people-outline" size={Components.icon.sm} color={colors.muted} />
                      <ThemedText style={[Typography.small, { color: colors.muted }]}>{event.squadName}</ThemedText>
                    </Row>
                  )}
                </Row>
              )}
            </View>
          );
        })
      ) : (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={Components.icon.xl} color={colors.muted} />
          <ThemedText style={[Typography.body, { color: colors.muted }]}>No events on this day</ThemedText>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  item: { borderLeftWidth: 3, paddingLeft: Spacing.sm, paddingVertical: Spacing.xs, gap: Spacing.xs / 2 },
  pill: { paddingHorizontal: Spacing.xs, paddingVertical: Spacing.micro, borderRadius: Radii.pill },
  empty: { alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.sm },
});
