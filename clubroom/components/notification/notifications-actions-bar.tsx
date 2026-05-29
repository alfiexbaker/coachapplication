/**
 * NotificationsActionsBar — Compact top actions for notifications.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { NotificationDesign } from './notification-design';

interface NotificationsActionsBarProps {
  unreadCount: number;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  markingAllRead?: boolean;
  clearingAll?: boolean;
}

export const NotificationsActionsBar = function NotificationsActionsBar({
  unreadCount,
  onMarkAllRead,
  onClearAll,
  markingAllRead = false,
  clearingAll = false,
}: NotificationsActionsBarProps) {
  const { colors: palette } = useTheme();

  return (
    <Row justify="between" align="center" style={styles.actionsBar}>
      <View>
        {unreadCount > 0 ? (
          <ThemedText style={[styles.unreadText, { color: palette.muted }]}>
            {unreadCount > 99 ? '99+' : unreadCount} unread
          </ThemedText>
        ) : (
          <ThemedText style={[styles.caughtUpText, { color: palette.muted }]}>All caught up</ThemedText>
        )}
      </View>

      <Row align="center" gap="sm">
        {unreadCount > 0 && (
          <Clickable
            onPress={onMarkAllRead}
            accessibilityLabel="Mark all notifications as read"
            disabled={markingAllRead}
            style={[styles.iconAction, { borderColor: palette.border, backgroundColor: palette.surface }]}
          >
            <Ionicons
              name={markingAllRead ? 'hourglass-outline' : 'checkmark-done'}
              size={18}
              color={palette.tint}
            />
          </Clickable>
        )}

        <Clickable
          onPress={onClearAll}
          accessibilityLabel="Clear all notifications"
          disabled={clearingAll}
          style={[styles.iconAction, { borderColor: palette.border, backgroundColor: palette.surface }]}
        >
          <Ionicons
            name={clearingAll ? 'hourglass-outline' : 'trash-outline'}
            size={18}
            color={palette.muted}
          />
        </Clickable>
      </Row>
    </Row>
  );
};

const styles = StyleSheet.create({
  actionsBar: {
    paddingHorizontal: NotificationDesign.list.horizontalPadding,
  },
  unreadText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  caughtUpText: {
    ...Typography.caption,
  },
  iconAction: {
    width: NotificationDesign.actions.iconButton,
    height: NotificationDesign.actions.iconButton,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
