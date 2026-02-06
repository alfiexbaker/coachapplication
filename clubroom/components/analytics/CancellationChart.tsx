import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { CancellationStats, CancellationReason } from '@/constants/types';

const REASON_LABELS: Record<CancellationReason, string> = {
  CLIENT_REQUEST: 'Client Request',
  WEATHER: 'Weather',
  ILLNESS: 'Illness',
  SCHEDULING_CONFLICT: 'Scheduling',
  NO_SHOW: 'No Show',
  COACH_CANCELLED: 'Coach Cancelled',
  OTHER: 'Other',
};

const REASON_ICONS: Record<CancellationReason, keyof typeof Ionicons.glyphMap> = {
  CLIENT_REQUEST: 'person-outline',
  WEATHER: 'rainy-outline',
  ILLNESS: 'medical-outline',
  SCHEDULING_CONFLICT: 'calendar-outline',
  NO_SHOW: 'close-circle-outline',
  COACH_CANCELLED: 'person-remove-outline',
  OTHER: 'help-circle-outline',
};

export interface CancellationChartProps {
  /** Cancellation statistics data */
  stats: CancellationStats;
  /** Title for the chart */
  title?: string;
  /** Whether the chart is loading */
  loading?: boolean;
  /** Callback when chart is pressed */
  onPress?: () => void;
  /** Currency symbol (default: GBP) */
  currencySymbol?: string;
}

/**
 * CancellationChart displays cancellation patterns and reasons.
 * Helps coaches identify problematic patterns in bookings.
 */
export function CancellationChart({
  stats,
  title = 'Cancellations',
  loading = false,
  onPress,
  currencySymbol = '\u00A3',
}: CancellationChartProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

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

      {/* Reasons breakdown */}
      {stats.byReason.length > 0 && (
        <View style={styles.reasonsSection}>
          <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>
            By Reason
          </ThemedText>
          <View style={styles.reasonsList}>
            {stats.byReason.map((reason) => (
              <View key={reason.reason} style={styles.reasonRow}>
                <View style={styles.reasonInfo}>
                  <Ionicons
                    name={REASON_ICONS[reason.reason]}
                    size={16}
                    color={palette.muted}
                    style={styles.reasonIcon}
                  />
                  <ThemedText style={styles.reasonLabel}>
                    {REASON_LABELS[reason.reason]}
                  </ThemedText>
                </View>
                <View style={styles.reasonBarContainer}>
                  <View
                    style={[
                      styles.reasonBar,
                      {
                        width: `${(reason.count / maxReasonCount) * 100}%`,
                        backgroundColor: withAlpha(palette.error, 0.38),
                      },
                    ]}
                  />
                </View>
                <ThemedText style={styles.reasonCount}>
                  {reason.count}
                </ThemedText>
                <ThemedText style={[styles.reasonPercent, { color: palette.muted }]}>
                  ({reason.percentage}%)
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Day of week breakdown */}
      {stats.byDayOfWeek.length > 0 && (
        <View style={[styles.daysSection, { borderTopColor: palette.border }]}>
          <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>
            By Day of Week
          </ThemedText>
          <View style={styles.daysList}>
            {stats.byDayOfWeek.map((day) => (
              <View key={day.dayOfWeek} style={styles.dayItem}>
                <ThemedText style={styles.dayName}>
                  {day.dayName.slice(0, 3)}
                </ThemedText>
                <View style={[styles.dayBadge, { backgroundColor: withAlpha(palette.error, 0.12) }]}>
                  <ThemedText style={[styles.dayCount, { color: palette.error }]}>
                    {day.count}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Notice time */}
      <View style={[styles.noticeSection, { borderTopColor: palette.border }]}>
        <Ionicons name="alarm-outline" size={16} color={palette.muted} />
        <ThemedText style={[styles.noticeText, { color: palette.muted }]}>
          Average notice: <ThemedText style={styles.noticeValue}>{stats.avgNoticeHours}h</ThemedText> before session
        </ThemedText>
      </View>
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
  summaryLabel: { ...Typography.caption, textAlign: 'center',
    marginTop: Spacing.micro },
  reasonsSection: {
    marginBottom: Spacing.md,
  },
  sectionTitle: { ...Typography.caption, textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm },
  reasonsList: {
    gap: Spacing.sm,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  reasonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },
  reasonIcon: {
    marginRight: Spacing.xxs,
  },
  reasonLabel: { ...Typography.smallSemiBold, flex: 1 },
  reasonBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.light.border,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  reasonBar: {
    height: '100%',
    borderRadius: Radii.xs,
  },
  reasonCount: { ...Typography.smallSemiBold, width: 24,
    textAlign: 'right' },
  reasonPercent: { ...Typography.caption, width: 36,
    textAlign: 'right' },
  daysSection: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    marginBottom: Spacing.md,
  },
  daysList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayItem: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  dayName: { ...Typography.caption },
  dayBadge: {
    paddingHorizontal: 8,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.md,
    minWidth: 28,
    alignItems: 'center',
  },
  dayCount: { ...Typography.caption },
  noticeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  noticeText: { ...Typography.small },
  noticeValue: {
    fontWeight: '600',
  },
});
