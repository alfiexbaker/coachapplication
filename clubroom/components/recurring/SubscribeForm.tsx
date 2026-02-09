/**
 * SubscribeForm — Composition root for recurring booking subscription form.
 * Sub-components: SubscribeCoachHeader, SubscribeScheduleSection, SubscribeOptionsSection, SubscribeSummary
 * Hook: useSubscribeForm
 */
import { StyleSheet, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';

import { Spacing } from '@/constants/theme';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/primitives/button';
import { useSubscribeForm } from '@/hooks/use-subscribe-form';
import type { CoachInfo, AthleteInfo } from '@/hooks/use-subscribe-form';
import type { RecurrenceFrequency, CreateRecurringBookingParams } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { SubscribeCoachHeader } from './subscribe-coach-header';
import { SubscribeScheduleSection } from './subscribe-schedule-section';
import { SubscribeOptionsSection } from './subscribe-options-section';
import { SubscribeSummary } from './subscribe-summary';

interface SubscribeFormProps {
  coach: CoachInfo;
  userId: string;
  userName: string;
  athletes?: AthleteInfo[];
  onSubmit: (params: CreateRecurringBookingParams) => Promise<void>;
  onCancel?: () => void;
  submitting?: boolean;
  defaultValues?: Partial<{
    dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    time: string;
    frequency: RecurrenceFrequency;
    sessionType: string;
    duration: number;
  }>;
}

export function SubscribeForm({ coach, userId, userName, athletes, onSubmit, onCancel, submitting = false, defaultValues }: SubscribeFormProps) {
  const { colors: palette } = useTheme();
  const form = useSubscribeForm({ coach, userId, userName, athletes, onSubmit, defaultValues });

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SubscribeCoachHeader coach={coach} />

        <SubscribeScheduleSection
          dayOfWeek={form.dayOfWeek} onDayChange={form.setDayOfWeek}
          time={form.time} showTimePicker={form.showTimePicker} onShowTimePicker={form.setShowTimePicker}
          timeDate={form.timeDate} onTimeChange={form.handleTimeChange}
          frequency={form.frequency} onFrequencyChange={form.setFrequency}
          pricePerSession={coach.pricePerSession}
        />

        <SubscribeOptionsSection
          athletes={athletes} selectedAthleteId={form.selectedAthleteId} onAthleteChange={form.setSelectedAthleteId}
          sessionTypes={form.sessionTypes} sessionType={form.sessionType} onSessionTypeChange={form.setSessionType}
          duration={form.duration} onDurationChange={form.setDuration}
          location={form.location} onLocationChange={form.setLocation}
          notes={form.notes} onNotesChange={form.setNotes}
          hasEndDate={form.hasEndDate} onToggleEndDate={form.toggleEndDate}
          endDate={form.endDate} showEndDatePicker={form.showEndDatePicker}
          onShowEndDatePicker={form.setShowEndDatePicker} onEndDateChange={form.handleEndDateChange}
        />

        <SubscribeSummary
          dayOfWeek={form.dayOfWeek} time={form.time} frequency={form.frequency}
          sessionType={form.sessionType} duration={form.duration}
          athleteName={form.selectedAthlete?.name} monthlyEstimate={form.monthlyEstimate}
        />
      </ScrollView>

      <ThemedView style={[styles.footer, { borderTopColor: palette.border }]}>
        {onCancel && <Button variant="outline" onPress={onCancel} style={styles.cancelButton}>Cancel</Button>}
        <Button onPress={form.handleSubmit} disabled={!form.isValid || submitting} style={styles.submitButton}>
          {submitting ? 'Creating...' : 'Start Subscription'}
        </Button>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.md, gap: Spacing.lg, paddingBottom: 100 },
  footer: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderTopWidth: 1 },
  cancelButton: { flex: 1 },
  submitButton: { flex: 2 },
});
