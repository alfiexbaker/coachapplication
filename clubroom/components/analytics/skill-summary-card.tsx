/**
 * SkillsSummary — Overview card for all tracked skills.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { SkillProgress } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

interface SkillsSummaryProps {
  skills: SkillProgress[];
}

function SkillsSummaryInner({ skills }: SkillsSummaryProps) {
  const { colors: palette } = useTheme();

  if (skills.length === 0) {
    return (
      <SurfaceCard style={styles.emptyCard}>
        <Ionicons name="analytics-outline" size={40} color={palette.muted} />
        <ThemedText type="defaultSemiBold" style={{ marginTop: Spacing.sm }}>No Skills Tracked Yet</ThemedText>
        <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
          Skills will appear here after your first training sessions
        </ThemedText>
      </SurfaceCard>
    );
  }

  const avgLevel = skills.reduce((sum, s) => sum + s.currentLevel, 0) / skills.length;
  const improvingCount = skills.filter((s) => s.changePercent > 0).length;
  const decliningCount = skills.filter((s) => s.changePercent < 0).length;
  const steadyCount = skills.filter((s) => s.changePercent === 0).length;
  const topSkill = skills.reduce((best, s) => (s.currentLevel > best.currentLevel ? s : best), skills[0]);
  const mostImproved = skills.reduce((best, s) => (s.changePercent > best.changePercent ? s : best), skills[0]);

  return (
    <SurfaceCard style={styles.card}>
      <ThemedText type="defaultSemiBold" style={styles.title}>Skills Overview</ThemedText>

      {/* Overall Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <View style={[styles.statIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <ThemedText type="heading" style={[styles.statValue, { color: palette.tint }]}>{Math.round(avgLevel)}</ThemedText>
          </View>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Avg Level</ThemedText>
        </View>
        <View style={[styles.divider, { backgroundColor: palette.border }]} />
        <View style={styles.trends}>
          <View style={styles.trendRow}>
            <Ionicons name="trending-up" size={14} color={palette.success} />
            <ThemedText style={[styles.trendValue, { color: palette.success }]}>{improvingCount}</ThemedText>
            <ThemedText style={[styles.trendLabel, { color: palette.muted }]}>improving</ThemedText>
          </View>
          <View style={styles.trendRow}>
            <Ionicons name="remove" size={14} color={palette.muted} />
            <ThemedText style={[styles.trendValue, { color: palette.muted }]}>{steadyCount}</ThemedText>
            <ThemedText style={[styles.trendLabel, { color: palette.muted }]}>steady</ThemedText>
          </View>
          <View style={styles.trendRow}>
            <Ionicons name="trending-down" size={14} color={palette.error} />
            <ThemedText style={[styles.trendValue, { color: palette.error }]}>{decliningCount}</ThemedText>
            <ThemedText style={[styles.trendLabel, { color: palette.muted }]}>need focus</ThemedText>
          </View>
        </View>
      </View>

      {/* Highlights */}
      <View style={styles.highlights}>
        <View style={[styles.highlightCard, { backgroundColor: withAlpha(palette.success, 0.03) }]}>
          <Ionicons name="trophy" size={16} color={palette.success} />
          <View style={styles.highlightContent}>
            <ThemedText style={[styles.highlightLabel, { color: palette.muted }]}>Top Skill</ThemedText>
            <ThemedText type="defaultSemiBold">{topSkill.skillName}</ThemedText>
            <ThemedText style={[styles.highlightValue, { color: palette.success }]}>Level {topSkill.currentLevel}</ThemedText>
          </View>
        </View>
        <View style={[styles.highlightCard, { backgroundColor: withAlpha(palette.tint, 0.03) }]}>
          <Ionicons name="rocket" size={16} color={palette.tint} />
          <View style={styles.highlightContent}>
            <ThemedText style={[styles.highlightLabel, { color: palette.muted }]}>Most Improved</ThemedText>
            <ThemedText type="defaultSemiBold">{mostImproved.skillName}</ThemedText>
            <ThemedText style={[styles.highlightValue, { color: palette.tint }]}>+{mostImproved.changePercent.toFixed(1)}%</ThemedText>
          </View>
        </View>
      </View>
    </SurfaceCard>
  );
}

export const SkillsSummary = memo(SkillsSummaryInner);

const styles = StyleSheet.create({
  card: { padding: Spacing.md, gap: Spacing.md },
  title: { ...Typography.subheading },
  emptyCard: { padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  emptyText: { ...Typography.small, textAlign: 'center', maxWidth: 240 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stat: { alignItems: 'center', gap: Spacing.xs },
  statIcon: { width: 56, height: 56, borderRadius: Radii['2xl'], alignItems: 'center', justifyContent: 'center' },
  statValue: { ...Typography.title },
  statLabel: { ...Typography.caption },
  divider: { width: 1, height: 50 },
  trends: { flex: 1, gap: Spacing.xs },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  trendValue: { ...Typography.bodySmallSemiBold },
  trendLabel: { ...Typography.caption },
  highlights: { flexDirection: 'row', gap: Spacing.sm },
  highlightCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm, borderRadius: Radii.md },
  highlightContent: { flex: 1, gap: Spacing.micro },
  highlightLabel: { ...Typography.micro },
  highlightValue: { ...Typography.caption },
});
