/**
 * useSquadInvite — State management hook for the squad bulk invite wizard.
 *
 * Encapsulates squad loading, member selection, time slot management,
 * wizard navigation, and bulk invite submission.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { createLogger } from '@/utils/logger';
import { inviteService as squadBulkInviteService } from '@/services/invite';
import { squadService } from '@/services/squad-service';
import type { TimeSlot, BulkInviteResult, ClubSquad, SquadSessionInvite, SimplifiedUser } from '@/constants/types';

const logger = createLogger('SquadBulkInvite');

type Step = 'squad' | 'details' | 'members' | 'slots' | 'confirm' | 'result';

export const NAV_STEPS: readonly string[] = ['squad', 'details', 'members', 'slots', 'confirm'];
const NAV_STEPS_TYPED: readonly Step[] = ['squad', 'details', 'members', 'slots', 'confirm'];

interface Params { squadId?: string; sessionId?: string }

export function useSquadInvite(currentUser: SimplifiedUser | null, params: Params) {
  const [step, setStep] = useState<Step>('squad');
  const [selectedSquadIds, setSelectedSquadIds] = useState<string[]>(
    params.squadId ? [params.squadId] : []
  );
  const [selectedSquad, setSelectedSquad] = useState<ClubSquad | null>(null);
  const [sessionType, setSessionType] = useState('1:1 Coaching');
  const [focus, setFocus] = useState('Dribbling');
  const [sessionTitle, setSessionTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [proposedSlots, setProposedSlots] = useState<TimeSlot[]>([]);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [uniqueParentCount, setUniqueParentCount] = useState(0);
  const [inviteResult, setInviteResult] = useState<{
    squadInvite: SquadSessionInvite; result: BulkInviteResult;
  } | null>(null);

  // Time slot form
  const [slotDate, setSlotDate] = useState('');
  const [slotStartTime, setSlotStartTime] = useState('');
  const [slotEndTime, setSlotEndTime] = useState('');
  const [slotLocation, setSlotLocation] = useState('');

  const clubId = (currentUser as unknown as Record<string, string>)?.clubId
    || (currentUser as unknown as Record<string, string>)?.primaryClubId || 'default_club';

  // ─── Load squad ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (selectedSquadIds.length === 1) { void loadSquad(selectedSquadIds[0]); }
    else { setSelectedSquad(null); }
  }, [selectedSquadIds]);

  const loadSquad = async (squadId: string) => {
    try {
      const squad = await squadService.getSquad(squadId);
      setSelectedSquad(squad);
      if (squad) setSessionTitle(`${squad.name} Training Session`);
    } catch (error) {
      logger.error('Failed to load squad', error);
      Alert.alert('Error', 'Failed to load squad details');
    }
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleAddSlot = useCallback((slot: TimeSlot) => {
    if (!slot.date || !slot.startTime || !slot.endTime) {
      Alert.alert('Missing fields', 'Please fill in date, start time, and end time');
      return;
    }
    setProposedSlots((prev) => [...prev, slot]);
    setSlotDate(''); setSlotStartTime(''); setSlotEndTime(''); setSlotLocation('');
  }, []);

  const handleRemoveSlot = useCallback((index: number) => {
    setProposedSlots((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleViewInvites = useCallback(() => router.push(Routes.SESSION_INVITES), []);
  const handleDone = useCallback(() => router.back(), []);

  // ─── Navigation ───────────────────────────────────────────────────────────

  const canProceed = useMemo(() => {
    switch (step) {
      case 'squad': return selectedSquadIds.length > 0;
      case 'details': return Boolean(sessionType && focus && sessionTitle.trim());
      case 'members': return selectedMemberIds.length > 0;
      case 'slots': return proposedSlots.length > 0;
      case 'confirm': return true;
      default: return false;
    }
  }, [step, selectedSquadIds, sessionType, focus, sessionTitle, selectedMemberIds, proposedSlots]);

  const nextStep = useCallback(() => {
    const idx = NAV_STEPS_TYPED.indexOf(step);
    if (idx < NAV_STEPS_TYPED.length - 1) setStep(NAV_STEPS_TYPED[idx + 1]);
  }, [step]);

  const prevStep = useCallback(() => {
    const idx = NAV_STEPS_TYPED.indexOf(step);
    if (idx > 0) setStep(NAV_STEPS_TYPED[idx - 1]); else router.back();
  }, [step]);

  // ─── Submit ───────────────────────────────────────────────────────────────

  const sendBulkInvites = useCallback(async () => {
    if (!currentUser || selectedSquadIds.length === 0) return;
    setSendingInvites(true);
    try {
      const sessionId = params.sessionId || `session_${Date.now()}`;
      const result = await squadBulkInviteService.createBulkInvite({
        squadId: selectedSquadIds[0], sessionId, sessionTitle,
        coachId: currentUser.id, coachName: currentUser.name || 'Coach',
        clubName: selectedSquad?.name, proposedSlots, sessionType, focus,
        notes: notes || undefined, priceUsd: price ? parseFloat(price) : undefined,
        expiresInDays: 7,
      });
      if (!result.success) {
        logger.error('Failed to send bulk invites', result.error);
        Alert.alert('Error', result.error.message || 'Failed to send invites. Please try again.');
        return;
      }
      setInviteResult(result.data);
      setStep('result');
    } catch (error) {
      logger.error('Failed to send bulk invites', error);
      Alert.alert('Error', 'Failed to send invites. Please try again.');
    } finally { setSendingInvites(false); }
  }, [currentUser, selectedSquadIds, sessionTitle, proposedSlots, sessionType, focus, notes, price, selectedSquad?.name, params.sessionId]);

  const showClose = step === 'squad' || step === 'result';

  return {
    step, selectedSquadIds, selectedSquad, sessionType, focus, sessionTitle,
    notes, price, selectedMemberIds, proposedSlots, sendingInvites, uniqueParentCount,
    inviteResult, slotDate, slotStartTime, slotEndTime, slotLocation, clubId, showClose, canProceed,
    setSelectedSquadIds, setSessionType, setFocus, setSessionTitle, setNotes, setPrice,
    setSelectedMemberIds, setUniqueParentCount,
    setSlotDate, setSlotStartTime, setSlotEndTime, setSlotLocation,
    handleAddSlot, handleRemoveSlot, handleViewInvites, handleDone,
    nextStep, prevStep, sendBulkInvites,
  };
}
