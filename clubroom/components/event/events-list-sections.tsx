import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { scaleFont } from '@/utils/scale';
import type { ThemeColors } from '@/hooks/useTheme';

export type EventFilter = 'upcoming' | 'past' | 'all';

type HeaderProps = {
  colors: ThemeColors;
  isCoach: boolean;
  onBack: () => void;
  onCreate: () => void;
};

export const EventsHeader = React.memo(function EventsHeader({ colors, isCoach, onBack, onCreate }: HeaderProps) {
  return (
    <Row align="center" justify="between" style={styles.header}>
      <Row align="center" gap="md" style={styles.headerLeft}>
        <Clickable onPress={onBack} hitSlop={8} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <ThemedText type="title" style={styles.headerTitle}>Club Events</ThemedText>
      </Row>
      {isCoach ? (
        <Clickable accessibilityLabel="Create event" onPress={onCreate} style={[styles.addButton, { backgroundColor: colors.tint }]}>
          <Ionicons name="add" size={24} color={colors.onPrimary} />
        </Clickable>
      ) : null}
    </Row>
  );
});

type FilterProps = {
  colors: ThemeColors;
  filter: EventFilter;
  onChange: (value: EventFilter) => void;
};

export const EventsFilterTabs = React.memo(function EventsFilterTabs({ colors, filter, onChange }: FilterProps) {
  return (
    <Row gap="xs" style={styles.filterRow}>
      {(['upcoming', 'past', 'all'] as EventFilter[]).map((value) => (
        <Clickable
          key={value}
          onPress={() => onChange(value)}
          style={[
            styles.filterTab,
            {
              backgroundColor: filter === value ? colors.tint : 'transparent',
              borderColor: filter === value ? colors.tint : colors.border,
            },
          ]}
        >
          <ThemedText style={[styles.filterTabText, { color: filter === value ? colors.onPrimary : colors.text }]}>
            {value === 'upcoming' ? 'Upcoming' : value === 'past' ? 'Past' : 'All'}
          </ThemedText>
        </Clickable>
      ))}
    </Row>
  );
});

type EmptyProps = {
  colors: ThemeColors;
  filter: EventFilter;
  isCoach: boolean;
  onCreate: () => void;
};

export const EventsListEmptyState = React.memo(function EventsListEmptyState({
  colors,
  filter,
  isCoach,
  onCreate,
}: EmptyProps) {
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
        <Ionicons name="calendar-outline" size={48} color={colors.tint} />
      </View>
      <ThemedText type="subtitle" style={styles.emptyTitle}>No Events Yet</ThemedText>
      <ThemedText style={[styles.emptyText, { color: colors.muted }]}>
        {filter === 'upcoming' ? 'No upcoming events scheduled. Check back soon!' : filter === 'past' ? 'No past events to show.' : 'No events have been created yet.'}
      </ThemedText>
      {isCoach ? <Button onPress={onCreate} style={styles.emptyButton}>Create Event</Button> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerLeft: {},
  headerTitle: {
    ...Typography.display,
    fontSize: scaleFont(Typography.display.fontSize),
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  filterTabText: {
    ...Typography.bodySmallSemiBold,
    fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: Radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    ...Typography.body,
    fontSize: scaleFont(Typography.body.fontSize),
    lineHeight: scaleFont(22),
  },
  emptyButton: {
    marginTop: Spacing.sm,
  },
});
