import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface SpendingComparisonCardProps {
  thisMonth: number;
  lastMonth: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

export const SpendingComparisonCard = memo(function SpendingComparisonCard({
  thisMonth, lastMonth, trend, trendPercent,
}: SpendingComparisonCardProps) {
  const { colors } = useTheme();

  const trendColor = trend === 'up' ? colors.error : trend === 'down' ? colors.success : colors.muted;
  const trendIcon = trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove';

  return (
    <Row gap="sm">
      <SurfaceCard style={styles.card}>
        <ThemedText style={[Typography.caption, { color: colors.muted }]}>This Month</ThemedText>
        <ThemedText style={Typography.display}>{'\u00A3'}{thisMonth.toFixed(0)}</ThemedText>
        <Row gap="xxs" align="center">
          <Ionicons name={trendIcon as keyof typeof Ionicons.glyphMap} size={14} color={trendColor} />
          <ThemedText style={[Typography.caption, { color: trendColor }]}>{trendPercent}% vs last month</ThemedText>
        </Row>
      </SurfaceCard>
      <SurfaceCard style={styles.card}>
        <ThemedText style={[Typography.caption, { color: colors.muted }]}>Last Month</ThemedText>
        <ThemedText style={Typography.display}>{'\u00A3'}{lastMonth.toFixed(0)}</ThemedText>
        <ThemedText style={[Typography.caption, { color: colors.muted }]}>Completed sessions</ThemedText>
      </SurfaceCard>
    </Row>
  );
});

const styles = StyleSheet.create({
  card: { flex: 1, padding: Spacing.md, gap: Spacing.xxs },
});
