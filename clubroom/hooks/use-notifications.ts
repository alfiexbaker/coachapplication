import { useCallback, useEffect, useState } from 'react';
import { notificationService, ExtendedNotificationItem } from '@/services/notification-service';
import { createLogger } from '@/utils/logger';

export type NotificationFilter = 'all' | 'booking' | 'message' | 'review' | 'badge' | 'reminder' | 'community';

interface UseNotificationsOptions {
  filter?: NotificationFilter;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseNotificationsResult {
  notifications: ExtendedNotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  setFilter: (filter: NotificationFilter) => void;
  currentFilter: NotificationFilter;
}

const logger = createLogger('useNotifications');

/**
 * Hook for accessing and managing notifications
 * Provides unread count for badge display on tab bar
 */
export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsResult {
  const { filter: initialFilter = 'all', autoRefresh = true, refreshInterval = 30000 } = options;

  const [notifications, setNotifications] = useState<ExtendedNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentFilter, setFilter] = useState<NotificationFilter>(initialFilter);

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const allNotificationsResult = await notificationService.list();
      if (!allNotificationsResult.success) {
        throw new Error(allNotificationsResult.error.message);
      }

      const allNotifications = allNotificationsResult.data;

      // Filter by type if not 'all'
      let filtered = allNotifications;
      if (currentFilter !== 'all') {
        filtered = allNotifications.filter((n: ExtendedNotificationItem) => n.type === currentFilter);
      }

      setNotifications(filtered);

      // Calculate unread count from all notifications (not filtered)
      const unread = allNotifications.filter((n: ExtendedNotificationItem) => !n.read).length;
      setUnreadCount(unread);
    } catch (err) {
      const normalizedError = err instanceof Error ? err : new Error('Failed to fetch notifications');
      logger.error('Failed to fetch notifications', { error: normalizedError, currentFilter });
      setError(normalizedError);
    } finally {
      setIsLoading(false);
    }
  }, [currentFilter]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchNotifications();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchNotifications, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchNotifications, autoRefresh, refreshInterval]);

  // Subscribe to new notifications for real-time updates
  useEffect(() => {
    const unsubscribe = notificationService.subscribe(() => {
      fetchNotifications();
    });

    return unsubscribe;
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    const result = await notificationService.markAsRead(id);
    if (!result.success) {
      const markError = new Error(result.error.message);
      setError(markError);
      logger.error('Failed to mark notification as read', { id, error: result.error });
      return;
    }

    await fetchNotifications();
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    const result = await notificationService.markAllAsRead();
    if (!result.success) {
      const markError = new Error(result.error.message);
      setError(markError);
      logger.error('Failed to mark all notifications as read', { error: result.error });
      return;
    }

    await fetchNotifications();
  }, [fetchNotifications]);

  const clearAll = useCallback(async () => {
    const result = await notificationService.clearAll();
    if (!result.success) {
      const clearError = new Error(result.error.message);
      setError(clearError);
      logger.error('Failed to clear notifications', { error: result.error });
      return;
    }

    await fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
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
export function useNotificationToast(onNotification: (notification: ExtendedNotificationItem) => void): void {
  useEffect(() => {
    const unsubscribe = notificationService.subscribe(onNotification);
    return unsubscribe;
  }, [onNotification]);
}
