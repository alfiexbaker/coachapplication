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

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, Shadows, Components, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { createModalStyles } from '@/constants/styles';
import { schedulingRulesService } from '@/services/scheduling-rules-service';
import { cancellationService } from '@/services/cancellation-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { Booking } from '@/constants/app-types';
import type { RefundCalculation } from '@/constants/types';

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

interface SubComponentColors {
  text: string;
  tint: string;
  background: string;
  surface: string;
  border: string;
  muted: string;
  success: string;
  warning: string;
  error: string;
  icon: string;
}

function SessionInfoCard({ booking, colors, scheme }: { booking: Booking; colors: SubComponentColors; scheme: 'light' | 'dark' }) {
  const sessionDate = booking.scheduledAt || booking.start || '';
  return (
    <View style={[styles.sessionCard, Shadows[scheme].card, { backgroundColor: colors.surface }]}>
      <View style={styles.sessionCardRow}>
        <Ionicons name="football-outline" size={18} color={colors.tint} />
        <View style={styles.sessionCardInfo}>
          <ThemedText style={[styles.sessionCardTitle, { color: colors.text }]} numberOfLines={1}>
            {booking.service || 'Coaching Session'}
          </ThemedText>
          <ThemedText style={[styles.sessionCardMeta, { color: colors.muted }]}>
            {sessionDate ? formatSessionDate(sessionDate) : 'Date not set'}
          </ThemedText>
          {booking.location || booking.locationLabel ? (
            <ThemedText style={[styles.sessionCardMeta, { color: colors.muted }]} numberOfLines={1}>
              {booking.locationLabel || booking.location}
            </ThemedText>
          ) : null}
        </View>
      </View>
      <View style={[styles.sessionCardDetails, { borderTopColor: colors.border }]}>
        <View style={styles.sessionDetailItem}>
          <Ionicons name="person-outline" size={14} color={colors.muted} />
          <ThemedText style={[styles.sessionDetailText, { color: colors.muted }]} numberOfLines={1}>
            {booking.coachName || 'Coach'}
          </ThemedText>
        </View>
        <View style={styles.sessionDetailItem}>
          <Ionicons name="people-outline" size={14} color={colors.muted} />
          <ThemedText style={[styles.sessionDetailText, { color: colors.muted }]} numberOfLines={1}>
            {booking.athleteName || 'Athlete'}
          </ThemedText>
        </View>
        {booking.duration ? (
          <View style={styles.sessionDetailItem}>
            <Ionicons name="time-outline" size={14} color={colors.muted} />
            <ThemedText style={[styles.sessionDetailText, { color: colors.muted }]}>
              {booking.duration} mins
            </ThemedText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function RefundBanner({ calculation, colors }: { calculation: RefundCalculation; colors: SubComponentColors }) {
  const isFullRefund = calculation.refundPercentage === 100;
  const isNoRefund = calculation.refundPercentage === 0;

  const bannerColor = isFullRefund
    ? colors.success
    : isNoRefund
      ? colors.error
      : colors.warning;

  return (
    <View style={[styles.refundBanner, { backgroundColor: withAlpha(bannerColor, 0.07) }]}>
      <View style={styles.refundBannerHeader}>
        <Ionicons
          name={isFullRefund ? 'checkmark-circle' : isNoRefund ? 'close-circle' : 'information-circle'}
          size={20}
          color={bannerColor}
        />
        <ThemedText style={[styles.refundBannerTitle, { color: bannerColor }]}>
          {isFullRefund
            ? 'Full refund'
            : isNoRefund
              ? 'No refund'
              : `${calculation.refundPercentage}% refund`}
        </ThemedText>
      </View>
      <ThemedText style={[styles.refundExplanation, { color: colors.muted }]}>{calculation.explanation}</ThemedText>
      {calculation.netRefundAmount > 0 && (
        <View style={[styles.refundAmountRow, { borderTopColor: colors.border }]}>
          <ThemedText style={[styles.refundAmountLabel, { color: colors.text }]}>You will receive</ThemedText>
          <ThemedText style={[styles.refundAmount, { color: bannerColor }]}>
            {'\u00A3'}{calculation.netRefundAmount.toFixed(2)}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

function ReasonCard({
  option,
  selected,
  onPress,
  colors,
}: {
  option: ReasonOption;
  selected: boolean;
  onPress: () => void;
  colors: SubComponentColors;
}) {
  return (
    <Pressable
      style={[
        styles.reasonCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        selected ? { borderColor: colors.tint, backgroundColor: withAlpha(colors.tint, 0.03) } : undefined,
      ]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Ionicons
        name={option.icon}
        size={18}
        color={selected ? colors.tint : colors.muted}
      />
      <ThemedText
        style={[
          styles.reasonLabel,
          { color: colors.text },
          selected ? { ...Typography.bodySemiBold, color: colors.tint } : undefined,
        ]}
        numberOfLines={1}
      >
        {option.label}
      </ThemedText>
      {selected && <Ionicons name="checkmark" size={16} color={colors.tint} />}
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
  const { colors, scheme } = useTheme();
  const ModalStyles = createModalStyles(colors);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState<CancellationReason | null>(null);
  const [note, setNote] = useState('');
  const [refundCalc, setRefundCalc] = useState<RefundCalculation | null>(null);

  const reasons = userRole === 'coach' ? COACH_REASONS : PARENT_REASONS;
  const isCoachCancelling = userRole === 'coach';
  const sessionStartTime = useMemo(
    () => new Date(booking.scheduledAt || booking.start || Date.now()),
    [booking.scheduledAt, booking.start]
  );
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
  }, [visible, booking.coachId, bookingAmount, sessionStartTime]);

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
        // Non-critical: booking status update failed
      }

      // 3. Create notification for the other party
      try {
        const notifications = await apiClient.get<Record<string, unknown>[]>(STORAGE_KEYS.NOTIFICATIONS, []);
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
        const overrides = await apiClient.get<{ coachId: string; date: string; type: string; bookingId?: string }[]>(STORAGE_KEYS.AVAILABILITY_OVERRIDES, []);
        const bookingDate = (booking.scheduledAt || booking.start || '').split('T')[0];
        // Remove any override that was blocking this slot
        const updatedOverrides = overrides.filter((o) => {
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
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        {/* Handle bar */}
        <View style={ModalStyles.handle} />

        {/* Header */}
        <View style={styles.modalHeader}>
          <ThemedText style={[styles.modalTitle, { color: colors.text }]}>Cancel session</ThemedText>
          <Pressable onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.surface }]} hitSlop={12}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingArea}>
            <ActivityIndicator size="large" color={colors.text} />
          </View>
        ) : (
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Session info card */}
            <SessionInfoCard booking={booking} colors={colors} scheme={scheme} />

            {/* Time context */}
            <View style={styles.timeContext}>
              <Ionicons name="time-outline" size={16} color={colors.muted} />
              <ThemedText style={[styles.timeContextText, { color: colors.muted }]}>
                {hoursUntil < 1
                  ? 'Less than 1 hour until session'
                  : hoursUntil < 24
                    ? `${Math.round(hoursUntil)} hours until session`
                    : `${Math.round(hoursUntil / 24)} days until session`}
              </ThemedText>
            </View>

            {/* Refund banner (only for parent cancellations) */}
            {!isCoachCancelling && refundCalc && <RefundBanner calculation={refundCalc} colors={colors} />}

            {/* Coach cancellation warning */}
            {isCoachCancelling && (
              <View style={[styles.coachNote, { backgroundColor: withAlpha(colors.warning, 0.07) }]}>
                <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
                <ThemedText style={[styles.coachNoteText, { color: colors.muted }]}>
                  Cancelling as a coach will issue a full refund to the parent. Frequent
                  cancellations may affect your profile rating.
                </ThemedText>
              </View>
            )}

            {/* Reason selection */}
            <ThemedText style={[styles.sectionLabel, { color: colors.text }]}>
              Why are you cancelling?{isCoachCancelling ? ' (required)' : ''}
            </ThemedText>
            <View style={styles.reasonsGrid}>
              {reasons.map((opt) => (
                <ReasonCard
                  key={opt.key}
                  option={opt}
                  selected={reason === opt.key}
                  onPress={() => setReason(opt.key)}
                  colors={colors}
                />
              ))}
            </View>

            {/* Optional note */}
            <ThemedText style={[styles.sectionLabel, { color: colors.text }]}>Add a note (optional)</ThemedText>
            <TextInput
              style={[styles.noteInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={note}
              onChangeText={setNote}
              placeholder="Any additional details..."
              placeholderTextColor={colors.border}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Action buttons */}
            <View style={styles.buttonsRow}>
              <Pressable style={[styles.keepButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onClose}>
                <ThemedText style={[styles.keepButtonText, { color: colors.text }]}>Keep Session</ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.confirmButton,
                  { backgroundColor: colors.error },
                  (!canConfirm || submitting) ? styles.confirmButtonDisabled : undefined,
                ]}
                onPress={handleConfirm}
                disabled={!canConfirm || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <ThemedText style={[styles.confirmButtonText, { color: colors.surface }]}>Confirm Cancel</ThemedText>
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
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
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
    borderRadius: Radii.card,
    padding: Spacing.sm,
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
  },
  sessionCardMeta: {
    ...Typography.small,
    marginTop: Spacing.micro,
  },
  sessionCardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sessionDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  sessionDetailText: {
    ...Typography.caption,
  },

  // Time context
  timeContext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  timeContextText: {
    ...Typography.small,
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
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  refundBannerTitle: {
    ...Typography.bodySemiBold,
  },
  refundExplanation: {
    ...Typography.small,
    marginBottom: Spacing.xs,
  },
  refundAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  refundAmountLabel: {
    ...Typography.body,
  },
  refundAmount: {
    ...Typography.heading,
  },

  // Coach note
  coachNote: {
    flexDirection: 'row',
    gap: Spacing.xs,
    borderRadius: Radii.card,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  coachNoteText: {
    flex: 1,
    ...Typography.small,
  },

  // Reasons
  sectionLabel: {
    ...Typography.bodySemiBold,
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
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderWidth: 1.5,
  },
  reasonLabel: {
    flex: 1,
    ...Typography.body,
  },

  // Note input
  noteInput: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.sm,
    minHeight: 80,
    ...Typography.body,
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
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepButtonText: {
    ...Typography.bodySemiBold,
  },
  confirmButton: {
    flex: 1,
    height: Components.button.height,
    borderRadius: Components.button.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    ...Typography.bodySemiBold,
  },

  bottomSpacer: {
    height: Spacing.lg * 2,
  },
});
