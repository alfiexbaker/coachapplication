/**
 * useSquadInviteModal — State, effects, handlers for SquadInviteModal.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';

import { squadService } from '@/services/squad-service';
import { inviteService as bulkInviteService, type SquadInvitePreview } from '@/services/invite';
import { createLogger } from '@/utils/logger';
import type { ClubSquad, TimeSlot } from '@/constants/types';

const logger = createLogger('SquadInviteModal');

export type InviteType = 'SESSION' | 'MATCH' | 'EVENT';
export type SquadInviteStep = 'squads' | 'preview' | 'confirm';

export interface SquadSessionProps {
  coachId: string;
  coachName: string;
  coachPhotoUrl?: string;
  clubName?: string;
  proposedSlots: TimeSlot[];
  sessionType: string;
  focus: string;
  notes?: string;
  priceUsd?: number;
}

export interface SquadMatchProps {
  opponent: string;
  homeAway: 'HOME' | 'AWAY';
  location: string;
  scheduledAt: string;
  coachId: string;
  coachName: string;
  notes?: string;
}

export interface SquadEventProps {
  description: string;
  eventType: 'TOURNAMENT' | 'SOCIAL' | 'TRAINING_CAMP' | 'PRESENTATION' | 'FUNDRAISER' | 'OTHER';
  location: string;
  startDate: string;
  endDate?: string;
  maxParticipants?: number;
  priceUsd?: number;
  createdBy: string;
  createdByName: string;
}

interface UseSquadInviteModalParams {
  visible: boolean;
  onClose: () => void;
  onSuccess: (result: { squadInviteId: string; successful: number; failed: number }) => void;
  clubId: string;
  inviteType: InviteType;
  targetId: string;
  targetTitle: string;
  sessionProps?: SquadSessionProps;
  matchProps?: SquadMatchProps;
  eventProps?: SquadEventProps;
  preSelectedSquadIds?: string[];
  multiSelect?: boolean;
}

export function useSquadInviteModal({
  visible,
  onClose,
  onSuccess,
  clubId,
  inviteType,
  targetId,
  targetTitle,
  sessionProps,
  matchProps,
  eventProps,
  preSelectedSquadIds = [],
  multiSelect = true,
}: UseSquadInviteModalParams) {
  const [step, setStep] = useState<SquadInviteStep>('squads');
  const [squads, setSquads] = useState<ClubSquad[]>([]);
  const [selectedSquadIds, setSelectedSquadIds] = useState<string[]>(preSelectedSquadIds);
  const [preview, setPreview] = useState<SquadInvitePreview[]>([]);
  const [excludedMemberIds, setExcludedMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const loadSquads = useCallback(async () => {
    setLoading(true);
    try {
      let data = await squadService.getSquads(clubId);
      data = data.filter((s) => !s.name.toLowerCase().includes('staff'));
      setSquads(data);
    } catch (error) {
      logger.error('Failed to load squads', error);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    if (visible) {
      loadSquads();
      setStep('squads');
      setSelectedSquadIds(preSelectedSquadIds);
      setExcludedMemberIds([]);
    }
  }, [visible, clubId, loadSquads, preSelectedSquadIds]);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      const previews = await Promise.all(
        selectedSquadIds.map((id) =>
          bulkInviteService.getSquadInvitePreview(id, excludedMemberIds),
        ),
      );
      setPreview(previews);
    } catch (error) {
      logger.error('Failed to load preview', error);
    } finally {
      setLoading(false);
    }
  }, [selectedSquadIds, excludedMemberIds]);

  const toggleSquad = useCallback(
    (squadId: string) => {
      if (multiSelect) {
        setSelectedSquadIds((prev) =>
          prev.includes(squadId) ? prev.filter((id) => id !== squadId) : [...prev, squadId],
        );
      } else {
        setSelectedSquadIds([squadId]);
      }
    },
    [multiSelect],
  );

  const toggleMemberExclusion = useCallback((athleteId: string) => {
    setExcludedMemberIds((prev) =>
      prev.includes(athleteId) ? prev.filter((id) => id !== athleteId) : [...prev, athleteId],
    );
  }, []);

  const totalMembers = useMemo(() => preview.reduce((sum, p) => sum + p.memberCount, 0), [preview]);

  const totalParents = useMemo(() => {
    const allParentIds = new Set<string>();
    preview.forEach((p) => {
      p.members.forEach((m) => allParentIds.add(m.parentId));
    });
    return allParentIds.size;
  }, [preview]);

  const handleNextStep = useCallback(async () => {
    if (step === 'squads') {
      await loadPreview();
      setStep('preview');
    } else if (step === 'preview') {
      setStep('confirm');
    }
  }, [step, loadPreview]);

  const handlePrevStep = useCallback(() => {
    if (step === 'preview') setStep('squads');
    else if (step === 'confirm') setStep('preview');
    else onClose();
  }, [step, onClose]);

  const handleSendInvites = useCallback(async () => {
    setSending(true);
    try {
      let result;

      if (inviteType === 'SESSION' && sessionProps) {
        if (selectedSquadIds.length === 1) {
          result = await bulkInviteService.inviteSquadToSession({
            sessionId: targetId,
            sessionTitle: targetTitle,
            squadId: selectedSquadIds[0],
            coachId: sessionProps.coachId,
            coachName: sessionProps.coachName,
            coachPhotoUrl: sessionProps.coachPhotoUrl,
            clubName: sessionProps.clubName,
            proposedSlots: sessionProps.proposedSlots,
            sessionType: sessionProps.sessionType,
            focus: sessionProps.focus,
            notes: sessionProps.notes,
            priceUsd: sessionProps.priceUsd,
            excludeMemberIds: excludedMemberIds,
          });
        } else {
          let totalSuccess = 0,
            totalFailed = 0,
            lastId = '';
          for (const squadId of selectedSquadIds) {
            const squadResult = await bulkInviteService.inviteSquadToSession({
              sessionId: targetId,
              sessionTitle: targetTitle,
              squadId,
              coachId: sessionProps.coachId,
              coachName: sessionProps.coachName,
              coachPhotoUrl: sessionProps.coachPhotoUrl,
              clubName: sessionProps.clubName,
              proposedSlots: sessionProps.proposedSlots,
              sessionType: sessionProps.sessionType,
              focus: sessionProps.focus,
              notes: sessionProps.notes,
              priceUsd: sessionProps.priceUsd,
              excludeMemberIds: excludedMemberIds,
            });
            totalSuccess += squadResult.sent;
            totalFailed += squadResult.failed;
            lastId = squadResult.groupId || '';
          }
          result = {
            sent: totalSuccess,
            failed: totalFailed,
            skipped: 0,
            totalAttempted: totalSuccess + totalFailed,
            errors: [],
            groupId: lastId,
          };
        }
      } else if (inviteType === 'MATCH' && matchProps) {
        const squad = squads.find((s) => s.id === selectedSquadIds[0]);
        const matchResult = await bulkInviteService.inviteSquadToMatch({
          squadId: selectedSquadIds[0],
          squadName: squad?.name || 'Squad',
          matchTitle: `${squad?.name || 'Team'} vs ${matchProps.opponent}`,
          opponent: matchProps.opponent,
          isHome: matchProps.homeAway === 'HOME',
          date: matchProps.scheduledAt.split('T')[0],
          kickoffTime: matchProps.scheduledAt.split('T')[1]?.substring(0, 5) || '10:00',
          venue: matchProps.location,
          clubId,
          clubName: 'Lions FC Academy',
          coachId: matchProps.coachId,
          coachName: matchProps.coachName,
          notes: matchProps.notes,
          excludeMemberIds: excludedMemberIds,
        });
        result = matchResult.inviteResult;
      } else if (inviteType === 'EVENT' && eventProps) {
        const eventResult = await bulkInviteService.inviteSquadsToEvent({
          clubId,
          clubName: 'Lions FC Academy',
          title: targetTitle,
          description: eventProps.description,
          eventType: eventProps.eventType,
          date: eventProps.startDate.split('T')[0],
          startTime: eventProps.startDate.split('T')[1]?.substring(0, 5) || '10:00',
          endTime: eventProps.endDate?.split('T')[1]?.substring(0, 5),
          venue: eventProps.location,
          squadIds: selectedSquadIds,
          createdBy: eventProps.createdBy,
          createdByName: eventProps.createdByName,
          price: eventProps.priceUsd,
          maxAttendees: eventProps.maxParticipants,
          excludeMemberIds: excludedMemberIds,
        });
        result = eventResult.inviteResult;
      }

      if (result) {
        onSuccess({
          squadInviteId: result.groupId || '',
          successful: result.sent,
          failed: result.failed,
        });
        onClose();
      }
    } catch (error) {
      logger.error('Failed to send invites', error);
      Alert.alert('Error', 'Failed to send invites. Please try again.');
    } finally {
      setSending(false);
    }
  }, [
    inviteType,
    sessionProps,
    matchProps,
    eventProps,
    selectedSquadIds,
    excludedMemberIds,
    targetId,
    targetTitle,
    clubId,
    squads,
    onSuccess,
    onClose,
  ]);

  const canProceed = useCallback(() => {
    if (step === 'squads') return selectedSquadIds.length > 0;
    if (step === 'preview') return totalMembers > 0;
    return true;
  }, [step, selectedSquadIds, totalMembers]);

  return {
    step,
    squads,
    selectedSquadIds,
    preview,
    excludedMemberIds,
    loading,
    sending,
    totalMembers,
    totalParents,
    toggleSquad,
    toggleMemberExclusion,
    handleNextStep,
    handlePrevStep,
    handleSendInvites,
    canProceed,
  };
}
