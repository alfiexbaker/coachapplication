/**
 * NotificationsPanel — Full notification list with filters, day grouping, and compact mode.
 *
 * Used both in the Notifications tab screen (full mode) and embedded in
 * other screens like Settings (compact mode with limit).
 *
 * Full mode: filter bar + scrollable day-grouped notification list with pull-to-refresh.
 * Compact mode (limit > 0): simple list of the first N notifications.
 */

import { useEffect, useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { NotificationCard } from '@/components/notification/notification-card';
import { ErrorState, LoadingState } from '@/components/ui/screen-states';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { notificationService, ExtendedNotificationItem } from '@/services/notification-service';
import { badgeService } from '@/services/badge-service';
import { createLogger } from '@/utils/logger';
import { useNotifications } from '@/hooks/use-notifications';
import { NotificationDesign } from './notification-design';
import { NotificationFilterBar } from './notification-filter-bar';
import { NotificationDayGroups } from './notification-day-groups';

const logger = createLogger('NotificationsPanel');

interface NotificationsPanelProps {
  limit?: number;
  seedOnMount?: boolean;
  refreshToken?: number;
}

export function NotificationsPanel({
  limit = 0,
  seedOnMount = false,
  refreshToken = 0,
}: NotificationsPanelProps) {
  const { colors: palette } = useTheme();
  const {
    notifications,
    unreadCount,
    status,
    isLoading,
    refreshing,
    error,
    refresh,
    retry,
    markAsRead,
    dismissNotification,
    muteNotificationType,
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

  const handleShare = useCallback(
    async (item: ExtendedNotificationItem) => {
      logger.info('badge_view_event', {
        notificationId: item.id,
        badgeTitle: item.badgeTitle,
        athleteName: item.athleteName,
      });

      if (item.badgeAwardId) {
        await markAsRead(item.id);
        router.push(Routes.developmentBadgesHighlight(item.badgeAwardId));
      }
    },
    [markAsRead],
  );

  const handleAddToFeed = useCallback(
    async (item: ExtendedNotificationItem) => {
      logger.info('badge_add_to_feed', {
        notificationId: item.id,
        badgeTitle: item.badgeTitle,
        athleteName: item.athleteName,
        badgeAwardId: item.badgeAwardId,
      });

      if (item.badgeAwardId) {
        await badgeService.postBadgeToFeed(item.badgeAwardId);
        await notificationService.markHandled(item.id);
      }

      refresh();
    },
    [refresh],
  );

  const handleNotificationPress = useCallback(
    async (id: string) => {
      await markAsRead(id);
    },
    [markAsRead],
  );

  const handleNotificationDismiss = useCallback(
    async (id: string) => {
      await dismissNotification(id);
    },
    [dismissNotification],
  );

  const handleNotificationMute = useCallback(
    async (item: ExtendedNotificationItem) => {
      await muteNotificationType(item);
    },
    [muteNotificationType],
  );

  const visibleItems = limit > 0 ? notifications.slice(0, limit) : notifications;

  // Compact mode for embedding in other screens
  if (limit > 0) {
    return (
      <View style={styles.content}>
        {status === 'loading' && notifications.length === 0 ? (
          <LoadingState variant="list" />
        ) : status === 'error' ? (
          <ErrorState message={error?.message ?? 'Failed to load notifications'} onRetry={retry} />
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
              onMarkRead={() => handleNotificationPress(item.id)}
              onMute={() => handleNotificationMute(item)}
              onDelete={() => handleNotificationDismiss(item.id)}
              onShare={item.type === 'badge' ? () => handleShare(item) : undefined}
              onAddToFeed={
                item.type === 'badge' && !item.handled ? () => handleAddToFeed(item) : undefined
              }
              showTypeIndicator={false}
            />
          ))
        )}
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <NotificationFilterBar currentFilter={currentFilter} onFilterChange={setFilter} />

      {status === 'loading' && notifications.length === 0 ? (
        <LoadingState variant="list" />
      ) : status === 'error' ? (
        <ErrorState message={error?.message ?? 'Failed to load notifications'} onRetry={retry} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing || isLoading} onRefresh={refresh} />
          }
        >
          {visibleItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={48} color={palette.muted} />
              <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>
                No notifications
              </ThemedText>
              <ThemedText style={{ color: palette.muted, textAlign: 'center' }}>
                {currentFilter === 'all'
                  ? 'You are all caught up.'
                  : `No ${currentFilter} notifications.`}
              </ThemedText>
            </View>
          ) : (
            <NotificationDayGroups
              items={visibleItems}
              unreadCount={unreadCount}
              onPress={handleNotificationPress}
              onMarkRead={handleNotificationPress}
              onMute={handleNotificationMute}
              onDelete={handleNotificationDismiss}
              onShare={handleShare}
              onAddToFeed={handleAddToFeed}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: NotificationDesign.list.horizontalPadding,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
    gap: NotificationDesign.list.cardGap,
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
});
