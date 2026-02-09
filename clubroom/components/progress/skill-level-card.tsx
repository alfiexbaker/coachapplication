import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { SkillLevel } from '@/services/progress-service';
import { useTheme } from '@/hooks/useTheme';
import { getSkillLevelLabel, getSkillCategory, getSkillColor, formatLastUpdated } from './skill-level-helpers';

// ─── Re-exports ─────────────────────────────────────────────────────────────

export { SKILL_CATEGORIES } from './skill-level-helpers';
export { SkillLevelGrid } from './skill-level-grid';

// ─── Types ──────────────────────────────────────────────────────────────────

type SkillLevelCardProps = {
  skill: SkillLevel;
  showHistory?: boolean;
  compact?: boolean;
  showUpdatedBy?: boolean;
};

// ─── Component ──────────────────────────────────────────────────────────────

export function SkillLevelCard({ skill, showHistory = false, compact = false, showUpdatedBy = false }: SkillLevelCardProps) {
  const { colors: palette } = useTheme();

  const getTrendIcon = () => {
    switch (skill.trend) {
      case 'improving': return { name: 'trending-up', color: palette.success };
      case 'declining': return { name: 'trending-down', color: palette.error };
      default: return { name: 'remove', color: palette.muted };
    }
  };

  const getTrendLabel = () => {
    switch (skill.trend) {
      case 'improving': return 'Improving';
      case 'declining': return 'Needs Focus';
      default: return 'Steady';
    }
  };

  const trendInfo = getTrendIcon();
  const skillColor = getSkillColor(skill.level, palette);
  const progressPercent = (skill.level / 10) * 100;
  const levelInfo = getSkillLevelLabel(skill.level);
  const category = getSkillCategory(skill.skill);
  const change = skill.previousLevel !== undefined ? skill.level - skill.previousLevel : 0;

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeader}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.compactSkillName}>{skill.skill}</ThemedText>
            <ThemedText style={[styles.compactLevelLabel, { color: skillColor }]}>{levelInfo.label}</ThemedText>
          </View>
          <View style={styles.compactRight}>
            <ThemedText type="defaultSemiBold" style={[styles.compactLevel, { color: skillColor }]}>{skill.level}</ThemedText>
            <ThemedText style={[styles.compactLevelMax, { color: palette.muted }]}>/10</ThemedText>
            <Ionicons name={trendInfo.name as keyof typeof Ionicons.glyphMap} size={14} color={trendInfo.color} />
          </View>
        </View>
        <View style={[styles.compactBar, { backgroundColor: withAlpha(skillColor, 0.12) }]}>
          <View style={[styles.compactBarFill, { width: `${progressPercent}%`, backgroundColor: skillColor }]} />
        </View>
      </View>
    );
  }

  return (
    <SurfaceCard style={styles.card}>
      {/* Category badge */}
      <View style={[styles.categoryBadge, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
        <ThemedText style={[styles.categoryText, { color: palette.tint }]}>{category}</ThemedText>
      </View>

      <View style={styles.header}>
        <View style={styles.skillInfo}>
          <ThemedText type="defaultSemiBold" style={styles.skillName}>{skill.skill}</ThemedText>
          <View style={styles.labelsRow}>
            <View style={[styles.levelLabelBadge, { backgroundColor: withAlpha(skillColor, 0.09) }]}>
              <ThemedText style={[styles.levelLabelText, { color: skillColor }]}>{levelInfo.label}</ThemedText>
            </View>
            <View style={[styles.trendBadge, { backgroundColor: withAlpha(trendInfo.color, 0.09) }]}>
              <Ionicons name={trendInfo.name as keyof typeof Ionicons.glyphMap} size={12} color={trendInfo.color} />
              <ThemedText style={[styles.trendText, { color: trendInfo.color }]}>{getTrendLabel()}</ThemedText>
            </View>
          </View>
        </View>
        <View style={styles.levelContainer}>
          <ThemedText type="heading" style={[styles.level, { color: skillColor }]}>{skill.level}</ThemedText>
          <ThemedText style={[styles.levelMax, { color: palette.muted }]}>/10</ThemedText>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressBar, { backgroundColor: withAlpha(skillColor, 0.12) }]}>
        <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: skillColor }]} />
      </View>

      {/* Change indicator */}
      {change !== 0 && (
        <View style={styles.changeRow}>
          <Ionicons name={change > 0 ? 'arrow-up' : 'arrow-down'} size={12} color={change > 0 ? palette.success : palette.error} />
          <ThemedText style={[styles.changeText, { color: change > 0 ? palette.success : palette.error }]}>
            {change > 0 ? '+' : ''}{change} from last assessment
          </ThemedText>
        </View>
      )}

      {/* Last updated info */}
      {showUpdatedBy && skill.lastUpdated && (
        <View style={[styles.updatedRow, { borderTopColor: palette.border }]}>
          <Ionicons name="time-outline" size={12} color={palette.muted} />
          <ThemedText style={[styles.updatedText, { color: palette.muted }]}>Updated {formatLastUpdated(skill.lastUpdated)}</ThemedText>
        </View>
      )}

      {/* History */}
      {showHistory && skill.history.length > 1 && (
        <View style={styles.historySection}>
          <ThemedText style={[styles.historyLabel, { color: palette.muted }]}>Recent history</ThemedText>
          <View style={styles.historyDots}>
            {skill.history.slice(-5).map((entry, index) => (
              <View
                key={index}
                style={[styles.historyDot, { backgroundColor: getSkillColor(entry.level, palette), height: 4 + entry.level * 2 }]}
              />
            ))}
          </View>
        </View>
      )}
    </SurfaceCard>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: { padding: Spacing.md, gap: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  skillInfo: { flex: 1, gap: Spacing.xs },
  skillName: { ...Typography.subheading },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.xs, paddingVertical: Spacing.micro, borderRadius: Radii.sm, alignSelf: 'flex-start' },
  trendText: { ...Typography.caption },
  levelContainer: { flexDirection: 'row', alignItems: 'baseline' },
  level: { ...Typography.display, fontVariant: ['tabular-nums'] },
  levelMax: { ...Typography.bodySmallSemiBold },
  progressBar: { height: 6, borderRadius: Radii.xs, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radii.xs },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  changeText: { ...Typography.caption },
  historySection: { gap: Spacing.xs, paddingTop: Spacing.xs },
  historyLabel: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  historyDots: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xxs, height: 24 },
  historyDot: { width: 8, borderRadius: Radii.xs },
  compactContainer: { gap: Spacing.xxs, paddingVertical: Spacing.xs },
  compactHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compactSkillName: { ...Typography.smallSemiBold },
  compactRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  compactLevel: { ...Typography.bodySmall, fontVariant: ['tabular-nums'] },
  compactBar: { height: 4, borderRadius: Radii.xs, overflow: 'hidden' },
  compactBarFill: { height: '100%', borderRadius: Radii.xs },
  compactLevelLabel: { ...Typography.micro, textTransform: 'uppercase', letterSpacing: 0.3 },
  compactLevelMax: { ...Typography.caption },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.xs, paddingVertical: Spacing.micro, borderRadius: Radii.sm, marginBottom: Spacing.xs },
  categoryText: { ...Typography.micro, textTransform: 'uppercase', letterSpacing: 0.5 },
  labelsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' },
  levelLabelBadge: { paddingHorizontal: Spacing.xs, paddingVertical: Spacing.micro, borderRadius: Radii.sm },
  levelLabelText: { ...Typography.caption },
  updatedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, paddingTop: Spacing.xs, borderTopWidth: 1, borderTopColor: 'transparent' },
  updatedText: { ...Typography.caption },
});
