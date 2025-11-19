import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookingCard } from '@/components/bookings/booking-card';
import { SectionHeader } from '@/components/primitives/section-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { upcomingBookings } from '@/constants/mock-data';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function BookingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader
          eyebrow="Sprint 1 · Bookings"
          title="Bookings"
          subtitle="Parents and coaches stay aligned with a clear state machine and tactile confirmations."
        />
        <View>
          {upcomingBookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </View>
        <SurfaceCard>
          <ThemedText type="defaultSemiBold">Status timeline</ThemedText>
          <ThemedText style={styles.detailCopy}>
            Available → Pending → Confirmed → Completed / Cancelled. Cancellation reasons capture actor, reason, and refund note.
          </ThemedText>
        </SurfaceCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  detailCopy: {
    marginTop: Spacing.sm,
    opacity: 0.85,
  },
});
