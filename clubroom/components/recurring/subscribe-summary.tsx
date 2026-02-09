/**
 * SubscribeSummary — Summary card showing subscription details.
 */
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
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

function SubscribeSummaryInner({ dayOfWeek, time, frequency, sessionType, duration, athleteName, monthlyEstimate }: Props) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <ThemedText type="defaultSemiBold" style={styles.title}>Subscription Summary</ThemedText>
      <View style={styles.row}>
        <ThemedText style={{ color: palette.muted }}>Schedule</ThemedText>
        <ThemedText type="defaultSemiBold">{getDayName(dayOfWeek)}s at {formatTime(time)}</ThemedText>
      </View>
      <View style={styles.row}>
        <ThemedText style={{ color: palette.muted }}>Frequency</ThemedText>
        <ThemedText type="defaultSemiBold">{getFrequencyLabel(frequency)}</ThemedText>
      </View>
      <View style={styles.row}>
        <ThemedText style={{ color: palette.muted }}>Session</ThemedText>
        <ThemedText type="defaultSemiBold">{sessionType} ({duration} min)</ThemedText>
      </View>
      {athleteName && (
        <View style={styles.row}>
          <ThemedText style={{ color: palette.muted }}>Athlete</ThemedText>
          <ThemedText type="defaultSemiBold">{athleteName}</ThemedText>
        </View>
      )}
      {monthlyEstimate !== null && (
        <View style={[styles.row, styles.total, { borderTopColor: palette.border }]}>
          <ThemedText style={{ color: palette.muted }}>Est. Monthly Cost</ThemedText>
          <ThemedText type="subtitle" style={{ color: palette.tint }}>${monthlyEstimate}</ThemedText>
        </View>
      )}
    </SurfaceCard>
  );
}

export const SubscribeSummary = memo(SubscribeSummaryInner);

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  title: { marginBottom: Spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { paddingTop: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, marginTop: Spacing.xs },
});
