import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import { BookingWizardHeader } from '@/components/booking/booking-wizard';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { bookingService } from '@/services/booking-service';

export default function ConfirmationScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.content}>
        <BookingWizardHeader
          title="Booking placed"
          subtitle="Your coach will confirm within 24 hours"
          step={5}
        />

        <View style={[styles.checkCircle, { borderColor: palette.tint, backgroundColor: `${palette.tint}12` }]}>
          <Ionicons name="checkmark" size={48} color={palette.tint} />
        </View>

        <View style={{ gap: Spacing.sm }}>
          <ThemedText type="defaultSemiBold">What's next</ThemedText>
          <ThemedText style={{ color: palette.muted }}>
            We emailed a confirmation. You can message your coach anytime or add this to your calendar.
          </ThemedText>
        </View>
      </View>
      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <Clickable
          onPress={async () => {
            const booking = await bookingService.createFromDraft();
            router.replace(`/booking/${booking.id}`);
          }}
          style={[styles.cta, { backgroundColor: palette.tint }]}
        >
          <ThemedText style={{ color: '#fff', fontWeight: '700' }}>View booking</ThemedText>
        </Clickable>
        <Clickable onPress={() => router.push('/chat/conv1')} style={styles.secondary}>
          <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>Message coach</ThemedText>
        </Clickable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg, flex: 1 },
  checkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    alignSelf: 'center',
  },
  footer: { padding: Spacing.lg, borderTopWidth: 1, gap: Spacing.sm },
  cta: { padding: Spacing.md, borderRadius: Radii.button, alignItems: 'center' },
  secondary: { padding: Spacing.md, borderRadius: Radii.button, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.light.tint },
});
