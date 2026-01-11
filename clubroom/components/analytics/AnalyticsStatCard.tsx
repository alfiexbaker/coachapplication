import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { TrendDirection } from '@/constants/types';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

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
    <SurfaceCard
      style={styles.card}
      loading={loading}
      onPress={onPress}
      tactile={!!onPress}
    >
      <View style={styles.header}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: (iconColor || palette.tint) + '15' }]}>
            <Ionicons name={icon} size={20} color={iconColor || palette.tint} />
          </View>
        )}
      </View>

      <ThemedText style={styles.value}>
        {formatValue(value)}
      </ThemedText>

      <ThemedText style={[styles.label, { color: palette.muted }]}>
        {label}
      </ThemedText>

      {(trend || change !== undefined || changePercent !== undefined) && (
        <View style={[styles.trendContainer, { backgroundColor: trendColor + '15' }]}>
          <Ionicons name={trendIcon} size={14} color={trendColor} />
          {changeText && (
            <ThemedText style={[styles.trendText, { color: trendColor }]}>
              {changeText}
            </ThemedText>
          )}
        </View>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: Spacing.xs,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: Spacing.xs,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
