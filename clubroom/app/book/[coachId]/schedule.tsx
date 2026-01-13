import { useEffect, useState, useMemo, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BookingWizardHeader } from '@/components/ui/booking/booking-wizard';
import { CalendarPicker } from '@/components/ui/booking/calendar-picker';
import { TimeSlotPicker } from '@/components/ui/booking/time-slot-picker';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useBookingFlow } from '@/context/booking-flow-context';
import { availabilityService } from '@/services/availability-service';
import type { AvailabilitySlot } from '@/constants/types';

export default function ScheduleScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const { draft, updateDraft } = useBookingFlow();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [allSlots, setAllSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate date range (next 14 days)
  const dateRange = useMemo(() => {
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 14);
    return {
      startDate,
      endDate: endDate.toISOString().split('T')[0],
    };
  }, []);

  // Fetch availability for the date range
  const fetchAvailability = useCallback(async () => {
    if (!coachId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get session duration from draft or default to 60 minutes
      const duration = draft.duration || 60;
      const slots = await availabilityService.getAvailableSlots(
        coachId,
        dateRange.startDate,
        dateRange.endDate,
        duration
      );
      setAllSlots(slots);

      // Auto-select first available date if none selected
      if (!draft.date && slots.length > 0) {
        const firstAvailableSlot = slots.find((s) => s.isAvailable);
        if (firstAvailableSlot) {
          updateDraft({ date: firstAvailableSlot.date });
        }
      }
    } catch (err) {
      console.error('[ScheduleScreen] Failed to fetch availability:', err);
      setError('Unable to load available times. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [coachId, dateRange.startDate, dateRange.endDate, draft.duration]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

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

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={{ color: palette.muted, marginTop: Spacing.md }}>
            Loading coach availability...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={palette.muted} />
          <ThemedText style={{ color: palette.muted, marginTop: Spacing.md, textAlign: 'center' }}>
            {error}
          </ThemedText>
          <Clickable
            onPress={fetchAvailability}
            style={[styles.retryButton, { borderColor: palette.tint }]}
          >
            <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>Try Again</ThemedText>
          </Clickable>
        </View>
      </SafeAreaView>
    );
  }

  const hasAnyAvailability = allSlots.some((s) => s.isAvailable);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <BookingWizardHeader
          title="Choose date & time"
          subtitle={hasAnyAvailability ? 'Only available slots are shown' : 'No availability in the next 2 weeks'}
          step={2}
        />

        {!hasAnyAvailability ? (
          <View style={styles.noAvailability}>
            <Ionicons name="calendar-outline" size={48} color={palette.muted} />
            <ThemedText style={{ color: palette.muted, textAlign: 'center', marginTop: Spacing.md }}>
              This coach has no available slots{'\n'}in the next 2 weeks.
            </ThemedText>
            <ThemedText style={{ color: palette.muted, textAlign: 'center', marginTop: Spacing.sm, fontSize: 13 }}>
              Try contacting the coach directly{'\n'}to arrange a custom time.
            </ThemedText>
          </View>
        ) : (
          <>
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
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <Clickable
          onPress={() => router.push(`/book/${coachId}/details`)}
          style={[
            styles.cta,
            {
              backgroundColor: draft.date && draft.slot ? palette.tint : palette.muted,
            },
          ]}
          disabled={!draft.date || !draft.slot}
        >
          <Ionicons name="arrow-forward" size={18} color="#fff" />
          <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Continue</ThemedText>
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.button,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  retryButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  noAvailability: {
    paddingVertical: Spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
