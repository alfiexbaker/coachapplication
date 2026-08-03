/**
 * useBookingDetail — Data loading and handlers for the booking detail screen.
 *
 * Loads a BookingSummary by ID from booking service authority.
 * Provides all action handlers (message, cancel, reopen, refund, report).
 */

import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { bookingService } from '@/services/booking-service';
import { recurringBookingService } from '@/services/recurring-booking-service';
import { userService } from '@/services/user-service';
import { useAuth } from '@/hooks/use-auth';
import { useBookingFlow } from '@/context/booking-flow-context';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { useSessionNote } from '@/hooks/use-session-note';
import type { BookingSummary, Booking, RecurringBooking } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import type { ServiceError } from '@/types/result';
import { err, ok, serviceError } from '@/types/result';
import {
  getBookingAthleteName,
  getBookingServiceLabel,
  safeDisplayLabel,
} from '@/utils/booking-display';
import { uiFeedback } from '@/services/ui-feedback';
import type { SessionFeedback } from '@/services/progress-service';
import { progressService } from '@/services/progress-service';
import { canCoachCompleteBooking } from '@/utils/booking-delivery';
import { buildAuthScopedSnapshotKey } from '@/utils/auth-scoped-snapshot-key';
import { accountIdsMatch } from '@/utils/account-id';

const logger = createLogger('useBookingDetail');
const bookingDetailSnapshots = new Map<string, BookingSummary>();

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
    reopenBooking: () => void;
    reportProblem: () => void;
    rebook: () => void;
    manageRecurring: () => void;
    confirmBooking: () => void;
    declineRequest: () => void;
    withdrawRequest: () => void;
    completeSession: () => void;
  };
  canCancelBooking: boolean;
  canReopenBooking: boolean;
  canConfirmBooking: boolean;
  isConfirmingBooking: boolean;
  canDeclineRequest: boolean;
  canWithdrawRequest: boolean;
  isResolvingRequest: boolean;
  canCompleteSession: boolean;
  formatted: {
    weekday: string;
    dateStr: string;
    time: string;
    coachPhotoUrl?: string;
  } | null;
}

const mapBookingStatus = (status: Booking['status']): BookingSummary['status'] => {
  if (status === 'CONFIRMED') return 'Confirmed';
  if (status === 'AWAITING_COMPLETION') return 'Needs Completion';
  if (status === 'PENDING' || status === 'AWAITING_CONFIRMATION') return 'Pending';
  if (status === 'COMPLETED') return 'Completed';
  if (status === 'CANCELLED') return 'Cancelled';
  if (status === 'DECLINED') return 'Declined';
  if (status === 'WITHDRAWN') return 'Withdrawn';
  if (status === 'EXPIRED') return 'Expired';
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
    const explicitLabel = userId ? userNameById?.get(userId) : undefined;
    return safeDisplayLabel(explicitLabel || fallback || userId, 'User');
  };

  const ownerCoachId = booking.ownerCoachId ?? recurringSource?.ownerCoachId;
  const assigneeCoachId = booking.assigneeCoachId ?? recurringSource?.assigneeCoachId;
  const createdByUserId = booking.createdByUserId ?? recurringSource?.createdByUserId;
  const coachDisplayName = resolveUserLabel(booking.coachId, booking.coachName ?? 'Coach');
  const athleteId = booking.athleteId ?? booking.athleteIds?.[0] ?? '';
  const athleteName = getBookingAthleteName(booking);
  const isSelfBooking = Boolean(viewerUserId && athleteId && athleteId === viewerUserId);
  const participants = booking.participants ?? [];
  const isGuardianForEveryParticipant = Boolean(
    viewerUserId &&
    participants.length > 0 &&
    participants.every(
      (participant) =>
        participant.guardianUserId && accountIdsMatch(viewerUserId, participant.guardianUserId),
    ),
  );
  const canWithdrawRequest = Boolean(
    viewerUserId &&
    ((booking.bookedById && accountIdsMatch(viewerUserId, booking.bookedById)) ||
      isGuardianForEveryParticipant),
  );
  const audienceLabel = isSelfBooking ? 'You' : athleteName;

  return {
    id: booking.id,
    service: getBookingServiceLabel(booking),
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
      photoUrl: '',
    },
    client: {
      name: audienceLabel,
      photoUrl: '',
    },
    coachId: booking.coachId,
    clientId: athleteId,
    bookedById: booking.bookedById,
    bookedByName: booking.bookedByName,
    audienceLabel,
    version: booking.version,
    requestExpiresAt: booking.requestExpiresAt,
    requestResolvedAt: booking.requestResolvedAt,
    requestResolutionReason: booking.requestResolutionReason,
    canWithdrawRequest,
  };
};

async function resolveRecurringSource(booking: Booking): Promise<RecurringBooking | undefined> {
  if (!booking.recurringBookingId) {
    return undefined;
  }

  const result = await recurringBookingService.getById(booking.recurringBookingId);
  if (!result.success) {
    logger.warn('Failed to resolve recurring source for booking detail', {
      bookingId: booking.id,
      recurringBookingId: booking.recurringBookingId,
      error: result.error,
    });
    return undefined;
  }
  return result.data;
}

async function resolveBookingUserNames(
  booking: Booking,
  recurringSource?: RecurringBooking,
): Promise<Map<string, string>> {
  const userIds = Array.from(
    new Set(
      [
        booking.coachId,
        booking.bookedById,
        booking.ownerCoachId,
        booking.assigneeCoachId,
        booking.createdByUserId,
        recurringSource?.coachId,
        recurringSource?.userId,
        recurringSource?.ownerCoachId,
        recurringSource?.assigneeCoachId,
        recurringSource?.createdByUserId,
      ].flatMap((userId) => (userId ? [userId] : [])),
    ),
  );

  if (userIds.length === 0) {
    return new Map();
  }

  const result = await userService.getUsersByIds(userIds);
  if (!result.success) {
    logger.warn('Failed to resolve booking detail user names', {
      bookingId: booking.id,
      userIds,
      error: result.error,
    });
    return new Map();
  }

  return new Map(result.data.map((user) => [user.id, user.name?.trim() || user.id]));
}

function isServiceError(value: unknown): value is ServiceError {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'code' in value &&
    typeof (value as { code?: unknown }).code === 'string' &&
    'message' in value &&
    typeof (value as { message?: unknown }).message === 'string',
  );
}

export function useBookingDetail(id?: string): BookingDetailResult {
  const { currentUser } = useAuth();
  const { reset: resetBookingDraft, updateDraft } = useBookingFlow();
  const isCoach = currentUser?.role === 'COACH';
  const snapshotKey = buildAuthScopedSnapshotKey(currentUser?.id, 'booking-detail', id);

  const [deliveryFeedback, setDeliveryFeedback] = useState<SessionFeedback | null>(null);
  const [isConfirmingBooking, setIsConfirmingBooking] = useState(false);
  const [isResolvingRequest, setIsResolvingRequest] = useState(false);

  const loadBooking = async () => {
    if (!id) {
      setDeliveryFeedback(null);
      return ok<BookingSummary | null>(null);
    }
    logger.debug('Loading booking', { id });

    try {
      const booking = await bookingService.getBooking(id);
      if (booking) {
        const recurringSource = await resolveRecurringSource(booking);
        const userNameById = await resolveBookingUserNames(booking, recurringSource);
        const feedback =
          booking.status === 'COMPLETED'
            ? await progressService.getSessionFeedback(booking.id, isCoach ? 'coach' : 'parent')
            : null;
        setDeliveryFeedback(feedback);
        return ok<BookingSummary | null>(
          toBookingSummary(booking, {
            viewerUserId: currentUser?.id,
            recurringSource,
            userNameById,
          }),
        );
      }

      setDeliveryFeedback(null);
      return ok<BookingSummary | null>(null);
    } catch (loadError) {
      if (
        isServiceError(loadError) &&
        (loadError.code === 'UNAUTHORIZED' || loadError.code === 'NOT_FOUND')
      ) {
        logger.warn('Booking detail is unavailable to the current actor', {
          bookingId: id,
          code: loadError.code,
        });
      } else {
        logger.error('Failed to load booking', loadError);
      }
      setDeliveryFeedback(null);
      return err(
        isServiceError(loadError)
          ? loadError
          : serviceError('UNKNOWN', 'Failed to load booking details.', loadError),
      );
    }
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<BookingSummary | null>({
    load: loadBooking,
    deps: [id, currentUser?.id, currentUser?.role],
    isEmpty: (value) => value === null,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
  });

  useEffect(() => {
    if (data && snapshotKey) {
      bookingDetailSnapshots.set(snapshotKey, data);
    }
  }, [data, snapshotKey]);

  const booking =
    data ??
    (status === 'loading' && snapshotKey ? bookingDetailSnapshots.get(snapshotKey) : undefined) ??
    undefined;
  const [nowMs] = useState(() => Date.now());
  const bookingStartMs = booking ? new Date(booking.start).getTime() : Number.NaN;
  const isFutureBooking = Number.isFinite(bookingStartMs) ? bookingStartMs > nowMs : false;
  const requestExpiresMs = booking?.requestExpiresAt
    ? new Date(booking.requestExpiresAt).getTime()
    : Number.NaN;
  const isOpenRequest = Boolean(
    booking?.status === 'Pending' &&
    isFutureBooking &&
    (!Number.isFinite(requestExpiresMs) || requestExpiresMs > nowMs),
  );
  const canCancelBooking = !!booking && isFutureBooking && booking.status === 'Confirmed';
  const canReopenBooking = !!booking && isFutureBooking && booking.status === 'Cancelled';
  const canConfirmBooking = Boolean(
    isCoach &&
    isOpenRequest &&
    currentUser?.id &&
    booking?.coachId &&
    accountIdsMatch(currentUser.id, booking.coachId),
  );
  const canDeclineRequest = canConfirmBooking;
  const canWithdrawRequest = Boolean(!isCoach && isOpenRequest && booking?.canWithdrawRequest);
  const canCompleteSession =
    isCoach &&
    canCoachCompleteBooking({
      status: booking?.status,
      start: booking?.start,
    });
  const canReadSessionNote = Boolean(
    booking &&
    ((isCoach && (canCompleteSession || booking.status === 'Completed')) ||
      (!isCoach && booking.status === 'Completed')),
  );
  const sessionNote = useSessionNote(canReadSessionNote ? booking?.id : undefined);

  const handleMessageCounterparty = () => {
    if (!booking) return;
    router.push(Routes.messagesWith({ bookingId: booking.id }));
  };

  const handleCancelBooking = () => {
    if (!booking) return;
    if (!canCancelBooking) {
      uiFeedback.showToast(
        'Only upcoming bookings can be cancelled. Past or completed sessions cannot be cancelled.',
      );
      return;
    }
    router.push(Routes.bookingCancel(booking.id));
  };

  const handleReopenBooking = async () => {
    if (!booking) return;
    if (!canReopenBooking) {
      uiFeedback.showToast('Only upcoming cancelled bookings can be reopened.', 'warning');
      return;
    }

    const confirmed = await uiFeedback.confirm({
      title: isCoach ? 'Reopen Session?' : 'Reopen Booking?',
      message: isCoach
        ? 'This will restore the appointment and notify the family that the slot is active again.'
        : 'This will restore the cancelled appointment and put it back on your bookings list.',
      confirmText: 'Reopen',
      cancelText: 'Keep Cancelled',
    });
    if (!confirmed) {
      return;
    }

    const reopenedBooking = await bookingService.reopen(booking.id, isCoach ? 'coach' : 'parent');
    if (!reopenedBooking) {
      uiFeedback.showToast(
        'We could not reopen this booking. Try again from the bookings list.',
        'error',
      );
      return;
    }

    uiFeedback.showToast(
      isCoach
        ? 'The session is active again and the family can see it in bookings.'
        : 'Your booking is active again.',
      'success',
    );
    onRefresh();
  };

  const handleReportProblem = () => {
    if (booking?.id) {
      router.push(Routes.bookingsReportProblem({ bookingId: booking.id }));
      return;
    }
    router.push(Routes.BOOKINGS_REPORT_PROBLEM);
  };

  const handleRebook = async () => {
    if (!booking?.id) return;
    const draftResult = await bookingService.getRebookDraftContext(booking.id);
    if (!draftResult.success) {
      uiFeedback.showToast(draftResult.error.message, 'error');
      return;
    }
    const targetCoachId = draftResult.data.coachId ?? booking.coachId;
    if (!targetCoachId) {
      uiFeedback.showToast('We could not find the coach for this booking.', 'error');
      return;
    }

    resetBookingDraft();
    updateDraft({
      ...draftResult.data,
      coachName: draftResult.data.coachName ?? booking.coach?.name,
      athleteName: draftResult.data.athleteName ?? booking.client?.name,
    });
    router.push(Routes.bookSchedule(targetCoachId));
  };

  const handleManageRecurring = () => {
    if (!booking?.recurringBookingId) return;
    router.push(Routes.familyRecurring({ recurringId: booking.recurringBookingId }));
  };

  const handleConfirmBooking = async () => {
    if (!booking || !canConfirmBooking || isConfirmingBooking) return;

    setIsConfirmingBooking(true);
    try {
      const result = await bookingService.confirmBooking(booking.id);
      setIsConfirmingBooking(false);
      if (!result.success) {
        uiFeedback.showToast(result.error || 'We could not confirm this booking.', 'error');
        return;
      }
      uiFeedback.showToast('Booking confirmed.', 'success');
      onRefresh();
    } catch (confirmError) {
      setIsConfirmingBooking(false);
      logger.error('Failed to confirm booking', confirmError);
      uiFeedback.showToast('We could not confirm this booking.', 'error');
    }
  };

  const handleDeclineRequest = async () => {
    if (!booking || !canDeclineRequest || isResolvingRequest) return;

    const confirmed = await uiFeedback.confirm({
      title: 'Decline booking request?',
      message: 'The family will be notified and the requested slot will become available again.',
      confirmText: 'Decline request',
      cancelText: 'Keep request',
      destructive: true,
    });
    if (!confirmed) return;

    setIsResolvingRequest(true);
    try {
      const result = await bookingService.declineBookingRequest(booking.id, {
        reason: 'Coach declined the booking request.',
        ...(typeof booking.version === 'number' ? { expectedVersion: booking.version } : {}),
      });
      if (!result.success) {
        uiFeedback.showToast(result.error.message, 'error');
      } else {
        uiFeedback.showToast('Booking request declined.', 'success');
        onRefresh();
      }
    } catch (declineError) {
      logger.error('Failed to decline booking request', declineError);
      uiFeedback.showToast('We could not decline this booking request.', 'error');
    }
    setIsResolvingRequest(false);
  };

  const handleWithdrawRequest = async () => {
    if (!booking || !canWithdrawRequest || isResolvingRequest) return;

    const confirmed = await uiFeedback.confirm({
      title: 'Withdraw booking request?',
      message: 'The coach will be notified and the requested slot will become available again.',
      confirmText: 'Withdraw request',
      cancelText: 'Keep request',
      destructive: true,
    });
    if (!confirmed) return;

    setIsResolvingRequest(true);
    try {
      const result = await bookingService.withdrawBookingRequest(booking.id, {
        reason: 'Requester withdrew the booking request.',
        ...(typeof booking.version === 'number' ? { expectedVersion: booking.version } : {}),
      });
      if (!result.success) {
        uiFeedback.showToast(result.error.message, 'error');
      } else {
        uiFeedback.showToast('Booking request withdrawn.', 'success');
        onRefresh();
      }
    } catch (withdrawError) {
      logger.error('Failed to withdraw booking request', withdrawError);
      uiFeedback.showToast('We could not withdraw this booking request.', 'error');
    }
    setIsResolvingRequest(false);
  };

  const handleCompleteSession = () => {
    if (!booking?.id || !canCompleteSession) return;
    router.push(Routes.sessionComplete(booking.id));
  };

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
          coachPhotoUrl: booking.coach?.photoUrl || undefined,
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
      messageCoach: handleMessageCounterparty,
      cancelBooking: handleCancelBooking,
      reopenBooking: handleReopenBooking,
      reportProblem: handleReportProblem,
      rebook: handleRebook,
      manageRecurring: handleManageRecurring,
      confirmBooking: handleConfirmBooking,
      declineRequest: handleDeclineRequest,
      withdrawRequest: handleWithdrawRequest,
      completeSession: handleCompleteSession,
    },
    canCancelBooking,
    canReopenBooking,
    canConfirmBooking,
    isConfirmingBooking,
    canDeclineRequest,
    canWithdrawRequest,
    isResolvingRequest,
    canCompleteSession,
    formatted,
  };
}
