import { useEffect, useMemo, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { BookingWizardHeader } from '@/components/ui/booking/booking-wizard';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
import { CalendarPicker } from '@/components/ui/booking/calendar-picker';
import { TimeSlotPicker } from '@/components/ui/booking/time-slot-picker';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Radii, Spacing } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { err, ok, serviceError } from '@/types/result';
import { useBookingFlow } from '@/context/booking-flow-context';
import { availabilityService } from '@/services/availability-service';
import type { AvailabilitySlot } from '@/constants/types';

const logger = createLogger('ScheduleScreen');

export default function ScheduleScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const { draft, updateDraft } = useBookingFlow();

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
      // Get session duration from draft or default to 60 minutes
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

  // Auto-select first available date if none selected
  useEffect(() => {
    if (draft.date || allSlots.length === 0) {
      return;
    }
    const firstAvailableSlot = allSlots.find((slot) => slot.isAvailable);
    if (firstAvailableSlot) {
      updateDraft({ date: firstAvailableSlot.date });
    }
  }, [allSlots, draft.date, updateDraft]);

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

  // Handle date selection - clear slot if date changes
  const handleDateSelect = (date: string) => {
    if (date !== draft.date) {
      updateDraft({ date, slot: undefined });
    }
  };

  // Handle slot selection - also store the location
  const handleSlotSelect = (slotTime: string) => {
    const selectedSlot = slotsForSelectedDate.find((s) => s.startTime === slotTime);
    updateDraft({
      slot: slotTime,
      locationText: selectedSlot?.location,
    });
  };

  if (status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.background }]}
        edges={['top']}
      >
        <LoadingState variant="calendar" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.background }]}
        edges={['top']}
      >
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
        edges={['top']}
      >
        <BookingWizardHeader
          title="Choose date & time"
          subtitle="No availability in the next 2 weeks"
          step={2}
        />
        <EmptyState
          icon="calendar-outline"
          title="No availability found"
          message="This coach has no available slots in the next two weeks. Pull to refresh or message the coach to request a custom time."
          actionLabel="Retry"
          onPressAction={retry}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />
        }
      >
        <BookingWizardHeader
          title="Choose date & time"
          subtitle="Only available slots are shown"
          step={2}
        />
        <CalendarPicker
          selectedDate={draft.date}
          onSelect={handleDateSelect}
          availabilityByDate={availabilityByDate}
        />

        <View style={{ gap: Spacing.sm }}>
          <ThemedText type="defaultSemiBold">
            Available slots{draft.date ? ` - ${formatDate(draft.date)}` : ''}
          </ThemedText>
          <TimeSlotPicker
            selectedSlot={draft.slot}
            onSelect={handleSlotSelect}
            slots={slotsForSelectedDate}
            isLoading={false}
          />
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <Clickable
          onPress={() => router.push(Routes.bookDetails(coachId))}
          style={[
            styles.cta,
            {
              backgroundColor: draft.date && draft.slot ? palette.tint : palette.muted,
            },
          ]}
          disabled={!draft.date || !draft.slot}
        >
          <Row justify="center" align="center" gap="sm">
            <Ionicons name="arrow-forward" size={18} color={palette.onPrimary} />
            <ThemedText style={{ color: palette.onPrimary, fontWeight: '700' }}>
              Continue
            </ThemedText>
          </Row>
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
  content: { padding: Spacing.lg, gap: Spacing.lg },
  footer: { padding: Spacing.lg, borderTopWidth: 1 },
  cta: {
    padding: Spacing.md,
    borderRadius: Radii.button,
  },
});
