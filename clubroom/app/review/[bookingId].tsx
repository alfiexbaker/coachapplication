import { useCallback, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import { apiClient } from '@/services/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/useTheme';
import { useScreen } from '@/hooks/use-screen';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError } from '@/types/result';
import type { Booking } from '@/constants/app-types';
import { Spacing } from '@/constants/theme';
import { ReviewForm } from '@/components/review/review-form';
import {
  ReviewHeader,
  ReviewSessionCard,
  ReviewSuccessState,
} from '@/components/review/review-screen-sections';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';

const logger = createLogger('ReviewScreen');

interface StoredReview {
  id: string;
  coachId: string;
  coachName?: string;
  parentName?: string;
  userName?: string;
  userId?: string;
  parentId?: string;
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
  status: Booking['status'];
  existingReview: StoredReview | null;
}

function isReviewForBookingByUser(
  review: StoredReview,
  bookingId: string,
  currentUserId?: string,
): boolean {
  if (review.bookingId !== bookingId) return false;
  if (!currentUserId) return true;
  return (
    review.userId === currentUserId ||
    review.parentId === currentUserId ||
    (!review.userId && !review.parentId)
  );
}

export default function ReviewScreen() {
  const { bookingId: bookingIdParam } = useLocalSearchParams<{ bookingId?: string | string[] }>();
  const bookingId = Array.isArray(bookingIdParam) ? bookingIdParam[0] : (bookingIdParam ?? '');
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [submittedReview, setSubmittedReview] = useState<{
    rating: number;
    text: string;
  } | null>(null);

  const loadBooking = useCallback(async () => {
    if (!bookingId) {
      return ok<BookingInfo | null>(null);
    }

    try {
      const [bookings, reviews] = await Promise.all([
        apiClient.get<Booking[]>('session_bookings', []),
        apiClient.get<StoredReview[]>('coach_reviews', []),
      ]);
      const found = bookings.find((entry) => entry.id === bookingId);
      if (!found) {
        return ok<BookingInfo | null>(null);
      }

      const existingReview =
        reviews.find((review) => isReviewForBookingByUser(review, bookingId, currentUser?.id)) ??
        null;

      return ok<BookingInfo | null>({
        id: found.id,
        coachId: found.coachId,
        coachName: found.coachName,
        service: found.service ?? 'Session',
        scheduledAt: found.scheduledAt,
        status: found.status,
        existingReview,
      });
    } catch (loadError) {
      logger.error('Failed to load booking', loadError);
      return err(
        serviceError(
          'UNKNOWN',
          'Failed to load booking for review. Pull down to refresh.',
          loadError,
        ),
      );
    }
  }, [bookingId, currentUser?.id]);

  const {
    data: booking,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<BookingInfo | null>({
    load: loadBooking,
    deps: [bookingId, currentUser?.id],
    isEmpty: (value) => value === null,
    refetchOnFocus: true,
  });

  const existingReview = booking?.existingReview;
  const reviewFromStorage = useMemo(
    () =>
      existingReview
        ? {
            rating: existingReview.rating,
            text: existingReview.text || existingReview.content || '',
          }
        : null,
    [existingReview],
  );
  const isSubmitted = submitted || Boolean(reviewFromStorage);
  const visibleReview = submittedReview ?? reviewFromStorage;

  const handleSubmitReview = async (payload: {
    rating: number;
    text: string;
    categories: Record<string, number>;
  }) => {
    if (!booking || !bookingId) {
      Alert.alert('Missing booking', 'This session could not be reviewed.');
      return;
    }

    if (booking.status !== 'COMPLETED') {
      Alert.alert('Not ready yet', 'You can review a coach once the session is completed.');
      return;
    }

    try {
      const reviews = await apiClient.get<StoredReview[]>('coach_reviews', []);
      const alreadyReviewed = reviews.find((review) =>
        isReviewForBookingByUser(review, bookingId, currentUser?.id),
      );

      if (alreadyReviewed) {
        setSubmitted(true);
        setSubmittedReview({
          rating: alreadyReviewed.rating,
          text: alreadyReviewed.text || alreadyReviewed.content || '',
        });
        Alert.alert('Review already submitted', 'You already reviewed this session.');
        return;
      }

      const reviewerName =
        currentUser?.fullName || currentUser?.name || currentUser?.username || 'Anonymous';

      const newReview: StoredReview = {
        id: `review_${Date.now()}`,
        bookingId,
        coachId: booking.coachId,
        coachName: booking.coachName,
        parentName: reviewerName,
        userName: reviewerName,
        userId: currentUser?.id,
        parentId: currentUser?.id,
        rating: payload.rating,
        text: payload.text,
        content: payload.text,
        categories: payload.categories,
        createdAt: new Date().toISOString(),
        sessionDate: booking.scheduledAt ?? new Date().toISOString(),
      };

      reviews.push(newReview);
      await apiClient.set('coach_reviews', reviews);

      logger.info('Review submitted', {
        bookingId,
        coachId: booking.coachId,
        rating: payload.rating,
      });

      setSubmittedReview({ rating: payload.rating, text: payload.text });
      setSubmitted(true);
    } catch (submitError) {
      logger.error('Failed to submit review', submitError);
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
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'bottom']}>
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'bottom']}>
        <ErrorState
          message={error?.message || 'Failed to load booking review details.'}
          onRetry={retry}
        />
      </SafeAreaView>
    );
  }

  if (status === 'empty' || !booking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'bottom']}>
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

  if (currentUser?.role === 'COACH') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'bottom']}>
        <EmptyState
          icon="star-outline"
          title="Not available"
          message="Coach reviews are submitted by athletes or parents after completed sessions."
          actionLabel="Go Back"
          onPressAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  if (booking.status !== 'COMPLETED' && !reviewFromStorage) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'bottom']}>
        <EmptyState
          icon="time-outline"
          title="Review opens after completion"
          message="You can review this coach once this booking is marked as completed."
          actionLabel="Go Back"
          onPressAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'bottom']}>
      <ReviewHeader colors={palette} submitted={isSubmitted} onBack={() => router.back()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <ReviewSessionCard
            colors={palette}
            coachName={booking.coachName}
            service={booking.service}
            scheduledAt={booking.scheduledAt}
            formatDate={formatDate}
          />

          {isSubmitted && visibleReview ? (
            <ReviewSuccessState
              colors={palette}
              coachName={booking.coachName}
              submittedRating={visibleReview.rating}
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
