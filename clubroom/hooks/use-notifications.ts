import { useCallback, useEffect, useState } from 'react';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { notificationService, ExtendedNotificationItem } from '@/services/notification-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { err, ok, serviceError } from '@/types/result';
import { createLogger } from '@/utils/logger';
import type { NotificationType } from '@/constants/types';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import {
  buildNotificationBadgeState,
  type NotificationBadgeState,
} from '@/services/notification/notification-attention';

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
const EMPTY_BADGE_STATE: NotificationBadgeState = {
  actionableCount: 0,
  passiveUnreadCount: 0,
  label: undefined,
  variant: 'none',
};

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
  const { currentUser } = useAuth();

  const [currentFilter, setFilter] = useState<NotificationFilter>(initialFilter);
  const [actionError, setActionError] = useState<Error | null>(null);
  const { showToast } = useToast();

  const fetchNotifications = useCallback(async () => {
    try {
      const allNotificationsResult = await notificationService.list();
      if (!allNotificationsResult.success) {
        return err(allNotificationsResult.error);
      }

      const allNotifications = allNotificationsResult.data;
      const visibleNotifications = allNotifications.filter((notification) => {
        if (!notification.recipientId) return true;
        if (!currentUser?.id) return false;
        return notification.recipientId === currentUser.id;
      });

      // Filter by type if not 'all'
      let filtered = visibleNotifications;
      if (currentFilter !== 'all') {
        filtered = visibleNotifications.filter(
          (n: ExtendedNotificationItem) => n.type === currentFilter,
        );
      }

      // Calculate unread count from visible notifications (not filtered by tab).
      const unread = visibleNotifications.filter((n: ExtendedNotificationItem) => !n.read).length;

      return ok({ notifications: filtered, unreadCount: unread });
    } catch (loadError) {
      logger.error('Failed to fetch notifications', { error: loadError, currentFilter });
      return err(serviceError('UNKNOWN', 'Failed to fetch notifications', loadError));
    }
  }, [currentFilter, currentUser?.id]);

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
      showToast('Notification type muted. Change it in Notification Preferences.', 'success');
    },
    [dismissNotification, showToast],
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
 * Lightweight hook for the attention-based notification badge.
 */
export function useNotificationBadgeState(): NotificationBadgeState {
  const [badgeState, setBadgeState] = useState<NotificationBadgeState>(EMPTY_BADGE_STATE);
  const { currentUser } = useAuth();

  const fetchBadgeState = useCallback(async () => {
    const listResult = await notificationService.list();
    if (!listResult.success) {
      logger.error('Failed to fetch notification badge state', { error: listResult.error });
      return;
    }

    setBadgeState(buildNotificationBadgeState(listResult.data, currentUser?.id));
  }, [currentUser?.id]);

  useEffect(() => {
    void fetchBadgeState();

    const unsubscribe = notificationService.subscribe(() => {
      void fetchBadgeState();
    });
    const unsubscribeRead = onTyped(ServiceEvents.NOTIFICATION_READ, () => {
      void fetchBadgeState();
    });
    const unsubscribeDismissed = onTyped(ServiceEvents.NOTIFICATION_DISMISSED, () => {
      void fetchBadgeState();
    });

    const interval = setInterval(() => {
      void fetchBadgeState();
    }, 30000);

    return () => {
      unsubscribe();
      unsubscribeRead();
      unsubscribeDismissed();
      clearInterval(interval);
    };
  }, [fetchBadgeState]);

  return badgeState;
}

/**
 * Backwards-compatible count hook for surfaces that only need the actionable total.
 */
export function useNotificationCount(): number {
  return useNotificationBadgeState().actionableCount;
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
