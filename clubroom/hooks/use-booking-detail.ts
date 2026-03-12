/**
 * useBookingDetail — Data loading and handlers for the booking detail screen.
 *
 * Loads a BookingSummary by ID from mock data or apiClient storage.
 * Provides all action handlers (message, cancel, refund, reschedule, report).
 */

import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { apiClient } from '@/services/api-client';
import { bookingService } from '@/services/booking-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { useSessionNote } from '@/hooks/use-session-note';
import type { BookingSummary, Booking, RecurringBooking } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import type { ServiceError } from '@/types/result';
import { err, ok, serviceError } from '@/types/result';
import { getBookingAthleteName } from '@/utils/booking-display';
import { uiFeedback } from '@/services/ui-feedback';
import type { SessionFeedback } from '@/services/progress-service';
import { progressService } from '@/services/progress-service';
import { canCoachCompleteBooking } from '@/utils/booking-delivery';

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
  deliveryFeedback: SessionFeedback | null;
  handlers: {
    messageCoach: () => void;
    cancelBooking: () => void;
    refund: () => void;
    reschedule: () => void;
    reportProblem: () => void;
    rebook: () => void;
    manageRecurring: () => void;
    completeSession: () => void;
  };
  canCancelBooking: boolean;
  canCompleteSession: boolean;
  formatted: {
    weekday: string;
    dateStr: string;
    time: string;
    coachPhotoUrl: string;
  } | null;
}

const mapBookingStatus = (status: Booking['status']): BookingSummary['status'] => {
  if (status === 'CONFIRMED') return 'Confirmed';
  if (status === 'AWAITING_COMPLETION') return 'Needs Completion';
  if (status === 'PENDING' || status === 'AWAITING_CONFIRMATION') return 'Pending';
  if (status === 'COMPLETED') return 'Completed';
  if (status === 'CANCELLED') return 'Cancelled';
  return 'Pending';
};

const toBookingSummary = (
  booking: Booking,
  options?: {
    viewerUserId?: string;
    recurringSource?: RecurringBooking;
    userNameById?: Map<string, string>;
  },
): BookingSummary => {
  const viewerUserId = options?.viewerUserId;
  const recurringSource = options?.recurringSource;
  const userNameById = options?.userNameById;
  const resolveUserLabel = (userId?: string, fallback?: string) => {
    if (!userId) return fallback;
    return userNameById?.get(userId) || fallback || userId;
  };

  const ownerCoachId = booking.ownerCoachId ?? recurringSource?.ownerCoachId;
  const assigneeCoachId = booking.assigneeCoachId ?? recurringSource?.assigneeCoachId;
  const createdByUserId = booking.createdByUserId ?? recurringSource?.createdByUserId;
  const coachDisplayName = resolveUserLabel(booking.coachId, booking.coachName ?? 'Coach');
  const athleteId = booking.athleteId ?? booking.athleteIds?.[0] ?? '';
  const athleteName = getBookingAthleteName(booking);
  const isSelfBooking = Boolean(viewerUserId && athleteId && athleteId === viewerUserId);
  const audienceLabel = isSelfBooking ? 'You' : athleteName;

  return {
    id: booking.id,
    service: booking.service ?? 'Session',
    price: booking.price,
    recurringBookingId: booking.recurringBookingId,
    sessionSource: booking.sessionSource,
    sessionSourceEntityId: booking.sessionSourceEntityId,
    start: booking.scheduledAt,
    status: mapBookingStatus(booking.status),
    locationLabel: booking.location,
    createdAt: booking.createdAt,
    clubId: booking.clubId ?? recurringSource?.clubId,
    actingAs: booking.actingAs ?? recurringSource?.actingAs,
    commercialMode: booking.commercialMode ?? recurringSource?.commercialMode,
    ownerCoachId,
    ownerCoachName: resolveUserLabel(ownerCoachId, booking.coachName),
    assigneeCoachId,
    assigneeCoachName: resolveUserLabel(assigneeCoachId),
    createdByUserId,
    createdByName: resolveUserLabel(createdByUserId, booking.bookedByName),
    createdByRole: booking.createdByRole ?? recurringSource?.createdByRole,
    coach: {
      name: coachDisplayName ?? 'Coach',
      photoUrl: `https://i.pravatar.cc/100?u=${booking.coachId}`,
    },
    client: {
      name: audienceLabel,
      photoUrl: `https://i.pravatar.cc/100?u=${booking.athleteId ?? 'athlete'}`,
    },
    coachId: booking.coachId,
    clientId: athleteId,
    bookedById: booking.bookedById,
    bookedByName: booking.bookedByName,
    audienceLabel,
  };
};

export function useBookingDetail(id: string): BookingDetailResult {
  const { currentUser } = useAuth();
  const isCoach = currentUser?.role === 'COACH';

  const sessionNote = useSessionNote(id);

  const [deliveryFeedback, setDeliveryFeedback] = useState<SessionFeedback | null>(null);

  const loadBooking = useCallback(async () => {
    logger.debug('Loading booking', { id });

    try {
      const [serviceBooking, sessionBookings, recurringBookings, users] = await Promise.all([
        bookingService.getBooking(id),
        apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []),
        apiClient.get<RecurringBooking[]>(STORAGE_KEYS.RECURRING_BOOKINGS, []),
        apiClient.get<{ id: string; name?: string; fullName?: string }[]>(STORAGE_KEYS.USERS, []),
      ]);
      const userNameById = new Map(
        users.map((user) => [user.id, user.fullName?.trim() || user.name?.trim() || user.id]),
      );
      const recurringById = new Map(recurringBookings.map((entry) => [entry.id, entry]));

      const booking = serviceBooking ?? sessionBookings.find((entry) => entry.id === id) ?? null;
      if (booking) {
        const recurringSource = booking.recurringBookingId
          ? recurringById.get(booking.recurringBookingId)
          : undefined;
        const feedback = await progressService.getSessionFeedback(
          booking.id,
          isCoach ? 'coach' : 'parent',
        );
        setDeliveryFeedback(feedback);
        return ok<BookingSummary | null>(
          toBookingSummary(booking, { viewerUserId: currentUser?.id, recurringSource, userNameById }),
        );
      }

      setDeliveryFeedback(null);
      return ok<BookingSummary | null>(null);
    } catch (loadError) {
      logger.error('Failed to load booking', loadError);
      setDeliveryFeedback(null);
      return err(serviceError('UNKNOWN', 'Failed to load booking details.', loadError));
    }
  }, [currentUser?.id, id, isCoach]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<BookingSummary | null>({
    load: loadBooking,
    deps: [id],
    isEmpty: (value) => value === null,
    refetchOnFocus: true,
  });

  const booking = data ?? undefined;
  const bookingStartMs = booking ? new Date(booking.start).getTime() : Number.NaN;
  const isFutureBooking = Number.isFinite(bookingStartMs) ? bookingStartMs > Date.now() : false;
  const hoursUntilBooking = Number.isFinite(bookingStartMs)
    ? (bookingStartMs - Date.now()) / (1000 * 60 * 60)
    : Number.NaN;
  const canCancelBooking =
    !!booking &&
    isFutureBooking &&
    hoursUntilBooking > 24 &&
    booking.status !== 'Cancelled' &&
    booking.status !== 'Completed' &&
    booking.status !== 'Needs Completion';
  const canCompleteSession =
    isCoach &&
    canCoachCompleteBooking({
      status: booking?.status,
      start: booking?.start,
    });

  const handleMessageCoach = useCallback(() => {
    if (!booking) return;
    router.push(Routes.messagesWith({ coachId: booking.coachId }));
  }, [booking]);

  const handleCancelBooking = useCallback(() => {
    if (!booking) return;
    if (!canCancelBooking) {
      uiFeedback.showToast('Only upcoming bookings can be cancelled. Past or completed sessions cannot be cancelled.');
      return;
    }
    router.push(Routes.bookingCancel(booking.id, isCoach ? 'coach' : 'parent'));
  }, [booking, canCancelBooking, isCoach]);

  const handleRefund = useCallback(() => {
    uiFeedback.alert(
      'Handle Billing Issue',
      'Clubroom does not process refunds in-app. Resolve any refund or payment adjustment directly with the family and update your reconciler once it is settled.',
      [{ text: 'OK' }],
    );
  }, []);

  const handleReschedule = useCallback(() => {
    if (!booking) return;
    const openChat = () => {
      if (isCoach) {
        router.push(Routes.MESSAGES);
        return;
      }
      router.push(Routes.messagesWith({ coachId: booking.coachId }));
    };

    uiFeedback.showToast(
      'Reschedule proposals are removed. Opening chat to agree a new session time.',
      'warning',
    );
    openChat();
  }, [booking, isCoach]);

  const handleReportProblem = useCallback(() => {
    if (booking?.id) {
      router.push(Routes.bookingsReportProblem({ bookingId: booking.id }));
      return;
    }
    router.push(Routes.BOOKINGS_REPORT_PROBLEM);
  }, [booking?.id]);

  const handleRebook = useCallback(() => {
    if (!booking?.coachId) return;
    router.push(Routes.bookSchedule(booking.coachId));
  }, [booking?.coachId]);

  const handleManageRecurring = useCallback(() => {
    if (!booking?.recurringBookingId) return;
    router.push(Routes.familyRecurring({ recurringId: booking.recurringBookingId }));
  }, [booking?.recurringBookingId]);

  const handleCompleteSession = useCallback(() => {
    if (!booking?.id || !canCompleteSession) return;
    router.push(Routes.sessionComplete(booking.id));
  }, [booking?.id, canCompleteSession]);

  // Pre-format date values for rendering
  const formatted = booking
    ? (() => {
        const date = new Date(booking.start);
        return {
          weekday: date.toLocaleDateString('en-GB', { weekday: 'long' }),
          dateStr: date.toLocaleDateString('en-GB', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
          time: date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' }),
          coachPhotoUrl: booking.coach?.photoUrl || 'https://i.pravatar.cc/100',
        };
      })()
    : null;

  return {
    booking,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    isCoach,
    sessionNote,
    deliveryFeedback,
    handlers: {
      messageCoach: handleMessageCoach,
      cancelBooking: handleCancelBooking,
      refund: handleRefund,
      reschedule: handleReschedule,
      reportProblem: handleReportProblem,
      rebook: handleRebook,
      manageRecurring: handleManageRecurring,
      completeSession: handleCompleteSession,
    },
    canCancelBooking,
    canCompleteSession,
    formatted,
  };
}
