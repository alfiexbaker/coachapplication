import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';


// Mini sparkline chart component
interface SparklineProps {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  showDots?: boolean;
}

export function MiniSparkline({
  data,
  color,
  width = 60,
  height = 24,
  showDots = false,
}: SparklineProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const lineColor = color || palette.tint;

  if (data.length < 2) {
    return <View style={{ width, height }} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  return (
    <View style={[styles.sparklineContainer, { width, height }]}>
      {data.map((value, index) => {
        const barHeight = ((value - min) / range) * height;
        const isLast = index === data.length - 1;
        return (
          <View
            key={index}
            style={[
              styles.sparklineBar,
              {
                height: Math.max(barHeight, 3),
                backgroundColor: lineColor,
                opacity: 0.25 + (index / data.length) * 0.75,
                borderRadius: 2,
              },
            ]}
          >
            {showDots && isLast && (
              <View style={[styles.sparklineDot, { backgroundColor: lineColor }]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

// Enhanced stat card with comparison and trend
interface EnhancedStatCardProps {
  value: string | number;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  trend?: {
    value: number;
    label?: string;
  };
  comparison?: {
    value: string | number;
    label: string;
    type: 'increase' | 'decrease' | 'neutral';
  };
  sparklineData?: number[];
  variant?: 'default' | 'compact' | 'large';
  delay?: number;
}

export function EnhancedStatCard({
  value,
  label,
  icon,
  iconColor,
  trend,
  comparison,
  sparklineData,
  variant = 'default',
  delay = 0,
}: EnhancedStatCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const trendColor = trend
    ? trend.value > 0
      ? palette.success
      : trend.value < 0
      ? palette.error
      : palette.muted
    : palette.muted;

  const comparisonColor = comparison
    ? comparison.type === 'increase'
      ? palette.success
      : comparison.type === 'decrease'
      ? palette.error
      : palette.muted
    : palette.muted;

  const isLarge = variant === 'large';
  const isCompact = variant === 'compact';

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify()}
      style={[
        styles.statCard,
        isLarge && styles.statCardLarge,
        isCompact && styles.statCardCompact,
      ]}
    >
      <SurfaceCard style={[styles.statCardInner, isCompact && styles.statCardInnerCompact]}>
        {/* Icon */}
        {icon && !isCompact && (
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${iconColor || palette.tint}12` },
              isLarge && styles.iconContainerLarge,
            ]}
          >
            <Ionicons
              name={icon}
              size={isLarge ? 24 : 20}
              color={iconColor || palette.tint}
            />
          </View>
        )}

        {/* Value and Label */}
        <View style={[styles.valueContainer, isCompact && styles.valueContainerCompact]}>
          <View style={styles.valueRow}>
            {isCompact && icon && (
              <Ionicons
                name={icon}
                size={14}
                color={iconColor || palette.tint}
                style={{ marginRight: 4 }}
              />
            )}
            <ThemedText
              style={[
                styles.value,
                isLarge && styles.valueLarge,
                isCompact && styles.valueCompact,
              ]}
            >
              {value}
            </ThemedText>

            {/* Trend badge */}
            {trend && (
              <View style={[styles.trendBadge, { backgroundColor: `${trendColor}15` }]}>
                <Ionicons
                  name={trend.value > 0 ? 'arrow-up' : trend.value < 0 ? 'arrow-down' : 'remove'}
                  size={10}
                  color={trendColor}
                />
                <ThemedText style={[styles.trendText, { color: trendColor }]}>
                  {trend.value > 0 ? '+' : ''}{trend.value}%
                </ThemedText>
              </View>
            )}
          </View>

          <ThemedText
            style={[
              styles.label,
              isLarge && styles.labelLarge,
              isCompact && styles.labelCompact,
              { color: palette.muted },
            ]}
          >
            {label}
          </ThemedText>
        </View>

        {/* Sparkline */}
        {sparklineData && sparklineData.length > 0 && !isCompact && (
          <MiniSparkline
            data={sparklineData}
            color={iconColor || palette.tint}
            width={50}
            height={isLarge ? 28 : 22}
            showDots
          />
        )}

        {/* Comparison */}
        {comparison && !isCompact && (
          <View style={styles.comparisonContainer}>
            <View style={[styles.comparisonDot, { backgroundColor: comparisonColor }]} />
            <ThemedText style={[styles.comparisonText, { color: palette.muted }]}>
              <ThemedText style={{ color: comparisonColor, fontWeight: '600' }}>
                {comparison.value}
              </ThemedText>
              {' '}{comparison.label}
            </ThemedText>
          </View>
        )}
      </SurfaceCard>
    </Animated.View>
  );
}

// Stats row with multiple metrics
interface StatsRowProps {
  stats: {
    value: string | number;
    label: string;
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
    trend?: number;
  }[];
}

export function StatsRow({ stats }: StatsRowProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SurfaceCard style={styles.statsRowCard}>
      <View style={styles.statsRow}>
        {stats.map((stat, index) => {
          const trendColor = stat.trend
            ? stat.trend > 0
              ? palette.success
              : stat.trend < 0
              ? palette.error
              : palette.muted
            : null;

          return (
            <Animated.View
              key={stat.label}
              entering={FadeInDown.delay(index * 100).springify()}
              style={[
                styles.statsRowItem,
                index !== stats.length - 1 && styles.statsRowItemBorder,
                index !== stats.length - 1 && { borderRightColor: palette.border },
              ]}
            >
              {stat.icon && (
                <View
                  style={[
                    styles.statsRowIcon,
                    { backgroundColor: `${stat.iconColor || palette.tint}12` },
                  ]}
                >
                  <Ionicons
                    name={stat.icon}
                    size={18}
                    color={stat.iconColor || palette.tint}
                  />
                </View>
              )}
              <View style={styles.statsRowValueContainer}>
                <View style={styles.statsRowValueRow}>
                  <ThemedText style={styles.statsRowValue}>{stat.value}</ThemedText>
                  {stat.trend !== undefined && (
                    <Ionicons
                      name={stat.trend > 0 ? 'caret-up' : stat.trend < 0 ? 'caret-down' : 'remove'}
                      size={12}
                      color={trendColor || palette.muted}
                    />
                  )}
                </View>
                <ThemedText style={[styles.statsRowLabel, { color: palette.muted }]}>
                  {stat.label}
                </ThemedText>
              </View>
            </Animated.View>
          );
        })}
      </View>
    </SurfaceCard>
  );
}

// Progress metrics with visual representation
interface ProgressMetricProps {
  title: string;
  current: number;
  total: number;
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  showPercentage?: boolean;
}

export function ProgressMetric({
  title,
  current,
  total,
  label,
  icon,
  color,
  showPercentage = true,
}: ProgressMetricProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const accentColor = color || palette.tint;
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <View style={styles.progressMetric}>
      <View style={styles.progressMetricHeader}>
        {icon && (
          <View style={[styles.progressMetricIcon, { backgroundColor: `${accentColor}12` }]}>
            <Ionicons name={icon} size={16} color={accentColor} />
          </View>
        )}
        <ThemedText type="defaultSemiBold" style={styles.progressMetricTitle}>
          {title}
        </ThemedText>
        {showPercentage && (
          <ThemedText style={[styles.progressMetricPercentage, { color: accentColor }]}>
            {percentage}%
          </ThemedText>
        )}
      </View>

      <View style={styles.progressMetricBarContainer}>
        <View style={[styles.progressMetricBarBg, { backgroundColor: palette.border }]}>
          <View
            style={[
              styles.progressMetricBarFill,
              { width: `${percentage}%`, backgroundColor: accentColor },
            ]}
          />
        </View>
      </View>

      <View style={styles.progressMetricFooter}>
        <ThemedText style={[styles.progressMetricValue, { color: palette.muted }]}>
          <ThemedText style={{ fontWeight: '600', color: palette.text }}>{current}</ThemedText>
          {' / '}{total} {label || 'completed'}
        </ThemedText>
      </View>
    </View>
  );
}

// Summary card with key metrics
interface MetricsSummaryProps {
  title: string;
  metrics: {
    value: string | number;
    label: string;
    trend?: { value: number; label: string };
  }[];
  highlight?: {
    label: string;
    value: string | number;
    icon?: keyof typeof Ionicons.glyphMap;
    color?: string;
  };
}

export function MetricsSummary({ title, metrics, highlight }: MetricsSummaryProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SurfaceCard style={styles.metricsSummaryCard}>
      <ThemedText type="defaultSemiBold" style={styles.metricsSummaryTitle}>
        {title}
      </ThemedText>

      {/* Highlight section */}
      {highlight && (
        <View
          style={[
            styles.metricsSummaryHighlight,
            { backgroundColor: `${highlight.color || palette.tint}08` },
          ]}
        >
          {highlight.icon && (
            <Ionicons
              name={highlight.icon}
              size={24}
              color={highlight.color || palette.tint}
            />
          )}
          <View style={styles.metricsSummaryHighlightContent}>
            <ThemedText
              type="heading"
              style={[styles.metricsSummaryHighlightValue, { color: highlight.color || palette.tint }]}
            >
              {highlight.value}
            </ThemedText>
            <ThemedText style={[styles.metricsSummaryHighlightLabel, { color: palette.muted }]}>
              {highlight.label}
            </ThemedText>
          </View>
        </View>
      )}

      {/* Metrics grid */}
      <View style={styles.metricsSummaryGrid}>
        {metrics.map((metric, index) => {
          const trendColor = metric.trend
            ? metric.trend.value > 0
              ? palette.success
              : metric.trend.value < 0
              ? palette.error
              : palette.muted
            : null;

          return (
            <Animated.View
              key={metric.label}
              entering={FadeInDown.delay(100 + index * 50).springify()}
              style={[
                styles.metricsSummaryItem,
                { borderColor: palette.border },
              ]}
            >
              <ThemedText style={styles.metricsSummaryItemValue}>{metric.value}</ThemedText>
              <ThemedText style={[styles.metricsSummaryItemLabel, { color: palette.muted }]}>
                {metric.label}
              </ThemedText>
              {metric.trend && trendColor && (
                <View style={[styles.metricsSummaryTrend, { backgroundColor: `${trendColor}12` }]}>
                  <Ionicons
                    name={metric.trend.value > 0 ? 'arrow-up' : 'arrow-down'}
                    size={10}
                    color={trendColor}
                  />
                  <ThemedText style={[styles.metricsSummaryTrendText, { color: trendColor }]}>
                    {metric.trend.label}
                  </ThemedText>
                </View>
              )}
            </Animated.View>
          );
        })}
      </View>
    </SurfaceCard>
  );
}

// Empty state component
interface EmptyMetricsProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyMetrics({ icon = 'analytics-outline', title, description, action }: EmptyMetricsProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SurfaceCard style={styles.emptyMetrics}>
      <View style={[styles.emptyMetricsIcon, { backgroundColor: palette.surface }]}>
        <Ionicons name={icon} size={36} color={palette.muted} />
      </View>
      <ThemedText type="defaultSemiBold" style={styles.emptyMetricsTitle}>
        {title}
      </ThemedText>
      <ThemedText style={[styles.emptyMetricsDescription, { color: palette.muted }]}>
        {description}
      </ThemedText>
      {action && (
        <View style={[styles.emptyMetricsAction, { borderColor: palette.tint }]}>
          <ThemedText style={[styles.emptyMetricsActionText, { color: palette.tint }]}>
            {action.label}
          </ThemedText>
        </View>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  // Sparkline
  sparklineContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  sparklineBar: {
    flex: 1,
    minWidth: 4,
  },
  sparklineDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Stat card
  statCard: {
    flex: 1,
    minWidth: 140,
  },
  statCardLarge: {
    minWidth: 200,
  },
  statCardCompact: {
    minWidth: 100,
  },
  statCardInner: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  statCardInnerCompact: {
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  valueContainer: {
    gap: 2,
  },
  valueContainerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  valueLarge: {
    fontSize: 28,
  },
  valueCompact: {
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  labelLarge: {
    fontSize: 13,
  },
  labelCompact: {
    fontSize: 11,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  comparisonDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  comparisonText: {
    fontSize: 11,
  },

  // Stats row
  statsRowCard: {
    padding: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statsRowItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statsRowItemBorder: {
    borderRightWidth: 1,
  },
  statsRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRowValueContainer: {
    alignItems: 'center',
    gap: 2,
  },
  statsRowValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  statsRowValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statsRowLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Progress metric
  progressMetric: {
    gap: Spacing.xs,
  },
  progressMetricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  progressMetricIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressMetricTitle: {
    flex: 1,
    fontSize: 14,
  },
  progressMetricPercentage: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressMetricBarContainer: {
    marginTop: 2,
  },
  progressMetricBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressMetricBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressMetricFooter: {
    marginTop: 2,
  },
  progressMetricValue: {
    fontSize: 12,
  },

  // Metrics summary
  metricsSummaryCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  metricsSummaryTitle: {
    fontSize: 16,
  },
  metricsSummaryHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  metricsSummaryHighlightContent: {
    gap: 2,
  },
  metricsSummaryHighlightValue: {
    fontSize: 24,
  },
  metricsSummaryHighlightLabel: {
    fontSize: 12,
  },
  metricsSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  metricsSummaryItem: {
    flex: 1,
    minWidth: '45%',
    padding: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radii.md,
    gap: 4,
  },
  metricsSummaryItemValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  metricsSummaryItemLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  metricsSummaryTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
  },
  metricsSummaryTrendText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Empty metrics
  emptyMetrics: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyMetricsIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMetricsTitle: {
    fontSize: 16,
    marginTop: Spacing.xs,
  },
  emptyMetricsDescription: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 19,
  },
  emptyMetricsAction: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radii.md,
  },
  emptyMetricsActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
