import { useState, useEffect, useCallback } from 'react';
import { Alert, ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { TimeProposalForm } from '@/components/negotiate/TimeProposalForm';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { counterOfferService } from '@/services/counter-offer-service';
import { bookingService } from '@/services/booking-service';
import { createLogger } from '@/utils/logger';
import type { TimeSlot, CounterOfferProposerRole } from '@/constants/types';

const logger = createLogger('CounterOffer');

interface BookingData {
  id: string;
  coachName: string;
  athleteName: string;
  scheduledAt: string;
  location: string;
  service: string;
}

export default function CounterOfferScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  // Determine user role for counter-offer
  const userRole: CounterOfferProposerRole = currentUser?.role === 'COACH' ? 'COACH' : 'PARENT';

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBooking = useCallback(async () => {
    if (!id) {
      setError('Booking ID not provided');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Try to get from booking service
      const bookingData = await bookingService.getById(id);

      if (bookingData) {
        setBooking({
          id: bookingData.id,
          coachName: bookingData.coachName || 'Coach',
          athleteName: bookingData.athleteName || 'Athlete',
          scheduledAt: bookingData.scheduledAt || new Date().toISOString(),
          location: bookingData.location || bookingData.locationLabel || 'Location TBD',
          service: bookingData.service || 'Session',
        });
      } else {
        // Use mock data for demo
        setBooking({
          id: id,
          coachName: 'Marcus Thompson',
          athleteName: 'Tom Baker',
          scheduledAt: '2026-01-15T16:00:00Z',
          location: 'Hackney Marshes',
          service: '1:1 Coaching',
        });
      }
    } catch (err) {
      logger.error('Failed to load booking', err);
      setError('Failed to load booking details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  const getOriginalTime = (): TimeSlot => {
    if (!booking) {
      return {
        date: new Date().toISOString().split('T')[0],
        startTime: '10:00',
        endTime: '11:00',
        location: 'TBD',
      };
    }

    const scheduledDate = new Date(booking.scheduledAt);
    const date = scheduledDate.toISOString().split('T')[0];
    const startTime = scheduledDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    // Calculate end time (assume 1 hour session)
    const endDate = new Date(scheduledDate);
    endDate.setHours(endDate.getHours() + 1);
    const endTime = endDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    return {
      date,
      startTime,
      endTime,
      location: booking.location,
    };
  };

  const handleSubmit = async (proposedTime: TimeSlot, message?: string) => {
    if (!booking) return;

    try {
      setIsSubmitting(true);

      await counterOfferService.createCounterOffer({
        bookingId: booking.id,
        proposedBy: userRole,
        proposerId: currentUser?.id || '',
        proposerName: currentUser?.name || currentUser?.fullName || 'User',
        originalTime: getOriginalTime(),
        proposedTime,
        message,
      });

      Alert.alert(
        'Proposal Sent',
        `Your time change request has been sent to ${booking.coachName}. They will be notified and can accept, decline, or propose an alternative.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err) {
      logger.error('Failed to create counter-offer', err);
      Alert.alert('Error', 'Failed to send your proposal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Discard Changes?',
      'Are you sure you want to cancel? Your proposal will not be saved.',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Propose New Time',
            headerLeft: () => (
              <Clickable onPress={() => router.back()}>
                <Ionicons name="close" size={24} color={palette.text} />
              </Clickable>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
            Loading booking...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Error',
            headerLeft: () => (
              <Clickable onPress={() => router.back()}>
                <Ionicons name="close" size={24} color={palette.text} />
              </Clickable>
            ),
          }}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={palette.error} />
          <ThemedText type="defaultSemiBold" style={styles.errorTitle}>
            Unable to Load Booking
          </ThemedText>
          <ThemedText style={[styles.errorText, { color: palette.muted }]}>
            {error || 'Booking not found'}
          </ThemedText>
          <Clickable
            onPress={loadBooking}
            style={[styles.retryButton, { backgroundColor: palette.tint }]}
          >
            <ThemedText style={styles.retryText}>Try Again</ThemedText>
          </Clickable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Propose New Time',
          headerLeft: () => (
            <Clickable onPress={handleCancel} style={styles.headerButton}>
              <Ionicons name="close" size={24} color={palette.text} />
            </Clickable>
          ),
        }}
      />

      {/* Booking context */}
      <View style={[styles.bookingContext, { backgroundColor: palette.surface }]}>
        <View style={styles.bookingInfo}>
          <ThemedText type="defaultSemiBold">
            {booking.service} with {booking.coachName}
          </ThemedText>
          <ThemedText style={{ color: palette.muted }}>
            For {booking.athleteName}
          </ThemedText>
        </View>
      </View>

      {/* Time proposal form */}
      <TimeProposalForm
        originalTime={getOriginalTime()}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isSubmitting}
        submitLabel="Send Proposal"
      />
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
    gap: Spacing.md,
  },
  loadingText: {
    marginTop: Spacing.sm,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  errorTitle: {
    marginTop: Spacing.sm,
  },
  errorText: {
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.sm,
  },
  retryText: {
    color: Colors.light.onPrimary,
    fontWeight: '600',
  },
  headerButton: {
    padding: Spacing.xs,
  },
  bookingContext: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  bookingInfo: {
    gap: Spacing.micro,
  },
});
