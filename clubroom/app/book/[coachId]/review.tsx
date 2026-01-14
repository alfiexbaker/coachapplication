import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BookingWizardHeader, SummaryRow } from '@/components/ui/booking/booking-wizard';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useBookingFlow } from '@/context/booking-flow-context';

export default function ReviewScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const { draft } = useBookingFlow();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const fee = 13.5;
  const sessionPrice = draft.sessionType === '1-on-1' ? 90 : draft.sessionType === 'team' ? 150 : 60;
  const total = sessionPrice + fee;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <BookingWizardHeader
          title="Review & pay"
          subtitle="Confirm booking details"
          step={4}
        />

        <View style={[styles.card, { borderColor: palette.border }]}> 
          <SummaryRow label="Coach" value="Sarah Mitchell" />
          <SummaryRow label="Date" value={draft.date || 'Pick a date'} />
          <SummaryRow label="Time" value={draft.slot || 'Pick a slot'} />
          <SummaryRow label="Session" value={draft.sessionType || 'Select type'} />
          <SummaryRow label="Location" value={draft.locationOption || 'Coach preferred location'} />
        </View>

        <View style={[styles.card, { borderColor: palette.border }]}> 
          <ThemedText type="defaultSemiBold">Payment method</ThemedText>
          <ThemedText style={{ color: palette.muted }}>Mock card •••• 4242</ThemedText>
          <Clickable onPress={() => router.push('/payment/methods')}>
            <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>Change</ThemedText>
          </Clickable>
        </View>

        <View style={[styles.card, { borderColor: palette.border }]}> 
          <SummaryRow label="Session" value={`£${sessionPrice.toFixed(2)}`} />
          <SummaryRow label="Platform fee" value={`£${fee.toFixed(2)}`} />
          <SummaryRow label="Total" value={`£${total.toFixed(2)}`} />
        </View>
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <Clickable
          onPress={() => router.push(`/book/${coachId}/confirmation`)}
          style={[styles.cta, { backgroundColor: palette.tint }]}
        >
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Confirm & pay</ThemedText>
        </Clickable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  card: { padding: Spacing.lg, borderRadius: Radii.lg, borderWidth: 1.5, gap: Spacing.xs },
  footer: { padding: Spacing.lg, borderTopWidth: 1 },
  cta: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radii.button },
});
