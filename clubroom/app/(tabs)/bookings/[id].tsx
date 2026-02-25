import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { BookingCoachView } from '@/components/bookings/booking-coach-view';
import { BookingParentView } from '@/components/bookings/booking-parent-view';
import {
  DateTimeCard,
  LocationCard,
  PaymentCard,
  BookingCoachCard,
  BookingAthleteCard,
} from '@/components/bookings/booking-info-cards';
import { BookingParticipantsCard } from '@/components/bookings/booking-participants-card';
import { BookingNotesCard, BookingFollowUpsCard } from '@/components/bookings/booking-notes-card';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { CancellationPolicyCard } from '@/components/booking/cancellation-policy-card';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useBookingDetail } from '@/hooks/use-booking-detail';
import { useAuth } from '@/hooks/use-auth';
import { cancellationService } from '@/services/cancellation-service';
import { apiClient } from '@/services/api-client';
import { getBookingSummaryClientName, getBookingSummaryCoachName } from '@/utils/booking-display';
import { Routes } from '@/navigation/routes';
import { useRequiredParam } from '@/hooks/use-required-param';

interface StoredReview {
  bookingId?: string;
  userId?: string;
  parentId?: string;
}

export default function SessionDetailScreen() {
  const bookingIdParam = useRequiredParam('id');
  const bookingId = bookingIdParam.valid ? bookingIdParam.value : '';
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();
  const {
    booking,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    isCoach,
    canCancelBooking,
    sessionNote,
    handlers,
    formatted,
  } = useBookingDetail(bookingId);
  const coachName = booking ? getBookingSummaryCoachName(booking) : 'Coach';
  const childName = booking ? getBookingSummaryClientName(booking) : 'Athlete';
  const [cancellationPolicy, setCancellationPolicy] = useState<import('@/constants/types').CancellationPolicy | null>(null);
  const [hasSubmittedReview, setHasSubmittedReview] = useState(false);

  const handleGoBack = useCallback(() => router.back(), []);

  useEffect(() => {
    if (!booking?.coachId) return;

    let isMounted = true;

    void cancellationService.getCancellationPolicy(booking.coachId).then((result) => {
      if (!isMounted) return;
      if (result.success) {
        setCancellationPolicy(result.data);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [booking?.coachId]);

  const loadReviewStatus = useCallback(async () => {
    if (!bookingId || isCoach || booking?.status !== 'Completed') {
      setHasSubmittedReview(false);
      return;
    }

    try {
      const reviews = await apiClient.get<StoredReview[]>('coach_reviews', []);
      const alreadyReviewed = reviews.some((review) => {
        if (review.bookingId !== bookingId) return false;
        if (!currentUser?.id) return true;
        return (
          review.userId === currentUser.id ||
          review.parentId === currentUser.id ||
          (!review.userId && !review.parentId)
        );
      });
      setHasSubmittedReview(alreadyReviewed);
    } catch {
      setHasSubmittedReview(false);
    }
  }, [booking?.status, bookingId, currentUser?.id, isCoach]);

  useFocusEffect(
    useCallback(() => {
      void loadReviewStatus();
    }, [loadReviewStatus]),
  );

  const handleReviewCoach = useCallback(() => {
    if (!bookingId || isCoach) return;
    router.push(Routes.review(bookingId));
  }, [bookingId, isCoach]);

  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (!bookingIdParam.valid) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <ErrorState
          message="Invalid link"
          description="The booking you are trying to open could not be found."
          onRetry={handleGoBack}
        />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <ErrorState message={error?.message ?? 'Failed to load booking details.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (status === 'empty' || !booking || !formatted) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <EmptyState
          icon="warning"
          title="Booking not found"
          message="Double-check the link or pick a booking from the list."
          actionLabel="Back to bookings"
          onPressAction={handleGoBack}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['bottom']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />
        }
      >
        {/* Header */}
        <ThemedView style={styles.headerSection}>
          <Row gap="sm" align="center" style={styles.backRow}>
            <Clickable
              onPress={handleGoBack}
              accessibilityLabel="Go back"
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={24} color={palette.text} />
            </Clickable>
            <ThemedText type="title" style={styles.flex1} numberOfLines={1}>
              {booking.service}
            </ThemedText>
            <StatusBadge status={booking.status} />
          </Row>
        </ThemedView>

        {!isCoach && (
          <ThemedView
            style={[
              styles.audienceChip,
              {
                backgroundColor: withAlpha(palette.tint, 0.08),
                borderColor: withAlpha(palette.tint, 0.22),
              },
            ]}
          >
            <Row align="center" gap="xs">
              <Ionicons name="person-outline" size={16} color={palette.tint} />
              <ThemedText style={[styles.audienceChipText, { color: palette.tint }]}>
                For: {childName}
              </ThemedText>
            </Row>
          </ThemedView>
        )}

        {/* Info Cards */}
        <DateTimeCard
          weekday={formatted.weekday}
          dateStr={formatted.dateStr}
          time={formatted.time}
        />
        <LocationCard locationLabel={booking.locationLabel} />
        <PaymentCard />
        {booking.coachId && (
          <CancellationPolicyCard coachId={booking.coachId} policy={cancellationPolicy ?? undefined} />
        )}
        <BookingCoachCard
          coachId={booking.coachId}
          bookingId={booking.id}
          coachName={coachName}
          coachPhotoUrl={formatted.coachPhotoUrl}
        />
        {/* Athlete Card (coach view, 1-on-1 sessions) */}
        {!booking.isGroupSession && booking.clientId && isCoach && (
          <BookingAthleteCard
            childName={childName}
            clientId={booking.clientId}
            clientPhotoUrl={booking.client?.photoUrl || 'https://i.pravatar.cc/100'}
          />
        )}

        {/* Participants (group sessions) */}
        {booking.isGroupSession && booking.participants && booking.participants.length > 0 && (
          <BookingParticipantsCard
            participants={booking.participants}
            currentParticipants={booking.currentParticipants}
            maxParticipants={booking.maxParticipants}
            coachId={booking.coachId}
            isCoach={isCoach}
          />
        )}

        {/* Session Notes */}
        <BookingNotesCard
          bookingId={bookingId}
          sessionNote={sessionNote.note}
          loading={sessionNote.loading}
          error={sessionNote.error}
          isCoach={isCoach}
          onRefresh={sessionNote.refresh}
        />

        {/* Follow-ups (coach only) */}
        {isCoach ? (
          <BookingFollowUpsCard
            sessionNote={sessionNote.note}
            loading={sessionNote.loading}
            onRefresh={sessionNote.refresh}
          />
        ) : null}

        {!isCoach && booking.status === 'Completed' && (
          <ThemedView style={[styles.reviewCard, { borderColor: palette.border }]}>
            <Row align="center" justify="between" gap="sm">
              <ThemedText type="defaultSemiBold">Session review</ThemedText>
              {hasSubmittedReview ? (
                <Row
                  align="center"
                  gap="xxs"
                  style={[styles.reviewStatusPill, { backgroundColor: withAlpha(palette.success, 0.1) }]}
                >
                  <Ionicons name="checkmark-circle" size={14} color={palette.success} />
                  <ThemedText style={[styles.reviewStatusText, { color: palette.success }]}>
                    Submitted
                  </ThemedText>
                </Row>
              ) : null}
            </Row>
            <ThemedText style={[styles.reviewCopy, { color: palette.muted }]}>
              Share feedback on this specific session to help improve future coaching.
            </ThemedText>
            <Clickable
              onPress={handleReviewCoach}
              disabled={hasSubmittedReview}
              style={[
                styles.reviewButton,
                hasSubmittedReview
                  ? { backgroundColor: palette.surface, borderColor: palette.border }
                  : { backgroundColor: palette.tint },
              ]}
              accessibilityLabel={
                hasSubmittedReview ? 'Review already submitted' : 'Review coach for this session'
              }
            >
              <Row align="center" justify="center" gap="xs">
                <Ionicons
                  name={hasSubmittedReview ? 'checkmark-done-circle' : 'star-outline'}
                  size={18}
                  color={hasSubmittedReview ? palette.muted : palette.onPrimary}
                />
                <ThemedText
                  style={[
                    styles.reviewButtonText,
                    { color: hasSubmittedReview ? palette.muted : palette.onPrimary },
                  ]}
                >
                  {hasSubmittedReview ? 'Review submitted' : 'Review coach'}
                </ThemedText>
              </Row>
            </Clickable>
          </ThemedView>
        )}

        {/* Action Buttons */}
        {isCoach ? (
          <BookingCoachView
            booking={booking}
            onMessageClient={handlers.messageCoach}
            onReschedule={handlers.reschedule}
            onRefund={handlers.refund}
            onCancelBooking={handlers.cancelBooking}
            canCancelBooking={canCancelBooking}
          />
        ) : (
          <BookingParentView
            onMessageCoach={handlers.messageCoach}
            onCancelBooking={handlers.cancelBooking}
            onReportProblem={handlers.reportProblem}
            canCancelBooking={canCancelBooking}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.md },
  headerSection: { gap: Spacing.sm, marginBottom: Spacing.sm },
  backRow: { marginTop: Spacing.xs },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  flex1: { flex: 1 },
  audienceChip: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  audienceChipText: {
    fontWeight: '700',
  },
  reviewCard: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  reviewCopy: {
    fontSize: Typography.bodySmall.fontSize,
    lineHeight: Typography.bodySmall.lineHeight,
  },
  reviewButton: {
    marginTop: Spacing.xs,
    minHeight: 48,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewButtonText: {
    fontWeight: '700',
  },
  reviewStatusPill: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
  },
  reviewStatusText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: '700',
  },
});
