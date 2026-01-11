import { useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { BookingWizardHeader } from '@/components/booking/booking-wizard';
import { CalendarPicker } from '@/components/booking/calendar-picker';
import { TimeSlotPicker } from '@/components/booking/time-slot-picker';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useBookingFlow } from '@/context/booking-flow-context';

export default function ScheduleScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const { draft, updateDraft } = useBookingFlow();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Convert draft.date string to Date object, default to today
  const selectedDate = useMemo(() => {
    if (draft.date) {
      return new Date(draft.date);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }, [draft.date]);

  // Get session duration from draft or default to 60 minutes
  const sessionDuration = draft.duration || 60;

  // Clear slot when date changes (since availability changes per day)
  const handleDateSelect = (date: string | undefined) => {
    updateDraft({ date, slot: undefined });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <BookingWizardHeader
          title="Choose date & time"
          subtitle="Only available slots are shown"
          step={2}
        />

        <CalendarPicker selectedDate={draft.date} onSelect={handleDateSelect} />

        <View style={{ gap: Spacing.sm }}>
          <ThemedText type="defaultSemiBold">Available slots</ThemedText>
          <TimeSlotPicker
            coachId={coachId}
            selectedDate={selectedDate}
            sessionDuration={sessionDuration}
            selectedSlot={draft.slot}
            onSelect={(slot) => updateDraft({ slot })}
          />
        </View>
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <Clickable
          onPress={() => router.push(`/book/${coachId}/details`)}
          style={[styles.cta, { backgroundColor: palette.tint }]}
          disabled={!draft.date || !draft.slot}
        >
          <Ionicons name="arrow-forward" size={18} color="#fff" />
          <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Continue</ThemedText>
        </Clickable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  footer: { padding: Spacing.lg, borderTopWidth: 1 },
  cta: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radii.button },
});
