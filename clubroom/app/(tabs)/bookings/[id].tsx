import { useCallback, useEffect, useState, startTransition } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState, ErrorState, SectionSkeleton } from '@/components/ui/screen-states';
import { BookingCoachView } from '@/components/bookings/booking-coach-view';
import { BookingDeliveryOutcomeCard } from '@/components/bookings/booking-delivery-outcome-card';
import { BookingParentView } from '@/components/bookings/booking-parent-view';
import {
  BookingEssentialsCard,
  PaymentCard,
  BookingCoachCard,
  BookingAthleteCard,
} from '@/components/bookings/booking-info-cards';
import { BookingParticipantsCard } from '@/components/bookings/booking-participants-card';
import { BookingNotesCard } from '@/components/bookings/booking-notes-card';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { CancellationPolicyCard } from '@/components/booking/cancellation-policy-card';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useBookingDetail } from '@/hooks/use-booking-detail';
import { useAuth } from '@/hooks/use-auth';
import { cancellationService } from '@/services/cancellation-service';
import { invoiceService } from '@/services/invoice-service';
import { clubAuthorityService } from '@/services/club-authority-service';
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
  invoiceStatus: 'DRAFT' | 'SENT' | 'PAID' | 'VOID' | 'WRITTEN_OFF' | 'NONE' | 'UNKNOWN';
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
  const bookingId = bookingIdParam.valid ? bookingIdParam.value : undefined;
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
    canConfirmBooking,
    isConfirmingBooking,
    canDeclineRequest,
    canWithdrawRequest,
    isResolvingRequest,
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
    if (!booking?.coachId || !canCancelBooking) {
      startTransition(() => setCancellationPolicy(null));
      return;
    }

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
  }, [booking?.coachId, canCancelBooking]);

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
          setPaymentSnapshot({ amount: fallbackAmount, invoiceStatus: 'UNKNOWN' });
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
    void clubAuthorityService.getClubById(booking.clubId).then((result) => {
      if (!isMounted) return;
      const club = result.success ? result.data : null;
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
    if (paymentSnapshot.invoiceStatus === 'UNKNOWN') {
      return 'Payment status unavailable. Pull to refresh.';
    }
    if (!relationshipContext) return undefined;
    if (relationshipContext.billingLabel === 'Organization billing unavailable') {
      return 'Payment details unavailable.';
    }
    if (isCoach) {
      return `Handled by ${relationshipContext.billingLabel}. Track it in Earnings.`;
    }
    return `Pay ${relationshipContext.billingLabel} directly.`;
  })();
  const deliverySummary = buildBookingDeliverySummary({
    feedback: deliveryFeedback,
    note: sessionNote.note,
  });
  const handleOpenChildProgress = () => {
    if (!booking?.clientId) return;
    router.push(Routes.developmentChildProgress(booking.clientId, { tab: 'feedback' }));
  };

  if (!bookingIdParam.valid) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <EmptyState
          icon="link-outline"
          title="Invalid booking link"
          message="Open the session again from your bookings."
          actionLabel="Back to bookings"
          onPressAction={handleGoBack}
        />
      </SafeAreaView>
    );
  }

  if (status === 'loading' && !booking) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
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
      </SafeAreaView>
    );
  }

  if (status === 'error' && !booking) {
    if (error?.code === 'UNAUTHORIZED' || error?.code === 'NOT_FOUND') {
      return (
        <SafeAreaView
          style={[styles.container, { backgroundColor: palette.background }]}
          edges={['top', 'bottom']}
        >
          <EmptyState
            icon="lock-closed-outline"
            title="Booking unavailable"
            message="This session is not available to your account."
            actionLabel="Back to bookings"
            onPressAction={handleGoBack}
          />
        </SafeAreaView>
      );
    }
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
      edges={['top', 'bottom']}
    >
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
            <ThemedText style={[styles.backLabel, { color: palette.muted }]}>Bookings</ThemedText>
            <ThemedView style={styles.flex1} />
            <StatusBadge status={booking.status} label={statusLabel} />
          </Row>
          <ThemedText type="title" style={styles.sessionTitle}>
            {booking.service}
          </ThemedText>
        </ThemedView>

        <BookingEssentialsCard
          weekday={formatted.weekday}
          dateStr={formatted.dateStr}
          time={formatted.time}
          locationLabel={booking.locationLabel}
        />

        {isCoach ? (
          <BookingCoachView
            booking={booking}
            onMessageClient={handlers.messageCoach}
            onReopenBooking={canReopenBooking ? handlers.reopenBooking : undefined}
            onCancelBooking={handlers.cancelBooking}
            canCancelBooking={canCancelBooking}
            onConfirmBooking={canConfirmBooking ? handlers.confirmBooking : undefined}
            onDeclineRequest={canDeclineRequest ? handlers.declineRequest : undefined}
            isConfirmingBooking={isConfirmingBooking}
            isResolvingRequest={isResolvingRequest}
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
            onWithdrawRequest={canWithdrawRequest ? handlers.withdrawRequest : undefined}
            isResolvingRequest={isResolvingRequest}
            canCancelBooking={canCancelBooking}
            messageLabel="Message coach"
            reportProblemLabel={relationshipContext?.reportProblemLabel}
          />
        )}

        <PaymentCard
          amount={paymentSnapshot.amount}
          invoiceStatus={paymentSnapshot.invoiceStatus}
          dueDate={paymentSnapshot.dueDate}
          isCoachView={isCoach}
          helperTextOverride={paymentHelperText}
        />
        {booking.coachId && canCancelBooking && (
          <CancellationPolicyCard
            coachId={booking.coachId}
            policy={cancellationPolicy ?? undefined}
          />
        )}
        {!isCoach ? (
          <BookingCoachCard
            coachId={booking.coachId}
            bookingId={booking.id}
            coachName={coachName}
            coachPhotoUrl={formatted.coachPhotoUrl}
          />
        ) : null}
        {/* Athlete Card (coach view, 1-on-1 sessions) */}
        {!booking.isGroupSession && booking.clientId && isCoach && (
          <BookingAthleteCard
            childName={childName}
            clientId={booking.clientId}
            clientPhotoUrl={booking.client?.photoUrl || undefined}
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

        {(isCoach && (canCompleteSession || booking.status === 'Completed')) ||
        (!isCoach && booking.status === 'Completed') ? (
          <BookingNotesCard
            bookingId={booking.id}
            sessionNote={sessionNote.note}
            loading={sessionNote.loading}
            error={sessionNote.error}
            isCoach={isCoach}
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

        {!isCoach && booking.status === 'Completed' && deliverySummary ? (
          <BookingDeliveryOutcomeCard
            childName={childName}
            summary={deliverySummary}
            onOpenProgress={booking.clientId ? handleOpenChildProgress : undefined}
          />
        ) : null}
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
  backLabel: { ...Typography.bodySmall, fontWeight: '600' },
  sessionTitle: { paddingHorizontal: Spacing.xs },
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
});
