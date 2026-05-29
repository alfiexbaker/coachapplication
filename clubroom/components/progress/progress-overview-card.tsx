import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { AthleteProgress } from '@/services/progress-service';
import { useTheme } from '@/hooks/useTheme';

function getTrendIcon(trend: string, palette: { success: string; error: string; muted: string }) {
  switch (trend) {
    case 'improving':
      return { name: 'trending-up', color: palette.success, label: 'Improving' };
    case 'declining':
      return { name: 'trending-down', color: palette.error, label: 'Needs Focus' };
    default:
      return { name: 'remove', color: palette.muted, label: 'Steady' };
  }
}

function OverviewCardInner({ progress }: { progress: AthleteProgress; viewerRole: string }) {
  const { colors: palette } = useTheme();
  const trend = getTrendIcon(progress.overallTrend, palette);

  return (
    <SurfaceCard style={styles.card}>
      <Row justify="space-between" align="flex-start">
        <View style={styles.left}>
          <Row
            align="center"
            gap="xxs"
            style={[styles.levelBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
          >
            <Ionicons name="trophy" size={16} color={palette.tint} />
            <ThemedText style={[styles.levelText, { color: palette.tint }]}>
              Level {progress.currentLevel.level}
            </ThemedText>
          </Row>
          <ThemedText type="defaultSemiBold" style={styles.levelName}>
            {progress.currentLevel.name}
          </ThemedText>
        </View>
        <Row
          align="center"
          gap="xxs"
          style={[styles.trendBadge, { backgroundColor: withAlpha(trend.color, 0.09) }]}
        >
          <Ionicons
            name={trend.name as keyof typeof Ionicons.glyphMap}
            size={14}
            color={trend.color}
          />
          <ThemedText style={[styles.trendText, { color: trend.color }]}>{trend.label}</ThemedText>
        </Row>
      </Row>

      <View style={styles.progressSection}>
        <Row justify="space-between">
          <ThemedText style={[styles.progressLabel, { color: palette.muted }]}>
            {progress.totalPoints} points
          </ThemedText>
          <ThemedText style={[styles.progressLabel, { color: palette.muted }]}>
            {progress.progressToNextLevel}% to next level
          </ThemedText>
        </Row>
        <View style={[styles.progressBar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress.progressToNextLevel}%`, backgroundColor: palette.tint },
            ]}
          />
        </View>
      </View>

      <Row align="center" justify="space-around">
        <View style={styles.statItem}>
          <ThemedText type="heading" style={styles.statValue}>
            {progress.totalSessions}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Sessions</ThemedText>
        </View>
        <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
        <View style={styles.statItem}>
          <ThemedText type="heading" style={styles.statValue}>
            {progress.averagePerformance.toFixed(1)}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Avg Rating</ThemedText>
        </View>
        <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
        <View style={styles.statItem}>
          <ThemedText type="heading" style={styles.statValue}>
            {progress.totalBadges}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Badges</ThemedText>
        </View>
      </Row>
    </SurfaceCard>
  );
}

export const OverviewCard = OverviewCardInner;

const styles = StyleSheet.create({
  card: { padding: Spacing.md, gap: Spacing.md },
  header: {
    /* layout moved to Row */
  },
  left: { gap: Spacing.xxs },
  levelBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
  },
  levelText: { ...Typography.smallSemiBold },
  levelName: { ...Typography.heading },
  trendBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  trendText: { ...Typography.caption },
  progressSection: { gap: Spacing.xxs },
  progressHeader: {
    /* layout moved to Row */
  },
  progressLabel: { ...Typography.caption },
  progressBar: { height: 6, borderRadius: Radii.xs, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radii.xs },
  statsGrid: {
    /* layout moved to Row */
  },
  statItem: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: 32 },
  statValue: { ...Typography.title },
  statLabel: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.3 },
});
