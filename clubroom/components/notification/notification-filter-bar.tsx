/**
 * NotificationFilterBar — Horizontal scrolling filter bar for notification types.
 *
 * Displays chips for All, Bookings, Messages, Badges, Reviews, Reminders.
 */

import React from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { NotificationDesign } from './notification-design';
import type { NotificationFilter } from '@/hooks/use-notifications';
import {
  getNotificationFilterItems,
  keyNotificationFilterItem,
  renderNotificationFilterItem,
} from './notification-filter-bar-items';

interface NotificationFilterBarProps {
  currentFilter: NotificationFilter;
  onFilterChange: (filter: NotificationFilter) => void;
}

export const NotificationFilterBar = function NotificationFilterBar({
  currentFilter,
  onFilterChange,
}: NotificationFilterBarProps) {
  const filterItems = getNotificationFilterItems(currentFilter, onFilterChange);

  return (
    <FlatList
      horizontal
      data={filterItems}
      keyExtractor={keyNotificationFilterItem}
      renderItem={renderNotificationFilterItem}
      showsHorizontalScrollIndicator={false}
      style={styles.scrollView}
      contentContainerStyle={styles.filterBar}
    />
  );
};

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
