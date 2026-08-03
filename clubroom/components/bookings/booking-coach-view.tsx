import React from 'react';
import { ActivityIndicator, View, StyleSheet, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { MarkPaidButton } from '@/components/invoices/mark-paid-button';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BookingSummary } from '@/constants/types';

interface BookingCoachViewProps {
  booking: BookingSummary;
  onMessageClient: () => void;
  onReopenBooking?: () => void;
  onCancelBooking: () => void;
  canCancelBooking: boolean;
  onConfirmBooking?: () => void;
  onDeclineRequest?: () => void;
  isConfirmingBooking?: boolean;
  isResolvingRequest?: boolean;
  onCompleteSession?: () => void;
  canCompleteSession?: boolean;
  onMarkAsPaid?: () => void;
}

function BookingCoachViewInner({
  booking,
  onMessageClient,
  onReopenBooking,
  onCancelBooking,
  canCancelBooking,
  onConfirmBooking,
  onDeclineRequest,
  isConfirmingBooking = false,
  isResolvingRequest = false,
  onCompleteSession,
  canCompleteSession = false,
  onMarkAsPaid,
}: BookingCoachViewProps) {
  const { colors: palette } = useTheme();
  const handleOpenReconciler = () => {
    router.push(Routes.EARNINGS);
  };
  const hasPrimaryLifecycleAction =
    Boolean(onConfirmBooking) || Boolean(onDeclineRequest) || canCompleteSession;

  if (booking.status === 'Completed') {
    return (
      <View style={styles.actions}>
        <MarkPaidButton bookingId={booking.id} onSuccess={onMarkAsPaid} variant="compact" />
        <Clickable
          onPress={handleOpenReconciler}
          style={({ pressed }) =>
            [
              styles.secondaryButton,
              { borderColor: palette.border },
              pressed && { backgroundColor: palette.border, opacity: 0.7 },
            ].filter(Boolean) as ViewStyle[]
          }
          accessibilityLabel="Open earnings"
        >
          <Ionicons name="cash-outline" size={20} color={palette.foreground} />
          <ThemedText style={styles.secondaryButtonText}>Earnings</ThemedText>
        </Clickable>
      </View>
    );
  }

  return (
    <View style={styles.actions}>
      {onConfirmBooking ? (
        <Clickable
          onPress={onConfirmBooking}
          disabled={isConfirmingBooking || isResolvingRequest}
          accessibilityLabel="Confirm booking request"
          style={({ pressed }) =>
            [
              styles.primaryButton,
              { backgroundColor: palette.tint },
              pressed && { opacity: 0.8 },
              isConfirmingBooking && { opacity: 0.6 },
            ].filter(Boolean) as ViewStyle[]
          }
        >
          {isConfirmingBooking ? (
            <ActivityIndicator size="small" color={palette.onPrimary} />
          ) : (
            <Ionicons name="checkmark-circle-outline" size={20} color={palette.onPrimary} />
          )}
          <ThemedText style={[styles.primaryButtonText, { color: palette.onPrimary }]}>
            {isConfirmingBooking ? 'Confirming...' : 'Confirm booking'}
          </ThemedText>
        </Clickable>
      ) : null}

      {onDeclineRequest ? (
        <Clickable
          onPress={onDeclineRequest}
          disabled={isConfirmingBooking || isResolvingRequest}
          accessibilityLabel="Decline booking request"
          style={({ pressed }) =>
            [
              styles.secondaryButton,
              { borderColor: palette.error },
              pressed && { backgroundColor: withAlpha(palette.error, 0.09), opacity: 0.7 },
              (isConfirmingBooking || isResolvingRequest) && { opacity: 0.6 },
            ].filter(Boolean) as ViewStyle[]
          }
        >
          {isResolvingRequest ? (
            <ActivityIndicator size="small" color={palette.error} />
          ) : (
            <Ionicons name="close-circle-outline" size={20} color={palette.error} />
          )}
          <ThemedText style={[styles.secondaryButtonText, { color: palette.error }]}>
            {isResolvingRequest ? 'Declining...' : 'Decline request'}
          </ThemedText>
        </Clickable>
      ) : null}

      {canCompleteSession && onCompleteSession ? (
        <Clickable
          onPress={onCompleteSession}
          style={({ pressed }) =>
            [
              styles.primaryButton,
              { backgroundColor: palette.tint },
              pressed && { opacity: 0.8 },
            ].filter(Boolean) as ViewStyle[]
          }
        >
          <Ionicons name="checkmark-circle-outline" size={20} color={palette.onPrimary} />
          <ThemedText style={[styles.primaryButtonText, { color: palette.onPrimary }]}>
            Complete session
          </ThemedText>
        </Clickable>
      ) : null}

      <Clickable
        onPress={onMessageClient}
        style={({ pressed }) =>
          [
            hasPrimaryLifecycleAction ? styles.secondaryButton : styles.primaryButton,
            hasPrimaryLifecycleAction
              ? { borderColor: palette.border }
              : { backgroundColor: palette.tint },
            pressed &&
              (hasPrimaryLifecycleAction
                ? { backgroundColor: palette.border, opacity: 0.7 }
                : { opacity: 0.8 }),
          ].filter(Boolean) as ViewStyle[]
        }
      >
        <Ionicons
          name="chatbubble"
          size={20}
          color={hasPrimaryLifecycleAction ? palette.foreground : palette.onPrimary}
        />
        <ThemedText
          style={[
            styles.primaryButtonText,
            { color: hasPrimaryLifecycleAction ? palette.foreground : palette.onPrimary },
          ]}
        >
          Message contact
        </ThemedText>
      </Clickable>

      {onReopenBooking ? (
        <Clickable
          onPress={onReopenBooking}
          style={({ pressed }) =>
            [
              styles.secondaryButton,
              { borderColor: palette.border },
              pressed && { backgroundColor: palette.border, opacity: 0.7 },
            ].filter(Boolean) as ViewStyle[]
          }
        >
          <Ionicons name="refresh-circle-outline" size={20} color={palette.foreground} />
          <ThemedText style={styles.secondaryButtonText}>Reopen booking</ThemedText>
        </Clickable>
      ) : null}

      {canCancelBooking ? (
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
            Cancel booking
          </ThemedText>
        </Clickable>
      ) : null}
    </View>
  );
}

export const BookingCoachView = BookingCoachViewInner;

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
