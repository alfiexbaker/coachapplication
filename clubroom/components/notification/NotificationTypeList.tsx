/**
 * NotificationTypeList Component
 *
 * Displays notification types grouped by category, allowing users to
 * toggle individual notification types on/off.
 *
 * Features:
 * - Grouped by category (Bookings, Messages, Badges, etc.)
 * - Expandable sections
 * - Individual type toggles
 * - Visual category icons
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Switch, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type {
  NotificationType,
  NotificationCategory,
  TypeNotificationPreference,
} from '@/constants/types';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TYPE_CATEGORIES,
} from '@/constants/types';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface NotificationTypeListProps {
  /** Current type preferences */
  typePreferences: Partial<Record<NotificationType, TypeNotificationPreference>>;
  /** Callback when a type preference changes */
  onToggle: (type: NotificationType, enabled: boolean) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
}

/**
 * Human-readable labels for notification types
 */
const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  BOOKING_RECEIVED: 'New Booking Requests',
  BOOKING_CONFIRMED: 'Booking Confirmations',
  BOOKING_CANCELLED: 'Booking Cancellations',
  SESSION_REMINDER: 'Session Reminders',
  MESSAGE_RECEIVED: 'New Messages',
  SESSION_INVITE: 'Session Invites',
  SESSION_INVITE_RESPONSE: 'Invite Responses',
  REVIEW_REQUEST: 'Review Requests',
  REVIEW_RECEIVED: 'New Reviews',
  BADGE_AWARDED: 'Badge Awards',
  WAITLIST_AVAILABLE: 'Waitlist Openings',
  PAYMENT_RECEIVED: 'Payment Received',
  PAYMENT_FAILED: 'Payment Issues',
  GOAL_COMPLETED: 'Goal Completions',
  VIDEO_SHARED: 'Shared Videos',
  MATCH_INVITE: 'Match Invites',
  MATCH_RESPONSE: 'Match Responses',
  MATCH_LINEUP: 'Lineup Announcements',
  MATCH_REMINDER: 'Match Reminders',
  MATCH_CANCELLED: 'Match Cancellations',
  NEW_FOLLOWER: 'New Followers',
  FOLLOW_REQUEST: 'Follow Requests',
  FOLLOW_REQUEST_ACCEPTED: 'Accepted Follow Requests',
};

/**
 * Get all notification types for a category
 */
function getTypesForCategory(category: NotificationCategory): NotificationType[] {
  return (Object.entries(NOTIFICATION_TYPE_CATEGORIES) as [NotificationType, NotificationCategory][])
    .filter(([_, cat]) => cat === category)
    .map(([type]) => type);
}

interface CategorySectionProps {
  category: NotificationCategory;
  label: string;
  description: string;
  icon: string;
  types: NotificationType[];
  typePreferences: Partial<Record<NotificationType, TypeNotificationPreference>>;
  onToggle: (type: NotificationType, enabled: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
}

function CategorySection({
  category,
  label,
  description,
  icon,
  types,
  typePreferences,
  onToggle,
  disabled = false,
  loading = false,
}: CategorySectionProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [expanded, setExpanded] = useState(false);

  const handleToggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  }, []);

  // Count enabled types in this category
  const enabledCount = types.filter((type) => {
    const pref = typePreferences[type];
    return pref === undefined || pref.enabled;
  }).length;

  const allEnabled = enabledCount === types.length;
  const someEnabled = enabledCount > 0 && enabledCount < types.length;

  return (
    <View style={[styles.categoryContainer, { backgroundColor: palette.card, borderColor: palette.border }]}>
      {/* Category Header */}
      <Clickable onPress={handleToggleExpand} style={styles.categoryHeader}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: allEnabled || someEnabled
                ? withAlpha(palette.accent, 0.09)
                : withAlpha(palette.muted, 0.09),
            },
          ]}
        >
          <Ionicons
            name={icon as keyof typeof Ionicons.glyphMap}
            size={22}
            color={allEnabled || someEnabled ? palette.accent : palette.muted}
          />
        </View>
        <View style={styles.categoryContent}>
          <ThemedText type="defaultSemiBold" style={styles.categoryTitle}>
            {label}
          </ThemedText>
          <ThemedText style={[styles.categorySubtitle, { color: palette.muted }]}>
            {description}
          </ThemedText>
        </View>
        <View style={styles.statusContainer}>
          <ThemedText style={[styles.statusText, { color: palette.muted }]}>
            {enabledCount}/{types.length}
          </ThemedText>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={palette.muted}
          />
        </View>
      </Clickable>

      {/* Expanded Type List */}
      {expanded && (
        <View style={[styles.typeList, { borderTopColor: palette.border }]}>
          {types.map((type, index) => {
            const pref = typePreferences[type];
            const isEnabled = pref === undefined || pref.enabled;
            const isLast = index === types.length - 1;

            return (
              <View
                key={type}
                style={[
                  styles.typeRow,
                  !isLast && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.typeLabel,
                    { color: disabled || loading ? palette.muted : palette.text },
                  ]}
                >
                  {NOTIFICATION_TYPE_LABELS[type]}
                </ThemedText>
                <Switch
                  value={isEnabled}
                  onValueChange={(newValue) => onToggle(type, newValue)}
                  trackColor={{ false: palette.border, true: palette.accent }}
                  thumbColor={palette.surface}
                  disabled={disabled || loading}
                />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
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
  categoryContainer: {
    borderRadius: Radii.lg,
    borderWidth: 0.75,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  categoryTitle: { ...Typography.subheading },
  categorySubtitle: { ...Typography.small, lineHeight: 18 },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusText: { ...Typography.small },
  typeList: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginLeft: 52, // Align with category content
  },
  typeLabel: { ...Typography.bodySmall, flex: 1 },
});

export default NotificationTypeList;
