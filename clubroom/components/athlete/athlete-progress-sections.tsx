/**
 * Extracted sub-components for AthleteProgress.
 *
 * SkillBar.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SkillSummary } from './athlete-progress-helpers';

export { GoalCard } from './athlete-progress-goal-card';
export { BadgeItem } from './athlete-progress-badge-item';

// ─── SkillBar ───────────────────────────────────────────────────────────────

export const SkillBar = function SkillBar({ skill }: { skill: SkillSummary }) {
  const { colors } = useTheme();
  const pct = (skill.level / skill.maxLevel) * 100;
  const trendIcon =
    skill.trend === 'improving'
      ? 'trending-up'
      : skill.trend === 'declining'
        ? 'trending-down'
        : 'remove';
  const trendColor =
    skill.trend === 'improving'
      ? colors.success
      : skill.trend === 'declining'
        ? colors.error
        : colors.muted;

  return (
    <Row gap="sm" align="center">
      <ThemedText style={[styles.skillName, { color: colors.text }]}>{skill.name}</ThemedText>
      <View style={[styles.barTrack, { backgroundColor: colors.surfaceSecondary }]}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: colors.tint }]} />
      </View>
      <ThemedText style={[styles.skillLevel, { color: colors.muted }]}>
        {skill.level}/{skill.maxLevel}
      </ThemedText>
      <Ionicons name={trendIcon as 'trending-up'} size={14} color={trendColor} />
    </Row>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  skillName: { ...Typography.bodySmall, width: 90 },
  barTrack: { flex: 1, height: 8, borderRadius: Radii.xs, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: Radii.xs },
  skillLevel: { ...Typography.caption, width: 32, textAlign: 'right' },
});
