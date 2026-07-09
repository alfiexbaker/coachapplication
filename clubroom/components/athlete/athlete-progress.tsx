/**
 * AthleteProgress — Progress tab for the athlete profile.
 *
 * Shows: skill overview, progress trend, active goals, recent badges.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionSkeleton } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { RosterEntry } from '@/constants/types';
import { apiClient } from '@/services/api-client';
import { progressService, type AthleteProgress as LiveAthleteProgress } from '@/services/progress-service';
import {
  SkillBar,
  GoalCard,
  BadgeItem,
} from './athlete-progress-sections';
import {
  type ProgressTrend,
  getMockSkills,
  getMockGoals,
  getMockBadges,
} from './athlete-progress-helpers';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AthleteProgressProps {
  athlete: RosterEntry;
  coachId: string;
}

function normalizeTrend(trend: string | undefined): ProgressTrend {
  return trend === 'improving' || trend === 'declining' ? trend : 'steady';
}

function goalProgressRatio(progress: number): number {
  return Math.max(0, Math.min(1, progress / 100));
}

// ─── Component ──────────────────────────────────────────────────────────────

function AthleteProgressInner({ athlete, coachId }: AthleteProgressProps) {
  const { colors } = useTheme();
  const [liveProgress, setLiveProgress] = useState<LiveAthleteProgress | null>(null);
  const [loadingLiveProgress, setLoadingLiveProgress] = useState(!apiClient.isMockMode);
  const [liveProgressError, setLiveProgressError] = useState<string | null>(null);

  useEffect(() => {
    if (apiClient.isMockMode) return;
    let active = true;
    setLoadingLiveProgress(true);
    setLiveProgressError(null);
    progressService
      .getAthleteProgress(athlete.athleteId, 'coach')
      .then((progress) => {
        if (!active) return;
        setLiveProgress({
          ...progress,
          athleteName: progress.athleteName || athlete.athleteName || '',
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLiveProgress(null);
        setLiveProgressError(error instanceof Error ? error.message : 'Could not load live progress.');
      })
      .finally(() => {
        if (active) setLoadingLiveProgress(false);
      });
    return () => {
      active = false;
    };
  }, [athlete.athleteId, athlete.athleteName, coachId]);

  const skills = useMemo(
    () =>
      apiClient.isMockMode
        ? getMockSkills(athlete)
        : (liveProgress?.skills ?? []).map((skill) => ({
            name: skill.skill,
            level: skill.level,
            maxLevel: 10,
            trend: normalizeTrend(skill.trend),
          })),
    [athlete, liveProgress],
  );
  const goals = useMemo(
    () =>
      apiClient.isMockMode
        ? getMockGoals(athlete)
        : (liveProgress?.activeGoals ?? []).map((goal) => ({
            id: goal.id,
            title: goal.title,
            progress: goalProgressRatio(goal.progress),
            dueDate: goal.targetDate,
          })),
    [athlete, liveProgress],
  );
  const badges = useMemo(
    () =>
      apiClient.isMockMode
        ? getMockBadges(athlete)
        : (liveProgress?.recentBadges ?? []).map((badge) => ({
            id: badge.id,
            name: badge.label,
            icon: 'ribbon',
            awardedAt: badge.awardedAt,
          })),
    [athlete, liveProgress],
  );

  if (!apiClient.isMockMode && loadingLiveProgress) {
    return <SectionSkeleton variant="card" />;
  }

  if (!apiClient.isMockMode && liveProgressError) {
    return (
      <EmptyState
        icon="warning-outline"
        title="Progress unavailable"
        message={liveProgressError}
      />
    );
  }

  const overallTrend: ProgressTrend = (() => {
    if (!apiClient.isMockMode && liveProgress) return liveProgress.overallTrend;
    const improving = skills.filter((s) => s.trend === 'improving').length;
    if (improving > skills.length / 2) return 'improving';
    const declining = skills.filter((s) => s.trend === 'declining').length;
    if (declining > skills.length / 2) return 'declining';
    return 'steady';
  })();

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

export const AthleteProgress = AthleteProgressInner;

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
