/**
 * ProgressDashboard — Composition root.
 * Shows overview, skills, goals, badges, and feedback sections.
 */
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Chip } from '@/components/primitives/chip';
import { Spacing, Typography } from '@/constants/theme';
import { SkillLevelGrid } from './skill-level-card';
import { FeedbackList } from './session-feedback-card';
import type { AthleteProgress } from '@/services/progress-service';
import type { Goal } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import { OverviewCard } from './progress-overview-card';
import { GoalsSection } from './progress-goals-section';
import { BadgesSection } from './progress-badges-section';

// Re-export ParentProgressSummary for backward compatibility
export { ParentProgressSummary } from './progress-parent-summary';

type ProgressDashboardProps = {
  progress: AthleteProgress;
  athleteName?: string;
  viewerRole: 'coach' | 'parent' | 'athlete';
  onViewAllSkills?: () => void;
  onViewAllFeedback?: () => void;
  onViewGoal?: (goal: Goal) => void;
  onViewBadges?: () => void;
};

export function ProgressDashboard({
  progress,
  athleteName,
  viewerRole,
  onViewAllSkills,
  onViewAllFeedback,
  onViewGoal,
  onViewBadges,
}: ProgressDashboardProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.container}>
      <OverviewCard progress={progress} viewerRole={viewerRole} />

      {/* Skills */}
      <View style={styles.section}>
        <Row justify="space-between" align="center">
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Skills
          </ThemedText>
          {onViewAllSkills && progress.skills.length > 4 && (
            <SurfaceCard style={styles.viewAllButton} onPress={onViewAllSkills} tactile>
              <ThemedText style={[styles.viewAllText, { color: palette.tint }]}>
                View All
              </ThemedText>
            </SurfaceCard>
          )}
        </Row>
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

      {/* Goals */}
      <View style={styles.section}>
        <Row justify="space-between" align="center">
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Active Goals
          </ThemedText>
          <Chip dense>{progress.activeGoals.length} active</Chip>
        </Row>
        <GoalsSection goals={progress.activeGoals} onViewGoal={onViewGoal} />
      </View>

      {/* Badges */}
      <View style={styles.section}>
        <Row justify="space-between" align="center">
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Recent Badges
          </ThemedText>
          <Chip dense>{progress.totalBadges} earned</Chip>
        </Row>
        <BadgesSection badges={progress.recentBadges} onViewAll={onViewBadges} />
      </View>

      {/* Recent Feedback */}
      <View style={styles.section}>
        <Row justify="space-between" align="center">
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Recent Feedback
          </ThemedText>
          {onViewAllFeedback && progress.recentFeedback.length > 3 && (
            <SurfaceCard style={styles.viewAllButton} onPress={onViewAllFeedback} tactile>
              <ThemedText style={[styles.viewAllText, { color: palette.tint }]}>
                View All
              </ThemedText>
            </SurfaceCard>
          )}
        </Row>
        <FeedbackList
          feedback={progress.recentFeedback.slice(0, 3)}
          compact
          emptyMessage="No feedback from coaches yet"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.lg },
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.subheading },
  viewAllButton: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs },
  viewAllText: { ...Typography.smallSemiBold },
  emptyCard: { alignItems: 'center', padding: Spacing.lg, gap: Spacing.xs },
  emptyText: { ...Typography.bodySmall },
});
