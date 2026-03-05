/**
 * useSessionCompletion Hook
 *
 * Encapsulates all data loading, form state, and submit logic for the
 * session completion wizard. The screen component only handles rendering.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { progressService } from '@/services/progress-service';
import { progressSkillsService } from '@/services/progress/progress-skills-service';
import { progressFeedbackService } from '@/services/progress/progress-feedback-service';
import { progressPositionService } from '@/services/progress/progress-position-service';
import { mediaService } from '@/services/media-service';
import { badgeService } from '@/services/badge-service';
import { bookingService } from '@/services/booking-service';
import { groupSessionService } from '@/services/group-session-service';
import { sessionTemplateService } from '@/services/session-template-service';
import { userService } from '@/services/user-service';
import { earningsService } from '@/services/earnings';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { notificationTriggers } from '@/services/notification-trigger';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { generateId } from '@/utils/generate-id';
import { createLogger } from '@/utils/logger';
import type {
  SessionOffering,
  AttendanceRecord,
  SessionAttendance,
  SessionRegistration,
} from '@/constants/session-types';
import type { ChatMessage, RosterEntry } from '@/constants/types';
import type { BadgeDefinitionWithStats } from '@/services/badge-service';
import type { AttendanceStatus as StepAttendanceStatus } from '@/components/session/attendance-step';
import type { QuickRateInput } from '@/types/progress-types';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('SessionComplete');

// ============================================================================
// TYPES
// ============================================================================

export interface AthleteAttendance {
  registration: SessionRegistration;
  status: StepAttendanceStatus;
  effort: number;
  note: string;
  badges: string[];
}

export interface CompletionSummaryAthlete {
  registrationId: string;
  athleteId: string;
  athleteName: string;
}

export interface CompletionSummaryData {
  sessionId: string;
  ratedAthletes: number;
  photosCaptured: number;
  videosRecorded: number;
  badgesAwarded: number;
  athletes: CompletionSummaryAthlete[];
}

export type CompletionStep = 'attendance' | 'quickRate' | 'notes' | 'badges' | 'summary';
export const COMPLETION_STEPS: CompletionStep[] = [
  'attendance',
  'quickRate',
  'notes',
  'badges',
  'summary',
];

// ============================================================================
// HELPERS
// ============================================================================

function mapAttendanceStatus(status: StepAttendanceStatus): 'ATTENDED' | 'NO_SHOW' {
  switch (status) {
    case 'present':
      return 'ATTENDED';
    case 'absent':
      return 'NO_SHOW';
  }
}

function normalizeSkills(skills: string[] | undefined): string[] {
  return Array.from(
    new Set(
      (skills ?? [])
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0),
    ),
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useSessionCompletion(sessionId: string | undefined) {
  const { currentUser } = useAuth();
  const getRegistrationName = useCallback(
    (registration: SessionRegistration) => registration.userId || 'Athlete',
    [],
  );

  // Unmount guard for async setState safety
  const isMountedRef = useRef(true);

  // Timer ref for review prompt delay
  const reviewPromptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up floating timer and mark unmounted
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (reviewPromptTimerRef.current) {
        clearTimeout(reviewPromptTimerRef.current);
      }
    };
  }, []);

  // Data state
  const [session, setSession] = useState<SessionOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [attendance, setAttendance] = useState<Record<string, AthleteAttendance>>({});
  const [sessionSummary, setSessionSummary] = useState('');
  const [skillsFocused, setSkillsFocused] = useState<string[]>([]);
  const [overallEffort, setOverallEffort] = useState(3);
  const [homework, setHomework] = useState('');
  const [improvements, setImprovements] = useState('');
  const [availableBadges, setAvailableBadges] = useState<BadgeDefinitionWithStats[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // Step navigation
  const [currentStep, setCurrentStep] = useState<CompletionStep>('attendance');

  // Sharing toggles
  const [shareNotesWithParents, setShareNotesWithParents] = useState(true);
  const [shareAttendance, setShareAttendance] = useState(true);

  // Source type
  const [sourceType, setSourceType] = useState<'offering' | 'booking'>('offering');
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});
  const [parentByAthleteId, setParentByAthleteId] = useState<
    Record<string, { parentId: string; parentName: string }>
  >({});
  const [sessionTemplateContext, setSessionTemplateContext] = useState<{
    sessionTemplateId?: string;
    sessionTemplateName?: string;
  }>({});

  const isGroupCompletion =
    sourceType === 'offering' && session?.sessionType === 'group' && Object.keys(attendance).length > 0;
  const activeSteps = useMemo(
    () => (isGroupCompletion ? COMPLETION_STEPS.filter((step) => step !== 'quickRate') : COMPLETION_STEPS),
    [isGroupCompletion],
  );

  const loadParticipantContext = useCallback(
    async (registrations: SessionRegistration[], coachId: string) => {
      const athleteIds = registrations.map((registration) => registration.userId).filter(Boolean);
      if (athleteIds.length === 0) {
        setParticipantNames({});
        setParentByAthleteId({});
        return;
      }

      const [usersResult, rosterEntries] = await Promise.all([
        userService.getUsersByIds(athleteIds),
        apiClient.get<RosterEntry[]>(STORAGE_KEYS.ROSTER, []),
      ]);

      const nextParticipantNames: Record<string, string> = {};
      const nextParentByAthleteId: Record<string, { parentId: string; parentName: string }> = {};

      if (usersResult.success) {
        for (const user of usersResult.data) {
          nextParticipantNames[user.id] = user.name;
        }
      }

      for (const athleteId of athleteIds) {
        if (!nextParticipantNames[athleteId]) {
          nextParticipantNames[athleteId] = athleteId || 'Athlete';
        }
      }

      for (const entry of rosterEntries) {
        if (entry.coachId !== coachId) {
          continue;
        }
        if (!athleteIds.includes(entry.athleteId)) {
          continue;
        }
        nextParentByAthleteId[entry.athleteId] = {
          parentId: entry.parentId,
          parentName: entry.parentName || entry.parentId,
        };
      }

      setParticipantNames(nextParticipantNames);
      setParentByAthleteId(nextParentByAthleteId);
    },
    [],
  );

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadSession = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);

    try {
      const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
      if (offerings.length > 0) {
        const found = offerings.find((o) => o.id === sessionId);
        if (found) {
          setSession(found);
          setSourceType('offering');
          setSessionTemplateContext({});

          const initialAttendance: Record<string, AthleteAttendance> = {};
          found.registrations
            .filter((r) => r.status === 'confirmed')
            .forEach((reg) => {
              initialAttendance[reg.id] = {
                registration: reg,
                status: 'present',
                effort: 3,
                note: '',
                badges: [],
              };
            });
          setAttendance(initialAttendance);

          if (found.footballSkill) {
            setSkillsFocused([found.footballSkill]);
          } else {
            setSkillsFocused([]);
          }
          await loadParticipantContext(found.registrations, found.coachId);
          setLoading(false);
          return;
        }
      }

      // 2. Try group sessions
      const groupSession = await groupSessionService.getSession(sessionId);
      if (groupSession) {
        const roster = await groupSessionService.getSessionRoster(sessionId);
        const registrations: SessionRegistration[] = roster.map((entry) => ({
          id: entry.id,
          userId: entry.athleteId,
          bookedAt: entry.registeredAt,
          status: 'confirmed' as const,
        }));

        const syntheticOffering: SessionOffering = {
          id: groupSession.id,
          coachId: groupSession.coachId,
          clubId: groupSession.clubId,
          title: groupSession.title,
          description: groupSession.description,
          sessionType: 'group',
          maxParticipants: groupSession.maxParticipants,
          location: groupSession.location,
          scheduledAt: groupSession.schedule[0]?.date ?? groupSession.createdAt,
          isRecurring: groupSession.isRecurring ?? false,
          recurrenceType: groupSession.isRecurring ? 'weekly' : 'none',
          status: 'active',
          registrations,
          createdAt: groupSession.createdAt,
          ageMin: groupSession.ageMin,
          ageMax: groupSession.ageMax,
          squadId: groupSession.squadId,
          inviteType: groupSession.inviteType,
        };

        setSession(syntheticOffering);
        setSourceType('offering');
        setSessionTemplateContext({});

        const initialAttendance: Record<string, AthleteAttendance> = {};
        registrations.forEach((reg) => {
          initialAttendance[reg.id] = {
            registration: reg,
            status: 'present',
            effort: 3,
            note: '',
            badges: [],
          };
        });
        setAttendance(initialAttendance);

        setSkillsFocused(normalizeSkills(groupSession.focus));
        await loadParticipantContext(registrations, groupSession.coachId);
        setLoading(false);
        return;
      }

      // 3. Fall back to individual bookings
      const booking = await bookingService.getBooking(sessionId);
      if (booking && (booking.status === 'AWAITING_COMPLETION' || booking.status === 'CONFIRMED')) {
        setSourceType('booking');
        let resolvedTemplateName = booking.sessionTemplateName;
        let templateFocusSkills: string[] = [];
        if (booking.sessionTemplateId) {
          const template = await sessionTemplateService.getTemplate(booking.sessionTemplateId);
          if (template) {
            resolvedTemplateName = resolvedTemplateName || template.name;
            templateFocusSkills = normalizeSkills(template.skillsFocus);
          }
        }
        const bookingFocusSkills = normalizeSkills(booking.objectives);
        const resolvedFocusSkills =
          bookingFocusSkills.length > 0 ? bookingFocusSkills : templateFocusSkills;
        setSessionTemplateContext({
          sessionTemplateId: booking.sessionTemplateId,
          sessionTemplateName: resolvedTemplateName,
        });
        const syntheticSession = {
          id: booking.id,
          coachId: booking.coachId,
          title: booking.service || 'Session',
          description: booking.notes || '',
          sessionType: '1on1' as const,
          scheduledAt: booking.scheduledAt,
          duration: booking.duration || 60,
          price: booking.price,
          location: booking.location,
          maxParticipants: 1,
          isRecurring: false,
          recurrenceType: 'none' as const,
          status: 'active' as const,
          registrations: [
            {
              id: `reg-${booking.id}`,
              userId: booking.athleteId || booking.athleteIds?.[0] || '',
              bookedAt: booking.scheduledAt,
              status: 'confirmed' as const,
            },
          ],
          createdAt: booking.scheduledAt,
        } satisfies SessionOffering;
        setSession(syntheticSession);
        setSkillsFocused(resolvedFocusSkills);

        const initialAttendance: Record<string, AthleteAttendance> = {};
        syntheticSession.registrations.forEach((reg) => {
          initialAttendance[reg.id] = {
            registration: reg,
            status: 'present',
            effort: 3,
            note: '',
            badges: [],
          };
        });
        setAttendance(initialAttendance);
        await loadParticipantContext(syntheticSession.registrations, syntheticSession.coachId);
      } else {
        setError('Session not found');
      }
    } catch (err) {
      logger.error('Failed to load session', err);
      if (isMountedRef.current) {
        setError('Failed to load session. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [sessionId, loadParticipantContext]);

  const loadBadges = useCallback(async () => {
    try {
      const badges = await badgeService.listDefinitionsWithStats();
      setAvailableBadges(badges);
    } catch (err) {
      logger.error('Failed to load badges', err);
    }
  }, []);

  useEffect(() => {
    loadSession();
    loadBadges();
  }, [loadSession, loadBadges]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const updateAttendanceStatus = useCallback((regId: string, status: StepAttendanceStatus) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAttendance((prev) => ({
      ...prev,
      [regId]: { ...prev[regId], status },
    }));
  }, []);

  const setAllAttendanceStatus = useCallback((status: StepAttendanceStatus) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAttendance((prev) => {
      const next: Record<string, AthleteAttendance> = {};
      for (const [registrationId, athleteAttendance] of Object.entries(prev)) {
        next[registrationId] = { ...athleteAttendance, status };
      }
      return next;
    });
  }, []);

  const updateAthleteEffort = useCallback((athleteId: string, effort: number) => {
    const nextEffort = Math.max(1, Math.min(5, Math.round(effort)));
    setAttendance((prev) => {
      const nextAttendance: Record<string, AthleteAttendance> = {};
      for (const [registrationId, athleteAttendance] of Object.entries(prev)) {
        if (athleteAttendance.registration.userId === athleteId) {
          nextAttendance[registrationId] = { ...athleteAttendance, effort: nextEffort };
        } else {
          nextAttendance[registrationId] = athleteAttendance;
        }
      }
      return nextAttendance;
    });
  }, []);

  const appendThreadMessage = useCallback(
    async (threadId: string, body: string) => {
      if (!session || !currentUser) {
        return;
      }
      const messagesByThread = await apiClient.get<Record<string, ChatMessage[]>>(
        STORAGE_KEYS.MESSAGES,
        {},
      );
      const nextMessage: ChatMessage = {
        id: generateId('msg'),
        threadId,
        sender: 'coach',
        body,
        createdAt: new Date().toISOString(),
        status: 'sent',
      };
      const existingThread = messagesByThread[threadId] ?? [];
      messagesByThread[threadId] = [...existingThread, nextMessage];
      await apiClient.set(STORAGE_KEYS.MESSAGES, messagesByThread);
    },
    [currentUser, session],
  );

  const sendGroupBroadcast = useCallback(
    async (message: string): Promise<boolean> => {
      const trimmed = message.trim();
      if (!session || !trimmed) {
        return false;
      }
      await appendThreadMessage(`thread_group_${session.id}`, trimmed);
      return true;
    },
    [appendThreadMessage, session],
  );

  const sendPersonalUpdate = useCallback(
    async (registrationId: string) => {
      const athleteAttendance = attendance[registrationId];
      if (!athleteAttendance || !session) {
        return { ok: false, reason: 'Athlete row not found' };
      }

      const athleteId = athleteAttendance.registration.userId;
      const athleteName = participantNames[athleteId] || getRegistrationName(athleteAttendance.registration);
      const statusLabel = athleteAttendance.status === 'present' ? 'present' : 'absent';

      const note = athleteAttendance.note?.trim();
      const body = note
        ? `Personal update for ${athleteName}: ${note}`
        : `Personal update for ${athleteName}: marked ${statusLabel} in ${session.title}.`;

      await appendThreadMessage(`thread_athlete_${athleteId}_${session.id}`, body);
      return { ok: true, athleteName };
    },
    [appendThreadMessage, attendance, getRegistrationName, participantNames, session],
  );

  const sendMessageParent = useCallback(
    async (registrationId: string) => {
      const athleteAttendance = attendance[registrationId];
      if (!athleteAttendance || !session) {
        return { ok: false, reason: 'Athlete row not found' };
      }

      const athleteId = athleteAttendance.registration.userId;
      const athleteName = participantNames[athleteId] || getRegistrationName(athleteAttendance.registration);
      const parentLink = parentByAthleteId[athleteId];
      const targetName = parentLink?.parentName ?? athleteName;
      const targetType = parentLink ? 'parent' : 'athlete';
      const threadId = parentLink
        ? `thread_parent_${parentLink.parentId}_${session.id}`
        : `thread_athlete_${athleteId}_${session.id}`;
      const body = parentLink
        ? `${athleteName} update from ${session.title}: attendance marked ${athleteAttendance.status}. Reply if you want a full personal recap.`
        : `Session update for ${athleteName}: attendance marked ${athleteAttendance.status}.`;
      await appendThreadMessage(threadId, body);

      return { ok: true as const, athleteName, targetName, targetType };
    },
    [appendThreadMessage, attendance, getRegistrationName, parentByAthleteId, participantNames, session],
  );

  const toggleBadge = useCallback((regId: string, badgeId: string) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAttendance((prev) => {
      const current = prev[regId];
      const hasBadge = current.badges.includes(badgeId);
      return {
        ...prev,
        [regId]: {
          ...current,
          badges: hasBadge
            ? current.badges.filter((b) => b !== badgeId)
            : [...current.badges, badgeId],
        },
      };
    });
  }, []);

  const addImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        uiFeedback.showToast('Please allow photo library access.', 'warning');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setImageUrls((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      logger.error('Failed to add image', error);
      uiFeedback.showToast('Unable to add photo right now.', 'error');
    }
  }, []);

  const addVideo = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        uiFeedback.showToast('Please allow video library access.', 'warning');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setVideoUrls((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      logger.error('Failed to add video', error);
      uiFeedback.showToast('Unable to add video right now.', 'error');
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeVideo = useCallback((index: number) => {
    setVideoUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const goToNextStep = useCallback(() => {
    const nextIndex = activeSteps.indexOf(currentStep) + 1;
    if (nextIndex < activeSteps.length) {
      setCurrentStep(activeSteps[nextIndex]);
    }
  }, [activeSteps, currentStep]);

  const goToPrevStep = useCallback(() => {
    const prevIndex = activeSteps.indexOf(currentStep) - 1;
    if (prevIndex >= 0) {
      setCurrentStep(activeSteps[prevIndex]);
    }
  }, [activeSteps, currentStep]);

  const handleBackPress = useCallback(() => {
    if (activeSteps.indexOf(currentStep) > 0) {
      goToPrevStep();
    } else {
      if (router.canGoBack()) {
        router.back();
        return;
      }
      router.replace(Routes.SCHEDULE);
    }
  }, [activeSteps, currentStep, goToPrevStep]);

  const handleComplete = useCallback(
    async (
      quickRateByAthleteId: Record<string, QuickRateInput> = {},
    ): Promise<CompletionSummaryData | null> => {
      if (!session || !currentUser) return null;

      setSubmitting(true);

      try {
        const attendanceValues = Object.values(attendance);
        const present = attendanceValues.filter((a) => a.status === 'present').length;
        const absent = attendanceValues.filter((a) => a.status === 'absent').length;
        const normalizedFocusSkills = normalizeSkills(skillsFocused);

        // 1. Save session notes
        await progressService.saveSessionNote(session.id, {
          summary: sessionSummary,
          focus: skillsFocused,
          improvements,
          homework,
          effort: overallEffort,
          attendance: `${present} present, ${absent} absent`,
          videoUrls,
          imageUrls,
        });

        emitTyped(ServiceEvents.SESSION_NOTES_SAVED, {
          sessionId: session.id,
          bookingId: sourceType === 'booking' ? session.id : undefined,
          coachId: session.coachId,
        });

        // 2. Award badges
        for (const athleteData of attendanceValues) {
          if (athleteData.badges.length > 0 && athleteData.status === 'present') {
            for (const badgeId of athleteData.badges) {
              const badge = availableBadges.find((b) => b.id === badgeId);
              if (badge) {
                await badgeService.awardBadge({
                  athleteId: athleteData.registration.userId,
                  athleteName: getRegistrationName(athleteData.registration),
                  badgeId: badge.id,
                  coachId: currentUser.id,
                  coachName: currentUser.fullName || 'Coach',
                  sessionId: session.id,
                  reason: badge.label,
                  note: athleteData.note || undefined,
                });
              }
            }
          }
        }

        // 3. Write session feedback for present athletes WITHOUT quick-rate data.
        //    Athletes WITH quick-rate data get richer feedback in step 3b via
        //    createFeedbackFromQuickRate() which upserts and includes position/skill ratings.
        const coachName = currentUser.fullName || currentUser.name || 'Coach';
        for (const athleteData of attendanceValues) {
          if (athleteData.status !== 'present') continue;

          const athleteId = athleteData.registration.userId;

          // Skip athletes that have quick-rate data — step 3b handles their feedback
          if (quickRateByAthleteId[athleteId]) continue;

          const athleteName =
            participantNames[athleteId] || getRegistrationName(athleteData.registration);

          try {
            await progressFeedbackService.addSessionFeedback({
              sessionId: session.id,
              bookingId: sourceType === 'booking' ? session.id : undefined,
              sessionTemplateId: sessionTemplateContext.sessionTemplateId,
              sessionTemplateName: sessionTemplateContext.sessionTemplateName,
              sessionTitle: session.title,
              coachId: session.coachId,
              coachName,
              athleteId,
              athleteName,
              publicSummary: sessionSummary || `Session completed: ${session.title}`,
              skillsWorkedOn: normalizedFocusSkills,
              skillRatings: [],
              improvements,
              homework,
              effortRating: athleteData.effort,
              overallPerformance: overallEffort,
              visibility: shareNotesWithParents ? 'parent' : 'coach_only',
              videoClipUrls: videoUrls.length > 0 ? videoUrls : undefined,
              photoUrls: imageUrls.length > 0 ? imageUrls : undefined,
              badgeAwarded: athleteData.badges
                .map((id) => availableBadges.find((b) => b.id === id)?.label ?? id)
                .join(', ') || undefined,
              privateNotes: athleteData.note || undefined,
            });

            emitTyped(ServiceEvents.SESSION_FEEDBACK_SAVED, {
              sessionId: session.id,
              bookingId: sourceType === 'booking' ? session.id : undefined,
              coachId: session.coachId,
              athleteId,
              skillCount: 0,
            });
          } catch (feedbackErr) {
            logger.error('Failed to save session feedback for athlete', {
              athleteId,
              error: feedbackErr,
            });
          }
        }

        // 3b. Persist Quick Rate position/corner ratings and skill updates
        for (const [athleteId, quickRateInput] of Object.entries(quickRateByAthleteId)) {
          const focusFromPositionSkills = (quickRateInput.positionSkillRatings ?? []).map(
            (entry) => entry.skill,
          );
          const quickRatePayload: QuickRateInput = {
            ...quickRateInput,
            focusSkills:
              quickRateInput.focusSkills && quickRateInput.focusSkills.length > 0
                ? normalizeSkills(quickRateInput.focusSkills)
                : focusFromPositionSkills.length > 0
                  ? normalizeSkills(focusFromPositionSkills)
                : normalizedFocusSkills,
            sessionTemplateId:
              quickRateInput.sessionTemplateId ?? sessionTemplateContext.sessionTemplateId,
            sessionTemplateName:
              quickRateInput.sessionTemplateName ?? sessionTemplateContext.sessionTemplateName,
            sessionTitle: quickRateInput.sessionTitle ?? session.title,
            overallPerformance: quickRateInput.overallPerformance ?? overallEffort,
            visibility: shareNotesWithParents ? 'parent' : 'coach_only',
          };

          if (
            quickRatePayload.positionPlayed &&
            quickRatePayload.positionSkillRatings &&
            quickRatePayload.positionSkillRatings.length > 0
          ) {
            const [positionResult, skillResult] = await Promise.all([
              progressPositionService.recordPosition(
                quickRatePayload.sessionId,
                quickRatePayload.athleteId,
                quickRatePayload.positionPlayed,
              ),
              progressSkillsService.updateFromPositionRate(
                quickRatePayload.athleteId,
                quickRatePayload.sessionId,
                quickRatePayload.coachId,
                quickRatePayload.positionPlayed,
                quickRatePayload.positionSkillRatings,
              ),
            ]);

            if (!positionResult.success) {
              logger.error('Failed to save quick rate position context', {
                athleteId,
                error: positionResult.error,
              });
            }

            if (!skillResult.success) {
              logger.error('Failed to save quick rate position skill updates', {
                athleteId,
                error: skillResult.error,
              });
            }
          }

          // Skills were already written by updateFromPositionRate above — tell
          // addSessionFeedback to skip its own skill write to avoid duplicate history entries.
          const feedbackResult = await progressFeedbackService.createFeedbackFromQuickRate(
            quickRatePayload,
            coachName,
            quickRatePayload.athleteName,
            { skillsAlreadyWritten: true },
          );
          if (!feedbackResult.success) {
            logger.error('Failed to save quick rate feedback', {
              athleteId,
              error: feedbackResult.error,
            });
          }
        }

        // 4. Save sharing preferences
        await apiClient.set(`${STORAGE_KEYS.SESSION_SHARING}_${session.id}`, {
          shareNotesWithParents,
          shareAttendance,
        });

        // 5. Create and persist attendance records
        const attendanceRecords: AttendanceRecord[] = attendanceValues.map((ad) => ({
          athleteId: ad.registration.userId,
          status: mapAttendanceStatus(ad.status),
          notes: ad.note || undefined,
          effortRating: ad.effort,
          focusAreas: skillsFocused,
        }));

        const sessionAttendanceData: SessionAttendance = {
          bookingId: session.id,
          records: attendanceRecords,
          completedAt: new Date().toISOString(),
          completedBy: currentUser.id,
        };

        await apiClient.set(`${STORAGE_KEYS.SESSION_ATTENDANCE}_${session.id}`, sessionAttendanceData);

        emitTyped(ServiceEvents.ATTENDANCE_RECORDED, {
          sessionId: session.id,
          bookingId: sourceType === 'booking' ? session.id : undefined,
          coachId: session.coachId,
          athleteIds: attendanceRecords.map((r) => r.athleteId),
          presentCount: present,
          absentCount: absent,
        });

        // 6. Update session/booking status to completed
        let completedBookingId: string | undefined;
        if (sourceType === 'booking') {
          let updateResult = await bookingService.updateBooking(session.id, {
            status: 'COMPLETED' as const,
          });
          // Retry once on failure
          if (!updateResult.success) {
            logger.error('Booking status update failed, retrying once', updateResult.error.message);
            updateResult = await bookingService.updateBooking(session.id, {
              status: 'COMPLETED' as const,
            });
          }
          if (!updateResult.success) {
            logger.error('Booking status update failed after retry', updateResult.error.message);
          } else {
            // Verify the status actually changed
            const verifyBooking = await bookingService.getBooking(session.id);
            if (verifyBooking && verifyBooking.status === 'COMPLETED') {
              completedBookingId = session.id;
            } else {
              logger.error(
                'Booking status verification failed — status did not transition to COMPLETED',
              );
            }
          }
        } else {
          const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
          if (offerings.length > 0) {
            const updated = offerings.map((o) => {
              if (o.id === session.id && !o.isRecurring) {
                return { ...o, status: 'completed' as const };
              }
              return o;
            });
            await apiClient.set('session_offerings', updated);
          }

          // Complete linked group bookings so coach completion queue clears properly.
          const coachBookings = await bookingService.getBookingsForUser(session.coachId, 'coach');
          const linkedBookings = coachBookings.filter(
            (booking) =>
              booking.groupSessionId === session.id &&
              (booking.status === 'AWAITING_COMPLETION' || booking.status === 'CONFIRMED'),
          );
          completedBookingId = linkedBookings[0]?.id;
          for (const booking of linkedBookings) {
            const bookingUpdate = await bookingService.updateBooking(booking.id, {
              status: 'COMPLETED' as const,
            });
            if (!bookingUpdate.success) {
              logger.error('Failed to complete linked group booking', {
                bookingId: booking.id,
                groupSessionId: session.id,
                error: bookingUpdate.error.message,
              });
            }
          }
        }

        // Compute present athlete lists (used by earnings + event + notifications)
        const athleteIds = attendanceValues
          .filter((a) => a.status === 'present')
          .map((a) => a.registration.userId);

        const athleteNamesList = attendanceValues
          .filter((a) => a.status === 'present')
          .map((a) => getRegistrationName(a.registration));

        // 6b. Record earnings for the coach
        if (completedBookingId && session.price) {
          try {
            const earningsResult = await earningsService.recordSessionPayment(
              session.coachId,
              completedBookingId,
              session.price,
              athleteNamesList.length > 0
                ? athleteNamesList.join(', ')
                : 'Athlete',
              new Date().toISOString(),
            );
            if (!earningsResult.success) {
              logger.error('Earnings recording failed', earningsResult.error);
            }
          } catch (earningsErr) {
            logger.error('Earnings recording threw', earningsErr);
          }
        }

        // 7. Emit SESSION_COMPLETED event
        emitTyped(ServiceEvents.SESSION_COMPLETED, {
          sessionId: session.id,
          bookingId: completedBookingId,
          coachId: session.coachId,
          athleteIds,
          price: session.price,
          athleteName: athleteNamesList.join(', '),
        });

        // 8. Trigger parent/guardian notifications scoped by recipient.
        const recipientToAthletes = new Map<string, string[]>();
        for (const athleteId of athleteIds) {
          const recipientId = parentByAthleteId[athleteId]?.parentId || athleteId;
          if (!recipientId) continue;
          const athleteName = participantNames[athleteId] || athleteId || 'Athlete';
          const existingAthletes = recipientToAthletes.get(recipientId) || [];
          existingAthletes.push(athleteName);
          recipientToAthletes.set(recipientId, existingAthletes);
        }

        if (recipientToAthletes.size === 0) {
          logger.warn('Session completion notifications skipped: no recipients', {
            sessionId: session.id,
            athleteIds,
          });
        }

        recipientToAthletes.forEach((athletesForRecipient, recipientId) => {
          const athleteNamesDisplay = athletesForRecipient.join(', ') || 'Athlete';
          void notificationTriggers.sessionCompleted(coachName, athleteNamesDisplay, recipientId);
        });

        // 9. Queue review prompt (delayed to avoid collision)
        reviewPromptTimerRef.current = setTimeout(() => {
          recipientToAthletes.forEach((athletesForRecipient, recipientId) => {
            const athleteNamesDisplay = athletesForRecipient.join(', ') || 'Athlete';
            void notificationTriggers.reviewPrompt(coachName, athleteNamesDisplay, recipientId);
          });
        }, 2000);

        const badgesAwarded = attendanceValues.reduce((sum, athlete) => sum + athlete.badges.length, 0);
        let photosCaptured = 0;
        let videosRecorded = 0;
        const sessionMediaResult = await mediaService.listMediaForSession(session.id);
        if (sessionMediaResult.success) {
          photosCaptured = sessionMediaResult.data.reduce((sum, media) => sum + media.photos.length, 0);
          videosRecorded = sessionMediaResult.data.filter((media) => Boolean(media.video)).length;
        } else {
          logger.error('Failed to aggregate session media for completion summary', {
            sessionId: session.id,
            error: sessionMediaResult.error,
          });
        }
        const completionAthletes = attendanceValues
          .filter((athlete) => athlete.status === 'present')
          .map((athlete) => ({
            registrationId: athlete.registration.id,
            athleteId: athlete.registration.userId,
            athleteName:
              participantNames[athlete.registration.userId] || getRegistrationName(athlete.registration),
          }));

        logger.success('SessionCompleted', {
          sessionId: session.id,
          presentCount: present,
          badgesAwarded,
          shareNotesWithParents,
          shareAttendance,
          attendanceRecords: attendanceRecords.length,
          quickRateCount: Object.keys(quickRateByAthleteId).length,
        });

        if (Platform.OS !== 'web')
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        return {
          sessionId: session.id,
          ratedAthletes: Object.keys(quickRateByAthleteId).length,
          photosCaptured,
          videosRecorded,
          badgesAwarded,
          athletes: completionAthletes,
        };
      } catch (err) {
        logger.error('Failed to complete session', err);
        if (isMountedRef.current) {
          uiFeedback.showToast('Failed to complete session. Please try again.', 'error');
        }
        return null;
      } finally {
        if (isMountedRef.current) {
          setSubmitting(false);
        }
      }
    },
    [
      session,
      currentUser,
      attendance,
      sessionSummary,
      skillsFocused,
      overallEffort,
      homework,
      improvements,
      availableBadges,
      sessionTemplateContext.sessionTemplateId,
      sessionTemplateContext.sessionTemplateName,
      shareNotesWithParents,
      shareAttendance,
      videoUrls,
      imageUrls,
      sourceType,
      getRegistrationName,
      participantNames,
    ],
  );

  // ============================================================================
  // DERIVED DATA
  // ============================================================================

  const attendanceList = useMemo(() => Object.values(attendance), [attendance]);

  const attendanceStepData = useMemo(
    () =>
      attendanceList.map((a) => ({
        registrationId: a.registration.id,
        userName: participantNames[a.registration.userId] || getRegistrationName(a.registration),
        status: a.status,
        badges: a.badges,
      })),
    [attendanceList, getRegistrationName, participantNames],
  );

  const presentAthletes = useMemo(
    () =>
      attendanceList
        .filter((a) => a.status === 'present')
        .map((a) => ({
          registrationId: a.registration.id,
          userName: participantNames[a.registration.userId] || getRegistrationName(a.registration),
          badges: a.badges,
        })),
    [attendanceList, getRegistrationName, participantNames],
  );

  const parentNameByRegistration = useMemo(() => {
    const map: Record<string, string> = {};
    for (const athleteAttendance of attendanceList) {
      const athleteId = athleteAttendance.registration.userId;
      const parent = parentByAthleteId[athleteId];
      if (parent?.parentName) {
        map[athleteAttendance.registration.id] = parent.parentName;
      }
    }
    return map;
  }, [attendanceList, parentByAthleteId]);

  const presentCount = useMemo(
    () => attendanceList.filter((a) => a.status === 'present').length,
    [attendanceList],
  );

  const absentCount = useMemo(
    () => attendanceList.filter((a) => a.status === 'absent').length,
    [attendanceList],
  );

  const totalBadgesAwarded = useMemo(
    () => attendanceList.reduce((sum, a) => sum + a.badges.length, 0),
    [attendanceList],
  );

  const currentStepIndex = Math.max(0, activeSteps.indexOf(currentStep));

  return {
    // Data
    session,
    loading,
    error,
    submitting,
    availableBadges,

    // Form state
    sessionSummary,
    setSessionSummary,
    skillsFocused,
    setSkillsFocused,
    overallEffort,
    setOverallEffort,
    homework,
    setHomework,
    improvements,
    setImprovements,
    videoUrls,
    imageUrls,
    shareNotesWithParents,
    setShareNotesWithParents,
    shareAttendance,
    setShareAttendance,

    // Step navigation
    currentStep,
    currentStepIndex,
    isGroupCompletion,

    // Derived
    attendanceStepData,
    parentNameByRegistration,
    presentAthletes,
    presentCount,
    absentCount,
    totalBadgesAwarded,

    // Raw attendance data (for accessing userId per registration)
    attendance,

    // Actions
    loadSession,
    updateAttendanceStatus,
    setAllAttendanceStatus,
    updateAthleteEffort,
    sendGroupBroadcast,
    sendPersonalUpdate,
    sendMessageParent,
    addImage,
    addVideo,
    removeImage,
    removeVideo,
    toggleBadge,
    goToNextStep,
    goToPrevStep,
    handleBackPress,
    handleComplete,
  } as const;
}
