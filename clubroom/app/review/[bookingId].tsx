import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useRequiredParam } from '@/hooks/use-required-param';

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
import { useToast } from '@/components/ui/toast';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import {
  appendCoachReview,
  getStoredCoachReviews,
  isReviewForBookingByUser,
  type StoredCoachReview,
} from '@/services/review-sync-service';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('ReviewScreen');
let _reviewSubmitLock: Promise<void> = Promise.resolve();

function withReviewSubmitLock<T>(fn: () => Promise<T>): Promise<T> {
  let release!: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  const prev = _reviewSubmitLock;
  _reviewSubmitLock = next;
  return prev.then(fn).finally(() => release());
}

interface BookingInfo {
  id: string;
  coachId: string;
  coachName: string;
  service: string;
  scheduledAt: string;
  status: Booking['status'];
  existingReview: StoredCoachReview | null;
}

export default function ReviewScreen() {
  const bookingIdParam = useRequiredParam('bookingId');
  const bookingId = bookingIdParam.valid ? bookingIdParam.value : '';
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []),
        getStoredCoachReviews(),
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
        coachName: found.coachName ?? 'Coach',
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

  const handleSubmitReview = useCallback(
    async (payload: { rating: number; text: string; categories: Record<string, number> }) => {
      if (isSubmitting) return;
      setIsSubmitting(true);

      try {
        if (!booking || !bookingId) {
          uiFeedback.alert('Missing booking', 'This session could not be reviewed.');
          return;
        }

        if (booking.status !== 'COMPLETED') {
          uiFeedback.alert('Not ready yet', 'You can review a coach once the session is completed.');
          return;
        }

        const persistedReview = await withReviewSubmitLock(async () => {
          const reviews = await getStoredCoachReviews();
          const alreadyReviewed = reviews.find((review) =>
            isReviewForBookingByUser(review, bookingId, currentUser?.id),
          );

          if (alreadyReviewed) {
            return { review: alreadyReviewed, alreadyExisted: true as const };
          }

          const reviewerName =
            currentUser?.fullName || currentUser?.name || currentUser?.username || 'Anonymous';

          const newReview: StoredCoachReview = {
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

          await appendCoachReview(newReview);
          return { review: newReview, alreadyExisted: false as const };
        });

        if (persistedReview.alreadyExisted) {
          setSubmitted(true);
          setSubmittedReview({
            rating: persistedReview.review.rating,
            text: persistedReview.review.text || persistedReview.review.content || '',
          });
          uiFeedback.alert('Review already submitted', 'You already reviewed this session.');
          return;
        }

        logger.info('Review submitted', {
          bookingId,
          coachId: booking.coachId,
          rating: payload.rating,
        });

        setSubmittedReview({
          rating: persistedReview.review.rating,
          text: persistedReview.review.text || persistedReview.review.content || '',
        });
        setSubmitted(true);
        showToast('Review submitted', { tone: 'success', duration: 1600 });
        router.replace(Routes.booking(bookingId, { returnTo: Routes.BOOKINGS as string }));
      } catch (submitError) {
        logger.error('Failed to submit review', submitError);
        uiFeedback.alert('Error', 'Failed to submit review. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      isSubmitting,
      booking,
      bookingId,
      currentUser?.id,
      currentUser?.fullName,
      currentUser?.name,
      currentUser?.username,
      showToast,
    ],
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };
  const renderShell = (content: ReactNode) => (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'bottom']}>
      {content}
    </SafeAreaView>
  );

  if (status === 'loading') {
    return renderShell(<LoadingState variant="detail" />);
  }

  if (!bookingIdParam.valid) {
    return renderShell(
      <ErrorState
        message="Invalid link"
        onRetry={() => router.back()}
      />,
    );
  }

  if (status === 'error') {
    return renderShell(
      <ErrorState
        message={error?.message || 'Failed to load booking review details.'}
        onRetry={retry}
      />,
    );
  }

  if (status === 'empty' || !booking) {
    return renderShell(
      <EmptyState
        icon="star-outline"
        title="Booking not found"
        message="This booking could not be loaded for review."
        actionLabel="Go Back"
        onPressAction={() => router.back()}
      />,
    );
  }

  if (currentUser?.role === 'COACH') {
    return renderShell(
      <EmptyState
        icon="star-outline"
        title="Not available"
        message="Coach reviews are submitted by athletes or parents after completed sessions."
        actionLabel="Go Back"
        onPressAction={() => router.back()}
      />,
    );
  }

  if (booking.status !== 'COMPLETED' && !reviewFromStorage) {
    return renderShell(
      <EmptyState
        icon="time-outline"
        title="Review opens after completion"
        message="You can review this coach once this booking is marked as completed."
        actionLabel="Go Back"
        onPressAction={() => router.back()}
      />,
    );
  }

  return renderShell(
    <>
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
            <ReviewForm onSubmit={handleSubmitReview} submitting={isSubmitting} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>,
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
});
