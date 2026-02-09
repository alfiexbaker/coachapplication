import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Typography } from '@/constants/theme';
import type { CancellationStats } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

// Re-export extracted components for backward compat
export { REASON_LABELS, REASON_ICONS, ReasonsBreakdown, DayOfWeekBreakdown, NoticeFooter } from './cancellation-chart-sections';
export type { ReasonsBreakdownProps, DayOfWeekBreakdownProps, NoticeFooterProps } from './cancellation-chart-sections';

import { ReasonsBreakdown, DayOfWeekBreakdown, NoticeFooter } from './cancellation-chart-sections';

export interface CancellationChartProps {
  stats: CancellationStats;
  title?: string;
  loading?: boolean;
  onPress?: () => void;
  currencySymbol?: string;
}

export function CancellationChart({
  stats,
  title = 'Cancellations',
  loading = false,
  onPress,
  currencySymbol = '\u00A3',
}: CancellationChartProps) {
  const { colors: palette } = useTheme();

  const getCancellationRateColor = (rate: number): string => {
    if (rate <= 5) return palette.success;
    if (rate <= 10) return palette.warning;
    return palette.error;
  };

  const rateColor = getCancellationRateColor(stats.cancellationRate);
  const maxReasonCount = Math.max(...stats.byReason.map((r) => r.count), 1);

  return (
    <SurfaceCard
      style={styles.card}
      loading={loading}
      onPress={onPress}
      tactile={!!onPress}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="close-circle" size={20} color={palette.error} />
          <ThemedText style={styles.title}>{title}</ThemedText>
        </View>
      </View>

      {/* Summary stats */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <ThemedText style={[styles.summaryValue, { color: rateColor }]}>
            {stats.cancellationRate.toFixed(1)}%
          </ThemedText>
          <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
            Cancel Rate
          </ThemedText>
        </View>
        <View style={styles.summaryItem}>
          <ThemedText style={styles.summaryValue}>
            {stats.totalCancellations}
          </ThemedText>
          <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
            Total
          </ThemedText>
        </View>
        <View style={styles.summaryItem}>
          <ThemedText style={[styles.summaryValue, { color: palette.error }]}>
            {currencySymbol}{stats.revenueLost}
          </ThemedText>
          <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
            Lost Revenue
          </ThemedText>
        </View>
      </View>

      <ReasonsBreakdown
        byReason={stats.byReason}
        maxReasonCount={maxReasonCount}
        palette={palette}
      />

      <DayOfWeekBreakdown
        byDayOfWeek={stats.byDayOfWeek}
        palette={palette}
      />

      <NoticeFooter
        avgNoticeHours={stats.avgNoticeHours}
        palette={palette}
      />
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
  },
  header: {
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: { ...Typography.subheading },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: { ...Typography.title },
  summaryLabel: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: Spacing.micro,
  },
});
