/**
 * Hook for managing coach observations on the SEN screen.
 * Handles CRUD operations and modal state.
 */

import { useState, useEffect, startTransition } from 'react';

import {
  coachObservationService,
  type CoachObservation,
  type ObservationCategory,
} from '@/services/coach-observation-service';
import { useAuth } from '@/hooks/use-auth';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { createLogger } from '@/utils/logger';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('useCoachObservations');

export function useCoachObservations(athleteId: string) {
  const { currentUser } = useAuth();
  const [observations, setObservations] = useState<CoachObservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingObservation, setEditingObservation] = useState<CoachObservation | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    startTransition(() => {
      void loadCoachObservations(athleteId, setObservations, setLoading);
    });
  }, [athleteId]);

  // Subscribe to observation events for live updates
  useEffect(() => {
    const reloadObservations = () => {
      void loadCoachObservations(athleteId, setObservations, setLoading);
    };
    const unsubs = [
      onTyped(ServiceEvents.COACH_OBSERVATION_CREATED, (e) => {
        if (e.athleteId === athleteId) reloadObservations();
      }),
      onTyped(ServiceEvents.COACH_OBSERVATION_UPDATED, (e) => {
        if (e.athleteId === athleteId) reloadObservations();
      }),
      onTyped(ServiceEvents.COACH_OBSERVATION_DELETED, (e) => {
        if (e.athleteId === athleteId) reloadObservations();
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [athleteId]);

  const showModal = (observation?: CoachObservation) => {
    setEditingObservation(observation ?? null);
    setModalVisible(true);
  };

  const hideModal = () => {
    setModalVisible(false);
    setEditingObservation(null);
  };

  const handleSave = async (data: {
    text: string;
    category: ObservationCategory;
    isPrivate: boolean;
  }) => {
    if (!currentUser) return;
    setSaving(true);

    return await runAsyncTryCatchFinally(
      async () => {
        if (editingObservation) {
          const result = await coachObservationService.updateObservation(
            editingObservation.id,
            data,
          );
          if (!result.success) {
            uiFeedback.showToast('Failed to update observation. Please try again.', 'error');
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
            uiFeedback.showToast('Failed to save observation. Please try again.', 'error');
            return;
          }
        }
        hideModal();
      },
      async (error) => {
        logger.error('save_observation_failed', { error });
        uiFeedback.showToast('Something went wrong. Please try again.', 'error');
      },
      () => {
        setSaving(false);
      },
    );
  };

  const deleteObservation = async (observationId: string) => {
    uiFeedback.alert('Delete Observation', 'Are you sure you want to delete this observation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const result = await coachObservationService.deleteObservation(observationId);
          if (!result.success) {
            uiFeedback.showToast('Failed to delete observation. Please try again.', 'error');
          }
        },
      },
    ]);
  };

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

async function loadCoachObservations(
  athleteId: string,
  setObservations: (observations: CoachObservation[]) => void,
  setLoading: (loading: boolean) => void,
) {
  const result = await coachObservationService.getObservations(athleteId);
  if (result.success) {
    setObservations(result.data);
  }
  setLoading(false);
}
