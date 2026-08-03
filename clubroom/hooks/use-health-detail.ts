/**
 * Hook: useHealthDetail
 *
 * Manages injury detail screen state: load injury and mark healed.
 * Used by app/health/[id].tsx
 */

import { useCallback, useState } from 'react';

import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/hooks/use-auth';
import { injuryService } from '@/services/injury-service';
import type { Injury } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import type { ScreenStatus } from '@/hooks/use-screen';
import { serviceError, type ServiceError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('useHealthDetail');

export function useHealthDetail(id: string | undefined) {
  const { currentUser } = useAuth();

  const [injury, setInjury] = useState<Injury | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ServiceError | null>(null);
  const [saving, setSaving] = useState(false);

  const loadInjury = useCallback(async () => {
    if (!id) return;
    setError(null);
    setLoading(true);

    await runAsyncTryCatchFinally(async () => {
      const actorId = currentUser?.id ?? '';
      const data = actorId ? await injuryService.getInjuryByIdForActor(id, actorId) : null;
      setInjury(data);
    }, async loadError => {
      logger.error('Failed to load injury:', loadError);
      setInjury(null);
      const serviceErrorCode =
        typeof loadError === 'object' && loadError && 'serviceErrorCode' in loadError
          ? (loadError as { serviceErrorCode?: ServiceError['code'] }).serviceErrorCode
          : undefined;
      setError(
        serviceError(
          serviceErrorCode === 'UNAUTHORIZED' ? 'UNAUTHORIZED' : 'UNKNOWN',
          serviceErrorCode === 'UNAUTHORIZED'
            ? 'This injury record is not available to your account.'
            : 'Failed to load injury details.',
          loadError,
        ),
      );
    }, () => {
      setLoading(false);
      setRefreshing(false);
    });
  }, [currentUser?.id, id]);

  useFocusEffect(
    useCallback(() => {
      void loadInjury();
    }, [loadInjury]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    void loadInjury();
  };

  const handleMarkHealed = () => {
    if (!injury) return;
    uiFeedback.alert('Mark as Healed', 'Are you sure this injury has fully healed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, Healed',
        onPress: async () => {
          setSaving(true);

          await runAsyncTryCatchFinally(async () => {
            const actorId = currentUser?.id ?? injury.userId;
            const updated = await injuryService.markAsHealedForActor(actorId, injury.id);
            if (updated) {
              setInjury(updated);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              return;
            }
            uiFeedback.showToast('Unable to update this injury. Refresh and try again.', 'error');
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }, async error => {
            logger.error('Failed to mark as healed:', error);
            uiFeedback.showToast('Unable to update this injury. Refresh and try again.', 'error');
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }, () => {
            setSaving(false);
          });
        },
      },
    ]);
  };

  const status: ScreenStatus =
    loading && !injury ? 'loading' : error && !injury ? 'error' : !injury ? 'empty' : 'success';

  return {
    injury,
    loading,
    status,
    error,
    refreshing,
    retry: loadInjury,
    saving,
    handleRefresh,
    handleMarkHealed,
  };
}
