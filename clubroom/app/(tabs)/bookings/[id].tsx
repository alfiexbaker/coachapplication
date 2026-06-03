import { useCallback, useEffect, useState, startTransition } from 'react';
import { View, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState, ErrorState, SectionSkeleton } from '@/components/ui/screen-states';
import { BookingCoachView } from '@/components/bookings/booking-coach-view';
import { BookingDeliveryOutcomeCard } from '@/components/bookings/booking-delivery-outcome-card';
import { BookingParentView } from '@/components/bookings/booking-parent-view';
import { BookingTrustCard } from '@/components/bookings/booking-trust-card';
import {
  DateTimeCard,
  LocationCard,
  BookingWeatherCard,
  PaymentCard,
  BookingCoachCard,
  BookingAthleteCard,
  BookingOwnershipCard,
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
import { invoiceService } from '@/services/invoice-service';
import { socialFeedService } from '@/services/social-feed-service';
import {
  getBookingRelationshipContext,
  getBookingStatusLabel,
  getBookingSummaryClientName,
  getBookingSummaryCoachName,
} from '@/utils/booking-display';
import { Routes } from '@/navigation/routes';
import { useRequiredParam } from '@/hooks/use-required-param';
import { getBookingReviewStatus } from '@/services/review-sync-service';
import { resolveDeepLink } from '@/utils/deep-link';
import { buildBookingDeliverySummary } from '@/utils/booking-delivery';

interface PaymentSnapshot {
  amount: number | null;
  invoiceStatus: 'DRAFT' | 'SENT' | 'PAID' | 'VOID' | 'WRITTEN_OFF' | 'NONE';
  dueDate?: string;
}

const ALLOWED_RETURN_TO_PATHS = new Set<string>([
  Routes.BOOKINGS as string,
  Routes.FAMILY as string,
  Routes.FAMILY_CALENDAR as string,
  Routes.FAMILY_RECURRING as string,
  Routes.SCHEDULE as string,
  Routes.MANAGE_BOOKINGS as string,
  Routes.SESSION_INVITES as string,
]);

function resolveAllowedReturnTo(raw: string | undefined): string | null {
  if (!raw) return null;
  const normalized = resolveDeepLink(raw);
  if (!normalized || typeof normalized !== 'string') {
    return null;
  }
  const path = normalized.split('?')[0] ?? normalized;
  return ALLOWED_RETURN_TO_PATHS.has(path) ? normalized : null;
}

export default function SessionDetailScreen() {
  const bookingIdParam = useRequiredParam('id');
  const bookingId = bookingIdParam.valid ? bookingIdParam.value : '';
  const detailParams = useLocalSearchParams<{ returnTo?: string }>();
  const safeReturnTo = (() => {
    const raw = typeof detailParams.returnTo === 'string' ? detailParams.returnTo.trim() : '';
    return resolveAllowedReturnTo(raw);
  })();
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
    canReopenBooking,
    sessionNote,
    deliveryFeedback,
    handlers,
    formatted,
    canCompleteSession,
  } = useBookingDetail(bookingId);
  const coachName = booking ? getBookingSummaryCoachName(booking) : 'Coach';
  const childName = booking ? getBookingSummaryClientName(booking) : 'Athlete';
  const statusLabel = booking
    ? getBookingStatusLabel(booking.status, { isCoachView: isCoach })
    : '';
  const [cancellationPolicy, setCancellationPolicy] = useState<
    import('@/constants/types').CancellationPolicy | null
  >(null);
  const [hasSubmittedReview, setHasSubmittedReview] = useState(false);
  const [organizationLabel, setOrganizationLabel] = useState<string | null>(null);
  const [paymentSnapshot, setPaymentSnapshot] = useState<PaymentSnapshot>({
    amount: null,
    invoiceStatus: 'NONE',
  });

  const handleGoBack = () => {
    if (safeReturnTo) {
      router.replace(safeReturnTo);
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(Routes.BOOKINGS);
  };

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

  useEffect(() => {
    const fallbackAmount = typeof booking?.price === 'number' ? booking.price : null;
    if (!booking?.id) {
      startTransition(() => {
        setPaymentSnapshot({ amount: fallbackAmount, invoiceStatus: 'NONE' });
      });
      return;
    }

    let isMounted = true;
    void invoiceService
      .getInvoiceByBookingId(booking.id)
      .then((invoice) => {
        if (!isMounted) return;
        if (!invoice) {
          setPaymentSnapshot({ amount: fallbackAmount, invoiceStatus: 'NONE' });
          return;
        }
        setPaymentSnapshot({
          amount: typeof invoice.total === 'number' ? invoice.total : fallbackAmount,
          invoiceStatus: invoice.status,
          dueDate: invoice.dueDate,
        });
      })
      .catch(() => {
        if (isMounted) {
          setPaymentSnapshot({ amount: fallbackAmount, invoiceStatus: 'NONE' });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [booking?.id, booking?.price]);

  useEffect(() => {
    if (booking?.actingAs !== 'club' || !booking.clubId) {
      startTransition(() => {
        setOrganizationLabel(null);
      });
      return;
    }

    let isMounted = true;
    void socialFeedService.getClub(booking.clubId).then((club) => {
      if (!isMounted) return;
      setOrganizationLabel(club?.name || booking.clubId || null);
    });

    return () => {
      isMounted = false;
    };
  }, [booking?.actingAs, booking?.clubId]);

  const loadReviewStatus = useCallback(async () => {
    if (!bookingId || isCoach || booking?.status !== 'Completed') {
      setHasSubmittedReview(false);
      return;
    }

    try {
      if (!booking) {
        setHasSubmittedReview(false);
        return;
      }
      if (!booking.coachId) {
        setHasSubmittedReview(false);
        return;
      }

      const reviewStatus = await getBookingReviewStatus({
        booking: {
          id: bookingId,
          coachId: booking.coachId,
          coachName: booking.coach?.name,
          athleteId: booking.clientId,
          athleteName: booking.client?.name,
          service: booking.service,
          scheduledAt: booking.start,
        },
        currentUser,
      });
      setHasSubmittedReview(reviewStatus.success && Boolean(reviewStatus.data));
    } catch {
      setHasSubmittedReview(false);
    }
  }, [booking, bookingId, currentUser, isCoach]);

  useFocusEffect(
    useCallback(() => {
      void loadReviewStatus();
    }, [loadReviewStatus]),
  );

  const handleReviewCoach = () => {
    if (!bookingId || isCoach) return;
    router.push(Routes.review(bookingId));
  };
  const relationshipContext = (() => {
    if (!booking) return null;
    return getBookingRelationshipContext({
      actingAs: booking.actingAs,
      organizationLabel,
      coachLabel: coachName,
      deliveredByLabel: booking.assigneeCoachName || coachName,
      commercialMode: booking.commercialMode,
    });
  })();
  const paymentHelperText = (() => {
    if (!relationshipContext) return undefined;
    if (isCoach) {
      return `Billing is handled by ${relationshipContext.billingLabel} outside the app. Track invoice status in your reconciler.`;
    }
    return relationshipContext.paymentSummary;
  })();
  const deliverySummary = buildBookingDeliverySummary({
    feedback: deliveryFeedback,
    note: sessionNote.note,
  });
  const handleOpenChildProgress = () => {
    if (!booking?.clientId) return;
    router.push(Routes.developmentChildProgress(booking.clientId, { tab: 'feedback' }));
  };

  if (status === 'loading' && !booking) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <ThemedView style={styles.headerSection}>
            <Row gap="sm" align="center" style={styles.backRow}>
              <Clickable onPress={handleGoBack} accessibilityLabel="Go back" style={styles.backBtn}>
                <Ionicons name="chevron-back" size={24} color={palette.text} />
              </Clickable>
              <ThemedText type="title" style={styles.flex1} numberOfLines={1}>
                Session
              </ThemedText>
            </Row>
          </ThemedView>
          <SectionSkeleton variant="hero" titleWidth="34%" />
          <SectionSkeleton variant="list" titleWidth="28%" />
        </ScrollView>
      </View>
    );
  }

  if (!bookingIdParam.valid) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <ErrorState
          message="Invalid link. The booking you are trying to open could not be found."
          onRetry={handleGoBack}
        />
      </View>
    );
  }

  if (status === 'error' && !booking) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <ErrorState message={error?.message ?? 'Failed to load booking details.'} onRetry={retry} />
      </View>
    );
  }

  if (status === 'empty' || !booking || !formatted) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <EmptyState
          icon="warning"
          title="Booking not found"
          message="Double-check the link or pick a booking from the list."
          actionLabel="Back to bookings"
          onPressAction={handleGoBack}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />
        }
      >
        {/* Header */}
        <ThemedView style={styles.headerSection}>
          <Row gap="sm" align="center" style={styles.backRow}>
            <Clickable onPress={handleGoBack} accessibilityLabel="Go back" style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={palette.text} />
            </Clickable>
            <ThemedText type="title" style={styles.flex1} numberOfLines={1}>
              {booking.service}
            </ThemedText>
            <StatusBadge status={booking.status} label={statusLabel} />
          </Row>
        </ThemedView>

        {/* Info Cards */}
        <DateTimeCard
          weekday={formatted.weekday}
          dateStr={formatted.dateStr}
          time={formatted.time}
        />
        <LocationCard locationLabel={booking.locationLabel} />
        <BookingWeatherCard locationLabel={booking.locationLabel} bookingStartIso={booking.start} />
        <PaymentCard
          amount={paymentSnapshot.amount}
          invoiceStatus={paymentSnapshot.invoiceStatus}
          dueDate={paymentSnapshot.dueDate}
          isCoachView={isCoach}
          onPressAction={isCoach ? () => router.push(Routes.EARNINGS) : handlers.messageCoach}
          helperTextOverride={paymentHelperText}
        />
        {booking.coachId && (
          <CancellationPolicyCard
            coachId={booking.coachId}
            policy={cancellationPolicy ?? undefined}
          />
        )}
        {!isCoach && booking.status === 'Confirmed' && !canCancelBooking ? (
          <ThemedView
            style={[
              styles.noticeCard,
              {
                backgroundColor: withAlpha(palette.warning, 0.08),
                borderColor: withAlpha(palette.warning, 0.22),
              },
            ]}
          >
            <Row align="start" gap="xs">
              <Ionicons name="information-circle-outline" size={18} color={palette.warning} />
              <ThemedText style={[styles.noticeText, { color: palette.text }]}>
                Free cancellation is unavailable within 24 hours of the session. Contact{' '}
                {relationshipContext?.supportLabel || 'support'} to discuss options.
              </ThemedText>
            </Row>
          </ThemedView>
        ) : null}
        <BookingCoachCard
          coachId={booking.coachId}
          bookingId={booking.id}
          coachName={coachName}
          coachPhotoUrl={formatted.coachPhotoUrl}
        />
        <BookingOwnershipCard booking={booking} coachLabel={coachName} showAuditTrail={isCoach} />
        {!isCoach && relationshipContext ? (
          <BookingTrustCard relationshipContext={relationshipContext} />
        ) : null}
        {/* Athlete Card (coach view, 1-on-1 sessions) */}
        {!booking.isGroupSession && booking.clientId && isCoach && (
          <BookingAthleteCard
            childName={childName}
            clientId={booking.clientId}
            clientPhotoUrl={booking.client?.photoUrl || 'https://i.pravatar.cc/100'}
          />
        )}

        {/* Participants (group sessions) */}
        {isCoach &&
          booking.isGroupSession &&
          booking.participants &&
          booking.participants.length > 0 && (
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
                  style={[
                    styles.reviewStatusPill,
                    { backgroundColor: withAlpha(palette.success, 0.1) },
                  ]}
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
            onReopenBooking={canReopenBooking ? handlers.reopenBooking : undefined}
            onRefund={handlers.refund}
            onCancelBooking={handlers.cancelBooking}
            canCancelBooking={canCancelBooking}
            onCompleteSession={handlers.completeSession}
            canCompleteSession={canCompleteSession}
          />
        ) : (
          <BookingParentView
            bookingStatus={booking.status}
            onMessageCoach={handlers.messageCoach}
            onCancelBooking={handlers.cancelBooking}
            onReportProblem={handlers.reportProblem}
            onReopenBooking={canReopenBooking ? handlers.reopenBooking : undefined}
            onRebook={handlers.rebook}
            onManageRecurring={booking.recurringBookingId ? handlers.manageRecurring : undefined}
            canCancelBooking={canCancelBooking}
            messageLabel="Message delivery coach"
            reportProblemLabel={relationshipContext?.reportProblemLabel}
          />
        )}

        {!isCoach && booking.status === 'Completed' && deliverySummary ? (
          <BookingDeliveryOutcomeCard
            childName={childName}
            summary={deliverySummary}
            onOpenProgress={booking.clientId ? handleOpenChildProgress : undefined}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.md },
  headerSection: { gap: Spacing.sm, marginBottom: Spacing.sm },
  backRow: { marginTop: Spacing.xs },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  flex1: { flex: 1 },
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
  noticeCard: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
  },
  noticeText: {
    flex: 1,
    fontSize: Typography.bodySmall.fontSize,
    lineHeight: Typography.bodySmall.lineHeight,
  },
});
