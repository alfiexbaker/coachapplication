/**
 * StatsRow — Horizontal row of compact stat metrics with trends.
 */
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

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
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.statsRowCard}>
      <View style={styles.statsRow}>
        {stats.map((stat, index) => {
          const trendColor = stat.trend ? (stat.trend > 0 ? palette.success : stat.trend < 0 ? palette.error : palette.muted) : null;
          return (
            <Animated.View
              key={stat.label}
              entering={FadeInDown.delay(index * 100).springify()}
              style={[styles.statsRowItem, index !== stats.length - 1 && styles.statsRowItemBorder, index !== stats.length - 1 && { borderRightColor: palette.border }]}
            >
              {stat.icon && (
                <View style={[styles.statsRowIcon, { backgroundColor: withAlpha(stat.iconColor || palette.tint, 0.07) }]}>
                  <Ionicons name={stat.icon} size={18} color={stat.iconColor || palette.tint} />
                </View>
              )}
              <View style={styles.statsRowValueContainer}>
                <View style={styles.statsRowValueRow}>
                  <ThemedText style={styles.statsRowValue}>{stat.value}</ThemedText>
                  {stat.trend !== undefined && (
                    <Ionicons name={stat.trend > 0 ? 'caret-up' : stat.trend < 0 ? 'caret-down' : 'remove'} size={12} color={trendColor || palette.muted} />
                  )}
                </View>
                <ThemedText style={[styles.statsRowLabel, { color: palette.muted }]}>{stat.label}</ThemedText>
              </View>
            </Animated.View>
          );
        })}
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  statsRowCard: { padding: Spacing.md },
  statsRow: { flexDirection: 'row' },
  statsRowItem: { flex: 1, alignItems: 'center', gap: Spacing.xs },
  statsRowItemBorder: { borderRightWidth: 1 },
  statsRowIcon: { width: 36, height: 36, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  statsRowValueContainer: { alignItems: 'center', gap: Spacing.micro },
  statsRowValueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.micro },
  statsRowValue: { ...Typography.heading, letterSpacing: -0.3 },
  statsRowLabel: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.3 },
});
