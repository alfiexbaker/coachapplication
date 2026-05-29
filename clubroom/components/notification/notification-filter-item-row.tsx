import { NotificationFilterChip } from './notification-filter-chip';
import type { NotificationFilterItem } from './notification-filter-bar-items';

export function NotificationFilterItemRow({ item }: { item: NotificationFilterItem }) {
  const handlePress = () => {
    item.onFilterChange(item.key);
  };

  return (
    <NotificationFilterChip
      label={item.label}
      icon={item.icon}
      isActive={item.isActive}
      onPress={handlePress}
    />
  );
}
