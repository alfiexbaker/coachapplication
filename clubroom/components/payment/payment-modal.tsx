import { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { createLogger } from '@/utils/logger';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography, Components , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SessionInvite, TimeSlot } from '@/constants/types';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [processing, setProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'review' | 'processing' | 'success'>('review');

  if (!invite || !selectedSlot) return null;

  const price = invite.priceUsd || 0;
  const serviceFee = Math.round(price * 0.05 * 100) / 100; // 5% service fee
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
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setPaymentStep('success');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Brief delay to show success, then complete
      await new Promise((resolve) => setTimeout(resolve, 800));
      await onPaymentComplete();

      // Reset state after close
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
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <Pressable
            onPress={handleClose}
            disabled={processing}
            hitSlop={10}
            accessibilityLabel="Close payment modal"
            accessibilityRole="button"
            style={{
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={24} color={processing ? palette.muted : palette.text} />
          </Pressable>
          <ThemedText type="subtitle">Payment</ThemedText>
          <View style={{ width: 44 }} />
        </View>

        {paymentStep === 'processing' ? (
          <View style={styles.processingContainer}>
            <View style={[styles.processingIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
              <ActivityIndicator size="large" color={palette.tint} />
            </View>
            <ThemedText type="subtitle" style={styles.processingTitle}>
              Processing Payment
            </ThemedText>
            <ThemedText style={[styles.processingText, { color: palette.muted }]}>
              Please wait while we process your payment...
            </ThemedText>
          </View>
        ) : paymentStep === 'success' ? (
          <View style={styles.processingContainer}>
            <View style={[styles.successIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
              <Ionicons name="checkmark-circle" size={64} color={palette.success} />
            </View>
            <ThemedText type="subtitle" style={styles.processingTitle}>
              Payment Successful!
            </ThemedText>
            <ThemedText style={[styles.processingText, { color: palette.muted }]}>
              Your session has been booked
            </ThemedText>
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              {/* Session Summary */}
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Session Details</ThemedText>
                <SurfaceCard style={styles.sessionCard}>
                  <View style={styles.sessionRow}>
                    <View style={[styles.coachAvatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                      <ThemedText style={[styles.coachInitials, { color: palette.tint }]}>
                        {invite.coachName.split(' ').map((n) => n[0]).join('')}
                      </ThemedText>
                    </View>
                    <View style={styles.sessionInfo}>
                      <ThemedText type="defaultSemiBold">{invite.coachName}</ThemedText>
                      <ThemedText style={{ ...Typography.small, color: palette.muted }}>
                        {invite.sessionType} - {invite.focus}
                      </ThemedText>
                    </View>
                  </View>

                  <Divider />

                  <View style={styles.detailsList}>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={18} color={palette.muted} />
                      <ThemedText style={styles.detailText}>{formattedDate}</ThemedText>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="time-outline" size={18} color={palette.muted} />
                      <ThemedText style={styles.detailText}>
                        {selectedSlot.startTime} - {selectedSlot.endTime}
                      </ThemedText>
                    </View>
                    {selectedSlot.location && (
                      <View style={styles.detailRow}>
                        <Ionicons name="location-outline" size={18} color={palette.muted} />
                        <ThemedText style={styles.detailText}>{selectedSlot.location}</ThemedText>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Ionicons name="people-outline" size={18} color={palette.muted} />
                      <ThemedText style={styles.detailText}>
                        {invite.athleteNames.join(', ')}
                      </ThemedText>
                    </View>
                  </View>
                </SurfaceCard>
              </View>

              {/* Payment Breakdown */}
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Payment Summary</ThemedText>
                <SurfaceCard style={styles.paymentCard}>
                  <View style={styles.priceRow}>
                    <ThemedText style={{ color: palette.text }}>Session fee</ThemedText>
                    <ThemedText style={{ color: palette.text }}>£{price.toFixed(2)}</ThemedText>
                  </View>
                  <View style={styles.priceRow}>
                    <View style={styles.feeLabel}>
                      <ThemedText style={{ color: palette.muted }}>Service fee</ThemedText>
                      <Ionicons name="information-circle-outline" size={14} color={palette.muted} />
                    </View>
                    <ThemedText style={{ color: palette.muted }}>£{serviceFee.toFixed(2)}</ThemedText>
                  </View>
                  <Divider spacing={Spacing.xs} />
                  <View style={styles.priceRow}>
                    <ThemedText type="defaultSemiBold" style={{ ...Typography.subheading }}>Total</ThemedText>
                    <ThemedText type="defaultSemiBold" style={{ ...Typography.heading, color: palette.tint }}>
                      £{total.toFixed(2)}
                    </ThemedText>
                  </View>
                </SurfaceCard>
              </View>

              {/* Payment Method */}
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Payment Method</ThemedText>
                <SurfaceCard style={styles.methodCard}>
                  <View style={[styles.cardIcon, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                    <Ionicons name="card" size={24} color={palette.tint} />
                  </View>
                  <View style={styles.cardInfo}>
                    <ThemedText type="defaultSemiBold">•••• •••• •••• 4242</ThemedText>
                    <ThemedText style={{ ...Typography.caption, color: palette.muted }}>Expires 12/26</ThemedText>
                  </View>
                  <Clickable style={[styles.changeButton, { borderColor: palette.border }]}>
                    <ThemedText style={ { color: palette.tint, ...Typography.smallSemiBold }}>
                      Change
                    </ThemedText>
                  </Clickable>
                </SurfaceCard>
              </View>

              {/* Security Note */}
              <View style={[styles.securityNote, { backgroundColor: withAlpha(palette.success, 0.03) }]}>
                <Ionicons name="shield-checkmark" size={18} color={palette.success} />
                <ThemedText style={[styles.securityText, { color: palette.success }]}>
                  Your payment is secured with 256-bit encryption
                </ThemedText>
              </View>
            </ScrollView>

            {/* Pay Button */}
            <View style={[styles.footer, { borderTopColor: palette.border }]}>
              <Clickable
                onPress={handlePayment}
                disabled={processing}
                style={[styles.payButton, { backgroundColor: palette.tint }]}
              >
                <Ionicons name="lock-closed" size={18} color={palette.onPrimary} />
                <ThemedText style={styles.payButtonText}>
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Components.modal.padding,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  content: {
    padding: Components.modal.padding,
    gap: Spacing.xl,
    paddingBottom: Spacing['2xl'],
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: { ...Typography.subheading },
  sessionCard: {
    padding: Components.card.padding,
    gap: Spacing.md,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  coachAvatar: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachInitials: { ...Typography.heading },
  sessionInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  detailsList: {
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailText: { ...Typography.bodySmall, flex: 1 },
  paymentCard: {
    padding: Components.card.padding,
    gap: Spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Components.card.padding,
    gap: Spacing.md,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  changeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  securityText: { ...Typography.smallSemiBold, flex: 1 },
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
  payButtonText: { ...Typography.subheading, color: Colors.light.onPrimary },
  termsText: { ...Typography.caption, textAlign: 'center' },
  // Processing states
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['2xl'],
    gap: Spacing.md,
  },
  processingIcon: {
    width: 100,
    height: 100,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  processingTitle: {
    textAlign: 'center',
  },
  processingText: { ...Typography.bodySmall, textAlign: 'center' },
});
