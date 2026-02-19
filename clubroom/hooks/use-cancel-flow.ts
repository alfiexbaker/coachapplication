/**
 * useCancelFlow — State, effects, handlers for CancelFlow modal.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { schedulingRulesService } from '@/services/scheduling-rules-service';
import { cancellationService } from '@/services/cancellation-service';
import { notificationSenderService } from '@/services/notification/notification-sender';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { Booking } from '@/constants/app-types';
import type { RefundCalculation } from '@/constants/types';
import { getBookingAthleteName } from '@/utils/booking-display';

export type CancellationReason =
  | 'child_ill'
  | 'schedule_change'
  | 'weather'
  | 'venue'
  | 'emergency'
  | 'other';

export interface ReasonOption {
  key: CancellationReason;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const PARENT_REASONS: ReasonOption[] = [
  { key: 'child_ill', label: 'Child is ill', icon: 'medkit-outline' },
  { key: 'schedule_change', label: 'Schedule change', icon: 'calendar-outline' },
  { key: 'weather', label: 'Bad weather', icon: 'rainy-outline' },
  { key: 'venue', label: 'Venue problem', icon: 'location-outline' },
  { key: 'emergency', label: 'Emergency', icon: 'alert-circle-outline' },
  { key: 'other', label: 'Other reason', icon: 'chatbubble-ellipses-outline' },
];

export const COACH_REASONS: ReasonOption[] = [
  { key: 'schedule_change', label: 'Schedule change', icon: 'calendar-outline' },
  { key: 'weather', label: 'Bad weather', icon: 'rainy-outline' },
  { key: 'venue', label: 'Venue unavailable', icon: 'location-outline' },
  { key: 'emergency', label: 'Emergency', icon: 'alert-circle-outline' },
  { key: 'other', label: 'Other reason', icon: 'chatbubble-ellipses-outline' },
];

export function formatSessionDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface UseCancelFlowParams {
  visible: boolean;
  bookingId: string;
  booking: Booking;
  userRole: 'coach' | 'parent';
  onCancelled: () => void;
}

export function useCancelFlow({
  visible,
  bookingId,
  booking,
  userRole,
  onCancelled,
}: UseCancelFlowParams) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState<CancellationReason | null>(null);
  const [note, setNote] = useState('');
  const [refundCalc, setRefundCalc] = useState<RefundCalculation | null>(null);

  const reasons = userRole === 'coach' ? COACH_REASONS : PARENT_REASONS;
  const isCoachCancelling = userRole === 'coach';
  const sessionStartTime = useMemo(
    () => new Date(booking.scheduledAt || booking.start || Date.now()),
    [booking.scheduledAt, booking.start],
  );
  const bookingAmount = 35;

  useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoading(true);
      try {
        const policyResult = await schedulingRulesService.getCancellationPolicy(booking.coachId);
        if (!policyResult.success) {
          throw new Error(policyResult.error.message);
        }
        setRefundCalc(
          schedulingRulesService.calculateRefund(
            bookingAmount,
            sessionStartTime,
            policyResult.data,
          ),
        );
      } catch {
        setRefundCalc(
          schedulingRulesService.calculateRefund(bookingAmount, sessionStartTime, null),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, booking.coachId, bookingAmount, sessionStartTime]);

  useEffect(() => {
    if (!visible) {
      setReason(null);
      setNote('');
      setSubmitting(false);
    }
  }, [visible]);

  const handleConfirm = useCallback(async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      const cancelResult = await cancellationService.cancelBooking(bookingId, userRole, {
        reason,
        note,
        refundCalculation: refundCalc,
        coachId: booking.coachId,
      });
      if (!cancelResult.success) {
        onCancelled();
        return;
      }
      try {
        const bookings = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
        const idx = bookings.findIndex((b) => b.id === bookingId);
        if (idx !== -1) {
          bookings[idx].status = 'CANCELLED';
          bookings[idx].cancelledBy = userRole;
          bookings[idx].cancelledAt = new Date().toISOString();
          bookings[idx].cancelReason = reason;
          await apiClient.set(STORAGE_KEYS.BOOKINGS, bookings);
        }
      } catch {
        /* non-critical */
      }
      try {
        const dateLabel = formatSessionDate(booking.scheduledAt || booking.start || '');
        if (isCoachCancelling) {
          // Coach cancelled → notify parent
          await notificationSenderService.notifyParentBookingCancelled({
            parentId: booking.bookedById || '',
            coachName: booking.coachName || 'Coach',
            childName: getBookingAthleteName(booking) || undefined,
            date: dateLabel,
            bookingId,
          });
        } else {
          // Parent cancelled → notify coach
          await notificationSenderService.notifyCoachBookingCancelled({
            coachId: booking.coachId,
            parentName: booking.bookedByName || 'Parent',
            date: dateLabel,
            bookingId,
          });
        }
      } catch {
        /* non-critical */
      }
      try {
        const overrides = await apiClient.get<
          { coachId: string; date: string; type: string; bookingId?: string }[]
        >(STORAGE_KEYS.AVAILABILITY_OVERRIDES, []);
        const bookingDate = (booking.scheduledAt || booking.start || '').split('T')[0];
        const updatedOverrides = overrides.filter(
          (o) =>
            !(
              o.coachId === booking.coachId &&
              o.date === bookingDate &&
              o.type === 'booked' &&
              o.bookingId === bookingId
            ),
        );
        if (updatedOverrides.length !== overrides.length)
          await apiClient.set(STORAGE_KEYS.AVAILABILITY_OVERRIDES, updatedOverrides);
      } catch {
        /* non-critical */
      }
      onCancelled();
    } catch {
      onCancelled();
    } finally {
      setSubmitting(false);
    }
  }, [bookingId, userRole, reason, note, refundCalc, booking, isCoachCancelling, onCancelled]);

  const hoursUntil = Math.max(0, (sessionStartTime.getTime() - Date.now()) / (1000 * 60 * 60));
  const canConfirm = !!reason;

  return {
    loading,
    submitting,
    reason,
    setReason,
    note,
    setNote,
    refundCalc,
    reasons,
    isCoachCancelling,
    hoursUntil,
    canConfirm,
    handleConfirm,
  };
}
