/** Backend-authoritative state for the club squad composer. */

import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { api } from '@/constants/config';
import type { Club, ClubMembership } from '@/constants/types';
import { useAuth } from '@/hooks/use-auth';
import { clubAuthorityService } from '@/services/club-authority-service';
import { squadService } from '@/services/squad-service';
import { socialFeedService } from '@/services/social-feed-service';
import { uiFeedback } from '@/services/ui-feedback';
import { canManageClubUi } from '@/utils/club-ui-permissions';
import { runAsyncFinally } from '@/utils/async-control';

export const AGE_GROUPS = ['U8', 'U10', 'U12', 'U14', 'U16', 'U18', 'Adult'] as const;
export const SQUAD_LEVELS = ['Foundation', 'Development', 'Competitive', 'Performance'] as const;

type SquadContextStatus = 'loading' | 'ready' | 'error' | 'denied' | 'empty';

type SquadContext = {
  status: SquadContextStatus;
  club?: Club;
  membership?: ClubMembership;
  message?: string;
};

function isMembershipForUser(membership: ClubMembership, userId: string): boolean {
  const normalizedUserId = userId.replace(/^usr_/, '');
  return membership.userId === userId || membership.userId === normalizedUserId;
}

export function useCreateSquad() {
  const { currentUser, isLoading: authLoading } = useAuth();
  const { clubId } = useLocalSearchParams<{ clubId?: string }>();
  const [squadName, setSquadName] = useState('');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [contextRequest, setContextRequest] = useState(0);
  const [squadContext, setSquadContext] = useState<SquadContext>({ status: 'loading' });
  const submissionInFlight = useRef(false);

  useEffect(() => {
    let active = true;

    const resolveContext = (clubs: Club[], memberships: ClubMembership[], userId: string) => {
      if (!clubId) {
        setSquadContext({
          status: 'empty',
          message: 'Choose a club before creating a squad.',
        });
        return;
      }

      const club = clubs.find((candidate) => candidate.id === clubId);
      const membership = memberships.find(
        (candidate) => candidate.clubId === clubId && isMembershipForUser(candidate, userId),
      );

      if (!club || !canManageClubUi(membership)) {
        setSquadContext({
          status: 'denied',
          message: 'You do not have permission to create squads for this club.',
        });
        return;
      }

      setSquadContext({ status: 'ready', club, membership });
    };

    const loadClubContext = async () => {
      if (authLoading) {
        if (active) setSquadContext({ status: 'loading' });
        return;
      }

      if (!currentUser?.id) {
        if (active) {
          setSquadContext({ status: 'denied', message: 'Sign in to create a squad.' });
        }
        return;
      }

      if (active) {
        setSquadContext({ status: 'loading' });
        setSubmitError(null);
      }

      if (api.useMock) {
        const clubs = socialFeedService.getUserClubs(currentUser.id);
        const memberships = socialFeedService.getUserMemberships(currentUser.id);
        if (active) resolveContext(clubs, memberships, currentUser.id);
        return;
      }

      try {
        const result = await clubAuthorityService.listClubs();
        if (!active) return;
        if (!result.success) {
          setSquadContext({ status: 'error', message: result.error.message });
          return;
        }
        resolveContext(result.data.clubs, result.data.memberships, currentUser.id);
      } catch {
        if (active) {
          setSquadContext({ status: 'error', message: 'Could not load your club access.' });
        }
      }
    };

    void loadClubContext();

    return () => {
      active = false;
    };
  }, [authLoading, clubId, contextRequest, currentUser?.id]);

  const canCreate =
    squadContext.status === 'ready' &&
    squadName.trim().length > 0 &&
    Boolean(selectedAgeGroup && selectedLevel) &&
    !isSubmitting;

  const handleCreate = async () => {
    if (submissionInFlight.current || !canCreate || !squadContext.club) return;

    submissionInFlight.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    await runAsyncFinally(
      async () => {
        try {
          const newSquad = await squadService.createSquad({
            clubId: squadContext.club!.id,
            name: squadName.trim(),
            ageGroup: selectedAgeGroup!,
            skillLevel: selectedLevel!,
          });
          uiFeedback.showToast(`${newSquad.name} created.`, 'success');
          router.back();
        } catch (error) {
          setSubmitError(
            error instanceof Error && error.message.trim()
              ? error.message
              : 'Could not create this squad. Try again.',
          );
        }
      },
      () => {
        submissionInFlight.current = false;
        setIsSubmitting(false);
      },
    );
  };

  return {
    club: squadContext.club,
    contextStatus: squadContext.status,
    contextMessage: squadContext.message,
    retryContext: () => setContextRequest((request) => request + 1),
    squadName,
    selectedAgeGroup,
    selectedLevel,
    isSubmitting,
    submitError,
    canCreate,
    setSquadName,
    setSelectedAgeGroup,
    setSelectedLevel,
    handleCreate,
  };
}
