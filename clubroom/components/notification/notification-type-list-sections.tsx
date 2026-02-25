import { useState, useCallback, memo } from 'react';
import { View, StyleSheet, Switch, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type {
  NotificationType,
  NotificationCategory,
  TypeNotificationPreference,
} from '@/constants/types';
import { NOTIFICATION_TYPE_CATEGORIES } from '@/constants/types';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
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

export function getTypesForCategory(category: NotificationCategory): NotificationType[] {
  return (
    Object.entries(NOTIFICATION_TYPE_CATEGORIES) as [NotificationType, NotificationCategory][]
  )
    .filter(([_, cat]) => cat === category)
    .map(([type]) => type);
}

/* ---------- CategorySection ---------- */

export interface CategorySectionProps {
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

export const CategorySection = memo(function CategorySection({
  label,
  description,
  icon,
  types,
  typePreferences,
  onToggle,
  disabled = false,
  loading = false,
}: CategorySectionProps) {
  const { colors: palette } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const handleToggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  }, []);

  const enabledCount = types.filter((type) => {
    const pref = typePreferences[type];
    return pref === undefined || pref.enabled;
  }).length;

  const allEnabled = enabledCount === types.length;
  const someEnabled = enabledCount > 0 && enabledCount < types.length;

  return (
    <View
      style={[
        styles.categoryContainer,
        { backgroundColor: palette.card, borderColor: palette.border },
      ]}
    >
      <Clickable onPress={handleToggleExpand} style={styles.categoryHeader}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor:
                allEnabled || someEnabled
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
        <Row align="center" gap="xs">
          <ThemedText style={[styles.statusText, { color: palette.muted }]}>
            {enabledCount}/{types.length}
          </ThemedText>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={palette.muted}
          />
        </Row>
      </Clickable>

      {expanded && (
        <View style={[styles.typeList, { borderTopColor: palette.border }]}>
          {types.map((type, index) => {
            const pref = typePreferences[type];
            const isEnabled = pref === undefined || pref.enabled;
            const isLast = index === types.length - 1;

            return (
              <Row
                key={type}
                align="center"
                justify="between"
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
              </Row>
            );
          })}
        </View>
      )}
    </View>
  );
});

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
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
  categorySubtitle: { ...Typography.small, lineHeight: Typography.caption.lineHeight },
  statusText: { ...Typography.small },
  typeList: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  typeRow: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginLeft: 52,
  },
  typeLabel: { ...Typography.bodySmall, flex: 1 },
});
