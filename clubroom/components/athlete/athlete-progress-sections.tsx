/**
 * Extracted sub-components for AthleteProgress.
 *
 * Types, mock data generators, SkillBar, GoalCard, BadgeItem.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { RosterEntry } from '@/constants/types';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ProgressTrend = 'improving' | 'steady' | 'declining';

export interface SkillSummary {
  name: string;
  level: number;
  maxLevel: number;
  trend: ProgressTrend;
}

export interface GoalSummary {
  id: string;
  title: string;
  progress: number;
  dueDate?: string;
}

export interface BadgeSummary {
  id: string;
  name: string;
  icon: string;
  awardedAt: string;
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

export function getMockSkills(athlete: RosterEntry): SkillSummary[] {
  const focusMap: Record<string, SkillSummary[]> = {
    Finishing: [
      { name: 'Shooting', level: 7, maxLevel: 10, trend: 'improving' },
      { name: 'Positioning', level: 6, maxLevel: 10, trend: 'improving' },
      { name: 'First Touch', level: 5, maxLevel: 10, trend: 'steady' },
      { name: 'Heading', level: 4, maxLevel: 10, trend: 'steady' },
    ],
    Passing: [
      { name: 'Short Passing', level: 6, maxLevel: 10, trend: 'improving' },
      { name: 'Vision', level: 5, maxLevel: 10, trend: 'steady' },
      { name: 'Through Balls', level: 4, maxLevel: 10, trend: 'improving' },
      { name: 'Crossing', level: 3, maxLevel: 10, trend: 'steady' },
    ],
    Defending: [
      { name: 'Tackling', level: 8, maxLevel: 10, trend: 'improving' },
      { name: 'Positioning', level: 7, maxLevel: 10, trend: 'steady' },
      { name: 'Heading', level: 6, maxLevel: 10, trend: 'improving' },
      { name: 'Interceptions', level: 7, maxLevel: 10, trend: 'improving' },
    ],
    Dribbling: [
      { name: 'Ball Control', level: 8, maxLevel: 10, trend: 'steady' },
      { name: 'Speed Dribble', level: 7, maxLevel: 10, trend: 'improving' },
      { name: 'Skill Moves', level: 6, maxLevel: 10, trend: 'steady' },
      { name: 'Close Control', level: 7, maxLevel: 10, trend: 'improving' },
    ],
    Goalkeeping: [
      { name: 'Shot Stopping', level: 6, maxLevel: 10, trend: 'improving' },
      { name: 'Positioning', level: 5, maxLevel: 10, trend: 'steady' },
      { name: 'Distribution', level: 4, maxLevel: 10, trend: 'improving' },
      { name: 'Commanding', level: 3, maxLevel: 10, trend: 'steady' },
    ],
    Conditioning: [
      { name: 'Speed', level: 6, maxLevel: 10, trend: 'improving' },
      { name: 'Stamina', level: 5, maxLevel: 10, trend: 'steady' },
      { name: 'Agility', level: 6, maxLevel: 10, trend: 'improving' },
      { name: 'Strength', level: 4, maxLevel: 10, trend: 'steady' },
    ],
  };
  return (athlete.primaryFocus ? focusMap[athlete.primaryFocus] : undefined) || focusMap.Finishing;
}

export function getMockGoals(athlete: RosterEntry): GoalSummary[] {
  if (athlete.totalSessions < 5) return [];
  return [
    {
      id: 'g1',
      title: `Improve ${(athlete.primaryFocus || 'skills').toLowerCase()} accuracy`,
      progress: 0.65,
      dueDate: '2026-04-01',
    },
    {
      id: 'g2',
      title: 'Complete 10 sessions this quarter',
      progress: athlete.totalSessions > 20 ? 0.8 : 0.4,
    },
  ];
}

export function getMockBadges(athlete: RosterEntry): BadgeSummary[] {
  if (athlete.totalSessions < 10) return [];
  const badges: BadgeSummary[] = [
    { id: 'b1', name: '10 Sessions', icon: 'ribbon', awardedAt: '2025-12-15' },
  ];
  if (athlete.totalSessions >= 25) {
    badges.push({ id: 'b2', name: '25 Sessions', icon: 'trophy', awardedAt: '2026-01-05' });
  }
  if (athlete.totalSessions >= 50) {
    badges.push({ id: 'b3', name: 'Half Century', icon: 'star', awardedAt: '2025-10-20' });
  }
  return badges;
}

// ─── SkillBar ───────────────────────────────────────────────────────────────

export const SkillBar = memo(function SkillBar({ skill }: { skill: SkillSummary }) {
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
});

// ─── GoalCard ───────────────────────────────────────────────────────────────

export const GoalCard = memo(function GoalCard({ goal }: { goal: GoalSummary }) {
  const { colors } = useTheme();
  const pct = Math.round(goal.progress * 100);

  return (
    <View style={[styles.goalCard, { backgroundColor: colors.surfaceSecondary }]}>
      <Row gap="sm" align="center" justify="between">
        <ThemedText type="defaultSemiBold" style={styles.flex1} numberOfLines={1}>
          {goal.title}
        </ThemedText>
        <ThemedText style={[styles.goalPct, { color: colors.tint }]}>{pct}%</ThemedText>
      </Row>
      <View style={[styles.goalTrack, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
        <View style={[styles.goalFill, { width: `${pct}%`, backgroundColor: colors.tint }]} />
      </View>
      {goal.dueDate && (
        <ThemedText style={[styles.goalDue, { color: colors.muted }]}>
          Due{' '}
          {new Date(goal.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </ThemedText>
      )}
    </View>
  );
});

// ─── BadgeItem ──────────────────────────────────────────────────────────────

export const BadgeItem = memo(function BadgeItem({ badge }: { badge: BadgeSummary }) {
  const { colors } = useTheme();

  return (
    <Row style={[styles.badgeItem, { backgroundColor: withAlpha(colors.rating, 0.09) }]}>
      <Ionicons name={badge.icon as 'ribbon'} size={20} color={colors.rating} />
      <Column gap="micro">
        <ThemedText style={styles.badgeName}>{badge.name}</ThemedText>
        <ThemedText style={[styles.badgeDate, { color: colors.muted }]}>
          {new Date(badge.awardedAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </ThemedText>
      </Column>
    </Row>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  skillName: { ...Typography.bodySmall, width: 90 },
  barTrack: { flex: 1, height: 8, borderRadius: Radii.xs, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: Radii.xs },
  skillLevel: { ...Typography.caption, width: 32, textAlign: 'right' },
  goalCard: { padding: Spacing.md, borderRadius: Radii.md, gap: Spacing.xs },
  goalPct: { ...Typography.bodySemiBold },
  goalTrack: { height: 6, borderRadius: Radii.xs, overflow: 'hidden' },
  goalFill: { height: '100%', borderRadius: Radii.xs },
  goalDue: { ...Typography.caption },
  badgeItem: { alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radii.md },
  badgeName: { ...Typography.bodySemiBold },
  badgeDate: { ...Typography.caption },
});
