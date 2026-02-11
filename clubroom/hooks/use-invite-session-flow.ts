/**
 * useInviteSessionFlow — Multi-step invite flow state management.
 */
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import * as Haptics from 'expo-haptics';
import { apiClient } from '@/services/api-client';
import { createLogger } from '@/utils/logger';
import type { Athlete } from '@/hooks/use-invite-athletes';

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
}

interface UseInviteSessionFlowProps {
  visible: boolean;
  coachId: string;
  onClose: () => void;
  onComplete?: (result: { sessionId: string; athleteIds: string[]; isNew: boolean }) => void;
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

  const loadUpcomingSessions = useCallback(async () => {
    try {
      const bookings = await apiClient.get<UpcomingSession[]>('coach_bookings', []);
      const now = new Date();
      setUpcomingSessions(
        bookings
          .filter((b) => new Date(b.scheduledAt) > now && b.coachId === coachId)
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
          .slice(0, 10),
      );
    } catch (error) {
      logger.error('Failed to load upcoming sessions', error);
    }
  }, [coachId]);

  useEffect(() => {
    if (visible) loadUpcomingSessions();
  }, [visible, loadUpcomingSessions]);

  const handleChoiceSelect = useCallback(
    (choice: 'existing' | 'new') => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      logger.action('InviteChoiceSelected', { choice });
      if (choice === 'new') {
        setIsNewSession(true);
        setStep('select-athletes');
        return;
      }
      setIsNewSession(false);
      if (upcomingSessions.length === 0) {
        Alert.alert(
          'No Upcoming Sessions',
          "You don't have any upcoming sessions. Would you like to create a new one?",
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Create New',
              onPress: () => {
                setIsNewSession(true);
                setStep('select-athletes');
              },
            },
          ],
        );
      } else {
        setStep('select-session');
      }
    },
    [upcomingSessions.length],
  );

  const handleSessionSelect = useCallback((session: UpcomingSession) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSession(session);
    setStep('select-athletes');
    logger.action('SessionSelected', { sessionId: session.id });
  }, []);

  const handleAthletesSelected = useCallback(
    (selected: Athlete[]) => {
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
    },
    [isNewSession, selectedSession, onClose],
  );

  const handleConfirm = useCallback(async () => {
    if (!selectedSession || selectedAthletes.length === 0) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    logger.action('InviteConfirmed', {
      sessionId: selectedSession.id,
      athleteCount: selectedAthletes.length,
    });
    try {
      const bookings = await apiClient.get<UpcomingSession[]>('coach_bookings', []);
      const updatedBookings = bookings.map((b) => {
        if (b.id === selectedSession.id) {
          const existingIds = b.athleteIds || [];
          const newIds = selectedAthletes.map((a) => a.id);
          return {
            ...b,
            athleteIds: [...new Set([...existingIds, ...newIds])],
            currentAthletes: (b.currentAthletes || 0) + selectedAthletes.length,
          };
        }
        return b;
      });
      await apiClient.set('coach_bookings', updatedBookings);
      onComplete?.({
        sessionId: selectedSession.id,
        athleteIds: selectedAthletes.map((a) => a.id),
        isNew: false,
      });
      Alert.alert(
        'Athletes Invited',
        `${selectedAthletes.length} athlete${selectedAthletes.length !== 1 ? 's' : ''} added to ${selectedSession.title || 'session'}.`,
      );
      handleClose();
    } catch (error) {
      logger.error('Failed to add athletes to session', error);
      Alert.alert('Error', 'Failed to add athletes. Please try again.');
    }
  }, [selectedSession, selectedAthletes, onComplete]);

  const handleClose = useCallback(() => {
    setStep('choice');
    setSelectedSession(null);
    setSelectedAthletes([]);
    setIsNewSession(false);
    onClose();
  }, [onClose]);

  const handleBack = useCallback(() => {
    if (step === 'confirm') setStep('select-athletes');
    else if (step === 'select-athletes') setStep(isNewSession ? 'choice' : 'select-session');
    else if (step === 'select-session') setStep('choice');
  }, [step, isNewSession]);

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
