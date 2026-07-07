import { useCallback, useEffect, useState, startTransition } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { BookingWizardHeader, SummaryRow } from '@/components/ui/booking/booking-wizard';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import {
  BookingTotalsCard,
  PaymentMethodCard,
} from '@/components/ui/booking/review-payment-sections';
import { CancellationPolicyCard } from '@/components/booking/cancellation-policy-card';
import { EmptyState, ErrorState, SectionSkeleton } from '@/components/ui/screen-states';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { err, ok, serviceError } from '@/types/result';
import { useBookingFlow } from '@/context/booking-flow-context';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { bookingStepAnalyticsService } from '@/services/booking/booking-step-analytics-service';
import { apiClient } from '@/services/api-client';
import { coachService } from '@/services/coach-service';
import type { Coach } from '@/services/coach-service';
import { listPublicCoachOfferingsFromApi } from '@/services/coach-offering-api';
import { schedulingRulesService } from '@/services/scheduling-rules-service';
import type { CancellationPolicy, OrganizationCommercialMode } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { BOOKING_LOCATION_OPTIONS } from '@/constants/booking-flow';
import { socialFeedService } from '@/services/social-feed-service';
import { userService } from '@/services/user-service';
import { hasAccountChildren } from '@/utils/booking-self-capability';
import {
  formatServiceTypeLabel,
  getBookingRelationshipContext,
  safeDisplayLabel,
} from '@/utils/booking-display';

const logger = createLogger('BookingReview');

interface ReviewLoadData {
  coach: Coach | null;
  cancellationPolicy: CancellationPolicy;
}

function createPublicBookingCoachFallback(input: {
  coachId: string;
  coachName?: string;
  minPrice?: number;
}): Coach {
  return {
    id: input.coachId,
    name: safeDisplayLabel(input.coachName, 'Coach'),
    sports: ['Football'],
    rating: 0,
    reviewCount: 0,
    minPrice: input.minPrice ?? 60,
    totalSessions: 0,
    badges: ['Bookable'],
  };
}

export default function ReviewScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const { draft, updateDraft } = useBookingFlow();
  const { currentUser } = useAuth();
  const { children } = useChildContext();
  const [clubLabel, setClubLabel] = useState<string | null>(null);
  const [assigneeLabel, setAssigneeLabel] = useState<string | null>(null);
  const [commercialMode, setCommercialMode] = useState<OrganizationCommercialMode | null>(
    draft.commercialMode ?? null,
  );

  const loadCoach = useCallback(async () => {
    if (!coachId) {
      return err(serviceError('UNKNOWN', 'Coach not provided for booking review.'));
    }
    try {
      const [coachResult, policyResult] = await Promise.all([
        coachService.getCoach(coachId),
        schedulingRulesService.getCancellationPolicy(coachId),
      ]);

      const cancellationPolicy =
        policyResult.success && policyResult.data
          ? policyResult.data
          : schedulingRulesService.getDefaultCancellationPolicy();

      if (!coachResult.success) {
        if (coachResult.error.code !== 'NOT_FOUND') {
          return err(coachResult.error);
        }

        if (apiClient.isMockMode) {
          return ok<ReviewLoadData | null>(null);
        }

        const offeringsResult = await listPublicCoachOfferingsFromApi(
          coachId,
          new Date().toISOString(),
        );
        if (!offeringsResult.success && !draft.coachName) {
          return ok<ReviewLoadData | null>(null);
        }

        const firstOffering = offeringsResult.success ? offeringsResult.data[0] : undefined;
        return ok<ReviewLoadData | null>({
          coach: createPublicBookingCoachFallback({
            coachId,
            coachName: draft.coachName,
            minPrice: draft.price ?? firstOffering?.price,
          }),
          cancellationPolicy,
        });
      }

      return ok<ReviewLoadData | null>({
        coach: coachResult.data,
        cancellationPolicy,
      });
    } catch (loadError) {
      logger.error('Failed to load coach:', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load coach details for review.', loadError));
    }
  }, [coachId, draft.coachName, draft.price]);

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    colors: palette,
  } = useScreen<ReviewLoadData | null>({
    load: loadCoach,
    deps: [loadCoach],
    isEmpty: (reviewData) => reviewData === null,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
  });
  const coach = data?.coach ?? null;
  const cancellationPolicy = data?.cancellationPolicy ?? null;
  const resolvedCoachId = coachId || draft.coachId;
  const selectedAthleteCount = draft.childIds?.length ?? (draft.childId ? 1 : 0);
  const accountHasChildren = hasAccountChildren({
    contextChildCount: children.length,
    accountChildRefCount: currentUser?.children?.length ?? 0,
  });
  const hasRequiredDraft =
    Boolean(resolvedCoachId) &&
    Boolean(coach?.name || draft.coachName) &&
    Boolean(draft.date && draft.slot) &&
    Boolean(selectedAthleteCount > 0 || draft.athleteName);

  useEffect(() => {
    if (coach?.name) {
      updateDraft({ coachName: coach.name });
    }
  }, [coach?.name, updateDraft]);

  useEffect(() => {
    if (!draft.clubId) {
      startTransition(() => {
        setClubLabel(null);
      });
      return;
    }
    let cancelled = false;
    void socialFeedService.getClub(draft.clubId).then((club) => {
      if (cancelled) return;
      if (club?.name) {
        setClubLabel(club.name);
        const nextCommercialMode = club.commercialMode ?? 'COACH_OWNED';
        setCommercialMode(nextCommercialMode);
        if (draft.commercialMode !== nextCommercialMode) {
          updateDraft({ commercialMode: nextCommercialMode });
        }
      } else {
        setClubLabel(safeDisplayLabel(draft.clubId, 'Club session'));
        setCommercialMode('COACH_OWNED');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [draft.clubId, draft.commercialMode, updateDraft]);

  useEffect(() => {
    if (!draft.assigneeCoachId) {
      startTransition(() => {
        setAssigneeLabel(null);
      });
      return;
    }
    let cancelled = false;
    void userService.getUserById(draft.assigneeCoachId).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setAssigneeLabel(result.data.name?.trim() || safeDisplayLabel(draft.assigneeCoachId, 'Coach'));
      } else {
        setAssigneeLabel(safeDisplayLabel(draft.assigneeCoachId, 'Coach'));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [draft.assigneeCoachId]);

  const sessionPrice = draft.price ?? coach?.minPrice ?? 60;
  const total = sessionPrice;
  const locationSummary = (() => {
    const locationText = draft.locationText?.trim();
    if (!locationText) {
      return draft.locationOption || 'Coach preferred location';
    }
    if (draft.locationOption && draft.locationOption !== BOOKING_LOCATION_OPTIONS.COACH_PRESET) {
      return `${draft.locationOption} · ${locationText}`;
    }
    return locationText;
  })();
  const reviewDateLabel = (() => {
    if (!draft.date) return 'Pick a date';
    const parsed = new Date(`${draft.date}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return draft.date;
    return parsed.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  })();
  const reviewTimeLabel = (() => {
    if (!draft.slot) return 'Pick a slot';
    const parsed = new Date(`1970-01-01T${draft.slot}:00`);
    if (Number.isNaN(parsed.getTime())) return draft.slot;
    return parsed.toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
    });
  })();
  const relationshipContext = getBookingRelationshipContext({
    actingAs: draft.actingAs,
    organizationLabel: clubLabel,
    coachLabel: coach?.name || draft.coachName || 'Coach',
    deliveredByLabel: assigneeLabel || coach?.name || draft.coachName || 'Coach',
    commercialMode,
  });

  const handleBack = () => {
    void bookingStepAnalyticsService.track({
      step: 'review',
      status: 'abandoned',
      failure_code: 'back_navigation',
      role: currentUser?.role,
      currentUserId: currentUser?.id,
      hasChildren: accountHasChildren,
      actingAs: draft.actingAs,
      draft,
    });
    router.back();
  };

  const handleContinue = () => {
    if (!resolvedCoachId) {
      void bookingStepAnalyticsService.track({
        step: 'review',
        status: 'validation_fail',
        failure_code: 'missing_coach_id',
        role: currentUser?.role,
        currentUserId: currentUser?.id,
        hasChildren: accountHasChildren,
        actingAs: draft.actingAs,
        draft,
      });
      return;
    }

    if (!hasRequiredDraft) {
      void bookingStepAnalyticsService.track({
        step: 'review',
        status: 'validation_fail',
        failure_code: 'incomplete_booking_draft',
        role: currentUser?.role,
        currentUserId: currentUser?.id,
        hasChildren: accountHasChildren,
        actingAs: draft.actingAs,
        draft,
      });
      return;
    }

    void bookingStepAnalyticsService.track({
      step: 'review',
      status: 'success',
      role: currentUser?.role,
      currentUserId: currentUser?.id,
      hasChildren: accountHasChildren,
      actingAs: draft.actingAs,
      draft,
    });

    updateDraft({ totalPrice: total, price: sessionPrice });
    router.push(Routes.bookConfirmation(resolvedCoachId));
  };

  if (status === 'error' && !coach) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <ErrorState
          message={error?.message ?? 'Failed to load booking review details.'}
          onRetry={retry}
        />
      </SafeAreaView>
    );
  }

  if (status === 'empty') {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <EmptyState
          icon="person-outline"
          title="Booking details unavailable"
          message="We could not load enough live booking details to review this request. Go back and choose the session again."
          actionLabel="Go back"
          onPressAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />
        }
      >
        <BookingWizardHeader
          title="Review booking"
          subtitle="Check details"
          step={4}
          onBack={handleBack}
        />

        {status === 'loading' && !coach ? (
          <>
            <SectionSkeleton variant="form" titleWidth="36%" />
            <SectionSkeleton variant="card" titleWidth="28%" />
          </>
        ) : (
          <>
            <View style={[styles.card, { borderColor: palette.border }]}>
              <SummaryRow label="Booked with" value={relationshipContext.bookedWithLabel} />
              {relationshipContext.organizationLabel ? (
                <SummaryRow label="Organization" value={relationshipContext.organizationLabel} />
              ) : null}
              {draft.actingAs === 'club' ? (
                <SummaryRow label="Delivered by" value={relationshipContext.deliveredByLabel} />
              ) : null}
              <SummaryRow label="Billing" value={relationshipContext.billingLabel} />
              <SummaryRow label="Date" value={reviewDateLabel} />
              <SummaryRow label="Time" value={reviewTimeLabel} />
              <SummaryRow
                label="Session"
                value={
                  draft.sessionTypeLabel ||
                  (draft.sessionType ? formatServiceTypeLabel(draft.sessionType) : 'Select type')
                }
              />
              <SummaryRow label="Duration" value={`${draft.duration || 60} mins`} />
              <SummaryRow label="Location" value={locationSummary} />
              {selectedAthleteCount > 1 ? (
                <SummaryRow label="Athletes" value={`${selectedAthleteCount} selected`} />
              ) : draft.athleteName ? (
                <SummaryRow label="Athlete" value={draft.athleteName} />
              ) : null}
            </View>

            <PaymentMethodCard
              colors={palette}
              paymentMethod={relationshipContext.paymentSummary}
            />

            {coach && cancellationPolicy ? (
              <>
                <CancellationPolicyCard coachId={coach.id} policy={cancellationPolicy} />
                <ThemedText style={[styles.policyNote, { color: palette.muted }]}>
                  By continuing, you agree to this cancellation policy and any applicable refund
                  rules.
                </ThemedText>
              </>
            ) : null}

            <BookingTotalsCard
              colors={palette}
              sessionPrice={sessionPrice}
              total={total}
            />
            {!hasRequiredDraft ? (
              <ThemedText style={[styles.rateNote, { color: palette.warning }]}>
                Complete session type, schedule, and athlete details before confirmation.
              </ThemedText>
            ) : null}

            {coach?.minPrice ? (
              <ThemedText style={[styles.rateNote, { color: palette.muted }]}>
                {coach.name}&apos;s rate: £{coach.minPrice}/hour
              </ThemedText>
            ) : null}
          </>
        )}
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <Clickable
          onPress={handleContinue}
          style={[
            styles.cta,
            {
              backgroundColor: hasRequiredDraft ? palette.tint : withAlpha(palette.tint, 0.45),
            },
          ]}
          disabled={!hasRequiredDraft}
        >
          <Row justify="center" align="center" gap="sm">
            <Ionicons
              name="receipt-outline"
              size={18}
              color={palette.onPrimary}
            />
            <ThemedText style={{ color: palette.onPrimary, fontWeight: '700' }}>
              Continue to confirmation (£{total.toFixed(2)})
            </ThemedText>
          </Row>
        </Clickable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  card: { padding: Spacing.lg, borderRadius: Radii.lg, borderWidth: 1.5, gap: Spacing.xs },
  policyNote: { ...Typography.caption, textAlign: 'center', marginTop: -Spacing.sm },
  rateNote: { ...Typography.caption, textAlign: 'center' },
  footer: { padding: Spacing.lg, borderTopWidth: 1 },
  cta: { padding: Spacing.md, borderRadius: Radii.button },
});
