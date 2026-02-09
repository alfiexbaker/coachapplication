/**
 * NotificationsActionsBar — Header actions for the Notifications screen.
 *
 * Shows unread badge count + "Mark all read" and "Clear all" action buttons.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface NotificationsActionsBarProps {
  unreadCount: number;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

export const NotificationsActionsBar = memo(function NotificationsActionsBar({
  unreadCount,
  onMarkAllRead,
  onClearAll,
}: NotificationsActionsBarProps) {
  const { colors: palette } = useTheme();

  return (
    <Row justify="between" align="center" paddingH="lg" style={styles.actionsBar}>
      <Row align="center">
        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: palette.tint }]}>
            <ThemedText style={[styles.badgeText, { color: palette.onPrimary }]}>
              {unreadCount}
            </ThemedText>
          </View>
        )}
      </Row>
      <Row align="center" gap="md">
        {unreadCount > 0 && (
          <Clickable onPress={onMarkAllRead} accessibilityLabel="Mark all notifications as read">
            <Row align="center" gap="xxs">
              <Ionicons name="checkmark-done" size={18} color={palette.tint} />
              <ThemedText style={{ color: palette.tint, ...Typography.smallSemiBold }}>
                Mark all read
              </ThemedText>
            </Row>
          </Clickable>
        )}
        <Clickable onPress={onClearAll} accessibilityLabel="Clear all notifications">
          <Row align="center" gap="xxs">
            <Ionicons name="trash-outline" size={18} color={palette.muted} />
            <ThemedText style={{ color: palette.muted, ...Typography.smallSemiBold }}>
              Clear all
            </ThemedText>
          </Row>
        </Clickable>
      </Row>
    </Row>
  );
});

const styles = StyleSheet.create({
  actionsBar: {
    paddingBottom: Spacing.md,
  },
  badge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.md,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    ...Typography.caption,
  },
});
