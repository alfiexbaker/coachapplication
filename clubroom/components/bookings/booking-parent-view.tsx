import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface BookingParentViewProps {
  bookingStatus?: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'Needs Completion';
  onMessageCoach: () => void;
  onCancelBooking: () => void;
  onReportProblem: () => void;
  onReopenBooking?: () => void;
  onRebook?: () => void;
  onManageRecurring?: () => void;
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
  canCancelBooking,
  messageLabel = 'Message delivery coach',
  reportProblemLabel = 'Report problem',
}: BookingParentViewProps) {
  const { colors: palette } = useTheme();
  const isPending = bookingStatus === 'Pending';
  const isConfirmed = bookingStatus === 'Confirmed';
  const isCompleted = bookingStatus === 'Completed';
  const isCancelled = bookingStatus === 'Cancelled';

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

      {(isPending || isConfirmed) && canCancelBooking ? (
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
            Cancel Booking
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
            Reopen Booking
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
          <ThemedText style={styles.secondaryButtonText}>Manage Recurring Plan</ThemedText>
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

      {(isCompleted || (isCancelled && !onReopenBooking)) && onRebook ? (
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
            Book Again
          </ThemedText>
        </Clickable>
      ) : null}
    </View>
  );
}

export const BookingParentView = React.memo(BookingParentViewInner);

const styles = StyleSheet.create({
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  primaryButton: {
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
