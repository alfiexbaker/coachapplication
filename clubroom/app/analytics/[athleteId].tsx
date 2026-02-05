import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { createLogger } from '@/utils/logger';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { analyticsService, type AnalyticsPeriod } from '@/services/analytics-service';
import type { AthleteAnalytics, Goal, SkillProgress } from '@/constants/types';

const logger = createLogger('AthleteAnalyticsScreen');

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function StatCard({
  icon,
  label,
  value,
  suffix,
  color,
  index,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  suffix?: string;
  color: string;
  index: number;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify()}
      style={[styles.statCard, { backgroundColor: palette.surface }]}
    >
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <ThemedText type="heading" style={styles.statValue}>
        {value}
        {suffix && <ThemedText style={styles.statSuffix}>{suffix}</ThemedText>}
      </ThemedText>
      <ThemedText style={[styles.statLabel, { color: palette.muted }]}>{label}</ThemedText>
    </Animated.View>
  );
}

function SkillBar({
  skill,
  index,
}: {
  skill: SkillProgress;
  index: number;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const changeColor =
    skill.changePercent > 0 ? palette.success : skill.changePercent < 0 ? palette.error : palette.muted;

  return (
    <Animated.View entering={FadeInRight.delay(index * 75).springify()} style={styles.skillItem}>
      <View style={styles.skillHeader}>
        <ThemedText type="defaultSemiBold" style={styles.skillName}>
          {skill.skillName}
        </ThemedText>
        <View style={styles.skillChange}>
          {skill.changePercent !== 0 && (
            <Ionicons
              name={skill.changePercent > 0 ? 'arrow-up' : 'arrow-down'}
              size={12}
              color={changeColor}
            />
          )}
          <ThemedText style={[styles.changeText, { color: changeColor }]}>
            {skill.changePercent > 0 ? '+' : ''}
            {skill.changePercent.toFixed(1)}%
          </ThemedText>
        </View>
      </View>
      <View style={[styles.skillBarBg, { backgroundColor: palette.border }]}>
        <Animated.View
          style={[
            styles.skillBarFill,
            {
              width: `${skill.currentLevel}%`,
              backgroundColor:
                skill.currentLevel >= 70
                  ? palette.success
                  : skill.currentLevel >= 50
                  ? palette.warning
                  : palette.tint,
            },
          ]}
        />
      </View>
      <View style={styles.skillMeta}>
        <ThemedText style={[styles.skillCategory, { color: palette.muted }]}>
          {skill.category}
        </ThemedText>
        <ThemedText style={[styles.skillLevel, { color: palette.text }]}>
          {skill.currentLevel}/100
        </ThemedText>
      </View>
    </Animated.View>
  );
}

function GoalCard({
  goal,
  index,
  onComplete,
}: {
  goal: Goal;
  index: number;
  onComplete: (milestoneId: string) => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const completedMilestones = goal.milestones.filter((m) => m.isCompleted).length;
  const totalMilestones = goal.milestones.length;

  return (
    <Animated.View entering={FadeInDown.delay(index * 75).springify()}>
      <SurfaceCard style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <View style={styles.goalTitleSection}>
            <ThemedText type="defaultSemiBold" style={styles.goalTitle}>
              {goal.title}
            </ThemedText>
            {goal.targetDate && (
              <ThemedText style={[styles.goalDate, { color: palette.muted }]}>
                Target: {new Date(goal.targetDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </ThemedText>
            )}
          </View>
          <View style={[styles.progressCircle, { borderColor: palette.border }]}>
            <ThemedText style={[styles.progressText, { color: palette.tint }]}>
              {goal.progress}%
            </ThemedText>
          </View>
        </View>

        {goal.description && (
          <ThemedText style={[styles.goalDescription, { color: palette.muted }]}>
            {goal.description}
          </ThemedText>
        )}

        <View style={[styles.progressBarBg, { backgroundColor: palette.border }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${goal.progress}%`,
                backgroundColor: goal.progress === 100 ? palette.success : palette.tint,
              },
            ]}
          />
        </View>

        <View style={styles.milestones}>
          {goal.milestones.map((milestone) => (
            <Clickable
              key={milestone.id}
              onPress={() => !milestone.isCompleted && onComplete(milestone.id)}
              disabled={milestone.isCompleted}
              style={styles.milestone}
            >
              <View
                style={[
                  styles.milestoneCheck,
                  {
                    backgroundColor: milestone.isCompleted ? palette.success : palette.surface,
                    borderColor: milestone.isCompleted ? palette.success : palette.border,
                  },
                ]}
              >
                {milestone.isCompleted && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <ThemedText
                style={[
                  styles.milestoneText,
                  milestone.isCompleted && { textDecorationLine: 'line-through', color: palette.muted },
                ]}
              >
                {milestone.title}
              </ThemedText>
            </Clickable>
          ))}
        </View>

        <View style={styles.goalFooter}>
          <ThemedText style={[styles.milestoneCount, { color: palette.muted }]}>
            {completedMilestones}/{totalMilestones} milestones
          </ThemedText>
          <View
            style={[
              styles.creatorBadge,
              { backgroundColor: goal.createdBy === 'COACH' ? `${palette.tint}15` : `${palette.success}15` },
            ]}
          >
            <ThemedText
              style={[
                styles.creatorText,
                { color: goal.createdBy === 'COACH' ? palette.tint : palette.success },
              ]}
            >
              {goal.createdBy === 'COACH' ? 'Coach goal' : 'Self-set'}
            </ThemedText>
          </View>
        </View>
      </SurfaceCard>
    </Animated.View>
  );
}

export default function AthleteAnalyticsScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [analytics, setAnalytics] = useState<AthleteAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<AnalyticsPeriod>('MONTH');

  const loadAnalytics = useCallback(async () => {
    if (!athleteId) return;
    setLoading(true);
    try {
      const data = await analyticsService.getAthleteAnalytics(athleteId, period);
      setAnalytics(data);
    } catch (error) {
      logger.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [athleteId, period]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleCompleteMilestone = async (goalId: string, milestoneId: string) => {
    try {
      await analyticsService.completeMilestone(goalId, milestoneId);
      loadAnalytics();
    } catch (error) {
      logger.error('Failed to complete milestone:', error);
    }
  };

  const periods: { key: AnalyticsPeriod; label: string }[] = [
    { key: 'WEEK', label: 'Week' },
    { key: 'MONTH', label: 'Month' },
    { key: 'QUARTER', label: '3 Months' },
    { key: 'YEAR', label: 'Year' },
  ];

  if (loading || !analytics) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title">Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerTitle}>
          <ThemedText type="title">{analytics.athleteName}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>Progress Analytics</ThemedText>
        </View>
        <Clickable
          onPress={async () => {
            try {
              await Share.share({
                message: `Check out ${analytics.athleteName}'s progress! ${analytics.totalSessions} sessions completed with an average rating of ${analytics.averageSessionRating.toFixed(1)}/5.`,
                title: `${analytics.athleteName} Progress Report`,
              });
            } catch {
              Alert.alert('Error', 'Failed to share progress report.');
            }
          }}
          hitSlop={8}>
          <Ionicons name="share-outline" size={22} color={palette.text} />
        </Clickable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.periodsContainer}
        style={styles.periodsScroll}
      >
        {periods.map((p) => (
          <Clickable
            key={p.key}
            onPress={() => setPeriod(p.key)}
            style={[
              styles.periodChip,
              { backgroundColor: period === p.key ? palette.tint : palette.surface },
            ]}
          >
            <ThemedText
              style={[styles.periodText, { color: period === p.key ? '#fff' : palette.text }]}
            >
              {p.label}
            </ThemedText>
          </Clickable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="fitness-outline"
            label="Sessions"
            value={analytics.sessionsThisPeriod}
            color={palette.tint}
            index={0}
          />
          <StatCard
            icon="star-outline"
            label="Avg Rating"
            value={analytics.averageSessionRating.toFixed(1)}
            suffix="/5"
            color="#FFB800"
            index={1}
          />
          <StatCard
            icon="calendar-outline"
            label="Attendance"
            value={analytics.attendanceRate}
            suffix="%"
            color={palette.success}
            index={2}
          />
          <StatCard
            icon="trending-up-outline"
            label="Improvement"
            value={`+${analytics.improvementRate.toFixed(1)}`}
            suffix="%"
            color="#7B68EE"
            index={3}
          />
        </View>

        {/* Performance Summary */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <SurfaceCard style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <ThemedText type="heading" style={[styles.summaryValue, { color: palette.tint }]}>
                  {analytics.totalSessions}
                </ThemedText>
                <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
                  Total sessions
                </ThemedText>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />
              <View style={styles.summaryItem}>
                <ThemedText type="heading" style={[styles.summaryValue, { color: palette.success }]}>
                  {analytics.consistencyScore}%
                </ThemedText>
                <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
                  Consistency
                </ThemedText>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />
              <View style={styles.summaryItem}>
                <ThemedText type="heading" style={[styles.summaryValue, { color: '#7B68EE' }]}>
                  Top {100 - analytics.percentileRank}%
                </ThemedText>
                <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
                  Rank
                </ThemedText>
              </View>
            </View>
          </SurfaceCard>
        </Animated.View>

        {/* Skills Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle">Skills Progress</ThemedText>
            <ThemedText style={[styles.sectionMeta, { color: palette.muted }]}>
              {analytics.skills.length} tracked
            </ThemedText>
          </View>
          <View style={styles.skillsList}>
            {analytics.skills.map((skill, index) => (
              <SkillBar key={skill.skillName} skill={skill} index={index} />
            ))}
          </View>
        </View>

        {/* Active Goals */}
        {analytics.activeGoals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle">Active Goals</ThemedText>
              <Clickable
                onPress={() => router.push(`/analytics/${athleteId}/goals`)}
                style={styles.seeAllButton}
              >
                <ThemedText style={[styles.seeAllText, { color: palette.tint }]}>See all</ThemedText>
              </Clickable>
            </View>
            <View style={styles.goalsList}>
              {analytics.activeGoals.slice(0, 2).map((goal, index) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  index={index}
                  onComplete={(milestoneId) => handleCompleteMilestone(goal.id, milestoneId)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Completed Goals */}
        {analytics.completedGoals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle">Completed Goals</ThemedText>
              <View style={[styles.completedBadge, { backgroundColor: `${palette.success}15` }]}>
                <Ionicons name="checkmark-circle" size={14} color={palette.success} />
                <ThemedText style={[styles.completedText, { color: palette.success }]}>
                  {analytics.completedGoals.length}
                </ThemedText>
              </View>
            </View>
            {analytics.completedGoals.slice(0, 1).map((goal, index) => (
              <SurfaceCard key={goal.id} style={styles.completedGoalCard}>
                <View style={styles.completedGoalContent}>
                  <Ionicons name="trophy" size={20} color={palette.success} />
                  <View style={styles.completedGoalText}>
                    <ThemedText type="defaultSemiBold">{goal.title}</ThemedText>
                    <ThemedText style={[styles.completedDate, { color: palette.muted }]}>
                      Completed {new Date(goal.updatedAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </ThemedText>
                  </View>
                </View>
              </SurfaceCard>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  headerTitle: {
    flex: 1,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  periodsScroll: {
    flexGrow: 0,
  },
  periodsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  periodChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm) / 2,
    padding: Spacing.md,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: 24,
  },
  statSuffix: {
    fontSize: 14,
    fontWeight: '400',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  summaryCard: {
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 18,
  },
  summaryLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 32,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionMeta: {
    fontSize: 12,
  },
  seeAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  skillsList: {
    gap: Spacing.md,
  },
  skillItem: {
    gap: 4,
  },
  skillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skillName: {
    fontSize: 14,
  },
  skillChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  skillBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  skillBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  skillMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skillCategory: {
    fontSize: 11,
  },
  skillLevel: {
    fontSize: 11,
    fontWeight: '600',
  },
  goalsList: {
    gap: Spacing.md,
  },
  goalCard: {
    padding: Spacing.md,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  goalTitleSection: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  goalTitle: {
    fontSize: 15,
  },
  goalDate: {
    fontSize: 12,
    marginTop: 2,
  },
  progressCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
  },
  goalDescription: {
    fontSize: 13,
    marginBottom: Spacing.sm,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  milestones: {
    gap: Spacing.xs,
  },
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  milestoneCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneText: {
    fontSize: 13,
    flex: 1,
  },
  goalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  milestoneCount: {
    fontSize: 12,
  },
  creatorBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  creatorText: {
    fontSize: 10,
    fontWeight: '600',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  completedGoalCard: {
    padding: Spacing.md,
  },
  completedGoalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  completedGoalText: {
    flex: 1,
  },
  completedDate: {
    fontSize: 12,
    marginTop: 2,
  },
  bottomSpacer: {
    height: 40,
  },
});
