/**
 * useBookingDetail — Data loading and handlers for the booking detail screen.
 *
 * Loads a BookingSummary by ID from mock data or apiClient storage.
 * Provides all action handlers (message, cancel, refund, reschedule, report).
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { apiClient } from '@/services/api-client';
import { upcomingBookings } from '@/constants/mock-data';
import { useAuth } from '@/hooks/use-auth';
import { useSessionNote } from '@/hooks/use-session-note';
import type { BookingSummary, Booking } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useBookingDetail');

export type BookingDetailStatus = 'loading' | 'not-found' | 'success';

export interface BookingDetailResult {
  booking: BookingSummary | undefined;
  status: BookingDetailStatus;
  isCoach: boolean;
  sessionNote: ReturnType<typeof useSessionNote>;
  handlers: {
    messageCoach: () => void;
    cancelBooking: () => void;
    refund: () => void;
    reschedule: () => void;
    reportProblem: () => void;
  };
  formatted: {
    weekday: string;
    dateStr: string;
    time: string;
    coachPhotoUrl: string;
  } | null;
}

export function useBookingDetail(id: string): BookingDetailResult {
  const { currentUser } = useAuth();
  const [booking, setBooking] = useState<BookingSummary | undefined>();
  const [status, setStatus] = useState<BookingDetailStatus>('loading');
  const isCoach = currentUser?.role === 'COACH';

  const sessionNote = useSessionNote(id);

  useEffect(() => {
    const loadBooking = async () => {
      logger.debug('Loading booking', { id });
      let foundBooking = upcomingBookings.find((b) => b.id === id);

      if (!foundBooking) {
        try {
          const sessionBookings = await apiClient.get<Booking[]>('session_bookings', []);
          const sessionBooking = sessionBookings.find((b) => b.id === id);
          if (sessionBooking) {
            foundBooking = {
              id: sessionBooking.id,
              coachName: sessionBooking.coachName ?? 'Coach',
              childName: sessionBooking.athleteName ?? 'Athlete',
              service: sessionBooking.service ?? 'Session',
              start: sessionBooking.scheduledAt,
              status: sessionBooking.status === 'CONFIRMED' ? 'Confirmed' : sessionBooking.status === 'PENDING' ? 'Pending' : 'Completed',
              locationLabel: sessionBooking.location,
              coach: { name: sessionBooking.coachName ?? 'Coach', photoUrl: 'https://i.pravatar.cc/100?u=' + sessionBooking.coachId },
              client: { name: sessionBooking.athleteName ?? 'Athlete', photoUrl: 'https://i.pravatar.cc/100?u=' + sessionBooking.athleteId },
              coachId: sessionBooking.coachId,
              clientId: sessionBooking.athleteId ?? '',
            };
          }
        } catch (error) {
          logger.error('Failed to load session bookings', error);
        }
      }

      setBooking(foundBooking);
      setStatus(foundBooking ? 'success' : 'not-found');
    };
    loadBooking();
  }, [id]);

  const handleMessageCoach = useCallback(() => {
    if (!booking) return;
    router.push(Routes.messagesWith({ coachId: booking.coachId }));
  }, [booking]);

  const handleCancelBooking = useCallback(() => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking? This action cannot be undone.', [
      { text: 'Keep Booking', style: 'cancel' },
      { text: 'Cancel Booking', style: 'destructive', onPress: () => { Alert.alert('Success', 'Booking cancelled successfully'); router.back(); } },
    ]);
  }, []);

  const handleRefund = useCallback(() => {
    Alert.alert('Issue Refund', 'Process a refund for this booking?', [
      { text: 'Back', style: 'cancel' },
      { text: 'Process Refund', onPress: () => Alert.alert('Success', 'Refund processed successfully') },
    ]);
  }, []);

  const handleReschedule = useCallback(() => {
    Alert.alert('Reschedule', 'Rescheduling not available');
  }, []);

  const handleReportProblem = useCallback(() => {
    router.push(Routes.BOOKINGS_REPORT_PROBLEM);
  }, []);

  // Pre-format date values for rendering
  const formatted = booking ? (() => {
    const date = new Date(booking.start);
    return {
      weekday: date.toLocaleDateString('en-GB', { weekday: 'long' }),
      dateStr: date.toLocaleDateString('en-GB', { month: 'long', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' }),
      coachPhotoUrl: booking.coach?.photoUrl || 'https://i.pravatar.cc/100',
    };
  })() : null;

  return {
    booking,
    status,
    isCoach,
    sessionNote,
    handlers: {
      messageCoach: handleMessageCoach,
      cancelBooking: handleCancelBooking,
      refund: handleRefund,
      reschedule: handleReschedule,
      reportProblem: handleReportProblem,
    },
    formatted,
  };
}
