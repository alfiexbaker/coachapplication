import { useMemo, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { BookingWizardHeader } from '@/components/ui/booking/booking-wizard';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
import { formatInUserTimezone } from '@/utils/timezone';
import { CalendarPicker } from '@/components/ui/booking/calendar-picker';
import { TimeSlotPicker } from '@/components/ui/booking/time-slot-picker';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Radii, Shadows, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useScreen } from '@/hooks/use-screen';
import { err, ok, serviceError } from '@/types/result';
import { useBookingFlow } from '@/context/booking-flow-context';
import { useAuth } from '@/hooks/use-auth';
import { availabilityService } from '@/services/availability-service';
import { bookingStepAnalyticsService } from '@/services/booking/booking-step-analytics-service';
import type { AvailabilitySlot } from '@/constants/types';
import { useRequiredParam } from '@/hooks/use-required-param';
import { BOOKING_LOCATION_OPTIONS } from '@/constants/booking-flow';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { SessionOffering } from '@/constants/session-types';
import { getFixedScheduleFromOffering } from '@/utils/booking-draft-prefill';

const logger = createLogger('ScheduleScreen');

export default function ScheduleScreen() {
  const coachIdParam = useRequiredParam('coachId');
  const coachId = coachIdParam.valid ? coachIdParam.value : '';
  const { draft, updateDraft } = useBookingFlow();
  const { currentUser } = useAuth();
  const { scheme } = useTheme();

  const selectedOffering = useScreen<SessionOffering | null>({
    load: async () => {
      if (!draft.sessionOfferingId) {
        return ok<SessionOffering | null>(null);
      }
      const offerings = await apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []);
      return ok(offerings.find((offering) => offering.id === draft.sessionOfferingId) ?? null);
    },
    deps: [draft.sessionOfferingId],
    isEmpty: () => false,
    refetchOnFocus: true,
  }).data;
  const fixedOfferingSchedule = useMemo(
    () => (selectedOffering ? getFixedScheduleFromOffering(selectedOffering) : null),
    [selectedOffering],
  );
  const normalizedEntrySource = draft.entrySource?.trim().toLowerCase() ?? '';
  const scheduleLockedFromDraft = Boolean(
    (normalizedEntrySource.startsWith('discover') ||
      normalizedEntrySource.startsWith('session_detail_modal') ||
      normalizedEntrySource.startsWith('favourites')) &&
      draft.sessionOfferingId &&
      draft.date &&
      draft.slot,
  );
  const scheduleLockedFromOffering = Boolean(
    fixedOfferingSchedule &&
      draft.date === fixedOfferingSchedule.date &&
      draft.slot === fixedOfferingSchedule.slot,
  );
  const scheduleLocked = scheduleLockedFromOffering || scheduleLockedFromDraft;

  // Calculate date range (next 14 days)
  const dateRange = useMemo(() => {
    const today = new Date();
    const startDate = toDateStr(today);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 14);
    return {
      startDate,
      endDate: toDateStr(endDate),
    };
  }, []);

  // Fetch availability for the date range
  const loadAvailability = useCallback(async () => {
    if (!coachId) {
      return ok([]);
    }
    try {
      const duration = draft.duration || 60;
      const slots = await availabilityService.getAvailableSlots(
        coachId,
        dateRange.startDate,
        dateRange.endDate,
        duration,
      );
      return ok(slots);
    } catch (loadError) {
      logger.error('Failed to fetch availability:', loadError);
      return err(
        serviceError('UNKNOWN', 'Unable to load available times. Please try again.', loadError),
      );
    }
  }, [coachId, dateRange.startDate, dateRange.endDate, draft.duration]);

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    colors: palette,
  } = useScreen<AvailabilitySlot[]>({
    load: loadAvailability,
    deps: [loadAvailability],
    isEmpty: (slots) => !slots.some((slot) => slot.isAvailable),
    refetchOnFocus: true,
  });
  const allSlots = useMemo(() => data ?? [], [data]);

  // Group slots by date for the calendar picker
  const availabilityByDate = useMemo(() => {
    const grouped: Record<string, AvailabilitySlot[]> = {};
    for (const slot of allSlots) {
      if (!grouped[slot.date]) {
        grouped[slot.date] = [];
      }
      grouped[slot.date].push(slot);
    }
    return grouped;
  }, [allSlots]);

  // Get slots for the selected date
  const slotsForSelectedDate = useMemo(() => {
    if (!draft.date) return [];
    return allSlots.filter((slot) => slot.date === draft.date);
  }, [allSlots, draft.date]);

  const handleDateSelect = useCallback((date: string) => {
    if (date !== draft.date) {
      updateDraft({ date, slot: undefined });
    }
  }, [draft.date, updateDraft]);

  const handleSlotSelect = useCallback((slotTime: string) => {
    const selectedSlot = slotsForSelectedDate.find((s) => s.startTime === slotTime);
    const patch: Parameters<typeof updateDraft>[0] = {
      slot: slotTime,
    };
    if (selectedSlot?.location) {
      patch.locationOption = BOOKING_LOCATION_OPTIONS.COACH_PRESET;
      patch.locationText = selectedSlot.location;
    }
    updateDraft(patch);
  }, [slotsForSelectedDate, updateDraft]);
  const handleBack = useCallback(() => {
    void bookingStepAnalyticsService.track({
      step: 'schedule',
      status: 'abandoned',
      failure_code: 'back_navigation',
      role: currentUser?.role,
      currentUserId: currentUser?.id,
      hasChildren: currentUser?.hasChildren,
      actingAs: draft.actingAs,
      draft,
    });
    router.back();
  }, [currentUser?.role, currentUser?.id, currentUser?.hasChildren, draft]);

  const handleContinue = useCallback(() => {
    if (!coachId) {
      void bookingStepAnalyticsService.track({
        step: 'schedule',
        status: 'validation_fail',
        failure_code: 'missing_coach_id',
        role: currentUser?.role,
        currentUserId: currentUser?.id,
        hasChildren: currentUser?.hasChildren,
        actingAs: draft.actingAs,
        draft,
      });
      return;
    }

    if (!draft.date) {
      void bookingStepAnalyticsService.track({
        step: 'schedule',
        status: 'validation_fail',
        failure_code: 'missing_date',
        role: currentUser?.role,
        currentUserId: currentUser?.id,
        hasChildren: currentUser?.hasChildren,
        actingAs: draft.actingAs,
        draft,
      });
      return;
    }

    if (!draft.slot) {
      void bookingStepAnalyticsService.track({
        step: 'schedule',
        status: 'validation_fail',
        failure_code: 'missing_slot',
        role: currentUser?.role,
        currentUserId: currentUser?.id,
        hasChildren: currentUser?.hasChildren,
        actingAs: draft.actingAs,
        draft,
      });
      return;
    }

    void bookingStepAnalyticsService.track({
      step: 'schedule',
      status: 'success',
      role: currentUser?.role,
      currentUserId: currentUser?.id,
      hasChildren: currentUser?.hasChildren,
      actingAs: draft.actingAs,
      draft,
    });
    router.push(Routes.bookDetails(coachId));
  }, [coachId, currentUser?.role, currentUser?.id, currentUser?.hasChildren, draft, router]);
  const renderShell = ({ content, footer }: { content: ReactNode; footer?: ReactNode }) => (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      {content}
      {footer}
    </SafeAreaView>
  );
  const renderWizardState = ({
    subtitle,
    content,
  }: {
    subtitle: string;
    content: ReactNode;
  }) =>
    renderShell({
      content: (
        <>
          <View style={styles.content}>
            <BookingWizardHeader
              title="Choose date & time"
              subtitle={subtitle}
              step={2}
              onBack={handleBack}
            />
          </View>
          {content}
        </>
      ),
    });

  if (status === 'loading') {
    return renderWizardState({
      subtitle: 'Loading availability...',
      content: <LoadingState variant="calendar" />,
    });
  }

  if (!coachIdParam.valid) {
    return renderShell({
      content: (
        <ErrorState
          message="Coach not found"
          onRetry={() => router.back()}
        />
      ),
    });
  }

  if (scheduleLocked && draft.date && draft.slot) {
    return renderShell({
      content: (
        <ScrollView contentContainerStyle={styles.content}>
          <BookingWizardHeader
            title="Choose date & time"
            subtitle="Time locked from selected session listing"
            step={2}
            onBack={handleBack}
          />
          <View
            style={[
              styles.placeholderCard,
              {
                backgroundColor: withAlpha(palette.tint, 0.06),
                borderColor: withAlpha(palette.tint, 0.25),
              },
            ]}
          >
            <Ionicons name="lock-closed-outline" size={22} color={palette.tint} />
            <Column flex gap="micro">
              <ThemedText style={styles.placeholderTitle}>This listing has a fixed schedule</ThemedText>
              <ThemedText style={[styles.placeholderText, { color: palette.muted }]}>
                {formatDate(draft.date)} at {draft.slot}
              </ThemedText>
              {draft.locationText ? (
                <ThemedText style={[styles.placeholderText, { color: palette.muted }]}>
                  {draft.locationText}
                </ThemedText>
              ) : null}
            </Column>
          </View>
        </ScrollView>
      ),
      footer: (
        <View style={[styles.footer, { borderTopColor: withAlpha(palette.border, 0.5) }]}>
          <Clickable
            onPress={handleContinue}
            style={[
              styles.cta,
              {
                backgroundColor: palette.tint,
                ...Shadows[scheme].subtle,
              },
            ]}
            accessibilityLabel="Continue to booking details"
          >
            <ThemedText style={[styles.ctaText, { color: palette.onPrimary }]}>
              Continue
            </ThemedText>
          </Clickable>
        </View>
      ),
    });
  }

  if (status === 'error') {
    return renderWizardState({
      subtitle: 'Something went wrong',
      content: (
        <ErrorState
          message={error?.message ?? 'Unable to load available times. Please try again.'}
          onRetry={retry}
        />
      ),
    });
  }

  if (status === 'empty') {
    return renderShell({
      content: (
        <ScrollView
          contentContainerStyle={styles.emptyContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />
          }
        >
          <BookingWizardHeader
            title="Choose date & time"
            subtitle="No availability in the next 2 weeks"
            step={2}
            onBack={handleBack}
          />

          {/* Custom empty state — not the generic one */}
          <Column align="center" gap="md" style={styles.emptyStateWrap}>
            <View style={[styles.emptyIconWrap, { backgroundColor: withAlpha(palette.tint, 0.08) }]}>
              <Ionicons name="calendar-outline" size={32} color={palette.tint} />
            </View>
            <Column align="center" gap="xxs">
              <ThemedText style={styles.emptyTitle}>
                No slots available
              </ThemedText>
              <ThemedText style={[styles.emptyMessage, { color: palette.muted }]}>
                {`This coach hasn't opened any slots for the next two weeks. You can check back later or reach out directly.`}
              </ThemedText>
            </Column>

            <Column gap="xs" style={styles.emptyActions}>
              <Clickable
                onPress={retry}
                style={[styles.emptyPrimaryBtn, { backgroundColor: palette.tint }]}
                accessibilityLabel="Refresh availability"
              >
                <Row align="center" justify="center" gap="xs">
                  <Ionicons name="refresh" size={18} color={palette.onPrimary} />
                  <ThemedText style={[styles.emptyBtnText, { color: palette.onPrimary }]}>
                    Refresh availability
                  </ThemedText>
                </Row>
              </Clickable>
              <Clickable
                onPress={() => router.back()}
                style={[styles.emptySecondaryBtn, { backgroundColor: withAlpha(palette.muted, 0.06) }]}
                accessibilityLabel="Go back"
              >
                <ThemedText style={[styles.emptyBtnText, { color: palette.text }]}>
                  Back to coach profile
                </ThemedText>
              </Clickable>
            </Column>
          </Column>
        </ScrollView>
      ),
    });
  }

  return renderShell({
    content: (
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />
        }
      >
        <BookingWizardHeader
          title="Choose date & time"
          subtitle={
            draft.sessionTypeLabel
              ? `Only available ${draft.sessionTypeLabel.toLowerCase()} slots are shown`
              : 'Only available slots are shown'
          }
          step={2}
          onBack={handleBack}
        />
        <CalendarPicker
          selectedDate={draft.date}
          onSelect={handleDateSelect}
          availabilityByDate={availabilityByDate}
        />

        <View style={{ gap: Spacing.sm }}>
          {!draft.date && (
            <View
              style={[
                styles.placeholderCard,
                {
                  backgroundColor: withAlpha(palette.tint, 0.04),
                  borderColor: withAlpha(palette.tint, 0.12),
                },
              ]}
            >
              <Ionicons name="calendar-outline" size={22} color={palette.tint} />
              <Column flex gap="micro">
                <ThemedText style={styles.placeholderTitle}>Select a date to view times</ThemedText>
                <ThemedText style={[styles.placeholderText, { color: palette.muted }]}>
                  Tap an available date in the calendar to load time slots.
                </ThemedText>
              </Column>
            </View>
          )}
          <ThemedText style={styles.sectionTitle}>
            Available slots{draft.date ? ` — ${formatDate(draft.date)}` : ''}
          </ThemedText>
          {draft.date ? (
            <TimeSlotPicker
              selectedSlot={draft.slot}
              onSelect={handleSlotSelect}
              slots={slotsForSelectedDate}
              isLoading={false}
            />
          ) : null}
        </View>
      </ScrollView>
    ),
    footer: (
      <View style={[styles.footer, { borderTopColor: withAlpha(palette.border, 0.5) }]}>
        <Clickable
          onPress={handleContinue}
          style={[
            styles.cta,
            {
              backgroundColor: draft.date && draft.slot ? palette.tint : withAlpha(palette.muted, 0.15),
              ...(draft.date && draft.slot ? Shadows[scheme].subtle : {}),
            },
          ]}
          disabled={!draft.date || !draft.slot}
          accessibilityLabel="Continue to booking details"
        >
          <ThemedText
            style={[
              styles.ctaText,
              { color: draft.date && draft.slot ? palette.onPrimary : palette.muted },
            ]}
          >
            Continue
          </ThemedText>
        </Clickable>
      </View>
    ),
  });
}

function formatDate(dateStr: string): string {
  return formatInUserTimezone(`${dateStr}T00:00:00`, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    padding: Spacing.md,
    gap: Spacing.lg,
  },
  emptyContent: {
    padding: Spacing.md,
    gap: Spacing.lg,
    flexGrow: 1,
  },

  // ── Section title ─────────────────────────────────────────────────────
  placeholderCard: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  placeholderTitle: {
    ...Typography.bodySmallSemiBold,
  },
  placeholderText: {
    ...Typography.caption,
  },
  sectionTitle: {
    ...Typography.bodySemiBold,
  },

  // ── Empty state ───────────────────────────────────────────────────────
  emptyStateWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.md,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...Typography.heading,
    textAlign: 'center',
  },
  emptyMessage: {
    ...Typography.body,
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyActions: {
    width: '100%',
    marginTop: Spacing.xs,
  },
  emptyPrimaryBtn: {
    height: 48,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySecondaryBtn: {
    height: 48,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBtnText: {
    ...Typography.bodySemiBold,
  },

  // ── Footer ────────────────────────────────────────────────────────────
  footer: {
    padding: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cta: {
    height: 52,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    ...Typography.bodySemiBold,
    fontWeight: '700',
  },
});
