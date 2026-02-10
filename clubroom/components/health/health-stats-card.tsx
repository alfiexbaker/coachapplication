import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { InjuryStats } from '@/constants/types';
import { injuryService } from '@/services/injury-service';

interface HealthStatsCardProps {
  colors: ThemeColors;
  stats: InjuryStats;
}

export const HealthStatsCard = memo(function HealthStatsCard({ colors, stats }: HealthStatsCardProps) {
  return (
    <SurfaceCard style={styles.card}>
      <ThemedText type="subtitle" style={styles.title}>Injury History</ThemedText>
      <Row style={styles.grid}>
        <View style={styles.gridItem}>
          <ThemedText style={[styles.value, { color: colors.text }]}>{stats.totalInjuries}</ThemedText>
          <ThemedText style={[styles.label, { color: colors.muted }]}>Total</ThemedText>
        </View>
        <View style={styles.gridItem}>
          <ThemedText style={[styles.value, { color: colors.success }]}>{stats.healedInjuries}</ThemedText>
          <ThemedText style={[styles.label, { color: colors.muted }]}>Healed</ThemedText>
        </View>
        <View style={styles.gridItem}>
          <ThemedText style={[styles.value, { color: colors.text }]}>{stats.averageRecoveryDays}</ThemedText>
          <ThemedText style={[styles.label, { color: colors.muted }]}>Avg Days</ThemedText>
        </View>
      </Row>
      {stats.commonBodyParts.length > 0 && (
        <View style={[styles.commonParts, { borderTopColor: colors.border }]}>
          <ThemedText style={[styles.commonLabel, { color: colors.muted }]}>Most common areas:</ThemedText>
          <Row gap="xs" wrap>
            {stats.commonBodyParts.slice(0, 3).map((item) => (
              <View key={item.bodyPart} style={[styles.badge, { backgroundColor: withAlpha(colors.tint, 0.06) }]}>
                <ThemedText style={[styles.badgeText, { color: colors.tint }]}>
                  {injuryService.getBodyPartLabel(item.bodyPart)} ({item.count})
                </ThemedText>
              </View>
            ))}
          </Row>
        </View>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.md },
  title: { marginBottom: Spacing.md },
  grid: { justifyContent: 'space-around', marginBottom: Spacing.md },
  gridItem: { alignItems: 'center' },
  value: { ...Typography.display },
  label: { ...Typography.caption },
  commonParts: { borderTopWidth: 1, borderTopColor: 'transparent', paddingTop: Spacing.md },
  commonLabel: { ...Typography.caption, marginBottom: Spacing.xs },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.pill },
  badgeText: { ...Typography.caption },
});
