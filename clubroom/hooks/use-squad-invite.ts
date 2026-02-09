/**
 * Hook for the Squad Invite screen.
 * Manages squad data loading, form state, time slots, and bulk invite sending.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { createLogger } from '@/utils/logger';
import { useAuth } from '@/hooks/use-auth';
import { inviteService as squadBulkInviteService } from '@/services/invite';
import { squadService } from '@/services/squad-service';
import type {
  ClubSquad, SquadMember, TimeSlot, BulkInviteResult,
  SquadSessionInvite, SquadInviteHistoryEntry,
} from '@/constants/types';

const logger = createLogger('SquadInviteScreen');

export const SESSION_TYPES = ['1:1 Coaching', 'Group Session', 'Assessment', 'Training'];
export const FOCUSES = ['Dribbling', 'Passing', 'Finishing', 'Defending', 'Goalkeeping', 'Conditioning'];

export type ViewMode = 'form' | 'sending' | 'result';

export function useSquadInvite() {
  const { currentUser } = useAuth();
  const { id: squadId } = useLocalSearchParams<{ id: string }>();

  // Data state
  const [squad, setSquad] = useState<ClubSquad | null>(null);
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [inviteHistory, setInviteHistory] = useState<SquadInviteHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [sessionType, setSessionType] = useState(SESSION_TYPES[0]);
  const [focus, setFocus] = useState(FOCUSES[0]);
  const [sessionTitle, setSessionTitle] = useState('');
  const [notes] = useState('');
  const [price] = useState('');
  const [proposedSlots, setProposedSlots] = useState<TimeSlot[]>([]);

  // Time slot form
  const [slotDate, setSlotDate] = useState('');
  const [slotStartTime, setSlotStartTime] = useState('');
  const [slotEndTime, setSlotEndTime] = useState('');
  const [slotLocation, setSlotLocation] = useState('');

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('form');
  const [sendingInvites, setSendingInvites] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    squadInvite: SquadSessionInvite;
    result: BulkInviteResult;
  } | null>(null);

  const loadSquadData = useCallback(async () => {
    if (!squadId) return;
    setLoading(true);
    try {
      const [squadData, membersData, historyData] = await Promise.all([
        squadService.getSquad(squadId),
        squadService.getSquadMembers(squadId),
        squadBulkInviteService.getSquadInviteHistory(squadId),
      ]);
      setSquad(squadData);
      setMembers(membersData);
      setInviteHistory(historyData);
      if (squadData) setSessionTitle(`${squadData.name} Training`);
      setSelectedMemberIds(membersData.map((m) => m.id));
    } catch (error) {
      logger.error('Failed to load squad data:', error);
      Alert.alert('Error', 'Failed to load squad data');
    } finally {
      setLoading(false);
    }
  }, [squadId]);

  useEffect(() => {
    if (squadId) loadSquadData();
  }, [squadId, loadSquadData]);

  const addTimeSlot = useCallback(() => {
    if (!slotDate || !slotStartTime || !slotEndTime) {
      Alert.alert('Missing fields', 'Please fill in date, start time, and end time');
      return;
    }
    setProposedSlots((prev) => [...prev, { date: slotDate, startTime: slotStartTime, endTime: slotEndTime, location: slotLocation || undefined }]);
    setSlotDate('');
    setSlotStartTime('');
    setSlotEndTime('');
    setSlotLocation('');
  }, [slotDate, slotStartTime, slotEndTime, slotLocation]);

  const removeTimeSlot = useCallback((index: number) => {
    setProposedSlots((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const uniqueParentCount = useMemo(() => {
    const selectedMembers = members.filter((m) => selectedMemberIds.includes(m.id));
    return new Set(selectedMembers.map((m) => m.parentId)).size;
  }, [members, selectedMemberIds]);

  const canSend = useMemo(() => (
    selectedMemberIds.length > 0 && sessionTitle.trim() !== '' && sessionType !== '' && focus !== '' && proposedSlots.length > 0
  ), [selectedMemberIds, sessionTitle, sessionType, focus, proposedSlots]);

  const sendBulkInvites = useCallback(async () => {
    if (!currentUser || !squadId || !canSend) return;
    setSendingInvites(true);
    setViewMode('sending');
    try {
      const result = await squadBulkInviteService.createBulkInvite({
        squadId, sessionId: `session_${Date.now()}`, sessionTitle,
        coachId: currentUser.id, coachName: currentUser.name || 'Coach',
        clubName: squad?.name, proposedSlots, sessionType, focus,
        notes: notes || undefined, priceUsd: price ? parseFloat(price) : undefined, expiresInDays: 7,
      });
      if (!result.success) {
        logger.error('Failed to send bulk invites:', result.error);
        Alert.alert('Error', result.error.message || 'Failed to send invites. Please try again.');
        setViewMode('form');
        return;
      }
      setInviteResult(result.data);
      setViewMode('result');
    } catch (error) {
      logger.error('Failed to send bulk invites:', error);
      Alert.alert('Error', 'Failed to send invites. Please try again.');
      setViewMode('form');
    } finally {
      setSendingInvites(false);
    }
  }, [currentUser, squadId, canSend, sessionTitle, squad, proposedSlots, sessionType, focus, notes, price]);

  const handleDone = useCallback(() => router.back(), []);
  const handleViewInvites = useCallback(() => router.push(Routes.SESSION_INVITES), []);

  return {
    squadId, squad, members, inviteHistory, loading,
    selectedMemberIds, setSelectedMemberIds, sessionType, setSessionType,
    focus, setFocus, sessionTitle, setSessionTitle,
    proposedSlots, slotDate, setSlotDate, slotStartTime, setSlotStartTime,
    slotEndTime, setSlotEndTime, slotLocation, setSlotLocation,
    viewMode, sendingInvites, inviteResult,
    addTimeSlot, removeTimeSlot, uniqueParentCount, canSend,
    sendBulkInvites, handleDone, handleViewInvites,
  };
}
