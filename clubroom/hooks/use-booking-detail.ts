/**
 * useBookingDetail — Data loading and handlers for the booking detail screen.
 *
 * Loads a BookingSummary by ID from mock data or apiClient storage.
 * Provides all action handlers (message, cancel, refund, reschedule, report).
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { apiClient } from '@/services/api-client';
import { bookingService } from '@/services/booking-service';
import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { useSessionNote } from '@/hooks/use-session-note';
import type { BookingSummary, Booking } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import type { ServiceError } from '@/types/result';
import { err, ok, serviceError } from '@/types/result';
import { getBookingAthleteName } from '@/utils/booking-display';

const logger = createLogger('useBookingDetail');

export type BookingDetailStatus = ScreenStatus;

export interface BookingDetailResult {
  booking: BookingSummary | undefined;
  status: BookingDetailStatus;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
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

const mapBookingStatus = (status: Booking['status']): BookingSummary['status'] => {
  if (status === 'CONFIRMED') return 'Confirmed';
  if (status === 'PENDING' || status === 'AWAITING_CONFIRMATION') return 'Pending';
  return 'Completed';
};

const toBookingSummary = (booking: Booking): BookingSummary => ({
  id: booking.id,
  service: booking.service ?? 'Session',
  start: booking.scheduledAt,
  status: mapBookingStatus(booking.status),
  locationLabel: booking.location,
  coach: {
    name: booking.coachName,
    photoUrl: `https://i.pravatar.cc/100?u=${booking.coachId}`,
  },
  client: {
    name: getBookingAthleteName(booking),
    photoUrl: `https://i.pravatar.cc/100?u=${booking.athleteId ?? 'athlete'}`,
  },
  coachId: booking.coachId,
  clientId: booking.athleteId ?? booking.athleteIds?.[0] ?? '',
});

export function useBookingDetail(id: string): BookingDetailResult {
  const { currentUser } = useAuth();
  const isCoach = currentUser?.role === 'COACH';

  const sessionNote = useSessionNote(id);

  const loadBooking = useCallback(async () => {
    logger.debug('Loading booking', { id });

    try {
      const booking = await bookingService.getBooking(id);
      if (booking) {
        return ok<BookingSummary | null>(toBookingSummary(booking));
      }

      const sessionBookings = await apiClient.get<Booking[]>('session_bookings', []);
      const sessionBooking = sessionBookings.find((entry) => entry.id === id);
      if (sessionBooking) {
        return ok<BookingSummary | null>(toBookingSummary(sessionBooking));
      }

      return ok<BookingSummary | null>(null);
    } catch (loadError) {
      logger.error('Failed to load booking', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load booking details.', loadError));
    }
  }, [id]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<BookingSummary | null>({
    load: loadBooking,
    deps: [id],
    isEmpty: (value) => value === null,
    refetchOnFocus: true,
  });

  const booking = data ?? undefined;

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
    error,
    refreshing,
    onRefresh,
    retry,
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
