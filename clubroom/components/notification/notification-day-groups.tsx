/**
 * NotificationDayGroups — Day-grouped notification list rendering.
 *
 * Groups notifications into Today / Yesterday / Earlier sections
 * and renders NotificationCards within each group.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { NotificationCard } from '@/components/notification/notification-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ExtendedNotificationItem } from '@/services/notification-service';
import { NotificationDesign } from './notification-design';

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
  onMarkRead: (id: string) => void;
  onMute: (item: ExtendedNotificationItem) => void;
  onDelete: (id: string) => void;
  onShare: (item: ExtendedNotificationItem) => void;
  onAddToFeed: (item: ExtendedNotificationItem) => void;
}

export const NotificationDayGroups = memo(function NotificationDayGroups({
  items,
  unreadCount,
  onPress,
  onMarkRead,
  onMute,
  onDelete,
  onShare,
  onAddToFeed,
}: NotificationDayGroupsProps) {
  const { colors: palette } = useTheme();

  return (
    <>
      {groupByDay(items).map((group) => (
        <View key={group.label} style={styles.dayGroup}>
          <Row align="center" justify="between">
            <ThemedText style={[styles.dayLabel, { color: palette.muted }]}>{group.label}</ThemedText>
            {group.label === 'Today' && unreadCount > 0 ? (
              <ThemedText style={[styles.inlineUnread, { color: palette.muted }]}>
                {unreadCount} unread
              </ThemedText>
            ) : null}
          </Row>
          {group.items.map((item) => (
            <NotificationCard
              key={item.id}
              item={item}
              onPress={() => onPress(item.id)}
              onMarkRead={() => onMarkRead(item.id)}
              onMute={() => onMute(item)}
              onDelete={() => onDelete(item.id)}
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
  dayGroup: {
    gap: NotificationDesign.list.cardGap,
    marginBottom: NotificationDesign.list.sectionGap,
  },
  dayLabel: {
    ...Typography.smallSemiBold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    paddingBottom: Spacing.xxs,
  },
  inlineUnread: {
    ...Typography.caption,
  },
});
