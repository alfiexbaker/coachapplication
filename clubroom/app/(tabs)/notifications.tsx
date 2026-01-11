import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { NotificationCard } from '@/components/notification/notification-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { notificationService, ExtendedNotificationItem } from '@/services/notification-service';
import { Clickable } from '@/components/primitives/clickable';
import { badgeService } from '@/services/badge-service';
import { createLogger } from '@/utils/logger';
import { useNotifications, NotificationFilter } from '@/hooks/use-notifications';

const logger = createLogger('NotificationsScreen');

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
          name={icon as any}
          size={14}
          color={isActive ? '#fff' : palette.muted}
        />
        <ThemedText
          style={[
            styles.filterLabel,
            { color: isActive ? '#fff' : palette.text },
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
  }, [seedOnMount]);

  useEffect(() => {
    if (refreshToken > 0) {
      refresh();
    }
  }, [refreshToken, refresh]);

  const handleShare = async (item: ExtendedNotificationItem) => {
    logger.info('badge_shared_event', {
      notificationId: item.id,
      badgeTitle: item.badgeTitle,
      athleteName: item.athleteName,
    });

    if (item.badgeAwardId) {
      await badgeService.markShared(item.badgeAwardId);
    }

    await notificationService.markHandled(item.id);
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
              <View style={[styles.unreadBanner, { backgroundColor: `${palette.tint}10` }]}>
                <Ionicons name="notifications" size={16} color={palette.tint} />
                <ThemedText style={{ color: palette.tint, fontWeight: '600', marginLeft: 6 }}>
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </ThemedText>
              </View>
            )}
            {visibleItems.map((item) => (
              <NotificationCard
                key={item.id}
                item={item}
                onPress={() => handleNotificationPress(item.id)}
                onShare={item.type === 'badge' ? () => handleShare(item) : undefined}
              />
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
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ThemedText type="title">Notifications</ThemedText>
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
                <ThemedText style={{ color: palette.tint, fontWeight: '600', fontSize: 13 }}>
                  Mark all read
                </ThemedText>
              </View>
            </Clickable>
          )}
          <Clickable onPress={handleClearAll}>
            <View style={styles.headerButton}>
              <Ionicons name="trash-outline" size={18} color={palette.muted} />
              <ThemedText style={{ color: palette.muted, fontWeight: '600', fontSize: 13 }}>
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
  header: {
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  filterBar: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '500',
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
    fontSize: 18,
    fontWeight: '600',
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
});
