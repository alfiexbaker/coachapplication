/**
 * EventListSection — Renders the list of events for a selected calendar day.
 * Includes per-event conflict indicators when schedule overlaps are detected.
 *
 * Extracted from family-calendar-sections.tsx for file size budget.
 */

import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { FamilyCalendarEvent, ConflictsByEventId } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';
import type { ChildInfo } from '@/types/child-context';
import { Row } from '@/components/primitives';

// ─── Types ──────────────────────────────────────────────────────────────────

type EventListSectionProps = {
  events: FamilyCalendarEvent[];
  selectedDate: Date;
  onEventPress?: (event: FamilyCalendarEvent) => void;
  palette: ThemeColors;
  conflictsByEventId?: ConflictsByEventId;
  getChildById?: (childId: string) => ChildInfo | undefined;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const EventListSection = memo(function EventListSection({
  events,
  selectedDate,
  onEventPress,
  palette,
  conflictsByEventId,
  getChildById,
}: EventListSectionProps) {
  if (events.length === 0) return null;

  return (
    <View style={styles.eventsSection}>
      <ThemedText type="defaultSemiBold" style={styles.eventsSectionTitle}>
        {selectedDate.toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })}
      </ThemedText>
      {events.map((event) => (
        <Clickable key={event.id} onPress={() => onEventPress?.(event)}>
          <SurfaceCard style={styles.eventCard}>
            <View style={[styles.eventColorBar, { backgroundColor: event.colorCode }]} />
            <View style={styles.eventContent}>
              <Row style={styles.eventHeader}>
                <ThemedText type="defaultSemiBold">{event.title}</ThemedText>
                <ThemedText style={[styles.eventTime, { color: palette.muted }]}>
                  {new Date(event.start).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </ThemedText>
              </Row>
              <Row style={styles.eventMeta}>
                <Row style={styles.eventMetaItem}>
                  <Ionicons name="person" size={12} color={palette.muted} />
                  <ThemedText style={[styles.eventMetaText, { color: palette.muted }]}>
                    {event.childId}
                  </ThemedText>
                </Row>
                {event.coachId && (
                  <Row style={styles.eventMetaItem}>
                    <Ionicons name="school" size={12} color={palette.muted} />
                    <ThemedText style={[styles.eventMetaText, { color: palette.muted }]}>
                      {event.coachId}
                    </ThemedText>
                  </Row>
                )}
                {event.location && (
                  <Row style={styles.eventMetaItem}>
                    <Ionicons name="location" size={12} color={palette.muted} />
                    <ThemedText style={[styles.eventMetaText, { color: palette.muted }]}>
                      {event.location}
                    </ThemedText>
                  </Row>
                )}
              </Row>
              {(() => {
                const eventConflicts = conflictsByEventId?.get(event.id);
                if (!eventConflicts || eventConflicts.length === 0) return null;
                const conflict = eventConflicts[0];
                const otherEvent =
                  conflict.eventA.id === event.id ? conflict.eventB : conflict.eventA;
                const otherChild = getChildById?.(otherEvent.childId);
                const otherName = otherChild?.name ?? 'another child';
                return (
                  <Row
                    style={[styles.conflictRow, { backgroundColor: withAlpha(palette.warning, 0.08) }]}
                    align="center"
                    gap="xxs"
                  >
                    <Ionicons name="warning" size={14} color={palette.warning} />
                    <ThemedText style={[styles.conflictText, { color: palette.warning }]}>
                      Overlaps with {otherName}&apos;s {otherEvent.title}
                    </ThemedText>
                  </Row>
                );
              })()}
            </View>
          </SurfaceCard>
        </Clickable>
      ))}
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  eventsSection: { gap: Spacing.sm },
  eventsSectionTitle: { ...Typography.bodySmall },
  eventCard: { flexDirection: 'row', overflow: 'hidden' },
  eventColorBar: { width: 4 },
  eventContent: { flex: 1, padding: Spacing.sm, gap: Spacing.xxs },
  eventHeader: { justifyContent: 'space-between', alignItems: 'center' },
  eventTime: { ...Typography.small },
  eventMeta: { flexWrap: 'wrap', gap: Spacing.sm },
  eventMetaItem: { alignItems: 'center', gap: Spacing.xxs },
  eventMetaText: { ...Typography.caption },
  conflictRow: {
    marginTop: Spacing.xxs,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radii.sm,
  },
  conflictText: { ...Typography.caption, flex: 1 },
});
