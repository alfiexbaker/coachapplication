import { useReducer, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { groupSessionService, CreateGroupSessionInput } from '@/services/group-session-service';
import { createLogger } from '@/utils/logger';
import type { GroupSession, GroupSessionSchedule, FootballObjective, SessionInviteType } from '@/constants/types';

const logger = createLogger('CreateGroupSessionScreen');

const SESSION_TYPE_META: Record<string, { forSquad?: boolean }> = {
  TEAM_TRAINING: { forSquad: true },
  TRAINING: { forSquad: true },
};

export const DEFAULT_CLUB_ID = 'club_lions';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface SessionFormState {
  sessionType: GroupSession['sessionType'];
  inviteType: SessionInviteType;
  title: string;
  description: string;
  location: string;
  maxParticipants: string;
  ageMin: string;
  ageMax: string;
  skillLevel: GroupSession['skillLevel'];
  focus: FootballObjective[];
  price: string;
  waitlistEnabled: boolean;
  selectedSquadIds: string[];
  scheduleDate: string;
  scheduleStartTime: string;
  scheduleEndTime: string;
  isRecurring: boolean;
  recurringDayOfWeek: number;
  recurringUntil: string;
}

type SessionFormAction =
  | { type: 'SET_FIELD'; field: keyof SessionFormState; value: unknown }
  | { type: 'RESET' };

const initialState: SessionFormState = {
  sessionType: 'OPEN_SESSION',
  inviteType: 'OPEN' as SessionInviteType,
  title: '',
  description: '',
  location: '',
  maxParticipants: '10',
  ageMin: '',
  ageMax: '',
  skillLevel: 'ALL',
  focus: [],
  price: '0',
  waitlistEnabled: true,
  selectedSquadIds: [],
  scheduleDate: '',
  scheduleStartTime: '09:00',
  scheduleEndTime: '12:00',
  isRecurring: false,
  recurringDayOfWeek: -1,
  recurringUntil: '',
};

function sessionFormReducer(state: SessionFormState, action: SessionFormAction): SessionFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'RESET':
      return initialState;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export type WizardStep = 'type' | 'details' | 'schedule' | 'pricing' | 'review' | 'invite';

export function useCreateGroupSession() {
  const { currentUser } = useAuth();

  const [form, dispatch] = useReducer(sessionFormReducer, initialState);
  const [step, setStep] = useState<WizardStep>('type');
  const [loading, setLoading] = useState(false);
  const [createdSessionId, setCreatedSessionId] = useState<string | null>(null);
  const [showSquadInviteModal, setShowSquadInviteModal] = useState(false);
  const [squadInviteSent, setSquadInviteSent] = useState(false);

  const isSquadSession = !!SESSION_TYPE_META[form.sessionType]?.forSquad;

  const steps: WizardStep[] = isSquadSession
    ? ['type', 'details', 'schedule', 'pricing', 'review', 'invite']
    : ['type', 'details', 'schedule', 'pricing', 'review'];
  const currentStepIndex = steps.indexOf(step);

  const setField = useCallback((field: string, value: unknown) => {
    dispatch({ type: 'SET_FIELD', field: field as keyof SessionFormState, value });
  }, []);

  const canProceed = useCallback((): boolean => {
    switch (step) {
      case 'type': return true;
      case 'details': return form.title.trim().length > 0 && form.location.trim().length > 0;
      case 'schedule':
        if (form.isRecurring) return form.recurringDayOfWeek >= 0 && form.recurringDayOfWeek <= 6;
        return form.scheduleDate.trim().length > 0;
      case 'pricing': return true;
      case 'review': return true;
      case 'invite': return true;
      default: return false;
    }
  }, [step, form.title, form.location, form.isRecurring, form.recurringDayOfWeek, form.scheduleDate]);

  const goNext = useCallback(() => {
    const next = currentStepIndex + 1;
    if (next < steps.length) setStep(steps[next]);
  }, [currentStepIndex, steps]);

  const goBack = useCallback(() => {
    if (currentStepIndex > 0) setStep(steps[currentStepIndex - 1]);
    else router.back();
  }, [currentStepIndex, steps]);

  const handleCreate = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);

    try {
      const schedule: GroupSessionSchedule[] = form.isRecurring
        ? []
        : [{
            date: form.scheduleDate,
            startTime: form.scheduleStartTime,
            endTime: form.scheduleEndTime,
          }];

      const input: CreateGroupSessionInput = {
        coachId: currentUser.id,
        coachName: currentUser.name || 'Coach',
        coachPhotoUrl: currentUser.avatar,
        title: form.title,
        description: form.description,
        sessionType: form.sessionType,
        inviteType: form.inviteType,
        schedule,
        maxParticipants: parseInt(form.maxParticipants, 10) || 10,
        pricePerParticipant: parseFloat(form.price) || 0,
        currency: 'GBP',
        ageMin: form.ageMin ? parseInt(form.ageMin, 10) : undefined,
        ageMax: form.ageMax ? parseInt(form.ageMax, 10) : undefined,
        skillLevel: form.skillLevel,
        location: form.location,
        focus: form.focus,
        waitlistEnabled: form.waitlistEnabled,
        squadId: form.selectedSquadIds.length > 0 ? form.selectedSquadIds[0] : undefined,
        isRecurring: form.isRecurring || undefined,
        recurringPattern: form.isRecurring ? {
          dayOfWeek: form.recurringDayOfWeek,
          startTime: form.scheduleStartTime,
          endTime: form.scheduleEndTime,
          until: form.recurringUntil || undefined,
        } : undefined,
      };

      const session = await groupSessionService.createSession(input);
      await groupSessionService.publishSession(session.id);
      setCreatedSessionId(session.id);

      if (isSquadSession) {
        setStep('invite');
      } else {
        router.replace(Routes.groupSession(session.id));
      }
    } catch (error) {
      logger.error('Failed to create session:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, form, isSquadSession]);

  const handleSquadInviteSuccess = useCallback((result: { squadInviteId: string; successful: number; failed: number }) => {
    setSquadInviteSent(true);
    Alert.alert(
      'Invites Sent',
      `Successfully sent ${result.successful} invite${result.successful !== 1 ? 's' : ''} to squad members.`,
      [{ text: 'OK' }]
    );
  }, []);

  const handleFinish = useCallback(() => {
    if (createdSessionId) {
      router.replace(Routes.groupSession(createdSessionId));
    } else {
      router.back();
    }
  }, [createdSessionId]);

  const openSquadInviteModal = useCallback(() => setShowSquadInviteModal(true), []);
  const closeSquadInviteModal = useCallback(() => setShowSquadInviteModal(false), []);

  return {
    form, step, steps, currentStepIndex, loading,
    createdSessionId, showSquadInviteModal, squadInviteSent,
    isSquadSession, currentUser,
    setField, canProceed, goNext, goBack,
    handleCreate, handleSquadInviteSuccess, handleFinish,
    openSquadInviteModal, closeSquadInviteModal,
  };
}
