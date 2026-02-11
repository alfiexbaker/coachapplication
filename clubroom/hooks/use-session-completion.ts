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

import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { progressService } from '@/services/progress-service';
import { badgeService } from '@/services/badge-service';
import { bookingService } from '@/services/booking-service';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { notificationTriggers } from '@/services/notification-trigger';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import type { SessionOffering, AttendanceRecord, SessionAttendance, SessionRegistration } from '@/constants/session-types';
import type { BadgeDefinition } from '@/constants/types';
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

function mapAttendanceStatus(status: StepAttendanceStatus): 'ATTENDED' | 'NO_SHOW' | 'LATE' {
  switch (status) {
    case 'present':
      return 'ATTENDED';
    case 'absent':
      return 'NO_SHOW';
    case 'late':
      return 'LATE';
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useSessionCompletion(sessionId: string | undefined) {
  const { currentUser } = useAuth();
  const getRegistrationName = useCallback((registration: SessionRegistration) => registration.userId || 'Athlete', []);

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

  // Step navigation
  const [currentStep, setCurrentStep] = useState<CompletionStep>('attendance');

  // Sharing toggles
  const [shareNotesWithParents, setShareNotesWithParents] = useState(true);
  const [shareAttendance, setShareAttendance] = useState(true);

  // Source type
  const [sourceType, setSourceType] = useState<'offering' | 'booking'>('offering');

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
        const found = offerings.find(o => o.id === sessionId);
        if (found) {
          setSession(found);
          setSourceType('offering');

          const initialAttendance: Record<string, AthleteAttendance> = {};
          found.registrations
            .filter(r => r.status === 'confirmed')
            .forEach(reg => {
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
          registrations: [{
            id: `reg-${booking.id}`,
            userId: booking.athleteId || booking.athleteIds?.[0] || '',
            bookedAt: booking.scheduledAt,
            status: 'confirmed' as const,
          }],
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
      } else {
        setError('Session not found');
      }
    } catch (err) {
      logger.error('Failed to load session', err);
      setError('Failed to load session. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

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
    setAttendance(prev => ({
      ...prev,
      [regId]: { ...prev[regId], status },
    }));
  }, []);

  const toggleBadge = useCallback((regId: string, badgeId: string) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAttendance(prev => {
      const current = prev[regId];
      const hasBadge = current.badges.includes(badgeId);
      return {
        ...prev,
        [regId]: {
          ...current,
          badges: hasBadge
            ? current.badges.filter(b => b !== badgeId)
            : [...current.badges, badgeId],
        },
      };
    });
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
      const present = attendanceValues.filter(a => a.status === 'present').length;
      const absent = attendanceValues.filter(a => a.status === 'absent').length;

      // 1. Save session notes
      await progressService.saveSessionNote(session.id, {
        summary: sessionSummary,
        focus: skillsFocused,
        improvements: '',
        homework,
        effort: overallEffort,
        attendance: `${present} present, ${absent} absent`,
      });

      // 2. Award badges
      for (const athleteData of attendanceValues) {
        if (athleteData.badges.length > 0 && athleteData.status === 'present') {
          for (const badgeId of athleteData.badges) {
            const badge = availableBadges.find(b => b.id === badgeId);
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
      const attendanceRecords: AttendanceRecord[] = attendanceValues.map(ad => ({
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

      // 5. Update session/booking status to completed
      if (sourceType === 'booking') {
        const updateResult = await bookingService.updateBooking(session.id, { status: 'COMPLETED' as const });
        if (!updateResult.success) {
          logger.error('Failed to update booking status', updateResult.error.message);
        }
      } else {
        const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
        if (offerings.length > 0) {
          const updated = offerings.map(o => {
            if (o.id === session.id && !o.isRecurring) {
              return { ...o, status: 'completed' as const };
            }
            return o;
          });
          await apiClient.set('session_offerings', updated);
        }
      }

      // 6. Emit SESSION_COMPLETED event
      const athleteIds = attendanceValues
        .filter(a => a.status === 'present')
        .map(a => a.registration.userId);

      const athleteNamesList = attendanceValues
        .filter(a => a.status === 'present')
        .map(a => getRegistrationName(a.registration));

      emitTyped(ServiceEvents.SESSION_COMPLETED, {
        sessionId: session.id,
        bookingId: sourceType === 'booking' ? session.id : undefined,
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

      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

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
    session, currentUser, attendance, sessionSummary, skillsFocused,
    overallEffort, homework, availableBadges, shareNotesWithParents,
    shareAttendance, sourceType,
  ]);

  // ============================================================================
  // DERIVED DATA
  // ============================================================================

  const attendanceList = useMemo(() => Object.values(attendance), [attendance]);

  const attendanceStepData = useMemo(
    () => attendanceList.map(a => ({
      registrationId: a.registration.id,
      userName: getRegistrationName(a.registration),
      status: a.status,
      badges: a.badges,
    })),
    [attendanceList, getRegistrationName],
  );

  const presentAthletes = useMemo(
    () => attendanceList
      .filter(a => a.status === 'present')
      .map(a => ({
        registrationId: a.registration.id,
        userName: getRegistrationName(a.registration),
        badges: a.badges,
      })),
    [attendanceList, getRegistrationName],
  );

  const presentCount = useMemo(
    () => attendanceList.filter(a => a.status === 'present').length,
    [attendanceList],
  );

  const absentCount = useMemo(
    () => attendanceList.filter(a => a.status === 'absent').length,
    [attendanceList],
  );

  const totalBadgesAwarded = useMemo(
    () => attendanceList.reduce((sum, a) => sum + a.badges.length, 0),
    [attendanceList],
  );

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
    shareNotesWithParents,
    setShareNotesWithParents,
    shareAttendance,
    setShareAttendance,

    // Step navigation
    currentStep,
    currentStepIndex,

    // Derived
    attendanceStepData,
    presentAthletes,
    presentCount,
    absentCount,
    totalBadgesAwarded,

    // Actions
    loadSession,
    updateAttendanceStatus,
    toggleBadge,
    goToNextStep,
    goToPrevStep,
    handleBackPress,
    handleComplete,
  } as const;
}
