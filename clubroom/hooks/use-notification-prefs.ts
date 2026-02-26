import { useState, useEffect, useCallback } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { notificationService } from '@/services/notification-service';
import { createLogger } from '@/utils/logger';
import type {
  EnhancedNotificationPreferences,
  NotificationChannel,
  NotificationType,
  QuietHours,
} from '@/constants/types';
import { err, serviceError, type ServiceError } from '@/types/result';
import { useToast } from '@/components/ui/toast';

const logger = createLogger('useNotificationPrefs');

export function useNotificationPrefs() {
  const { currentUser } = useAuth();
  const userId = currentUser?.id ?? 'current_user';

  const [preferencesOverride, setPreferencesOverride] =
    useState<EnhancedNotificationPreferences | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const { showToast } = useToast();

  const loadPreferences = useCallback(async () => {
    try {
      const prefsResult = await notificationService.getPreferences(userId);
      if (!prefsResult.success) {
        logger.error('Failed to load preferences', { userId, error: prefsResult.error });
        return err(prefsResult.error);
      }
      return prefsResult;
    } catch (loadError) {
      logger.error('Failed to load preferences', { loadError });
      return err(serviceError('UNKNOWN', 'Failed to load notification preferences.', loadError));
    }
  }, [userId]);

  const {
    data,
    status,
    error: loadError,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<EnhancedNotificationPreferences>({
    load: loadPreferences,
    deps: [userId],
    isEmpty: () => false,
    refetchOnFocus: true,
  });

  useEffect(() => {
    if (data) {
      setPreferencesOverride(data);
      setActionError(null);
    }
  }, [data]);

  const preferences = preferencesOverride ?? data;

  const handleRefresh = useCallback(() => {
    setActionError(null);
    onRefresh();
  }, [onRefresh]);

  const handleQuietHoursChange = useCallback(
    async (quietHours: QuietHours) => {
      if (!preferences) return;
      setUpdating(true);
      setActionError(null);
      try {
        const updatedResult = await notificationService.setQuietHours(
          userId,
          quietHours.startTime,
          quietHours.endTime,
          quietHours.enabled,
        );
        if (!updatedResult.success) {
          setActionError(updatedResult.error.message);
          logger.error('Failed to update quiet hours', { userId, error: updatedResult.error });
          return;
        }

        setPreferencesOverride(updatedResult.data);
        showToast('Coach notifications unmuted', 'success');
      } catch (updateError) {
        setActionError('Failed to update quiet hours');
        logger.error('Failed to update quiet hours', { updateError });
      } finally {
        setUpdating(false);
      }
    },
    [preferences, userId, showToast],
  );

  const handleChannelToggle = useCallback(
    async (channel: NotificationChannel, enabled: boolean) => {
      if (!preferences) return;
      setUpdating(true);
      setActionError(null);
      try {
        const updatedResult = await notificationService.toggleChannel(userId, channel, enabled);
        if (!updatedResult.success) {
          setActionError(updatedResult.error.message);
          logger.error('Failed to toggle channel', {
            userId,
            channel,
            enabled,
            error: updatedResult.error,
          });
          return;
        }

        setPreferencesOverride(updatedResult.data);
      } catch (updateError) {
        setActionError('Failed to toggle notification channel');
        logger.error('Failed to toggle channel', { updateError });
      } finally {
        setUpdating(false);
      }
    },
    [preferences, userId],
  );

  const handleTypeToggle = useCallback(
    async (type: NotificationType, enabled: boolean) => {
      if (!preferences) return;
      setUpdating(true);
      setActionError(null);
      try {
        const updatedResult = await notificationService.toggleNotificationType(
          userId,
          type,
          enabled,
        );
        if (!updatedResult.success) {
          setActionError(updatedResult.error.message);
          logger.error('Failed to toggle notification type', {
            userId,
            type,
            enabled,
            error: updatedResult.error,
          });
          return;
        }

        setPreferencesOverride(updatedResult.data);
      } catch (updateError) {
        setActionError('Failed to toggle notification type');
        logger.error('Failed to toggle notification type', { updateError });
      } finally {
        setUpdating(false);
      }
    },
    [preferences, userId],
  );

  const handleUnmuteCoach = useCallback(
    async (coachId: string) => {
      if (!preferences) return;
      setUpdating(true);
      setActionError(null);
      try {
        const updatedResult = await notificationService.unmuteCoach(userId, coachId);
        if (!updatedResult.success) {
          setActionError(updatedResult.error.message);
          logger.error('Failed to unmute coach', { userId, coachId, error: updatedResult.error });
          return;
        }

        setPreferencesOverride(updatedResult.data);
      } catch (updateError) {
        setActionError('Failed to unmute coach');
        logger.error('Failed to unmute coach', { updateError });
      } finally {
        setUpdating(false);
      }
    },
    [preferences, userId],
  );

  const error =
    actionError ??
    (status === 'error'
      ? ((loadError as ServiceError | null)?.message ?? 'Failed to load notification preferences.')
      : null);

  return {
    preferences,
    loading: status === 'loading',
    status,
    error,
    refreshing,
    onRefresh: handleRefresh,
    retry,
    updating,
    handleRefresh,
    handleQuietHoursChange,
    handleChannelToggle,
    handleTypeToggle,
    handleUnmuteCoach,
  } satisfies {
    preferences: EnhancedNotificationPreferences | null;
    loading: boolean;
    status: ScreenStatus;
    error: string | null;
    refreshing: boolean;
    onRefresh: () => void;
    retry: () => void;
    updating: boolean;
    handleRefresh: () => void;
    handleQuietHoursChange: (quietHours: QuietHours) => Promise<void>;
    handleChannelToggle: (channel: NotificationChannel, enabled: boolean) => Promise<void>;
    handleTypeToggle: (type: NotificationType, enabled: boolean) => Promise<void>;
    handleUnmuteCoach: (coachId: string) => Promise<void>;
  };
}
