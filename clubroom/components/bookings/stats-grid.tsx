/**
 * StatsGrid — 2x2 grid of stat cards for the Statistics dashboard.
 *
 * Each card shows an icon, value, and label.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { StatItem } from '@/hooks/use-statistics';

interface StatsGridProps {
  stats: StatItem[];
}

export const StatsGrid = memo(function StatsGrid({ stats }: StatsGridProps) {
  return (
    <Row wrap gap="sm">
      {stats.map((stat) => (
        <SurfaceCard key={stat.id} style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: withAlpha(stat.color, 0.12) }]}>
            <Ionicons name={stat.icon} size={24} color={stat.color} />
          </View>
          <ThemedText type="title" style={styles.statValue}>
            {stat.value}
          </ThemedText>
          <ThemedText style={styles.statLabel}>{stat.label}</ThemedText>
        </SurfaceCard>
      ))}
    </Row>
  );
});

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    minWidth: '47%',
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    ...Typography.display,
  },
  statLabel: {
    ...Typography.caption,
    opacity: 0.6,
    textAlign: 'center',
  },
});
