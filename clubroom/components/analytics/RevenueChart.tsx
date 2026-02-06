import { View, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii , Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { RevenueDataPoint, TrendDirection } from '@/constants/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface RevenueChartProps {
  /** Revenue data points to display */
  data: RevenueDataPoint[];
  /** Title for the chart */
  title?: string;
  /** Total revenue for the period */
  totalRevenue?: number;
  /** Revenue trend direction */
  trend?: TrendDirection;
  /** Percentage change from previous period */
  changePercent?: number;
  /** Whether the chart is loading */
  loading?: boolean;
  /** Currency symbol (default: GBP) */
  currencySymbol?: string;
  /** Callback when chart is pressed */
  onPress?: () => void;
}

/**
 * RevenueChart displays a bar chart of revenue data over time.
 * Shows trend indicators and total revenue summary.
 */
export function RevenueChart({
  data,
  title = 'Revenue',
  totalRevenue,
  trend,
  changePercent,
  loading = false,
  currencySymbol = '\u00A3',
  onPress,
}: RevenueChartProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const maxAmount = Math.max(...data.map((d) => d.amount), 1);
  const barWidth = data.length > 0 ? (SCREEN_WIDTH - Spacing.lg * 4) / data.length - 4 : 30;

  const getTrendColor = (): string => {
    if (!trend) return palette.muted;
    switch (trend) {
      case 'UP':
        return palette.success;
      case 'DOWN':
        return palette.error;
      case 'STABLE':
      default:
        return palette.muted;
    }
  };

  const getTrendIcon = (): keyof typeof Ionicons.glyphMap => {
    if (!trend) return 'remove';
    switch (trend) {
      case 'UP':
        return 'trending-up';
      case 'DOWN':
        return 'trending-down';
      case 'STABLE':
      default:
        return 'remove';
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).split(' ')[0];
  };

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol}${amount.toLocaleString()}`;
  };

  const trendColor = getTrendColor();

  return (
    <SurfaceCard
      style={styles.card}
      loading={loading}
      onPress={onPress}
      tactile={!!onPress}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="bar-chart" size={20} color={palette.tint} />
          <ThemedText style={styles.title}>{title}</ThemedText>
        </View>
        {totalRevenue !== undefined && (
          <View style={styles.totalContainer}>
            <ThemedText style={styles.totalValue}>
              {formatCurrency(totalRevenue)}
            </ThemedText>
            {trend && changePercent !== undefined && (
              <View style={[styles.trendBadge, { backgroundColor: withAlpha(trendColor, 0.09) }]}>
                <Ionicons name={getTrendIcon()} size={12} color={trendColor} />
                <ThemedText style={[styles.trendText, { color: trendColor }]}>
                  {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
                </ThemedText>
              </View>
            )}
          </View>
        )}
      </View>

      {data.length > 0 ? (
        <View style={styles.chartContainer}>
          <View style={styles.barsContainer}>
            {data.map((point, index) => {
              const barHeight = (point.amount / maxAmount) * 100;
              const isLast = index === data.length - 1;
              return (
                <View key={point.date} style={styles.barWrapper}>
                  <View style={styles.barColumn}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${Math.max(barHeight, 5)}%`,
                          width: Math.min(barWidth, 40),
                          backgroundColor: isLast ? palette.tint : withAlpha(palette.tint, 0.38),
                        },
                      ]}
                    />
                  </View>
                  <ThemedText style={[styles.barLabel, { color: palette.muted }]}>
                    {formatDate(point.date)}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="bar-chart-outline" size={32} color={palette.muted} />
          <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
            No revenue data available
          </ThemedText>
        </View>
      )}
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
    marginBottom: Spacing.xs,
  },
  title: { ...Typography.subheading },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  totalValue: { ...Typography.display, letterSpacing: -0.5 },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  trendText: { ...Typography.caption },
  chartContainer: {
    height: 150,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingBottom: Spacing.lg,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  barColumn: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    borderRadius: Radii.sm,
    minHeight: 4,
  },
  barLabel: { ...Typography.micro, marginTop: Spacing.xxs,
    textAlign: 'center' },
  emptyState: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  emptyText: { ...Typography.bodySmall },
});
