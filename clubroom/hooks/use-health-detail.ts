/**
 * Hook: useHealthDetail
 *
 * Manages injury detail screen state: load injury, add notes, mark healed.
 * Used by app/health/[id].tsx
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/hooks/use-auth';
import { injuryService } from '@/services/injury-service';
import type { Injury } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useHealthDetail');

export function useHealthDetail(id: string | undefined) {
  const { currentUser } = useAuth();
  const userId = currentUser?.id ?? 'user1';
  const userName = currentUser?.fullName ?? currentUser?.name ?? 'User';

  const [injury, setInjury] = useState<Injury | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteProgress, setNoteProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  const loadInjury = useCallback(async () => {
    if (!id) return;
    try {
      const data = await injuryService.getInjuryById(id);
      setInjury(data);
      if (data) setNoteProgress(data.recoveryPercent);
    } catch (error) {
      logger.error('Failed to load injury:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { loadInjury(); }, [loadInjury]));

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadInjury();
  }, [loadInjury]);

  const handleAddNote = useCallback(async () => {
    if (!injury || !noteText.trim()) return;
    setSaving(true);
    try {
      const updated = await injuryService.addRecoveryNote(injury.id, noteText.trim(), userId, userName, noteProgress);
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
  }, [injury, noteText, noteProgress, userId, userName]);

  const handleMarkHealed = useCallback(() => {
    if (!injury) return;
    Alert.alert('Mark as Healed', 'Are you sure this injury has fully healed?', [
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

  return {
    injury, loading, refreshing, showAddNote, noteText, noteProgress, saving,
    setNoteText, setNoteProgress,
    handleRefresh, handleAddNote, handleMarkHealed,
    cancelAddNote, openAddNote,
  };
}
