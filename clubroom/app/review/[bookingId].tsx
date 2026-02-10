import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { apiClient } from '@/services/api-client';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ReviewForm } from '@/components/review/review-form';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useState, useEffect, useCallback } from 'react';
import { createLogger } from '@/utils/logger';
import type { Booking } from '@/constants/app-types';
const logger = createLogger('ReviewScreen');

/** Stored review shape (superset of display-only CoachReview) */
interface StoredReview {
  id: string;
  coachId: string;
  coachName: string;
  parentName: string;
  rating: number;
  text: string;
  content: string;
  createdAt: string;
  sessionDate: string;
  bookingId?: string;
  categories?: Record<string, number>;
}

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
  const { colors: palette } = useTheme();

  // Load booking info
  const loadBooking = useCallback(async () => {
    try {
      const bookings = await apiClient.get<Booking[]>('session_bookings', []);
      if (bookings.length > 0) {
        const found = bookings.find((b) => b.id === bookingId);
        if (found) {
          setBooking({
            id: found.id,
            coachId: found.coachId,
            coachName: found.coachName ?? 'Coach',
            service: found.service ?? 'Session',
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
      const reviews = await apiClient.get<StoredReview[]>('coach_reviews', []);

      const newReview: StoredReview = {
        id: `review_${Date.now()}`,
        bookingId,
        coachId: booking?.coachId ?? '',
        coachName: booking?.coachName ?? 'Coach',
        parentName: 'Parent',
        rating: payload.rating,
        text: payload.text,
        content: payload.text,
        categories: payload.categories,
        createdAt: new Date().toISOString(),
        sessionDate: booking?.scheduledAt ?? new Date().toISOString(),
      };

      reviews.push(newReview);
      await apiClient.set('coach_reviews', reviews);

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
      <Row align="center" justify="space-between" style={styles.header}>
        <Clickable onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={palette.foreground} />
        </Clickable>
        <ThemedText type="title">
          {submitted ? 'Review Submitted' : 'Leave a Review'}
        </ThemedText>
        <View style={{ width: 24 }} />
      </Row>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Session Info */}
        {booking && (
          <SurfaceCard style={styles.sessionCard}>
            <Row align="center" gap="md" style={styles.sessionHeader}>
              <View style={[styles.coachAvatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
                <Ionicons name="person" size={24} color={palette.tint} />
              </View>
              <View style={styles.sessionInfo}>
                <ThemedText type="defaultSemiBold">{booking.coachName}</ThemedText>
                <ThemedText style={[styles.sessionMeta, { color: palette.muted }]}>
                  {booking.service} - {formatDate(booking.scheduledAt)}
                </ThemedText>
              </View>
            </Row>
          </SurfaceCard>
        )}

        {submitted && submittedReview ? (
          <View style={styles.successContainer}>
            <View style={[styles.successIcon, { backgroundColor: withAlpha(palette.success, 0.12) }]}>
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
              <ThemedText style={[styles.doneButtonText, { color: palette.onPrimary }]}>Done</ThemedText>
            </Clickable>
          </View>
        ) : (
          <ReviewForm onSubmit={handleSubmitReview} />
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
    minHeight: 44,
    minWidth: 44,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  sessionCard: {
    padding: Spacing.md,
  },
  sessionHeader: {},
  coachAvatar: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  sessionMeta: {
    ...Typography.small,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: Radii['3xl'],
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
    ...Typography.subheading,
  },
});
