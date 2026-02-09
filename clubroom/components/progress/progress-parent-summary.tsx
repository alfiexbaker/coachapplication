/**
 * ParentProgressSummary — Compact progress card for parent view.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { AthleteProgress } from '@/services/progress-service';
import { useTheme } from '@/hooks/useTheme';

type ParentProgressViewProps = {
  progress: AthleteProgress;
  athleteName: string;
  onViewDetails?: () => void;
};

function getTrendInfo(trend: string, palette: { success: string; error: string; muted: string }) {
  switch (trend) {
    case 'improving': return { icon: 'trending-up', color: palette.success, label: 'Improving' };
    case 'declining': return { icon: 'trending-down', color: palette.error, label: 'Needs Attention' };
    default: return { icon: 'remove', color: palette.muted, label: 'Steady Progress' };
  }
}

function ParentProgressSummaryInner({ progress, athleteName, onViewDetails }: ParentProgressViewProps) {
  const { colors: palette } = useTheme();
  const trend = getTrendInfo(progress.overallTrend, palette);

  return (
    <SurfaceCard style={styles.card} onPress={onViewDetails} tactile={Boolean(onViewDetails)}>
      <View style={styles.header}>
        <View>
          <ThemedText type="defaultSemiBold" style={styles.name}>{athleteName}</ThemedText>
          <View style={[styles.trendBadge, { backgroundColor: withAlpha(trend.color, 0.09) }]}>
            <Ionicons name={trend.icon as keyof typeof Ionicons.glyphMap} size={12} color={trend.color} />
            <ThemedText style={[{ ...Typography.caption }, styles.trendText, { color: trend.color }]}>{trend.label}</ThemedText>
          </View>
        </View>
        <View style={[styles.levelCircle, { borderColor: palette.tint }]}>
          <ThemedText style={[styles.levelCircleText, { color: palette.tint }]}>L{progress.currentLevel.level}</ThemedText>
        </View>
      </View>

      <View style={styles.parentStats}>
        <View style={styles.parentStat}>
          <Ionicons name="calendar" size={14} color={palette.muted} />
          <ThemedText style={[styles.parentStatText, { color: palette.muted }]}>{progress.totalSessions} sessions</ThemedText>
        </View>
        <View style={styles.parentStat}>
          <Ionicons name="ribbon" size={14} color={palette.warning} />
          <ThemedText style={[styles.parentStatText, { color: palette.muted }]}>{progress.totalBadges} badges</ThemedText>
        </View>
        <View style={styles.parentStat}>
          <Ionicons name="star" size={14} color={palette.rating} />
          <ThemedText style={[styles.parentStatText, { color: palette.muted }]}>{progress.averagePerformance.toFixed(1)} avg</ThemedText>
        </View>
      </View>

      {progress.recentFeedback.length > 0 && (
        <View style={[styles.latestFeedback, { borderTopColor: palette.border }]}>
          <ThemedText style={[styles.latestLabel, { color: palette.muted }]}>
            Latest: {new Date(progress.recentFeedback[0].createdAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
          </ThemedText>
          <ThemedText style={styles.latestText} numberOfLines={1}>
            {progress.recentFeedback[0].publicSummary || 'Session completed'}
          </ThemedText>
        </View>
      )}

      {onViewDetails && <Ionicons name="chevron-forward" size={18} color={palette.muted} style={styles.chevron} />}
    </SurfaceCard>
  );
}

export const ParentProgressSummary = memo(ParentProgressSummaryInner);

const styles = StyleSheet.create({
  card: { padding: Spacing.md, gap: Spacing.sm, position: 'relative' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { ...Typography.subheading, marginBottom: Spacing.xxs },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.xs, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  trendText: { ...Typography.caption },
  levelCircle: { width: 36, height: 36, borderRadius: Radii.xl, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  levelCircleText: { ...Typography.smallSemiBold },
  parentStats: { flexDirection: 'row', gap: Spacing.md },
  parentStat: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  parentStatText: { ...Typography.caption },
  latestFeedback: { paddingTop: Spacing.sm, borderTopWidth: 1, gap: Spacing.micro },
  latestLabel: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.3 },
  latestText: { ...Typography.small },
  chevron: { position: 'absolute', top: Spacing.md, right: Spacing.sm },
});
