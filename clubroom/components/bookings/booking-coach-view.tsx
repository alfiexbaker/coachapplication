import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BookingSummary } from '@/constants/types';
import { Row } from '@/components/primitives';
import { getBookingSummaryClientName } from '@/utils/booking-display';

interface BookingCoachViewProps {
  booking: BookingSummary;
  onMessageClient: () => void;
  onReschedule: () => void;
  onRefund: () => void;
  onCancelBooking: () => void;
}

function BookingCoachViewInner({
  booking,
  onMessageClient,
  onReschedule,
  onRefund,
  onCancelBooking,
}: BookingCoachViewProps) {
  const { colors: palette } = useTheme();

  if (booking.status === 'Completed') {
    const objectives = (booking as BookingSummary & { objectives?: string[] }).objectives || [];

    return (
      <View style={styles.actions}>
        <Clickable
          onPress={() => {
            router.push(
              Routes.sessionFeedback({
                bookingId: booking.id,
                athleteId: booking.clientId,
                athleteName: getBookingSummaryClientName(booking),
                athleteObjectives: JSON.stringify(objectives),
              }),
            );
          }}
          style={({ pressed }) =>
            [
              styles.primaryButton,
              { backgroundColor: palette.tint },
              pressed && { opacity: 0.8 },
            ].filter(Boolean) as ViewStyle[]
          }
        >
          <Ionicons name="create" size={20} color={palette.onPrimary} />
          <ThemedText style={[styles.primaryButtonText, { color: palette.onPrimary }]}>
            Add Session Feedback
          </ThemedText>
        </Clickable>
      </View>
    );
  }

  return (
    <View style={styles.actions}>
      <Clickable
        onPress={onMessageClient}
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
          Message Client
        </ThemedText>
      </Clickable>

      <Row style={styles.buttonRow}>
        <Clickable
          onPress={onReschedule}
          style={({ pressed }) =>
            [
              styles.halfButton,
              { borderColor: palette.border },
              pressed && { backgroundColor: palette.border, opacity: 0.7 },
            ].filter(Boolean) as ViewStyle[]
          }
        >
          <Ionicons name="calendar-outline" size={18} color={palette.foreground} />
          <ThemedText style={styles.secondaryButtonText}>Reschedule</ThemedText>
        </Clickable>

        <Clickable
          onPress={onRefund}
          style={({ pressed }) =>
            [
              styles.halfButton,
              { borderColor: palette.border },
              pressed && { backgroundColor: palette.border, opacity: 0.7 },
            ].filter(Boolean) as ViewStyle[]
          }
        >
          <Ionicons name="cash-outline" size={18} color={palette.foreground} />
          <ThemedText style={styles.secondaryButtonText}>Refund</ThemedText>
        </Clickable>
      </Row>

      <Clickable
        onPress={onCancelBooking}
        style={({ pressed }) =>
          [
            styles.secondaryButton,
            { borderColor: palette.error },
            pressed && { backgroundColor: withAlpha(palette.error, 0.09), opacity: 0.7 },
          ].filter(Boolean) as ViewStyle[]
        }
      >
        <Ionicons name="close-circle-outline" size={20} color={palette.error} />
        <ThemedText style={[styles.secondaryButtonText, { color: palette.error }]}>
          Cancel Booking
        </ThemedText>
      </Clickable>
    </View>
  );
}

export const BookingCoachView = React.memo(BookingCoachViewInner);

const styles = StyleSheet.create({
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  buttonRow: {
    gap: Spacing.sm,
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
  halfButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  secondaryButtonText: {
    ...Typography.subheading,
  },
});
