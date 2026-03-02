/**
 * useCreateInvite — Custom hook for the create-session-invite wizard.
 *
 * Owns ALL state, data loading, navigation logic, and form submission
 * for the multi-step invite creation flow.
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { createLogger } from '@/utils/logger';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { inviteService as sessionInviteService } from '@/services/invite';
import { academyService } from '@/services/academy-service';
import { rosterService } from '@/services/roster-service';
import { groupSessionService } from '@/services/group-session';
import { sessionTemplateService } from '@/services/session-template-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { getRosterAthleteName, getRosterParentName } from '@/utils/roster-display';
import { getSessionOfferingHeadcount } from '@/utils/session-offering-capacity';
import type {
  TimeSlot,
  Academy,
  SessionInvite,
  SessionInviteType,
  RosterEntry,
  GroupSession,
  SessionTemplate,
  AvailabilitySlot,
  SessionOffering,
} from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';
import type { ThemeName } from '@/constants/theme';
import { Routes } from '@/navigation/routes';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';

const logger = createLogger('useCreateInvite');

function validateInvitePrice(price: string): string | null {
  const raw = price.trim();
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return 'Price must be between £10 and £200 (whole pounds only)';
  const parsed = Number.parseInt(raw, 10);
  if (parsed < 10 || parsed > 200) return 'Price must be between £10 and £200 (whole pounds only)';
  return null;
}

function mapOfferingToExistingSession(offering: SessionOffering): GroupSession {
  const start = new Date(offering.scheduledAt);
  const safeStart = Number.isNaN(start.getTime()) ? new Date() : start;
  const duration = offering.duration ?? 60;
  const end = new Date(safeStart);
  end.setMinutes(end.getMinutes() + duration);
  const registrations = getSessionOfferingHeadcount(offering);
  const dateLabel = safeStart.toISOString().slice(0, 10);

  return {
    id: offering.id,
    coachId: offering.coachId,
    clubId: offering.clubId,
    title: offering.title,
    description: offering.description || '',
    sessionType: 'TRAINING',
    schedule: [
      {
        date: dateLabel,
        startTime: `${String(safeStart.getHours()).padStart(2, '0')}:${String(
          safeStart.getMinutes(),
        ).padStart(2, '0')}`,
        endTime: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(
          2,
          '0',
        )}`,
      },
    ],
    maxParticipants: offering.maxParticipants,
    currentParticipants: registrations,
    waitlistEnabled: false,
    waitlistCount: 0,
    pricePerParticipant: offering.price || 0,
    currency: 'GBP',
    ageMin: offering.ageMin,
    ageMax: offering.ageMax,
    location: offering.location,
    isVirtual: false,
    status:
      offering.status === 'full'
        ? 'FULL'
        : offering.status === 'cancelled'
          ? 'CANCELLED'
          : offering.status === 'completed'
            ? 'COMPLETED'
            : 'PUBLISHED',
    createdAt: offering.createdAt,
    focus: offering.footballSkill ? [offering.footballSkill] : undefined,
    isRecurring: offering.isRecurring,
    inviteType: offering.inviteType,
  };
}

// ============================================================================
// TYPES
// ============================================================================

export type Step =
  | 'athlete'
  | 'club'
  | 'mode'
  | 'type'
  | 'slots'
  | 'details'
  | 'confirm'
  | 'existing';

export interface AthleteOption {
  id: string;
  name: string;
  parentId: string;
  parentName: string;
}

export interface CreateInviteState {
  // Wizard step
  step: Step;
  loading: boolean;

  // Data
  athletes: AthleteOption[];
  myAcademies: Academy[];
  sentInvites: SessionInvite[];
  existingSessions: GroupSession[];
  sessionTemplates: SessionTemplate[];

  // Selections
  selectedAthletes: AthleteOption[];
  selectedClub: Academy | null;
  selectedTemplate: SessionTemplate | null;
  selectedExistingSession: GroupSession | null;
  selectedAvailabilitySlots: AvailabilitySlot[];

  // Form fields
  sessionType: string;
  focus: string;
  sessionInviteType: SessionInviteType;
  inviteMode: 'new' | 'existing';
  notes: string;
  price: string;
  coverImageUri: string | null;
  isRecurring: boolean;
  recurrenceWeeks: number;

  // Theme
  colors: ThemeColors;
  scheme: ThemeName;
  currentUserId: string | undefined;
  currentUserName: string | undefined;
}

export interface CreateInviteHandlers {
  toggleAthlete: (athlete: AthleteOption) => void;
  setSelectedClub: (club: Academy | null) => void;
  setInviteMode: (mode: 'new' | 'existing') => void;
  setSelectedExistingSession: (session: GroupSession | null) => void;
  setSelectedTemplate: (template: SessionTemplate) => void;
  setFocus: (focus: string) => void;
  setSessionInviteType: (type: SessionInviteType) => void;
  setSelectedAvailabilitySlots: (slots: AvailabilitySlot[]) => void;
  setNotes: (notes: string) => void;
  setPrice: (price: string) => void;
  setCoverImageUri: (uri: string | null) => void;
  setIsRecurring: (recurring: boolean) => void;
  setRecurrenceWeeks: (weeks: number) => void;
  pickCoverImage: () => Promise<void>;
  canProceed: () => boolean;
  nextStep: () => void;
  prevStep: () => void;
  submitInvite: () => Promise<void>;
}

export interface UseCreateInviteReturn {
  state: CreateInviteState;
  handlers: CreateInviteHandlers;
}

// ============================================================================
// HOOK
// ============================================================================

export function useCreateInvite(): UseCreateInviteReturn {
  const { colors, scheme } = useTheme();
  const { currentUser } = useAuth();
  const params = useLocalSearchParams<{ offeringId?: string }>();
  const preselectedOfferingId =
    typeof params.offeringId === 'string' ? params.offeringId : undefined;

  // Wizard step
  const [step, setStep] = useState<Step>('athlete');
  const [loading, setLoading] = useState(false);

  // Data lists
  const [athletes, setAthletes] = useState<AthleteOption[]>([]);
  const [myAcademies, setMyAcademies] = useState<Academy[]>([]);
  const [sentInvites, setSentInvites] = useState<SessionInvite[]>([]);
  const [existingSessions, setExistingSessions] = useState<GroupSession[]>([]);
  const [sessionTemplates, setSessionTemplates] = useState<SessionTemplate[]>([]);

  // Selections
  const [selectedAthletes, setSelectedAthletes] = useState<AthleteOption[]>([]);
  const [selectedClub, setSelectedClub] = useState<Academy | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<SessionTemplate | null>(null);
  const [selectedExistingSession, setSelectedExistingSession] = useState<GroupSession | null>(null);
  const [selectedAvailabilitySlots, setSelectedAvailabilitySlots] = useState<AvailabilitySlot[]>(
    [],
  );

  // Form fields
  const [sessionType, setSessionType] = useState('');
  const [focus, setFocus] = useState('');
  const [sessionInviteType, setSessionInviteType] = useState<SessionInviteType>('OPEN');
  const [inviteMode, setInviteMode] = useState<'new' | 'existing'>('new');
  const [notes, setNotes] = useState('');
  const [price, setPriceState] = useState('');
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceWeeks, setRecurrenceWeeks] = useState(8);
  const priceError = validateInvitePrice(price);
  const isDirty =
    selectedAthletes.length > 0 ||
    selectedClub !== null ||
    selectedTemplate !== null ||
    selectedExistingSession !== null ||
    selectedAvailabilitySlots.length > 0 ||
    sessionType.trim().length > 0 ||
    focus.trim().length > 0 ||
    notes.trim().length > 0 ||
    price.trim().length > 0 ||
    coverImageUri !== null ||
    inviteMode !== 'new' ||
    sessionInviteType !== 'OPEN' ||
    isRecurring ||
    recurrenceWeeks !== 8;

  useUnsavedChangesWarning(isDirty && !loading);

  // ── Data loading ──────────────────────────────────────────────────────

  const loadAthletes = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const roster = await rosterService.getRoster(currentUser.id);
      const athleteOptions = roster.map((entry: RosterEntry) => ({
        id: entry.athleteId,
        name: getRosterAthleteName(entry),
        parentId: entry.parentId,
        parentName: getRosterParentName(entry),
      }));
      setAthletes(athleteOptions);
    } catch (error) {
      logger.error('Failed to load athletes', error);
    }
  }, [currentUser?.id]);

  const loadAcademies = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const academiesResult = await academyService.getUserAcademies(currentUser.id);
      if (!academiesResult.success) {
        logger.error('Failed to load academies', academiesResult.error);
        return;
      }
      setMyAcademies(academiesResult.data);
      if (academiesResult.data.length === 1) {
        setSelectedClub(academiesResult.data[0]);
      }
    } catch (error) {
      logger.error('Failed to load academies', error);
    }
  }, [currentUser?.id]);

  const loadSentInvites = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const invites = await sessionInviteService.getCoachInvites(currentUser.id);
      setSentInvites(invites.slice(0, 5));
    } catch (error) {
      logger.error('Failed to load sent invites', error);
    }
  }, [currentUser?.id]);

  const loadSessionTemplates = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const templates = await sessionTemplateService.getTemplates(currentUser.id);
      setSessionTemplates(templates);
    } catch (error) {
      logger.error('Failed to load session templates', error);
    }
  }, [currentUser?.id]);

  const loadExistingSessions = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const [sessions, offerings] = await Promise.all([
        groupSessionService.getCoachSessions(currentUser.id),
        apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []),
      ]);
      const now = new Date();
      const upcoming = sessions.filter(
        (s) => s.status === 'PUBLISHED' && s.schedule.some((sched) => new Date(sched.date) >= now),
      );
      const upcomingOfferings = offerings
        .filter(
          (offering) =>
            offering.coachId === currentUser.id &&
            offering.status !== 'cancelled' &&
            (offering.isRecurring || new Date(offering.scheduledAt) >= now),
        )
        .map(mapOfferingToExistingSession);

      const mergedSessions = [...upcoming];
      upcomingOfferings.forEach((offeringSession) => {
        if (!mergedSessions.some((session) => session.id === offeringSession.id)) {
          mergedSessions.push(offeringSession);
        }
      });

      mergedSessions.sort((a, b) => {
        const aTime = new Date(a.schedule[0]?.date || 0).getTime();
        const bTime = new Date(b.schedule[0]?.date || 0).getTime();
        return aTime - bTime;
      });

      setExistingSessions(mergedSessions);

      if (preselectedOfferingId) {
        const preset = mergedSessions.find((session) => session.id === preselectedOfferingId);
        if (preset) {
          setInviteMode('existing');
          setSelectedExistingSession(preset);
        }
      }
    } catch (error) {
      logger.error('Failed to load existing sessions', error);
    }
  }, [currentUser?.id, preselectedOfferingId]);

  useEffect(() => {
    if (currentUser?.id) {
      loadAcademies();
      loadAthletes();
      loadSentInvites();
      loadExistingSessions();
      loadSessionTemplates();
    }
  }, [
    currentUser?.id,
    loadAcademies,
    loadAthletes,
    loadSentInvites,
    loadExistingSessions,
    loadSessionTemplates,
  ]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const toggleAthlete = useCallback((athlete: AthleteOption) => {
    setSelectedAthletes((prev) => {
      const isSelected = prev.some((a) => a.id === athlete.id);
      return isSelected ? prev.filter((a) => a.id !== athlete.id) : [...prev, athlete];
    });
  }, []);

  const handleSetSelectedTemplate = useCallback((template: SessionTemplate) => {
    setSelectedTemplate(template);
    setSessionType(template.name);
    setPriceState((prev) => prev || String(template.defaultPrice));
  }, []);

  const handleSetInviteMode = useCallback((mode: 'new' | 'existing') => {
    setInviteMode(mode);
    if (mode === 'new') {
      setSelectedExistingSession(null);
    }
  }, []);

  const setPrice = useCallback((value: string) => {
    setPriceState(value.replace(/[^0-9]/g, ''));
  }, []);

  const canProceed = useCallback((): boolean => {
    switch (step) {
      case 'athlete':
        return selectedAthletes.length > 0;
      case 'club':
        return true;
      case 'mode':
        return true;
      case 'type':
        return selectedTemplate !== null && focus !== '';
      case 'slots':
        return selectedAvailabilitySlots.length > 0;
      case 'details':
        return priceError === null;
      case 'existing':
        return selectedExistingSession !== null;
      default:
        return true;
    }
  }, [
    step,
    selectedAthletes.length,
    selectedTemplate,
    focus,
    selectedAvailabilitySlots.length,
    selectedExistingSession,
    priceError,
  ]);

  const nextStep = useCallback(() => {
    if (step === 'club' && inviteMode === 'existing' && selectedExistingSession) {
      setStep('confirm');
      return;
    }

    if (step === 'mode') {
      if (inviteMode === 'existing' && selectedExistingSession) {
        setStep('confirm');
        return;
      }
      setStep(inviteMode === 'existing' ? 'existing' : 'type');
      return;
    }
    if (step === 'existing') {
      setStep('confirm');
      return;
    }

    const steps: Step[] = ['athlete', 'club', 'mode', 'type', 'slots', 'details', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      if (step === 'athlete' && myAcademies.length === 0) {
        setStep('mode');
      } else {
        setStep(steps[currentIndex + 1]);
      }
    }
  }, [step, inviteMode, selectedExistingSession, myAcademies.length]);

  const prevStep = useCallback(() => {
    if (step === 'existing') {
      setStep('mode');
      return;
    }
    if (step === 'confirm' && inviteMode === 'existing' && selectedExistingSession) {
      setStep('existing');
      return;
    }

    const steps: Step[] = ['athlete', 'club', 'mode', 'type', 'slots', 'details', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      if (step === 'mode' && myAcademies.length === 0) {
        setStep('athlete');
      } else {
        setStep(steps[currentIndex - 1]);
      }
    } else {
      router.back();
    }
  }, [step, inviteMode, selectedExistingSession, myAcademies.length]);

  const pickCoverImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setCoverImageUri(result.assets[0].uri);
    }
  }, []);

  const submitInvite = useCallback(async () => {
    if (!currentUser) return;
    if (selectedAthletes.length === 0) return;
    if (priceError) {
      Alert.alert('Invalid price', priceError);
      return;
    }

    setLoading(true);
    try {
      const groupedByParent = selectedAthletes.reduce<Record<string, AthleteOption[]>>(
        (acc, athlete) => {
          if (!acc[athlete.parentId]) acc[athlete.parentId] = [];
          acc[athlete.parentId].push(athlete);
          return acc;
        },
        {},
      );

      const slotsFromExistingSession: TimeSlot[] =
        inviteMode === 'existing' && selectedExistingSession
          ? selectedExistingSession.schedule.map((sched) => ({
              date: sched.date,
              startTime: sched.startTime,
              endTime: sched.endTime,
              location: selectedExistingSession.location,
            }))
          : [];

      const slotsFromPicker: TimeSlot[] = selectedAvailabilitySlots.map((slot) => ({
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        location: slot.location || undefined,
      }));

      let sentCount = 0;
      let failedCount = 0;

      for (const athletesForParent of Object.values(groupedByParent)) {
        if (athletesForParent.length === 0) continue;

        const parentId = athletesForParent[0]?.parentId;
        if (!parentId) {
          failedCount += athletesForParent.length;
          continue;
        }

        const commonInviteDetails =
          inviteMode === 'existing' && selectedExistingSession
            ? {
                coachId: currentUser.id,
                coachName: currentUser.name || 'Coach',
                clubName: selectedClub?.name || selectedExistingSession.clubId,
                inviteType: sessionInviteType,
                proposedSlots: slotsFromExistingSession,
                sessionType: selectedExistingSession.sessionType,
                focus: selectedExistingSession.focus?.[0] || 'General',
                notes: notes || `You're invited to join "${selectedExistingSession.title}"`,
                price: selectedExistingSession.pricePerParticipant,
                expiresInDays: 7,
                existingSessionId: selectedExistingSession.id,
              }
            : {
                coachId: currentUser.id,
                coachName: currentUser.name || 'Coach',
                clubName: selectedClub?.name,
                inviteType: sessionInviteType,
                proposedSlots: slotsFromPicker,
                sessionType: selectedTemplate?.name || sessionType,
                sessionTemplateId: selectedTemplate?.id,
                duration: selectedTemplate?.duration,
                focus,
                notes: notes || undefined,
                price: price ? Number.parseInt(price, 10) : selectedTemplate?.defaultPrice,
                expiresInDays: 7,
                isRecurring: isRecurring || undefined,
                recurrenceWeeks: isRecurring ? recurrenceWeeks : undefined,
                coverImageUrl: coverImageUri || undefined,
              };

        const inviteResult = await sessionInviteService.createInvite(
          athletesForParent.map((athlete) => athlete.id),
          {
            ...commonInviteDetails,
            athleteNames: athletesForParent.map((athlete) => athlete.name),
            parentId,
            parentName: athletesForParent[0]?.parentName || 'Parent',
          },
        );

        if (inviteResult.success) {
          sentCount += athletesForParent.length;
        } else {
          failedCount += athletesForParent.length;
          logger.error('Failed to create invite for parent group', {
            parentId,
            error: inviteResult.error,
          });
        }
      }

      if (inviteMode === 'existing' && selectedExistingSession && sentCount > 0) {
        const offerings = await apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []);
        const updatedOfferings = offerings.map((offering) => {
          if (offering.id !== selectedExistingSession.id) return offering;

          const existingIds = new Set(offering.invitedAthleteIds || []);
          selectedAthletes.forEach((athlete) => existingIds.add(athlete.id));
          const existingNames = new Set(offering.invitedAthleteNames || []);
          selectedAthletes.forEach((athlete) => existingNames.add(athlete.name));

          return {
            ...offering,
            invitedAthleteIds: Array.from(existingIds),
            invitedAthleteNames: Array.from(existingNames),
          };
        });
        await apiClient.set(STORAGE_KEYS.SESSION_OFFERINGS, updatedOfferings);
      }

      Alert.alert(
        failedCount === 0 ? 'Invite Sent' : 'Invite Partially Sent',
        failedCount === 0
          ? `Invites sent to ${sentCount} athlete${sentCount === 1 ? '' : 's'}.`
          : `${sentCount} sent, ${failedCount} failed. Try sending the failed invites again.`,
        [{ text: 'OK', onPress: () => router.replace(Routes.GROUP_SESSIONS) }],
      );
    } catch (error) {
      logger.error('Failed to create invite', error);
      Alert.alert('Error', 'Failed to send invite. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [
    currentUser,
    selectedAthletes,
    inviteMode,
    selectedExistingSession,
    selectedClub,
    sessionInviteType,
    notes,
    selectedAvailabilitySlots,
    selectedTemplate,
    sessionType,
    focus,
    price,
    isRecurring,
    recurrenceWeeks,
    coverImageUri,
    priceError,
  ]);

  // ── Return ────────────────────────────────────────────────────────────

  const state: CreateInviteState = {
    step,
    loading,
    athletes,
    myAcademies,
    sentInvites,
    existingSessions,
    sessionTemplates,
    selectedAthletes,
    selectedClub,
    selectedTemplate,
    selectedExistingSession,
    selectedAvailabilitySlots,
    sessionType,
    focus,
    sessionInviteType,
    inviteMode,
    notes,
    price,
    coverImageUri,
    isRecurring,
    recurrenceWeeks,
    colors,
    scheme,
    currentUserId: currentUser?.id,
    currentUserName: currentUser?.name,
  };

  const handlers: CreateInviteHandlers = {
    toggleAthlete,
    setSelectedClub,
    setInviteMode: handleSetInviteMode,
    setSelectedExistingSession,
    setSelectedTemplate: handleSetSelectedTemplate,
    setFocus,
    setSessionInviteType,
    setSelectedAvailabilitySlots,
    setNotes,
    setPrice,
    setCoverImageUri,
    setIsRecurring,
    setRecurrenceWeeks,
    pickCoverImage,
    canProceed,
    nextStep,
    prevStep,
    submitInvite,
  };

  return { state, handlers };
}
