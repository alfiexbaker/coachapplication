/**
 * useInviteSessionFlow — Multi-step invite flow state management.
 */
import { useState, useEffect, startTransition } from 'react';

import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import * as Haptics from 'expo-haptics';
import { apiClient } from '@/services/api-client';
import { api } from '@/constants/config';
import { groupSessionService } from '@/services/group-session-service';
import { inviteService } from '@/services/invite';
import { createLogger } from '@/utils/logger';
import type { Athlete } from '@/hooks/use-invite-athletes';
import { uiFeedback } from '@/services/ui-feedback';
import type { GroupSession, TimeSlot } from '@/constants/types';

const logger = createLogger('InviteSessionFlow');

export type FlowStep = 'choice' | 'select-session' | 'select-athletes' | 'confirm';

export interface UpcomingSession {
  id: string;
  title: string;
  scheduledAt: string;
  location?: string;
  duration?: number;
  maxAthletes?: number;
  currentAthletes?: number;
  athleteIds?: string[];
  coachId?: string;
  coachName?: string;
  focus?: string;
  price?: number;
  slot?: TimeSlot;
}

interface UseInviteSessionFlowProps {
  visible: boolean;
  coachId: string;
  onClose: () => void;
  onComplete?: (result: { sessionId: string; athleteIds: string[]; isNew: boolean }) => void;
}

function toIsoStart(date: string, time: string): string {
  return `${date}T${time}:00`;
}

function durationMinutes(slot: TimeSlot): number | undefined {
  const start = new Date(toIsoStart(slot.date, slot.startTime)).getTime();
  const end = new Date(toIsoStart(slot.date, slot.endTime)).getTime();
  const diff = Math.round((end - start) / 60000);
  return Number.isFinite(diff) && diff > 0 ? diff : undefined;
}

function sessionFocusLabel(session: GroupSession): string {
  const focus = (session.focus ?? [])
    .map((item) => String(item).trim())
    .filter(Boolean)
    .join(', ');
  return focus || session.description?.trim() || session.title.trim();
}

function mapGroupSessionToUpcoming(session: GroupSession): UpcomingSession | null {
  const now = new Date();
  const slot = (session.schedule ?? []).reduce<(TimeSlot & { scheduledAt: string }) | null>(
    (earliest, item) => {
      const candidate = {
        ...item,
        location: session.location,
        scheduledAt: toIsoStart(item.date, item.startTime),
      };
      if (new Date(candidate.scheduledAt) <= now) {
        return earliest;
      }
      if (!earliest) {
        return candidate;
      }
      return new Date(candidate.scheduledAt).getTime() < new Date(earliest.scheduledAt).getTime()
        ? candidate
        : earliest;
    },
    null,
  );
  if (!slot) {
    return null;
  }
  return {
    id: session.id,
    title: session.title,
    scheduledAt: slot.scheduledAt,
    location: session.location,
    duration: durationMinutes(slot),
    maxAthletes: session.maxParticipants,
    currentAthletes: session.currentParticipants,
    coachId: session.coachId,
    coachName: session.createdByName,
    focus: sessionFocusLabel(session),
    price: session.pricePerParticipant,
    slot,
  };
}

function groupAthletesByParent(athletes: Athlete[]): Athlete[][] {
  return Object.values(
    athletes.reduce<Record<string, Athlete[]>>((acc, athlete) => {
      if (!acc[athlete.parentId]) {
        acc[athlete.parentId] = [];
      }
      acc[athlete.parentId].push(athlete);
      return acc;
    }, {}),
  );
}

export function useInviteSessionFlow({
  visible,
  coachId,
  onClose,
  onComplete,
}: UseInviteSessionFlowProps) {
  const [step, setStep] = useState<FlowStep>('choice');
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<UpcomingSession | null>(null);
  const [selectedAthletes, setSelectedAthletes] = useState<Athlete[]>([]);
  const [isNewSession, setIsNewSession] = useState(false);

  useEffect(() => {
    const loadUpcomingSessions = async () => {
      try {
        if (!api.useMock) {
          const sessions = await groupSessionService.getCoachSessions(coachId);
          setUpcomingSessions(
            sessions
              .filter((session) => session.status === 'PUBLISHED')
              .flatMap((session) => {
                const mapped = mapGroupSessionToUpcoming(session);
                return mapped ? [mapped] : [];
              })
              .sort(
                (left, right) =>
                  new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime(),
              )
              .slice(0, 10),
          );
          return;
        }
        const bookings = await apiClient.get<UpcomingSession[]>('coach_bookings', []);
        const now = new Date();
        setUpcomingSessions(
          bookings
            .filter((booking) => new Date(booking.scheduledAt) > now && booking.coachId === coachId)
            .sort(
              (left, right) =>
                new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime(),
            )
            .slice(0, 10),
        );
      } catch (error) {
        logger.error('Failed to load upcoming sessions', error);
      }
    };

    if (visible)
      startTransition(() => {
        void loadUpcomingSessions();
      });
  }, [visible, coachId]);

  const handleChoiceSelect = (choice: 'existing' | 'new') => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    logger.action('InviteChoiceSelected', { choice });
    if (choice === 'new') {
      setIsNewSession(true);
      setStep('select-athletes');
      return;
    }
    setIsNewSession(false);
    if (upcomingSessions.length === 0) {
      uiFeedback.showToast(
        'No upcoming sessions found. Starting new session invite flow.',
        'warning',
      );
      setIsNewSession(true);
      setStep('select-athletes');
    } else {
      setStep('select-session');
    }
  };

  const handleSessionSelect = (session: UpcomingSession) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSession(session);
    setStep('select-athletes');
    logger.action('SessionSelected', { sessionId: session.id });
  };

  const handleAthletesSelected = (selected: Athlete[]) => {
    setSelectedAthletes(selected);
    if (isNewSession) {
      onClose();
      router.push(
        Routes.sessionsCreateWith({
          athleteIds: selected.map((a) => a.id).join(','),
          athleteNames: selected.map((a) => a.name).join(','),
        }),
      );
      logger.action('NavigateToCreateSession', { athleteCount: selected.length });
    } else if (selectedSession) {
      setStep('confirm');
    }
  };

  const handleConfirm = async () => {
    if (!selectedSession || selectedAthletes.length === 0) return;
    logger.action('InviteConfirmed', {
      sessionId: selectedSession.id,
      athleteCount: selectedAthletes.length,
    });
    try {
      if (!api.useMock) {
        const slot = selectedSession.slot;
        if (!slot) {
          uiFeedback.showToast(
            'This session is missing a bookable slot. Try creating a new invite.',
            'error',
          );
          return;
        }
        const coachName = selectedSession.coachName?.trim();
        const focus = selectedSession.focus?.trim();
        if (!coachName || !focus) {
          uiFeedback.showToast(
            'This session is missing invite details from the API. Try creating a new invite.',
            'error',
          );
          return;
        }
        const results = await Promise.all(
          groupAthletesByParent(selectedAthletes).map(async (athletesForParent) => {
            const parentId = athletesForParent[0]?.parentId;
            const parentName = athletesForParent[0]?.parentName?.trim();
            if (!parentId || !parentName) {
              return { sent: 0, failed: athletesForParent.length };
            }
            const result = await inviteService.createInvite(
              athletesForParent.map((athlete) => athlete.id),
              {
                coachId,
                coachName,
                parentId,
                parentName,
                athleteNames: athletesForParent.map((athlete) => athlete.name),
                inviteType: 'CLOSED',
                proposedSlots: [slot],
                sessionType: selectedSession.title,
                focus,
                notes: `You're invited to join "${selectedSession.title}".`,
                ...(typeof selectedSession.price === 'number'
                  ? { price: selectedSession.price }
                  : {}),
                duration: selectedSession.duration,
                expiresInDays: 7,
                existingSessionId: selectedSession.id,
              },
            );
            return result.success
              ? { sent: athletesForParent.length, failed: 0 }
              : { sent: 0, failed: athletesForParent.length };
          }),
        );
        const sentCount = results.reduce((total, item) => total + item.sent, 0);
        const failedCount = results.reduce((total, item) => total + item.failed, 0);
        if (sentCount === 0) {
          uiFeedback.showToast('Failed to send invites. Please try again.', 'error');
          return;
        }
        void Haptics.notificationAsync(
          failedCount > 0
            ? Haptics.NotificationFeedbackType.Warning
            : Haptics.NotificationFeedbackType.Success,
        );
        onComplete?.({
          sessionId: selectedSession.id,
          athleteIds: selectedAthletes.map((a) => a.id),
          isNew: false,
        });
        uiFeedback.showToast(
          failedCount > 0
            ? `${sentCount} invite(s) sent, ${failedCount} failed.`
            : `${sentCount} invite(s) sent successfully.`,
          failedCount > 0 ? 'warning' : undefined,
        );
        handleClose();
        return;
      }
      const bookings = await apiClient.get<UpcomingSession[]>('coach_bookings', []);
      const updatedBookings = bookings.map((b) => {
        if (b.id === selectedSession.id) {
          const existingIds = b.athleteIds || [];
          const newIds = selectedAthletes.map((a) => a.id);
          const addedIds = newIds.filter((id) => !existingIds.includes(id));
          return {
            ...b,
            athleteIds: [...new Set([...existingIds, ...newIds])],
            currentAthletes: (b.currentAthletes || 0) + addedIds.length,
          };
        }
        return b;
      });
      await apiClient.set('coach_bookings', updatedBookings);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete?.({
        sessionId: selectedSession.id,
        athleteIds: selectedAthletes.map((a) => a.id),
        isNew: false,
      });
      uiFeedback.showToast(
        `${selectedAthletes.length} athlete${selectedAthletes.length !== 1 ? 's' : ''} added to ${selectedSession.title || 'session'}.`,
      );
      handleClose();
    } catch (error) {
      logger.error('Failed to add athletes to session', error);
      uiFeedback.showToast('Failed to add athletes. Please try again.', 'error');
    }
  };

  const handleClose = () => {
    setStep('choice');
    setSelectedSession(null);
    setSelectedAthletes([]);
    setIsNewSession(false);
    onClose();
  };

  const handleBack = () => {
    if (step === 'confirm') setStep('select-athletes');
    else if (step === 'select-athletes') setStep(isNewSession ? 'choice' : 'select-session');
    else if (step === 'select-session') setStep('choice');
  };

  return {
    step,
    upcomingSessions,
    selectedSession,
    selectedAthletes,
    isNewSession,
    handleChoiceSelect,
    handleSessionSelect,
    handleAthletesSelected,
    handleConfirm,
    handleClose,
    handleBack,
  };
}

export function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });
  const dateFormatted = date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  const time = date.toLocaleTimeString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return { dayName, date: dateFormatted, time };
}
