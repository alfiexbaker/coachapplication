/**
 * useCreateMatch — All state, validation, and handlers for the Create Match wizard.
 */
import { useState, useEffect } from 'react';

import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import type { MatchType, ClubSquad } from '@/constants/types';
import { matchService } from '@/services/match-service';
import { squadService } from '@/services/squad-service';
import { inviteService as bulkInviteService } from '@/services/invite';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('CreateMatchScreen');
const DEFAULT_CLUB_ID = 'club_lions';

export type CreateMatchStep = 'details' | 'schedule' | 'squad' | 'review';

export const MATCH_TYPES: { type: MatchType; label: string; icon: string }[] = [
  { type: 'FRIENDLY', label: 'Friendly', icon: 'people-outline' },
  { type: 'LEAGUE', label: 'League', icon: 'podium-outline' },
  { type: 'CUP', label: 'Cup', icon: 'trophy-outline' },
  { type: 'TOURNAMENT', label: 'Tournament', icon: 'medal-outline' },
];

const STEPS: CreateMatchStep[] = ['details', 'schedule', 'squad', 'review'];

export function useCreateMatch() {
  const { currentUser } = useAuth();

  const [step, setStep] = useState<CreateMatchStep>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [matchType, setMatchType] = useState<MatchType>('LEAGUE');
  const [opponent, setOpponent] = useState('');
  const [isHome, setIsHome] = useState(true);
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [kickoffTime, setKickoffTime] = useState('');
  const [meetTime, setMeetTime] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('14');
  const [notes, setNotes] = useState('');
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);
  const [squads, setSquads] = useState<ClubSquad[] | undefined>(undefined);
  const [squadMemberCount, setSquadMemberCount] = useState(0);
  const [autoInvite, setAutoInvite] = useState(true);
  const selectedSquad = squads?.find((squad) => squad.id === selectedSquadId) ?? null;

  const updateSelectedSquadId = (squadId: string | null) => {
    setSelectedSquadId(squadId);
    if (!squadId) {
      setSquadMemberCount(0);
    }
  };

  useEffect(() => {
    const loadSquads = async () => {
      try {
        const data = await squadService.getSquads(DEFAULT_CLUB_ID);
        setSquads(data.filter((s) => !s.name.toLowerCase().includes('staff')));
      } catch (error) {
        logger.error('Failed to load squads:', error);
      }
    };
    // react-doctor-disable-next-line react-doctor/no-initialize-state -- squad options are loaded from the service after mount.
    loadSquads();
  }, []);

  useEffect(() => {
    if (!selectedSquadId) return;
    const loadSquadInfo = async () => {
      try {
        const members = await squadService.getSquadMembers(selectedSquadId);
        setSquadMemberCount(members.length);
      } catch (error) {
        logger.error('Failed to load squad info:', error);
      }
    };
    // react-doctor-disable-next-line react-doctor/no-derived-state -- member count must come from the selected squad service record.
    loadSquadInfo();
  }, [selectedSquadId]);

  const currentStepIndex = STEPS.indexOf(step);

  const validateStep = (): boolean => {
    switch (step) {
      case 'details':
        if (!opponent.trim()) {
          uiFeedback.showToast('Please enter the opponent name.', 'error');
          return false;
        }
        if (!venue.trim()) {
          uiFeedback.showToast('Please enter the venue.', 'error');
          return false;
        }
        return true;
      case 'schedule':
        if (!date.trim()) {
          uiFeedback.showToast('Please enter the match date.', 'error');
          return false;
        }
        if (!kickoffTime.trim()) {
          uiFeedback.showToast('Please enter the kickoff time.', 'error');
          return false;
        }
        return true;
      case 'squad':
        if (!selectedSquadId) {
          uiFeedback.showToast('Please select a squad.', 'error');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep()) return;
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) setStep(STEPS[nextIndex]);
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) setStep(STEPS[prevIndex]);
    else router.back();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    await runAsyncTryCatchFinally(async () => {
      const title = `${selectedSquad?.name || 'Team'} vs ${opponent}`;
      if (autoInvite && selectedSquadId) {
        const result = await bulkInviteService.inviteSquadToMatch({
          squadId: selectedSquadId,
          squadName: selectedSquad?.name || 'Team',
          matchTitle: title,
          opponent,
          isHome,
          date,
          kickoffTime,
          venue,
          clubId: DEFAULT_CLUB_ID,
          clubName: 'Lions FC Academy',
          coachId: currentUser?.id || 'coach_1',
          coachName: currentUser?.fullName || currentUser?.username || 'Coach',
          matchType,
          notes: notes || undefined,
        });
        uiFeedback.showToast(
          `${title} created and ${result.inviteResult.successful} availability request${result.inviteResult.successful !== 1 ? 's' : ''} sent to squad members.`,
          'success',
        );
        router.replace(Routes.match(result.match.id));
      } else {
        const match = await matchService.createMatch({
          clubId: DEFAULT_CLUB_ID,
          clubName: 'Lions FC Academy',
          squadId: selectedSquadId || undefined,
          squadName: selectedSquad?.name,
          coachId: currentUser?.id || 'coach_1',
          coachName: currentUser?.fullName || currentUser?.username || 'Coach',
          title,
          matchType,
          opponent,
          isHome,
          date,
          kickoffTime,
          meetTime: meetTime || undefined,
          venue,
          address: address || undefined,
          maxPlayers: parseInt(maxPlayers, 10) || 14,
          notes: notes || undefined,
        });
        uiFeedback.showToast(`${title} has been created.`, 'success');
        router.replace(Routes.match(match.id));
      }
    }, async error => {
      logger.error('Failed to create match:', error);
      uiFeedback.showToast('Failed to create match. Please try again.', 'error');
    }, () => {
      setIsSubmitting(false);
    });
  };

  return {
    step,
    currentStepIndex,
    totalSteps: STEPS.length,
    isSubmitting,
    matchType,
    setMatchType,
    opponent,
    setOpponent,
    isHome,
    setIsHome,
    venue,
    setVenue,
    address,
    setAddress,
    date,
    setDate,
    kickoffTime,
    setKickoffTime,
    meetTime,
    setMeetTime,
    maxPlayers,
    setMaxPlayers,
    notes,
    setNotes,
    selectedSquadId,
    setSelectedSquadId: updateSelectedSquadId,
    selectedSquad,
    squads: squads ?? [],
    squadMemberCount,
    autoInvite,
    setAutoInvite,
    handleNext,
    handleBack,
    handleSubmit,
  };
}
