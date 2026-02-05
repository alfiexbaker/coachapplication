import { useCallback, useEffect, useState } from 'react';
import { notificationService, ExtendedNotificationItem } from '@/services/notification-service';

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

      const allNotifications = await notificationService.list();

      // Filter by type if not 'all'
      let filtered = allNotifications;
      if (currentFilter !== 'all') {
        filtered = allNotifications.filter((n) => n.type === currentFilter);
      }

      setNotifications(filtered);

      // Calculate unread count from all notifications (not filtered)
      const unread = allNotifications.filter((n) => !n.read).length;
      setUnreadCount(unread);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch notifications'));
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
    await notificationService.markAsRead(id);
    await fetchNotifications();
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    await notificationService.markAllAsRead();
    await fetchNotifications();
  }, [fetchNotifications]);

  const clearAll = useCallback(async () => {
    await notificationService.clearAll();
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
    const unreadCount = await notificationService.getUnreadCount();
    setCount(unreadCount);
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
