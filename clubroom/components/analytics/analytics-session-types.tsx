import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

interface SessionType {
  type: string;
  count: number;
  percentage: number;
  revenue: number;
}

interface AnalyticsSessionTypesProps {
  colors: ThemeColors;
  sessionTypes: SessionType[];
  formatCurrency: (amount: number) => string;
}

export const AnalyticsSessionTypes = memo(function AnalyticsSessionTypes({
  colors,
  sessionTypes,
  formatCurrency,
}: AnalyticsSessionTypesProps) {
  return (
    <SurfaceCard style={styles.card}>
      <Row gap="xs" align="center" style={styles.header}>
        <Ionicons name="layers" size={20} color={colors.tint} />
        <ThemedText style={styles.title}>Session Types</ThemedText>
      </Row>
      <View style={styles.list}>
        {sessionTypes.map((sessionType) => (
          <View key={sessionType.type} style={styles.row}>
            <Row justify="space-between" align="center">
              <ThemedText style={styles.name}>{sessionType.type}</ThemedText>
              <ThemedText style={[styles.percent, { color: colors.muted }]}>
                {sessionType.percentage}%
              </ThemedText>
            </Row>
            <View style={[styles.barBg, { backgroundColor: colors.background }]}>
              <View
                style={[
                  styles.barFill,
                  { width: `${sessionType.percentage}%`, backgroundColor: colors.tint },
                ]}
              />
            </View>
            <Row justify="space-between" style={{ marginTop: Spacing.xxs }}>
              <ThemedText style={styles.count}>{sessionType.count}</ThemedText>
              <ThemedText style={[styles.revenue, { color: colors.success }]}>
                {formatCurrency(sessionType.revenue)}
              </ThemedText>
            </Row>
          </View>
        ))}
      </View>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { padding: Spacing.md },
  header: { marginBottom: Spacing.md },
  title: { ...Typography.subheading },
  list: { gap: Spacing.md },
  row: { gap: Spacing.xs },
  name: { ...Typography.bodySmallSemiBold },
  percent: { ...Typography.caption },
  barBg: { height: 8, borderRadius: Radii.xs, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: Radii.xs },
  count: { ...Typography.smallSemiBold },
  revenue: { ...Typography.smallSemiBold },
});
