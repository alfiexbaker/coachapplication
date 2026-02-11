/**
 * SubscribeSummary — Summary card showing subscription details.
 */
import { memo } from 'react';
import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { useTheme } from '@/hooks/useTheme';
import { getDayName, getFrequencyLabel } from '@/services/recurring-booking-service';
import { formatTime } from '@/hooks/use-subscribe-form';
import type { RecurrenceFrequency } from '@/constants/types';

interface Props {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  time: string;
  frequency: RecurrenceFrequency;
  sessionType: string;
  duration: number;
  athleteName?: string;
  monthlyEstimate: number | null;
}

function SubscribeSummaryInner({
  dayOfWeek,
  time,
  frequency,
  sessionType,
  duration,
  athleteName,
  monthlyEstimate,
}: Props) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <ThemedText type="defaultSemiBold" style={styles.title}>
        Subscription Summary
      </ThemedText>
      <Row justify="between" align="center">
        <ThemedText style={{ color: palette.muted }}>Schedule</ThemedText>
        <ThemedText type="defaultSemiBold">
          {getDayName(dayOfWeek)}s at {formatTime(time)}
        </ThemedText>
      </Row>
      <Row justify="between" align="center">
        <ThemedText style={{ color: palette.muted }}>Frequency</ThemedText>
        <ThemedText type="defaultSemiBold">{getFrequencyLabel(frequency)}</ThemedText>
      </Row>
      <Row justify="between" align="center">
        <ThemedText style={{ color: palette.muted }}>Session</ThemedText>
        <ThemedText type="defaultSemiBold">
          {sessionType} ({duration} min)
        </ThemedText>
      </Row>
      {athleteName && (
        <Row justify="between" align="center">
          <ThemedText style={{ color: palette.muted }}>Athlete</ThemedText>
          <ThemedText type="defaultSemiBold">{athleteName}</ThemedText>
        </Row>
      )}
      {monthlyEstimate !== null && (
        <Row
          justify="between"
          align="center"
          style={[styles.total, { borderTopColor: palette.border }]}
        >
          <ThemedText style={{ color: palette.muted }}>Est. Monthly Cost</ThemedText>
          <ThemedText type="subtitle" style={{ color: palette.tint }}>
            ${monthlyEstimate}
          </ThemedText>
        </Row>
      )}
    </SurfaceCard>
  );
}

export const SubscribeSummary = memo(SubscribeSummaryInner);

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  title: { marginBottom: Spacing.xs },
  total: {
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.xs,
  },
});
