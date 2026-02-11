/**
 * AthleteProgress — Progress tab for the athlete profile.
 *
 * Shows: skill overview, progress trend, active goals, recent badges.
 */

import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { EmptyState } from '@/components/ui/empty-state';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { RosterEntry } from '@/constants/types';
import {
  type ProgressTrend,
  getMockSkills,
  getMockGoals,
  getMockBadges,
  SkillBar,
  GoalCard,
  BadgeItem,
} from './athlete-progress-sections';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AthleteProgressProps {
  athlete: RosterEntry;
  coachId: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

function AthleteProgressInner({ athlete, coachId }: AthleteProgressProps) {
  const { colors } = useTheme();
  const skills = useMemo(() => getMockSkills(athlete), [athlete]);
  const goals = useMemo(() => getMockGoals(athlete), [athlete]);
  const badges = useMemo(() => getMockBadges(athlete), [athlete]);

  const overallTrend: ProgressTrend = useMemo(() => {
    const improving = skills.filter((s) => s.trend === 'improving').length;
    if (improving > skills.length / 2) return 'improving';
    const declining = skills.filter((s) => s.trend === 'declining').length;
    if (declining > skills.length / 2) return 'declining';
    return 'steady';
  }, [skills]);

  const trendConfig = {
    improving: { icon: 'trending-up', color: colors.success, label: 'Improving' },
    steady: { icon: 'remove', color: colors.muted, label: 'Steady' },
    declining: { icon: 'trending-down', color: colors.error, label: 'Needs Focus' },
  } as const;

  const trend = trendConfig[overallTrend];

  return (
    <Column gap="md" style={styles.container}>
      {/* Trend + Focus */}
      <Animated.View entering={FadeInDown.springify()}>
        <SurfaceCard style={styles.section}>
          <Row gap="sm" align="center" justify="between">
            <Column gap="xxs">
              <ThemedText type="defaultSemiBold">Progress Trend</ThemedText>
              <ThemedText style={[styles.focusLabel, { color: colors.muted }]}>
                Focus: {athlete.primaryFocus || 'General'}
              </ThemedText>
            </Column>
            <Row
              gap="xxs"
              align="center"
              style={[styles.trendBadge, { backgroundColor: withAlpha(trend.color, 0.09) }]}
            >
              <Ionicons name={trend.icon} size={16} color={trend.color} />
              <ThemedText style={[styles.trendText, { color: trend.color }]}>
                {trend.label}
              </ThemedText>
            </Row>
          </Row>
        </SurfaceCard>
      </Animated.View>

      {/* Skill Bars */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold">Skills</ThemedText>
          <Column gap="sm">
            {skills.map((skill) => (
              <SkillBar key={skill.name} skill={skill} />
            ))}
          </Column>
        </SurfaceCard>
      </Animated.View>

      {/* Goals */}
      {goals.length > 0 && (
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <SurfaceCard style={styles.section}>
            <Row gap="sm" align="center" justify="between">
              <ThemedText type="defaultSemiBold">Goals</ThemedText>
              <Clickable
                onPress={() => router.push(Routes.GOALS_CREATE)}
                accessibilityLabel="Create goal"
              >
                <Ionicons name="add-circle" size={22} color={colors.tint} />
              </Clickable>
            </Row>
            <Column gap="sm">
              {goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </Column>
          </SurfaceCard>
        </Animated.View>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <SurfaceCard style={styles.section}>
            <ThemedText type="defaultSemiBold">Badges Earned</ThemedText>
            <Column gap="sm">
              {badges.map((badge) => (
                <BadgeItem key={badge.id} badge={badge} />
              ))}
            </Column>
          </SurfaceCard>
        </Animated.View>
      )}

      {goals.length === 0 && badges.length === 0 && (
        <EmptyState
          icon="trophy-outline"
          title="No goals or badges yet"
          message="Set goals and award badges to track this athlete's development journey"
        />
      )}
    </Column>
  );
}

export const AthleteProgress = React.memo(AthleteProgressInner);

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { paddingBottom: Spacing.xl },
  section: { gap: Spacing.sm },
  focusLabel: { ...Typography.bodySmall },
  trendBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  trendText: { ...Typography.smallSemiBold },
});
