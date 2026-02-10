import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SkillImprovement {
  skill: string;
  /** positive = improvement, negative = regression */
  change: number;
}

export interface BadgeEarned {
  id: string;
  name: string;
  icon: string;
}

export interface GoalProgress {
  id: string;
  title: string;
  /** 0-100 */
  percent: number;
}

// ─── Stats Row ───────────────────────────────────────────────────────────────

type StatsRowProps = {
  sessionsCount: number;
  attendanceRate: number;
};

export const StatsRow = memo(function StatsRow({ sessionsCount, attendanceRate }: StatsRowProps) {
  const { colors: palette } = useTheme();

  return (
    <Row style={styles.statsRow}>
      <View style={[styles.statBox, { backgroundColor: palette.surfaceSecondary }]}>
        <ThemedText style={[styles.statValue, { color: palette.foreground }]}>{sessionsCount}</ThemedText>
        <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Sessions</ThemedText>
      </View>
      <View style={[styles.statBox, { backgroundColor: palette.surfaceSecondary }]}>
        <ThemedText style={[styles.statValue, { color: palette.foreground }]}>{attendanceRate}%</ThemedText>
        <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Attendance</ThemedText>
      </View>
    </Row>
  );
});

// ─── Skills Section ──────────────────────────────────────────────────────────

type SkillsSectionProps = {
  skillImprovements: SkillImprovement[];
};

export const SkillsSection = memo(function SkillsSection({ skillImprovements }: SkillsSectionProps) {
  const { colors: palette } = useTheme();

  if (skillImprovements.length === 0) return null;

  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionTitle, { color: palette.foreground }]}>Key Progress</ThemedText>
      {skillImprovements.map((item) => (
        <Row key={item.skill} style={styles.skillRow}>
          <ThemedText style={[styles.skillName, { color: palette.foreground }]}>{item.skill}</ThemedText>
          <Row style={styles.changeIndicator}>
            <Ionicons
              name={item.change >= 0 ? 'arrow-up' : 'arrow-down'}
              size={Components.icon.sm}
              color={item.change >= 0 ? palette.success : palette.error}
            />
            <ThemedText style={[styles.changeText, { color: item.change >= 0 ? palette.success : palette.error }]}>
              {Math.abs(item.change)}%
            </ThemedText>
          </Row>
        </Row>
      ))}
    </View>
  );
});

// ─── Badges Section ──────────────────────────────────────────────────────────

type BadgesSectionProps = {
  badgesEarned: BadgeEarned[];
};

export const BadgesSection = memo(function BadgesSection({ badgesEarned }: BadgesSectionProps) {
  const { colors: palette } = useTheme();

  if (badgesEarned.length === 0) return null;

  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionTitle, { color: palette.foreground }]}>Badges Earned</ThemedText>
      <Row style={styles.badgeList}>
        {badgesEarned.map((badge) => (
          <Row key={badge.id} style={[styles.badgeChip, { backgroundColor: palette.surfaceSecondary }]}>
            <Ionicons
              name={(badge.icon as keyof typeof Ionicons.glyphMap) || 'ribbon'}
              size={Components.icon.sm}
              color={palette.warning}
            />
            <ThemedText style={[styles.badgeText, { color: palette.foreground }]}>{badge.name}</ThemedText>
          </Row>
        ))}
      </Row>
    </View>
  );
});

// ─── Goals Section ───────────────────────────────────────────────────────────

type GoalsSectionProps = {
  goals: GoalProgress[];
};

export const GoalsSection = memo(function GoalsSection({ goals }: GoalsSectionProps) {
  const { colors: palette } = useTheme();

  if (goals.length === 0) return null;

  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionTitle, { color: palette.foreground }]}>Goals Progress</ThemedText>
      {goals.map((goal) => (
        <View key={goal.id} style={styles.goalRow}>
          <Row style={styles.goalHeader}>
            <ThemedText style={[styles.goalTitle, { color: palette.foreground }]} numberOfLines={1}>
              {goal.title}
            </ThemedText>
            <ThemedText style={[styles.goalPercent, { color: palette.muted }]}>{goal.percent}%</ThemedText>
          </Row>
          <View style={[styles.progressTrack, { backgroundColor: palette.surfaceSecondary }]}>
            <View style={[styles.progressFill, { backgroundColor: palette.success, width: `${Math.min(goal.percent, 100)}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
});

// ─── Coach Note Section ──────────────────────────────────────────────────────

type CoachNoteSectionProps = {
  coachNote: string;
};

export const CoachNoteSection = memo(function CoachNoteSection({ coachNote }: CoachNoteSectionProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionTitle, { color: palette.foreground }]}>Coach&apos;s Note</ThemedText>
      <View style={[styles.noteBox, { backgroundColor: palette.surfaceSecondary }]}>
        <ThemedText style={[styles.noteText, { color: palette.foreground }]}>{coachNote}</ThemedText>
      </View>
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  statsRow: { gap: Spacing.sm },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: Radii.md, gap: Spacing.xs / 2 },
  statValue: { ...Typography.title },
  statLabel: { ...Typography.caption },
  section: { gap: Spacing.xs },
  sectionTitle: { ...Typography.subheading },
  skillRow: { alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.xs / 2 },
  skillName: { ...Typography.body },
  changeIndicator: { alignItems: 'center', gap: Spacing.xs / 2 },
  changeText: { ...Typography.bodySemiBold },
  badgeList: { flexWrap: 'wrap', gap: Spacing.xs },
  badgeChip: { alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs / 2, borderRadius: Radii.pill, gap: Spacing.xs / 2 },
  badgeText: { ...Typography.small },
  goalRow: { gap: Spacing.xs / 2 },
  goalHeader: { justifyContent: 'space-between', alignItems: 'center' },
  goalTitle: { ...Typography.body, flex: 1 },
  goalPercent: { ...Typography.caption },
  progressTrack: { height: 6, borderRadius: Radii.xs, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: Radii.xs },
  noteBox: { padding: Spacing.sm, borderRadius: Radii.md },
  noteText: { ...Typography.body, fontStyle: 'italic' },
});
