import { useMemo, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { BookingWizardHeader } from '@/components/ui/booking/booking-wizard';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
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
import { availabilityService } from '@/services/availability-service';
import type { AvailabilitySlot } from '@/constants/types';
import { useRequiredParam } from '@/hooks/use-required-param';

const logger = createLogger('ScheduleScreen');

export default function ScheduleScreen() {
  const coachIdParam = useRequiredParam('coachId');
  const coachId = coachIdParam.valid ? coachIdParam.value : '';
  const { draft, updateDraft } = useBookingFlow();
  const { scheme } = useTheme();

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
      const slots = draft.sessionTemplateId
        ? await availabilityService.getInvitableSlots(
            coachId,
            dateRange.startDate,
            dateRange.endDate,
            draft.sessionTemplateId,
          )
        : await availabilityService.getAvailableSlots(
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
  }, [coachId, dateRange.startDate, dateRange.endDate, draft.duration, draft.sessionTemplateId]);

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
    updateDraft({
      slot: slotTime,
      locationText: selectedSlot?.location,
    });
  }, [slotsForSelectedDate, updateDraft]);

  if (status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <View style={styles.content}>
          <BookingWizardHeader
            title="Choose date & time"
            subtitle="Loading availability..."
            step={2}
          />
        </View>
        <LoadingState variant="calendar" />
      </SafeAreaView>
    );
  }

  if (!coachIdParam.valid) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <ErrorState
          message="Coach not found"
          description="This booking link is missing a coach."
          onRetry={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <View style={styles.content}>
          <BookingWizardHeader
            title="Choose date & time"
            subtitle="Something went wrong"
            step={2}
          />
        </View>
        <ErrorState
          message={error?.message ?? 'Unable to load available times. Please try again.'}
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
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

      {/* CTA Footer */}
      <View style={[styles.footer, { borderTopColor: withAlpha(palette.border, 0.5) }]}>
        <Clickable
          onPress={() => router.push(Routes.bookDetails(coachId))}
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
    </SafeAreaView>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
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
