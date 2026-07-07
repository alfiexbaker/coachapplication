import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { apiClient } from '@/services/api-client';
import { bookingService } from '@/services/booking-service';

import { ErrorState, LoadingState } from '@/components/ui/screen-states';
import { FootballObjective, Booking } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('SessionFeedbackScreen');

export default function SessionFeedbackScreen() {
  const { colors: palette } = useTheme();
  const params = useLocalSearchParams();
  const { currentUser } = useAuth();
  const isCreatingRef = useRef(false);

  // Get athlete's objectives from params
  const athleteObjectivesParam = params.athleteObjectives as string;
  const athleteObjectives: FootballObjective[] = useMemo(() => {
    if (!athleteObjectivesParam) return [];
    try {
      return JSON.parse(athleteObjectivesParam) as FootballObjective[];
    } catch {
      logger.error('Failed to parse athleteObjectives param');
      return [];
    }
  }, [athleteObjectivesParam]);
  const athleteName = (params.athleteName as string) || 'the athlete';
  const athleteId = params.athleteId as string;
  const bookingId = params.bookingId as string;
  const missingBookingId = !bookingId;

  // API mode uses backend booking/note authority; mock mode keeps the legacy local session bridge.
  useEffect(() => {
    if (missingBookingId) return;

    const prepareFeedbackAndNavigate = async () => {
      if (isCreatingRef.current) return;
      isCreatingRef.current = true;

      try {
        if (!apiClient.isMockMode) {
          if (!bookingId) {
            logger.error('Missing booking id for session feedback');
            uiFeedback.showToast('Choose a completed booking before opening session feedback.', 'error');
            router.back();
            return;
          }

          const booking = await bookingService.getBooking(bookingId);
          if (!booking) {
            logger.error('Booking not found for session feedback', { bookingId });
            uiFeedback.showToast('Booking not found for session feedback.', 'error');
            router.back();
            return;
          }

          if (booking.status !== 'COMPLETED') {
            const updateResult = await bookingService.updateBooking(bookingId, {
              status: 'COMPLETED',
            });
            if (!updateResult.success) {
              logger.error('Failed to mark booking completed before session feedback', {
                bookingId,
                error: updateResult.error,
              });
              uiFeedback.showToast(updateResult.error.message, 'error');
              router.back();
              return;
            }
          }

          logger.success('Booking session feedback ready', {
            bookingId,
            athleteId,
          });
          router.replace(Routes.sessionNotes(bookingId));
          return;
        }

        // Create minimal session record
        const sessionId = `session-${Date.now()}`;
        const sessionRecord = {
          id: sessionId,
          athleteId,
          athleteName,
          coachId: currentUser?.id,
          bookingId,
          completedAt: new Date().toISOString(),
          performanceRating: 3, // Default, coach will update
          skillsWorkedOn: athleteObjectives, // Pre-populate with booking objectives
          notes: '',
          videoUrls: [],
          imageUrls: [],
          attendance: 'ATTENDED',
        };

        // Save to storage
        const sessions = await apiClient.get<Record<string, unknown>[]>('coach_sessions', []);
        sessions.push(sessionRecord);
        await apiClient.set('coach_sessions', sessions);

        logger.success('Session created', {
          sessionId,
          athleteId,
          prePopulatedSkills: athleteObjectives.length,
        });

        // Update booking status
        const bookings = await apiClient.get<Booking[]>('session_bookings', []);
        if (bookings.length > 0) {
          const updatedBookings = bookings.map((booking) =>
            booking.id === bookingId ? { ...booking, status: 'COMPLETED', sessionId } : booking,
          );
          await apiClient.set('session_bookings', updatedBookings);
        }

        // Navigate to session detail screen to add notes/media
        router.replace(Routes.developmentSession(sessionId));
      } catch (error) {
        logger.error('Failed to prepare session feedback', error);
        uiFeedback.showToast('Failed to open session feedback. Please try again.', 'error');
        router.back();
      }
    };

    prepareFeedbackAndNavigate();
  }, [athleteId, athleteName, currentUser, bookingId, athleteObjectives, missingBookingId]);

  if (missingBookingId) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <ErrorState
          message="Choose a completed booking before opening session feedback."
          onRetry={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <LoadingState variant="detail" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
