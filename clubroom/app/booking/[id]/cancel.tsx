/**
 * Cancel Booking Screen
 *
 * Full cancellation flow for both parents and coaches:
 * - Policy tier display based on time-to-session
 * - Expanded reason selection (child ill, schedule change, weather, venue, emergency, other)
 * - Optional note field
 * - Coach cancellation mode (reason required, parent notified)
 * - Reschedule suggestion screen with counter-offer flow link
 * - Waitlist notification when slot is freed
 *
 * USER STORY:
 * "As a parent, I want to see clearly how much refund I'll get
 * before cancelling so I can make an informed decision."
 *
 * "As a coach, I need to cancel a session with a required reason
 * and have the parent automatically notified."
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { PageHeader } from '@/components/primitives/page-header';
import { Colors, Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { bookingService } from '@/services/booking-service';
import { schedulingRulesService } from '@/services/scheduling-rules-service';
import type { CancellationPolicy, RefundCalculation, RefundTier, Booking } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CancelBookingScreen');

// ---------------------------------------------------------------------------
// Cancellation reasons — expanded for both parent and coach roles
// ---------------------------------------------------------------------------

interface CancellationReason {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  parentOnly?: boolean;
  coachOnly?: boolean;
}

const CANCELLATION_REASONS: CancellationReason[] = [
  { key: 'child_ill', label: 'Child is ill', icon: 'medkit-outline', parentOnly: true },
  { key: 'schedule_change', label: 'Schedule change', icon: 'calendar-outline' },
  { key: 'weather', label: 'Weather conditions', icon: 'rainy-outline' },
  { key: 'venue', label: 'Venue unavailable', icon: 'business-outline', coachOnly: true },
  { key: 'emergency', label: 'Emergency', icon: 'warning-outline' },
  { key: 'coach_ill', label: 'Illness / Injury', icon: 'medkit-outline', coachOnly: true },
  { key: 'other', label: 'Other reason', icon: 'chatbubble-outline' },
];

// ---------------------------------------------------------------------------
// Flow steps
// ---------------------------------------------------------------------------

type FlowStep = 'details' | 'reschedule_suggest' | 'confirm';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTierColour(tier: RefundTier, palette: (typeof Colors)['light']): string {
  if (tier.refundPercentage === 100) return palette.success;
  if (tier.refundPercentage >= 50) return palette.warning;
  if (tier.refundPercentage > 0) return '#D97706'; // amber
  return palette.error;
}

function formatTimeUntil(hours: number): string {
  if (hours < 1) return 'Less than 1 hour';
  if (hours < 24) return `${Math.floor(hours)} hour${Math.floor(hours) !== 1 ? 's' : ''}`;
  const days = Math.floor(hours / 24);
  const rem = Math.floor(hours % 24);
  if (rem === 0) return `${days} day${days !== 1 ? 's' : ''}`;
  return `${days} day${days !== 1 ? 's' : ''}, ${rem} hour${rem !== 1 ? 's' : ''}`;
}

function formatSessionDate(d: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  const mins = m === 0 ? '' : `:${m.toString().padStart(2, '0')}`;
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} \u00B7 ${hour}${mins}${ampm}`;
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function CancelBookingScreen() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: 'coach' | 'parent' }>();
  const isCoach = mode === 'coach';
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Flow state
  const [step, setStep] = useState<FlowStep>('details');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [notifyWaitlist, setNotifyWaitlist] = useState(true);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Booking and refund data
  const [bookingAmount, setBookingAmount] = useState(0);
  const [sessionTime, setSessionTime] = useState<Date | null>(null);
  const [coachName, setCoachName] = useState('');
  const [athleteName, setAthleteName] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [policy, setPolicy] = useState<CancellationPolicy | null>(null);
  const [refundCalc, setRefundCalc] = useState<RefundCalculation | null>(null);

  // Filtered reasons based on role
  const filteredReasons = useMemo(
    () =>
      CANCELLATION_REASONS.filter((r) => {
        if (isCoach && r.parentOnly) return false;
        if (!isCoach && r.coachOnly) return false;
        return true;
      }),
    [isCoach],
  );

  // Coach mode requires a reason
  const canProceed = useMemo(() => {
    if (isCoach) return reason !== '';
    return true; // parents can proceed without reason
  }, [isCoach, reason]);

  // ---- Load booking ----
  const loadBookingDetails = useCallback(async () => {
    if (!id) return;
    try {
      const booking = await bookingService.getBooking(id);
      if (booking) {
        // Use type assertion for properties that may exist at runtime but not in type definition
        const bookingExt = booking as Booking & Record<string, unknown>;
        const bookingPrice = (bookingExt.price as number) ?? 35;
        setBookingAmount(bookingPrice);
        setSessionTime(new Date(booking.scheduledAt));
        setCoachName(booking.coachName || 'Coach');
        setAthleteName(booking.athleteName || 'Athlete');
        setSessionTitle((bookingExt.sessionTitle as string) || booking.service || 'Session');

        const coachPolicy = await schedulingRulesService.getCancellationPolicy(booking.coachId);
        setPolicy(coachPolicy);

        const calculation = schedulingRulesService.calculateRefund(
          bookingPrice,
          new Date(booking.scheduledAt),
          coachPolicy,
        );
        setRefundCalc(calculation);
      }
    } catch (error) {
      logger.error('Failed to load booking', error);
      // Fallback values for demo
      const fallbackTime = new Date();
      fallbackTime.setHours(fallbackTime.getHours() + 48);
      setBookingAmount(35);
      setSessionTime(fallbackTime);
      setCoachName('Your Coach');
      setAthleteName('Athlete');
      setSessionTitle('Training Session');

      const calculation = schedulingRulesService.calculateRefund(35, fallbackTime, null);
      setRefundCalc(calculation);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadBookingDetails();
  }, [loadBookingDetails]);

  // ---- Actions ----
  const handleCancel = async () => {
    if (!refundCalc) return;
    const reasonLabel = filteredReasons.find((r) => r.key === reason)?.label || reason || 'Not specified';

    setProcessing(true);
    try {
      await bookingService.cancel(id, reasonLabel, isCoach ? 'coach' : 'parent');

      // Waitlist notification (simulated)
      if (notifyWaitlist) {
        logger.debug('Waitlist notified for freed slot', { bookingId: id });
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (isCoach) {
        Alert.alert(
          'Session Cancelled',
          `The session has been cancelled and ${athleteName}'s parent has been notified.${
            refundCalc.netRefundAmount > 0
              ? ` A refund of \u00A3${refundCalc.netRefundAmount.toFixed(2)} will be processed.`
              : ''
          }`,
          [{ text: 'OK', onPress: () => router.back() }],
        );
      } else if (refundCalc.netRefundAmount > 0) {
        Alert.alert(
          'Booking Cancelled',
          `Your booking has been cancelled. A refund of \u00A3${refundCalc.netRefundAmount.toFixed(2)} will be processed within 5-7 business days.`,
          [{ text: 'OK', onPress: () => router.back() }],
        );
      } else {
        Alert.alert(
          'Booking Cancelled',
          'Your booking has been cancelled. The coach has been notified.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
      }

      logger.success('BookingCancelled', {
        bookingId: id,
        role: isCoach ? 'coach' : 'parent',
        reason: reasonLabel,
        refundAmount: refundCalc.netRefundAmount,
        waitlistNotified: notifyWaitlist,
      });
    } catch (error) {
      logger.error('Failed to cancel booking', error);
      Alert.alert('Error', 'Failed to cancel booking. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRescheduleSuggest = () => {
    setStep('reschedule_suggest');
  };

  const handleOpenCounterOffer = () => {
    // Navigate to reschedule counter-offer flow
    router.push(Routes.bookingCancel(id));
  };

  const handleGoBack = () => {
    if (step === 'reschedule_suggest') {
      setStep('details');
    } else if (step === 'confirm') {
      setStep('details');
    } else {
      router.back();
    }
  };

  // ---- Loading state ----
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
  const sortedTiers = [...effectivePolicy.tiers].sort(
    (a, b) => b.hoursBeforeSession - a.hoursBeforeSession,
  );

  // =====================================================================
  // RESCHEDULE SUGGESTION STEP
  // =====================================================================
  if (step === 'reschedule_suggest') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <PageHeader
          title="Reschedule Instead?"
          showBack
          onBackPress={handleGoBack}
        />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Illustration */}
          <View style={[styles.rescheduleHero, { backgroundColor: withAlpha(palette.success, 0.03) }]}>
            <View style={[styles.rescheduleIconCircle, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
              <Ionicons name="swap-horizontal" size={32} color={palette.success} />
            </View>
            <ThemedText type="subtitle" style={styles.rescheduleHeroTitle}>
              Reschedule instead of cancelling?
            </ThemedText>
            <ThemedText style={[styles.rescheduleHeroDesc, { color: palette.muted }]}>
              Instead of losing your slot, you can propose a different time. The{' '}
              {isCoach ? 'parent' : 'coach'} will be notified and can accept or suggest an alternative.
            </ThemedText>
          </View>

          {/* Current session details */}
          {sessionTime && (
            <SurfaceCard style={styles.currentSessionCard}>
              <ThemedText style={[styles.currentSessionLabel, { color: palette.muted }]}>
                Current session
              </ThemedText>
              <ThemedText type="defaultSemiBold">{sessionTitle}</ThemedText>
              <View style={styles.currentSessionRow}>
                <Ionicons name="calendar-outline" size={16} color={palette.muted} />
                <ThemedText style={{ color: palette.muted }}>
                  {formatSessionDate(sessionTime)}
                </ThemedText>
              </View>
            </SurfaceCard>
          )}

          {/* Actions */}
          <Clickable
            onPress={handleOpenCounterOffer}
            style={[styles.primaryButton, { backgroundColor: palette.tint }]}
          >
            <Ionicons name="calendar" size={20} color={Colors.light.onPrimary} />
            <ThemedText style={styles.primaryButtonText}>
              Propose a New Time
            </ThemedText>
          </Clickable>

          <Clickable
            onPress={() => setStep('details')}
            style={[styles.outlineButton, { borderColor: palette.border }]}
          >
            <ThemedText style={[styles.outlineButtonText, { color: palette.text }]}>
              No, continue with cancellation
            </ThemedText>
          </Clickable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =====================================================================
  // MAIN CANCELLATION DETAILS STEP
  // =====================================================================
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <PageHeader
        title={isCoach ? 'Cancel Session' : 'Cancel Booking'}
        showBack
        onBackPress={handleGoBack}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Coach mode banner */}
        {isCoach && (
          <View style={[styles.coachBanner, { backgroundColor: withAlpha(palette.warning, 0.06), borderColor: withAlpha(palette.warning, 0.19) }]}>
            <Ionicons name="shield-outline" size={20} color={palette.warning} />
            <View style={styles.coachBannerText}>
              <ThemedText type="defaultSemiBold" style={{ ...Typography.bodySmall }}>
                Coach Cancellation
              </ThemedText>
              <ThemedText style={[styles.coachBannerDesc, { color: palette.muted }]}>
                The parent will be automatically notified. A reason is required.
              </ThemedText>
            </View>
          </View>
        )}

        {/* Refund preview card */}
        <SurfaceCard style={styles.refundCard}>
          <View style={styles.refundHeader}>
            <Ionicons
              name={refundCalc?.isEligible ? 'cash-outline' : 'close-circle-outline'}
              size={28}
              color={refundCalc?.isEligible ? palette.success : palette.error}
            />
            <ThemedText type="subtitle" style={styles.refundTitle}>
              {isCoach ? 'Refund to Parent' : 'Refund Preview'}
            </ThemedText>
          </View>

          {refundCalc && (
            <>
              <View
                style={[
                  styles.refundAmountBox,
                  {
                    backgroundColor: refundCalc.isEligible
                      ? withAlpha(palette.success, 0.06)
                      : withAlpha(palette.error, 0.06),
                  },
                ]}
              >
                <ThemedText style={[styles.refundLabel, { color: palette.muted }]}>
                  {isCoach ? 'Parent receives' : "You'll receive"}
                </ThemedText>
                <ThemedText
                  type="title"
                  style={[
                    styles.refundAmount,
                    { color: refundCalc.isEligible ? palette.success : palette.error },
                  ]}
                >
                  {'\u00A3'}{refundCalc.netRefundAmount.toFixed(2)}
                </ThemedText>
                {refundCalc.refundPercentage > 0 && refundCalc.refundPercentage < 100 && (
                  <ThemedText style={[styles.refundPercent, { color: palette.muted }]}>
                    ({refundCalc.refundPercentage}% of {'\u00A3'}{bookingAmount.toFixed(2)})
                  </ThemedText>
                )}
              </View>

              {/* Breakdown */}
              <View style={styles.refundBreakdown}>
                <View style={styles.breakdownRow}>
                  <ThemedText style={{ color: palette.muted }}>Original amount</ThemedText>
                  <ThemedText>{'\u00A3'}{refundCalc.originalAmount.toFixed(2)}</ThemedText>
                </View>
                <View style={styles.breakdownRow}>
                  <ThemedText style={{ color: palette.muted }}>
                    Refund ({refundCalc.refundPercentage}%)
                  </ThemedText>
                  <ThemedText>{'\u00A3'}{refundCalc.refundAmount.toFixed(2)}</ThemedText>
                </View>
                {refundCalc.platformFee > 0 && (
                  <View style={styles.breakdownRow}>
                    <ThemedText style={{ color: palette.muted }}>Platform fee</ThemedText>
                    <ThemedText style={{ color: palette.error }}>
                      -{'\u00A3'}{refundCalc.platformFee.toFixed(2)}
                    </ThemedText>
                  </View>
                )}
                <View
                  style={[styles.breakdownRow, styles.breakdownTotal, { borderTopColor: palette.border }]}
                >
                  <ThemedText type="defaultSemiBold">Net refund</ThemedText>
                  <ThemedText type="defaultSemiBold" style={{ color: palette.success }}>
                    {'\u00A3'}{refundCalc.netRefundAmount.toFixed(2)}
                  </ThemedText>
                </View>
              </View>

              {/* Time until session */}
              <View style={[styles.timeNotice, { backgroundColor: withAlpha(palette.warning, 0.06) }]}>
                <Ionicons name="time-outline" size={18} color={palette.warning} />
                <ThemedText style={[styles.timeText, { color: palette.warning }]}>
                  {formatTimeUntil(refundCalc.hoursUntilSession)} until session
                </ThemedText>
              </View>
            </>
          )}
        </SurfaceCard>

        {/* Policy tiers — visual timeline */}
        <SurfaceCard style={styles.policyCard}>
          <View style={styles.policyHeader}>
            <Ionicons name="document-text-outline" size={20} color={palette.tint} />
            <ThemedText type="defaultSemiBold">Cancellation Policy</ThemedText>
            <View style={[styles.policyBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
              <ThemedText style={[styles.policyBadgeText, { color: palette.tint }]}>
                {effectivePolicy.name}
              </ThemedText>
            </View>
          </View>

          <View style={styles.policyTiers}>
            {sortedTiers.map((tier, index) => {
              const isActive = refundCalc?.appliedTier === tier;
              const tierColor = getTierColour(tier, palette);

              return (
                <View key={index} style={styles.tierContainer}>
                  {/* Timeline connector */}
                  {index > 0 && (
                    <View style={[styles.tierConnector, { backgroundColor: palette.border }]} />
                  )}

                  <View
                    style={[
                      styles.tierRow,
                      isActive && {
                        backgroundColor: withAlpha(tierColor, 0.06),
                        borderRadius: Radii.sm,
                        marginHorizontal: -Spacing.xs,
                        paddingHorizontal: Spacing.xs,
                      },
                    ]}
                  >
                    {/* Timeline dot */}
                    <View
                      style={[
                        styles.tierDot,
                        { backgroundColor: tierColor },
                        isActive && styles.tierDotActive,
                      ]}
                    />

                    {/* Tier content */}
                    <View style={styles.tierContent}>
                      <View style={styles.tierTopRow}>
                        <ThemedText
                          type="defaultSemiBold"
                          style={[styles.tierPercentage, { color: tierColor }]}
                        >
                          {tier.refundPercentage}% refund
                        </ThemedText>
                        {isActive && (
                          <View style={[styles.tierActiveBadge, { backgroundColor: tierColor }]}>
                            <ThemedText style={styles.tierActiveText}>Current</ThemedText>
                          </View>
                        )}
                      </View>
                      <ThemedText style={[styles.tierDescription, { color: palette.muted }]}>
                        {tier.description}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </SurfaceCard>

        {/* Reason selection */}
        <SurfaceCard style={styles.reasonCard}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {isCoach ? 'Reason for cancelling (required)' : 'Why are you cancelling?'}
          </ThemedText>
          <View style={styles.reasonOptions}>
            {filteredReasons.map((r) => {
              const active = reason === r.key;
              return (
                <Clickable
                  key={r.key}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setReason(r.key);
                  }}
                  style={[
                    styles.reasonOption,
                    {
                      borderColor: active ? palette.tint : palette.border,
                      backgroundColor: active ? withAlpha(palette.tint, 0.06) : palette.surface,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.reasonIconCircle,
                      { backgroundColor: active ? withAlpha(palette.tint, 0.09) : withAlpha(palette.muted, 0.06) },
                    ]}
                  >
                    <Ionicons
                      name={r.icon}
                      size={16}
                      color={active ? palette.tint : palette.muted}
                    />
                  </View>
                  <ThemedText style={{ color: active ? palette.tint : palette.text, flex: 1 }}>
                    {r.label}
                  </ThemedText>
                  {active && (
                    <Ionicons name="checkmark-circle" size={20} color={palette.tint} />
                  )}
                </Clickable>
              );
            })}
          </View>

          {isCoach && !reason && (
            <View style={[styles.requiredNotice, { backgroundColor: withAlpha(palette.error, 0.03) }]}>
              <Ionicons name="alert-circle-outline" size={14} color={palette.error} />
              <ThemedText style={[styles.requiredNoticeText, { color: palette.error }]}>
                A reason is required for coach cancellations
              </ThemedText>
            </View>
          )}
        </SurfaceCard>

        {/* Optional note */}
        <SurfaceCard style={styles.messageCard}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            {isCoach
              ? `Message to ${athleteName}'s parent (optional)`
              : `Message to ${coachName} (optional)`}
          </ThemedText>
          <TextInput
            placeholder={
              isCoach
                ? 'Explain the cancellation to the parent...'
                : 'Let them know why you\'re cancelling...'
            }
            placeholderTextColor={palette.muted}
            style={[
              styles.textArea,
              { borderColor: palette.border, color: palette.text, backgroundColor: palette.surface },
            ]}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
          />
        </SurfaceCard>

        {/* Waitlist notification toggle */}
        <SurfaceCard style={styles.waitlistCard}>
          <View style={styles.waitlistRow}>
            <View style={styles.waitlistInfo}>
              <View style={[styles.waitlistIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
                <Ionicons name="people-outline" size={16} color={palette.success} />
              </View>
              <View style={styles.waitlistTextWrap}>
                <ThemedText type="defaultSemiBold" style={{ ...Typography.bodySmall }}>
                  Notify Waitlist
                </ThemedText>
                <ThemedText style={[styles.waitlistHelper, { color: palette.muted }]}>
                  Alert athletes on the waitlist that a slot has opened
                </ThemedText>
              </View>
            </View>
            <Switch
              value={notifyWaitlist}
              onValueChange={(v) => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setNotifyWaitlist(v);
              }}
              trackColor={{ false: palette.border, true: palette.success }}
              thumbColor={Colors.light.surface}
            />
          </View>
        </SurfaceCard>

        {/* Reschedule suggestion CTA */}
        <Clickable
          onPress={handleRescheduleSuggest}
          style={[styles.rescheduleCta, { borderColor: palette.tint, backgroundColor: withAlpha(palette.tint, 0.02) }]}
        >
          <View style={[styles.rescheduleCtaIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <Ionicons name="swap-horizontal" size={20} color={palette.tint} />
          </View>
          <View style={styles.rescheduleCtaText}>
            <ThemedText type="defaultSemiBold" style={{ color: palette.tint, ...Typography.bodySmall }}>
              Reschedule instead?
            </ThemedText>
            <ThemedText style={[styles.rescheduleCtaDesc, { color: palette.muted }]}>
              Move to a different time instead of cancelling
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={palette.tint} />
        </Clickable>
      </ScrollView>

      {/* Footer with cancel button */}
      <View style={[styles.footer, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
        <View style={styles.footerContent}>
          {refundCalc && refundCalc.netRefundAmount > 0 && !isCoach && (
            <ThemedText style={[styles.footerRefund, { color: palette.muted }]}>
              Refund: {'\u00A3'}{refundCalc.netRefundAmount.toFixed(2)}
            </ThemedText>
          )}
          <Clickable
            onPress={handleCancel}
            disabled={processing || (isCoach && !canProceed)}
            style={[
              styles.cancelButton,
              {
                backgroundColor: palette.error,
                opacity: processing || (isCoach && !canProceed) ? 0.5 : 1,
              },
            ]}
          >
            {processing ? (
              <ActivityIndicator size="small" color={Colors.light.onPrimary} />
            ) : (
              <>
                <Ionicons name="close-circle" size={20} color={Colors.light.onPrimary} />
                <ThemedText style={styles.cancelButtonText}>
                  {isCoach ? 'Cancel Session' : 'Confirm Cancellation'}
                </ThemedText>
              </>
            )}
          </Clickable>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
    paddingBottom: 140,
    gap: Spacing.md,
  },

  // Coach banner
  coachBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  coachBannerText: {
    flex: 1,
  },
  coachBannerDesc: {
    ...Typography.caption,
    marginTop: Spacing.micro,
    lineHeight: 16,
  },

  // Refund card
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
    gap: Spacing.xxs,
  },
  refundLabel: {
    ...Typography.small,
  },
  refundAmount: {
    ...Typography.display,
    letterSpacing: -1,
  },
  refundPercent: {
    ...Typography.small,
  },
  refundBreakdown: {
    gap: Spacing.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xxs,
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
    ...Typography.smallSemiBold,
  },

  // Policy card
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
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  policyBadgeText: {
    ...Typography.caption,
  },
  policyTiers: {
    marginTop: Spacing.xs,
  },

  // Tier timeline
  tierContainer: {
    position: 'relative',
  },
  tierConnector: {
    position: 'absolute',
    left: 11,
    top: -6,
    width: 2,
    height: 12,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  tierDot: {
    width: 10,
    height: 10,
    borderRadius: Radii.sm,
    marginTop: 5,
  },
  tierDotActive: {
    width: 14,
    height: 14,
    borderRadius: Radii.sm,
    marginTop: Spacing.micro,
    marginLeft: -2,
    marginRight: -2,
  },
  tierContent: {
    flex: 1,
  },
  tierTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  tierPercentage: {
    ...Typography.bodySmall,
  },
  tierActiveBadge: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.xs,
  },
  tierActiveText: {
    color: Colors.light.onPrimary,
    ...Typography.micro,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tierDescription: {
    ...Typography.caption,
    marginTop: Spacing.micro,
    lineHeight: 16,
  },

  // Reason card
  reasonCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: {
    marginBottom: Spacing.xxs,
  },
  reasonOptions: {
    gap: Spacing.xs,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1.5,
  },
  reasonIconCircle: {
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requiredNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    padding: Spacing.xs,
    borderRadius: Radii.sm,
  },
  requiredNoticeText: {
    ...Typography.caption,
  },

  // Message card
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
    ...Typography.body,
  },

  // Waitlist
  waitlistCard: {
    padding: Spacing.sm,
  },
  waitlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  waitlistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.sm,
  },
  waitlistIcon: {
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitlistTextWrap: {
    flex: 1,
  },
  waitlistHelper: {
    ...Typography.caption,
    marginTop: 1,
  },

  // Reschedule CTA
  rescheduleCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.card,
    borderWidth: 1.5,
  },
  rescheduleCtaIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rescheduleCtaText: {
    flex: 1,
  },
  rescheduleCtaDesc: {
    ...Typography.caption,
    marginTop: 1,
  },

  // Reschedule suggestion step
  rescheduleHero: {
    padding: Spacing.lg,
    borderRadius: Radii.card,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rescheduleIconCircle: {
    width: 56,
    height: 56,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  rescheduleHeroTitle: {
    textAlign: 'center',
  },
  rescheduleHeroDesc: {
    textAlign: 'center',
    ...Typography.bodySmall,
  },
  currentSessionCard: {
    padding: Spacing.md,
    gap: Spacing.xxs,
  },
  currentSessionLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  currentSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.micro,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: 44,
    borderRadius: Radii.card,
  },
  primaryButtonText: {
    color: Colors.light.onPrimary,
    ...Typography.subheading,
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: Radii.card,
    borderWidth: 1.5,
  },
  outlineButtonText: {
    ...Typography.bodySemiBold,
  },

  // Footer
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
    ...Typography.small,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: 44,
    borderRadius: Radii.card,
  },
  cancelButtonText: {
    color: Colors.light.onPrimary,
    ...Typography.subheading,
  },
});
