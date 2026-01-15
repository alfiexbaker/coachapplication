import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BookingWizardHeader, SummaryRow } from '@/components/ui/booking/booking-wizard';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useBookingFlow } from '@/context/booking-flow-context';
import { coachService } from '@/services/coach-service';
import type { Coach } from '@/services/coach-service';

const PLATFORM_FEE_PERCENT = 0.15; // 15% platform fee

export default function ReviewScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const { draft, updateDraft } = useBookingFlow();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [coach, setCoach] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);

  // Load coach data to get actual rates
  useEffect(() => {
    const loadCoach = async () => {
      if (!coachId) return;
      try {
        const coachData = await coachService.getCoach(coachId);
        setCoach(coachData);
        // Store coach name in draft for confirmation
        if (coachData) {
          updateDraft({ coachName: coachData.fullName });
        }
      } catch (error) {
        console.error('Failed to load coach:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCoach();
  }, [coachId]);

  // Calculate price based on coach's actual rate
  const getSessionPrice = () => {
    if (!coach?.sessionRate) return 60; // Default fallback

    // Coach sessionRate is their hourly rate
    // Adjust for session type
    const baseRate = coach.sessionRate;
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
  const total = sessionPrice + platformFee;

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
          <SummaryRow label="Coach" value={coach?.fullName || draft.coachName || 'Coach'} />
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
            {draft.paymentMethod || 'Wallet balance'}
          </ThemedText>
          <Clickable onPress={() => router.push('/payment/methods')}>
            <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>Change</ThemedText>
          </Clickable>
        </View>

        <View style={[styles.card, { borderColor: palette.border }]}>
          <SummaryRow label="Session" value={`£${sessionPrice.toFixed(2)}`} />
          <SummaryRow label="Platform fee (15%)" value={`£${platformFee.toFixed(2)}`} />
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <SummaryRow label="Total" value={`£${total.toFixed(2)}`} bold />
        </View>

        {coach?.sessionRate && (
          <ThemedText style={[styles.rateNote, { color: palette.muted }]}>
            {coach.fullName}'s rate: £{coach.sessionRate}/hour
          </ThemedText>
        )}
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <Clickable
          onPress={() => {
            // Store final price in draft
            updateDraft({ totalPrice: total, sessionPrice, platformFee });
            router.push(`/book/${coachId}/confirmation`);
          }}
          style={[styles.cta, { backgroundColor: palette.tint }]}
        >
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Pay £{total.toFixed(2)}</ThemedText>
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
  rateNote: { fontSize: 12, textAlign: 'center' },
  footer: { padding: Spacing.lg, borderTopWidth: 1 },
  cta: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radii.button },
});
