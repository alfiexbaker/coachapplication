import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { DrillAssignmentStats } from '@/constants/types';
import { scaleFont } from '@/utils/scale';

interface DrillStatsCardProps {
  stats: DrillAssignmentStats;
  colors: ThemeColors;
  delay?: number;
}

export const DrillStatsCard = memo(function DrillStatsCard({ stats, colors, delay = 100 }: DrillStatsCardProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <SurfaceCard style={styles.card}>
        <Row align="center" justify="space-between">
          <StatItem label="Pending" value={stats.pending} color={colors.warning} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <StatItem label="Overdue" value={stats.overdue} color={stats.overdue > 0 ? colors.error : colors.muted} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <StatItem label="Completed" value={stats.completed} color={colors.success} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Row gap="xxs" align="center">
              <Ionicons name="flame" size={16} color={colors.warning} />
              <ThemedText type="title" style={styles.statValue}>{stats.currentStreak}</ThemedText>
            </Row>
            <ThemedText style={[styles.statLabel, { color: colors.muted }]}>Day Streak</ThemedText>
          </View>
        </Row>

        <View style={[styles.progressSection, { borderTopColor: colors.border }]}>
          <Row justify="space-between" align="center" style={styles.progressHeader}>
            <ThemedText style={[styles.progressLabel, { color: colors.muted }]}>Completion Rate</ThemedText>
            <ThemedText style={[styles.progressValue, { color: colors.text }]}>{stats.completionRate}%</ThemedText>
          </Row>
          <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceSecondary }]}>
            <View style={[styles.progressBarFill, { backgroundColor: colors.success, width: `${stats.completionRate}%` }]} />
          </View>
        </View>
      </SurfaceCard>
    </Animated.View>
  );
});

function StatItem({ label, value, color, colors }: { label: string; value: number; color: string; colors: ThemeColors }) {
  return (
    <View style={styles.statItem}>
      <ThemedText type="title" style={[styles.statValue, { color }]}>{value}</ThemedText>
      <ThemedText style={[styles.statLabel, { color: colors.muted }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.lg, marginBottom: Spacing.md },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { ...Typography.display, fontSize: scaleFont(Typography.display.fontSize) },
  statLabel: { ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize), marginTop: Spacing.micro },
  divider: { width: 1, height: 32 },
  progressSection: { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1 },
  progressHeader: { marginBottom: Spacing.xs },
  progressLabel: { ...Typography.small, fontSize: scaleFont(Typography.small.fontSize) },
  progressValue: { ...Typography.bodySmallSemiBold, fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize) },
  progressBarBg: { height: 8, borderRadius: Radii.xs, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: Radii.xs },
});
