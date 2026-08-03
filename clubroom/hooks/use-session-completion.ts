/**
 * useSessionCompletion Hook
 *
 * Encapsulates all data loading, form state, and submit logic for the
 * session completion wizard. The screen component only handles rendering.
 */

import { useState, useEffect, useMemo, useRef, startTransition } from 'react';
import { Linking, Platform } from 'react-native';
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
import { messagingService } from '@/services/messaging-service';
import { sessionTemplateService } from '@/services/session-template-service';
import { userService } from '@/services/user-service';
import { childService } from '@/services/child-service';
import { earningsService } from '@/services/earnings';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { notificationTriggers } from '@/services/notification-trigger';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { generateId } from '@/utils/generate-id';
import { createLogger } from '@/utils/logger';
import { getSessionOfferingGroupSessionId } from '@/utils/session-offering-projections';
import type {
  SessionOffering,
  AttendanceRecord,
  SessionAttendance,
  SessionRegistration,
} from '@/constants/session-types';
import type {
  ChatMessage,
  ChatThreadSummary,
  GroupSession,
  RosterEntry,
} from '@/constants/types';
import type { BadgeDefinitionWithStats } from '@/services/badge-service';
import type { AttendanceStatus as StepAttendanceStatus } from '@/components/session/attendance-step';
import type { QuickRateInput } from '@/types/progress-types';
import { uiFeedback } from '@/services/ui-feedback';
import { runAsyncTryCatchFinally } from '@/utils/async-control';
const logger = createLogger('SessionComplete');
const API_COMPLETION_MESSAGE_UNSUPPORTED_REASON =
  'Session completion messages need backend thread mapping before they can send in API mode.';
const API_COMPLETION_MESSAGE_NO_THREAD_REASON =
  'No backend message thread exists for this session completion yet.';

type CompletionMessageThreadTarget = {
  kind: 'direct' | 'group';
  bookingId?: string;
  groupSessionId?: string;
  counterpartyUserId?: string;
};

function clearReviewPromptTimer(ref: { current: ReturnType<typeof setTimeout> | null }) {
  if (ref.current) {
    clearTimeout(ref.current);
    ref.current = null;
  }
}

function markUnmounted(ref: { current: boolean }) {
  ref.current = false;
}

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
  warnings?: string[];
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
      (skills ?? []).flatMap((skill) => {
        const mapped = skill.trim();
        return mapped.length > 0 ? [mapped] : [];
      }),
    ),
  );
}
function normalizeThreadTargetId(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
function findCompletionMessageThread(
  threads: ChatThreadSummary[],
  target: CompletionMessageThreadTarget,
): ChatThreadSummary | undefined {
  const bookingId = normalizeThreadTargetId(target.bookingId);
  const groupSessionId = normalizeThreadTargetId(target.groupSessionId);
  const counterpartyUserId = normalizeThreadTargetId(target.counterpartyUserId);

  return threads.find((thread) => {
    if (target.kind === 'group') {
      if (thread.kind !== 'group') return false;
      return (
        (groupSessionId && thread.groupSessionId === groupSessionId) ||
        (bookingId && thread.bookingId === bookingId)
      );
    }

    if (thread.kind === 'group') return false;
    if (bookingId && thread.bookingId === bookingId) return true;
    if (!groupSessionId || thread.groupSessionId !== groupSessionId) return false;
    return !counterpartyUserId || thread.counterpartyUserId === counterpartyUserId;
  });
}
function resolveAttendanceDate(scheduledAt: string | undefined): string {
  const scheduled = scheduledAt ? new Date(scheduledAt) : null;
  if (scheduled && !Number.isNaN(scheduled.getTime())) {
    return scheduled.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}
function resolveCompletableGroupSchedule(
  session: GroupSession,
  now: Date,
): GroupSession['schedule'][number] | null {
  const cancelled = new Set(session.cancelledInstances ?? []);
  let earliest: GroupSession['schedule'][number] | null = null;
  let earliestKey = '';

  for (const entry of session.schedule) {
    if (cancelled.has(entry.date)) {
      continue;
    }
    const endsAt = new Date(`${entry.date}T${entry.endTime}:00.000Z`);
    if (Number.isNaN(endsAt.getTime()) || endsAt.getTime() > now.getTime()) {
      continue;
    }
    const entryKey = `${entry.date}T${entry.endTime}`;
    if (!earliest || entryKey.localeCompare(earliestKey) < 0) {
      earliest = entry;
      earliestKey = entryKey;
    }
  }
  return earliest;
}

function registrationAuthorityName(
  registration: SessionRegistration,
  participantNames: Record<string, string>,
): string | undefined {
  const resolved = participantNames[registration.userId]?.trim() || registration.userName?.trim();
  return resolved || undefined;
}
function registrationDisplayName(
  registration: SessionRegistration,
  participantNames: Record<string, string>,
): string {
  return (
    registrationAuthorityName(registration, participantNames) ||
    (apiClient.isMockMode ? 'Athlete' : 'Name unavailable')
  );
}
function requireRegistrationAuthorityName(
  registration: SessionRegistration,
  participantNames: Record<string, string>,
): string {
  const resolved = registrationAuthorityName(registration, participantNames);
  if (!resolved) {
    throw new Error(
      `Athlete identity is unavailable from /v1 authority for ${registration.userId}.`,
    );
  }
  return resolved;
}

// ============================================================================
// HOOK
// ============================================================================

export function useSessionCompletion(sessionId: string | undefined) {
  const { currentUser } = useAuth();

  // Unmount guard for async setState safety
  const isMountedRef = useRef(true);

  // Timer ref for review prompt delay
  const reviewPromptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up floating timer and mark unmounted
  useEffect(() => {
    return () => {
      markUnmounted(isMountedRef);
      clearReviewPromptTimer(reviewPromptTimerRef);
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
  const [mediaPermissionMessage, setMediaPermissionMessage] = useState<string | null>(null);

  // Step navigation
  const [currentStep, setCurrentStep] = useState<CompletionStep>('attendance');

  // Sharing toggles
  const [shareNotesWithParents, setShareNotesWithParents] = useState(true);
  const [shareAttendance, setShareAttendance] = useState(true);

  // Source type
  const [sourceType, setSourceType] = useState<'offering' | 'booking'>('offering');
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});
  const [parentByAthleteId, setParentByAthleteId] = useState<
    Record<
      string,
      {
        parentId: string;
        parentName: string;
      }
    >
  >({});
  const [sessionTemplateContext, setSessionTemplateContext] = useState<{
    sessionTemplateId?: string;
    sessionTemplateName?: string;
  }>({});
  const loadSessionRef = useRef<() => Promise<void> | void>(() => {});
  const loadBadgesRef = useRef<() => Promise<void> | void>(() => {});
  const isGroupCompletion =
    sourceType === 'offering' &&
    session?.sessionType === 'group' &&
    Object.keys(attendance).length > 0;
  const activeSteps = isGroupCompletion
    ? COMPLETION_STEPS.filter((step) => step !== 'quickRate')
    : COMPLETION_STEPS;
  const activeGroupSessionId = useMemo(() => {
    if (!session || sourceType !== 'offering') return undefined;
    return (
      getSessionOfferingGroupSessionId(session) ??
      (session.sessionType === 'group' ? session.id : undefined)
    );
  }, [session, sourceType]);
  const loadParticipantContext = async (registrations: SessionRegistration[], coachId: string) => {
    const athleteIds = registrations.flatMap((registration) =>
      registration.userId ? [registration.userId] : [],
    );
    if (athleteIds.length === 0) {
      setParticipantNames({});
      setParentByAthleteId({});
      return;
    }

    if (!apiClient.isMockMode) {
      const resolvedParticipants = await Promise.all(
        registrations.map(async (registration) => {
          const rosterName = registration.userName?.trim();
          const rosterParentId = registration.parentId?.trim();
          const rosterParentName = registration.parentName?.trim();
          if (rosterName && (!rosterParentId || rosterParentName)) {
            return {
              athleteId: registration.userId,
              athleteName: rosterName,
              parentId: rosterParentId,
              parentName: rosterParentName,
            };
          }

          const athlete = await childService.getChild(registration.userId, {
            includeTrustData: false,
          });
          if (!athlete) {
            throw new Error(
              `Athlete profile is unavailable from /v1/athletes/${registration.userId}.`,
            );
          }
          const athleteName =
            rosterName ||
            athlete.nickname?.trim() ||
            `${athlete.firstName} ${athlete.lastName}`.trim();
          if (!athleteName) {
            throw new Error(
              `Athlete name is unavailable from /v1/athletes/${registration.userId}.`,
            );
          }
          return {
            athleteId: registration.userId,
            athleteName,
            parentId: rosterParentId || athlete.parentId?.trim() || undefined,
            parentName: rosterParentName,
          };
        }),
      );
      const unresolvedParentIds = Array.from(
        new Set(
          resolvedParticipants.flatMap((participant) =>
            participant.parentId && !participant.parentName ? [participant.parentId] : [],
          ),
        ),
      );
      const parentsResult = await userService.getUsersByIds(unresolvedParentIds);
      if (!parentsResult.success) {
        throw new Error(parentsResult.error.message);
      }
      const parentNamesById = new Map(
        parentsResult.data.map((parent) => [parent.id, parent.name.trim()] as const),
      );
      const nextParticipantNames: Record<string, string> = {};
      const nextParentByAthleteId: Record<
        string,
        {
          parentId: string;
          parentName: string;
        }
      > = {};
      for (const participant of resolvedParticipants) {
        nextParticipantNames[participant.athleteId] = participant.athleteName;
        if (!participant.parentId) {
          continue;
        }
        const parentName =
          participant.parentName?.trim() || parentNamesById.get(participant.parentId)?.trim();
        if (!parentName) {
          throw new Error(
            `Guardian identity is unavailable from /v1 authority for ${participant.parentId}.`,
          );
        }
        nextParentByAthleteId[participant.athleteId] = {
          parentId: participant.parentId,
          parentName,
        };
      }
      setParticipantNames(nextParticipantNames);
      setParentByAthleteId(nextParentByAthleteId);
      return;
    }

    const [usersResult, rosterEntries] = await Promise.all([
      userService.getUsersByIds(athleteIds),
      apiClient.get<RosterEntry[]>(STORAGE_KEYS.ROSTER, []),
    ]);
    const nextParticipantNames: Record<string, string> = {};
    const nextParentByAthleteId: Record<
      string,
      {
        parentId: string;
        parentName: string;
      }
    > = {};
    if (usersResult.success) {
      for (const user of usersResult.data) {
        nextParticipantNames[user.id] = user.name;
      }
    }
    for (const [index, athleteId] of athleteIds.entries()) {
      if (!nextParticipantNames[athleteId]) {
        nextParticipantNames[athleteId] = `Athlete ${index + 1}`;
      }
    }
    const athleteIdSet = new Set(athleteIds);
    for (const entry of rosterEntries) {
      if (entry.coachId !== coachId) {
        continue;
      }
      if (!athleteIdSet.has(entry.athleteId)) {
        continue;
      }
      nextParentByAthleteId[entry.athleteId] = {
        parentId: entry.parentId,
        parentName: entry.parentName || 'Parent/guardian',
      };
    }
    setParticipantNames(nextParticipantNames);
    setParentByAthleteId(nextParentByAthleteId);
  };

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadSession = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    return await runAsyncTryCatchFinally(
      async () => {
        if (apiClient.isMockMode) {
          const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
          if (offerings.length > 0) {
            const found = offerings.find((o) => o.id === sessionId);
            if (found) {
              setSession(found);
              setSourceType('offering');
              setSessionTemplateContext({});
              const initialAttendance: Record<string, AthleteAttendance> = {};
              found.registrations.forEach((r) => {
                if (!(r.status === 'confirmed')) return;
                initialAttendance[r.id] = {
                  registration: r,
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
        }

        // 2. Try group sessions
        const groupSessionLookupId =
          getSessionOfferingGroupSessionId({ id: sessionId }) ?? sessionId;
        const groupSession =
          !apiClient.isMockMode && sessionId.startsWith('bok_')
            ? null
            : await groupSessionService.getSession(groupSessionLookupId);
        if (groupSession) {
          const completionRoster = apiClient.isMockMode
            ? {
                occurrenceDate: resolveCompletableGroupSchedule(groupSession, new Date())?.date ?? null,
                registrations: await groupSessionService.getSessionRoster(groupSessionLookupId),
              }
            : await groupSessionService.getCompletionRoster(groupSessionLookupId);
          const occurrence = completionRoster.occurrenceDate
            ? groupSession.schedule.find((entry) => entry.date === completionRoster.occurrenceDate)
            : undefined;
          if (!occurrence) {
            setError('This group session has no ended occurrence awaiting completion.');
            return;
          }
          const registrations: SessionRegistration[] = completionRoster.registrations.flatMap((entry) =>
            entry.status === 'WAITLISTED' || entry.status === 'CANCELLED'
              ? []
              : [
                  {
                    id: entry.id,
                    userId: entry.athleteId,
                    ...(entry.athleteName ? { userName: entry.athleteName } : {}),
                    ...(entry.parentId ? { parentId: entry.parentId } : {}),
                    ...(entry.parentName ? { parentName: entry.parentName } : {}),
                    bookedAt: entry.registeredAt,
                    status: 'confirmed' as const,
                  },
                ],
          );
          const syntheticOffering: SessionOffering = {
            id: groupSession.id,
            coachId: groupSession.coachId,
            clubId: groupSession.clubId,
            title: groupSession.title,
            description: groupSession.description,
            sessionType: 'group',
            maxParticipants: groupSession.maxParticipants,
            location: groupSession.location,
            scheduledAt: `${occurrence.date}T${occurrence.startTime}:00.000Z`,
            isRecurring: groupSession.isRecurring ?? false,
            recurrenceType: groupSession.isRecurring ? 'weekly' : 'none',
            status: 'active',
            registrations,
            createdAt: groupSession.createdAt,
            ageMin: groupSession.ageMin,
            ageMax: groupSession.ageMax,
            squadId: groupSession.squadId,
            inviteType: groupSession.inviteType,
            source: 'group',
            sourceEntityId: groupSession.id,
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
        if (
          booking &&
          (booking.status === 'AWAITING_COMPLETION' || booking.status === 'CONFIRMED')
        ) {
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
      },
      async (err) => {
        logger.error('Failed to load session', err);
        if (isMountedRef.current) {
          setError('Failed to load session. Please try again.');
        }
      },
      () => {
        if (isMountedRef.current) {
          setLoading(false);
        }
      },
    );
  };
  const loadBadges = async () => {
    try {
      const badges = await badgeService.listDefinitionsWithStats();
      setAvailableBadges(badges);
    } catch (err) {
      logger.error('Failed to load badges', err);
    }
  };
  useEffect(() => {
    loadSessionRef.current = loadSession;
    loadBadgesRef.current = loadBadges;
  });
  useEffect(() => {
    startTransition(() => {
      void loadSessionRef.current();
    });
    startTransition(() => {
      void loadBadgesRef.current();
    });
  }, [sessionId]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const updateAttendanceStatus = (regId: string, status: StepAttendanceStatus) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAttendance((prev) => ({
      ...prev,
      [regId]: {
        ...prev[regId],
        status,
      },
    }));
  };
  const setAllAttendanceStatus = (status: StepAttendanceStatus) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAttendance((prev) => {
      const next: Record<string, AthleteAttendance> = {};
      for (const [registrationId, athleteAttendance] of Object.entries(prev)) {
        next[registrationId] = {
          ...athleteAttendance,
          status,
        };
      }
      return next;
    });
  };
  const updateAthleteEffort = (athleteId: string, effort: number) => {
    const nextEffort = Math.max(1, Math.min(5, Math.round(effort)));
    setAttendance((prev) => {
      const nextAttendance: Record<string, AthleteAttendance> = {};
      for (const [registrationId, athleteAttendance] of Object.entries(prev)) {
        if (athleteAttendance.registration.userId === athleteId) {
          nextAttendance[registrationId] = {
            ...athleteAttendance,
            effort: nextEffort,
          };
        } else {
          nextAttendance[registrationId] = athleteAttendance;
        }
      }
      return nextAttendance;
    });
  };
  const appendThreadMessage = async (
    threadId: string,
    body: string,
    target?: CompletionMessageThreadTarget,
  ): Promise<{ ok: true } | { ok: false; reason: string }> => {
    if (!session || !currentUser) {
      return {
        ok: false,
        reason: 'Session or coach identity is missing.',
      };
    }
    if (!apiClient.isMockMode) {
      if (!target) {
        logger.warn('Blocked session-completion message without backend thread target', {
          sessionId: session.id,
          threadId,
          route: '/v1/message-threads/:threadId/messages',
        });
        return {
          ok: false,
          reason: API_COMPLETION_MESSAGE_UNSUPPORTED_REASON,
        };
      }

      const threadResult = await messagingService.listThreads();
      if (!threadResult.success) {
        return {
          ok: false,
          reason: threadResult.error.message,
        };
      }

      const backendThread = findCompletionMessageThread(threadResult.data, target);
      if (!backendThread) {
        logger.warn('No backend session-completion message thread found', {
          sessionId: session.id,
          threadId,
          target,
          route: '/v1/message-threads/:threadId/messages',
        });
        return {
          ok: false,
          reason: API_COMPLETION_MESSAGE_NO_THREAD_REASON,
        };
      }

      const senderName = (
        currentUser.fullName ||
        currentUser.name ||
        currentUser.username ||
        ''
      ).trim();
      if (!senderName) {
        return {
          ok: false,
          reason: 'Complete your account name before sending session updates.',
        };
      }

      const sendResult = await messagingService.sendMessage(
        backendThread.id,
        body,
        'coach',
        senderName,
      );
      if (!sendResult.success) {
        return {
          ok: false,
          reason: sendResult.error.message,
        };
      }
      return { ok: true };
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
    return { ok: true };
  };
  const sendGroupBroadcast = async (
    message: string,
  ): Promise<{ ok: true } | { ok: false; reason: string }> => {
    const trimmed = message.trim();
    if (!session || !trimmed) {
      return {
        ok: false,
        reason: 'Write a group update before sending.',
      };
    }
    const groupSessionId = activeGroupSessionId ?? session.id;
    return appendThreadMessage(`thread_group_${groupSessionId}`, trimmed, {
      kind: 'group',
      groupSessionId,
    });
  };
  const sendPersonalUpdate = async (registrationId: string) => {
    const athleteAttendance = attendance[registrationId];
    if (!athleteAttendance || !session) {
      return {
        ok: false,
        reason: 'Athlete row not found',
      };
    }
    const athleteId = athleteAttendance.registration.userId;
    const athleteName = registrationAuthorityName(
      athleteAttendance.registration,
      participantNames,
    );
    if (!athleteName) {
      return {
        ok: false,
        reason: 'Athlete identity is unavailable from the live roster.',
      };
    }
    const statusLabel = athleteAttendance.status === 'present' ? 'present' : 'absent';
    const note = athleteAttendance.note?.trim();
    const body = note
      ? `Personal update for ${athleteName}: ${note}`
      : `Personal update for ${athleteName}: marked ${statusLabel} in ${session.title}.`;
    const result = await appendThreadMessage(`thread_athlete_${athleteId}_${session.id}`, body, {
      kind: 'direct',
      bookingId: sourceType === 'booking' ? session.id : undefined,
      groupSessionId: sourceType === 'offering' ? activeGroupSessionId : undefined,
      counterpartyUserId: athleteId,
    });
    if (!result.ok) {
      return {
        ok: false,
        reason: result.reason,
      };
    }
    return {
      ok: true,
      athleteName,
    };
  };
  const sendMessageParent = async (registrationId: string) => {
    const athleteAttendance = attendance[registrationId];
    if (!athleteAttendance || !session) {
      return {
        ok: false,
        reason: 'Athlete row not found',
      };
    }
    const athleteId = athleteAttendance.registration.userId;
    const athleteName = registrationAuthorityName(
      athleteAttendance.registration,
      participantNames,
    );
    if (!athleteName) {
      return {
        ok: false,
        reason: 'Athlete identity is unavailable from the live roster.',
      };
    }
    const parentLink = parentByAthleteId[athleteId];
    const targetName = parentLink?.parentName ?? athleteName;
    const targetType = parentLink ? 'parent' : 'athlete';
    const threadId = parentLink
      ? `thread_parent_${parentLink.parentId}_${session.id}`
      : `thread_athlete_${athleteId}_${session.id}`;
    const body = parentLink
      ? `${athleteName} update from ${session.title}: attendance marked ${athleteAttendance.status}. Reply if you want a full personal recap.`
      : `Session update for ${athleteName}: attendance marked ${athleteAttendance.status}.`;
    const result = await appendThreadMessage(threadId, body, {
      kind: 'direct',
      bookingId: sourceType === 'booking' ? session.id : undefined,
      groupSessionId: sourceType === 'offering' ? activeGroupSessionId : undefined,
      counterpartyUserId: parentLink?.parentId ?? athleteId,
    });
    if (!result.ok) {
      return {
        ok: false,
        reason: result.reason,
      };
    }
    return {
      ok: true as const,
      athleteName,
      targetName,
      targetType,
    };
  };
  const toggleBadge = (regId: string, badgeId: string) => {
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
  };
  const addImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setMediaPermissionMessage(
          'Photo and video library access is required to attach media. Enable it in Settings.',
        );
        uiFeedback.showToast('Please allow photo library access.', 'warning');
        return;
      }
      setMediaPermissionMessage(null);
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
  };
  const addVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setMediaPermissionMessage(
          'Photo and video library access is required to attach media. Enable it in Settings.',
        );
        uiFeedback.showToast('Please allow video library access.', 'warning');
        return;
      }
      setMediaPermissionMessage(null);
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
  };
  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };
  const removeVideo = (index: number) => {
    setVideoUrls((prev) => prev.filter((_, i) => i !== index));
  };
  const openMediaSettings = () => {
    void Linking.openSettings();
  };
  const clearMediaPermissionMessage = () => {
    setMediaPermissionMessage(null);
  };
  const goToNextStep = () => {
    const nextIndex = activeSteps.indexOf(currentStep) + 1;
    if (nextIndex < activeSteps.length) {
      setCurrentStep(activeSteps[nextIndex]);
    }
  };
  const goToPrevStep = () => {
    const prevIndex = activeSteps.indexOf(currentStep) - 1;
    if (prevIndex >= 0) {
      setCurrentStep(activeSteps[prevIndex]);
    }
  };
  const handleBackPress = () => {
    if (activeSteps.indexOf(currentStep) > 0) {
      goToPrevStep();
    } else {
      if (router.canGoBack()) {
        router.back();
        return;
      }
      router.replace(Routes.SCHEDULE);
    }
  };
  const handleComplete = async (
    quickRateByAthleteId: Record<string, QuickRateInput> = {},
  ): Promise<CompletionSummaryData | null> => {
    if (!session || !currentUser) return null;
    const coachName = (
      currentUser.fullName ||
      currentUser.name ||
      currentUser.username ||
      ''
    ).trim();
    if (!coachName) {
      uiFeedback.showToast('Complete your account name before completing sessions.', 'error');
      return null;
    }
    setSubmitting(true);
    return await runAsyncTryCatchFinally(
      async () => {
        const attendanceValues = Object.values(attendance);
        const present = attendanceValues.filter((a) => a.status === 'present').length;
        const absent = attendanceValues.filter((a) => a.status === 'absent').length;
        const normalizedFocusSkills = normalizeSkills(skillsFocused);
        const secondaryWriteFailures: string[] = [];
        let badgesSaved = 0;
        let quickRatesSaved = 0;
        let authoritativeGroupCompletionPersisted = false;
        let completedBookingId: string | undefined;
        const completedAt = new Date().toISOString();
        const bookingCompletionAttendance = attendanceValues.map((ad) => ({
          athleteId: ad.registration.userId,
          status: mapAttendanceStatus(ad.status),
          ...(ad.note ? { notes: ad.note } : {}),
          ...(typeof ad.effort === 'number' ? { effortRating: ad.effort } : {}),
        }));

        if (!apiClient.isMockMode && sourceType === 'offering') {
          if (!activeGroupSessionId) {
            throw new Error('Group session authority is missing.');
          }
          const completionResult = await groupSessionService.completeSession(activeGroupSessionId, {
            occurrenceDate: resolveAttendanceDate(session.scheduledAt),
            attendance: attendanceValues.map((athleteData) => ({
              registrationId: athleteData.registration.id,
              status: mapAttendanceStatus(athleteData.status),
              ...(athleteData.note ? { notes: athleteData.note } : {}),
              ...(typeof athleteData.effort === 'number'
                ? { effortRating: athleteData.effort }
                : {}),
            })),
          });
          if (!completionResult.success) {
            throw new Error(completionResult.error.message);
          }
          authoritativeGroupCompletionPersisted = true;
        }

        if (sourceType === 'booking') {
          const completeBookingInput = {
            completedAt,
            attendance: bookingCompletionAttendance,
            ...(sessionSummary.trim() ? { note: sessionSummary.trim() } : {}),
            idempotencyKey: `booking-complete-${session.id}-${completedAt}`,
          };
          let updateResult = await bookingService.completeBooking(session.id, completeBookingInput);
          if (!updateResult.success) {
            logger.error('Booking completion failed, retrying once', updateResult.error.message);
            updateResult = await bookingService.completeBooking(session.id, completeBookingInput);
          }
          if (!updateResult.success) {
            throw new Error(updateResult.error.message);
          }
          if (updateResult.data.status !== 'COMPLETED') {
            throw new Error('Booking completion could not be verified.');
          }
          completedBookingId = session.id;
        }

        const availableBadgeById = new Map(availableBadges.map((badge) => [badge.id, badge]));

        // 1-3. Save notes, badge awards, and base feedback.
        const saveSessionNotes =
          apiClient.isMockMode
            ? progressService
                .saveSessionNote(session.id, {
                  summary: sessionSummary,
                  focus: skillsFocused,
                  improvements,
                  homework,
                  effort: overallEffort,
                  attendance: `${present} present, ${absent} absent`,
                  videoUrls,
                  imageUrls,
                })
                .then(() => {
                  emitTyped(ServiceEvents.SESSION_NOTES_SAVED, {
                    sessionId: session.id,
                    bookingId: sourceType === 'booking' ? session.id : undefined,
                    coachId: session.coachId,
                  });
                })
            : Promise.resolve();

        const awardBadges = Promise.all(
          attendanceValues.flatMap((athleteData) => {
            if (athleteData.badges.length === 0 || athleteData.status !== 'present') {
              return [];
            }
            return athleteData.badges.flatMap((badgeId) => {
              const badge = availableBadgeById.get(badgeId);
              if (!badge) {
                return [];
              }
              return [
                badgeService.awardBadge({
                  athleteId: athleteData.registration.userId,
                  athleteName: requireRegistrationAuthorityName(
                    athleteData.registration,
                    participantNames,
                  ),
                  badgeId: badge.id,
                  coachId: currentUser.id,
                  coachName,
                  sessionId: session.id,
                  reason: badge.label,
                  note: athleteData.note || undefined,
                }),
              ];
            });
          }),
        ).then((results) => {
          for (const result of results) {
            if (result.success) {
              badgesSaved += 1;
            } else {
              secondaryWriteFailures.push('badge');
              logger.error('Failed to award session badge', result.error);
            }
          }
        });

        const saveBaseFeedback = Promise.all(
          attendanceValues.map(async (athleteData) => {
            if (athleteData.status !== 'present') return;
            const athleteId = athleteData.registration.userId;

            // Skip athletes that have quick-rate data — step 3b handles their feedback
            if (quickRateByAthleteId[athleteId]) return;
            const athleteName = requireRegistrationAuthorityName(
              athleteData.registration,
              participantNames,
            );
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
                badgeAwarded:
                  athleteData.badges
                    .map((id) => availableBadgeById.get(id)?.label ?? id)
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
              secondaryWriteFailures.push('feedback');
              logger.error('Failed to save session feedback for athlete', {
                athleteId,
                error: feedbackErr,
              });
            }
          }),
        ).then(() => undefined);

        const persistBaseSessionData = Promise.all([
          saveSessionNotes,
          awardBadges,
          saveBaseFeedback,
        ]).then(() => undefined);

        // 3b. Persist Quick Rate position/corner ratings and skill updates
        const persistQuickRateData = Promise.all(
          Object.entries(quickRateByAthleteId).map(async ([athleteId, quickRateInput]) => {
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
                apiClient.isMockMode
                  ? progressPositionService.recordPosition(
                      quickRatePayload.sessionId,
                      quickRatePayload.athleteId,
                      quickRatePayload.positionPlayed,
                    )
                  : Promise.resolve(null),
                progressSkillsService.updateFromPositionRate(
                  quickRatePayload.athleteId,
                  quickRatePayload.sessionId,
                  quickRatePayload.coachId,
                  quickRatePayload.positionPlayed,
                  quickRatePayload.positionSkillRatings,
                ),
              ]);
              if (positionResult && !positionResult.success) {
                secondaryWriteFailures.push('position');
                logger.error('Failed to save quick rate position context', {
                  athleteId,
                  error: positionResult.error,
                });
              }
              if (!skillResult.success) {
                secondaryWriteFailures.push('skills');
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
              {
                skillsAlreadyWritten: true,
              },
            );
            if (!feedbackResult.success) {
              secondaryWriteFailures.push('quick rate');
              logger.error('Failed to save quick rate feedback', {
                athleteId,
                error: feedbackResult.error,
              });
            } else {
              quickRatesSaved += 1;
            }
          }),
        ).then(() => undefined);

        // 4. Save sharing preferences
        const persistSharingPreferences = apiClient.isMockMode
          ? apiClient.set(`${STORAGE_KEYS.SESSION_SHARING}_${session.id}`, {
              shareNotesWithParents,
              shareAttendance,
            })
          : Promise.resolve();

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
          completedAt,
          completedBy: currentUser.id,
        };
        const emitAttendanceRecorded = () => {
          emitTyped(ServiceEvents.ATTENDANCE_RECORDED, {
            sessionId: session.id,
            bookingId: sourceType === 'booking' ? session.id : undefined,
            coachId: session.coachId,
            athleteIds: attendanceRecords.map((r) => r.athleteId),
            presentCount: present,
            absentCount: absent,
          });
        };
        const persistAttendance = (async () => {
          if (apiClient.isMockMode) {
            await apiClient.set(
              `${STORAGE_KEYS.SESSION_ATTENDANCE}_${session.id}`,
              sessionAttendanceData,
            );
            emitAttendanceRecorded();
            return;
          }

          if (sourceType === 'offering') {
            if (!authoritativeGroupCompletionPersisted) {
              throw new Error('Group session completion was not persisted.');
            }
            emitAttendanceRecorded();
          }
        })();

        await Promise.all([
          persistBaseSessionData,
          persistQuickRateData,
          persistSharingPreferences,
          persistAttendance,
        ]);

        // 6. Completion is already authoritative. Mock-only offering state remains local.
        if (sourceType === 'booking') {
          if (!completedBookingId) {
            throw new Error('Booking completion was not persisted.');
          }
          if (!apiClient.isMockMode) {
            emitAttendanceRecorded();
          }
        } else {
          if (apiClient.isMockMode) {
            const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
            if (offerings.length > 0) {
              const updated = offerings.map((o) => {
                if (o.id === session.id && !o.isRecurring) {
                  return {
                    ...o,
                    status: 'completed' as const,
                  };
                }
                return o;
              });
              await apiClient.set('session_offerings', updated);
            }
          }

          if (apiClient.isMockMode) {
            const coachBookings = await bookingService.getBookingsForUser(
              session.coachId,
              'coach',
            );
            const linkedBookings = activeGroupSessionId
              ? coachBookings.filter(
                  (booking) =>
                    booking.groupSessionId === activeGroupSessionId &&
                    booking.status === 'COMPLETED',
                )
              : [];
            completedBookingId = linkedBookings[0]?.id;
          }
        }

        // Compute present athlete lists (used by earnings + event + notifications)
        const athleteIds = attendanceValues.flatMap((a) =>
          a.status === 'present' ? [a.registration.userId] : [],
        );
        const athleteNamesList = attendanceValues.flatMap((a) =>
          a.status === 'present'
            ? [requireRegistrationAuthorityName(a.registration, participantNames)]
            : [],
        );

        // 6b. Record earnings for the coach
        if (apiClient.isMockMode && completedBookingId && session.price) {
          try {
            const earningsResult = await earningsService.recordSessionPayment(
              session.coachId,
              completedBookingId,
              session.price,
              athleteNamesList.length > 0 ? athleteNamesList.join(', ') : 'Athlete',
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

        // 8. Trigger mock-mode parent/guardian notifications scoped by recipient.
        if (apiClient.isMockMode) {
          const recipientToAthletes = new Map<string, string[]>();
          for (const athleteId of athleteIds) {
            const recipientId = parentByAthleteId[athleteId]?.parentId || athleteId;
            if (!recipientId) continue;
            const athleteName = participantNames[athleteId] || 'Athlete';
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
        }
        const badgesAwarded = badgesSaved;
        let photosCaptured = 0;
        let videosRecorded = 0;
        const sessionMediaResult = await mediaService.listMediaForSession(session.id);
        if (sessionMediaResult.success) {
          photosCaptured = sessionMediaResult.data.reduce(
            (sum, media) => sum + media.photos.length,
            0,
          );
          videosRecorded = sessionMediaResult.data.filter((media) => Boolean(media.video)).length;
        } else {
          logger.error('Failed to aggregate session media for completion summary', {
            sessionId: session.id,
            error: sessionMediaResult.error,
          });
        }
        const completionAthletes = attendanceValues.flatMap((athlete) =>
          athlete.status === 'present'
            ? [
                {
                  registrationId: athlete.registration.id,
                  athleteId: athlete.registration.userId,
                  athleteName: requireRegistrationAuthorityName(
                    athlete.registration,
                    participantNames,
                  ),
                },
              ]
            : [],
        );
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
        const warnings =
          secondaryWriteFailures.length > 0
            ? Array.from(new Set(secondaryWriteFailures)).map(
                (failure) => `${failure} follow-up was not saved`,
              )
            : undefined;
        if (warnings && isMountedRef.current) {
          uiFeedback.showToast(
            'Session completed, but some follow-up details were not saved.',
            'warning',
          );
        }
        return {
          sessionId: session.id,
          ratedAthletes: quickRatesSaved,
          photosCaptured,
          videosRecorded,
          badgesAwarded,
          athletes: completionAthletes,
          warnings,
        };
      },
      async (err) => {
        logger.error('Failed to complete session', err);
        if (isMountedRef.current) {
          const message =
            err instanceof Error && err.message.includes('/v1')
              ? err.message
              : 'Failed to complete session. Please try again.';
          uiFeedback.showToast(message, 'error');
        }
        return null;
      },
      () => {
        if (isMountedRef.current) {
          setSubmitting(false);
        }
      },
    );
  };

  // ============================================================================
  // DERIVED DATA
  // ============================================================================

  const attendanceList = useMemo(() => Object.values(attendance), [attendance]);
  const attendanceStepData = useMemo(
    () =>
      attendanceList.map((a) => ({
        registrationId: a.registration.id,
        userName: registrationDisplayName(a.registration, participantNames),
        status: a.status,
        badges: a.badges,
      })),
    [attendanceList, participantNames],
  );
  const presentAthletes = useMemo(
    () =>
      attendanceList.flatMap((a) =>
        a.status === 'present'
          ? [
              {
                registrationId: a.registration.id,
                userName: registrationDisplayName(a.registration, participantNames),
                badges: a.badges,
              },
            ]
          : [],
      ),
    [attendanceList, participantNames],
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
    mediaPermissionMessage,
    shareNotesWithParents,
    setShareNotesWithParents,
    shareAttendance,
    setShareAttendance,
    // Step navigation
    currentStep,
    currentStepIndex,
    sourceType,
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
    openMediaSettings,
    clearMediaPermissionMessage,
    toggleBadge,
    goToNextStep,
    goToPrevStep,
    handleBackPress,
    handleComplete,
  } as const;
}
