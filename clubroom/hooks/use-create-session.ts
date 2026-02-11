/**
 * useCreateSession — Hook for session creation wizard.
 *
 * Encapsulates all form state, data loading, validation, and submit logic.
 * Screen component only handles rendering.
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { rosterService } from '@/services/roster-service';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import { getRosterAthleteName } from '@/utils/roster-display';
import type { SessionOffering, FootballObjective, SessionInviteType } from '@/constants/types';
import {
  type SessionType,
  type RecurrenceType,
  type WizardStep,
  WIZARD_STEPS,
  SESSION_TYPES,
} from '@/components/session/create-session-types';

const logger = createLogger('CreateSession');

// ============================================================================
// TYPES
// ============================================================================

export interface PastAthlete {
  id: string;
  name: string;
}

export interface CreateSessionState {
  // Wizard
  step: WizardStep;
  currentStepIndex: number;
  loading: boolean;

  // Step 1: Details
  sessionType: SessionType;
  title: string;
  description: string;
  duration: number;
  focusAreas: FootballObjective[];
  maxParticipants: string;

  // Step 2: Schedule
  recurrence: RecurrenceType;
  selectedDate: string;
  selectedTime: string;
  location: string;
  price: string;
  savedLocations: string[];

  // Step 3: Invite
  inviteType: SessionInviteType;
  selectedAthletes: string[];
  pastAthletes: PastAthlete[];
}

export interface CreateSessionActions {
  setSessionType: (v: SessionType) => void;
  setTitle: (v: string) => void;
  setDescription: (v: string) => void;
  setDuration: (v: number) => void;
  toggleFocusArea: (area: FootballObjective) => void;
  setMaxParticipants: (v: string) => void;
  setRecurrence: (v: RecurrenceType) => void;
  setSelectedDate: (v: string) => void;
  setSelectedTime: (v: string) => void;
  setLocation: (v: string) => void;
  setPrice: (v: string) => void;
  setInviteType: (v: SessionInviteType) => void;
  toggleAthleteSelection: (id: string) => void;
  goNext: () => void;
  goBack: () => void;
  canProceed: () => boolean;
  handleCreate: () => void;
  getDefaultMaxParticipants: () => number;
}

// ============================================================================
// HOOK
// ============================================================================

export function useCreateSession(): CreateSessionState & CreateSessionActions {
  const { currentUser } = useAuth();

  // Wizard state
  const [step, setStep] = useState<WizardStep>('details');
  const [loading, setLoading] = useState(false);
  const [savedLocations, setSavedLocations] = useState<string[]>([]);

  // Step 1
  const [sessionType, setSessionType] = useState<SessionType>('1on1');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(60);
  const [focusAreas, setFocusAreas] = useState<FootballObjective[]>([]);
  const [maxParticipants, setMaxParticipants] = useState('');

  // Step 2
  const [recurrence, setRecurrence] = useState<RecurrenceType>('once');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');

  // Step 3: Invite
  const [inviteType, setInviteType] = useState<SessionInviteType>('OPEN');
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [pastAthletes, setPastAthletes] = useState<PastAthlete[]>([]);

  const currentStepIndex = WIZARD_STEPS.indexOf(step);

  // --------------------------------------------------------------------------
  // DATA LOADING
  // --------------------------------------------------------------------------

  useEffect(() => {
    const loadSavedLocations = async () => {
      try {
        const locations = await apiClient.get<string[] | null>(STORAGE_KEYS.SAVED_LOCATIONS, null);
        if (locations) setSavedLocations(locations);
      } catch (error) {
        logger.error('Failed to load saved locations', error);
      }
    };
    loadSavedLocations();
  }, []);

  useEffect(() => {
    const loadPastAthletes = async () => {
      if (!currentUser?.id) return;
      try {
        const roster = await rosterService.getRoster(currentUser.id);
        const athletes = roster.map((entry) => ({
          id: entry.athleteId,
          name: getRosterAthleteName(entry),
        }));
        setPastAthletes(athletes);
      } catch (error) {
        logger.error('Failed to load athletes', error);
      }
    };
    loadPastAthletes();
  }, [currentUser]);

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  const getDefaultMaxParticipants = useCallback(() => {
    const typeConfig = SESSION_TYPES.find((t) => t.key === sessionType);
    return typeConfig?.maxParticipants || 1;
  }, [sessionType]);

  const saveLocation = useCallback(
    async (loc: string) => {
      if (!loc || savedLocations.includes(loc)) return;
      const updated = [loc, ...savedLocations.slice(0, 4)];
      setSavedLocations(updated);
      try {
        await apiClient.set(STORAGE_KEYS.SAVED_LOCATIONS, updated);
      } catch (error) {
        logger.error('Failed to save location', error);
      }
    },
    [savedLocations],
  );

  // --------------------------------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------------------------------

  const canProceed = useCallback(() => {
    switch (step) {
      case 'details':
        return title.trim().length > 0;
      case 'schedule':
        return selectedDate.trim().length > 0 && location.trim().length > 0;
      case 'review':
        return true;
      default:
        return false;
    }
  }, [step, title, selectedDate, location]);

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < WIZARD_STEPS.length) {
      setStep(WIZARD_STEPS[nextIndex]);
    }
  }, [currentStepIndex]);

  const goBack = useCallback(() => {
    if (currentStepIndex > 0) {
      setStep(WIZARD_STEPS[currentStepIndex - 1]);
    } else {
      router.back();
    }
  }, [currentStepIndex]);

  // --------------------------------------------------------------------------
  // FORM ACTIONS
  // --------------------------------------------------------------------------

  const toggleFocusArea = useCallback((area: FootballObjective) => {
    setFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area],
    );
  }, []);

  const toggleAthleteSelection = useCallback((athleteId: string) => {
    setSelectedAthletes((prev) =>
      prev.includes(athleteId) ? prev.filter((id) => id !== athleteId) : [...prev, athleteId],
    );
  }, []);

  // --------------------------------------------------------------------------
  // SUBMIT
  // --------------------------------------------------------------------------

  const handleCreate = useCallback(async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      await saveLocation(location);

      const participants = maxParticipants
        ? parseInt(maxParticipants, 10)
        : getDefaultMaxParticipants();

      const scheduledAt = `${selectedDate}T${selectedTime}:00`;

      const newOffering: SessionOffering = {
        id: `session_${Date.now()}`,
        coachId: currentUser.id,
        title,
        description: description || undefined,
        sessionType: sessionType === '1on1' ? '1on1' : 'group',
        inviteType,
        maxParticipants: participants,
        location,
        scheduledAt,
        isRecurring: recurrence !== 'once',
        recurrenceType: recurrence === 'weekly' ? 'weekly' : 'none',
        dayOfWeek: recurrence !== 'once' ? new Date(scheduledAt).getDay() : undefined,
        timeOfDay: recurrence !== 'once' ? selectedTime : undefined,
        status: 'active',
        registrations: [],
        createdAt: new Date().toISOString(),
        priceUsd: price ? parseFloat(price) : undefined,
        footballSkill: focusAreas[0] || undefined,
      };

      const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
      offerings.push(newOffering);
      await apiClient.set('session_offerings', offerings);

      if (inviteType === 'CLOSED' && selectedAthletes.length > 0) {
        logger.info('Sending invites to athletes', { athleteIds: selectedAthletes, inviteType });
      }

      Alert.alert('Session Created!', `"${title}" has been created successfully.`, [
        {
          text: 'View Schedule',
          onPress: () => router.replace(Routes.SCHEDULE),
        },
        {
          text: 'Create Another',
          onPress: () => {
            setStep('details');
            setTitle('');
            setDescription('');
            setPrice('');
            setSelectedDate('');
            setFocusAreas([]);
            setInviteType('OPEN');
            setSelectedAthletes([]);
          },
        },
      ]);
    } catch (error) {
      logger.error('Failed to create session:', error);
      Alert.alert('Error', 'Failed to create session. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [
    currentUser,
    location,
    maxParticipants,
    getDefaultMaxParticipants,
    selectedDate,
    selectedTime,
    title,
    description,
    sessionType,
    inviteType,
    recurrence,
    price,
    focusAreas,
    selectedAthletes,
    saveLocation,
  ]);

  return {
    // State
    step,
    currentStepIndex,
    loading,
    sessionType,
    title,
    description,
    duration,
    focusAreas,
    maxParticipants,
    recurrence,
    selectedDate,
    selectedTime,
    location,
    price,
    savedLocations,
    inviteType,
    selectedAthletes,
    pastAthletes,

    // Actions
    setSessionType,
    setTitle,
    setDescription,
    setDuration,
    toggleFocusArea,
    setMaxParticipants,
    setRecurrence,
    setSelectedDate,
    setSelectedTime,
    setLocation,
    setPrice,
    setInviteType,
    toggleAthleteSelection,
    goNext,
    goBack,
    canProceed,
    handleCreate,
    getDefaultMaxParticipants,
  };
}
