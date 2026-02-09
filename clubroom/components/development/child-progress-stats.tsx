import { memo } from 'react';
import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface ChildProgressStatsProps {
  totalSessions: number;
  averagePerformance: number;
  badgeCount: number;
}

export const ChildProgressStats = memo(function ChildProgressStats({
  totalSessions, averagePerformance, badgeCount,
}: ChildProgressStatsProps) {
  const { colors } = useTheme();

  return (
    <Row align="center" justify="space-around" style={[styles.footer, { borderTopColor: colors.border }]}>
      <StatItem value={String(totalSessions)} label="Sessions" />
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <StatItem value={averagePerformance.toFixed(1)} label="Avg Rating" />
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <StatItem value={String(badgeCount)} label="Badges" />
    </Row>
  );
});

function StatItem({ value, label }: { value: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.statItem}>
      <ThemedText type="heading" style={Typography.title}>{value}</ThemedText>
      <ThemedText style={[Typography.caption, { color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.3 }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { paddingTop: Spacing.md, borderTopWidth: 1, marginTop: Spacing.md },
  statItem: { alignItems: 'center', flex: 1 },
  divider: { width: 1, height: 36 },
});
