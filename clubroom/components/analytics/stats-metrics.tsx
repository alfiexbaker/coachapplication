/**
 * ProgressMetric, MetricsSummary, EmptyMetrics — Analytics utility components.
 */
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// ── Progress Metric ──────────────────────────────────────────

interface ProgressMetricProps {
  title: string; current: number; total: number; label?: string;
  icon?: keyof typeof Ionicons.glyphMap; color?: string; showPercentage?: boolean;
}

export function ProgressMetric({ title, current, total, label, icon, color, showPercentage = true }: ProgressMetricProps) {
  const { colors: palette } = useTheme();
  const accentColor = color || palette.tint;
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <View style={styles.progressMetric}>
      <View style={styles.progressMetricHeader}>
        {icon && (
          <View style={[styles.progressMetricIcon, { backgroundColor: withAlpha(accentColor, 0.07) }]}>
            <Ionicons name={icon} size={16} color={accentColor} />
          </View>
        )}
        <ThemedText type="defaultSemiBold" style={styles.progressMetricTitle}>{title}</ThemedText>
        {showPercentage && <ThemedText style={[styles.progressMetricPercentage, { color: accentColor }]}>{percentage}%</ThemedText>}
      </View>
      <View style={styles.progressMetricBarContainer}>
        <View style={[styles.progressMetricBarBg, { backgroundColor: palette.border }]}>
          <View style={[styles.progressMetricBarFill, { width: `${percentage}%`, backgroundColor: accentColor }]} />
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

// ── Metrics Summary ──────────────────────────────────────────

interface MetricsSummaryProps {
  title: string;
  metrics: { value: string | number; label: string; trend?: { value: number; label: string } }[];
  highlight?: { label: string; value: string | number; icon?: keyof typeof Ionicons.glyphMap; color?: string };
}

export function MetricsSummary({ title, metrics, highlight }: MetricsSummaryProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.metricsSummaryCard}>
      <ThemedText type="defaultSemiBold" style={styles.metricsSummaryTitle}>{title}</ThemedText>
      {highlight && (
        <View style={[styles.metricsSummaryHighlight, { backgroundColor: withAlpha(highlight.color || palette.tint, 0.03) }]}>
          {highlight.icon && <Ionicons name={highlight.icon} size={24} color={highlight.color || palette.tint} />}
          <View style={styles.metricsSummaryHighlightContent}>
            <ThemedText type="heading" style={[styles.metricsSummaryHighlightValue, { color: highlight.color || palette.tint }]}>{highlight.value}</ThemedText>
            <ThemedText style={[styles.metricsSummaryHighlightLabel, { color: palette.muted }]}>{highlight.label}</ThemedText>
          </View>
        </View>
      )}
      <View style={styles.metricsSummaryGrid}>
        {metrics.map((metric, index) => {
          const trendColor = metric.trend ? (metric.trend.value > 0 ? palette.success : metric.trend.value < 0 ? palette.error : palette.muted) : null;
          return (
            <Animated.View key={metric.label} entering={FadeInDown.delay(100 + index * 50).springify()} style={[styles.metricsSummaryItem, { borderColor: palette.border }]}>
              <ThemedText style={styles.metricsSummaryItemValue}>{metric.value}</ThemedText>
              <ThemedText style={[styles.metricsSummaryItemLabel, { color: palette.muted }]}>{metric.label}</ThemedText>
              {metric.trend && trendColor && (
                <View style={[styles.metricsSummaryTrend, { backgroundColor: withAlpha(trendColor, 0.07) }]}>
                  <Ionicons name={metric.trend.value > 0 ? 'arrow-up' : 'arrow-down'} size={10} color={trendColor} />
                  <ThemedText style={[styles.metricsSummaryTrendText, { color: trendColor }]}>{metric.trend.label}</ThemedText>
                </View>
              )}
            </Animated.View>
          );
        })}
      </View>
    </SurfaceCard>
  );
}

// ── Empty Metrics ────────────────────────────────────────────

interface EmptyMetricsProps {
  icon?: keyof typeof Ionicons.glyphMap; title: string; description: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyMetrics({ icon = 'analytics-outline', title, description, action }: EmptyMetricsProps) {
  const { colors: palette } = useTheme();
  return (
    <SurfaceCard style={styles.emptyMetrics}>
      <View style={[styles.emptyMetricsIcon, { backgroundColor: palette.surface }]}>
        <Ionicons name={icon} size={36} color={palette.muted} />
      </View>
      <ThemedText type="defaultSemiBold" style={styles.emptyMetricsTitle}>{title}</ThemedText>
      <ThemedText style={[styles.emptyMetricsDescription, { color: palette.muted }]}>{description}</ThemedText>
      {action && (
        <View style={[styles.emptyMetricsAction, { borderColor: palette.tint }]}>
          <ThemedText style={[styles.emptyMetricsActionText, { color: palette.tint }]}>{action.label}</ThemedText>
        </View>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  progressMetric: { gap: Spacing.xs },
  progressMetricHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  progressMetricIcon: { width: 28, height: 28, borderRadius: Radii.lg, alignItems: 'center', justifyContent: 'center' },
  progressMetricTitle: { ...Typography.bodySmall, flex: 1 },
  progressMetricPercentage: { ...Typography.bodySmallSemiBold },
  progressMetricBarContainer: { marginTop: Spacing.micro },
  progressMetricBarBg: { height: 6, borderRadius: Radii.xs, overflow: 'hidden' },
  progressMetricBarFill: { height: '100%', borderRadius: Radii.xs },
  progressMetricFooter: { marginTop: Spacing.micro },
  progressMetricValue: { ...Typography.caption },
  metricsSummaryCard: { padding: Spacing.md, gap: Spacing.md },
  metricsSummaryTitle: { ...Typography.subheading },
  metricsSummaryHighlight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm, borderRadius: Radii.md },
  metricsSummaryHighlightContent: { gap: Spacing.micro },
  metricsSummaryHighlightValue: { ...Typography.display },
  metricsSummaryHighlightLabel: { ...Typography.caption },
  metricsSummaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  metricsSummaryItem: { flex: 1, minWidth: '45%', padding: Spacing.sm, borderWidth: 1, borderRadius: Radii.md, gap: Spacing.xxs },
  metricsSummaryItemValue: { ...Typography.heading },
  metricsSummaryItemLabel: { ...Typography.caption },
  metricsSummaryTrend: { flexDirection: 'row', alignItems: 'center', gap: Spacing.micro, paddingHorizontal: Spacing.xxs, paddingVertical: Spacing.micro, borderRadius: Radii.sm, alignSelf: 'flex-start' },
  metricsSummaryTrendText: { ...Typography.micro },
  emptyMetrics: { padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  emptyMetricsIcon: { width: 72, height: 72, borderRadius: Radii['3xl'], alignItems: 'center', justifyContent: 'center' },
  emptyMetricsTitle: { ...Typography.subheading, marginTop: Spacing.xs },
  emptyMetricsDescription: { ...Typography.small, textAlign: 'center', maxWidth: 260, lineHeight: 19 },
  emptyMetricsAction: { marginTop: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderWidth: 1, borderRadius: Radii.md },
  emptyMetricsActionText: { ...Typography.smallSemiBold },
});
