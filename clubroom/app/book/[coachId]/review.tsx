import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View, ActivityIndicator, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { BookingWizardHeader, SummaryRow } from '@/components/ui/booking/booking-wizard';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useBookingFlow } from '@/context/booking-flow-context';
import { coachService } from '@/services/coach-service';
import type { Coach } from '@/services/coach-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('BookingReview');

const PLATFORM_FEE_PERCENT = 0.15; // 15% platform fee

export default function ReviewScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const { draft, updateDraft } = useBookingFlow();
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });

  const [coach, setCoach] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Load coach data to get actual rates
  useEffect(() => {
    const loadCoach = async () => {
      if (!coachId) return;
      try {
        const coachResult = await coachService.getCoach(coachId);
        if (coachResult.success) {
          setCoach(coachResult.data);
          // Store coach name in draft for confirmation
          updateDraft({ coachName: coachResult.data.name });
        }
      } catch (error) {
        logger.error('Failed to load coach:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCoach();
  }, [coachId, updateDraft]);

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
      'FIRST10': 0.10,      // 10% off
      'WELCOME20': 0.20,    // 20% off
      'VIP50': 0.50,        // 50% off
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <BookingWizardHeader
          title="Review & pay"
          subtitle="Confirm booking details"
          step={4}
        />

        <View style={[styles.card, { borderColor: palette.border }]}>
          <SummaryRow label="Coach" value={coach?.name || draft.coachName || 'Coach'} />
          <SummaryRow label="Date" value={draft.date || 'Pick a date'} />
          <SummaryRow label="Time" value={draft.slot || 'Pick a slot'} />
          <SummaryRow label="Session" value={draft.sessionType || 'Select type'} />
          <SummaryRow label="Location" value={draft.locationOption || 'Coach preferred location'} />
          {draft.athleteName && (
            <SummaryRow label="Athlete" value={draft.athleteName} />
          )}
        </View>

        <View style={[styles.card, { borderColor: palette.border }]}>
          <ThemedText type="defaultSemiBold">Payment method</ThemedText>
          <ThemedText style={{ color: palette.muted }}>
            {(draft as unknown as Record<string, string>).paymentMethod || 'Wallet balance'}
          </ThemedText>
          <Clickable onPress={() => router.push(Routes.PAYMENT_METHODS)}>
            <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>Change</ThemedText>
          </Clickable>
        </View>

        {/* Promo Code Section */}
        <View style={[styles.card, { borderColor: palette.border }]}>
          <ThemedText type="defaultSemiBold">Promo code</ThemedText>
          {promoApplied ? (
            <Row style={styles.promoApplied}>
              <Row style={[styles.promoTag, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
                <Ionicons name="checkmark-circle" size={16} color={palette.success} />
                <ThemedText style={[styles.promoTagText, { color: palette.success }]}>
                  {promoCode.toUpperCase()} applied
                </ThemedText>
              </Row>
              <Clickable onPress={handleRemovePromo}>
                <ThemedText style={{ color: palette.error, fontWeight: '600' }}>Remove</ThemedText>
              </Clickable>
            </Row>
          ) : (
            <>
              <Row style={styles.promoInputRow}>
                <TextInput
                  value={promoCode}
                  onChangeText={setPromoCode}
                  placeholder="Enter code"
                  placeholderTextColor={palette.muted}
                  autoCapitalize="characters"
                  style={[styles.promoInput, { borderColor: palette.border, backgroundColor: palette.card }]}
                />
                <Clickable
                  onPress={handleApplyPromo}
                  disabled={!promoCode.trim()}
                  style={[
                    styles.promoApplyButton,
                    { backgroundColor: promoCode.trim() ? palette.tint : palette.border }
                  ]}
                >
                  <ThemedText style={{ color: palette.onPrimary, fontWeight: '600' }}>Apply</ThemedText>
                </Clickable>
              </Row>
              {promoError && (
                <ThemedText style={{ color: palette.error, ...Typography.small }}>{promoError}</ThemedText>
              )}
              <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
                Try: FIRST10, WELCOME20, VIP50
              </ThemedText>
            </>
          )}
        </View>

        <View style={[styles.card, { borderColor: palette.border }]}>
          <SummaryRow label="Session" value={`£${sessionPrice.toFixed(2)}`} />
          <SummaryRow label="Platform fee (15%)" value={`£${platformFee.toFixed(2)}`} />
          {promoDiscount > 0 && (
            <SummaryRow label="Promo discount" value={`-£${promoDiscount.toFixed(2)}`} />
          )}
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <SummaryRow label="Total" value={`£${total.toFixed(2)}`} />
        </View>

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
            <Ionicons name="checkmark-circle" size={18} color={palette.onPrimary} />
            <ThemedText style={{ color: palette.onPrimary, fontWeight: '700' }}>Pay £{total.toFixed(2)}</ThemedText>
          </Row>
        </Clickable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { padding: Spacing.lg, borderRadius: Radii.lg, borderWidth: 1.5, gap: Spacing.xs },
  divider: { height: 1, marginVertical: Spacing.xs },
  rateNote: { ...Typography.caption, textAlign: 'center' },
  footer: { padding: Spacing.lg, borderTopWidth: 1 },
  cta: { padding: Spacing.md, borderRadius: Radii.button },
  // Promo code styles
  promoInputRow: { gap: Spacing.sm },
  promoInput: { flex: 1, borderWidth: 1, borderRadius: Radii.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, ...Typography.bodySmall },
  promoApplyButton: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radii.md, justifyContent: 'center' },
  promoApplied: { justifyContent: 'space-between', alignItems: 'center' },
  promoTag: { alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.pill },
  promoTagText: { ...Typography.smallSemiBold },
});
