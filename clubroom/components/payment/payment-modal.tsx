import { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SessionInvite, TimeSlot } from '@/constants/types';

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
      console.error('Payment failed:', error);
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
          <Clickable onPress={handleClose} disabled={processing}>
            <Ionicons name="close" size={24} color={processing ? palette.muted : palette.text} />
          </Clickable>
          <ThemedText type="subtitle">Payment</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        {paymentStep === 'processing' ? (
          <View style={styles.processingContainer}>
            <View style={[styles.processingIcon, { backgroundColor: `${palette.tint}15` }]}>
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
            <View style={[styles.successIcon, { backgroundColor: `${palette.success}15` }]}>
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
                    <View style={[styles.coachAvatar, { backgroundColor: `${palette.tint}15` }]}>
                      <ThemedText style={[styles.coachInitials, { color: palette.tint }]}>
                        {invite.coachName.split(' ').map((n) => n[0]).join('')}
                      </ThemedText>
                    </View>
                    <View style={styles.sessionInfo}>
                      <ThemedText type="defaultSemiBold">{invite.coachName}</ThemedText>
                      <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
                        {invite.sessionType} - {invite.focus}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: palette.border }]} />

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
                  <View style={[styles.totalDivider, { backgroundColor: palette.border }]} />
                  <View style={styles.priceRow}>
                    <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>Total</ThemedText>
                    <ThemedText type="defaultSemiBold" style={{ fontSize: 18, color: palette.tint }}>
                      £{total.toFixed(2)}
                    </ThemedText>
                  </View>
                </SurfaceCard>
              </View>

              {/* Payment Method */}
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Payment Method</ThemedText>
                <SurfaceCard style={styles.methodCard}>
                  <View style={[styles.cardIcon, { backgroundColor: `${palette.tint}10` }]}>
                    <Ionicons name="card" size={24} color={palette.tint} />
                  </View>
                  <View style={styles.cardInfo}>
                    <ThemedText type="defaultSemiBold">•••• •••• •••• 4242</ThemedText>
                    <ThemedText style={{ color: palette.muted, fontSize: 12 }}>Expires 12/26</ThemedText>
                  </View>
                  <Clickable style={[styles.changeButton, { borderColor: palette.border }]}>
                    <ThemedText style={{ color: palette.tint, fontSize: 13, fontWeight: '600' }}>
                      Change
                    </ThemedText>
                  </Clickable>
                </SurfaceCard>
              </View>

              {/* Security Note */}
              <View style={[styles.securityNote, { backgroundColor: `${palette.success}08` }]}>
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
                <Ionicons name="lock-closed" size={18} color="#fff" />
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.xl,
    paddingBottom: Spacing['2xl'],
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sessionCard: {
    padding: Spacing.md,
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
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachInitials: {
    fontSize: 18,
    fontWeight: '700',
  },
  sessionInfo: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: 1,
  },
  detailsList: {
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailText: {
    fontSize: 14,
    flex: 1,
  },
  paymentCard: {
    padding: Spacing.md,
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
    gap: 4,
  },
  totalDivider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: 2,
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
  securityText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    padding: Spacing.lg,
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
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  termsText: {
    textAlign: 'center',
    fontSize: 12,
  },
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
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  processingTitle: {
    textAlign: 'center',
  },
  processingText: {
    textAlign: 'center',
    fontSize: 14,
  },
});
