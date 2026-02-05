/**
 * Cancel Flow Modal
 *
 * Full cancellation flow used by both parents and coaches. Shows session
 * info, policy tier warning, reason selection, optional note, and confirm
 * or keep buttons. After cancellation: updates booking status, notifies
 * the other party, and frees the availability slot.
 *
 * USER STORY:
 * "As a parent, I want to see clearly how much refund I'll get before
 * cancelling so I can make an informed decision."
 *
 * "As a coach, I want a structured cancellation flow so I know why sessions
 * are being cancelled and can track patterns."
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radii, Typography, Shadows, Components } from '@/constants/theme';
import { ModalStyles, CardStyles } from '@/constants/styles';
import { schedulingRulesService } from '@/services/scheduling-rules-service';
import { cancellationService } from '@/services/cancellation-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { Booking } from '@/constants/app-types';
import type { CancellationPolicy, RefundCalculation } from '@/constants/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CancellationReason =
  | 'child_ill'
  | 'schedule_change'
  | 'weather'
  | 'venue'
  | 'emergency'
  | 'other';

interface ReasonOption {
  key: CancellationReason;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const PARENT_REASONS: ReasonOption[] = [
  { key: 'child_ill', label: 'Child is ill', icon: 'medkit-outline' },
  { key: 'schedule_change', label: 'Schedule change', icon: 'calendar-outline' },
  { key: 'weather', label: 'Bad weather', icon: 'rainy-outline' },
  { key: 'venue', label: 'Venue problem', icon: 'location-outline' },
  { key: 'emergency', label: 'Emergency', icon: 'alert-circle-outline' },
  { key: 'other', label: 'Other reason', icon: 'chatbubble-ellipses-outline' },
];

const COACH_REASONS: ReasonOption[] = [
  { key: 'schedule_change', label: 'Schedule change', icon: 'calendar-outline' },
  { key: 'weather', label: 'Bad weather', icon: 'rainy-outline' },
  { key: 'venue', label: 'Venue unavailable', icon: 'location-outline' },
  { key: 'emergency', label: 'Emergency', icon: 'alert-circle-outline' },
  { key: 'other', label: 'Other reason', icon: 'chatbubble-ellipses-outline' },
];

export interface CancelFlowProps {
  visible: boolean;
  onClose: () => void;
  bookingId: string;
  booking: Booking;
  userRole: 'coach' | 'parent';
  onCancelled: () => void;
}

// ---------------------------------------------------------------------------
// Helper: format date for display
// ---------------------------------------------------------------------------

function formatSessionDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SessionInfoCard({ booking }: { booking: Booking }) {
  const sessionDate = booking.scheduledAt || booking.start || '';
  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionCardRow}>
        <Ionicons name="football-outline" size={18} color={Colors.light.tint} />
        <View style={styles.sessionCardInfo}>
          <Text style={styles.sessionCardTitle}>
            {booking.service || 'Coaching Session'}
          </Text>
          <Text style={styles.sessionCardMeta}>
            {sessionDate ? formatSessionDate(sessionDate) : 'Date not set'}
          </Text>
          {booking.location || booking.locationLabel ? (
            <Text style={styles.sessionCardMeta}>
              {booking.locationLabel || booking.location}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.sessionCardDetails}>
        <View style={styles.sessionDetailItem}>
          <Ionicons name="person-outline" size={14} color={Colors.light.muted} />
          <Text style={styles.sessionDetailText}>
            {booking.coachName || 'Coach'}
          </Text>
        </View>
        <View style={styles.sessionDetailItem}>
          <Ionicons name="people-outline" size={14} color={Colors.light.muted} />
          <Text style={styles.sessionDetailText}>
            {booking.athleteName || 'Athlete'}
          </Text>
        </View>
        {booking.duration ? (
          <View style={styles.sessionDetailItem}>
            <Ionicons name="time-outline" size={14} color={Colors.light.muted} />
            <Text style={styles.sessionDetailText}>
              {booking.duration} mins
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function RefundBanner({ calculation }: { calculation: RefundCalculation }) {
  const isFullRefund = calculation.refundPercentage === 100;
  const isNoRefund = calculation.refundPercentage === 0;

  const bannerColor = isFullRefund
    ? Colors.light.success
    : isNoRefund
      ? Colors.light.error
      : Colors.light.warning;

  return (
    <View style={[styles.refundBanner, { backgroundColor: bannerColor + '12' }]}>
      <View style={styles.refundBannerHeader}>
        <Ionicons
          name={isFullRefund ? 'checkmark-circle' : isNoRefund ? 'close-circle' : 'information-circle'}
          size={20}
          color={bannerColor}
        />
        <Text style={[styles.refundBannerTitle, { color: bannerColor }]}>
          {isFullRefund
            ? 'Full refund'
            : isNoRefund
              ? 'No refund'
              : `${calculation.refundPercentage}% refund`}
        </Text>
      </View>
      <Text style={styles.refundExplanation}>{calculation.explanation}</Text>
      {calculation.netRefundAmount > 0 && (
        <View style={styles.refundAmountRow}>
          <Text style={styles.refundAmountLabel}>You will receive</Text>
          <Text style={[styles.refundAmount, { color: bannerColor }]}>
            {'\u00A3'}{calculation.netRefundAmount.toFixed(2)}
          </Text>
        </View>
      )}
    </View>
  );
}

function ReasonCard({
  option,
  selected,
  onPress,
}: {
  option: ReasonOption;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.reasonCard, selected && styles.reasonCardSelected]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Ionicons
        name={option.icon}
        size={18}
        color={selected ? Colors.light.tint : Colors.light.muted}
      />
      <Text style={[styles.reasonLabel, selected && styles.reasonLabelSelected]}>
        {option.label}
      </Text>
      {selected && <Ionicons name="checkmark" size={16} color={Colors.light.tint} />}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CancelFlow({
  visible,
  onClose,
  bookingId,
  booking,
  userRole,
  onCancelled,
}: CancelFlowProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState<CancellationReason | null>(null);
  const [note, setNote] = useState('');
  const [refundCalc, setRefundCalc] = useState<RefundCalculation | null>(null);

  const reasons = userRole === 'coach' ? COACH_REASONS : PARENT_REASONS;
  const isCoachCancelling = userRole === 'coach';
  const sessionStartTime = new Date(booking.scheduledAt || booking.start || Date.now());
  const bookingAmount = 35; // Default session price; in production read from booking

  // Load policy and calculate refund
  useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoading(true);
      try {
        const policy = await schedulingRulesService.getCancellationPolicy(booking.coachId);
        const calc = schedulingRulesService.calculateRefund(bookingAmount, sessionStartTime, policy);
        setRefundCalc(calc);
      } catch {
        const calc = schedulingRulesService.calculateRefund(bookingAmount, sessionStartTime, null);
        setRefundCalc(calc);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible, booking.coachId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setReason(null);
      setNote('');
      setSubmitting(false);
    }
  }, [visible]);

  const handleConfirm = useCallback(async () => {
    if (!reason) return;
    // Coach must provide a reason
    if (isCoachCancelling && !reason) return;

    setSubmitting(true);
    try {
      // 1. Record the cancellation
      await cancellationService.cancelBooking(bookingId, userRole, {
        reason,
        note,
        refundCalculation: refundCalc,
        coachId: booking.coachId,
      });

      // 2. Update booking status to CANCELLED
      try {
        const bookings = await apiClient.get<any[]>(STORAGE_KEYS.BOOKINGS, []);
        const idx = bookings.findIndex((b: any) => b.id === bookingId);
        if (idx !== -1) {
          bookings[idx].status = 'CANCELLED';
          bookings[idx].cancelledBy = userRole;
          bookings[idx].cancelledAt = new Date().toISOString();
          bookings[idx].cancelReason = reason;
          await apiClient.set(STORAGE_KEYS.BOOKINGS, bookings);
        }
      } catch {
        // Non-critical: booking status update failed
      }

      // 3. Create notification for the other party
      try {
        const notifications = await apiClient.get<any[]>(STORAGE_KEYS.NOTIFICATIONS, []);
        const recipientId = isCoachCancelling ? (booking.bookedById || '') : booking.coachId;
        const senderName = isCoachCancelling ? (booking.coachName || 'Coach') : (booking.athleteName || 'Parent');
        const sessionLabel = booking.service || 'session';

        notifications.push({
          id: `notif_cancel_${Date.now()}`,
          userId: recipientId,
          type: 'booking_cancelled',
          title: 'Session cancelled',
          body: `${senderName} has cancelled the ${sessionLabel} on ${formatSessionDate(booking.scheduledAt || booking.start || '')}.`,
          read: false,
          createdAt: new Date().toISOString(),
          data: { bookingId, reason },
        });
        await apiClient.set(STORAGE_KEYS.NOTIFICATIONS, notifications);
      } catch {
        // Non-critical: notification creation failed
      }

      // 4. Free the availability slot
      try {
        const overrides = await apiClient.get<any[]>(STORAGE_KEYS.AVAILABILITY_OVERRIDES, []);
        const bookingDate = (booking.scheduledAt || booking.start || '').split('T')[0];
        // Remove any override that was blocking this slot
        const updatedOverrides = overrides.filter((o: any) => {
          if (o.coachId !== booking.coachId) return true;
          if (o.date !== bookingDate) return true;
          if (o.type === 'booked' && o.bookingId === bookingId) return false;
          return true;
        });
        if (updatedOverrides.length !== overrides.length) {
          await apiClient.set(STORAGE_KEYS.AVAILABILITY_OVERRIDES, updatedOverrides);
        }
      } catch {
        // Non-critical: availability slot freeing failed
      }

      onCancelled();
    } catch {
      // Let parent handle the error; still call onCancelled
      onCancelled();
    } finally {
      setSubmitting(false);
    }
  }, [bookingId, userRole, reason, note, refundCalc, booking, isCoachCancelling, onCancelled]);

  const hoursUntil = Math.max(
    0,
    (sessionStartTime.getTime() - Date.now()) / (1000 * 60 * 60),
  );

  const canConfirm = isCoachCancelling ? !!reason : !!reason;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Handle bar */}
        <View style={ModalStyles.handle} />

        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Cancel session</Text>
          <Pressable onPress={onClose} style={styles.closeButton} hitSlop={12}>
            <Ionicons name="close" size={22} color={Colors.light.text} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingArea}>
            <ActivityIndicator size="large" color={Colors.light.text} />
          </View>
        ) : (
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Session info card */}
            <SessionInfoCard booking={booking} />

            {/* Time context */}
            <View style={styles.timeContext}>
              <Ionicons name="time-outline" size={16} color={Colors.light.muted} />
              <Text style={styles.timeContextText}>
                {hoursUntil < 1
                  ? 'Less than 1 hour until session'
                  : hoursUntil < 24
                    ? `${Math.round(hoursUntil)} hours until session`
                    : `${Math.round(hoursUntil / 24)} days until session`}
              </Text>
            </View>

            {/* Refund banner (only for parent cancellations) */}
            {!isCoachCancelling && refundCalc && <RefundBanner calculation={refundCalc} />}

            {/* Coach cancellation warning */}
            {isCoachCancelling && (
              <View style={styles.coachNote}>
                <Ionicons name="information-circle-outline" size={18} color={Colors.light.warning} />
                <Text style={styles.coachNoteText}>
                  Cancelling as a coach will issue a full refund to the parent. Frequent
                  cancellations may affect your profile rating.
                </Text>
              </View>
            )}

            {/* Reason selection */}
            <Text style={styles.sectionLabel}>
              Why are you cancelling?{isCoachCancelling ? ' (required)' : ''}
            </Text>
            <View style={styles.reasonsGrid}>
              {reasons.map((opt) => (
                <ReasonCard
                  key={opt.key}
                  option={opt}
                  selected={reason === opt.key}
                  onPress={() => setReason(opt.key)}
                />
              ))}
            </View>

            {/* Optional note */}
            <Text style={styles.sectionLabel}>Add a note (optional)</Text>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Any additional details..."
              placeholderTextColor={Colors.light.border}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Action buttons */}
            <View style={styles.buttonsRow}>
              <Pressable style={styles.keepButton} onPress={onClose}>
                <Text style={styles.keepButtonText}>Keep Session</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.confirmButton,
                  (!canConfirm || submitting) && styles.confirmButtonDisabled,
                ]}
                onPress={handleConfirm}
                disabled={!canConfirm || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={Colors.light.surface} />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm Cancel</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  modalTitle: {
    ...Typography.title,
    color: Colors.light.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    paddingHorizontal: Spacing.sm,
  },

  // Session info card
  sessionCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: Radii.card,
    padding: Spacing.sm,
    ...Shadows.light.card,
    marginBottom: Spacing.sm,
  },
  sessionCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  sessionCardInfo: {
    flex: 1,
  },
  sessionCardTitle: {
    ...Typography.bodySemiBold,
    color: Colors.light.text,
  },
  sessionCardMeta: {
    ...Typography.small,
    color: Colors.light.muted,
    marginTop: 2,
  },
  sessionCardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.border,
  },
  sessionDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionDetailText: {
    ...Typography.caption,
    color: Colors.light.muted,
  },

  // Time context
  timeContext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  timeContextText: {
    ...Typography.small,
    color: Colors.light.muted,
  },

  // Refund banner
  refundBanner: {
    borderRadius: Radii.card,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  refundBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  refundBannerTitle: {
    ...Typography.bodySemiBold,
  },
  refundExplanation: {
    ...Typography.small,
    color: Colors.light.muted,
    marginBottom: 8,
  },
  refundAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.border,
  },
  refundAmountLabel: {
    ...Typography.body,
    color: Colors.light.text,
  },
  refundAmount: {
    ...Typography.heading,
  },

  // Coach note
  coachNote: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.light.warning + '12',
    borderRadius: Radii.card,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  coachNoteText: {
    flex: 1,
    ...Typography.small,
    color: Colors.light.muted,
  },

  // Reasons
  sectionLabel: {
    ...Typography.bodySemiBold,
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  reasonsGrid: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  reasonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.light.surface,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
  },
  reasonCardSelected: {
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tint + '08',
  },
  reasonLabel: {
    flex: 1,
    ...Typography.body,
    color: Colors.light.text,
  },
  reasonLabelSelected: {
    ...Typography.bodySemiBold,
    color: Colors.light.tint,
  },

  // Note input
  noteInput: {
    backgroundColor: Colors.light.surface,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: Spacing.sm,
    minHeight: 80,
    ...Typography.body,
    color: Colors.light.text,
    marginBottom: Spacing.md,
  },

  // Buttons
  buttonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  keepButton: {
    flex: 1,
    height: Components.button.height,
    borderRadius: Components.button.borderRadius,
    backgroundColor: Colors.light.surface,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepButtonText: {
    ...Typography.bodySemiBold,
    color: Colors.light.text,
  },
  confirmButton: {
    flex: 1,
    height: Components.button.height,
    borderRadius: Components.button.borderRadius,
    backgroundColor: Colors.light.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    ...Typography.bodySemiBold,
    color: Colors.light.surface,
  },

  bottomSpacer: {
    height: Spacing.lg * 2,
  },
});
