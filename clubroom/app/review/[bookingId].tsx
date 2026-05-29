import { useEffect, useState, type ReactNode } from 'react';
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
import { ErrorState, EmptyState, SectionSkeleton } from '@/components/ui/screen-states';
import { useToast } from '@/components/ui/toast';
import { bookingService } from '@/services/booking-service';
import {
  getBookingReviewStatus,
  submitBookingReview,
  type StoredCoachReview,
} from '@/services/review-sync-service';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('ReviewScreen');
let _reviewSubmitLock: Promise<void> = Promise.resolve();
const reviewBookingSnapshots = new Map<string, BookingInfo>();

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
  athleteId?: string;
  athleteName?: string;
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

  const loadBooking = async () => {
    if (!bookingId) {
      return ok<BookingInfo | null>(null);
    }

    try {
      const found = await bookingService.getBooking(bookingId);
      if (!found) {
        return ok<BookingInfo | null>(null);
      }

      const bookingInfo: BookingInfo = {
        id: found.id,
        coachId: found.coachId,
        coachName: found.coachName ?? 'Coach',
        athleteId: found.athleteIds?.[0] ?? found.athleteId,
        athleteName: found.athleteNames?.[0],
        service: found.service ?? 'Session',
        scheduledAt: found.scheduledAt,
        status: found.status,
        existingReview: null,
      };
      const reviewStatus = await getBookingReviewStatus({
        booking: bookingInfo,
        currentUser,
      });
      if (reviewStatus.success) {
        bookingInfo.existingReview = reviewStatus.data;
      } else {
        logger.warn('Failed to load booking review status', {
          bookingId,
          error: reviewStatus.error,
        });
      }

      return ok<BookingInfo | null>(bookingInfo);
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
  };

  const {
    data: loadedBooking,
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
    loadingStrategy: 'section-skeleton',
  });
  const booking = loadedBooking ?? reviewBookingSnapshots.get(bookingId) ?? null;

  useEffect(() => {
    if (loadedBooking && bookingId) {
      reviewBookingSnapshots.set(bookingId, loadedBooking);
    }
  }, [bookingId, loadedBooking]);

  const existingReview = booking?.existingReview;
  const reviewFromStorage = existingReview
    ? {
        rating: existingReview.rating,
        text: existingReview.text || existingReview.content || '',
      }
    : null;
  const isSubmitted = submitted || Boolean(reviewFromStorage);
  const visibleReview = submittedReview ?? reviewFromStorage;

  const handleSubmitReview = async (payload: { rating: number; text: string; categories: Record<string, number> }) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    return await runAsyncTryCatchFinally(async () => {
      if (!booking || !bookingId) {
        uiFeedback.showToast('This session could not be reviewed.', 'error');
        return;
      }

      if (booking.status !== 'COMPLETED') {
        uiFeedback.showToast('You can review a coach once the session is completed.');
        return;
      }

      const persistedReview = await withReviewSubmitLock(async () => {
        return submitBookingReview({
          booking,
          rating: payload.rating,
          text: payload.text,
          categories: payload.categories,
          currentUser,
        });
      });

      if (!persistedReview.success) {
        uiFeedback.showToast(persistedReview.error.message, 'error');
        return;
      }

      if (persistedReview.data.reused) {
        setSubmitted(true);
        setSubmittedReview({
          rating: persistedReview.data.review.rating,
          text: persistedReview.data.review.text || persistedReview.data.review.content || '',
        });
        uiFeedback.showToast('You already reviewed this session.');
        return;
      }

      logger.info('Review submitted', {
        bookingId,
        coachId: booking.coachId,
        rating: payload.rating,
      });

      setSubmittedReview({
        rating: persistedReview.data.review.rating,
        text: persistedReview.data.review.text || persistedReview.data.review.content || '',
      });
      setSubmitted(true);
      showToast('Review submitted', { tone: 'success', duration: 1600 });
      router.replace(Routes.booking(bookingId, { returnTo: Routes.BOOKINGS as string }));
    }, async submitError => {
      logger.error('Failed to submit review', submitError);
      uiFeedback.showToast('Failed to submit review. Please try again.', 'error');
    }, () => {
      setIsSubmitting(false);
    });
  };

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

  if (status === 'loading' && !booking) {
    return renderShell(
      <>
        <ReviewHeader colors={palette} submitted={false} onBack={() => router.back()} />
        <ScrollView contentContainerStyle={styles.content}>
          <SectionSkeleton variant="detail" titleWidth="34%" />
        </ScrollView>
      </>,
    );
  }

  if (!bookingIdParam.valid) {
    return renderShell(
      <ErrorState
        message="Invalid link"
        onRetry={() => router.back()}
      />,
    );
  }

  if (status === 'error' && !booking) {
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
