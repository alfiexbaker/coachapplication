import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BookingSummary } from '@/constants/types';

interface BookingParentViewProps {
  bookingStatus?: BookingSummary['status'];
  onMessageCoach: () => void;
  onCancelBooking: () => void;
  onReportProblem: () => void;
  onReopenBooking?: () => void;
  onRebook?: () => void;
  onManageRecurring?: () => void;
  onWithdrawRequest?: () => void;
  isResolvingRequest?: boolean;
  canCancelBooking: boolean;
  messageLabel?: string;
  reportProblemLabel?: string;
}

function BookingParentViewInner({
  bookingStatus,
  onMessageCoach,
  onCancelBooking,
  onReportProblem,
  onReopenBooking,
  onRebook,
  onManageRecurring,
  onWithdrawRequest,
  isResolvingRequest = false,
  canCancelBooking,
  messageLabel = 'Message coach',
  reportProblemLabel = 'Report problem',
}: BookingParentViewProps) {
  const { colors: palette } = useTheme();
  const isPending = bookingStatus === 'Pending';
  const isConfirmed = bookingStatus === 'Confirmed';
  const isCompleted = bookingStatus === 'Completed';
  const isCancelled = bookingStatus === 'Cancelled';
  const isClosedRequest =
    bookingStatus === 'Declined' || bookingStatus === 'Withdrawn' || bookingStatus === 'Expired';

  return (
    <View style={styles.actions}>
      <Clickable
        onPress={onMessageCoach}
        style={({ pressed }) =>
          [
            styles.primaryButton,
            { backgroundColor: palette.tint },
            pressed && { opacity: 0.8 },
          ].filter(Boolean) as ViewStyle[]
        }
      >
        <Ionicons name="chatbubble" size={20} color={palette.onPrimary} />
        <ThemedText style={[styles.primaryButtonText, { color: palette.onPrimary }]}>
          {messageLabel}
        </ThemedText>
      </Clickable>

      {isPending && onWithdrawRequest ? (
        <Clickable
          onPress={onWithdrawRequest}
          disabled={isResolvingRequest}
          accessibilityLabel="Withdraw booking request"
          style={({ pressed }) =>
            [
              styles.secondaryButton,
              { borderColor: palette.error },
              pressed && { backgroundColor: palette.border, opacity: 0.7 },
              isResolvingRequest && { opacity: 0.6 },
            ].filter(Boolean) as ViewStyle[]
          }
        >
          <Ionicons name="close-circle-outline" size={20} color={palette.error} />
          <ThemedText style={[styles.secondaryButtonText, { color: palette.error }]}>
            {isResolvingRequest ? 'Withdrawing...' : 'Withdraw request'}
          </ThemedText>
        </Clickable>
      ) : null}

      {isConfirmed && canCancelBooking ? (
        <Clickable
          onPress={onCancelBooking}
          style={({ pressed }) =>
            [
              styles.secondaryButton,
              { borderColor: palette.error },
              pressed && { backgroundColor: palette.border, opacity: 0.7 },
            ].filter(Boolean) as ViewStyle[]
          }
        >
          <Ionicons name="close-circle-outline" size={20} color={palette.error} />
          <ThemedText style={[styles.secondaryButtonText, { color: palette.error }]}>
            Cancel booking
          </ThemedText>
        </Clickable>
      ) : null}

      {isCancelled && onReopenBooking ? (
        <Clickable
          onPress={onReopenBooking}
          style={({ pressed }) =>
            [
              styles.primaryButton,
              { backgroundColor: palette.tint },
              pressed && { opacity: 0.8 },
            ].filter(Boolean) as ViewStyle[]
          }
        >
          <Ionicons name="refresh-circle-outline" size={20} color={palette.onPrimary} />
          <ThemedText style={[styles.primaryButtonText, { color: palette.onPrimary }]}>
            Reopen booking
          </ThemedText>
        </Clickable>
      ) : null}

      {onManageRecurring ? (
        <Clickable
          onPress={onManageRecurring}
          style={({ pressed }) =>
            [
              styles.secondaryButton,
              { borderColor: palette.border },
              pressed && { backgroundColor: palette.border, opacity: 0.7 },
            ].filter(Boolean) as ViewStyle[]
          }
        >
          <Ionicons name="repeat-outline" size={20} color={palette.foreground} />
          <ThemedText style={styles.secondaryButtonText}>Manage recurring plan</ThemedText>
        </Clickable>
      ) : null}

      <Clickable
        onPress={onReportProblem}
        style={({ pressed }) =>
          [
            styles.secondaryButton,
            { borderColor: palette.border },
            pressed && { backgroundColor: palette.border, opacity: 0.7 },
          ].filter(Boolean) as ViewStyle[]
        }
      >
        <Ionicons name="warning-outline" size={20} color={palette.foreground} />
        <ThemedText style={styles.secondaryButtonText}>{reportProblemLabel}</ThemedText>
      </Clickable>

      {(isCompleted || isClosedRequest || (isCancelled && !onReopenBooking)) && onRebook ? (
        <Clickable
          onPress={onRebook}
          style={({ pressed }) =>
            [
              styles.primaryButton,
              { backgroundColor: palette.tint },
              pressed && { opacity: 0.8 },
            ].filter(Boolean) as ViewStyle[]
          }
        >
          <Ionicons name="repeat-outline" size={20} color={palette.onPrimary} />
          <ThemedText style={[styles.primaryButtonText, { color: palette.onPrimary }]}>
            Book again
          </ThemedText>
        </Clickable>
      ) : null}
    </View>
  );
}

export const BookingParentView = BookingParentViewInner;

const styles = StyleSheet.create({
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  primaryButtonText: {
    ...Typography.subheading,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  secondaryButtonText: {
    ...Typography.subheading,
  },
});
