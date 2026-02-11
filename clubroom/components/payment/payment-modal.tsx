import { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { createLogger } from '@/utils/logger';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, Components } from '@/constants/theme';
import type { SessionInvite, TimeSlot } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import {
  getSessionInviteAthleteNames,
  getSessionInviteCoachName,
} from '@/utils/session-invite-display';
import {
  PaymentProcessingView,
  PaymentSuccessView,
  SessionSummaryCard,
  PaymentBreakdownCard,
  PaymentMethodCard,
  SecurityNote,
} from './payment-modal-sections';

const logger = createLogger('PaymentModal');

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onPaymentComplete: () => Promise<void>;
  invite: SessionInvite | null;
  selectedSlot: TimeSlot | null;
}

export function PaymentModal({
  visible,
  onClose,
  onPaymentComplete,
  invite,
  selectedSlot,
}: PaymentModalProps) {
  const { colors: palette } = useTheme();

  const [processing, setProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'review' | 'processing' | 'success'>('review');

  if (!invite || !selectedSlot) return null;

  const price = invite.priceUsd || 0;
  const coachName = getSessionInviteCoachName(invite);
  const athleteNames = getSessionInviteAthleteNames(invite);
  const serviceFee = Math.round(price * 0.05 * 100) / 100;
  const total = price + serviceFee;

  const slotDate = new Date(selectedSlot.date);
  const formattedDate = slotDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const handlePayment = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setProcessing(true);
    setPaymentStep('processing');

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setPaymentStep('success');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await new Promise((resolve) => setTimeout(resolve, 800));
      await onPaymentComplete();
      setPaymentStep('review');
    } catch (error) {
      logger.error('Payment failed:', error);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPaymentStep('review');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    if (!processing) {
      setPaymentStep('review');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        {/* Header */}
        <Row
          align="center"
          justify="space-between"
          style={[styles.header, { borderBottomColor: palette.border }]}
        >
          <Clickable
            onPress={handleClose}
            disabled={processing}
            hitSlop={10}
            accessibilityLabel="Close payment modal"
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={24} color={processing ? palette.muted : palette.text} />
          </Clickable>
          <ThemedText type="subtitle">Payment</ThemedText>
          <View style={styles.closeBtn} />
        </Row>

        {paymentStep === 'processing' ? (
          <PaymentProcessingView palette={palette} />
        ) : paymentStep === 'success' ? (
          <PaymentSuccessView palette={palette} />
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <SessionSummaryCard
                coachName={coachName}
                sessionType={invite.sessionType}
                focus={invite.focus}
                formattedDate={formattedDate}
                startTime={selectedSlot.startTime}
                endTime={selectedSlot.endTime}
                location={selectedSlot.location}
                athleteNames={athleteNames}
                palette={palette}
              />

              <PaymentBreakdownCard
                price={price}
                serviceFee={serviceFee}
                total={total}
                palette={palette}
              />

              <PaymentMethodCard palette={palette} />

              <SecurityNote palette={palette} />
            </ScrollView>

            {/* Pay Button */}
            <View style={[styles.footer, { borderTopColor: palette.border }]}>
              <Clickable
                onPress={handlePayment}
                disabled={processing}
                style={[styles.payButton, { backgroundColor: palette.tint }]}
              >
                <Ionicons name="lock-closed" size={18} color={palette.onPrimary} />
                <ThemedText style={[styles.payButtonText, { color: palette.onPrimary }]}>
                  Pay £{total.toFixed(2)}
                </ThemedText>
              </Clickable>
              <ThemedText style={[styles.termsText, { color: palette.muted }]}>
                By paying, you agree to our Terms of Service
              </ThemedText>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Components.modal.padding,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Components.modal.padding,
    gap: Spacing.xl,
    paddingBottom: Spacing['2xl'],
  },
  footer: {
    padding: Components.modal.padding,
    gap: Spacing.sm,
    borderTopWidth: 1,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  payButtonText: { ...Typography.subheading },
  termsText: { ...Typography.caption, textAlign: 'center' },
});
