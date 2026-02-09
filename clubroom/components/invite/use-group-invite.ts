/**
 * useGroupInvite — State management hook for the group invite wizard.
 *
 * Encapsulates roster/squad loading, athlete selection, time slot management,
 * wizard navigation, and bulk invite submission.
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import { createLogger } from '@/utils/logger';
import { inviteService as sessionInviteService } from '@/services/invite';
import { rosterService } from '@/services/roster-service';
import { squadService } from '@/services/squad-service';
import type { Athlete, Squad } from '@/components/coach/invite-athlete-modal';
import type { TargetType } from '@/components/invite/group-target-step';
import type { TimeSlot, RosterEntry } from '@/constants/types';
import type { SimplifiedUser } from '@/constants/types';

const logger = createLogger('GroupInviteScreen');

type Step = 'target' | 'athletes' | 'type' | 'slots' | 'preview' | 'confirm';
const ALL_STEPS: readonly Step[] = ['target', 'athletes', 'type', 'slots', 'preview', 'confirm'];

export const VISIBLE_STEPS: readonly string[] = ['target', 'type', 'slots', 'preview', 'confirm'];

export function useGroupInvite(currentUser: SimplifiedUser | null) {
  // Wizard step
  const [step, setStep] = useState<Step>('target');

  // Target selection
  const [targetType, setTargetType] = useState<TargetType | null>(null);
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);
  const [selectedAthletes, setSelectedAthletes] = useState<Athlete[]>([]);
  const [showAthleteModal, setShowAthleteModal] = useState(false);

  // Session details
  const [sessionType, setSessionType] = useState('');
  const [focus, setFocus] = useState('');
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  // Time slot form
  const [proposedSlots, setProposedSlots] = useState<TimeSlot[]>([]);
  const [slotDate, setSlotDate] = useState('');
  const [slotStartTime, setSlotStartTime] = useState('');
  const [slotEndTime, setSlotEndTime] = useState('');
  const [slotLocation, setSlotLocation] = useState('');

  // Roster / squad data
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);

  // ─── Data loading ─────────────────────────────────────────────────────────

  const loadRoster = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const data = await rosterService.getRoster(currentUser.id, { status: 'ACTIVE' });
      setRoster(data);
    } catch (error) { logger.error('Failed to load roster', error); }
  }, [currentUser?.id]);

  const loadSquads = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const clubId = (currentUser as unknown as Record<string, string>).clubId || 'club_premier';
      const clubSquads = await squadService.getCoachSquads(currentUser.id, clubId);
      setSquads(clubSquads.map((s) => ({ id: s.id, name: s.name })));
    } catch (error) { logger.error('Failed to load squads', error); }
  }, [currentUser]);

  useEffect(() => { loadRoster(); loadSquads(); }, [loadRoster, loadSquads]);

  // ─── Derived ──────────────────────────────────────────────────────────────

  const rosterAsAthletes: Athlete[] = roster.map((r) => ({
    id: r.athleteId, name: r.athleteName, parentId: r.parentId, parentName: r.parentName,
    age: r.athleteAge, skillLevel: r.athleteSkillLevel, photoUrl: r.athletePhotoUrl,
    squadId: r.tags.find((t) => t.startsWith('squad:'))?.replace('squad:', '') || undefined,
    squadName: r.tags.find((t) => t.startsWith('squad:'))?.replace('squad:', '') || undefined,
    tags: r.tags,
  }));

  const uniqueParentCount = new Set(selectedAthletes.map((a) => a.parentId)).size;

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleTargetSelect = useCallback((type: TargetType) => {
    setTargetType(type);
    if (type === 'individual' || type === 'custom') setShowAthleteModal(true);
  }, []);

  const handleSquadSelect = useCallback((squadId: string) => {
    setSelectedSquadId(squadId);
    const sa = rosterAsAthletes.filter((a) => a.squadId === squadId || a.tags?.includes(squadId));
    setSelectedAthletes(sa.length > 0 ? sa : rosterAsAthletes);
    setStep('type');
  }, [rosterAsAthletes]);

  const handleAthletesSelected = useCallback((athletes: Athlete[]) => {
    setSelectedAthletes(athletes);
    setShowAthleteModal(false);
    if (athletes.length > 0) setStep('type');
  }, []);

  const handleEditAthletes = useCallback(() => setShowAthleteModal(true), []);

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

  // ─── Navigation ───────────────────────────────────────────────────────────

  const canProceed = useCallback(() => {
    switch (step) {
      case 'target': return targetType !== null;
      case 'athletes': return selectedAthletes.length > 0;
      case 'type': return Boolean(sessionType && focus);
      case 'slots': return proposedSlots.length > 0;
      default: return true;
    }
  }, [step, targetType, selectedAthletes.length, sessionType, focus, proposedSlots.length]);

  const nextStep = useCallback(() => {
    const idx = ALL_STEPS.indexOf(step);
    if (idx < ALL_STEPS.length - 1) {
      setStep(step === 'target' && selectedAthletes.length > 0 ? 'type' : ALL_STEPS[idx + 1]);
    }
  }, [step, selectedAthletes.length]);

  const prevStep = useCallback(() => {
    const idx = ALL_STEPS.indexOf(step);
    if (idx > 0) setStep(ALL_STEPS[idx - 1]); else router.back();
  }, [step]);

  // ─── Submit ───────────────────────────────────────────────────────────────

  const submitBulkInvites = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const groupId = `group_${Date.now()}`;
      const parentMap = new Map<string, Athlete[]>();
      selectedAthletes.forEach((a) => {
        parentMap.set(a.parentId, [...(parentMap.get(a.parentId) || []), a]);
      });
      const inviteInputs = Array.from(parentMap.entries()).map(([parentId, athletes]) => ({
        coachId: currentUser.id, coachName: currentUser.name || 'Coach',
        athleteIds: athletes.map((a) => a.id), athleteNames: athletes.map((a) => a.name),
        parentId, parentName: athletes[0].parentName, proposedSlots, sessionType, focus,
        notes: notes || undefined, priceUsd: price ? parseFloat(price) : undefined,
        expiresInDays: 7, groupId,
      }));
      await sessionInviteService.createBulk(inviteInputs);
      const n = inviteInputs.length;
      const m = selectedAthletes.length;
      Alert.alert('Invites Sent',
        `Successfully sent ${n} invite${n !== 1 ? 's' : ''} to ${m} athlete${m !== 1 ? 's' : ''}.`,
        [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error) {
      logger.error('Failed to create bulk invites', error);
      Alert.alert('Error', 'Failed to send invites. Please try again.');
    } finally { setLoading(false); }
  }, [currentUser, selectedAthletes, proposedSlots, sessionType, focus, notes, price]);

  const actionLabel = loading
    ? 'Sending...'
    : `Send ${uniqueParentCount} Invite${uniqueParentCount !== 1 ? 's' : ''}`;

  return {
    step, targetType, selectedSquadId, selectedAthletes, showAthleteModal,
    sessionType, focus, notes, price, loading, proposedSlots,
    slotDate, slotStartTime, slotEndTime, slotLocation,
    squads, rosterAsAthletes, uniqueParentCount, actionLabel,
    setSessionType, setFocus, setNotes, setPrice,
    setSlotDate, setSlotStartTime, setSlotEndTime, setSlotLocation,
    setShowAthleteModal,
    handleTargetSelect, handleSquadSelect, handleAthletesSelected, handleEditAthletes,
    handleAddSlot, handleRemoveSlot,
    canProceed, nextStep, prevStep, submitBulkInvites,
  };
}
