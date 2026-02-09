/**
 * useCreateMatch — All state, validation, and handlers for the Create Match wizard.
 */
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import type { MatchType, ClubSquad } from '@/constants/types';
import { matchService } from '@/services/match-service';
import { squadService } from '@/services/squad-service';
import { inviteService as bulkInviteService } from '@/services/invite';

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
  const [selectedSquad, setSelectedSquad] = useState<ClubSquad | null>(null);
  const [squads, setSquads] = useState<ClubSquad[]>([]);
  const [squadMemberCount, setSquadMemberCount] = useState(0);
  const [autoInvite, setAutoInvite] = useState(true);

  useEffect(() => {
    const loadSquads = async () => {
      try {
        const data = await squadService.getSquads(DEFAULT_CLUB_ID);
        setSquads(data.filter(s => !s.name.toLowerCase().includes('staff')));
      } catch (error) {
        logger.error('Failed to load squads:', error);
      }
    };
    loadSquads();
  }, []);

  useEffect(() => {
    if (!selectedSquadId) return;
    const loadSquadInfo = async () => {
      try {
        const squad = await squadService.getSquad(selectedSquadId);
        setSelectedSquad(squad);
        const members = await squadService.getSquadMembers(selectedSquadId);
        setSquadMemberCount(members.length);
      } catch (error) {
        logger.error('Failed to load squad info:', error);
      }
    };
    loadSquadInfo();
  }, [selectedSquadId]);

  const currentStepIndex = STEPS.indexOf(step);

  const validateStep = useCallback((): boolean => {
    switch (step) {
      case 'details':
        if (!opponent.trim()) { Alert.alert('Missing Information', 'Please enter the opponent name.'); return false; }
        if (!venue.trim()) { Alert.alert('Missing Information', 'Please enter the venue.'); return false; }
        return true;
      case 'schedule':
        if (!date.trim()) { Alert.alert('Missing Information', 'Please enter the match date.'); return false; }
        if (!kickoffTime.trim()) { Alert.alert('Missing Information', 'Please enter the kickoff time.'); return false; }
        return true;
      case 'squad':
        if (!selectedSquadId) { Alert.alert('Missing Information', 'Please select a squad.'); return false; }
        return true;
      default:
        return true;
    }
  }, [step, opponent, venue, date, kickoffTime, selectedSquadId]);

  const handleNext = useCallback(() => {
    if (!validateStep()) return;
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) setStep(STEPS[nextIndex]);
  }, [validateStep, currentStepIndex]);

  const handleBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) setStep(STEPS[prevIndex]);
    else router.back();
  }, [currentStepIndex]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const title = `${selectedSquad?.name || 'Team'} vs ${opponent}`;
      if (autoInvite && selectedSquadId) {
        const result = await bulkInviteService.inviteSquadToMatch({
          squadId: selectedSquadId, squadName: selectedSquad?.name || 'Team',
          matchTitle: title, opponent, isHome, date, kickoffTime, venue,
          clubId: DEFAULT_CLUB_ID, clubName: 'Lions FC Academy',
          coachId: currentUser?.id || 'coach_1',
          coachName: currentUser?.fullName || currentUser?.username || 'Coach',
          matchType, notes: notes || undefined,
        });
        Alert.alert('Match Created!',
          `${title} created and ${result.inviteResult.successful} availability request${result.inviteResult.successful !== 1 ? 's' : ''} sent to squad members.`,
          [{ text: 'View Match', onPress: () => router.replace(Routes.match(result.match.id)) },
           { text: 'Done', onPress: () => router.back() }],
        );
      } else {
        const match = await matchService.createMatch({
          clubId: DEFAULT_CLUB_ID, clubName: 'Lions FC Academy',
          squadId: selectedSquadId || undefined, squadName: selectedSquad?.name,
          coachId: currentUser?.id || 'coach_1',
          coachName: currentUser?.fullName || currentUser?.username || 'Coach',
          title, matchType, opponent, isHome, date, kickoffTime,
          meetTime: meetTime || undefined, venue, address: address || undefined,
          maxPlayers: parseInt(maxPlayers, 10) || 14, notes: notes || undefined,
        });
        Alert.alert('Match Created!', `${title} has been created.`,
          [{ text: 'View Match', onPress: () => router.replace(Routes.match(match.id)) },
           { text: 'Done', onPress: () => router.back() }],
        );
      }
    } catch (error) {
      logger.error('Failed to create match:', error);
      Alert.alert('Error', 'Failed to create match. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedSquad, opponent, autoInvite, selectedSquadId, isHome, date, kickoffTime, venue, currentUser, matchType, notes, meetTime, address, maxPlayers]);

  return {
    step, currentStepIndex, totalSteps: STEPS.length, isSubmitting,
    matchType, setMatchType, opponent, setOpponent, isHome, setIsHome,
    venue, setVenue, address, setAddress, date, setDate,
    kickoffTime, setKickoffTime, meetTime, setMeetTime,
    maxPlayers, setMaxPlayers, notes, setNotes,
    selectedSquadId, setSelectedSquadId, selectedSquad,
    squads, squadMemberCount, autoInvite, setAutoInvite,
    handleNext, handleBack, handleSubmit,
  };
}
