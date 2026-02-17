/**
 * NotificationFilterBar — Horizontal scrolling filter bar for notification types.
 *
 * Displays chips for All, Bookings, Messages, Badges, Reviews, Reminders.
 */

import React, { memo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
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
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollView}
      contentContainerStyle={styles.filterBar}
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
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 0,
  },
  filterBar: {
    paddingHorizontal: NotificationDesign.list.horizontalPadding,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
    alignItems: 'center',
  },
});
