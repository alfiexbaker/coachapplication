import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { createLogger } from '@/utils/logger';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { analyticsService, type AnalyticsPeriod } from '@/services/analytics-service';
import type { AthleteAnalytics, Goal, SkillProgress } from '@/constants/types';

const logger = createLogger('AthleteAnalyticsScreen');

// Decorative: analytics accent color for improvement/rank stats
const ANALYTICS_ACCENT_COLOR = '#7B68EE';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function StatCard({
  icon,
  label,
  value,
  suffix,
  color,
  index }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  suffix?: string;
  color: string;
  index: number;
}) {
  const { colors: palette } = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify()}
      style={[styles.statCard, { backgroundColor: palette.surface }]}
    >
      <View style={[styles.statIcon, { backgroundColor: withAlpha(color, 0.09) }]}>
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
  index }: {
  skill: SkillProgress;
  index: number;
}) {
  const { colors: palette } = useTheme();

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
                  : palette.tint },
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
  onComplete }: {
  goal: Goal;
  index: number;
  onComplete: (milestoneId: string) => void;
}) {
  const { colors: palette } = useTheme();

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
                  year: 'numeric' })}
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
                backgroundColor: goal.progress === 100 ? palette.success : palette.tint },
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
                    borderColor: milestone.isCompleted ? palette.success : palette.border },
                ]}
              >
                {milestone.isCompleted && <Ionicons name="checkmark" size={12} color={palette.onPrimary} />}
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
              { backgroundColor: goal.createdBy === 'COACH' ? withAlpha(palette.tint, 0.09) : withAlpha(palette.success, 0.09) },
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
  const { colors: palette } = useTheme();

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
                title: `${analytics.athleteName} Progress Report` });
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
              style={[styles.periodText, { color: period === p.key ? palette.onPrimary : palette.text }]}
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
            color={palette.rating}
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
            color={ANALYTICS_ACCENT_COLOR}
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
                <ThemedText type="heading" style={[styles.summaryValue, { color: ANALYTICS_ACCENT_COLOR }]}>
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
                onPress={() => router.push(Routes.analyticsAthleteGoals(athleteId))}
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
              <View style={[styles.completedBadge, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
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
                        month: 'short' })}
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
    flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md },
  headerTitle: {
    flex: 1 },
  subtitle: {
    ...Typography.small,
    marginTop: Spacing.micro },
  periodsScroll: {
    flexGrow: 0 },
  periodsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm },
  periodChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full },
  periodText: {
    ...Typography.smallSemiBold },
  content: {
    padding: Spacing.lg,
    paddingTop: 0 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md },
  statCard: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm) / 2,
    padding: Spacing.md,
    borderRadius: Radii.md,
    alignItems: 'center' },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs },
  statValue: {
    ...Typography.display },
  statSuffix: {
    ...Typography.bodySmall },
  statLabel: {
    ...Typography.caption,
    marginTop: Spacing.micro },
  summaryCard: {
    marginBottom: Spacing.lg },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around' },
  summaryItem: {
    alignItems: 'center',
    flex: 1 },
  summaryValue: {
    ...Typography.heading },
  summaryLabel: {
    ...Typography.caption,
    marginTop: Spacing.micro },
  summaryDivider: {
    width: 1,
    height: 32 },
  section: {
    marginBottom: Spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md },
  sectionMeta: {
    ...Typography.caption },
  seeAllButton: {
    paddingVertical: Spacing.xxs,
    paddingHorizontal: 8 },
  seeAllText: {
    ...Typography.smallSemiBold },
  skillsList: {
    gap: Spacing.md },
  skillItem: {
    gap: Spacing.xxs },
  skillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between' },
  skillName: {
    ...Typography.bodySmall },
  skillChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.micro },
  changeText: {
    ...Typography.caption },
  skillBarBg: {
    height: 8,
    borderRadius: Radii.xs,
    overflow: 'hidden' },
  skillBarFill: {
    height: '100%',
    borderRadius: Radii.xs },
  skillMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between' },
  skillCategory: {
    ...Typography.caption },
  skillLevel: {
    ...Typography.caption },
  goalsList: {
    gap: Spacing.md },
  goalCard: {
    padding: Spacing.md },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs },
  goalTitleSection: {
    flex: 1,
    marginRight: Spacing.sm },
  goalTitle: {
    ...Typography.body },
  goalDate: {
    ...Typography.caption,
    marginTop: Spacing.micro },
  progressCircle: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center' },
  progressText: {
    ...Typography.caption },
  goalDescription: {
    ...Typography.small,
    marginBottom: Spacing.sm },
  progressBarBg: {
    height: 6,
    borderRadius: Radii.xs,
    overflow: 'hidden',
    marginBottom: Spacing.sm },
  progressBarFill: {
    height: '100%',
    borderRadius: Radii.xs },
  milestones: {
    gap: Spacing.xs },
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xxs },
  milestoneCheck: {
    width: 20,
    height: 20,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center' },
  milestoneText: {
    ...Typography.small,
    flex: 1 },
  goalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm },
  milestoneCount: {
    ...Typography.caption },
  creatorBadge: {
    paddingHorizontal: 8,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm },
  creatorText: {
    ...Typography.micro },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: 8,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm },
  completedText: {
    ...Typography.caption },
  completedGoalCard: {
    padding: Spacing.md },
  completedGoalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md },
  completedGoalText: {
    flex: 1 },
  completedDate: {
    ...Typography.caption,
    marginTop: Spacing.micro },
  bottomSpacer: {
    height: 40 } });