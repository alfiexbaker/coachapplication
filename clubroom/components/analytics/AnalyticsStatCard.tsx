import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, Components, withAlpha } from '@/constants/theme';
import type { TrendDirection } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

export interface AnalyticsStatCardProps {
  /** Label for the stat */
  label: string;
  /** Current value to display */
  value: string | number;
  /** Optional change value (e.g., "+5" or "-10") */
  change?: number;
  /** Percentage change from previous period */
  changePercent?: number;
  /** Trend direction for visual indicator */
  trend?: TrendDirection;
  /** Icon name from Ionicons */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Custom icon color */
  iconColor?: string;
  /** Whether the card is in loading state */
  loading?: boolean;
  /** Callback when card is pressed */
  onPress?: () => void;
  /** Format the value as currency */
  isCurrency?: boolean;
  /** Currency symbol (default: GBP) */
  currencySymbol?: string;
}

/**
 * AnalyticsStatCard displays a single metric with trend indicator.
 * Used on the coach analytics dashboard for key metrics.
 */
export function AnalyticsStatCard({
  label,
  value,
  change,
  changePercent,
  trend,
  icon,
  iconColor,
  loading = false,
  onPress,
  isCurrency = false,
  currencySymbol = '\u00A3',
}: AnalyticsStatCardProps) {
  const { colors: palette } = useTheme();

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

  const formatValue = (val: string | number): string => {
    if (typeof val === 'number' && isCurrency) {
      return `${currencySymbol}${val.toLocaleString()}`;
    }
    return String(val);
  };

  const formatChange = (): string => {
    if (changePercent !== undefined) {
      const sign = changePercent >= 0 ? '+' : '';
      return `${sign}${changePercent.toFixed(1)}%`;
    }
    if (change !== undefined) {
      const sign = change >= 0 ? '+' : '';
      return `${sign}${change}`;
    }
    return '';
  };

  const trendColor = getTrendColor();
  const trendIcon = getTrendIcon();
  const changeText = formatChange();

  return (
    <SurfaceCard style={styles.card} loading={loading} onPress={onPress} tactile={!!onPress}>
      <Row style={styles.header}>
        {icon && (
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: withAlpha(iconColor || palette.tint, 0.09) },
            ]}
          >
            <Ionicons name={icon} size={20} color={iconColor || palette.tint} />
          </View>
        )}
      </Row>

      <ThemedText style={styles.value}>{formatValue(value)}</ThemedText>

      <ThemedText style={[styles.label, { color: palette.muted }]}>{label}</ThemedText>

      {(trend || change !== undefined || changePercent !== undefined) && (
        <Row style={[styles.trendContainer, { backgroundColor: withAlpha(trendColor, 0.09) }]}>
          <Ionicons name={trendIcon} size={14} color={trendColor} />
          {changeText && (
            <ThemedText style={[styles.trendText, { color: trendColor }]}>{changeText}</ThemedText>
          )}
        </Row>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    padding: Components.card.padding,
    gap: Spacing.xs,
  },
  header: {
    justifyContent: 'flex-start',
    marginBottom: Spacing.xs,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { ...Typography.display, letterSpacing: -0.5 },
  label: { ...Typography.smallSemiBold, textTransform: 'uppercase', letterSpacing: 0.5 },
  trendContainer: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    marginTop: Spacing.xs,
  },
  trendText: { ...Typography.caption },
});
