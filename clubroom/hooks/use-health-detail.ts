/**
 * Hook: useHealthDetail
 *
 * Manages injury detail screen state: load injury, add notes, mark healed.
 * Used by app/health/[id].tsx
 */

import { useState, useCallback } from 'react';

import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/hooks/use-auth';
import { injuryService } from '@/services/injury-service';
import type { Injury } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import type { ScreenStatus } from '@/hooks/use-screen';
import { serviceError, type ServiceError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';

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

  const loadInjury = useCallback(async () => {
    if (!id) return;
    setError(null);
    setLoading(true);
    try {
      const data = await injuryService.getInjuryById(id);
      setInjury(data);
      if (data) setNoteProgress(data.recoveryPercent);
    } catch (loadError) {
      logger.error('Failed to load injury:', loadError);
      setInjury(null);
      setError(serviceError('UNKNOWN', 'Failed to load injury details.', loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadInjury();
    }, [loadInjury]),
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadInjury();
  }, [loadInjury]);

  const handleAddNote = useCallback(async () => {
    if (!injury || !noteText.trim()) return;
    const actorId = currentUser?.id ?? injury.userId;
    setSaving(true);
    try {
      const updated = await injuryService.addRecoveryNote(
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
    } catch (error) {
      logger.error('Failed to add note:', error);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  }, [injury, noteText, noteProgress, currentUser?.id, userName]);

  const handleMarkHealed = useCallback(() => {
    if (!injury) return;
    uiFeedback.alert('Mark as Healed', 'Are you sure this injury has fully healed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, Healed',
        onPress: async () => {
          setSaving(true);
          try {
            const updated = await injuryService.markAsHealed(injury.id);
            if (updated) {
              setInjury(updated);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          } catch (error) {
            logger.error('Failed to mark as healed:', error);
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }, [injury]);

  const cancelAddNote = useCallback(() => {
    setShowAddNote(false);
    setNoteText('');
    if (injury) setNoteProgress(injury.recoveryPercent);
  }, [injury]);

  const openAddNote = useCallback(() => {
    setShowAddNote(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

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
