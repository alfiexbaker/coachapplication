import { useState, useRef, useEffect, startTransition } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Row } from '@/components/primitives/row';
import { BookingWizardHeader } from '@/components/ui/booking/booking-wizard';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useBookingFlow } from '@/context/booking-flow-context';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { CancellationPolicyCard } from '@/components/booking/cancellation-policy-card';
import { bookingService } from '@/services/booking-service';
import { bookingStepAnalyticsService } from '@/services/booking/booking-step-analytics-service';
import { bookingSelfSettingService } from '@/services/booking-self-setting-service';
import { cancellationService } from '@/services/cancellation-service';
import { coachService } from '@/services/coach-service';
import { clubAuthorityService } from '@/services/club-authority-service';
import { userService } from '@/services/user-service';
import { createLogger } from '@/utils/logger';
import { CelebrationOverlay, CelebrationOverlayRef } from '@/components/celebration-overlay';
import { hasAccountChildren } from '@/utils/booking-self-capability';
import {
  formatServiceTypeLabel,
  getBookingRelationshipContext,
  safeDisplayLabel,
} from '@/utils/booking-display';
import { hasResolvedBookingTargets, resolveBookingDraftTargets } from '@/utils/booking-targets';
import type { OrganizationCommercialMode } from '@/constants/types';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('ConfirmationScreen');

export default function ConfirmationScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const { draft, reset } = useBookingFlow();
  const { currentUser } = useAuth();
  const { children } = useChildContext();
  const accountHasChildren = hasAccountChildren({
    contextChildCount: children.length,
    accountChildRefCount: currentUser?.children?.length ?? 0,
  });

  const [isCreating, setIsCreating] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolvedCoachName, setResolvedCoachName] = useState(draft.coachName ?? '');
  const [clubLabel, setClubLabel] = useState<string | null>(null);
  const [assigneeLabel, setAssigneeLabel] = useState<string | null>(null);
  const [commercialMode, setCommercialMode] = useState<OrganizationCommercialMode | null>(
    draft.commercialMode ?? null,
  );
  const [cancellationPolicy, setCancellationPolicy] = useState<
    import('@/constants/types').CancellationPolicy | null
  >(null);
  const celebrationRef = useRef<CelebrationOverlayRef>(null);
  const resolvedCoachId = coachId || draft.coachId;
  const trackConfirmStep = (
    status: 'success' | 'validation_fail' | 'conflict_fail' | 'abandoned',
    failureCode?: string,
  ) => {
    void bookingStepAnalyticsService.track({
      step: 'confirm',
      status,
      failure_code: failureCode,
      role: currentUser?.role,
      currentUserId: currentUser?.id,
      hasChildren: accountHasChildren,
      actingAs: draft.actingAs,
      draft,
    });
  };
  const handleOpenBooking = (id: string) => {
    reset();
    router.replace(Routes.booking(id, { returnTo: Routes.BOOKINGS as string }));
  };
  const handleMessageCoach = () => {
    if (!resolvedCoachId) return;
    router.push(Routes.messagesWith({ coachId: resolvedCoachId }));
  };
  const handleBack = () => {
    if (!bookingId && !isCreating) {
      trackConfirmStep('abandoned', 'back_navigation');
    }
    router.back();
  };

  useEffect(() => {
    startTransition(() => {
      setResolvedCoachName(draft.coachName ?? '');
    });
  }, [draft.coachName]);

  useEffect(() => {
    if (!resolvedCoachId || resolvedCoachName.trim().length > 0) {
      return;
    }

    let isMounted = true;
    void coachService.getCoach(resolvedCoachId).then((result) => {
      if (!isMounted || !result.success) {
        return;
      }
      setResolvedCoachName(result.data.name ?? '');
    });

    return () => {
      isMounted = false;
    };
  }, [resolvedCoachId, resolvedCoachName]);

  useEffect(() => {
    if (!resolvedCoachId) return;

    let isMounted = true;

    void cancellationService.getCancellationPolicy(resolvedCoachId).then((result) => {
      if (!isMounted) return;
      if (result.success) {
        setCancellationPolicy(result.data);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [resolvedCoachId]);

  useEffect(() => {
    if (!draft.clubId) {
      startTransition(() => {
        setClubLabel(null);
      });
      return;
    }
    let cancelled = false;
    void clubAuthorityService.getClubById(draft.clubId).then((result) => {
      if (cancelled) return;
      const club = result.success ? result.data : null;
      if (club?.name) {
        setClubLabel(club.name);
        setCommercialMode(club.commercialMode ?? 'COACH_OWNED');
      } else {
        setClubLabel(safeDisplayLabel(draft.clubId, 'Club session'));
        setCommercialMode('COACH_OWNED');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [draft.clubId]);

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
        setAssigneeLabel(
          result.data.name?.trim() || safeDisplayLabel(draft.assigneeCoachId, 'Coach'),
        );
      } else {
        setAssigneeLabel(safeDisplayLabel(draft.assigneeCoachId, 'Coach'));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [draft.assigneeCoachId]);
  const relationshipContext = getBookingRelationshipContext({
    actingAs: draft.actingAs,
    organizationLabel: clubLabel,
    coachLabel: resolvedCoachName || draft.coachName || 'Coach',
    deliveredByLabel: assigneeLabel || resolvedCoachName || draft.coachName || 'Coach',
    commercialMode,
  });
  const hasCreatedBooking = Boolean(bookingId);

  const handleViewBooking = async () => {
    if (bookingId) {
      // Booking already created, just navigate
      handleOpenBooking(bookingId);
      return;
    }

    setIsCreating(true);
    setError(null);

    return await runAsyncTryCatchFinally(
      async () => {
        const resolvedCoach = coachId || draft.coachId;
        const coachName = (draft.coachName || resolvedCoachName || '').trim();
        const { athleteIds: selectedAthleteIds, athleteNames: selectedAthleteNames } =
          resolveBookingDraftTargets({ draft, currentUser, children });
        const bookedByName = (currentUser?.name || currentUser?.fullName || '').trim();
        const location = draft.locationText?.trim() ?? '';
        const duration =
          typeof draft.duration === 'number' && Number.isFinite(draft.duration)
            ? draft.duration
            : null;
        const hasResolvedPrice = typeof draft.price === 'number' && Number.isFinite(draft.price);

        if (!resolvedCoach || !coachName) {
          trackConfirmStep('validation_fail', 'missing_coach_context');
          setError('Missing coach information. Please go back and try again.');
          setIsCreating(false);
          return;
        }
        if (selectedAthleteIds.length === 0 || selectedAthleteNames.length === 0) {
          trackConfirmStep('validation_fail', 'missing_booking_target');
          setError(
            'No booking target selected. Please go back and choose who this session is for.',
          );
          setIsCreating(false);
          return;
        }
        if (
          !hasResolvedBookingTargets({
            athleteIds: selectedAthleteIds,
            athleteNames: selectedAthleteNames,
          })
        ) {
          trackConfirmStep('validation_fail', 'missing_athlete_names');
          setError('Missing athlete details. Please go back and choose the session target again.');
          setIsCreating(false);
          return;
        }
        if (!currentUser?.id) {
          trackConfirmStep('validation_fail', 'missing_current_user');
          setError('You must be logged in to book a session.');
          setIsCreating(false);
          return;
        }
        if (!bookedByName) {
          trackConfirmStep('validation_fail', 'missing_booker_name');
          setError('Your account name is missing. Update your profile before booking.');
          setIsCreating(false);
          return;
        }
        if (accountHasChildren && selectedAthleteIds.includes(currentUser.id)) {
          let canBookSelf = false;
          try {
            canBookSelf = await bookingSelfSettingService.isEnabled(currentUser.id);
          } catch (preferenceError) {
            logger.error('Failed to verify self-booking setting', preferenceError);
            setError('Could not verify self-booking setting. Please try again.');
            setIsCreating(false);
            return;
          }
          if (!canBookSelf) {
            trackConfirmStep('validation_fail', 'self_booking_disabled');
            setError('Booking for yourself is disabled. Enable it in Settings to continue.');
            setIsCreating(false);
            return;
          }
        }
        if (!draft.date || !draft.slot) {
          trackConfirmStep('validation_fail', !draft.date ? 'missing_date' : 'missing_slot');
          setError('Missing date or time. Please go back and select a slot.');
          setIsCreating(false);
          return;
        }
        if (!duration || duration <= 0) {
          trackConfirmStep('validation_fail', 'missing_duration');
          setError('Missing session duration. Please go back and choose the session again.');
          setIsCreating(false);
          return;
        }
        if (!location) {
          trackConfirmStep('validation_fail', 'missing_location');
          setError('Missing session location. Please go back and choose the session again.');
          setIsCreating(false);
          return;
        }
        if (!hasResolvedPrice) {
          trackConfirmStep('validation_fail', 'missing_price');
          setError('Missing session price. Please go back and choose the session again.');
          setIsCreating(false);
          return;
        }

        const serviceLabel =
          draft.sessionTypeLabel?.trim() ||
          (draft.sessionType ? formatServiceTypeLabel(draft.sessionType) : '');
        const serviceType = draft.sessionType?.trim();
        if (!serviceType || !serviceLabel) {
          trackConfirmStep('validation_fail', 'missing_session_type');
          setError('Missing session type. Please go back and choose the session again.');
          setIsCreating(false);
          return;
        }

        const result = await bookingService.createBooking({
          coachId: resolvedCoach,
          coachName,
          athleteIds: selectedAthleteIds,
          athleteNames: selectedAthleteNames,
          bookedById: currentUser.id,
          bookedByName,
          scheduledAt: `${draft.date}T${draft.slot}:00`,
          duration,
          location,
          service: serviceLabel,
          serviceType,
          sessionOfferingId: draft.sessionOfferingId,
          sessionSource: draft.sessionSource,
          sessionSourceEntityId: draft.sessionSourceEntityId || draft.sessionOfferingId,
          clubId: draft.clubId,
          actingAs: draft.actingAs,
          commercialMode: commercialMode ?? draft.commercialMode,
          ownerCoachId: draft.ownerCoachId,
          assigneeCoachId: draft.assigneeCoachId,
          createdByUserId: draft.createdByUserId,
          createdByRole: draft.createdByRole,
          objectives: draft.objectives,
          price: draft.price,
          notes: draft.notes,
        });

        if (result.success && result.data) {
          trackConfirmStep('success');
          setBookingId(result.data.id);

          // Trigger celebration with haptics
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          celebrationRef.current?.celebrate({
            title: 'Booking Confirmed!',
            subtitle: `Session with ${coachName} is all set`,
            icon: 'checkmark-circle',
            iconColor: palette.success,
            duration: 2500,
          });

          // Navigate after celebration
          setTimeout(() => {
            handleOpenBooking(result.data!.id);
          }, 2600);
        } else {
          const resultCode = !result.success ? result.error?.code : undefined;
          const status =
            resultCode === 'CONFLICT'
              ? 'conflict_fail'
              : resultCode === 'VALIDATION'
                ? 'validation_fail'
                : 'conflict_fail';
          trackConfirmStep(status, (resultCode || 'booking_create_failed').toLowerCase());
          setError(
            result.success
              ? 'Failed to create booking.'
              : result.error?.message ||
                  'Failed to create booking. The slot may no longer be available.',
          );
        }
      },
      async (err) => {
        trackConfirmStep('conflict_fail', 'unexpected_error');
        logger.error('Error creating booking', err);
        setError('An unexpected error occurred. Please try again.');
      },
      () => {
        setIsCreating(false);
      },
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.content}>
        <BookingWizardHeader
          title={hasCreatedBooking ? 'Booking confirmed' : 'Confirm booking'}
          subtitle={
            hasCreatedBooking
              ? 'Your coach will confirm within 24 hours'
              : 'Review the details before we place this booking'
          }
          step={5}
          onBack={handleBack}
        />

        <View
          style={[
            styles.checkCircle,
            { borderColor: palette.tint, backgroundColor: withAlpha(palette.tint, 0.07) },
          ]}
        >
          <Ionicons
            name={hasCreatedBooking ? 'checkmark' : 'calendar-outline'}
            size={48}
            color={palette.tint}
          />
        </View>

        <View style={{ gap: Spacing.sm }}>
          <ThemedText type="defaultSemiBold">
            {hasCreatedBooking ? "What's next" : 'Before you confirm'}
          </ThemedText>
          <ThemedText style={{ color: palette.muted }}>
            {hasCreatedBooking
              ? `${
                  draft.actingAs === 'club'
                    ? relationshipContext.commercialMode === 'ORG_OWNED'
                      ? `Your booking request is in with ${relationshipContext.bookedWithLabel}.`
                      : `Your booking request is in via ${relationshipContext.organizationLabel || 'the organization'}.`
                    : 'Your booking request is in.'
                } ${relationshipContext.paymentSummary} You can message your coach anytime or add this to your calendar.`
              : `We will only place this booking after Clubroom confirms the slot, booking target, and coach rules through the live booking API. ${relationshipContext.paymentSummary}`}
          </ThemedText>
        </View>

        {/* Show booking summary */}
        <View style={[styles.summaryCard, { borderColor: palette.border }]}>
          <Row align="center" gap="sm">
            <Ionicons name="calendar-outline" size={18} color={palette.muted} />
            <ThemedText style={{ color: palette.text }}>
              {draft.date ? formatDate(draft.date) : 'No date selected'}
            </ThemedText>
          </Row>
          <Row align="center" gap="sm">
            <Ionicons name="time-outline" size={18} color={palette.muted} />
            <ThemedText style={{ color: palette.text }}>
              {draft.slot || 'No time selected'}
            </ThemedText>
          </Row>
          {draft.actingAs === 'club' ? (
            <Row align="center" gap="sm">
              <Ionicons name="business-outline" size={18} color={palette.muted} />
              <ThemedText style={{ color: palette.text }}>
                Organization{' '}
                {relationshipContext.organizationLabel ||
                  clubLabel ||
                  safeDisplayLabel(draft.clubId, '') ||
                  'Organization'}
              </ThemedText>
            </Row>
          ) : null}
          <Row align="center" gap="sm">
            <Ionicons name="receipt-outline" size={18} color={palette.muted} />
            <ThemedText style={{ color: palette.text }}>
              Booked with {relationshipContext.bookedWithLabel}
            </ThemedText>
          </Row>
          {draft.actingAs === 'club' ? (
            <Row align="center" gap="sm">
              <Ionicons name="person-outline" size={18} color={palette.muted} />
              <ThemedText style={{ color: palette.text }}>
                Delivered by {relationshipContext.deliveredByLabel}
              </ThemedText>
            </Row>
          ) : null}
          <Row align="center" gap="sm">
            <Ionicons name="card-outline" size={18} color={palette.muted} />
            <ThemedText style={{ color: palette.text }}>
              Billing {relationshipContext.billingLabel}
            </ThemedText>
          </Row>
          {draft.locationText && (
            <Row align="center" gap="sm">
              <Ionicons name="location-outline" size={18} color={palette.muted} />
              <ThemedText style={{ color: palette.text }}>{draft.locationText}</ThemedText>
            </Row>
          )}
          {resolvedCoachId && (
            <CancellationPolicyCard
              coachId={resolvedCoachId}
              policy={cancellationPolicy ?? undefined}
            />
          )}
        </View>

        {error && (
          <Row
            align="center"
            gap="sm"
            style={[
              styles.errorBox,
              { backgroundColor: withAlpha(palette.error, 0.08), borderColor: palette.error },
            ]}
          >
            <Ionicons name="alert-circle" size={20} color={palette.error} />
            <ThemedText style={{ color: palette.error, flex: 1 }}>{error}</ThemedText>
          </Row>
        )}
      </View>

      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <Clickable
          onPress={handleViewBooking}
          style={[styles.cta, { backgroundColor: palette.tint }]}
          disabled={isCreating}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color={palette.onPrimary} />
          ) : (
            <ThemedText style={{ color: palette.onPrimary, fontWeight: '700' }}>
              {hasCreatedBooking ? 'View booking' : 'Confirm booking'}
            </ThemedText>
          )}
        </Clickable>
        {hasCreatedBooking ? (
          <Clickable
            onPress={handleMessageCoach}
            style={[styles.secondary, { borderColor: palette.tint }]}
            disabled={isCreating}
          >
            <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>
              Message coach
            </ThemedText>
          </Clickable>
        ) : null}
      </View>

      <CelebrationOverlay ref={celebrationRef} />
    </SafeAreaView>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg, flex: 1 },
  checkCircle: {
    width: 120,
    height: 120,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    alignSelf: 'center',
  },
  summaryCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  summaryRow: {},
  errorBox: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  footer: { padding: Spacing.lg, borderTopWidth: 1, gap: Spacing.sm },
  cta: { padding: Spacing.md, borderRadius: Radii.button, alignItems: 'center' },
  secondary: {
    padding: Spacing.md,
    borderRadius: Radii.button,
    alignItems: 'center',
    borderWidth: 1.5,
  },
});
