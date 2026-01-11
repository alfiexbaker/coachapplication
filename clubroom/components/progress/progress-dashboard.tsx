import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Chip } from '@/components/primitives/chip';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SkillLevelGrid } from './skill-level-card';
import { FeedbackList } from './session-feedback-card';
import type { AthleteProgress, SkillLevel, SessionFeedback } from '@/services/progress-service';
import type { Goal } from '@/constants/types';

type ProgressDashboardProps = {
  progress: AthleteProgress;
  athleteName?: string;
  viewerRole: 'coach' | 'parent' | 'athlete';
  onViewAllSkills?: () => void;
  onViewAllFeedback?: () => void;
  onViewGoal?: (goal: Goal) => void;
  onViewBadges?: () => void;
};

function OverviewCard({
  progress,
  viewerRole,
}: {
  progress: AthleteProgress;
  viewerRole: 'coach' | 'parent' | 'athlete';
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const getTrendIcon = () => {
    switch (progress.overallTrend) {
      case 'improving':
        return { name: 'trending-up', color: palette.success, label: 'Improving' };
      case 'declining':
        return { name: 'trending-down', color: palette.error, label: 'Needs Focus' };
      default:
        return { name: 'remove', color: palette.muted, label: 'Steady' };
    }
  };

  const trend = getTrendIcon();

  return (
    <SurfaceCard style={styles.overviewCard}>
      <View style={styles.overviewHeader}>
        <View style={styles.overviewLeft}>
          <View style={[styles.levelBadge, { backgroundColor: `${palette.tint}15` }]}>
            <Ionicons name="trophy" size={16} color={palette.tint} />
            <ThemedText style={[styles.levelText, { color: palette.tint }]}>
              Level {progress.currentLevel.level}
            </ThemedText>
          </View>
          <ThemedText type="defaultSemiBold" style={styles.levelName}>
            {progress.currentLevel.name}
          </ThemedText>
        </View>
        <View style={[styles.trendBadge, { backgroundColor: `${trend.color}15` }]}>
          <Ionicons name={trend.name as any} size={14} color={trend.color} />
          <ThemedText style={[styles.trendText, { color: trend.color }]}>
            {trend.label}
          </ThemedText>
        </View>
      </View>

      {/* Progress to next level */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <ThemedText style={[styles.progressLabel, { color: palette.muted }]}>
            {progress.totalPoints} points
          </ThemedText>
          <ThemedText style={[styles.progressLabel, { color: palette.muted }]}>
            {progress.progressToNextLevel}% to next level
          </ThemedText>
        </View>
        <View style={[styles.progressBar, { backgroundColor: `${palette.tint}20` }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress.progressToNextLevel}%`, backgroundColor: palette.tint },
            ]}
          />
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <ThemedText type="heading" style={styles.statValue}>
            {progress.totalSessions}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
            Sessions
          </ThemedText>
        </View>
        <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
        <View style={styles.statItem}>
          <ThemedText type="heading" style={styles.statValue}>
            {progress.averagePerformance.toFixed(1)}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
            Avg Rating
          </ThemedText>
        </View>
        <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
        <View style={styles.statItem}>
          <ThemedText type="heading" style={styles.statValue}>
            {progress.totalBadges}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
            Badges
          </ThemedText>
        </View>
      </View>
    </SurfaceCard>
  );
}

function GoalsSection({
  goals,
  onViewGoal,
}: {
  goals: Goal[];
  onViewGoal?: (goal: Goal) => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  if (goals.length === 0) {
    return (
      <SurfaceCard style={styles.emptyCard}>
        <Ionicons name="flag-outline" size={24} color={palette.muted} />
        <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
          No active goals
        </ThemedText>
      </SurfaceCard>
    );
  }

  return (
    <View style={styles.goalsContainer}>
      {goals.slice(0, 3).map((goal) => (
        <SurfaceCard
          key={goal.id}
          style={styles.goalCard}
          onPress={onViewGoal ? () => onViewGoal(goal) : undefined}
          tactile={Boolean(onViewGoal)}
        >
          <View style={styles.goalHeader}>
            <Ionicons name="flag" size={16} color={palette.tint} />
            <ThemedText type="defaultSemiBold" style={styles.goalTitle} numberOfLines={1}>
              {goal.title}
            </ThemedText>
          </View>
          <View style={styles.goalProgress}>
            <View style={[styles.goalProgressBar, { backgroundColor: `${palette.tint}20` }]}>
              <View
                style={[
                  styles.goalProgressFill,
                  { width: `${goal.progress}%`, backgroundColor: palette.tint },
                ]}
              />
            </View>
            <ThemedText style={[styles.goalProgressText, { color: palette.muted }]}>
              {goal.progress}%
            </ThemedText>
          </View>
          {goal.targetDate && (
            <ThemedText style={[styles.goalDueDate, { color: palette.muted }]}>
              Target: {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </ThemedText>
          )}
        </SurfaceCard>
      ))}
    </View>
  );
}

function BadgesSection({
  badges,
  onViewAll,
}: {
  badges: AthleteProgress['recentBadges'];
  onViewAll?: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  if (badges.length === 0) {
    return (
      <SurfaceCard style={styles.emptyCard}>
        <Ionicons name="ribbon-outline" size={24} color={palette.muted} />
        <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
          No badges earned yet
        </ThemedText>
      </SurfaceCard>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.badgesScroll}
    >
      {badges.map((badge) => (
        <View
          key={badge.id}
          style={[styles.badgeCard, { backgroundColor: `${palette.tint}10` }]}
        >
          <Ionicons name="ribbon" size={20} color={palette.tint} />
          <ThemedText style={styles.badgeLabel} numberOfLines={1}>
            {badge.label}
          </ThemedText>
          <ThemedText style={[styles.badgeDate, { color: palette.muted }]}>
            {new Date(badge.awardedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </ThemedText>
        </View>
      ))}
      {onViewAll && badges.length >= 5 && (
        <SurfaceCard
          style={styles.viewAllCard}
          onPress={onViewAll}
          tactile
        >
          <Ionicons name="arrow-forward" size={20} color={palette.tint} />
          <ThemedText style={[styles.viewAllText, { color: palette.tint }]}>
            View All
          </ThemedText>
        </SurfaceCard>
      )}
    </ScrollView>
  );
}

export function ProgressDashboard({
  progress,
  athleteName,
  viewerRole,
  onViewAllSkills,
  onViewAllFeedback,
  onViewGoal,
  onViewBadges,
}: ProgressDashboardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={styles.container}>
      {/* Overview Card */}
      <OverviewCard progress={progress} viewerRole={viewerRole} />

      {/* Skills Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Skills
          </ThemedText>
          {onViewAllSkills && progress.skills.length > 4 && (
            <SurfaceCard style={styles.viewAllButton} onPress={onViewAllSkills} tactile>
              <ThemedText style={[styles.viewAllButtonText, { color: palette.tint }]}>
                View All
              </ThemedText>
            </SurfaceCard>
          )}
        </View>
        {progress.skills.length > 0 ? (
          <SkillLevelGrid skills={progress.skills.slice(0, 4)} compact />
        ) : (
          <SurfaceCard style={styles.emptyCard}>
            <Ionicons name="analytics-outline" size={24} color={palette.muted} />
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
              No skill ratings yet
            </ThemedText>
          </SurfaceCard>
        )}
      </View>

      {/* Goals Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Active Goals
          </ThemedText>
          <Chip dense>{progress.activeGoals.length} active</Chip>
        </View>
        <GoalsSection goals={progress.activeGoals} onViewGoal={onViewGoal} />
      </View>

      {/* Badges Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Recent Badges
          </ThemedText>
          <Chip dense>{progress.totalBadges} earned</Chip>
        </View>
        <BadgesSection badges={progress.recentBadges} onViewAll={onViewBadges} />
      </View>

      {/* Recent Feedback Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Recent Feedback
          </ThemedText>
          {onViewAllFeedback && progress.recentFeedback.length > 3 && (
            <SurfaceCard style={styles.viewAllButton} onPress={onViewAllFeedback} tactile>
              <ThemedText style={[styles.viewAllButtonText, { color: palette.tint }]}>
                View All
              </ThemedText>
            </SurfaceCard>
          )}
        </View>
        <FeedbackList
          feedback={progress.recentFeedback.slice(0, 3)}
          compact
          emptyMessage="No feedback from coaches yet"
        />
      </View>
    </View>
  );
}

// Simplified dashboard for parent view
type ParentProgressViewProps = {
  progress: AthleteProgress;
  athleteName: string;
  onViewDetails?: () => void;
};

export function ParentProgressSummary({
  progress,
  athleteName,
  onViewDetails,
}: ParentProgressViewProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const getTrendInfo = () => {
    switch (progress.overallTrend) {
      case 'improving':
        return { icon: 'trending-up', color: palette.success, label: 'Improving' };
      case 'declining':
        return { icon: 'trending-down', color: palette.error, label: 'Needs Attention' };
      default:
        return { icon: 'remove', color: palette.muted, label: 'Steady Progress' };
    }
  };

  const trend = getTrendInfo();

  return (
    <SurfaceCard
      style={styles.parentSummaryCard}
      onPress={onViewDetails}
      tactile={Boolean(onViewDetails)}
    >
      <View style={styles.parentHeader}>
        <View>
          <ThemedText type="defaultSemiBold" style={styles.parentName}>
            {athleteName}
          </ThemedText>
          <View style={[styles.trendBadge, { backgroundColor: `${trend.color}15` }]}>
            <Ionicons name={trend.icon as any} size={12} color={trend.color} />
            <ThemedText style={[styles.trendText, { color: trend.color, fontSize: 11 }]}>
              {trend.label}
            </ThemedText>
          </View>
        </View>
        <View style={[styles.levelCircle, { borderColor: palette.tint }]}>
          <ThemedText style={[styles.levelCircleText, { color: palette.tint }]}>
            L{progress.currentLevel.level}
          </ThemedText>
        </View>
      </View>

      <View style={styles.parentStats}>
        <View style={styles.parentStat}>
          <Ionicons name="calendar" size={14} color={palette.muted} />
          <ThemedText style={[styles.parentStatText, { color: palette.muted }]}>
            {progress.totalSessions} sessions
          </ThemedText>
        </View>
        <View style={styles.parentStat}>
          <Ionicons name="ribbon" size={14} color="#F59E0B" />
          <ThemedText style={[styles.parentStatText, { color: palette.muted }]}>
            {progress.totalBadges} badges
          </ThemedText>
        </View>
        <View style={styles.parentStat}>
          <Ionicons name="star" size={14} color="#F59E0B" />
          <ThemedText style={[styles.parentStatText, { color: palette.muted }]}>
            {progress.averagePerformance.toFixed(1)} avg
          </ThemedText>
        </View>
      </View>

      {/* Latest feedback preview */}
      {progress.recentFeedback.length > 0 && (
        <View style={[styles.latestFeedback, { borderTopColor: palette.border }]}>
          <ThemedText style={[styles.latestFeedbackLabel, { color: palette.muted }]}>
            Latest: {new Date(progress.recentFeedback[0].createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </ThemedText>
          <ThemedText style={styles.latestFeedbackText} numberOfLines={1}>
            {progress.recentFeedback[0].publicSummary || 'Session completed'}
          </ThemedText>
        </View>
      )}

      {onViewDetails && (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={palette.muted}
          style={styles.chevron}
        />
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  // Overview Card
  overviewCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  overviewLeft: {
    gap: 4,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
  },
  levelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  levelName: {
    fontSize: 18,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressSection: {
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  statValue: {
    fontSize: 22,
  },
  statLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  // Section
  section: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
  },
  viewAllButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  viewAllButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Goals
  goalsContainer: {
    gap: Spacing.sm,
  },
  goalCard: {
    padding: Spacing.sm,
    gap: 6,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalTitle: {
    fontSize: 14,
    flex: 1,
  },
  goalProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  goalProgressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  goalProgressText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'right',
  },
  goalDueDate: {
    fontSize: 11,
  },
  // Badges
  badgesScroll: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  badgeCard: {
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    gap: 4,
    minWidth: 80,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  badgeDate: {
    fontSize: 10,
  },
  viewAllCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    minWidth: 70,
    gap: 4,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Empty state
  emptyCard: {
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  emptyText: {
    fontSize: 14,
  },
  // Parent Summary
  parentSummaryCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
    position: 'relative',
  },
  parentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  parentName: {
    fontSize: 16,
    marginBottom: 4,
  },
  levelCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelCircleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  parentStats: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  parentStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  parentStatText: {
    fontSize: 12,
  },
  latestFeedback: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    gap: 2,
  },
  latestFeedbackLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  latestFeedbackText: {
    fontSize: 13,
  },
  chevron: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.sm,
  },
});
