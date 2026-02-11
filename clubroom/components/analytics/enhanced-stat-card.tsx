/**
 * EnhancedStatCard — Stat card with comparison, trend, and sparkline.
 */
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { MiniSparkline } from './mini-sparkline';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

interface EnhancedStatCardProps {
  value: string | number;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  trend?: { value: number; label?: string };
  comparison?: { value: string | number; label: string; type: 'increase' | 'decrease' | 'neutral' };
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
  const { colors: palette } = useTheme();
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
        {icon && !isCompact && (
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: withAlpha(iconColor || palette.tint, 0.07) },
              isLarge && styles.iconContainerLarge,
            ]}
          >
            <Ionicons name={icon} size={isLarge ? 24 : 20} color={iconColor || palette.tint} />
          </View>
        )}

        <Row style={[styles.valueContainer, isCompact && styles.valueContainerCompact]}>
          <Row style={styles.valueRow}>
            {isCompact && icon && (
              <Ionicons
                name={icon}
                size={14}
                color={iconColor || palette.tint}
                style={{ marginRight: Spacing.xxs }}
              />
            )}
            <ThemedText
              style={[styles.value, isLarge && styles.valueLarge, isCompact && styles.valueCompact]}
            >
              {value}
            </ThemedText>
            {trend && (
              <Row style={[styles.trendBadge, { backgroundColor: withAlpha(trendColor, 0.09) }]}>
                <Ionicons
                  name={trend.value > 0 ? 'arrow-up' : trend.value < 0 ? 'arrow-down' : 'remove'}
                  size={10}
                  color={trendColor}
                />
                <ThemedText style={[styles.trendText, { color: trendColor }]}>
                  {trend.value > 0 ? '+' : ''}
                  {trend.value}%
                </ThemedText>
              </Row>
            )}
          </Row>
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
        </Row>

        {sparklineData && sparklineData.length > 0 && !isCompact && (
          <MiniSparkline
            data={sparklineData}
            color={iconColor || palette.tint}
            width={50}
            height={isLarge ? 28 : 22}
            showDots
          />
        )}

        {comparison && !isCompact && (
          <Row style={styles.comparisonContainer}>
            <View style={[styles.comparisonDot, { backgroundColor: comparisonColor }]} />
            <ThemedText style={[styles.comparisonText, { color: palette.muted }]}>
              <ThemedText style={{ color: comparisonColor, fontWeight: '600' }}>
                {comparison.value}
              </ThemedText>{' '}
              {comparison.label}
            </ThemedText>
          </Row>
        )}
      </SurfaceCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  statCard: { flex: 1, minWidth: 140 },
  statCardLarge: { minWidth: 200 },
  statCardCompact: { minWidth: 100 },
  statCardInner: { padding: Spacing.md, gap: Spacing.sm },
  statCardInnerCompact: { padding: Spacing.sm, gap: Spacing.xs },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerLarge: { width: 48, height: 48, borderRadius: Radii.xl },
  valueContainer: { gap: Spacing.micro },
  valueContainerCompact: { alignItems: 'center', gap: Spacing.xs },
  valueRow: { alignItems: 'center', gap: Spacing.xs },
  value: { ...Typography.title, letterSpacing: -0.5 },
  valueLarge: { ...Typography.display },
  valueCompact: { ...Typography.subheading },
  label: { ...Typography.caption },
  labelLarge: { ...Typography.small },
  labelCompact: { ...Typography.caption },
  trendBadge: {
    alignItems: 'center',
    gap: Spacing.micro,
    paddingHorizontal: 5,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  trendText: { ...Typography.micro },
  comparisonContainer: { alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs },
  comparisonDot: { width: 4, height: 4, borderRadius: Radii.xs },
  comparisonText: { ...Typography.caption },
});
