/**
 * Hook: useCreateEvent
 *
 * Manages create event wizard state: form reducer, step navigation, squad loading, submit.
 * Used by app/events/create.tsx
 */

import { useReducer, useState, useEffect } from 'react';

import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { api } from '@/constants/config';
import { useAuth } from '@/hooks/use-auth';
import { clubAuthorityService } from '@/services/club-authority-service';
import { eventService, CreateEventInput } from '@/services/event-service';
import { squadService } from '@/services/squad-service';
import { inviteService as bulkInviteService } from '@/services/invite';
import { isClubStaffRole } from '@/contracts/club-governance';
import { createLogger } from '@/utils/logger';
import type {
  Club,
  ClubEventType,
  ClubMembership,
  EventTargetAudience,
  ClubSquad,
} from '@/constants/types';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('useCreateEvent');
const USE_MOCK = api.useMock;
const NO_CLUB_CONTEXT_MESSAGE = 'You need event staff access to create a club event.';
const SQUAD_CONTEXT_ERROR_MESSAGE =
  'Failed to load squads for this club. Retry before choosing squad audience.';
const SQUAD_SELECTION_ERROR_MESSAGE =
  'Choose a squad from the live club squad list before creating this event.';

export interface EventFormState {
  eventType: ClubEventType;
  title: string;
  description: string;
  venue: string;
  address: string;
  isVirtual: boolean;
  meetingLink: string;
  date: string;
  startTime: string;
  endTime: string;
  targetAudience: EventTargetAudience | 'SQUADS' | 'SPECIFIC_ATHLETES';
  selectedSquadIds: string[];
  selectedAthleteIds: string[];
  maxAttendees: string;
  price: string;
  rsvpRequired: boolean;
  rsvpDeadline: string;
}

type EventFormAction =
  | { type: 'SET_FIELD'; field: keyof EventFormState; value: unknown }
  | { type: 'RESET' };

const initialState: EventFormState = {
  eventType: 'SOCIAL',
  title: '',
  description: '',
  venue: '',
  address: '',
  isVirtual: false,
  meetingLink: '',
  date: '',
  startTime: '10:00',
  endTime: '12:00',
  targetAudience: 'ALL',
  selectedSquadIds: [],
  selectedAthleteIds: [],
  maxAttendees: '',
  price: '0',
  rsvpRequired: true,
  rsvpDeadline: '',
};

function eventFormReducer(state: EventFormState, action: EventFormAction): EventFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'RESET':
      return initialState;
  }
}

export type WizardStep = 'type' | 'details' | 'schedule' | 'audience' | 'review';
export const STEPS: WizardStep[] = ['type', 'details', 'schedule', 'audience', 'review'];

type EventCreateParams = {
  clubId?: string | string[];
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

function isActiveEventStaffMembership(
  membership: ClubMembership,
  userId: string | undefined,
): boolean {
  return (
    membership.status === 'active' &&
    isMembershipForUser(membership, userId) &&
    isClubStaffRole(membership.role)
  );
}

function resolveEventClub(
  clubs: Club[],
  memberships: ClubMembership[],
  userId: string | undefined,
  requestedClubId: string | undefined,
): Club | null {
  const staffClubIds = new Set<string>();
  for (const membership of memberships) {
    if (isActiveEventStaffMembership(membership, userId)) {
      staffClubIds.add(membership.clubId);
    }
  }

  if (requestedClubId) {
    return clubs.find((club) => club.id === requestedClubId && staffClubIds.has(club.id)) ?? null;
  }

  return clubs.find((club) => staffClubIds.has(club.id)) ?? null;
}

export function useCreateEvent() {
  const { currentUser } = useAuth();
  const routeParams = useLocalSearchParams<EventCreateParams>();
  const requestedClubId = getRouteParam(routeParams.clubId);
  const routeSquadId = getRouteParam(routeParams.squadId);
  const [form, dispatch] = useReducer(eventFormReducer, initialState);
  const [step, setStep] = useState<WizardStep>('type');
  const [loading, setLoading] = useState(false);
  const [squads, setSquads] = useState<ClubSquad[]>([]);
  const [squadContextLoading, setSquadContextLoading] = useState(false);
  const [squadContextError, setSquadContextError] = useState<string | null>(null);
  const [squadContextVersion, setSquadContextVersion] = useState(0);
  const [clubContext, setClubContext] = useState({ clubId: '', clubName: '' });
  const [clubContextLoading, setClubContextLoading] = useState(true);
  const [clubContextError, setClubContextError] = useState<string | null>(null);
  const [clubContextVersion, setClubContextVersion] = useState(0);

  const currentStepIndex = STEPS.indexOf(step);
  const clubId = clubContext.clubId;
  const clubName = clubContext.clubName;

  useEffect(() => {
    let active = true;
    setClubContextLoading(true);
    setClubContextError(null);

    const clubsPromise = clubAuthorityService.listClubs();
    void clubsPromise
      .then((result) => {
        if (!active) return;

        if (!result.success) {
          setClubContext({ clubId: '', clubName: '' });
          setClubContextError(result.error.message);
          return;
        }

        const resolvedClub = resolveEventClub(
          result.data.clubs,
          result.data.memberships,
          currentUser?.id,
          requestedClubId,
        );
        if (!resolvedClub) {
          setClubContext({ clubId: '', clubName: '' });
          setClubContextError(NO_CLUB_CONTEXT_MESSAGE);
          return;
        }

        setClubContext({
          clubId: resolvedClub.id,
          clubName: resolvedClub.name,
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        logger.error('Failed to resolve club for event creation:', error);
        setClubContext({ clubId: '', clubName: '' });
        setClubContextError('Failed to load club context for event creation.');
      })
      .finally(() => {
        if (active) {
          setClubContextLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [clubContextVersion, currentUser?.id, requestedClubId]);

  useEffect(() => {
    if (!routeSquadId) {
      return;
    }

    dispatch({ type: 'SET_FIELD', field: 'targetAudience', value: 'SQUADS' });
    dispatch({ type: 'SET_FIELD', field: 'selectedSquadIds', value: [routeSquadId] });
  }, [routeSquadId]);

  useEffect(() => {
    if (!clubId) {
      return;
    }

    let active = true;
    setSquadContextLoading(true);
    setSquadContextError(null);

    const squadsPromise = squadService.getSquads(clubId);
    void squadsPromise
      .then((data) => {
        if (active) {
          setSquads(data.filter((squad) => !squad.name.toLowerCase().includes('staff')));
        }
      })
      .catch((error: unknown) => {
        logger.error('Failed to load squads:', error);
        if (active) {
          setSquads([]);
          if (!USE_MOCK) {
            setSquadContextError(SQUAD_CONTEXT_ERROR_MESSAGE);
          }
        }
      })
      .finally(() => {
        if (active) {
          setSquadContextLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [clubId, squadContextVersion]);

  const setField = (field: string, value: unknown) =>
    dispatch({ type: 'SET_FIELD', field: field as keyof EventFormState, value });

  const selectedSquadsHaveAuthority = (): boolean => {
    if (USE_MOCK || form.targetAudience !== 'SQUADS') {
      return true;
    }
    const liveSquadIds = new Set(squads.map((squad) => squad.id));
    return form.selectedSquadIds.every((squadId) => liveSquadIds.has(squadId));
  };

  const canProceed = (): boolean => {
    if (!clubId) {
      return false;
    }

    switch (step) {
      case 'type':
        return true;
      case 'details':
        return form.title.trim().length > 0 && (form.venue.trim().length > 0 || form.isVirtual);
      case 'schedule':
        return form.date.trim().length > 0;
      case 'audience':
        if (form.targetAudience === 'SQUADS') {
          return (
            form.selectedSquadIds.length > 0 &&
            !squadContextLoading &&
            !squadContextError &&
            selectedSquadsHaveAuthority()
          );
        }
        if (form.targetAudience === 'SPECIFIC_ATHLETES') return form.selectedAthleteIds.length > 0;
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    const next = currentStepIndex + 1;
    if (next < STEPS.length) setStep(STEPS[next]);
  };

  const goBack = () => {
    if (currentStepIndex > 0) setStep(STEPS[currentStepIndex - 1]);
    else router.back();
  };

  const handleCreate = async (publish: boolean = false) => {
    if (!currentUser) {
      uiFeedback.showToast('Sign in before creating an event.', 'error');
      return;
    }
    if (!clubId || !clubName) {
      uiFeedback.showToast(NO_CLUB_CONTEXT_MESSAGE, 'error');
      return;
    }
    if (form.targetAudience === 'SQUADS') {
      if (squadContextLoading || squadContextError) {
        uiFeedback.showToast(SQUAD_CONTEXT_ERROR_MESSAGE, 'error');
        return;
      }
      if (!selectedSquadsHaveAuthority()) {
        uiFeedback.showToast(SQUAD_SELECTION_ERROR_MESSAGE, 'error');
        return;
      }
    }
    const createdByName = (currentUser.name || currentUser.fullName || currentUser.username || '').trim();

    setLoading(true);

    await runAsyncTryCatchFinally(
      async () => {
        if (
          USE_MOCK &&
          form.targetAudience === 'SQUADS' &&
          form.selectedSquadIds.length > 0 &&
          publish
        ) {
          const result = await bulkInviteService.inviteSquadsToEvent({
            clubId,
            clubName,
            title: form.title,
            description: form.description,
            eventType: form.eventType,
            date: form.date,
            startTime: form.startTime,
            endTime: form.endTime || undefined,
            venue: form.isVirtual ? 'Online' : form.venue,
            isVirtual: form.isVirtual,
            squadIds: form.selectedSquadIds,
            createdBy: currentUser.id,
            createdByName,
            price: parseFloat(form.price) || 0,
            maxAttendees: form.maxAttendees ? parseInt(form.maxAttendees, 10) : undefined,
          });
          uiFeedback.showToast(
            `${form.title} created and ${result.inviteResult.successful} invite${
              result.inviteResult.successful !== 1 ? 's' : ''
            } sent to squad members.`,
            'success',
          );
          router.replace(Routes.event(result.event.id));
        } else {
          const input: CreateEventInput = {
            clubId,
            clubName,
            createdBy: currentUser.id,
            createdByName,
            title: form.title,
            description: form.description,
            eventType: form.eventType,
            date: form.date,
            startTime: form.startTime,
            endTime: form.endTime || undefined,
            venue: form.isVirtual ? 'Online' : form.venue,
            address: form.isVirtual ? undefined : form.address || undefined,
            isVirtual: form.isVirtual,
            meetingLink: form.isVirtual ? form.meetingLink || undefined : undefined,
            targetAudience:
              form.targetAudience === 'SQUADS'
                ? 'SQUAD'
                : form.targetAudience === 'SPECIFIC_ATHLETES'
                  ? 'ATHLETES'
                  : form.targetAudience,
            squadIds: form.targetAudience === 'SQUADS' ? form.selectedSquadIds : undefined,
            athleteIds:
              form.targetAudience === 'SPECIFIC_ATHLETES' ? form.selectedAthleteIds : undefined,
            maxAttendees: form.maxAttendees ? parseInt(form.maxAttendees, 10) : undefined,
            price: parseFloat(form.price) || 0,
            currency: 'GBP',
            rsvpRequired: form.rsvpRequired,
            rsvpDeadline: form.rsvpDeadline || undefined,
          };
          const event = await eventService.createEvent(input);
          if (publish) {
            const publishResult = await eventService.publishEvent(event.id);
            if (!publishResult.success) {
              uiFeedback.showToast(
                `Draft saved. ${publishResult.error.message || 'The event could not be published.'}`,
                'error',
              );
              router.replace(Routes.event(event.id));
              return;
            }
            try {
              if (form.targetAudience === 'SQUADS') {
                await eventService.inviteSquads(event.id, form.selectedSquadIds);
              } else if (form.targetAudience === 'SPECIFIC_ATHLETES') {
                await eventService.inviteAthletes(event.id, form.selectedAthleteIds);
              } else {
                await eventService.inviteClub(event.id);
              }
            } catch (inviteError) {
              logger.error('Event published without invitation delivery:', inviteError);
              uiFeedback.showToast(
                'Event published. Invitations were not sent. Open the event to send them again.',
                'error',
              );
            }
          }
          router.replace(Routes.event(event.id));
        }
      },
      async (error) => {
        logger.error('Failed to create event:', error);
        uiFeedback.showToast('Failed to create event. Please try again.', 'error');
      },
      () => {
        setLoading(false);
      },
    );
  };

  return {
    form,
    step,
    loading,
    squads,
    squadContextLoading,
    squadContextError,
    clubId,
    clubName,
    clubContextLoading,
    clubContextError,
    currentStepIndex,
    setField,
    canProceed,
    goNext,
    goBack,
    handleCreate,
    retryClubContext: () => setClubContextVersion((version) => version + 1),
    retrySquadContext: () => setSquadContextVersion((version) => version + 1),
  };
}
