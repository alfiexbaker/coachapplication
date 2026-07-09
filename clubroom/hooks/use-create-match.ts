/**
 * useCreateMatch — All state, validation, and handlers for the Create Match wizard.
 */
import { useState, useEffect } from 'react';

import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { api } from '@/constants/config';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import type { Club, ClubMembership, MatchType, ClubSquad } from '@/constants/types';
import { clubAuthorityService } from '@/services/club-authority-service';
import { matchService } from '@/services/match-service';
import { squadService } from '@/services/squad-service';
import { matchInviteService } from '@/services/invite';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('CreateMatchScreen');
const NO_CLUB_CONTEXT_MESSAGE = 'Create a match from a club you manage.';

export type CreateMatchStep = 'details' | 'schedule' | 'squad' | 'review';

export const MATCH_TYPES: { type: MatchType; label: string; icon: string }[] = [
  { type: 'FRIENDLY', label: 'Friendly', icon: 'people-outline' },
  { type: 'LEAGUE', label: 'League', icon: 'podium-outline' },
  { type: 'CUP', label: 'Cup', icon: 'trophy-outline' },
  { type: 'TOURNAMENT', label: 'Tournament', icon: 'medal-outline' },
];

const STEPS: CreateMatchStep[] = ['details', 'schedule', 'squad', 'review'];

type MatchCreateParams = {
  clubId?: string | string[];
  clubName?: string | string[];
  squadId?: string | string[];
};

function getRouteParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

function isMembershipForUser(membership: ClubMembership, userId: string | undefined): boolean {
  if (!userId) {
    return false;
  }
  const normalizedUserId = userId.replace(/^usr_/, '');
  return membership.userId === userId || membership.userId === normalizedUserId;
}

function resolveMatchClub(
  clubs: Club[],
  memberships: ClubMembership[],
  userId: string | undefined,
  requestedClubId: string | undefined,
  requestedClubName: string | undefined,
  allowRouteOnlyClub: boolean,
): { id: string; name: string } | null {
  if (requestedClubId) {
    const club = clubs.find((candidate) => candidate.id === requestedClubId);
    if (club) {
      return { id: club.id, name: requestedClubName ?? club.name };
    }
    return allowRouteOnlyClub && requestedClubName
      ? { id: requestedClubId, name: requestedClubName }
      : null;
  }

  const membershipClubIds = new Set(
    memberships
      .filter(
        (membership) => membership.status === 'active' && isMembershipForUser(membership, userId),
      )
      .map((membership) => membership.clubId),
  );
  const club = clubs.find((candidate) => membershipClubIds.has(candidate.id)) ?? clubs[0] ?? null;
  return club ? { id: club.id, name: club.name } : null;
}

export function useCreateMatch() {
  const { currentUser } = useAuth();
  const routeParams = useLocalSearchParams<MatchCreateParams>();
  const requestedClubId = getRouteParam(routeParams.clubId);
  const requestedClubName = getRouteParam(routeParams.clubName);
  const routeSquadId = getRouteParam(routeParams.squadId);

  const [step, setStep] = useState<CreateMatchStep>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeClubId, setActiveClubId] = useState('');
  const [activeClubName, setActiveClubName] = useState('');
  const [clubContextLoading, setClubContextLoading] = useState(true);
  const [clubContextError, setClubContextError] = useState<string | null>(null);
  const [clubContextVersion, setClubContextVersion] = useState(0);

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
  const canCreateWithoutSquad = !api.useMock;
  const canCreateSquad = Boolean(activeClubId);

  const updateSelectedSquadId = (squadId: string | null) => {
    setSelectedSquadId(squadId);
    if (!squadId) {
      setSquadMemberCount(0);
    }
  };

  useEffect(() => {
    let active = true;

    const loadMatchContext = async () => {
      setClubContextLoading(true);
      setClubContextError(null);

      try {
        if (!currentUser?.id && !api.useMock) {
          setActiveClubId('');
          setActiveClubName('');
          setSquads([]);
          setAutoInvite(false);
          setClubContextError('Sign in as a coach before creating a match.');
          return;
        }

        const clubsResult = await clubAuthorityService.listClubs();
        if (!active) return;

        if (!clubsResult.success) {
          logger.error('Failed to resolve clubs for match creation:', clubsResult.error);
          setActiveClubId('');
          setActiveClubName('');
          setSquads([]);
          setAutoInvite(false);
          setClubContextError(clubsResult.error.message);
          return;
        }

        const club = resolveMatchClub(
          clubsResult.data.clubs,
          clubsResult.data.memberships,
          currentUser?.id,
          requestedClubId,
          requestedClubName,
          api.useMock,
        );

        if (!club) {
          logger.warn('No club membership available for match creation');
          setActiveClubId('');
          setActiveClubName('');
          setSquads([]);
          setAutoInvite(false);
          setClubContextError(NO_CLUB_CONTEXT_MESSAGE);
          return;
        }

        setActiveClubId(club.id);
        setActiveClubName(club.name);

        const liveSquads = (await squadService.getSquads(club.id)).filter(
          (squad) => !squad.name.toLowerCase().includes('staff'),
        );
        if (active) {
          setSquads(liveSquads);
          const routeSquad = routeSquadId
            ? liveSquads.find((squad) => squad.id === routeSquadId)
            : null;
          if (routeSquadId) {
            updateSelectedSquadId(routeSquad?.id ?? null);
            if (!routeSquad) {
              logger.warn('Route squad is not available for match club context', {
                clubId: club.id,
                routeSquadId,
              });
            }
          }
          setAutoInvite(routeSquadId ? Boolean(routeSquad) : liveSquads.length > 0);
        }
      } catch (error) {
        logger.error('Failed to load squads:', error);
        if (active) {
          setActiveClubId('');
          setActiveClubName('');
          setSquads([]);
          setAutoInvite(false);
          setClubContextError('Failed to load club context for match creation.');
        }
      } finally {
        if (active) {
          setClubContextLoading(false);
        }
      }
    };
    // react-doctor-disable-next-line react-doctor/no-initialize-state -- squad options are loaded from the service after mount.
    void loadMatchContext();

    return () => {
      active = false;
    };
  }, [clubContextVersion, currentUser?.id, requestedClubId, requestedClubName, routeSquadId]);

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
    if (!activeClubId) {
      uiFeedback.showToast(NO_CLUB_CONTEXT_MESSAGE, 'error');
      return false;
    }

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
        if (selectedSquadId && !selectedSquad) {
          uiFeedback.showToast('Select a squad from this club.', 'error');
          return false;
        }
        if (canCreateWithoutSquad && (squads?.length ?? 0) === 0) {
          return true;
        }
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
    const coachId = currentUser?.id;
    if (!coachId) {
      uiFeedback.showToast('Sign in as a coach before creating a match.', 'error');
      return;
    }

    if (!activeClubId) {
      uiFeedback.showToast('Join or create a club before creating a match.', 'error');
      return;
    }
    const coachName = (
      currentUser.name ||
      currentUser.fullName ||
      currentUser.username ||
      ''
    ).trim();
    if (!coachName) {
      uiFeedback.showToast('Complete your account name before creating a match.', 'error');
      return;
    }

    setIsSubmitting(true);

    await runAsyncTryCatchFinally(
      async () => {
        const title = `${selectedSquad?.name || 'Team'} vs ${opponent}`;
        if (autoInvite && selectedSquadId && selectedSquad) {
          const result = await matchInviteService.inviteSquadToMatch({
            squadId: selectedSquadId,
            squadName: selectedSquad.name,
            matchTitle: title,
            opponent,
            isHome,
            date,
            kickoffTime,
            venue,
            clubId: activeClubId,
            clubName: activeClubName,
            coachId,
            coachName,
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
            clubId: activeClubId,
            clubName: activeClubName,
            squadId: selectedSquadId || undefined,
            squadName: selectedSquad?.name,
            coachId,
            coachName,
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
      },
      async (error) => {
        logger.error('Failed to create match:', error);
        uiFeedback.showToast('Failed to create match. Please try again.', 'error');
      },
      () => {
        setIsSubmitting(false);
      },
    );
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
    activeClubId,
    squads: squads ?? [],
    squadMemberCount,
    autoInvite,
    setAutoInvite,
    clubContextLoading,
    clubContextError,
    retryClubContext: () => setClubContextVersion((version) => version + 1),
    canCreateWithoutSquad,
    canCreateSquad,
    handleNext,
    handleBack,
    handleSubmit,
  };
}
