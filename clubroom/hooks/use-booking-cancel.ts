/**
 * Hook for the Cancel Booking screen.
 * Manages flow state, booking data loading, refund calculation, and cancellation handlers.
 */

import { useCallback, useState, useEffect } from 'react';

import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useScreen } from '@/hooks/use-screen';
import { bookingService } from '@/services/booking-service';
import { schedulingRulesService } from '@/services/scheduling-rules-service';
import type { CancellationPolicy, RefundCalculation, RefundTier, Booking } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';
import { createLogger } from '@/utils/logger';
import type { Ionicons } from '@expo/vector-icons';
import { getBookingAthleteName } from '@/utils/booking-display';
import { err, ok, serviceError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';
import { useAuth } from '@/hooks/use-auth';
import { buildAuthScopedSnapshotKey } from '@/utils/auth-scoped-snapshot-key';
import { apiClient } from '@/services/api-client';
import { accountIdsMatch } from '@/utils/account-id';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('CancelBookingScreen');

interface CancelLoadData {
  coachId: string;
  bookingAmount: number;
  sessionTime: Date;
  coachName: string;
  athleteName: string;
  sessionTitle: string;
  policy: CancellationPolicy | null;
  refundCalc: RefundCalculation;
}

const cancelLoadSnapshots = new Map<string, CancelLoadData>();

export type FlowStep = 'details';

export interface CancellationReason {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  parentOnly?: boolean;
  coachOnly?: boolean;
}

export const CANCELLATION_REASONS: CancellationReason[] = [
  { key: 'child_ill', label: 'Child is ill', icon: 'medkit-outline', parentOnly: true },
  { key: 'schedule_change', label: 'Schedule change', icon: 'calendar-outline' },
  { key: 'weather', label: 'Weather conditions', icon: 'rainy-outline' },
  { key: 'venue', label: 'Venue unavailable', icon: 'business-outline', coachOnly: true },
  { key: 'emergency', label: 'Emergency', icon: 'warning-outline' },
  { key: 'coach_ill', label: 'Illness / Injury', icon: 'medkit-outline', coachOnly: true },
  { key: 'other', label: 'Other reason', icon: 'chatbubble-outline' },
];

export function getTierColour(tier: RefundTier, palette: ThemeColors): string {
  if (tier.refundPercentage === 100) return palette.success;
  if (tier.refundPercentage >= 50) return palette.warning;
  if (tier.refundPercentage > 0) return palette.warning;
  return palette.error;
}

export function formatTimeUntil(hours: number): string {
  if (hours < 1) return 'Less than 1 hour';
  if (hours < 24) return `${Math.floor(hours)} hour${Math.floor(hours) !== 1 ? 's' : ''}`;
  const days = Math.floor(hours / 24);
  const rem = Math.floor(hours % 24);
  if (rem === 0) return `${days} day${days !== 1 ? 's' : ''}`;
  return `${days} day${days !== 1 ? 's' : ''}, ${rem} hour${rem !== 1 ? 's' : ''}`;
}

export function formatSessionDate(d: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  const mins = m === 0 ? '' : `:${m.toString().padStart(2, '0')}`;
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} \u00B7 ${hour}${mins}${ampm}`;
}

export function useBookingCancel(id: string) {
  const { currentUser } = useAuth();
  const snapshotKey = buildAuthScopedSnapshotKey(currentUser?.id, 'booking-cancel', id);

  const [step, setStep] = useState<FlowStep>('details');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadBookingDetails = useCallback(async () => {
    if (!id) {
      return err(serviceError('UNKNOWN', 'Missing booking id for cancellation.'));
    }
    try {
      const booking = await bookingService.getBooking(id);
      if (!booking) {
        return ok<CancelLoadData | null>(null);
      }

      const bookingExt = booking as Booking & Record<string, unknown>;
      const bookingPrice = bookingExt.price;
      if (typeof bookingPrice !== 'number' || !Number.isFinite(bookingPrice) || bookingPrice < 0) {
        return err(
          serviceError(
            'VALIDATION',
            'Booking price is unavailable from the live booking record. Cancellation estimate blocked.',
          ),
        );
      }
      const scheduledAt = new Date(booking.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime())) {
        return err(serviceError('UNKNOWN', 'Booking session time is invalid.'));
      }
      if (scheduledAt.getTime() <= Date.now()) {
        return err(serviceError('VALIDATION', 'Only upcoming bookings can be cancelled.'));
      }
      if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
        return err(serviceError('VALIDATION', 'This booking is no longer cancellable.'));
      }
      const coachPolicyResult = await schedulingRulesService.getCancellationPolicy(booking.coachId);
      if (!coachPolicyResult.success) {
        logger.error('Failed to load coach cancellation policy', coachPolicyResult.error);
        return err(
          serviceError(
            'UNKNOWN',
            coachPolicyResult.error.message || 'Failed to load cancellation policy.',
            coachPolicyResult.error.details,
          ),
        );
      }
      const coachPolicy = coachPolicyResult.data;
      if (!coachPolicy && !apiClient.isMockMode) {
        return err(
          serviceError(
            'VALIDATION',
            'Cancellation terms are unavailable from the live coach policy. Cancellation estimate blocked.',
          ),
        );
      }

      const calculation = schedulingRulesService.calculateRefund(
        bookingPrice,
        scheduledAt,
        coachPolicy,
      );

      return ok<CancelLoadData | null>({
        coachId: booking.coachId,
        bookingAmount: bookingPrice,
        sessionTime: scheduledAt,
        coachName: booking.coachName || 'Coach',
        athleteName: getBookingAthleteName(booking),
        sessionTitle: (bookingExt.sessionTitle as string) || booking.service || 'Session',
        policy: coachPolicy,
        refundCalc: calculation,
      });
    } catch (loadError) {
      logger.error('Failed to load booking', loadError);
      return err(
        serviceError('UNKNOWN', 'Failed to load booking cancellation details.', loadError),
      );
    }
  }, [id]);

  const { data, status, error, refreshing, onRefresh, retry, colors } =
    useScreen<CancelLoadData | null>({
      load: loadBookingDetails,
      deps: [loadBookingDetails, currentUser?.id],
      isEmpty: (value) => value === null,
      refetchOnFocus: true,
      loadingStrategy: 'section-skeleton',
    });

  useEffect(() => {
    if (data && snapshotKey) {
      cancelLoadSnapshots.set(snapshotKey, data);
    }
  }, [data, snapshotKey]);

  const resolvedData =
    data ??
    (status === 'loading' && snapshotKey ? cancelLoadSnapshots.get(snapshotKey) : null) ??
    null;
  const bookingAmount = resolvedData?.bookingAmount ?? 0;
  const coachId = resolvedData?.coachId ?? '';
  const isCoach = Boolean(
    currentUser?.id &&
      currentUser.accountType === 'COACH' &&
      coachId &&
      accountIdsMatch(currentUser.id, coachId),
  );
  const isParent = currentUser?.accountType === 'PARENT';
  const filteredReasons = CANCELLATION_REASONS.filter((r) => {
    if (!isParent && r.parentOnly) return false;
    if (!isCoach && r.coachOnly) return false;
    return true;
  });
  const canProceed = !isCoach || reason !== '';
  const sessionTime = resolvedData?.sessionTime ?? null;
  const coachName = resolvedData?.coachName ?? '';
  const athleteName = resolvedData?.athleteName ?? '';
  const sessionTitle = resolvedData?.sessionTitle ?? '';
  const policy = resolvedData?.policy ?? null;
  const refundCalc = resolvedData?.refundCalc ?? null;

  const handleCancel = async () => {
    if (!refundCalc) return;
    const reasonLabel =
      filteredReasons.find((r) => r.key === reason)?.label || reason || 'Not specified';

    setProcessing(true);

    await runAsyncTryCatchFinally(
      async () => {
        const cancelledBooking = await bookingService.cancel(
          id,
          reasonLabel,
          isCoach ? 'coach' : 'parent',
          {
            note: note.trim() || undefined,
          },
        );
        if (!cancelledBooking) {
          throw new Error('Cancellation failed');
        }

        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (isCoach) {
          uiFeedback.showToast(
            `The session has been cancelled and ${athleteName}'s parent has been notified.${
              refundCalc.netRefundAmount > 0
                ? ` If payment has already been made, arrange any \u00A3${refundCalc.netRefundAmount.toFixed(2)} adjustment directly and update your reconciler.`
                : ''
            }`,
            'success',
          );
          router.back();
        } else if (refundCalc.netRefundAmount > 0) {
          uiFeedback.showToast(
            `Your booking has been cancelled. If payment has already been made, the coach or organization will confirm any \u00A3${refundCalc.netRefundAmount.toFixed(2)} adjustment directly outside the app.`,
            'success',
          );
          router.back();
        } else {
          uiFeedback.showToast(
            'Your booking has been cancelled. The coach has been notified.',
            'success',
          );
          router.back();
        }

        logger.success('BookingCancelled', {
          bookingId: id,
          role: isCoach ? 'coach' : 'parent',
          reason: reasonLabel,
          refundAmount: refundCalc.netRefundAmount,
        });
      },
      async (error) => {
        logger.error('Failed to cancel booking', error);
        uiFeedback.showToast('Failed to cancel booking. Please try again.', 'error');
      },
      () => {
        setProcessing(false);
      },
    );
  };

  const handleGoBack = () => {
    router.back();
  };

  const effectivePolicy = policy || schedulingRulesService.getDefaultCancellationPolicy();
  const sortedTiers = Array.from(effectivePolicy.tiers).toSorted(
    (a, b) => b.hoursBeforeSession - a.hoursBeforeSession,
  );

  return {
    isCoach,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    colors,
    step,
    setStep,
    reason,
    setReason,
    note,
    setNote,
    loading: status === 'loading' && resolvedData === null,
    processing,
    bookingAmount,
    sessionTime,
    coachName,
    athleteName,
    sessionTitle,
    refundCalc,
    effectivePolicy,
    sortedTiers,
    filteredReasons,
    canProceed,
    handleCancel,
    handleGoBack,
  };
}
