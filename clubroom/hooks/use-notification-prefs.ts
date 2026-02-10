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
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const loadPreferences = useCallback(async () => {
    try {
      const prefsResult = await notificationService.getPreferences(userId);
      if (!prefsResult.success) {
        const serviceError = new Error(prefsResult.error.message);
        setError(serviceError);
        logger.error('Failed to load preferences', { userId, error: prefsResult.error });
        return;
      }

      setPreferences(prefsResult.data);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to load notification preferences'));
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
      const updatedResult = await notificationService.setQuietHours(
        userId,
        quietHours.startTime,
        quietHours.endTime,
        quietHours.enabled
      );
      if (!updatedResult.success) {
        const serviceError = new Error(updatedResult.error.message);
        setError(serviceError);
        logger.error('Failed to update quiet hours', { userId, error: updatedResult.error });
        return;
      }

      setPreferences(updatedResult.data);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to update quiet hours'));
      logger.error('Failed to update quiet hours', { error });
    }
    finally { setUpdating(false); }
  }, [preferences, userId]);

  const handleChannelToggle = useCallback(async (channel: NotificationChannel, enabled: boolean) => {
    if (!preferences) return;
    setUpdating(true);
    try {
      const updatedResult = await notificationService.toggleChannel(userId, channel, enabled);
      if (!updatedResult.success) {
        const serviceError = new Error(updatedResult.error.message);
        setError(serviceError);
        logger.error('Failed to toggle channel', { userId, channel, enabled, error: updatedResult.error });
        return;
      }

      setPreferences(updatedResult.data);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to toggle notification channel'));
      logger.error('Failed to toggle channel', { error });
    }
    finally { setUpdating(false); }
  }, [preferences, userId]);

  const handleTypeToggle = useCallback(async (type: NotificationType, enabled: boolean) => {
    if (!preferences) return;
    setUpdating(true);
    try {
      const updatedResult = await notificationService.toggleNotificationType(userId, type, enabled);
      if (!updatedResult.success) {
        const serviceError = new Error(updatedResult.error.message);
        setError(serviceError);
        logger.error('Failed to toggle notification type', {
          userId,
          type,
          enabled,
          error: updatedResult.error,
        });
        return;
      }

      setPreferences(updatedResult.data);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to toggle notification type'));
      logger.error('Failed to toggle notification type', { error });
    }
    finally { setUpdating(false); }
  }, [preferences, userId]);

  const handleUnmuteCoach = useCallback(async (coachId: string) => {
    if (!preferences) return;
    setUpdating(true);
    try {
      const updatedResult = await notificationService.unmuteCoach(userId, coachId);
      if (!updatedResult.success) {
        const serviceError = new Error(updatedResult.error.message);
        setError(serviceError);
        logger.error('Failed to unmute coach', { userId, coachId, error: updatedResult.error });
        return;
      }

      setPreferences(updatedResult.data);
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to unmute coach'));
      logger.error('Failed to unmute coach', { error });
    }
    finally { setUpdating(false); }
  }, [preferences, userId]);

  return {
    preferences, error, loading, refreshing, updating,
    handleRefresh, handleQuietHoursChange, handleChannelToggle, handleTypeToggle, handleUnmuteCoach,
  };
}
