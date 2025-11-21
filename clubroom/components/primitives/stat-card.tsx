import { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface StatCardProps {
  /**
   * Main stat value
   */
  value: string | number;

  /**
   * Label for the stat
   */
  label: string;

  /**
   * Optional icon or element to display next to value
   */
  icon?: ReactNode;

  /**
   * Optional trend indicator (e.g., "+8%", "↑ 12")
   */
  trend?: string;

  /**
   * Trend color override (defaults to success/error based on +/-)
   */
  trendColor?: string;

  /**
   * Variant: 'default' or 'compact'
   */
  variant?: 'default' | 'compact';
}

/**
 * StatCard displays a single metric with label, value, and optional trend.
 * Use in horizontal rows for key metrics or standalone for emphasis.
 *
 * @example
 * ```tsx
 * <View style={{ flexDirection: 'row', gap: Spacing.md }}>
 *   <StatCard value="24" label="Sessions" trend="+4" />
 *   <StatCard value="4.8" label="Avg Rating" icon={<Star />} />
 * </View>
 * ```
 */
export function StatCard({
  value,
  label,
  icon,
  trend,
  trendColor,
  variant = 'default',
}: StatCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const isCompact = variant === 'compact';

  // Auto-detect trend color based on +/-
  const autoTrendColor = trend
    ? trend.startsWith('+') || trend.includes('↑')
      ? palette.success
      : trend.startsWith('-') || trend.includes('↓')
      ? palette.error
      : palette.muted
    : palette.muted;

  const finalTrendColor = trendColor || autoTrendColor;

  return (
    <View style={[styles.container, isCompact && styles.containerCompact]}>
      <View style={styles.valueRow}>
        <ThemedText
          style={[
            styles.value,
            isCompact && styles.valueCompact,
            { fontVariant: ['tabular-nums'] as any },
          ]}
        >
          {value}
        </ThemedText>
        {icon}
        {trend ? (
          <View style={[styles.trendBadge, { backgroundColor: finalTrendColor + '20' }]}>
            <ThemedText style={[styles.trendText, { color: finalTrendColor }]}>
              {trend}
            </ThemedText>
          </View>
        ) : null}
      </View>
      <ThemedText style={[styles.label, isCompact && styles.labelCompact, { color: palette.muted }]}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  containerCompact: {
    alignItems: 'flex-start',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  valueCompact: {
    fontSize: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelCompact: {
    fontSize: 13,
    textTransform: 'none',
    letterSpacing: 0,
    fontWeight: '500',
  },
  trendBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});
