/**
 * OverviewCard — Level, trend, progress bar, and stats grid.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { AthleteProgress } from '@/services/progress-service';
import { useTheme } from '@/hooks/useTheme';

function getTrendIcon(trend: string, palette: { success: string; error: string; muted: string }) {
  switch (trend) {
    case 'improving': return { name: 'trending-up', color: palette.success, label: 'Improving' };
    case 'declining': return { name: 'trending-down', color: palette.error, label: 'Needs Focus' };
    default: return { name: 'remove', color: palette.muted, label: 'Steady' };
  }
}

function OverviewCardInner({ progress }: { progress: AthleteProgress; viewerRole: string }) {
  const { colors: palette } = useTheme();
  const trend = getTrendIcon(progress.overallTrend, palette);

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.header}>
        <View style={styles.left}>
          <View style={[styles.levelBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <Ionicons name="trophy" size={16} color={palette.tint} />
            <ThemedText style={[styles.levelText, { color: palette.tint }]}>Level {progress.currentLevel.level}</ThemedText>
          </View>
          <ThemedText type="defaultSemiBold" style={styles.levelName}>{progress.currentLevel.name}</ThemedText>
        </View>
        <View style={[styles.trendBadge, { backgroundColor: withAlpha(trend.color, 0.09) }]}>
          <Ionicons name={trend.name as keyof typeof Ionicons.glyphMap} size={14} color={trend.color} />
          <ThemedText style={[styles.trendText, { color: trend.color }]}>{trend.label}</ThemedText>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <ThemedText style={[styles.progressLabel, { color: palette.muted }]}>{progress.totalPoints} points</ThemedText>
          <ThemedText style={[styles.progressLabel, { color: palette.muted }]}>{progress.progressToNextLevel}% to next level</ThemedText>
        </View>
        <View style={[styles.progressBar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
          <View style={[styles.progressFill, { width: `${progress.progressToNextLevel}%`, backgroundColor: palette.tint }]} />
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <ThemedText type="heading" style={styles.statValue}>{progress.totalSessions}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Sessions</ThemedText>
        </View>
        <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
        <View style={styles.statItem}>
          <ThemedText type="heading" style={styles.statValue}>{progress.averagePerformance.toFixed(1)}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Avg Rating</ThemedText>
        </View>
        <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
        <View style={styles.statItem}>
          <ThemedText type="heading" style={styles.statValue}>{progress.totalBadges}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Badges</ThemedText>
        </View>
      </View>
    </SurfaceCard>
  );
}

export const OverviewCard = memo(OverviewCardInner);

const styles = StyleSheet.create({
  card: { padding: Spacing.md, gap: Spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  left: { gap: Spacing.xxs },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.sm, alignSelf: 'flex-start' },
  levelText: { ...Typography.smallSemiBold },
  levelName: { ...Typography.heading },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.xs, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  trendText: { ...Typography.caption },
  progressSection: { gap: Spacing.xxs },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { ...Typography.caption },
  progressBar: { height: 6, borderRadius: Radii.xs, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radii.xs },
  statsGrid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: 32 },
  statValue: { ...Typography.title },
  statLabel: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.3 },
});
