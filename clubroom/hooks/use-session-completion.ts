/**
 * useSessionCompletion Hook
 *
 * Encapsulates all data loading, form state, and submit logic for the
 * session completion wizard. The screen component only handles rendering.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { progressService } from '@/services/progress-service';
import { badgeService } from '@/services/badge-service';
import { bookingService } from '@/services/booking-service';
import { userService } from '@/services/user-service';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { notificationTriggers } from '@/services/notification-trigger';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import type {
  SessionOffering,
  AttendanceRecord,
  SessionAttendance,
  SessionRegistration,
} from '@/constants/session-types';
import type { BadgeDefinition, ChatMessage, RosterEntry } from '@/constants/types';
import type { AttendanceStatus as StepAttendanceStatus } from '@/components/session/attendance-step';

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

export type CompletionStep = 'attendance' | 'notes' | 'badges' | 'summary';
export const COMPLETION_STEPS: CompletionStep[] = ['attendance', 'notes', 'badges', 'summary'];

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

// ============================================================================
// HOOK
// ============================================================================

export function useSessionCompletion(sessionId: string | undefined) {
  const { currentUser } = useAuth();
  const getRegistrationName = useCallback(
    (registration: SessionRegistration) => registration.userId || 'Athlete',
    [],
  );

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
  const [availableBadges, setAvailableBadges] = useState<BadgeDefinition[]>([]);
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
          }
          await loadParticipantContext(found.registrations, found.coachId);
          setLoading(false);
          return;
        }
      }

      const booking = await bookingService.getBooking(sessionId);
      if (booking && (booking.status === 'AWAITING_COMPLETION' || booking.status === 'CONFIRMED')) {
        setSourceType('booking');
        const syntheticSession = {
          id: booking.id,
          coachId: booking.coachId,
          title: booking.service || 'Session',
          description: booking.notes || '',
          sessionType: '1on1' as const,
          scheduledAt: booking.scheduledAt,
          duration: booking.duration || 60,
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
      setError('Failed to load session. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, loadParticipantContext]);

  const loadBadges = useCallback(async () => {
    try {
      const badges = await badgeService.listDefinitions();
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
        id: `msg_${session.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
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
        Alert.alert('Permission needed', 'Please allow photo library access.');
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
      Alert.alert('Error', 'Unable to add photo right now.');
    }
  }, []);

  const addVideo = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow video library access.');
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
      Alert.alert('Error', 'Unable to add video right now.');
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeVideo = useCallback((index: number) => {
    setVideoUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const goToNextStep = useCallback(() => {
    const nextIndex = COMPLETION_STEPS.indexOf(currentStep) + 1;
    if (nextIndex < COMPLETION_STEPS.length) {
      setCurrentStep(COMPLETION_STEPS[nextIndex]);
    }
  }, [currentStep]);

  const goToPrevStep = useCallback(() => {
    const prevIndex = COMPLETION_STEPS.indexOf(currentStep) - 1;
    if (prevIndex >= 0) {
      setCurrentStep(COMPLETION_STEPS[prevIndex]);
    }
  }, [currentStep]);

  const handleBackPress = useCallback(() => {
    if (COMPLETION_STEPS.indexOf(currentStep) > 0) {
      goToPrevStep();
    } else {
      router.back();
    }
  }, [currentStep, goToPrevStep]);

  const handleComplete = useCallback(async () => {
    if (!session || !currentUser) return;

    setSubmitting(true);

    try {
      const attendanceValues = Object.values(attendance);
      const present = attendanceValues.filter((a) => a.status === 'present').length;
      const absent = attendanceValues.filter((a) => a.status === 'absent').length;

      // 1. Save session notes
      await progressService.saveSessionNote(session.id, {
        summary: sessionSummary,
        focus: skillsFocused,
        improvements: '',
        homework,
        effort: overallEffort,
        attendance: `${present} present, ${absent} absent`,
        videoUrls,
        imageUrls,
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

      // 3. Save sharing preferences
      await apiClient.set(`${STORAGE_KEYS.SESSION_SHARING}_${session.id}`, {
        shareNotesWithParents,
        shareAttendance,
      });

      // 4. Create and persist attendance records
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

      await apiClient.set(
        `${STORAGE_KEYS.SESSION_ATTENDANCE}_${session.id}`,
        sessionAttendanceData,
      );

      // 5. Update session/booking status to completed
      let completedBookingId: string | undefined;
      if (sourceType === 'booking') {
        const updateResult = await bookingService.updateBooking(session.id, {
          status: 'COMPLETED' as const,
        });
        if (!updateResult.success) {
          logger.error('Failed to update booking status', updateResult.error.message);
        } else {
          completedBookingId = session.id;
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

      // 6. Emit SESSION_COMPLETED event
      const athleteIds = attendanceValues
        .filter((a) => a.status === 'present')
        .map((a) => a.registration.userId);

      const athleteNamesList = attendanceValues
        .filter((a) => a.status === 'present')
        .map((a) => getRegistrationName(a.registration));

      emitTyped(ServiceEvents.SESSION_COMPLETED, {
        sessionId: session.id,
        bookingId: completedBookingId,
        coachId: session.coachId,
        athleteIds,
        athleteName: athleteNamesList.join(', '),
      });

      // 7. Trigger parent notification
      const coachName = currentUser.fullName || session.coachId || 'Coach';
      const athleteNamesDisplay = athleteNamesList.join(', ') || 'Athlete';

      void notificationTriggers.sessionCompleted(coachName, athleteNamesDisplay);

      // 8. Queue review prompt (delayed to avoid collision)
      setTimeout(() => {
        void notificationTriggers.reviewPrompt(coachName, athleteNamesDisplay);
      }, 2000);

      logger.success('SessionCompleted', {
        sessionId: session.id,
        presentCount: present,
        badgesAwarded: attendanceValues.reduce((sum, a) => sum + a.badges.length, 0),
        shareNotesWithParents,
        shareAttendance,
        attendanceRecords: attendanceRecords.length,
      });

      if (Platform.OS !== 'web')
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        'Session Completed',
        'Attendance recorded and notes saved. Athletes will be notified.',
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (err) {
      logger.error('Failed to complete session', err);
      Alert.alert('Error', 'Failed to complete session. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [
    session,
    currentUser,
    attendance,
    sessionSummary,
    skillsFocused,
    overallEffort,
    homework,
    availableBadges,
    shareNotesWithParents,
    shareAttendance,
    videoUrls,
    imageUrls,
    sourceType,
    getRegistrationName,
  ]);

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

  const isGroupCompletion =
    sourceType === 'offering' && session?.sessionType === 'group' && attendanceList.length > 0;

  const currentStepIndex = COMPLETION_STEPS.indexOf(currentStep);

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

    // Actions
    loadSession,
    updateAttendanceStatus,
    setAllAttendanceStatus,
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
