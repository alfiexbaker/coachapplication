import { useState, useRef, useEffect, startTransition } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View, ActivityIndicator, ScrollView } from 'react-native';
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
import { resolveSelfAthleteId } from '@/utils/athlete-identity';

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
  const [clubContextLoading, setClubContextLoading] = useState(Boolean(draft.clubId));
  const [clubContextError, setClubContextError] = useState<string | null>(null);
  const [assigneeLabel, setAssigneeLabel] = useState<string | null>(null);
  const [assigneeContextLoading, setAssigneeContextLoading] = useState(
    Boolean(draft.assigneeCoachId),
  );
  const [assigneeContextError, setAssigneeContextError] = useState<string | null>(null);
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
        setClubContextLoading(false);
        setClubContextError(null);
        setCommercialMode(draft.commercialMode ?? null);
      });
      return;
    }
    let cancelled = false;
    startTransition(() => {
      setClubContextLoading(true);
      setClubContextError(null);
      setClubLabel(null);
      setCommercialMode(null);
    });

    void clubAuthorityService
      .getClubById(draft.clubId)
      .then((result) => {
        if (cancelled) return;
        if (!result.success) {
          const message = result.error.message || 'Could not load organization context.';
          logger.error('Failed to load booking club context', {
            clubId: draft.clubId,
            error: result.error,
          });
          setClubContextError(message);
          setClubLabel(null);
          setCommercialMode(null);
          return;
        }

        const club = result.data;
        const nextCommercialMode = club.commercialMode ?? null;
        if (!nextCommercialMode) {
          logger.error('Booking club context missing commercial mode', {
            clubId: draft.clubId,
          });
          setClubContextError('Could not load organization billing context.');
          setClubLabel(null);
          setCommercialMode(null);
          return;
        }
        setClubLabel(club.name?.trim() || safeDisplayLabel(draft.clubId, 'Organization'));
        setCommercialMode(nextCommercialMode);
      })
      .catch((loadError) => {
        if (cancelled) return;
        logger.error('Failed to load booking club context', {
          clubId: draft.clubId,
          error: loadError,
        });
        setClubContextError('Could not load organization context.');
        setClubLabel(null);
        setCommercialMode(null);
      })
      .finally(() => {
        if (!cancelled) {
          setClubContextLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [draft.clubId, draft.commercialMode]);

  useEffect(() => {
    if (!draft.assigneeCoachId) {
      startTransition(() => {
        setAssigneeLabel(null);
        setAssigneeContextLoading(false);
        setAssigneeContextError(null);
      });
      return;
    }
    let cancelled = false;
    startTransition(() => {
      setAssigneeContextLoading(true);
      setAssigneeContextError(null);
      setAssigneeLabel(null);
    });
    void userService
      .getUserById(draft.assigneeCoachId)
      .then((result) => {
        if (cancelled) return;
        if (!result.success) {
          const message = result.error.message || 'Could not load delivery coach context.';
          logger.error('Failed to load booking delivery coach context', {
            assigneeCoachId: draft.assigneeCoachId,
            error: result.error,
          });
          setAssigneeContextError(message);
          setAssigneeLabel(null);
          return;
        }

        const resolvedName = result.data.name?.trim();
        if (!resolvedName) {
          logger.error('Booking delivery coach context missing display name', {
            assigneeCoachId: draft.assigneeCoachId,
          });
          setAssigneeContextError('Could not load delivery coach context.');
          setAssigneeLabel(null);
          return;
        }

        setAssigneeLabel(resolvedName);
      })
      .catch((loadError) => {
        if (cancelled) return;
        logger.error('Failed to load booking delivery coach context', {
          assigneeCoachId: draft.assigneeCoachId,
          error: loadError,
        });
        setAssigneeContextError('Could not load delivery coach context.');
        setAssigneeLabel(null);
      })
      .finally(() => {
        if (!cancelled) {
          setAssigneeContextLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [draft.assigneeCoachId]);
  const deliveredByLabel = draft.assigneeCoachId
    ? assigneeContextError
      ? 'Delivery coach unavailable'
      : (assigneeLabel ?? 'Loading delivery coach...')
    : resolvedCoachName || draft.coachName || 'Coach';
  const relationshipContext = getBookingRelationshipContext({
    actingAs: draft.actingAs,
    organizationLabel: clubLabel,
    coachLabel: resolvedCoachName || draft.coachName || 'Coach',
    deliveredByLabel,
    commercialMode,
  });
  const hasCreatedBooking = Boolean(bookingId);
  const resolvedTargets = resolveBookingDraftTargets({ draft, currentUser, children });
  const resolvedBookerName = (currentUser?.name || currentUser?.fullName || '').trim();
  const resolvedDraftCoachName = (draft.coachName || resolvedCoachName || '').trim();
  const bookingDraftReady = Boolean(
    resolvedCoachId &&
    resolvedDraftCoachName &&
    currentUser?.id &&
    resolvedBookerName &&
    hasResolvedBookingTargets(resolvedTargets) &&
    draft.date &&
    draft.slot &&
    typeof draft.duration === 'number' &&
    Number.isFinite(draft.duration) &&
    draft.duration > 0 &&
    draft.locationText?.trim() &&
    typeof draft.price === 'number' &&
    Number.isFinite(draft.price) &&
    draft.sessionType?.trim() &&
    (draft.sessionTypeLabel?.trim() || formatServiceTypeLabel(draft.sessionType)),
  );
  const confirmationBlocked =
    !hasCreatedBooking &&
    (!bookingDraftReady ||
      Boolean(
        draft.clubId && (clubContextLoading || clubContextError || !clubLabel || !commercialMode),
      ) ||
      Boolean(
        draft.assigneeCoachId && (assigneeContextLoading || assigneeContextError || !assigneeLabel),
      ));

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
        const coachName = resolvedDraftCoachName;
        const { athleteIds: selectedAthleteIds, athleteNames: selectedAthleteNames } =
          resolvedTargets;
        const bookedByName = resolvedBookerName;
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
        if (draft.clubId) {
          if (clubContextLoading) {
            trackConfirmStep('validation_fail', 'club_context_loading');
            setError('Still loading organization context. Please try again in a moment.');
            setIsCreating(false);
            return;
          }
          if (clubContextError || !clubLabel || !commercialMode) {
            trackConfirmStep('validation_fail', 'club_context_unavailable');
            setError(
              clubContextError ||
                'Could not load organization billing context. Please go back and retry.',
            );
            setIsCreating(false);
            return;
          }
        }
        if (draft.assigneeCoachId) {
          if (assigneeContextLoading) {
            trackConfirmStep('validation_fail', 'assignee_context_loading');
            setError('Still loading delivery coach context. Please try again in a moment.');
            setIsCreating(false);
            return;
          }
          if (assigneeContextError || !assigneeLabel) {
            trackConfirmStep('validation_fail', 'assignee_context_unavailable');
            setError(
              assigneeContextError ||
                'Could not load delivery coach context. Please go back and retry.',
            );
            setIsCreating(false);
            return;
          }
        }
        const selfAthleteId = resolveSelfAthleteId(currentUser);
        if (accountHasChildren && selfAthleteId && selectedAthleteIds.includes(selfAthleteId)) {
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
          commercialMode: draft.clubId
            ? (commercialMode ?? undefined)
            : (commercialMode ?? draft.commercialMode),
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
            title: 'Booking sent',
            subtitle: `Waiting for ${coachName} to confirm`,
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

  const visibleError = error ?? clubContextError ?? assigneeContextError;
  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <BookingWizardHeader
          title={hasCreatedBooking ? 'Booking sent' : 'Confirm booking'}
          subtitle={
            hasCreatedBooking ? 'Waiting for coach confirmation' : 'Check the details below'
          }
          step={5}
          onBack={handleBack}
        />

        <View style={{ gap: Spacing.sm }}>
          <ThemedText type="defaultSemiBold">{hasCreatedBooking ? 'Next' : 'Payment'}</ThemedText>
          <ThemedText style={{ color: palette.muted }}>
            {hasCreatedBooking
              ? `${relationshipContext.bookedWithLabel} has the request. ${relationshipContext.paymentSummary}`
              : relationshipContext.paymentSummary}
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
          {draft.assigneeCoachId && assigneeContextLoading ? (
            <Row align="center" gap="sm">
              <Ionicons name="hourglass-outline" size={18} color={palette.muted} />
              <ThemedText style={{ color: palette.text }}>
                Loading delivery coach context...
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

        {visibleError && (
          <Row
            align="center"
            gap="sm"
            style={[
              styles.errorBox,
              { backgroundColor: withAlpha(palette.error, 0.08), borderColor: palette.error },
            ]}
          >
            <Ionicons name="alert-circle" size={20} color={palette.error} />
            <ThemedText style={{ color: palette.error, flex: 1 }}>{visibleError}</ThemedText>
          </Row>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <Clickable
          onPress={handleViewBooking}
          style={[
            styles.cta,
            {
              backgroundColor:
                isCreating || confirmationBlocked ? withAlpha(palette.tint, 0.45) : palette.tint,
            },
          ]}
          disabled={isCreating || confirmationBlocked}
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
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xl },
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
