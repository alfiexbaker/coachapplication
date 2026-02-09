/**
 * SkillRadar — Composition root with radar/list toggle view.
 */
import { useState, useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { SkillProgress } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import { SKILL_COLORS } from './skill-radar-helpers';
import { SkillRadarChart } from './skill-radar-chart';
import { SkillRadarList } from './skill-radar-list';

interface SkillRadarProps {
  skills: SkillProgress[];
  title?: string;
  showComparison?: boolean;
  comparisonValues?: number[];
  comparisonLabel?: string;
  showDetailedList?: boolean;
}

export function SkillRadar({
  skills, title = 'Skills Overview', showComparison = false,
  comparisonValues = [], comparisonLabel = 'Average', showDetailedList = true,
}: SkillRadarProps) {
  const { colors: palette } = useTheme();
  const [selectedSkill, setSelectedSkill] = useState<SkillProgress | null>(null);
  const [viewMode, setViewMode] = useState<'radar' | 'list'>('radar');

  const skillsByCategory = useMemo(() => {
    const grouped: Record<string, SkillProgress[]> = {};
    skills.forEach((skill) => {
      const cat = skill.category || 'General';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(skill);
    });
    return grouped;
  }, [skills]);

  if (skills.length === 0) {
    return (
      <SurfaceCard style={styles.emptyContainer}>
        <View style={[styles.emptyIconCircle, { backgroundColor: palette.surface }]}>
          <Ionicons name="analytics-outline" size={32} color={palette.muted} />
        </View>
        <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>No Skill Data</ThemedText>
        <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
          Complete training sessions to start tracking your skill progress
        </ThemedText>
      </SurfaceCard>
    );
  }

  const avgLevel = skills.reduce((sum, s) => sum + s.currentLevel, 0) / skills.length;
  const avgChange = skills.reduce((sum, s) => sum + s.changePercent, 0) / skills.length;

  return (
    <SurfaceCard style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {title && <ThemedText type="defaultSemiBold" style={styles.title}>{title}</ThemedText>}
          <View style={styles.avgBadge}>
            <ThemedText style={[styles.avgText, { color: palette.tint }]}>Avg: {Math.round(avgLevel)}</ThemedText>
            {avgChange !== 0 && (
              <View style={styles.avgTrend}>
                <Ionicons name={avgChange > 0 ? 'trending-up' : 'trending-down'} size={12} color={avgChange > 0 ? palette.success : palette.error} />
                <ThemedText style={{ ...Typography.caption, color: avgChange > 0 ? palette.success : palette.error, fontWeight: '600' }}>
                  {avgChange > 0 ? '+' : ''}{avgChange.toFixed(1)}%
                </ThemedText>
              </View>
            )}
          </View>
        </View>
        <View style={[styles.viewToggle, { backgroundColor: palette.surface }]}>
          <Pressable onPress={() => setViewMode('radar')} style={[styles.toggleButton, viewMode === 'radar' ? { backgroundColor: palette.tint } : undefined]}>
            <Ionicons name="pie-chart" size={16} color={viewMode === 'radar' ? palette.onPrimary : palette.icon} />
          </Pressable>
          <Pressable onPress={() => setViewMode('list')} style={[styles.toggleButton, viewMode === 'list' ? { backgroundColor: palette.tint } : undefined]}>
            <Ionicons name="list" size={16} color={viewMode === 'list' ? palette.onPrimary : palette.icon} />
          </Pressable>
        </View>
      </View>

      {/* Content */}
      {viewMode === 'radar' && (
        <SkillRadarChart
          skills={skills} selectedSkill={selectedSkill} onSelectSkill={setSelectedSkill}
          showComparison={showComparison} comparisonValues={comparisonValues} comparisonLabel={comparisonLabel}
        />
      )}
      {viewMode === 'list' && showDetailedList && <SkillRadarList skillsByCategory={skillsByCategory} />}

      {/* Level Legend */}
      <View style={[styles.levelLegend, { borderTopColor: palette.border }]}>
        <ThemedText style={[styles.levelLegendTitle, { color: palette.muted }]}>Skill Levels:</ThemedText>
        <View style={styles.levelLegendItems}>
          {([
            { label: 'Beginner', color: SKILL_COLORS.beginner },
            { label: 'Developing', color: SKILL_COLORS.developing },
            { label: 'Proficient', color: SKILL_COLORS.proficient },
            { label: 'Advanced', color: SKILL_COLORS.advanced },
            { label: 'Expert', color: SKILL_COLORS.expert },
          ] as const).map((item) => (
            <View key={item.label} style={styles.levelLegendItem}>
              <View style={[styles.levelLegendDot, { backgroundColor: item.color }]} />
              <ThemedText style={[styles.levelLegendLabel, { color: palette.muted }]}>{item.label}</ThemedText>
            </View>
          ))}
        </View>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.md, gap: Spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { gap: Spacing.xs },
  title: { ...Typography.subheading },
  avgBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avgText: { ...Typography.smallSemiBold },
  avgTrend: { flexDirection: 'row', alignItems: 'center', gap: Spacing.micro },
  viewToggle: { flexDirection: 'row', borderRadius: Radii.md, padding: Spacing.micro },
  toggleButton: { padding: Spacing.xs, borderRadius: Radii.sm },
  emptyContainer: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyIconCircle: { width: 64, height: 64, borderRadius: Radii['2xl'], alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { ...Typography.subheading, marginTop: Spacing.xs },
  emptyText: { ...Typography.small, textAlign: 'center', maxWidth: 240, lineHeight: 19 },
  levelLegend: { paddingTop: Spacing.sm, borderTopWidth: 1, gap: Spacing.xs },
  levelLegendTitle: { ...Typography.micro },
  levelLegendItems: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  levelLegendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  levelLegendDot: { width: 8, height: 8, borderRadius: Radii.xs },
  levelLegendLabel: { ...Typography.micro },
});
