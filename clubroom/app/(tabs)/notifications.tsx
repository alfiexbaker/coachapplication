import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { NotificationCard } from '@/components/notification/notification-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { notificationService, ExtendedNotificationItem } from '@/services/notification-service';
import { Clickable } from '@/components/primitives/clickable';
import { badgeService } from '@/services/badge-service';
import { createLogger } from '@/utils/logger';
import { useNotifications, NotificationFilter } from '@/hooks/use-notifications';
import { ScreenHeader } from '@/components/primitives/screen-header';

const logger = createLogger('NotificationsScreen');

// ============================================================================
// DAY GROUPING HELPER
// ============================================================================

interface GroupedNotifications {
  label: string;
  items: ExtendedNotificationItem[];
}

function groupByDay(notifications: ExtendedNotificationItem[]): GroupedNotifications[] {
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

// Filter options
const FILTERS: { key: NotificationFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'booking', label: 'Bookings', icon: 'calendar' },
  { key: 'message', label: 'Messages', icon: 'chatbubbles' },
  { key: 'badge', label: 'Badges', icon: 'ribbon' },
  { key: 'review', label: 'Reviews', icon: 'star' },
  { key: 'reminder', label: 'Reminders', icon: 'alarm' },
];

function FilterChip({
  label,
  icon,
  isActive,
  onPress,
}: {
  label: string;
  icon: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <Clickable onPress={onPress}>
      <View
        style={[
          styles.filterChip,
          {
            backgroundColor: isActive ? palette.tint : palette.surface,
            borderColor: isActive ? palette.tint : palette.border,
          },
        ]}
      >
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={14}
          color={isActive ? Colors.light.onPrimary : palette.muted}
        />
        <ThemedText
          style={[
            styles.filterLabel,
            { color: isActive ? Colors.light.onPrimary : palette.text },
          ]}
        >
          {label}
        </ThemedText>
      </View>
    </Clickable>
  );
}

export function NotificationsPanel({
  limit = 0,
  seedOnMount = false,
  refreshToken = 0,
}: {
  limit?: number;
  seedOnMount?: boolean;
  refreshToken?: number;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const {
    notifications,
    unreadCount,
    isLoading,
    refresh,
    markAsRead,
    currentFilter,
    setFilter,
  } = useNotifications();

  useEffect(() => {
    if (seedOnMount) {
      notificationService.seedDemoNotifications().then(() => refresh());
    }
  }, [seedOnMount, refresh]);

  useEffect(() => {
    if (refreshToken > 0) {
      refresh();
    }
  }, [refreshToken, refresh]);

  const handleShare = async (item: ExtendedNotificationItem) => {
    logger.info('badge_view_event', {
      notificationId: item.id,
      badgeTitle: item.badgeTitle,
      athleteName: item.athleteName,
    });

    // Navigate to badge detail if we have an award ID
    if (item.badgeAwardId) {
      await markAsRead(item.id);
      router.push(Routes.developmentBadgesHighlight(item.badgeAwardId));
    }
  };

  const handleAddToFeed = async (item: ExtendedNotificationItem) => {
    logger.info('badge_add_to_feed', {
      notificationId: item.id,
      badgeTitle: item.badgeTitle,
      athleteName: item.athleteName,
      badgeAwardId: item.badgeAwardId,
    });

    if (item.badgeAwardId) {
      // Post badge to social feed
      await badgeService.postBadgeToFeed(item.badgeAwardId);
      await notificationService.markHandled(item.id);
    }

    refresh();
  };

  const handleNotificationPress = async (id: string) => {
    await markAsRead(id);
  };

  const visibleItems = limit > 0 ? notifications.slice(0, limit) : notifications;

  // Compact mode for embedding in other screens
  if (limit > 0) {
    return (
      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator size="small" color={palette.tint} />
        ) : visibleItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={32} color={palette.muted} />
            <ThemedText style={{ color: palette.muted, marginTop: Spacing.sm }}>
              You are all caught up
            </ThemedText>
          </View>
        ) : (
          visibleItems.map((item) => (
            <NotificationCard
              key={item.id}
              item={item}
              onPress={() => handleNotificationPress(item.id)}
              onShare={item.type === 'badge' ? () => handleShare(item) : undefined}
              onAddToFeed={item.type === 'badge' && !item.handled ? () => handleAddToFeed(item) : undefined}
              showTypeIndicator={false}
            />
          ))
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Filter bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterBar}
      >
        {FILTERS.map((filter) => (
          <FilterChip
            key={filter.key}
            label={filter.label}
            icon={filter.icon}
            isActive={currentFilter === filter.key}
            onPress={() => setFilter(filter.key)}
          />
        ))}
      </ScrollView>

      {/* Notification list */}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} />
        }
      >
        {isLoading && notifications.length === 0 ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={palette.tint} />
          </View>
        ) : visibleItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={48} color={palette.muted} />
            <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>
              No notifications
            </ThemedText>
            <ThemedText style={{ color: palette.muted, textAlign: 'center' }}>
              {currentFilter === 'all'
                ? "You're all caught up! New notifications will appear here."
                : `No ${currentFilter} notifications to show.`}
            </ThemedText>
          </View>
        ) : (
          <>
            {unreadCount > 0 && (
              <View style={[styles.unreadBanner, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                <Ionicons name="notifications" size={16} color={palette.tint} />
                <ThemedText style={{ color: palette.tint, fontWeight: '600', marginLeft: Spacing.xxs }}>
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </ThemedText>
              </View>
            )}
            {groupByDay(visibleItems).map((group) => (
              <View key={group.label} style={styles.dayGroup}>
                <ThemedText style={[styles.dayLabel, { color: palette.muted }]}>
                  {group.label}
                </ThemedText>
                {group.items.map((item) => (
                  <NotificationCard
                    key={item.id}
                    item={item}
                    onPress={() => handleNotificationPress(item.id)}
                    onShare={item.type === 'badge' ? () => handleShare(item) : undefined}
                    onAddToFeed={item.type === 'badge' && !item.handled ? () => handleAddToFeed(item) : undefined}
                  />
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

export default function NotificationsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [refreshToken, setRefreshToken] = useState(0);
  const [seedOnMount, setSeedOnMount] = useState(true);
  const { unreadCount, markAllAsRead, clearAll } = useNotifications();

  const handleClearAll = useCallback(async () => {
    setSeedOnMount(false);
    await clearAll();
    setRefreshToken((token) => token + 1);
  }, [clearAll]);

  const handleMarkAllRead = useCallback(async () => {
    await markAllAsRead();
    setRefreshToken((token) => token + 1);
  }, [markAllAsRead]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      {/* Header */}
      <ScreenHeader
        title="Notifications"
        subtitle="Stay updated"
      />
      <View style={styles.actionsBar}>
        <View style={styles.badgeContainer}>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: palette.tint }]}>
              <ThemedText style={styles.badgeText}>{unreadCount}</ThemedText>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <Clickable onPress={handleMarkAllRead}>
              <View style={styles.headerButton}>
                <Ionicons name="checkmark-done" size={18} color={palette.tint} />
                <ThemedText style={{ color: palette.tint, ...Typography.smallSemiBold }}>
                  Mark all read
                </ThemedText>
              </View>
            </Clickable>
          )}
          <Clickable onPress={handleClearAll}>
            <View style={styles.headerButton}>
              <Ionicons name="trash-outline" size={18} color={palette.muted} />
              <ThemedText style={{ color: palette.muted, ...Typography.smallSemiBold }}>
                Clear all
              </ThemedText>
            </View>
          </Clickable>
        </View>
      </View>

      <NotificationsPanel seedOnMount={seedOnMount} refreshToken={refreshToken} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actionsBar: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.md,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: Colors.light.onPrimary,
    ...Typography.caption,
  },
  filterBar: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  filterLabel: {
    ...Typography.smallSemiBold,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  loadingState: {
    paddingTop: 100,
    alignItems: 'center',
  },
  emptyState: {
    paddingTop: 60,
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.heading,
    marginTop: Spacing.md,
  },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
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
