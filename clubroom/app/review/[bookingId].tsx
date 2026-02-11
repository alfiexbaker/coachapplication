import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { apiClient } from '@/services/api-client';

import { ReviewForm } from '@/components/review/review-form';
import {
  ReviewHeader,
  ReviewSessionCard,
  ReviewSuccessState,
} from '@/components/review/review-screen-sections';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useCallback, useState } from 'react';
import { useScreen } from '@/hooks/use-screen';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError } from '@/types/result';
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
  const [submittedReview, setSubmittedReview] = useState<{
    rating: number;
    text: string;
  } | null>(null);
  const { colors: palette } = useTheme();

  const loadBooking = useCallback(async () => {
    if (!bookingId) {
      return ok<BookingInfo | null>(null);
    }

    try {
      const bookings = await apiClient.get<Booking[]>('session_bookings', []);
      const found = bookings.find((b) => b.id === bookingId);
      if (!found) {
        return ok<BookingInfo | null>(null);
      }

      return ok<BookingInfo | null>({
        id: found.id,
        coachId: found.coachId,
        coachName: found.coachName,
        service: found.service ?? 'Session',
        scheduledAt: found.scheduledAt,
      });
    } catch (loadError) {
      logger.error('Failed to load booking', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load booking for review. Pull down to refresh.', loadError));
    }
  }, [bookingId]);

  const {
    data: booking,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<BookingInfo | null>({
    load: loadBooking,
    deps: [bookingId],
    isEmpty: (value) => value === null,
    refetchOnFocus: true,
  });

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

  if (status === 'loading') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
        <ErrorState message={error?.message || 'Failed to load booking review details.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (status === 'empty' || !booking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
        <EmptyState
          icon="star-outline"
          title="Booking not found"
          message="This booking could not be loaded for review."
          actionLabel="Go Back"
          onPressAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <ReviewHeader colors={palette} submitted={submitted} onBack={() => router.back()} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {booking && (
          <ReviewSessionCard
            colors={palette}
            coachName={booking.coachName}
            service={booking.service}
            scheduledAt={booking.scheduledAt}
            formatDate={formatDate}
          />
        )}

        {submitted && submittedReview ? (
          <ReviewSuccessState
            colors={palette}
            coachName={booking?.coachName}
            submittedRating={submittedReview.rating}
            onDone={() => router.back()}
          />
        ) : (
          <ReviewForm onSubmit={handleSubmitReview} />
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
});
