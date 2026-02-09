import { useState, useEffect, useCallback } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { notificationService } from '@/services/notification-service';
import { createLogger } from '@/utils/logger';
import type { EnhancedNotificationPreferences, NotificationChannel, NotificationType, QuietHours } from '@/constants/types';

const logger = createLogger('useNotificationPrefs');

export function useNotificationPrefs() {
  const { currentUser } = useAuth();
  const userId = currentUser?.id ?? 'demo_user';

  const [preferences, setPreferences] = useState<EnhancedNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const loadPreferences = useCallback(async () => {
    try {
      const prefs = await notificationService.getPreferences(userId);
      setPreferences(prefs);
    } catch (error) {
      logger.error('Failed to load preferences', { error });
    }
  }, [userId]);

  useEffect(() => {
    (async () => { setLoading(true); await loadPreferences(); setLoading(false); })();
  }, [loadPreferences]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true); await loadPreferences(); setRefreshing(false);
  }, [loadPreferences]);

  const handleQuietHoursChange = useCallback(async (quietHours: QuietHours) => {
    if (!preferences) return;
    setUpdating(true);
    try {
      const updated = await notificationService.setQuietHours(userId, quietHours.startTime, quietHours.endTime, quietHours.enabled);
      setPreferences(updated);
    } catch (error) { logger.error('Failed to update quiet hours', { error }); }
    finally { setUpdating(false); }
  }, [preferences, userId]);

  const handleChannelToggle = useCallback(async (channel: NotificationChannel, enabled: boolean) => {
    if (!preferences) return;
    setUpdating(true);
    try {
      const updated = await notificationService.toggleChannel(userId, channel, enabled);
      setPreferences(updated);
    } catch (error) { logger.error('Failed to toggle channel', { error }); }
    finally { setUpdating(false); }
  }, [preferences, userId]);

  const handleTypeToggle = useCallback(async (type: NotificationType, enabled: boolean) => {
    if (!preferences) return;
    setUpdating(true);
    try {
      const updated = await notificationService.toggleNotificationType(userId, type, enabled);
      setPreferences(updated);
    } catch (error) { logger.error('Failed to toggle notification type', { error }); }
    finally { setUpdating(false); }
  }, [preferences, userId]);

  const handleUnmuteCoach = useCallback(async (coachId: string) => {
    if (!preferences) return;
    setUpdating(true);
    try {
      const updated = await notificationService.unmuteCoach(userId, coachId);
      setPreferences(updated);
    } catch (error) { logger.error('Failed to unmute coach', { error }); }
    finally { setUpdating(false); }
  }, [preferences, userId]);

  return {
    preferences, loading, refreshing, updating,
    handleRefresh, handleQuietHoursChange, handleChannelToggle, handleTypeToggle, handleUnmuteCoach,
  };
}
