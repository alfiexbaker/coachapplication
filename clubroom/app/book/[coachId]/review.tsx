import { useEffect, useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { BookingWizardHeader, SummaryRow } from '@/components/ui/booking/booking-wizard';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import {
  BookingTotalsCard,
  PaymentMethodCard,
  PromoCodeCard,
} from '@/components/ui/booking/review-payment-sections';
import { CancellationPolicyCard } from '@/components/booking/cancellation-policy-card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { err, ok, serviceError } from '@/types/result';
import { useBookingFlow } from '@/context/booking-flow-context';
import { coachService } from '@/services/coach-service';
import type { Coach } from '@/services/coach-service';
import { schedulingRulesService } from '@/services/scheduling-rules-service';
import type { CancellationPolicy } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('BookingReview');

const PLATFORM_FEE_PERCENT = 0.15; // 15% platform fee

interface ReviewLoadData {
  coach: Coach | null;
  cancellationPolicy: CancellationPolicy;
}

export default function ReviewScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const { draft, updateDraft } = useBookingFlow();
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState<string | null>(null);

  const loadCoach = useCallback(async () => {
    if (!coachId) {
      return err(serviceError('UNKNOWN', 'Coach not provided for booking review.'));
    }
    try {
      const [coachResult, policyResult] = await Promise.all([
        coachService.getCoach(coachId),
        schedulingRulesService.getCancellationPolicy(coachId),
      ]);
      if (!coachResult.success) {
        if (coachResult.error.code === 'NOT_FOUND') {
          return ok<ReviewLoadData | null>(null);
        }
        return err(coachResult.error);
      }

      const cancellationPolicy =
        policyResult.success && policyResult.data
          ? policyResult.data
          : schedulingRulesService.getDefaultCancellationPolicy();

      return ok<ReviewLoadData | null>({
        coach: coachResult.data,
        cancellationPolicy,
      });
    } catch (loadError) {
      logger.error('Failed to load coach:', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load coach details for review.', loadError));
    }
  }, [coachId]);

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    colors: palette,
  } = useScreen<ReviewLoadData | null>({
    load: loadCoach,
    deps: [loadCoach],
    isEmpty: (reviewData) => reviewData === null,
    refetchOnFocus: true,
  });
  const coach = data?.coach ?? null;
  const cancellationPolicy = data?.cancellationPolicy ?? null;

  useEffect(() => {
    if (coach?.name) {
      updateDraft({ coachName: coach.name });
    }
  }, [coach?.name, updateDraft]);

  // Calculate price based on coach's actual rate
  const getSessionPrice = () => {
    // Use minPriceUsd from Coach type, fallback to 60
    const coachRate = coach?.minPriceUsd ?? 60;
    if (!coachRate) return 60; // Default fallback

    // Coach minPriceUsd is their hourly rate
    // Adjust for session type
    const baseRate = coachRate;
    switch (draft.sessionType) {
      case '1-on-1':
        return baseRate; // Standard rate for 1-on-1
      case 'team':
        return baseRate * 1.5; // 50% more for team sessions
      case 'group':
        return baseRate * 0.7; // 30% less for group (split cost)
      default:
        return baseRate;
    }
  };

  const sessionPrice = getSessionPrice();
  const platformFee = Math.round(sessionPrice * PLATFORM_FEE_PERCENT * 100) / 100;
  const subtotal = sessionPrice + platformFee;
  const total = Math.max(0, subtotal - promoDiscount);

  // Handle promo code application
  const handleApplyPromo = () => {
    setPromoError(null);
    const code = promoCode.trim().toUpperCase();

    // Demo promo codes
    const promoCodes: Record<string, number> = {
      FIRST10: 0.1, // 10% off
      WELCOME20: 0.2, // 20% off
      VIP50: 0.5, // 50% off
    };

    if (promoCodes[code]) {
      const discount = Math.round(subtotal * promoCodes[code] * 100) / 100;
      setPromoDiscount(discount);
      setPromoApplied(true);
    } else {
      setPromoError('Invalid promo code');
    }
  };

  const handleRemovePromo = () => {
    setPromoCode('');
    setPromoApplied(false);
    setPromoDiscount(0);
    setPromoError(null);
  };

  if (status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <ErrorState
          message={error?.message ?? 'Failed to load booking review details.'}
          onRetry={retry}
        />
      </SafeAreaView>
    );
  }

  if (status === 'empty') {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <EmptyState
          icon="person-outline"
          title="Coach unavailable"
          message="We could not load this coach's profile for review. Go back and choose another coach."
          actionLabel="Go back"
          onPressAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />
        }
      >
        <BookingWizardHeader title="Review & pay" subtitle="Confirm booking details" step={4} />

        <View style={[styles.card, { borderColor: palette.border }]}>
          <SummaryRow label="Coach" value={coach?.name || draft.coachName || 'Coach'} />
          <SummaryRow label="Date" value={draft.date || 'Pick a date'} />
          <SummaryRow label="Time" value={draft.slot || 'Pick a slot'} />
          <SummaryRow label="Session" value={draft.sessionType || 'Select type'} />
          <SummaryRow label="Location" value={draft.locationOption || 'Coach preferred location'} />
          {draft.athleteName && <SummaryRow label="Athlete" value={draft.athleteName} />}
        </View>

        <PaymentMethodCard
          colors={palette}
          paymentMethod={
            (draft as unknown as Record<string, string>).paymentMethod || 'Wallet balance'
          }
          onChange={() => router.push(Routes.PAYMENT_METHODS)}
        />

        <PromoCodeCard
          colors={palette}
          promoCode={promoCode}
          promoApplied={promoApplied}
          promoError={promoError}
          onPromoCodeChange={setPromoCode}
          onApplyPromo={handleApplyPromo}
          onRemovePromo={handleRemovePromo}
        />

        {coach && cancellationPolicy && (
          <>
            <CancellationPolicyCard coachId={coach.id} policy={cancellationPolicy} />
            <ThemedText style={[styles.policyNote, { color: palette.muted }]}>
              By continuing, you agree to this cancellation policy and any applicable refund rules.
            </ThemedText>
          </>
        )}

        <BookingTotalsCard
          colors={palette}
          sessionPrice={sessionPrice}
          platformFee={platformFee}
          promoDiscount={promoDiscount}
          total={total}
        />

        {coach?.minPriceUsd && (
          <ThemedText style={[styles.rateNote, { color: palette.muted }]}>
            {coach.name}&apos;s rate: £{coach.minPriceUsd}/hour
          </ThemedText>
        )}
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <Clickable
          onPress={() => {
            // Store final price in draft
            updateDraft({ totalPrice: total, price: sessionPrice });
            router.push(Routes.bookConfirmation(coachId));
          }}
          style={[styles.cta, { backgroundColor: palette.tint }]}
        >
          <Row justify="center" align="center" gap="sm">
            <Ionicons
              name={promoApplied ? 'checkmark-circle' : 'card-outline'}
              size={18}
              color={palette.onPrimary}
            />
            <ThemedText style={{ color: palette.onPrimary, fontWeight: '700' }}>
              {promoApplied ? `Pay £${total.toFixed(2)}` : `Continue to pay £${total.toFixed(2)}`}
            </ThemedText>
          </Row>
        </Clickable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  card: { padding: Spacing.lg, borderRadius: Radii.lg, borderWidth: 1.5, gap: Spacing.xs },
  policyNote: { ...Typography.caption, textAlign: 'center', marginTop: -Spacing.sm },
  rateNote: { ...Typography.caption, textAlign: 'center' },
  footer: { padding: Spacing.lg, borderTopWidth: 1 },
  cta: { padding: Spacing.md, borderRadius: Radii.button },
});
