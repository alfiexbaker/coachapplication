import { useState, useRef, useEffect } from 'react';
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
import { CancellationPolicyCard } from '@/components/booking/cancellation-policy-card';
import { bookingService } from '@/services/booking-service';
import { bookingStepAnalyticsService } from '@/services/booking/booking-step-analytics-service';
import { bookingSelfSettingService } from '@/services/booking-self-setting-service';
import { cancellationService } from '@/services/cancellation-service';
import { coachService } from '@/services/coach-service';
import { academyService } from '@/services/academy-service';
import { userService } from '@/services/user-service';
import { createLogger } from '@/utils/logger';
import { CelebrationOverlay, CelebrationOverlayRef } from '@/components/celebration-overlay';

const logger = createLogger('ConfirmationScreen');

export default function ConfirmationScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const { draft, reset } = useBookingFlow();
  const { currentUser } = useAuth();

  const [isCreating, setIsCreating] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolvedCoachName, setResolvedCoachName] = useState(draft.coachName ?? '');
  const [clubLabel, setClubLabel] = useState<string | null>(null);
  const [assigneeLabel, setAssigneeLabel] = useState<string | null>(null);
  const [cancellationPolicy, setCancellationPolicy] = useState<import('@/constants/types').CancellationPolicy | null>(null);
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
      hasChildren: currentUser?.hasChildren,
      actingAs: draft.actingAs,
      draft,
    });
  };
  const handleOpenBooking = (id: string) => {
    reset();
    router.replace(Routes.booking(id));
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
    setResolvedCoachName(draft.coachName ?? '');
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
      setClubLabel(null);
      return;
    }
    let cancelled = false;
    void academyService.getAcademy(draft.clubId).then((result) => {
      if (cancelled) return;
      if (result.success && result.data?.name) {
        setClubLabel(result.data.name);
      } else {
        setClubLabel(draft.clubId ?? null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [draft.clubId]);

  useEffect(() => {
    if (!draft.assigneeCoachId) {
      setAssigneeLabel(null);
      return;
    }
    let cancelled = false;
    void userService.getUserById(draft.assigneeCoachId).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setAssigneeLabel(result.data.name?.trim() || draft.assigneeCoachId || null);
      } else {
        setAssigneeLabel(draft.assigneeCoachId ?? null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [draft.assigneeCoachId]);

  const handleViewBooking = async () => {
    if (bookingId) {
      // Booking already created, just navigate
      handleOpenBooking(bookingId);
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const resolvedCoach = coachId || draft.coachId;
      const resolvedAthleteId = draft.childId || currentUser?.id;
      const resolvedAthleteName = draft.athleteName || currentUser?.name;
      const coachName = draft.coachName || resolvedCoachName;

      if (!resolvedCoach || !coachName) {
        trackConfirmStep('validation_fail', 'missing_coach_context');
        setError('Missing coach information. Please go back and try again.');
        setIsCreating(false);
        return;
      }
      if (!resolvedAthleteId || !resolvedAthleteName) {
        trackConfirmStep('validation_fail', 'missing_booking_target');
        setError('No booking target selected. Please go back and choose who this session is for.');
        setIsCreating(false);
        return;
      }
      if (!currentUser?.id) {
        trackConfirmStep('validation_fail', 'missing_current_user');
        setError('You must be logged in to book a session.');
        setIsCreating(false);
        return;
      }
      const hasChildren = Boolean(currentUser.hasChildren || (currentUser.children?.length ?? 0) > 0);
      if (hasChildren && resolvedAthleteId === currentUser.id) {
        const canBookSelf = await bookingSelfSettingService.isEnabled(currentUser.id);
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

      const serviceLabel =
        draft.sessionTypeLabel || draft.sessionType || 'Session';
      const serviceType = draft.sessionType || '1-to-1';

      const result = await bookingService.createBooking({
        coachId: resolvedCoach,
        coachName,
        athleteIds: [resolvedAthleteId],
        athleteNames: [resolvedAthleteName],
        bookedById: currentUser.id,
        bookedByName: currentUser.name || currentUser.fullName || 'User',
        scheduledAt: `${draft.date}T${draft.slot}:00`,
        duration: draft.duration || 60,
        location: draft.locationText || draft.locationOption || '',
        service: serviceLabel,
        serviceType,
        sessionSource: draft.sessionSource,
        sessionSourceEntityId: draft.sessionSourceEntityId,
        clubId: draft.clubId,
        actingAs: draft.actingAs,
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
          subtitle: `Session with ${coachName || 'your coach'} is all set`,
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
    } catch (err) {
      trackConfirmStep('conflict_fail', 'unexpected_error');
      logger.error('Error creating booking', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.content}>
        <BookingWizardHeader
          title="Booking placed"
          subtitle="Your coach will confirm within 24 hours"
          step={5}
          onBack={handleBack}
        />

        <View
          style={[
            styles.checkCircle,
            { borderColor: palette.tint, backgroundColor: withAlpha(palette.tint, 0.07) },
          ]}
        >
          <Ionicons name="checkmark" size={48} color={palette.tint} />
        </View>

        <View style={{ gap: Spacing.sm }}>
          <ThemedText type="defaultSemiBold">{"What's next"}</ThemedText>
          <ThemedText style={{ color: palette.muted }}>
            {draft.actingAs === 'club'
              ? `Your booking request is in via ${clubLabel || 'the club'}. Payment details are shared in your session thread once confirmed.`
              : 'Your booking request is in. Payment details are shared by your coach once confirmed.'}{' '}
            You can message your coach anytime or add this to your calendar.
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
                Booked via {clubLabel || draft.clubId || 'Club'}
              </ThemedText>
            </Row>
          ) : null}
          {draft.actingAs === 'club' ? (
            <Row align="center" gap="sm">
              <Ionicons name="person-outline" size={18} color={palette.muted} />
              <ThemedText style={{ color: palette.text }}>
                Delivered by {assigneeLabel || resolvedCoachName || draft.coachName || 'Coach'}
              </ThemedText>
            </Row>
          ) : null}
          {draft.locationText && (
            <Row align="center" gap="sm">
              <Ionicons name="location-outline" size={18} color={palette.muted} />
              <ThemedText style={{ color: palette.text }}>{draft.locationText}</ThemedText>
            </Row>
          )}
          {resolvedCoachId && (
            <CancellationPolicyCard coachId={resolvedCoachId} policy={cancellationPolicy ?? undefined} />
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
              View booking
            </ThemedText>
          )}
        </Clickable>
        <Clickable
          onPress={handleMessageCoach}
          style={[styles.secondary, { borderColor: palette.tint }]}
          disabled={isCreating}
        >
          <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>Message coach</ThemedText>
        </Clickable>
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
