/**
 * useCreateSession — Hook for session creation wizard.
 *
 * Encapsulates all form state, data loading, validation, and submit logic.
 * Screen component only handles rendering.
 */

import { useState, useEffect, startTransition } from 'react';
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
import { getDisplayLocationLabel } from '@/utils/location-display';
import { recurringBookingService } from '@/services/recurring-booking-service';
import { groupSessionService } from '@/services/group-session-service';
import { academyService } from '@/services/academy-service';
import { userService } from '@/services/user-service';
import type {
  AcademyMembership,
  OrganizationCommercialMode,
  FootballObjective,
  SessionInviteType,
  TimeSlot,
  UserRole,
} from '@/constants/types';
import {
  type CampLength,
  type SessionType,
  type RecurrenceType,
  type WizardStep,
  WIZARD_STEPS,
  SESSION_TYPES,
} from '@/components/session/create-session-types';
import { uiFeedback } from '@/services/ui-feedback';
import { runAsyncTryCatchFinally } from '@/utils/async-control';
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
  {
    defaultValue: number;
    min: number;
    max?: number;
  }
> = {
  '1on1': {
    defaultValue: 1,
    min: 1,
    max: 1,
  },
  small_group: {
    defaultValue: 4,
    min: 2,
    max: 4,
  },
  group: {
    defaultValue: 12,
    min: 5,
  },
  camp: {
    defaultValue: 20,
    min: 6,
  },
};
const MIN_DURATION_MINUTES = 30;
const MAX_DURATION_MINUTES = 480;
const MAX_CAMP_DAYS = 14;
const MAX_SCHEDULE_AHEAD_DAYS = 365;
const ASSIGNEE_ROLE_ORDER: Record<AcademyMembership['role'], number> = {
  OWNER: 0,
  ADMIN: 1,
  HEAD_COACH: 2,
  COACH: 3,
  ASSISTANT: 4,
  MEMBER: 5,
};
function canCreateAsClub(membership: AcademyMembership): boolean {
  return membership.permissions.includes('CREATE_SESSIONS');
}
function canPostAsClub(membership: AcademyMembership): boolean {
  return membership.permissions.includes('POST_AS_ACADEMY');
}
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
  const maxDays = MAX_CAMP_DAYS; // Policy limit

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
function getMaxScheduleDate(): Date {
  const max = new Date();
  max.setHours(23, 59, 59, 999);
  max.setDate(max.getDate() + MAX_SCHEDULE_AHEAD_DAYS);
  return max;
}
function isWithinScheduleWindow(dateStr: string): boolean {
  if (!dateStr) return false;
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;
  return date <= getMaxScheduleDate();
}
function parseSessionPrice(priceInput: string): number | undefined {
  if (!priceInput.trim()) return undefined;
  const parsed = Number.parseInt(priceInput, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}
function validateSessionPrice(priceInput: string): string | null {
  if (!priceInput.trim()) return null;
  if (!/^\d+$/.test(priceInput)) return 'Price must be between £10 and £200 (whole pounds only)';
  const parsed = Number.parseInt(priceInput, 10);
  if (parsed === 0) return null; // Preserve free-session support
  if (parsed < 10 || parsed > 200) return 'Price must be between £10 and £200 (whole pounds only)';
  return null;
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
export interface ClubOwnerOption {
  id: string;
  name: string;
  commercialMode?: OrganizationCommercialMode;
  membership: AcademyMembership;
}
export interface SessionAssigneeOption {
  id: string;
  label: string;
  role: AcademyMembership['role'];
}
export interface CampDailyTime {
  startTime: string;
  endTime: string;
}
type LocationCoordinates = {
  latitude: number;
  longitude: number;
};
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
  validationMessage: string | null;

  // Step 1: Details
  sessionType: SessionType;
  title: string;
  description: string;
  focusAreas: FootballObjective[];
  maxParticipants: string;
  postingAs: 'self' | 'club';
  selectedClubId: string | null;
  clubOptions: ClubOwnerOption[];
  assigneeOptions: SessionAssigneeOption[];
  selectedAssigneeId: string | null;

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
  setPostingAs: (v: 'self' | 'club') => void;
  setSelectedClubId: (v: string | null) => void;
  setSelectedAssigneeId: (v: string | null) => void;
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
  clearValidationMessage: () => void;
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
    actingAs?: 'self' | 'club';
    clubId?: string;
    assigneeCoachId?: string;
  }>();

  // Wizard state
  const [step, setStep] = useState<WizardStep>('details');
  const [loading, setLoading] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [savedLocations, setSavedLocations] = useState<CoachLocationPreset[]>([]);

  // Step 1
  const [sessionType, setSessionTypeState] = useState<SessionType>('1on1');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [focusAreas, setFocusAreas] = useState<FootballObjective[]>([]);
  const [maxParticipants, setMaxParticipants] = useState('');
  const [postingAs, setPostingAsState] = useState<'self' | 'club'>('self');
  const [clubOptionsLoaded, setClubOptionsLoaded] = useState(false);
  const [clubOptions, setClubOptions] = useState<ClubOwnerOption[]>([]);
  const [selectedClubId, setSelectedClubIdState] = useState<string | null>(null);
  const [assigneeOptions, setAssigneeOptions] = useState<SessionAssigneeOption[]>([]);
  const [selectedAssigneeId, setSelectedAssigneeIdState] = useState<string | null>(
    currentUser?.id ?? null,
  );

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
  const [price, setPriceState] = useState('');

  // Step 3: Invite
  const [inviteType, setInviteTypeState] = useState<SessionInviteType>('CLOSED');
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [pastAthletes, setPastAthletes] = useState<PastAthlete[]>([]);
  const clearValidationMessage = () => {
    setValidationMessage(null);
  };
  const currentStepIndex = WIZARD_STEPS.indexOf(step);
  const allowedRecurrenceOptions = ALLOWED_RECURRENCE_BY_TYPE[sessionType];
  const allowedInviteTypes = ALLOWED_INVITES_BY_TYPE[sessionType];
  const campRangeEnd = campLength === 'multi_day' ? campEndDate : selectedDate;
  const campDateRange = buildCampDates(selectedDate, campRangeEnd);
  const campDatesPreview = campDateRange ?? [];
  const campDatesPreviewKey = campDatesPreview.join('|');
  const campRangeTooLong = campDateRange === null;
  const priceError = validateSessionPrice(price);
  const datesWithinLimit = (() => {
    if (!selectedDate || !isWithinScheduleWindow(selectedDate)) return false;
    if (sessionType === 'camp' && campLength === 'multi_day' && campEndDate) {
      return isWithinScheduleWindow(campEndDate);
    }
    return true;
  })();
  const selectedClubOption = clubOptions.find((club) => club.id === selectedClubId) ?? null;
  const selectedCommercialMode =
    postingAs === 'club' ? (selectedClubOption?.commercialMode ?? 'COACH_OWNED') : undefined;
  const setRecurrence = (next: RecurrenceType) => {
    if (allowedRecurrenceOptions.includes(next)) {
      setRecurrenceState(next);
    }
  };
  const setInviteType = (next: SessionInviteType) => {
    if (allowedInviteTypes.includes(next)) {
      setInviteTypeState(next);
    }
  };
  const setCampDailyTime = (date: string, field: keyof CampDailyTime, value: string) => {
    setCampDailyTimes((previous) => ({
      ...previous,
      [date]: {
        ...(previous[date] ?? {
          startTime: selectedTime,
          endTime: selectedEndTime,
        }),
        [field]: value,
      },
    }));
  };
  const setPrice = (value: string) => {
    setPriceState(value.replace(/[^0-9]/g, ''));
  };
  const setPostingAs = (next: 'self' | 'club') => {
    if (next === 'club') {
      if (clubOptions.length === 0) return;
      setPostingAsState('club');
      setSelectedClubIdState((previous) => previous ?? clubOptions[0]?.id ?? null);
      return;
    }
    setPostingAsState('self');
    setSelectedAssigneeIdState(currentUser?.id ?? null);
  };
  const setSelectedClubId = (next: string | null) => {
    setSelectedClubIdState(next);
  };
  const setSelectedAssigneeId = (next: string | null) => {
    setSelectedAssigneeIdState(next);
  };
  const setSessionType = (next: SessionType) => {
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
  };

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
    startTransition(() => {
      loadSavedLocations();
    });
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
    startTransition(() => {
      loadPastAthletes();
    });
  }, [currentUser]);
  useEffect(() => {
    let active = true;
    const loadClubOptions = async () => {
      setClubOptionsLoaded(false);
      if (!currentUser?.id) {
        setClubOptions([]);
        setSelectedClubIdState(null);
        setClubOptionsLoaded(true);
        return;
      }
      const academyResult = await academyService.getUserAcademies(currentUser.id);
      if (!active) return;
      if (!academyResult.success) {
        setClubOptions([]);
        setSelectedClubIdState(null);
        setClubOptionsLoaded(true);
        return;
      }
      const nextOptions = academyResult.data.flatMap((club) =>
        canCreateAsClub(club.membership)
          ? [
              {
                id: club.id,
                name: club.name,
                commercialMode: club.commercialMode,
                membership: club.membership,
              },
            ]
          : [],
      );
      setClubOptions(nextOptions);
      setSelectedClubIdState((previous) => {
        if (previous && nextOptions.some((option) => option.id === previous)) {
          return previous;
        }
        return nextOptions[0]?.id ?? null;
      });
      setClubOptionsLoaded(true);
    };
    startTransition(() => {
      void loadClubOptions();
    });
    return () => {
      active = false;
    };
  }, [currentUser?.id]);
  useEffect(() => {
    let active = true;
    const loadAssignees = async () => {
      if (!selectedClubId) {
        setAssigneeOptions([]);
        setSelectedAssigneeIdState(currentUser?.id ?? null);
        return;
      }
      const staffResult = await academyService.getStaff(selectedClubId);
      if (!active) return;
      if (!staffResult.success) {
        setAssigneeOptions([]);
        return;
      }
      const staff = staffResult.data.filter((member) => member.status === 'ACTIVE');
      const usersResult = await userService.getUsersByIds(staff.map((member) => member.userId));
      const labelById = new Map<string, string>();
      if (usersResult.success) {
        usersResult.data.forEach((user) => {
          labelById.set(user.id, user.name || user.id);
        });
      }
      const mapped = staff
        .map((member) => ({
          id: member.userId,
          role: member.role,
          label: labelById.get(member.userId) ?? member.userId,
        }))
        .sort((a, b) => ASSIGNEE_ROLE_ORDER[a.role] - ASSIGNEE_ROLE_ORDER[b.role]);
      setAssigneeOptions(mapped);
      setSelectedAssigneeIdState((previous) => {
        if (previous && mapped.some((entry) => entry.id === previous)) return previous;
        if (currentUser?.id && mapped.some((entry) => entry.id === currentUser.id)) {
          return currentUser.id;
        }
        return mapped[0]?.id ?? null;
      });
    };
    startTransition(() => {
      void loadAssignees();
    });
    return () => {
      active = false;
    };
  }, [currentUser?.id, selectedClubId]);
  useEffect(() => {
    const presetAthleteIds = params.athleteIds
      ? params.athleteIds.split(',').flatMap((id) => {
          const mapped = id.trim();
          return mapped.length > 0 ? [mapped] : [];
        })
      : [];
    if (presetAthleteIds.length > 0) {
      startTransition(() => {
        setSelectedAthletes((prev) => {
          const merged = new Set([...prev, ...presetAthleteIds]);
          return Array.from(merged);
        });
      });
    }
    const inviteType = params.inviteType;
    if (inviteType) {
      startTransition(() => {
        setInviteTypeState(inviteType);
      });
    } else if (presetAthleteIds.length > 0) {
      startTransition(() => {
        setInviteTypeState('CLOSED');
      });
    }
    if (params.preset === '1on1') {
      startTransition(() => {
        setSessionType('1on1');
      });
      startTransition(() => {
        setMaxParticipants('1');
      });
    } else if (params.preset === 'group') {
      startTransition(() => {
        setSessionType('small_group');
      });
      startTransition(() => {
        setMaxParticipants('4');
      });
    }
    const clubId = params.clubId;
    if (clubId) {
      startTransition(() => {
        setSelectedClubIdState(clubId);
      });
    }
    const assigneeCoachId = params.assigneeCoachId;
    if (assigneeCoachId) {
      startTransition(() => {
        setSelectedAssigneeIdState(assigneeCoachId);
      });
    }
    if (params.actingAs === 'club') {
      startTransition(() => {
        setPostingAsState('club');
      });
    } else if (params.actingAs === 'self') {
      startTransition(() => {
        setPostingAsState('self');
      });
    }
  }, [
    params.actingAs,
    params.assigneeCoachId,
    params.athleteIds,
    params.clubId,
    params.inviteType,
    params.preset,
  ]);
  useEffect(() => {
    if (!allowedInviteTypes.includes(inviteType)) {
      startTransition(() => {
        setInviteTypeState(allowedInviteTypes[0]);
      });
    }
  }, [allowedInviteTypes, inviteType]);
  useEffect(() => {
    if (!allowedRecurrenceOptions.includes(recurrence)) {
      startTransition(() => {
        setRecurrenceState(allowedRecurrenceOptions[0]);
      });
    }
  }, [allowedRecurrenceOptions, recurrence]);
  useEffect(() => {
    if (postingAs !== 'club') {
      startTransition(() => {
        setSelectedAssigneeIdState(currentUser?.id ?? null);
      });
      return;
    }
    if (!clubOptionsLoaded) {
      return;
    }
    if (!selectedClubOption || !canPostAsClub(selectedClubOption.membership)) {
      startTransition(() => {
        setPostingAsState('self');
      });
      startTransition(() => {
        setSelectedAssigneeIdState(currentUser?.id ?? null);
      });
      return;
    }
    if (selectedAssigneeId) return;
    const defaultAssignee = assigneeOptions.find((entry) => entry.id === currentUser?.id);
    startTransition(() => {
      setSelectedAssigneeIdState(defaultAssignee?.id ?? assigneeOptions[0]?.id ?? null);
    });
  }, [
    assigneeOptions,
    clubOptionsLoaded,
    currentUser?.id,
    postingAs,
    selectedAssigneeId,
    selectedClubOption,
  ]);
  useEffect(() => {
    if (sessionType !== 'camp' || campLength !== 'multi_day') {
      startTransition(() => {
        setUseCampDailyTimes(false);
      });
    }
  }, [sessionType, campLength]);
  useEffect(() => {
    if (sessionType !== 'camp' || campLength !== 'multi_day' || !useCampDailyTimes) {
      return;
    }
    startTransition(() => {
      setCampDailyTimes((previous) => {
        const next: Record<string, CampDailyTime> = {};
        const campDates = campDatesPreviewKey ? campDatesPreviewKey.split('|') : [];
        campDates.forEach((date) => {
          next[date] = previous[date] ?? {
            startTime: selectedTime,
            endTime: selectedEndTime,
          };
        });
        return next;
      });
    });
  }, [
    sessionType,
    campLength,
    useCampDailyTimes,
    campDatesPreviewKey,
    selectedTime,
    selectedEndTime,
  ]);

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  const getDefaultMaxParticipants = () => {
    const typeConfig = SESSION_TYPES.find((t) => t.key === sessionType);
    return typeConfig?.maxParticipants || 1;
  };
  const saveLocation = async (input: {
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
  };
  const selectSavedLocation = (preset: CoachLocationPreset) => {
    setLocation(preset.address);
    setLocationCoordinates(preset.coordinates ?? null);
    setVenueName((previous) => previous || preset.label);
  };
  const saveLocationPreset = (payload: SaveLocationPresetPayload) => {
    void saveLocation({
      label: payload.label,
      address: payload.address.trim(),
      coordinates: payload.coordinates,
    });
  };

  // --------------------------------------------------------------------------
  // NAVIGATION
  // --------------------------------------------------------------------------

  const canProceed = () => {
    switch (step) {
      case 'details': {
        const ownershipReady =
          postingAs === 'self' ||
          (selectedClubOption != null &&
            canPostAsClub(selectedClubOption.membership) &&
            Boolean(selectedAssigneeId));
        return title.trim().length > 0 && ownershipReady;
      }
      case 'schedule': {
        const hasLocation = location.trim().length > 0 || locationCoordinates !== null;
        if (selectedDate.trim().length === 0 || !hasLocation) {
          return false;
        }
        if (!datesWithinLimit) {
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
        if (priceError) {
          return false;
        }
        return true;
      }
      case 'review':
        return true;
      default:
        return false;
    }
  };
  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < WIZARD_STEPS.length) {
      clearValidationMessage();
      setStep(WIZARD_STEPS[nextIndex]);
    }
  };
  const goBack = () => {
    clearValidationMessage();
    if (currentStepIndex > 0) {
      setStep(WIZARD_STEPS[currentStepIndex - 1]);
    } else {
      router.back();
    }
  };

  // --------------------------------------------------------------------------
  // FORM ACTIONS
  // --------------------------------------------------------------------------

  const toggleFocusArea = (area: FootballObjective) => {
    setFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area],
    );
  };
  const toggleAthleteSelection = (athleteId: string) => {
    setSelectedAthletes((prev) =>
      prev.includes(athleteId) ? prev.filter((id) => id !== athleteId) : [...prev, athleteId],
    );
  };

  // --------------------------------------------------------------------------
  // SUBMIT
  // --------------------------------------------------------------------------

  const handleCreate = async () => {
    if (!currentUser) return;
    setLoading(true);
    clearValidationMessage();
    return await runAsyncTryCatchFinally(
      async () => {
        const resolvedLocation = getDisplayLocationLabel(location, locationCoordinates);
        const normalizedVenueName = venueName.trim() || undefined;
        await saveLocation({
          address: resolvedLocation,
          coordinates: locationCoordinates,
          label: normalizedVenueName || deriveLocationLabel(resolvedLocation),
        });
        const participants = normalizeParticipantsForType(sessionType, maxParticipants);
        const parsedPrice = parseSessionPrice(price);
        if (
          !isWithinScheduleWindow(selectedDate) ||
          (campRangeEnd && !isWithinScheduleWindow(campRangeEnd))
        ) {
          setValidationMessage('Date must be within 1 year.');
          setLoading(false);
          return;
        }
        if (priceError) {
          setValidationMessage(priceError);
          setLoading(false);
          return;
        }
        const selectedAthleteRecords = pastAthletes.filter((athlete) =>
          selectedAthletes.includes(athlete.id),
        );
        const primaryDuration = durationBetweenTimes(selectedTime, selectedEndTime);
        if (!isValidTimeWindow(selectedTime, selectedEndTime)) {
          setValidationMessage('End time must be after start time (30 min to 8 hours).');
          setLoading(false);
          return;
        }
        const scheduledAt = `${selectedDate}T${selectedTime}:00`;
        const isRecurring = recurrence !== 'once';
        const resolvedActingAs = postingAs === 'club' ? 'club' : 'self';
        const selectedAssignee =
          assigneeOptions.find((entry) => entry.id === selectedAssigneeId) ?? null;
        const ownerCoachId = resolvedActingAs === 'club' ? selectedAssigneeId : currentUser.id;
        const ownerCoachName =
          resolvedActingAs === 'club'
            ? selectedAssignee?.label || currentUser.name || currentUser.fullName || 'Coach'
            : currentUser.name || currentUser.fullName || 'Coach';
        const ownerClubId = resolvedActingAs === 'club' ? (selectedClubId ?? undefined) : undefined;
        const creatorRole = (currentUser.role as UserRole | undefined) ?? 'COACH';
        const creatorDisplayName = currentUser.name || currentUser.fullName || 'Coach';
        if (resolvedActingAs === 'club') {
          if (!selectedClubOption || !canPostAsClub(selectedClubOption.membership)) {
            setValidationMessage('Choose a club where you can post sessions.');
            setLoading(false);
            return;
          }
          if (!ownerCoachId) {
            setValidationMessage('Choose a coach to own this session.');
            setLoading(false);
            return;
          }
        }
        if (!ownerCoachId) {
          setValidationMessage('Unable to resolve session owner.');
          setLoading(false);
          return;
        }
        const sendSelectedAthleteInvites = async (options: {
          proposedSlots: TimeSlot[];
          sessionTypeLabel: string;
          focusLabel: string;
          notesLabel?: string;
          existingSessionId?: string;
          locationCoordinates?: LocationCoordinates | null;
        }) => {
          if (selectedAthletes.length === 0) {
            return {
              invitesSent: 0,
              inviteFailures: 0,
            };
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
          const inviteResults = await Promise.all(
            Object.entries(athletesByParent).map(async ([parentId, athletesForParent]) => {
              if (parentId === 'unknown_parent' || athletesForParent.length === 0) {
                return { sent: 0, failed: athletesForParent.length };
              }
              const inviteResult = await sessionInviteService.createInvite(
                athletesForParent.map((athlete) => athlete.id),
                {
                  coachId: ownerCoachId,
                  coachName: ownerCoachName,
                  clubName: ownerClubId ? selectedClubOption?.name : undefined,
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
                return { sent: athletesForParent.length, failed: 0 };
              }
              logger.error('Failed to send athlete pre-invites', {
                parentId,
                error: inviteResult.error,
              });
              return { sent: 0, failed: athletesForParent.length };
            }),
          );
          for (const inviteResult of inviteResults) {
            invitesSent += inviteResult.sent;
            inviteFailures += inviteResult.failed;
          }
          return {
            invitesSent,
            inviteFailures,
          };
        };

        // ---- CAMP PATH ----
        if (sessionType === 'camp') {
          if (!selectedDate || !campRangeEnd) {
            setValidationMessage('Select a camp start date and end date.');
            setLoading(false);
            return;
          }
          if (campRangeEnd < selectedDate) {
            setValidationMessage('Camp end date must be on or after start date.');
            setLoading(false);
            return;
          }
          const campDates = buildCampDates(selectedDate, campRangeEnd);
          if (!campDates) {
            setValidationMessage('Camp range cannot exceed 14 days.');
            setLoading(false);
            return;
          }
          if (campDates.length === 0) {
            setValidationMessage('Unable to build camp schedule. Check your dates.');
            setLoading(false);
            return;
          }
          const slots: TimeSlot[] = campDates.map((date) => {
            const slotTimes =
              campLength === 'multi_day' && useCampDailyTimes
                ? (campDailyTimes[date] ?? {
                    startTime: selectedTime,
                    endTime: selectedEndTime,
                  })
                : {
                    startTime: selectedTime,
                    endTime: selectedEndTime,
                  };
            return {
              date,
              startTime: slotTimes.startTime,
              endTime: slotTimes.endTime,
              location: resolvedLocation,
              venueName: normalizedVenueName,
              locationCoordinates: locationCoordinates ?? undefined,
            };
          });
          const invalidSlot = slots.find(
            (slot) => !isValidTimeWindow(slot.startTime, slot.endTime),
          );
          if (invalidSlot) {
            setValidationMessage(
              `Check time range for ${invalidSlot.date}. End time must be after start time.`,
            );
            setLoading(false);
            return;
          }
          const campSession = await groupSessionService.createSession({
            coachId: ownerCoachId,
            coachName: ownerCoachName,
            clubId: ownerClubId,
            actingAs: resolvedActingAs,
            commercialMode: selectedCommercialMode,
            ownerCoachId,
            assigneeCoachId: resolvedActingAs === 'club' ? ownerCoachId : undefined,
            createdByUserId: currentUser.id,
            createdByRole: creatorRole,
            createdByName: currentUser.name || currentUser.fullName || 'Coach',
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
          uiFeedback.showToast(
            `"${title}" scheduled across ${campDates.length} day${campDates.length === 1 ? '' : 's'}.${inviteSummary}`,
            'success',
          );
          router.replace(Routes.SCHEDULE);
          setLoading(false);
          return;
        }

        // ---- RECURRING PATH ----
        if (isRecurring) {
          const toFrequency = (r: RecurrenceType): 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' => {
            switch (r) {
              case 'weekly':
                return 'WEEKLY';
              case 'biweekly':
                return 'BIWEEKLY';
              case 'monthly':
                return 'MONTHLY';
              case 'once':
                return 'WEEKLY';
              // unreachable — guarded by isRecurring check above
              default: {
                const _exhaustive: never = r;
                void _exhaustive;
                return 'WEEKLY';
              }
            }
          };
          const result = await recurringBookingService.createRecurring({
            userId: currentUser.id,
            coachId: ownerCoachId,
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
            actingAs: resolvedActingAs,
            commercialMode: selectedCommercialMode,
            ownerCoachId,
            assigneeCoachId: resolvedActingAs === 'club' ? ownerCoachId : undefined,
            createdByUserId: currentUser.id,
            createdByRole: creatorRole,
            clubId: ownerClubId,
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
              sessionTypeLabel: sessionType === '1on1' ? 'Recurring 1-on-1' : 'Recurring Session',
              focusLabel: focusAreas[0] || 'General',
              notesLabel: description || undefined,
              locationCoordinates,
            });
            const inviteSummary =
              invitesSent > 0 || inviteFailures > 0
                ? ` ${invitesSent} invite${invitesSent === 1 ? '' : 's'} sent${inviteFailures > 0 ? `, ${inviteFailures} failed.` : '.'}`
                : '';
            uiFeedback.showToast(
              `Your next 4 sessions are on your schedule.${inviteSummary}`,
              'success',
            );
            router.replace(Routes.SCHEDULE);
          } else {
            uiFeedback.showToast(
              result.error.message || 'Failed to create recurring session.',
              'error',
            );
          }
          setLoading(false);
          return;
        }

        // ---- ONE-OFF PATH ----
        const createdSession = await groupSessionService.createSession({
          coachId: ownerCoachId,
          coachName: ownerCoachName,
          clubId: ownerClubId,
          actingAs: resolvedActingAs,
          commercialMode: selectedCommercialMode,
          ownerCoachId,
          assigneeCoachId: resolvedActingAs === 'club' ? ownerCoachId : undefined,
          createdByUserId: currentUser.id,
          createdByRole: creatorRole,
          createdByName: creatorDisplayName,
          title,
          description: description || 'Football training session',
          sessionType: 'TRAINING',
          schedule: [
            {
              date: selectedDate,
              startTime: selectedTime,
              endTime: selectedEndTime,
            },
          ],
          maxParticipants: participants,
          pricePerParticipant: parsedPrice ?? 0,
          currency: 'GBP',
          location: resolvedLocation,
          venueName: normalizedVenueName,
          locationCoordinates: locationCoordinates ?? undefined,
          focus: focusAreas,
          waitlistEnabled: sessionType !== '1on1',
          isFree: (parsedPrice ?? 0) === 0,
          inviteType,
        });
        const publishResult = await groupSessionService.publishSession(createdSession.id);
        if (!publishResult.success) {
          logger.warn('One-off session created but not published', {
            sessionId: createdSession.id,
            error: publishResult.error,
          });
        }
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
          existingSessionId: createdSession.id,
          locationCoordinates,
        });
        const inviteSummary =
          selectedAthletes.length > 0
            ? ` ${invitesSent} invite${invitesSent === 1 ? '' : 's'} sent${inviteFailures > 0 ? `, ${inviteFailures} failed.` : '.'}`
            : '';
        uiFeedback.showToast(
          `"${title}" has been created successfully.${inviteSummary}`,
          'success',
        );
        router.replace(Routes.SCHEDULE);
      },
      async (error) => {
        logger.error('Failed to create session:', error);
        uiFeedback.showToast('Failed to create session. Please try again.', 'error');
      },
      () => {
        setLoading(false);
      },
    );
  };
  return {
    // State
    step,
    currentStepIndex,
    loading,
    validationMessage,
    sessionType,
    title,
    description,
    focusAreas,
    maxParticipants,
    postingAs,
    selectedClubId,
    clubOptions,
    assigneeOptions,
    selectedAssigneeId,
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
    setPostingAs,
    setSelectedClubId,
    setSelectedAssigneeId,
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
    clearValidationMessage,
    goNext,
    goBack,
    canProceed,
    handleCreate,
    getDefaultMaxParticipants,
  };
}
