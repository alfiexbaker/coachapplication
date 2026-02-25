/**
 * useCreateSession — Hook for session creation wizard.
 *
 * Encapsulates all form state, data loading, validation, and submit logic.
 * Screen component only handles rendering.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { rosterService } from '@/services/roster-service';
import { inviteService as sessionInviteService } from '@/services/invite';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import { getRosterAthleteName, getRosterParentName } from '@/utils/roster-display';
import type { CoachLocationPreset } from '@/constants/location-presets';
import {
  createLocationPreset,
  dedupeLocationPresets,
  deriveLocationLabel,
  parseStoredLocationPresets,
} from '@/utils/location-presets';
import {
  getDisplayLocationLabel,
} from '@/utils/location-display';
import { recurringBookingService } from '@/services/recurring-booking-service';
import { groupSessionService } from '@/services/group-session-service';
import type {
  SessionOffering,
  FootballObjective,
  SessionInviteType,
  TimeSlot,
} from '@/constants/types';
import {
  type CampLength,
  type SessionType,
  type RecurrenceType,
  type WizardStep,
  WIZARD_STEPS,
  SESSION_TYPES,
} from '@/components/session/create-session-types';

const logger = createLogger('CreateSession');

const ALLOWED_RECURRENCE_BY_TYPE: Record<SessionType, RecurrenceType[]> = {
  '1on1': ['once', 'weekly', 'biweekly'],
  small_group: ['once', 'weekly', 'biweekly', 'monthly'],
  group: ['once', 'weekly', 'biweekly', 'monthly'],
  camp: ['once'],
};

const ALLOWED_INVITES_BY_TYPE: Record<SessionType, SessionInviteType[]> = {
  '1on1': ['CLOSED'],
  small_group: ['OPEN', 'CLOSED'],
  group: ['OPEN', 'CLOSED', 'SQUAD_ONLY'],
  camp: ['OPEN', 'CLOSED', 'SQUAD_ONLY'],
};

const PARTICIPANT_RULES: Record<
  SessionType,
  { defaultValue: number; min: number; max?: number }
> = {
  '1on1': { defaultValue: 1, min: 1, max: 1 },
  small_group: { defaultValue: 4, min: 2, max: 4 },
  group: { defaultValue: 12, min: 5 },
  camp: { defaultValue: 20, min: 6 },
};

const MIN_DURATION_MINUTES = 15;
const MAX_DURATION_MINUTES = 480;

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseTimeToMinutes(time: string): number | null {
  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = parseInt(hoursRaw, 10);
  const minutes = parseInt(minutesRaw, 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

function durationBetweenTimes(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start === null || end === null) return 0;
  return end - start;
}

function isValidTimeWindow(startTime: string, endTime: string): boolean {
  const duration = durationBetweenTimes(startTime, endTime);
  return duration >= MIN_DURATION_MINUTES && duration <= MAX_DURATION_MINUTES;
}

function buildCampDates(startDate: string, endDate?: string): string[] | null {
  if (!startDate) return [];
  if (!endDate || endDate < startDate) return [startDate];

  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const finalDate = new Date(`${endDate}T00:00:00`);
  const maxDays = 21; // Guard against accidental huge camp ranges

  while (cursor <= finalDate && dates.length < maxDays) {
    // Keep local calendar date stable across timezones (critical for UK BST camps).
    dates.push(formatLocalDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  if (cursor <= finalDate) {
    return null;
  }

  return dates;
}

function normalizeParticipantsForType(sessionType: SessionType, rawValue: string): number {
  const rules = PARTICIPANT_RULES[sessionType];
  const parsed = rawValue ? parseInt(rawValue, 10) : NaN;

  if (!Number.isFinite(parsed)) {
    return rules.defaultValue;
  }

  if (parsed < rules.min) {
    return rules.defaultValue;
  }

  if (typeof rules.max === 'number' && parsed > rules.max) {
    return rules.max;
  }

  return parsed;
}

// ============================================================================
// TYPES
// ============================================================================

export interface PastAthlete {
  id: string;
  name: string;
  parentId: string;
  parentName: string;
}

export interface CampDailyTime {
  startTime: string;
  endTime: string;
}

type LocationCoordinates = { latitude: number; longitude: number };

interface SaveLocationPresetPayload {
  label: string;
  address: string;
  coordinates: LocationCoordinates;
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
  focusAreas: FootballObjective[];
  maxParticipants: string;

  // Step 2: Schedule
  recurrence: RecurrenceType;
  selectedDate: string;
  campLength: CampLength;
  campEndDate: string;
  allowedRecurrenceOptions: RecurrenceType[];
  selectedTime: string;
  selectedEndTime: string;
  campDatesPreview: string[];
  useCampDailyTimes: boolean;
  campDailyTimes: Record<string, CampDailyTime>;
  location: string;
  venueName: string;
  locationCoordinates: LocationCoordinates | null;
  price: string;
  savedLocations: CoachLocationPreset[];

  // Step 3: Invite
  inviteType: SessionInviteType;
  allowedInviteTypes: SessionInviteType[];
  selectedAthletes: string[];
  pastAthletes: PastAthlete[];
}

export interface CreateSessionActions {
  setSessionType: (v: SessionType) => void;
  setTitle: (v: string) => void;
  setDescription: (v: string) => void;
  toggleFocusArea: (area: FootballObjective) => void;
  setMaxParticipants: (v: string) => void;
  setRecurrence: (v: RecurrenceType) => void;
  setSelectedDate: (v: string) => void;
  setCampLength: (v: CampLength) => void;
  setCampEndDate: (v: string) => void;
  setSelectedTime: (v: string) => void;
  setSelectedEndTime: (v: string) => void;
  setUseCampDailyTimes: (v: boolean) => void;
  setCampDailyTime: (date: string, field: keyof CampDailyTime, value: string) => void;
  setLocation: (v: string) => void;
  setVenueName: (v: string) => void;
  selectSavedLocation: (preset: CoachLocationPreset) => void;
  saveLocationPreset: (payload: SaveLocationPresetPayload) => void;
  setLocationCoordinates: (v: LocationCoordinates | null) => void;
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
  const params = useLocalSearchParams<{
    athleteIds?: string;
    preset?: '1on1' | 'group';
    inviteType?: SessionInviteType;
  }>();

  // Wizard state
  const [step, setStep] = useState<WizardStep>('details');
  const [loading, setLoading] = useState(false);
  const [savedLocations, setSavedLocations] = useState<CoachLocationPreset[]>([]);

  // Step 1
  const [sessionType, setSessionTypeState] = useState<SessionType>('1on1');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [focusAreas, setFocusAreas] = useState<FootballObjective[]>([]);
  const [maxParticipants, setMaxParticipants] = useState('');

  // Step 2
  const [recurrence, setRecurrenceState] = useState<RecurrenceType>('once');
  const [selectedDate, setSelectedDate] = useState('');
  const [campLength, setCampLength] = useState<CampLength>('single_day');
  const [campEndDate, setCampEndDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [selectedEndTime, setSelectedEndTime] = useState('11:00');
  const [useCampDailyTimes, setUseCampDailyTimes] = useState(false);
  const [campDailyTimes, setCampDailyTimes] = useState<Record<string, CampDailyTime>>({});
  const [location, setLocation] = useState('');
  const [venueName, setVenueName] = useState('');
  const [locationCoordinates, setLocationCoordinates] = useState<LocationCoordinates | null>(null);
  const [price, setPrice] = useState('');

  // Step 3: Invite
  const [inviteType, setInviteTypeState] = useState<SessionInviteType>('CLOSED');
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [pastAthletes, setPastAthletes] = useState<PastAthlete[]>([]);

  const currentStepIndex = WIZARD_STEPS.indexOf(step);
  const allowedRecurrenceOptions = ALLOWED_RECURRENCE_BY_TYPE[sessionType];
  const allowedInviteTypes = ALLOWED_INVITES_BY_TYPE[sessionType];
  const campRangeEnd = campLength === 'multi_day' ? campEndDate : selectedDate;
  const campDateRange = useMemo(
    () => buildCampDates(selectedDate, campRangeEnd),
    [selectedDate, campRangeEnd],
  );
  const campDatesPreview = campDateRange ?? [];
  const campRangeTooLong = campDateRange === null;

  const setRecurrence = useCallback(
    (next: RecurrenceType) => {
      if (allowedRecurrenceOptions.includes(next)) {
        setRecurrenceState(next);
      }
    },
    [allowedRecurrenceOptions],
  );

  const setInviteType = useCallback(
    (next: SessionInviteType) => {
      if (allowedInviteTypes.includes(next)) {
        setInviteTypeState(next);
      }
    },
    [allowedInviteTypes],
  );

  const setCampDailyTime = useCallback(
    (date: string, field: keyof CampDailyTime, value: string) => {
      setCampDailyTimes((previous) => ({
        ...previous,
        [date]: {
          ...(previous[date] ?? { startTime: selectedTime, endTime: selectedEndTime }),
          [field]: value,
        },
      }));
    },
    [selectedTime, selectedEndTime],
  );

  const setSessionType = useCallback((next: SessionType) => {
    setSessionTypeState(next);

    if (next === 'camp') {
      setMaxParticipants((previous) => String(normalizeParticipantsForType(next, previous)));
      setCampLength('single_day');
      setCampEndDate('');
      setUseCampDailyTimes(false);
      setCampDailyTimes({});
    } else if (next === '1on1') {
      setMaxParticipants(String(PARTICIPANT_RULES['1on1'].defaultValue));
      setCampLength('single_day');
      setCampEndDate('');
      setUseCampDailyTimes(false);
      setCampDailyTimes({});
    } else if (next === 'small_group') {
      setMaxParticipants((previous) => String(normalizeParticipantsForType(next, previous)));
      setCampLength('single_day');
      setCampEndDate('');
      setUseCampDailyTimes(false);
      setCampDailyTimes({});
    } else {
      setMaxParticipants((previous) => String(normalizeParticipantsForType(next, previous)));
      setCampLength('single_day');
      setCampEndDate('');
      setUseCampDailyTimes(false);
      setCampDailyTimes({});
    }

    const allowedRecurrence = ALLOWED_RECURRENCE_BY_TYPE[next];
    setRecurrenceState((previous) =>
      allowedRecurrence.includes(previous) ? previous : allowedRecurrence[0],
    );

    const allowedInvites = ALLOWED_INVITES_BY_TYPE[next];
    setInviteTypeState((previous) =>
      allowedInvites.includes(previous) ? previous : allowedInvites[0],
    );
  }, []);

  // --------------------------------------------------------------------------
  // DATA LOADING
  // --------------------------------------------------------------------------

  useEffect(() => {
    const loadSavedLocations = async () => {
      try {
        const locations = await apiClient.get<unknown>(STORAGE_KEYS.SAVED_LOCATIONS, null);
        setSavedLocations(parseStoredLocationPresets(locations));
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
          parentId: entry.parentId,
          parentName: getRosterParentName(entry),
        }));
        setPastAthletes(athletes);
      } catch (error) {
        logger.error('Failed to load athletes', error);
      }
    };
    loadPastAthletes();
  }, [currentUser]);

  useEffect(() => {
    const presetAthleteIds = params.athleteIds
      ? params.athleteIds
          .split(',')
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
      : [];

    if (presetAthleteIds.length > 0) {
      setSelectedAthletes((prev) => {
        const merged = new Set([...prev, ...presetAthleteIds]);
        return Array.from(merged);
      });
    }

    if (params.inviteType) {
      setInviteTypeState(params.inviteType);
    } else if (presetAthleteIds.length > 0) {
      setInviteTypeState('CLOSED');
    }

    if (params.preset === '1on1') {
      setSessionType('1on1');
      setMaxParticipants('1');
    } else if (params.preset === 'group') {
      setSessionType('small_group');
      setMaxParticipants('4');
    }
  }, [params.athleteIds, params.inviteType, params.preset]);

  useEffect(() => {
    if (!allowedInviteTypes.includes(inviteType)) {
      setInviteTypeState(allowedInviteTypes[0]);
    }
  }, [allowedInviteTypes, inviteType]);

  useEffect(() => {
    if (!allowedRecurrenceOptions.includes(recurrence)) {
      setRecurrenceState(allowedRecurrenceOptions[0]);
    }
  }, [allowedRecurrenceOptions, recurrence]);

  useEffect(() => {
    if (sessionType !== 'camp' || campLength !== 'multi_day') {
      setUseCampDailyTimes(false);
    }
  }, [sessionType, campLength]);

  useEffect(() => {
    if (sessionType !== 'camp' || campLength !== 'multi_day' || !useCampDailyTimes) {
      return;
    }

    setCampDailyTimes((previous) => {
      const next: Record<string, CampDailyTime> = {};
      campDatesPreview.forEach((date) => {
        next[date] = previous[date] ?? { startTime: selectedTime, endTime: selectedEndTime };
      });
      return next;
    });
  }, [
    sessionType,
    campLength,
    useCampDailyTimes,
    campDatesPreview,
    selectedTime,
    selectedEndTime,
  ]);

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  const getDefaultMaxParticipants = useCallback(() => {
    const typeConfig = SESSION_TYPES.find((t) => t.key === sessionType);
    return typeConfig?.maxParticipants || 1;
  }, [sessionType]);

  const saveLocation = useCallback(
    async (input: {
      address: string;
      coordinates: LocationCoordinates | null;
      label?: string;
    }) => {
      const preset = createLocationPreset({
        label: input.label,
        address: input.address,
        coordinates: input.coordinates,
      });
      if (!preset) return;

      const updated = dedupeLocationPresets([preset, ...savedLocations]).slice(0, 8);
      setSavedLocations(updated);
      try {
        await apiClient.set(STORAGE_KEYS.SAVED_LOCATIONS, updated);
      } catch (error) {
        logger.error('Failed to save location', error);
      }
    },
    [savedLocations],
  );
  const selectSavedLocation = useCallback((preset: CoachLocationPreset) => {
    setLocation(preset.address);
    setLocationCoordinates(preset.coordinates ?? null);
    setVenueName((previous) => previous || preset.label);
  }, []);
  const saveLocationPreset = useCallback(
    (payload: SaveLocationPresetPayload) => {
      void saveLocation({
        label: payload.label,
        address: payload.address.trim(),
        coordinates: payload.coordinates,
      });
    },
    [saveLocation],
  );

  // --------------------------------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------------------------------

  const canProceed = useCallback(() => {
    switch (step) {
      case 'details':
        return title.trim().length > 0;
      case 'schedule': {
        const hasLocation = location.trim().length > 0 || locationCoordinates !== null;
        if (selectedDate.trim().length === 0 || !hasLocation) {
          return false;
        }
        if (!isValidTimeWindow(selectedTime, selectedEndTime)) {
          return false;
        }
        if (sessionType === 'camp' && campLength === 'multi_day') {
          if (campEndDate.trim().length === 0 || campEndDate < selectedDate || campRangeTooLong) {
            return false;
          }
          if (useCampDailyTimes) {
            return campDatesPreview.every((date) => {
              const range = campDailyTimes[date];
              if (!range) return false;
              return isValidTimeWindow(range.startTime, range.endTime);
            });
          }
        }
        return true;
      }
      case 'review':
        return true;
      default:
        return false;
    }
  }, [
    step,
    title,
    selectedDate,
    location,
    locationCoordinates,
    selectedTime,
    selectedEndTime,
    sessionType,
    campLength,
    campEndDate,
    campRangeTooLong,
    useCampDailyTimes,
    campDatesPreview,
    campDailyTimes,
  ]);

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
      const resolvedLocation = getDisplayLocationLabel(location, locationCoordinates);
      const normalizedVenueName = venueName.trim() || undefined;

      await saveLocation({
        address: resolvedLocation,
        coordinates: locationCoordinates,
        label: normalizedVenueName || deriveLocationLabel(resolvedLocation),
      });

      const participants = normalizeParticipantsForType(sessionType, maxParticipants);
      const parsedPrice = price ? parseFloat(price) : undefined;
      const selectedAthleteRecords = pastAthletes.filter((athlete) =>
        selectedAthletes.includes(athlete.id),
      );

      const primaryDuration = durationBetweenTimes(selectedTime, selectedEndTime);
      if (!isValidTimeWindow(selectedTime, selectedEndTime)) {
        Alert.alert('Invalid time range', 'End time must be after start time (15 min to 8 hours).');
        setLoading(false);
        return;
      }

      const scheduledAt = `${selectedDate}T${selectedTime}:00`;
      const isRecurring = recurrence !== 'once';

      const sendSelectedAthleteInvites = async (options: {
        proposedSlots: TimeSlot[];
        sessionTypeLabel: string;
        focusLabel: string;
        notesLabel?: string;
        existingSessionId?: string;
        locationCoordinates?: LocationCoordinates | null;
      }) => {
        if (selectedAthletes.length === 0) {
          return { invitesSent: 0, inviteFailures: 0 };
        }

        const athletesByParent = selectedAthleteRecords.reduce<Record<string, PastAthlete[]>>(
          (acc, athlete) => {
            const key = athlete.parentId || 'unknown_parent';
            if (!acc[key]) acc[key] = [];
            acc[key].push(athlete);
            return acc;
          },
          {},
        );

        let invitesSent = 0;
        let inviteFailures = 0;

        for (const [parentId, athletesForParent] of Object.entries(athletesByParent)) {
          if (parentId === 'unknown_parent' || athletesForParent.length === 0) {
            inviteFailures += athletesForParent.length;
            continue;
          }

          const inviteResult = await sessionInviteService.createInvite(
            athletesForParent.map((athlete) => athlete.id),
            {
              coachId: currentUser.id,
              coachName: currentUser.name || currentUser.fullName || 'Coach',
              inviteType,
              athleteNames: athletesForParent.map((athlete) => athlete.name),
              parentId,
              parentName: athletesForParent[0]?.parentName || 'Parent',
              proposedSlots: options.proposedSlots,
              sessionType: options.sessionTypeLabel,
              focus: options.focusLabel,
              notes: options.notesLabel,
              price: parsedPrice,
              expiresInDays: 7,
              existingSessionId: options.existingSessionId,
              locationCoordinates: options.locationCoordinates ?? undefined,
            },
          );

          if (inviteResult.success) {
            invitesSent += athletesForParent.length;
          } else {
            inviteFailures += athletesForParent.length;
            logger.error('Failed to send athlete pre-invites', {
              parentId,
              error: inviteResult.error,
            });
          }
        }

        return { invitesSent, inviteFailures };
      };

      // Explicit guard: recurring sessions are not yet compatible with closed invite dispatch.
      if (isRecurring && inviteType === 'CLOSED' && selectedAthletes.length > 0) {
        Alert.alert(
          'Not supported yet',
          'Recurring sessions with closed invites are not supported yet. Create a one-off session or use open invites.',
        );
        setLoading(false);
        return;
      }

      // ---- CAMP PATH ----
      if (sessionType === 'camp') {
        if (!selectedDate || !campRangeEnd) {
          Alert.alert('Missing schedule', 'Select a camp start date and end date.');
          setLoading(false);
          return;
        }
        if (campRangeEnd < selectedDate) {
          Alert.alert('Invalid date range', 'Camp end date must be on or after start date.');
          setLoading(false);
          return;
        }

        const campDates = buildCampDates(selectedDate, campRangeEnd);
        if (!campDates) {
          Alert.alert('Camp too long', 'Camp range cannot exceed 21 days.');
          setLoading(false);
          return;
        }
        if (campDates.length === 0) {
          Alert.alert('Invalid schedule', 'Unable to build camp schedule. Check your dates.');
          setLoading(false);
          return;
        }

        const slots: TimeSlot[] = campDates.map((date) => {
          const slotTimes =
            campLength === 'multi_day' && useCampDailyTimes
              ? campDailyTimes[date] ?? { startTime: selectedTime, endTime: selectedEndTime }
              : { startTime: selectedTime, endTime: selectedEndTime };

          return {
            date,
            startTime: slotTimes.startTime,
            endTime: slotTimes.endTime,
            location: resolvedLocation,
            venueName: normalizedVenueName,
            locationCoordinates: locationCoordinates ?? undefined,
          };
        });

        const invalidSlot = slots.find((slot) => !isValidTimeWindow(slot.startTime, slot.endTime));
        if (invalidSlot) {
          Alert.alert(
            'Invalid camp day time',
            `Check time range for ${invalidSlot.date}. End time must be after start time.`,
          );
          setLoading(false);
          return;
        }

        const campSession = await groupSessionService.createSession({
          coachId: currentUser.id,
          coachName: currentUser.name || currentUser.fullName || 'Coach',
          title,
          description: description || 'Football camp session',
          sessionType: 'CAMP',
          schedule: slots.map((slot) => ({
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
          })),
          maxParticipants: participants,
          pricePerParticipant: parsedPrice ?? 0,
          currency: 'GBP',
          location: resolvedLocation,
          venueName: normalizedVenueName,
          locationCoordinates: locationCoordinates ?? undefined,
          focus: focusAreas,
          waitlistEnabled: true,
          isFree: (parsedPrice ?? 0) === 0,
          inviteType,
        });

        const publishResult = await groupSessionService.publishSession(campSession.id);
        if (!publishResult.success) {
          logger.warn('Camp created but not published', {
            sessionId: campSession.id,
            error: publishResult.error,
          });
        }

        const { invitesSent, inviteFailures } = await sendSelectedAthleteInvites({
          proposedSlots: slots,
          sessionTypeLabel: 'Camp',
          focusLabel: focusAreas[0] || 'General',
          notesLabel: description || undefined,
          existingSessionId: campSession.id,
          locationCoordinates,
        });

        const inviteSummary =
          invitesSent > 0 || inviteFailures > 0
            ? ` ${invitesSent} invite${invitesSent === 1 ? '' : 's'} sent${inviteFailures > 0 ? `, ${inviteFailures} failed.` : '.'}`
            : '';

        Alert.alert(
          'Camp Created!',
          `"${title}" scheduled across ${campDates.length} day${campDates.length === 1 ? '' : 's'}.${inviteSummary}`,
          [
            {
              text: 'View Schedule',
              onPress: () => router.replace(Routes.SCHEDULE),
            },
            {
              text: 'Create Another',
              onPress: () => {
                setStep('details');
                setSessionType('1on1');
                setTitle('');
                setDescription('');
                setPrice('');
                setSelectedDate('');
                setCampLength('single_day');
                setCampEndDate('');
                setSelectedTime('10:00');
                setSelectedEndTime('11:00');
                setUseCampDailyTimes(false);
                setCampDailyTimes({});
                setFocusAreas([]);
                setVenueName('');
                setInviteTypeState('CLOSED');
                setSelectedAthletes([]);
              },
            },
          ],
        );

        setLoading(false);
        return;
      }

      // ---- RECURRING PATH ----
      if (isRecurring) {
        const toFrequency = (r: RecurrenceType): 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' => {
          switch (r) {
            case 'weekly': return 'WEEKLY';
            case 'biweekly': return 'BIWEEKLY';
            case 'monthly': return 'MONTHLY';
            case 'once': return 'WEEKLY'; // unreachable — guarded by isRecurring check above
            default: {
              const _exhaustive: never = r;
              void _exhaustive;
              return 'WEEKLY';
            }
          }
        };

        const result = await recurringBookingService.createRecurring({
          userId: currentUser.id,
          coachId: currentUser.id,
          athleteId: undefined,
          dayOfWeek: new Date(scheduledAt).getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6,
          time: selectedTime,
          duration: primaryDuration,
          location: resolvedLocation,
          sessionType: title || (sessionType === '1on1' ? '1-on-1 Training' : 'Group Training'),
          frequency: toFrequency(recurrence),
          startDate: new Date(scheduledAt).toISOString(),
          pricePerSession: parsedPrice,
          notes: description || undefined,
        });

        if (result.success) {
          // Generate first batch of upcoming bookings
          await recurringBookingService.generateUpcomingBookings(result.data.id, 4);

          const { invitesSent, inviteFailures } = await sendSelectedAthleteInvites({
            proposedSlots: [
              {
                date: selectedDate,
                startTime: selectedTime,
                endTime: selectedEndTime,
                location: resolvedLocation,
                venueName: normalizedVenueName,
                locationCoordinates: locationCoordinates ?? undefined,
              },
            ],
            sessionTypeLabel:
              sessionType === '1on1' ? 'Recurring 1-on-1' : 'Recurring Session',
            focusLabel: focusAreas[0] || 'General',
            notesLabel: description || undefined,
            locationCoordinates,
          });

          const inviteSummary =
            invitesSent > 0 || inviteFailures > 0
              ? ` ${invitesSent} invite${invitesSent === 1 ? '' : 's'} sent${inviteFailures > 0 ? `, ${inviteFailures} failed.` : '.'}`
              : '';

          Alert.alert(
            'Session Created!',
            `Your next 4 sessions are on your schedule.${inviteSummary}`,
            [
              {
                text: 'View Schedule',
                onPress: () => router.replace(Routes.SCHEDULE),
              },
            ],
          );
        } else {
          Alert.alert('Error', result.error.message || 'Failed to create recurring session.');
        }

        setLoading(false);
        return;
      }

      // ---- ONE-OFF PATH (unchanged) ----
      const newOffering: SessionOffering = {
        id: `session_${Date.now()}`,
        coachId: currentUser.id,
        title,
        description: description || undefined,
        sessionType: sessionType === '1on1' ? '1on1' : 'group',
        inviteType,
        maxParticipants: participants,
        location: resolvedLocation,
        venueName: normalizedVenueName,
        locationCoordinates: locationCoordinates ?? undefined,
        scheduledAt,
        isRecurring: false,
        recurrenceType: 'none',
        status: 'active',
        registrations: [],
        createdAt: new Date().toISOString(),
        duration: primaryDuration,
        price: parsedPrice,
        footballSkill: focusAreas[0] || undefined,
        invitedAthleteIds: inviteType === 'CLOSED' ? selectedAthletes : undefined,
        invitedAthleteNames:
          inviteType === 'CLOSED' ? selectedAthleteRecords.map((athlete) => athlete.name) : undefined,
      };

      const offerings = await apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []);
      offerings.push(newOffering);
      await apiClient.set(STORAGE_KEYS.SESSION_OFFERINGS, offerings);

      const { invitesSent, inviteFailures } = await sendSelectedAthleteInvites({
        proposedSlots: [
          {
            date: selectedDate,
            startTime: selectedTime,
            endTime: selectedEndTime,
            location: resolvedLocation,
            venueName: normalizedVenueName,
            locationCoordinates: locationCoordinates ?? undefined,
          },
        ],
        sessionTypeLabel: sessionType === '1on1' ? '1-on-1' : 'Group',
        focusLabel: focusAreas[0] || 'General',
        notesLabel: description || undefined,
        locationCoordinates,
      });

      const inviteSummary =
        selectedAthletes.length > 0
          ? ` ${invitesSent} invite${invitesSent === 1 ? '' : 's'} sent${inviteFailures > 0 ? `, ${inviteFailures} failed.` : '.'}`
          : '';

      Alert.alert('Session Created!', `"${title}" has been created successfully.${inviteSummary}`, [
        {
          text: 'View Schedule',
          onPress: () => router.replace(Routes.SCHEDULE),
        },
        {
          text: 'Create Another',
          onPress: () => {
            setStep('details');
            setSessionType('1on1');
            setTitle('');
            setDescription('');
            setPrice('');
            setSelectedDate('');
            setCampLength('single_day');
            setCampEndDate('');
            setSelectedTime('10:00');
            setSelectedEndTime('11:00');
            setUseCampDailyTimes(false);
            setCampDailyTimes({});
            setFocusAreas([]);
            setVenueName('');
            setInviteTypeState('CLOSED');
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
    selectedDate,
    selectedTime,
    selectedEndTime,
    title,
    description,
    sessionType,
    campLength,
    campRangeEnd,
    campEndDate,
    useCampDailyTimes,
    campDailyTimes,
    inviteType,
    recurrence,
    price,
    venueName,
    locationCoordinates,
    focusAreas,
    selectedAthletes,
    pastAthletes,
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
    focusAreas,
    maxParticipants,
    recurrence,
    selectedDate,
    campLength,
    campEndDate,
    allowedRecurrenceOptions,
    selectedTime,
    selectedEndTime,
    campDatesPreview,
    useCampDailyTimes,
    campDailyTimes,
    location,
    venueName,
    locationCoordinates,
    price,
    savedLocations,
    inviteType,
    allowedInviteTypes,
    selectedAthletes,
    pastAthletes,

    // Actions
    setSessionType,
    setTitle,
    setDescription,
    toggleFocusArea,
    setMaxParticipants,
    setRecurrence,
    setSelectedDate,
    setCampLength,
    setCampEndDate,
    setSelectedTime,
    setSelectedEndTime,
    setUseCampDailyTimes,
    setCampDailyTime,
    setLocation,
    setVenueName,
    selectSavedLocation,
    saveLocationPreset,
    setLocationCoordinates,
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
