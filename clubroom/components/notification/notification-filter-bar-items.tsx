import type { ListRenderItemInfo } from 'react-native';

import type { NotificationFilter } from '@/hooks/use-notifications';
import { NotificationFilterItemRow } from './notification-filter-item-row';

const FILTERS: { key: NotificationFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'booking', label: 'Bookings', icon: 'calendar' },
  { key: 'message', label: 'Messages', icon: 'chatbubbles' },
  { key: 'badge', label: 'Badges', icon: 'ribbon' },
  { key: 'review', label: 'Reviews', icon: 'star' },
  { key: 'reminder', label: 'Reminders', icon: 'alarm' },
];

export interface NotificationFilterItem {
  key: NotificationFilter;
  label: string;
  icon: string;
  isActive: boolean;
  onFilterChange: (filter: NotificationFilter) => void;
}

export function getNotificationFilterItems(
  currentFilter: NotificationFilter,
  onFilterChange: (filter: NotificationFilter) => void,
) {
  return FILTERS.map((filter) => ({
    ...filter,
    isActive: currentFilter === filter.key,
    onFilterChange,
  }));
}

export function keyNotificationFilterItem(item: NotificationFilterItem) {
  return item.key;
}

export function renderNotificationFilterItem({ item }: ListRenderItemInfo<NotificationFilterItem>) {
  return <NotificationFilterItemRow item={item} />;
}
