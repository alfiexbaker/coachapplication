/**
 * Hook: useCreateEvent
 *
 * Manages create event wizard state: form reducer, step navigation, squad loading, submit.
 * Used by app/events/create.tsx
 */

import { useReducer, useState, useEffect } from 'react';

import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { api } from '@/constants/config';
import { useAuth } from '@/hooks/use-auth';
import { eventService, CreateEventInput } from '@/services/event-service';
import { squadService } from '@/services/squad-service';
import { inviteService as bulkInviteService } from '@/services/invite';
import { createLogger } from '@/utils/logger';
import type { ClubEventType, EventTargetAudience, ClubSquad } from '@/constants/types';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('useCreateEvent');
export const DEFAULT_EVENT_CLUB_ID = 'clb_4ee614a0-62ee-73ff-9328-0f74a326c2c1';
const DEFAULT_CLUB_NAME = 'Riverside FC';
const USE_MOCK = api.useMock;

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

export function useCreateEvent() {
  const { currentUser } = useAuth();
  const [form, dispatch] = useReducer(eventFormReducer, initialState);
  const [step, setStep] = useState<WizardStep>('type');
  const [loading, setLoading] = useState(false);
  const [squads, setSquads] = useState<ClubSquad[]>([]);

  const currentStepIndex = STEPS.indexOf(step);

  useEffect(() => {
    (async () => {
      try {
        const data = await squadService.getSquads(DEFAULT_EVENT_CLUB_ID);
        setSquads(data.filter((s) => !s.name.toLowerCase().includes('staff')));
      } catch (error) {
        logger.error('Failed to load squads:', error);
      }
    })();
  }, []);

  const setField = (field: string, value: unknown) =>
    dispatch({ type: 'SET_FIELD', field: field as keyof EventFormState, value });

  const canProceed = (): boolean => {
    switch (step) {
      case 'type':
        return true;
      case 'details':
        return form.title.trim().length > 0 && (form.venue.trim().length > 0 || form.isVirtual);
      case 'schedule':
        return form.date.trim().length > 0;
      case 'audience':
        if (form.targetAudience === 'SQUADS') return form.selectedSquadIds.length > 0;
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
    if (!currentUser) return;
    setLoading(true);

    await runAsyncTryCatchFinally(async () => {
      if (USE_MOCK && form.targetAudience === 'SQUADS' && form.selectedSquadIds.length > 0 && publish) {
        const result = await bulkInviteService.inviteSquadsToEvent({
          clubId: DEFAULT_EVENT_CLUB_ID,
          clubName: DEFAULT_CLUB_NAME,
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
          createdByName: currentUser.name || 'Coach',
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
          clubId: DEFAULT_EVENT_CLUB_ID,
          clubName: DEFAULT_CLUB_NAME,
          createdBy: currentUser.id,
          createdByName: currentUser.name || 'Coach',
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
          await eventService.publishEvent(event.id);
          if (form.targetAudience === 'SQUADS') {
            await eventService.inviteSquads(event.id, form.selectedSquadIds);
          } else if (form.targetAudience === 'SPECIFIC_ATHLETES') {
            await eventService.inviteAthletes(event.id, form.selectedAthleteIds);
          } else {
            await eventService.inviteClub(event.id);
          }
        }
        router.replace(Routes.event(event.id));
      }
    }, async error => {
      logger.error('Failed to create event:', error);
      uiFeedback.showToast('Failed to create event. Please try again.', 'error');
    }, () => {
      setLoading(false);
    });
  };

  return {
    form,
    step,
    loading,
    squads,
    currentStepIndex,
    setField,
    canProceed,
    goNext,
    goBack,
    handleCreate,
  };
}
