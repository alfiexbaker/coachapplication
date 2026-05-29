/**
 * Hook: useHealthDetail
 *
 * Manages injury detail screen state: load injury, add notes, mark healed.
 * Used by app/health/[id].tsx
 */

import { useState } from 'react';

import { router, useFocusEffect } from 'expo-router';
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
  const userName = currentUser?.fullName ?? currentUser?.name ?? 'User';

  const [injury, setInjury] = useState<Injury | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ServiceError | null>(null);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteProgress, setNoteProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  const loadInjury = async () => {
    if (!id) return;
    setError(null);
    setLoading(true);

    await runAsyncTryCatchFinally(async () => {
      const actorId = currentUser?.id ?? '';
      const data = actorId ? await injuryService.getInjuryByIdForActor(id, actorId) : null;
      setInjury(data);
      if (data) setNoteProgress(data.recoveryPercent);
    }, async loadError => {
      logger.error('Failed to load injury:', loadError);
      setInjury(null);
      setError(serviceError('UNKNOWN', 'Failed to load injury details.', loadError));
    }, () => {
      setLoading(false);
      setRefreshing(false);
    });
  };

  useFocusEffect(
    () => {
      loadInjury();
    },
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadInjury();
  };

  const handleAddNote = async () => {
    if (!injury || !noteText.trim()) return;
    const actorId = currentUser?.id ?? injury.userId;
    setSaving(true);

    await runAsyncTryCatchFinally(async () => {
      const updated = await injuryService.addRecoveryNoteForActor(
        actorId,
        injury.id,
        noteText.trim(),
        actorId,
        userName,
        noteProgress,
      );
      if (updated) {
        setInjury(updated);
        setNoteText('');
        setShowAddNote(false);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, async error => {
      logger.error('Failed to add note:', error);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }, () => {
      setSaving(false);
    });
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
            }
          }, async error => {
            logger.error('Failed to mark as healed:', error);
          }, () => {
            setSaving(false);
          });
        },
      },
    ]);
  };

  const cancelAddNote = () => {
    setShowAddNote(false);
    setNoteText('');
    if (injury) setNoteProgress(injury.recoveryPercent);
  };

  const openAddNote = () => {
    setShowAddNote(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    showAddNote,
    noteText,
    noteProgress,
    saving,
    setNoteText,
    setNoteProgress,
    handleRefresh,
    handleAddNote,
    handleMarkHealed,
    cancelAddNote,
    openAddNote,
  };
}
