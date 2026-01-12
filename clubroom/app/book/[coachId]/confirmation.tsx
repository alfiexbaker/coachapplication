import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BookingWizardHeader } from '@/components/booking/booking-wizard';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useBookingFlow } from '@/context/booking-flow-context';
import { useAuth } from '@/hooks/use-auth';
import { bookingService } from '@/services/booking-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ConfirmationScreen');

export default function ConfirmationScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { draft, reset } = useBookingFlow();
  const { currentUser } = useAuth();

  const [isCreating, setIsCreating] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleViewBooking = async () => {
    if (bookingId) {
      // Booking already created, just navigate
      reset();
      router.replace(`/booking/${bookingId}`);
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Create the booking using the validated createBooking method
      // This saves to AsyncStorage and makes the slot unavailable for others
      const result = await bookingService.createBooking({
        coachId: coachId || draft.coachId || 'coach_1',
        coachName: draft.coachName || 'Sarah Mitchell',
        athleteId: draft.childId || 'athlete_1',
        athleteName: draft.athleteName || 'Tom Henderson',
        bookedById: currentUser?.id || 'unknown',
        bookedByName: currentUser?.name || currentUser?.fullName || 'Unknown',
        scheduledAt: `${draft.date}T${draft.slot}:00`,
        duration: draft.duration || 60,
        location: draft.locationText || draft.locationOption || 'Coach preferred location',
        service: draft.sessionType || '1-on-1 Session',
        serviceType: draft.sessionType || '1-on-1',
        objectives: draft.objectives,
        price: draft.price,
        notes: draft.notes,
      });

      if (result.success && result.booking) {
        setBookingId(result.booking.id);
        reset();
        router.replace(`/booking/${result.booking.id}`);
      } else {
        setError(result.error || 'Failed to create booking. The slot may no longer be available.');
      }
    } catch (err) {
      logger.error('Error creating booking', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

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
          <ThemedText type="defaultSemiBold">{"What's next"}</ThemedText>
          <ThemedText style={{ color: palette.muted }}>
            We emailed a confirmation. You can message your coach anytime or add this to your calendar.
          </ThemedText>
        </View>

        {/* Show booking summary */}
        <View style={[styles.summaryCard, { borderColor: palette.border }]}>
          <View style={styles.summaryRow}>
            <Ionicons name="calendar-outline" size={18} color={palette.muted} />
            <ThemedText style={{ color: palette.text }}>
              {draft.date ? formatDate(draft.date) : 'No date selected'}
            </ThemedText>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="time-outline" size={18} color={palette.muted} />
            <ThemedText style={{ color: palette.text }}>
              {draft.slot || 'No time selected'}
            </ThemedText>
          </View>
          {draft.locationText && (
            <View style={styles.summaryRow}>
              <Ionicons name="location-outline" size={18} color={palette.muted} />
              <ThemedText style={{ color: palette.text }}>{draft.locationText}</ThemedText>
            </View>
          )}
        </View>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
            <ThemedText style={{ color: '#DC2626', flex: 1 }}>{error}</ThemedText>
          </View>
        )}
      </View>

      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <Clickable
          onPress={handleViewBooking}
          style={[styles.cta, { backgroundColor: palette.tint }]}
          disabled={isCreating}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <ThemedText style={{ color: '#fff', fontWeight: '700' }}>View booking</ThemedText>
          )}
        </Clickable>
        <Clickable
          onPress={() => router.push(`/chat/${coachId || 'new'}`)}
          style={[styles.secondary, { borderColor: palette.tint }]}
          disabled={isCreating}
        >
          <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>Message coach</ThemedText>
        </Clickable>
      </View>
    </SafeAreaView>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
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
  summaryCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  footer: { padding: Spacing.lg, borderTopWidth: 1, gap: Spacing.sm },
  cta: { padding: Spacing.md, borderRadius: Radii.button, alignItems: 'center' },
  secondary: {
    padding: Spacing.md,
    borderRadius: Radii.button,
    alignItems: 'center',
    borderWidth: 1.5,
  },
});
