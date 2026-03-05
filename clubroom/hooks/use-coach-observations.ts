/**
 * Hook for managing coach observations on the SEN screen.
 * Handles CRUD operations and modal state.
 */

import { useState, useCallback, useEffect } from 'react';

import {
  coachObservationService,
  type CoachObservation,
  type ObservationCategory,
} from '@/services/coach-observation-service';
import { useAuth } from '@/hooks/use-auth';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { createLogger } from '@/utils/logger';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('useCoachObservations');

export function useCoachObservations(athleteId: string) {
  const { currentUser } = useAuth();
  const [observations, setObservations] = useState<CoachObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingObservation, setEditingObservation] = useState<CoachObservation | null>(null);
  const [saving, setSaving] = useState(false);

  const loadObservations = useCallback(async () => {
    const result = await coachObservationService.getObservations(athleteId);
    if (result.success) {
      setObservations(result.data);
    }
    setLoading(false);
  }, [athleteId]);

  useEffect(() => {
    loadObservations();
  }, [loadObservations]);

  // Subscribe to observation events for live updates
  useEffect(() => {
    const unsubs = [
      onTyped(ServiceEvents.COACH_OBSERVATION_CREATED, (e) => {
        if (e.athleteId === athleteId) loadObservations();
      }),
      onTyped(ServiceEvents.COACH_OBSERVATION_UPDATED, (e) => {
        if (e.athleteId === athleteId) loadObservations();
      }),
      onTyped(ServiceEvents.COACH_OBSERVATION_DELETED, (e) => {
        if (e.athleteId === athleteId) loadObservations();
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [athleteId, loadObservations]);

  const showModal = useCallback((observation?: CoachObservation) => {
    setEditingObservation(observation ?? null);
    setModalVisible(true);
  }, []);

  const hideModal = useCallback(() => {
    setModalVisible(false);
    setEditingObservation(null);
  }, []);

  const handleSave = useCallback(
    async (data: { text: string; category: ObservationCategory; isPrivate: boolean }) => {
      if (!currentUser) return;
      setSaving(true);

      try {
        if (editingObservation) {
          const result = await coachObservationService.updateObservation(editingObservation.id, data);
          if (!result.success) {
            uiFeedback.alert('Error', 'Failed to update observation. Please try again.');
            return;
          }
        } else {
          const result = await coachObservationService.createObservation({
            athleteId,
            coachId: currentUser.id,
            coachName: currentUser.name,
            ...data,
          });
          if (!result.success) {
            uiFeedback.alert('Error', 'Failed to save observation. Please try again.');
            return;
          }
        }
        hideModal();
      } catch (error) {
        logger.error('save_observation_failed', { error });
        uiFeedback.alert('Error', 'Something went wrong. Please try again.');
      } finally {
        setSaving(false);
      }
    },
    [athleteId, currentUser, editingObservation, hideModal],
  );

  const deleteObservation = useCallback(
    async (observationId: string) => {
      uiFeedback.alert('Delete Observation', 'Are you sure you want to delete this observation?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await coachObservationService.deleteObservation(observationId);
            if (!result.success) {
              uiFeedback.alert('Error', 'Failed to delete observation. Please try again.');
            }
          },
        },
      ]);
    },
    [],
  );

  return {
    observations,
    loading,
    modalVisible,
    editingObservation,
    saving,
    showModal,
    hideModal,
    handleSave,
    deleteObservation,
  };
}
