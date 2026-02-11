/**
 * Hook for the Athlete Profile screen.
 * Manages all state, data loading, and handlers for the unified athlete detail view.
 */

import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Routes } from '@/navigation/routes';
import { useScreen } from '@/hooks/use-screen';
import { useAuth } from '@/hooks/use-auth';
import { rosterService } from '@/services/roster-service';
import { safetyService, type AthleteEmergencyQuickView } from '@/services/safety-service';
import { childService, type ChildProfile } from '@/services/child-service';
import { ServiceEvents } from '@/services/event-bus';
import { ok, err, storageError, type Result, type ServiceError } from '@/types/result';
import type { RosterEntry, FootballObjective } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { getRosterAthleteName } from '@/utils/roster-display';

const logger = createLogger('AthleteProfile');

export type TabId = 'overview' | 'sessions' | 'progress' | 'notes';

export interface AthleteProfileData {
  entry: RosterEntry;
  emergencyData: AthleteEmergencyQuickView | null;
  childData: ChildProfile | null;
}

export function useAthleteDetail(athleteId: string) {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id || 'coach_1';

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [newTag, setNewTag] = useState('');

  const { data, status, error, refreshing, onRefresh, retry } =
    useScreen<AthleteProfileData>({
      load: async (): Promise<Result<AthleteProfileData, ServiceError>> => {
        try {
          const entry = await rosterService.getRosterEntry(coachId, athleteId);
          if (!entry) {
            return err({ code: 'NOT_FOUND', message: 'Athlete not found' });
          }
          const athleteName = getRosterAthleteName(entry);
          const [emergencyResult, childData] = await Promise.all([
            safetyService.getAthleteEmergency(athleteId, athleteName),
            childService.getChild(athleteId),
          ]);
          if (!emergencyResult.success) {
            logger.warn('Failed to load athlete emergency data', emergencyResult.error);
          }
          return ok({
            entry,
            emergencyData: emergencyResult.success ? emergencyResult.data : null,
            childData,
          });
        } catch (e) {
          logger.error('Failed to load athlete profile', e);
          return err(storageError('Failed to load athlete profile'));
        }
      },
      deps: [coachId, athleteId],
      events: [ServiceEvents.BOOKING_CREATED, ServiceEvents.CONCERN_RAISED],
      isEmpty: (d) => !d.entry,
    });

  const handleUpdateStatus = useCallback(
    async (newStatus: RosterEntry['status']) => {
      if (!data?.entry) return;
      await rosterService.updateStatus(coachId, data.entry.athleteId, newStatus);
      setShowStatusModal(false);
      onRefresh();
    },
    [coachId, data, onRefresh]
  );

  const handleUpdateFocus = useCallback(
    async (focus: FootballObjective) => {
      if (!data?.entry) return;
      await rosterService.updatePrimaryFocus(coachId, data.entry.athleteId, focus);
      onRefresh();
    },
    [coachId, data, onRefresh]
  );

  const handleAddNote = useCallback(
    async (content: string) => {
      if (!data?.entry) return;
      await rosterService.addNote(coachId, data.entry.athleteId, content);
      onRefresh();
    },
    [coachId, data, onRefresh]
  );

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      if (!data?.entry) return;
      Alert.alert('Delete Note', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await rosterService.deleteNote(coachId, data.entry.athleteId, noteId);
            onRefresh();
          },
        },
      ]);
    },
    [coachId, data, onRefresh]
  );

  const handleTagRemove = useCallback(
    async (tag: string) => {
      if (!data?.entry) return;
      const tags = data.entry.tags.filter((t) => t !== tag);
      await rosterService.updateTags(coachId, data.entry.athleteId, tags);
      onRefresh();
    },
    [coachId, data, onRefresh]
  );

  const handleTagAdd = useCallback(() => setShowTagsModal(true), []);

  const handleAddTagSubmit = useCallback(async () => {
    if (!data?.entry || !newTag.trim()) return;
    const tags = [...data.entry.tags, newTag.trim().toLowerCase()];
    await rosterService.updateTags(coachId, data.entry.athleteId, tags);
    setNewTag('');
    setShowTagsModal(false);
    onRefresh();
  }, [coachId, data, newTag, onRefresh]);

  const handleRaiseConcern = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push(Routes.rosterAthleteConcern(athleteId));
  }, [athleteId]);

  const handleRemove = useCallback(() => {
    if (!data?.entry) return;
    const athleteName = getRosterAthleteName(data.entry);
    Alert.alert(
      'Remove Athlete',
      `Are you sure you want to remove ${athleteName} from your roster?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await rosterService.removeAthlete(coachId, data.entry.athleteId, 'OTHER');
            router.back();
          },
        },
      ]
    );
  }, [coachId, data]);

  const openStatusModal = useCallback(() => setShowStatusModal(true), []);
  const closeStatusModal = useCallback(() => setShowStatusModal(false), []);
  const closeTagsModal = useCallback(() => {
    setShowTagsModal(false);
    setNewTag('');
  }, []);

  return {
    coachId,
    activeTab,
    setActiveTab,
    showStatusModal,
    openStatusModal,
    closeStatusModal,
    showTagsModal,
    closeTagsModal,
    newTag,
    setNewTag,
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    handleUpdateStatus,
    handleUpdateFocus,
    handleAddNote,
    handleDeleteNote,
    handleTagRemove,
    handleTagAdd,
    handleAddTagSubmit,
    handleRaiseConcern,
    handleRemove,
  };
}
