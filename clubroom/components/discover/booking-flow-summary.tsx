/**
 * BookingFlowSummary -- Review & confirm card with summary rows and CTA.
 */
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import type { CoachProfile } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { formatFullDate, formatTime } from '@/utils/format';

import { athleteProfile, type DayAvailability, type SlotInstance } from './booking-flow-types';
import { Row } from '@/components/primitives';

interface BookingFlowSummaryProps {
  coach?: CoachProfile;
  selectedDay?: DayAvailability;
  selectedSlot?: SlotInstance;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Row style={styles.summaryRow}>
      <ThemedText style={styles.summaryLabel}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold">{value}</ThemedText>
    </Row>
  );
}

function BookingFlowSummaryInner({ coach, selectedDay, selectedSlot }: BookingFlowSummaryProps) {
  const { colors: palette } = useTheme();

  const sessionValue =
    selectedDay && selectedSlot
      ? `${formatFullDate(selectedDay.date)} \u00B7 ${formatTime(selectedSlot.start)}`
      : 'Select a time to continue';

  return (
    <SurfaceCard style={styles.summaryCard}>
      <ThemedText type="subtitle">3 {'\u00B7'} Review & confirm</ThemedText>
      <ThemedText style={styles.summaryIntro}>
        This is where payment + safety locks in. Once confirmed, messaging + maps unlock
        automatically.
      </ThemedText>
      <View style={styles.summaryGrid}>
        <SummaryRow label="Coach" value={coach?.fullName ?? 'Select a coach above'} />
        <SummaryRow label="Athlete" value={athleteProfile.name} />
        <SummaryRow
          label="Focus"
          value={coach ? coach.footballFocuses.slice(0, 3).join(' \u00B7 ') : athleteProfile.needs}
        />
        <SummaryRow label="Session" value={sessionValue} />
        <SummaryRow label="Venue" value="Austin Sports Academy \u00B7 Pitch 2" />
        <SummaryRow
          label="Investment"
          value={coach ? `\u00A3${coach.priceRange.minUsd}+ / session` : '\u00A3120 / session'}
        />
      </View>
      <Clickable
        style={[styles.cta, { backgroundColor: selectedSlot ? palette.tint : palette.border }]}
        disabled={!selectedSlot}
      >
        <ThemedText style={[styles.ctaLabel, { color: palette.onPrimary }]}>
          {selectedSlot ? 'Continue to payment' : 'Pick a slot to continue'}
        </ThemedText>
      </Clickable>
    </SurfaceCard>
  );
}

export const BookingFlowSummary = memo(BookingFlowSummaryInner);

const styles = StyleSheet.create({
  summaryCard: { gap: Spacing.sm },
  summaryIntro: { opacity: 0.75 },
  summaryGrid: { gap: Spacing.sm },
  summaryRow: { justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { opacity: 0.7 },
  cta: {
    marginTop: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  ctaLabel: { fontWeight: '600' },
});
