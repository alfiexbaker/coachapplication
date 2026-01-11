import { ReactNode } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
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

  /**
   * Optional subtitle text below the value
   */
  subtitle?: string;

  /**
   * Wrap in a SurfaceCard for bordered/elevated appearance
   */
  wrapped?: boolean;

  /**
   * Style override for the container
   */
  style?: StyleProp<ViewStyle>;
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
  subtitle,
  wrapped = false,
  style,
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

  const content = (
    <View style={[styles.container, isCompact && styles.containerCompact, !wrapped && style]}>
      <ThemedText style={[styles.label, isCompact && styles.labelCompact, { color: palette.muted }]}>
        {label}
      </ThemedText>
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
      {subtitle ? (
        <ThemedText style={[styles.subtitle, { color: palette.secondary }]}>
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );

  if (wrapped) {
    return (
      <SurfaceCard style={[styles.wrappedCard, style]}>
        {content}
      </SurfaceCard>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    gap: Spacing.xs / 2,
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
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  valueCompact: {
    fontSize: 20,
    fontWeight: '500',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelCompact: {
    fontSize: 13,
    textTransform: 'none',
    letterSpacing: 0,
    fontWeight: '400',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  trendBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0,
  },
  wrappedCard: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: Radii.lg,
  },
});
