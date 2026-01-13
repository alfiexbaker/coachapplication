/**
 * Cancel Booking Screen
 *
 * Allows users to cancel a booking with clear refund preview:
 * - Shows cancellation policy
 * - Calculates and displays expected refund
 * - Allows selection of cancellation reason
 * - Optional message to coach
 *
 * USER STORY:
 * "As a parent, I want to see clearly how much refund I'll get
 * before cancelling so I can make an informed decision."
 */

import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, ScrollView, StyleSheet, TextInput, View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { PageHeader } from '@/components/primitives/page-header';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { bookingService } from '@/services/booking-service';
import { schedulingRulesService } from '@/services/scheduling-rules-service';
import type { CancellationPolicy, RefundCalculation } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CancelBookingScreen');

const CANCELLATION_REASONS = [
  { key: 'schedule', label: 'Schedule conflict' },
  { key: 'weather', label: 'Weather conditions' },
  { key: 'illness', label: 'Injury/Illness' },
  { key: 'other_coach', label: 'Found another coach' },
  { key: 'cost', label: 'Cost concerns' },
  { key: 'other', label: 'Other reason' },
];

export default function CancelBookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [reason, setReason] = useState(CANCELLATION_REASONS[0].key);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Booking and refund data
  const [bookingAmount, setBookingAmount] = useState(0);
  const [sessionTime, setSessionTime] = useState<Date | null>(null);
  const [coachName, setCoachName] = useState('');
  const [policy, setPolicy] = useState<CancellationPolicy | null>(null);
  const [refundCalc, setRefundCalc] = useState<RefundCalculation | null>(null);

  useEffect(() => {
    loadBookingDetails();
  }, [id]);

  const loadBookingDetails = async () => {
    if (!id) return;

    try {
      // Get booking details (mock data for now)
      const booking = await bookingService.getBooking(id);
      if (booking) {
        setBookingAmount(booking.price || 35); // Default price if not set
        setSessionTime(new Date(booking.scheduledAt));
        setCoachName(booking.coachName || 'Coach');

        // Load coach's cancellation policy
        const coachPolicy = await schedulingRulesService.getCancellationPolicy(booking.coachId);
        setPolicy(coachPolicy);

        // Calculate refund
        const calculation = schedulingRulesService.calculateRefund(
          booking.price || 35,
          new Date(booking.scheduledAt),
          coachPolicy
        );
        setRefundCalc(calculation);
      }
    } catch (error) {
      logger.error('Failed to load booking', error);
      // Use fallback values for demo
      const fallbackTime = new Date();
      fallbackTime.setHours(fallbackTime.getHours() + 48);
      setBookingAmount(35);
      setSessionTime(fallbackTime);
      setCoachName('Your Coach');

      const calculation = schedulingRulesService.calculateRefund(
        35,
        fallbackTime,
        null
      );
      setRefundCalc(calculation);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!refundCalc) return;

    const reasonLabel = CANCELLATION_REASONS.find(r => r.key === reason)?.label || reason;

    setProcessing(true);
    try {
      await bookingService.cancel(id, reasonLabel);

      // Show appropriate message based on refund
      if (refundCalc.netRefundAmount > 0) {
        Alert.alert(
          'Booking Cancelled',
          `Your booking has been cancelled. A refund of £${refundCalc.netRefundAmount.toFixed(2)} will be processed within 5-7 business days.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          'Booking Cancelled',
          'Your booking has been cancelled. The coach has been notified.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }

      logger.success('BookingCancelled', {
        bookingId: id,
        reason: reasonLabel,
        refundAmount: refundCalc.netRefundAmount,
      });
    } catch (error) {
      logger.error('Failed to cancel booking', error);
      Alert.alert('Error', 'Failed to cancel booking. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const formatTimeUntilSession = () => {
    if (!refundCalc) return '';
    const hours = refundCalc.hoursUntilSession;
    if (hours < 1) return 'Less than 1 hour';
    if (hours < 24) return `${Math.floor(hours)} hours`;
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    if (remainingHours === 0) return `${days} day${days !== 1 ? 's' : ''}`;
    return `${days} day${days !== 1 ? 's' : ''}, ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <PageHeader title="Cancel Booking" showBack onBackPress={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      </SafeAreaView>
    );
  }

  const effectivePolicy = policy || schedulingRulesService.getDefaultCancellationPolicy();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <PageHeader title="Cancel Booking" showBack onBackPress={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Refund Preview Card */}
        <SurfaceCard style={styles.refundCard}>
          <View style={styles.refundHeader}>
            <Ionicons
              name={refundCalc?.isEligible ? 'cash-outline' : 'close-circle-outline'}
              size={28}
              color={refundCalc?.isEligible ? palette.success : palette.error}
            />
            <ThemedText type="subtitle" style={styles.refundTitle}>
              Refund Preview
            </ThemedText>
          </View>

          {refundCalc && (
            <>
              <View style={[styles.refundAmountBox, {
                backgroundColor: refundCalc.isEligible ? `${palette.success}10` : `${palette.error}10`,
              }]}>
                <ThemedText style={[styles.refundLabel, { color: palette.muted }]}>
                  You'll receive
                </ThemedText>
                <ThemedText type="title" style={[
                  styles.refundAmount,
                  { color: refundCalc.isEligible ? palette.success : palette.error }
                ]}>
                  £{refundCalc.netRefundAmount.toFixed(2)}
                </ThemedText>
                {refundCalc.refundPercentage > 0 && refundCalc.refundPercentage < 100 && (
                  <ThemedText style={[styles.refundPercent, { color: palette.muted }]}>
                    ({refundCalc.refundPercentage}% of £{bookingAmount.toFixed(2)})
                  </ThemedText>
                )}
              </View>

              <View style={styles.refundBreakdown}>
                <View style={styles.breakdownRow}>
                  <ThemedText style={{ color: palette.muted }}>Original amount</ThemedText>
                  <ThemedText>£{refundCalc.originalAmount.toFixed(2)}</ThemedText>
                </View>
                <View style={styles.breakdownRow}>
                  <ThemedText style={{ color: palette.muted }}>Refund ({refundCalc.refundPercentage}%)</ThemedText>
                  <ThemedText>£{refundCalc.refundAmount.toFixed(2)}</ThemedText>
                </View>
                {refundCalc.platformFee > 0 && (
                  <View style={styles.breakdownRow}>
                    <ThemedText style={{ color: palette.muted }}>Platform fee</ThemedText>
                    <ThemedText style={{ color: palette.error }}>-£{refundCalc.platformFee.toFixed(2)}</ThemedText>
                  </View>
                )}
                <View style={[styles.breakdownRow, styles.breakdownTotal, { borderTopColor: palette.border }]}>
                  <ThemedText type="defaultSemiBold">Net refund</ThemedText>
                  <ThemedText type="defaultSemiBold" style={{ color: palette.success }}>
                    £{refundCalc.netRefundAmount.toFixed(2)}
                  </ThemedText>
                </View>
              </View>

              <View style={[styles.timeNotice, { backgroundColor: `${palette.warning}10` }]}>
                <Ionicons name="time-outline" size={18} color={palette.warning} />
                <ThemedText style={[styles.timeText, { color: palette.warning }]}>
                  {formatTimeUntilSession()} until session
                </ThemedText>
              </View>
            </>
          )}
        </SurfaceCard>

        {/* Cancellation Policy */}
        <SurfaceCard style={styles.policyCard}>
          <View style={styles.policyHeader}>
            <Ionicons name="document-text-outline" size={20} color={palette.tint} />
            <ThemedText type="defaultSemiBold">Cancellation Policy</ThemedText>
            <View style={[styles.policyBadge, { backgroundColor: `${palette.tint}15` }]}>
              <ThemedText style={[styles.policyBadgeText, { color: palette.tint }]}>
                {effectivePolicy.name}
              </ThemedText>
            </View>
          </View>

          <View style={styles.policyTiers}>
            {effectivePolicy.tiers.map((tier, index) => (
              <View
                key={index}
                style={[
                  styles.tierRow,
                  refundCalc?.appliedTier === tier && {
                    backgroundColor: `${palette.tint}10`,
                    borderRadius: Radii.sm,
                    marginHorizontal: -Spacing.sm,
                    paddingHorizontal: Spacing.sm,
                  }
                ]}
              >
                <View style={[
                  styles.tierDot,
                  {
                    backgroundColor: tier.refundPercentage === 100
                      ? palette.success
                      : tier.refundPercentage > 0
                        ? palette.warning
                        : palette.error
                  }
                ]} />
                <ThemedText style={styles.tierText}>{tier.description}</ThemedText>
                {refundCalc?.appliedTier === tier && (
                  <Ionicons name="checkmark-circle" size={18} color={palette.tint} />
                )}
              </View>
            ))}
          </View>
        </SurfaceCard>

        {/* Reason Selection */}
        <SurfaceCard style={styles.reasonCard}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Why are you cancelling?
          </ThemedText>
          <View style={styles.reasonOptions}>
            {CANCELLATION_REASONS.map((r) => {
              const active = reason === r.key;
              return (
                <Clickable
                  key={r.key}
                  onPress={() => setReason(r.key)}
                  style={[
                    styles.reasonOption,
                    {
                      borderColor: active ? palette.tint : palette.border,
                      backgroundColor: active ? `${palette.tint}10` : palette.surface,
                    }
                  ]}
                >
                  <View style={[
                    styles.radioOuter,
                    { borderColor: active ? palette.tint : palette.border }
                  ]}>
                    {active && <View style={[styles.radioInner, { backgroundColor: palette.tint }]} />}
                  </View>
                  <ThemedText style={{ color: active ? palette.tint : palette.text }}>
                    {r.label}
                  </ThemedText>
                </Clickable>
              );
            })}
          </View>
        </SurfaceCard>

        {/* Message to Coach */}
        <SurfaceCard style={styles.messageCard}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Message to {coachName} (optional)
          </ThemedText>
          <TextInput
            placeholder="Let them know why you're cancelling..."
            placeholderTextColor={palette.muted}
            style={[
              styles.textArea,
              { borderColor: palette.border, color: palette.text, backgroundColor: palette.surface }
            ]}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
          />
        </SurfaceCard>
      </ScrollView>

      {/* Footer with Cancel Button */}
      <View style={[styles.footer, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
        <View style={styles.footerContent}>
          {refundCalc && refundCalc.netRefundAmount > 0 && (
            <ThemedText style={[styles.footerRefund, { color: palette.muted }]}>
              Refund: £{refundCalc.netRefundAmount.toFixed(2)}
            </ThemedText>
          )}
          <Clickable
            onPress={handleCancel}
            disabled={processing}
            style={[styles.cancelButton, { backgroundColor: palette.error, opacity: processing ? 0.6 : 1 }]}
          >
            {processing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="close-circle" size={20} color="#fff" />
                <ThemedText style={styles.cancelButtonText}>Confirm Cancellation</ThemedText>
              </>
            )}
          </Clickable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.md,
    paddingBottom: 120,
    gap: Spacing.md,
  },
  refundCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  refundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  refundTitle: {
    flex: 1,
  },
  refundAmountBox: {
    padding: Spacing.lg,
    borderRadius: Radii.md,
    alignItems: 'center',
    gap: 4,
  },
  refundLabel: {
    fontSize: 13,
  },
  refundAmount: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  refundPercent: {
    fontSize: 13,
  },
  refundBreakdown: {
    gap: Spacing.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakdownTotal: {
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
  },
  timeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  policyCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  policyBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  policyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  policyTiers: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 6,
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tierText: {
    flex: 1,
    fontSize: 14,
  },
  reasonCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  reasonOptions: {
    gap: Spacing.xs,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  messageCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  textArea: {
    minHeight: 100,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    padding: Spacing.md,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  footerContent: {
    gap: Spacing.xs,
  },
  footerRefund: {
    textAlign: 'center',
    fontSize: 13,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.button,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
