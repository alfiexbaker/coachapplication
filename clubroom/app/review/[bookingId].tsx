import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { ReviewForm } from '@/components/review/review-form';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useState, useEffect, useCallback } from 'react';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ReviewScreen');

interface BookingInfo {
  id: string;
  coachId: string;
  coachName: string;
  service: string;
  scheduledAt: string;
}

export default function ReviewScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [submitted, setSubmitted] = useState(false);
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [submittedReview, setSubmittedReview] = useState<{
    rating: number;
    text: string;
  } | null>(null);
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Load booking info
  const loadBooking = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('session_bookings');
      if (stored) {
        const bookings = JSON.parse(stored);
        const found = bookings.find((b: any) => b.id === bookingId);
        if (found) {
          setBooking({
            id: found.id,
            coachId: found.coachId,
            coachName: found.coachName,
            service: found.service,
            scheduledAt: found.scheduledAt,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to load booking', error);
    }
  }, [bookingId]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  const handleSubmitReview = async (payload: {
    rating: number;
    text: string;
    categories: Record<string, number>;
  }) => {
    try {
      // Save review to storage
      const reviewsStored = await AsyncStorage.getItem('coach_reviews');
      const reviews = reviewsStored ? JSON.parse(reviewsStored) : [];

      const newReview = {
        id: `review_${Date.now()}`,
        bookingId,
        coachId: booking?.coachId,
        coachName: booking?.coachName,
        rating: payload.rating,
        text: payload.text,
        categories: payload.categories,
        createdAt: new Date().toISOString(),
      };

      reviews.push(newReview);
      await AsyncStorage.setItem('coach_reviews', JSON.stringify(reviews));

      logger.info('Review submitted', { bookingId, rating: payload.rating });

      setSubmittedReview({ rating: payload.rating, text: payload.text });
      setSubmitted(true);
    } catch (error) {
      logger.error('Failed to submit review', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={palette.foreground} />
        </Clickable>
        <ThemedText type="title">
          {submitted ? 'Review Submitted' : 'Leave a Review'}
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Session Info */}
        {booking && (
          <SurfaceCard style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <View style={[styles.coachAvatar, { backgroundColor: palette.tint + '20' }]}>
                <Ionicons name="person" size={24} color={palette.tint} />
              </View>
              <View style={styles.sessionInfo}>
                <ThemedText type="defaultSemiBold">{booking.coachName}</ThemedText>
                <ThemedText style={[styles.sessionMeta, { color: palette.muted }]}>
                  {booking.service} - {formatDate(booking.scheduledAt)}
                </ThemedText>
              </View>
            </View>
          </SurfaceCard>
        )}

        {submitted && submittedReview ? (
          <View style={styles.successContainer}>
            <View style={[styles.successIcon, { backgroundColor: palette.success + '20' }]}>
              <Ionicons name="checkmark-circle" size={48} color={palette.success} />
            </View>
            <ThemedText type="subtitle" style={styles.successTitle}>
              Thank you for your feedback!
            </ThemedText>
            <ThemedText style={[styles.successText, { color: palette.muted }]}>
              Your {submittedReview.rating}-star review has been submitted.
              {booking?.coachName && ` ${booking.coachName} will appreciate your feedback.`}
            </ThemedText>

            <Clickable
              onPress={() => router.back()}
              style={[styles.doneButton, { backgroundColor: palette.tint }]}
            >
              <ThemedText style={styles.doneButtonText}>Done</ThemedText>
            </Clickable>
          </View>
        ) : (
          <ReviewForm onSubmit={handleSubmitReview} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  sessionCard: {
    padding: Spacing.md,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  coachAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: {
    flex: 1,
    gap: 4,
  },
  sessionMeta: {
    fontSize: 13,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  successTitle: {
    textAlign: 'center',
  },
  successText: {
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
  },
  doneButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    marginTop: Spacing.md,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
