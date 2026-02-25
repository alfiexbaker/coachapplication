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
  onReschedule?: () => void;
  onRebook?: () => void;
  canCancelBooking: boolean;
}

function BookingParentViewInner({
  bookingStatus,
  onMessageCoach,
  onCancelBooking,
  onReportProblem,
  onReschedule,
  onRebook,
  canCancelBooking,
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
          Message Coach
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

      {isConfirmed && onReschedule ? (
        <Clickable
          onPress={onReschedule}
          style={({ pressed }) =>
            [
              styles.secondaryButton,
              { borderColor: palette.border },
              pressed && { backgroundColor: palette.border, opacity: 0.7 },
            ].filter(Boolean) as ViewStyle[]
          }
        >
          <Ionicons name="calendar-outline" size={20} color={palette.foreground} />
          <ThemedText style={styles.secondaryButtonText}>Request Reschedule</ThemedText>
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
        <ThemedText style={styles.secondaryButtonText}>Report Problem</ThemedText>
      </Clickable>

      {(isCompleted || isCancelled) && onRebook ? (
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
