import { useCallback, useEffect, useState } from 'react';
import { ScreenStatus, useScreen } from '@/hooks/use-screen';
import { notificationService, ExtendedNotificationItem } from '@/services/notification-service';
import { ServiceEvents } from '@/services/event-bus';
import { err, ok, serviceError } from '@/types/result';
import { createLogger } from '@/utils/logger';
import type { NotificationType } from '@/constants/types';

export type NotificationFilter =
  | 'all'
  | 'booking'
  | 'message'
  | 'review'
  | 'badge'
  | 'reminder'
  | 'community';

interface UseNotificationsOptions {
  filter?: NotificationFilter;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseNotificationsResult {
  notifications: ExtendedNotificationItem[];
  unreadCount: number;
  status: ScreenStatus;
  isLoading: boolean;
  refreshing: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  retry: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  muteNotificationType: (item: ExtendedNotificationItem) => Promise<void>;
  setFilter: (filter: NotificationFilter) => void;
  currentFilter: NotificationFilter;
}

const logger = createLogger('useNotifications');

interface NotificationScreenData {
  notifications: ExtendedNotificationItem[];
  unreadCount: number;
}

/**
 * Hook for accessing and managing notifications
 * Provides unread count for badge display on tab bar
 */
export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsResult {
  const { filter: initialFilter = 'all', autoRefresh = true, refreshInterval = 30000 } = options;

  const [currentFilter, setFilter] = useState<NotificationFilter>(initialFilter);
  const [actionError, setActionError] = useState<Error | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const allNotificationsResult = await notificationService.list();
      if (!allNotificationsResult.success) {
        return err(allNotificationsResult.error);
      }

      const allNotifications = allNotificationsResult.data;

      // Filter by type if not 'all'
      let filtered = allNotifications;
      if (currentFilter !== 'all') {
        filtered = allNotifications.filter(
          (n: ExtendedNotificationItem) => n.type === currentFilter,
        );
      }

      // Calculate unread count from all notifications (not filtered)
      const unread = allNotifications.filter((n: ExtendedNotificationItem) => !n.read).length;

      return ok({ notifications: filtered, unreadCount: unread });
    } catch (loadError) {
      logger.error('Failed to fetch notifications', { error: loadError, currentFilter });
      return err(serviceError('UNKNOWN', 'Failed to fetch notifications', loadError));
    }
  }, [currentFilter]);

  const {
    data,
    status,
    error: loadError,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<NotificationScreenData>({
    load: fetchNotifications,
    deps: [currentFilter],
    events: [
      ServiceEvents.NOTIFICATION_CREATED,
      ServiceEvents.NOTIFICATION_READ,
      ServiceEvents.NOTIFICATION_DISMISSED,
    ],
    isEmpty: (value) => value.notifications.length === 0,
    refetchOnFocus: true,
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const error = actionError ?? (loadError ? new Error(loadError.message) : null);

  // Initial fetch and auto-refresh
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(onRefresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, onRefresh]);

  // Subscribe to new notifications for real-time updates
  useEffect(() => {
    const unsubscribe = notificationService.subscribe(() => {
      onRefresh();
    });

    return unsubscribe;
  }, [onRefresh]);

  const refresh = useCallback(async () => {
    onRefresh();
  }, [onRefresh]);

  const markAsRead = useCallback(
    async (id: string) => {
      const result = await notificationService.markAsRead(id);
      if (!result.success) {
        const markError = new Error(result.error.message);
        setActionError(markError);
        logger.error('Failed to mark notification as read', { id, error: result.error });
        return;
      }

      setActionError(null);
      await refresh();
    },
    [refresh],
  );

  const markAllAsRead = useCallback(async () => {
    const result = await notificationService.markAllAsRead();
    if (!result.success) {
      const markError = new Error(result.error.message);
      setActionError(markError);
      logger.error('Failed to mark all notifications as read', { error: result.error });
      return;
    }

    setActionError(null);
    await refresh();
  }, [refresh]);

  const clearAll = useCallback(async () => {
    const result = await notificationService.clearAll();
    if (!result.success) {
      const clearError = new Error(result.error.message);
      setActionError(clearError);
      logger.error('Failed to clear notifications', { error: result.error });
      return;
    }

    setActionError(null);
    await refresh();
  }, [refresh]);

  const dismissNotification = useCallback(
    async (id: string) => {
      const result = await notificationService.dismiss(id);
      if (!result.success) {
        const dismissError = new Error(result.error.message);
        setActionError(dismissError);
        logger.error('Failed to dismiss notification', { id, error: result.error });
        return;
      }

      setActionError(null);
      await refresh();
    },
    [refresh],
  );

  const muteNotificationType = useCallback(
    async (item: ExtendedNotificationItem) => {
      if (item.recipientId && item.notificationType) {
        const muteResult = await notificationService.toggleNotificationType(
          item.recipientId,
          item.notificationType as NotificationType,
          false,
        );
        if (!muteResult.success) {
          const muteError = new Error(muteResult.error.message);
          setActionError(muteError);
          logger.error('Failed to mute notification type', {
            notificationId: item.id,
            type: item.notificationType,
            error: muteResult.error,
          });
          return;
        }
      }

      await dismissNotification(item.id);
    },
    [dismissNotification],
  );

  return {
    notifications,
    unreadCount,
    status,
    isLoading: status === 'loading',
    refreshing,
    error,
    refresh,
    retry,
    markAsRead,
    markAllAsRead,
    clearAll,
    dismissNotification,
    muteNotificationType,
    setFilter,
    currentFilter,
  };
}

/**
 * Lightweight hook for just the unread count (for tab bar badge)
 */
export function useNotificationCount(): number {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    const unreadCountResult = await notificationService.getUnreadCount();
    if (!unreadCountResult.success) {
      logger.error('Failed to fetch notification count', { error: unreadCountResult.error });
      return;
    }

    setCount(unreadCountResult.data);
  }, []);

  useEffect(() => {
    fetchCount();

    // Subscribe to new notifications
    const unsubscribe = notificationService.subscribe(() => {
      fetchCount();
    });

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchCount, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [fetchCount]);

  return count;
}

/**
 * Hook for subscribing to new notifications (for toast display)
 */
export function useNotificationToast(
  onNotification: (notification: ExtendedNotificationItem) => void,
): void {
  useEffect(() => {
    const unsubscribe = notificationService.subscribe(onNotification);
    return unsubscribe;
  }, [onNotification]);
}
