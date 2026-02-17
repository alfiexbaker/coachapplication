/**
 * NotificationFilterBar — Horizontal scrolling filter bar for notification types.
 *
 * Displays chips for All, Bookings, Messages, Badges, Reviews, Reminders.
 */

import React, { memo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { NotificationDesign } from './notification-design';
import { NotificationFilterChip } from './notification-filter-chip';
import type { NotificationFilter } from '@/hooks/use-notifications';

const FILTERS: { key: NotificationFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'booking', label: 'Bookings', icon: 'calendar' },
  { key: 'message', label: 'Messages', icon: 'chatbubbles' },
  { key: 'badge', label: 'Badges', icon: 'ribbon' },
  { key: 'review', label: 'Reviews', icon: 'star' },
  { key: 'reminder', label: 'Reminders', icon: 'alarm' },
];

interface NotificationFilterBarProps {
  currentFilter: NotificationFilter;
  onFilterChange: (filter: NotificationFilter) => void;
}

export const NotificationFilterBar = memo(function NotificationFilterBar({
  currentFilter,
  onFilterChange,
}: NotificationFilterBarProps) {
  const { colors: palette } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterBar}
    >
      <View
        style={[
          styles.segmentGroup,
          {
            backgroundColor: withAlpha(palette.surface, 0.9),
            borderColor: withAlpha(palette.border, 0.95),
          },
        ]}
      >
        {FILTERS.map((filter) => (
          <NotificationFilterChip
            key={filter.key}
            label={filter.label}
            icon={filter.icon}
            isActive={currentFilter === filter.key}
            onPress={() => onFilterChange(filter.key)}
          />
        ))}
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  filterBar: {
    paddingHorizontal: NotificationDesign.list.horizontalPadding,
    paddingBottom: Spacing.xxs,
  },
  segmentGroup: {
    gap: Spacing.xxs,
    padding: NotificationDesign.filter.groupInset,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
