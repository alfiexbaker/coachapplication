/**
 * NotificationTypeList Component
 *
 * Displays notification types grouped by category, allowing users to
 * toggle individual notification types on/off.
 */

import { View, StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import type {
  NotificationType,
  TypeNotificationPreference,
} from '@/constants/types';
import { NOTIFICATION_CATEGORIES } from '@/constants/types';

// Re-export extracted components for backward compat
export {
  NOTIFICATION_TYPE_LABELS,
  getTypesForCategory,
  CategorySection,
} from './notification-type-list-sections';
export type { CategorySectionProps } from './notification-type-list-sections';

import { getTypesForCategory, CategorySection } from './notification-type-list-sections';

export interface NotificationTypeListProps {
  typePreferences: Partial<Record<NotificationType, TypeNotificationPreference>>;
  onToggle: (type: NotificationType, enabled: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function NotificationTypeList({
  typePreferences,
  onToggle,
  disabled = false,
  loading = false,
}: NotificationTypeListProps) {
  return (
    <View style={styles.container}>
      {NOTIFICATION_CATEGORIES.map((category) => {
        const types = getTypesForCategory(category.id);
        if (types.length === 0) return null;

        return (
          <CategorySection
            key={category.id}
            category={category.id}
            label={category.label}
            description={category.description}
            icon={category.icon}
            types={types}
            typePreferences={typePreferences}
            onToggle={onToggle}
            disabled={disabled}
            loading={loading}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
});

export default NotificationTypeList;
