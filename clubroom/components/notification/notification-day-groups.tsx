/**
 * NotificationDayGroups — Day-grouped notification list rendering.
 *
 * Groups notifications into Today / Yesterday / Earlier sections
 * and renders NotificationCards within each group.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { NotificationCard } from '@/components/notification/notification-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ExtendedNotificationItem } from '@/services/notification-service';

// ============================================================================
// DAY GROUPING HELPER
// ============================================================================

interface GroupedNotifications {
  label: string;
  items: ExtendedNotificationItem[];
}

export function groupByDay(notifications: ExtendedNotificationItem[]): GroupedNotifications[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  const groups: Record<string, ExtendedNotificationItem[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };

  for (const item of notifications) {
    const createdAt = item.createdAt ? new Date(item.createdAt) : null;
    const timeLabel = (item.timeLabel || '').toLowerCase();

    if (
      timeLabel.includes('just now') ||
      timeLabel.includes('min ago') ||
      timeLabel.includes('hour ago') ||
      timeLabel.includes('hours ago') ||
      (createdAt && createdAt >= today)
    ) {
      groups.Today.push(item);
    } else if (
      timeLabel.includes('yesterday') ||
      (createdAt && createdAt >= yesterday && createdAt < today)
    ) {
      groups.Yesterday.push(item);
    } else {
      groups.Earlier.push(item);
    }
  }

  return Object.entries(groups)
    .filter(([_, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

// ============================================================================
// COMPONENT
// ============================================================================

interface NotificationDayGroupsProps {
  items: ExtendedNotificationItem[];
  unreadCount: number;
  onPress: (id: string) => void;
  onShare: (item: ExtendedNotificationItem) => void;
  onAddToFeed: (item: ExtendedNotificationItem) => void;
}

export const NotificationDayGroups = memo(function NotificationDayGroups({
  items,
  unreadCount,
  onPress,
  onShare,
  onAddToFeed,
}: NotificationDayGroupsProps) {
  const { colors: palette } = useTheme();

  return (
    <>
      {unreadCount > 0 && (
        <Row
          align="center"
          style={[styles.unreadBanner, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
        >
          <Ionicons name="notifications" size={16} color={palette.tint} />
          <ThemedText
            style={{
              color: palette.tint,
              ...Typography.bodySemiBold,
              marginLeft: Spacing.xxs,
            }}
          >
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </ThemedText>
        </Row>
      )}
      {groupByDay(items).map((group) => (
        <View key={group.label} style={styles.dayGroup}>
          <ThemedText style={[styles.dayLabel, { color: palette.muted }]}>
            {group.label}
          </ThemedText>
          {group.items.map((item) => (
            <NotificationCard
              key={item.id}
              item={item}
              onPress={() => onPress(item.id)}
              onShare={item.type === 'badge' ? () => onShare(item) : undefined}
              onAddToFeed={
                item.type === 'badge' && !item.handled ? () => onAddToFeed(item) : undefined
              }
            />
          ))}
        </View>
      ))}
    </>
  );
});

const styles = StyleSheet.create({
  unreadBanner: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    marginBottom: Spacing.xs,
  },
  dayGroup: {
    gap: Spacing.sm,
  },
  dayLabel: {
    ...Typography.smallSemiBold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    paddingBottom: Spacing.xs,
  },
});
