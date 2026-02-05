/**
 * ProgressReport Component
 *
 * A shareable, beautifully laid-out progress report card showing athlete
 * development data: sessions attended, attendance rate, skill improvements,
 * badges earned, goal progress, and a coach's note.
 *
 * Supports Share (via RN Share API) and a Download placeholder.
 */

import { useCallback } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Components, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SkillImprovement {
  skill: string;
  /** positive = improvement, negative = regression */
  change: number;
}

interface BadgeEarned {
  id: string;
  name: string;
  icon: string;
}

interface GoalProgress {
  id: string;
  title: string;
  /** 0-100 */
  percent: number;
}

export interface ProgressReportProps {
  athleteName: string;
  athleteAge: number;
  coachName: string;
  /** e.g. "Jan 2026 — Feb 2026" */
  period: string;
  sessionsCount: number;
  attendanceRate: number;
  skillImprovements: SkillImprovement[];
  badgesEarned: BadgeEarned[];
  goals: GoalProgress[];
  coachNote?: string;
  onDownload?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProgressReport({
  athleteName,
  athleteAge,
  coachName,
  period,
  sessionsCount,
  attendanceRate,
  skillImprovements,
  badgesEarned,
  goals,
  coachNote,
  onDownload,
}: ProgressReportProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        title: `${athleteName} Progress Report`,
        message: `Progress Report for ${athleteName}\nPeriod: ${period}\nSessions: ${sessionsCount}\nAttendance: ${attendanceRate}%\nCoach: ${coachName}`,
      });
    } catch {
      Alert.alert('Error', 'Could not open share dialog.');
    }
  }, [athleteName, period, sessionsCount, attendanceRate, coachName]);

  return (
    <SurfaceCard style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={[styles.reportTitle, { color: palette.foreground }]}>
          Progress Report
        </ThemedText>
        <ThemedText style={[styles.period, { color: palette.muted }]}>{period}</ThemedText>
      </View>

      {/* Athlete info */}
      <View style={styles.athleteRow}>
        <View style={[styles.avatarPlaceholder, { backgroundColor: palette.surfaceSecondary }]}>
          <Ionicons name="person" size={Components.icon.lg} color={palette.muted} />
        </View>
        <View style={styles.athleteInfo}>
          <ThemedText style={[styles.athleteName, { color: palette.foreground }]}>
            {athleteName}
          </ThemedText>
          <ThemedText style={[styles.athleteMeta, { color: palette.muted }]}>
            Age {athleteAge} &middot; Coach: {coachName}
          </ThemedText>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: palette.surfaceSecondary }]}>
          <ThemedText style={[styles.statValue, { color: palette.foreground }]}>
            {sessionsCount}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Sessions</ThemedText>
        </View>
        <View style={[styles.statBox, { backgroundColor: palette.surfaceSecondary }]}>
          <ThemedText style={[styles.statValue, { color: palette.foreground }]}>
            {attendanceRate}%
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Attendance</ThemedText>
        </View>
      </View>

      {/* Radar chart placeholder */}
      <View style={[styles.radarPlaceholder, { backgroundColor: palette.surfaceSecondary, borderColor: palette.border }]}>
        <Ionicons name="analytics-outline" size={Components.icon.xl} color={palette.muted} />
        <ThemedText style={[styles.placeholderText, { color: palette.muted }]}>
          Radar chart integration
        </ThemedText>
      </View>

      {/* Key progress */}
      {skillImprovements.length > 0 && (
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: palette.foreground }]}>
            Key Progress
          </ThemedText>
          {skillImprovements.map((item) => (
            <View key={item.skill} style={styles.skillRow}>
              <ThemedText style={[styles.skillName, { color: palette.foreground }]}>
                {item.skill}
              </ThemedText>
              <View style={styles.changeIndicator}>
                <Ionicons
                  name={item.change >= 0 ? 'arrow-up' : 'arrow-down'}
                  size={Components.icon.sm}
                  color={item.change >= 0 ? palette.success : palette.error}
                />
                <ThemedText
                  style={[
                    styles.changeText,
                    { color: item.change >= 0 ? palette.success : palette.error },
                  ]}
                >
                  {Math.abs(item.change)}%
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Badges earned */}
      {badgesEarned.length > 0 && (
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: palette.foreground }]}>
            Badges Earned
          </ThemedText>
          <View style={styles.badgeList}>
            {badgesEarned.map((badge) => (
              <View
                key={badge.id}
                style={[styles.badgeChip, { backgroundColor: palette.surfaceSecondary }]}
              >
                <Ionicons
                  name={(badge.icon as keyof typeof Ionicons.glyphMap) || 'ribbon'}
                  size={Components.icon.sm}
                  color={palette.warning}
                />
                <ThemedText style={[styles.badgeText, { color: palette.foreground }]}>
                  {badge.name}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Goals */}
      {goals.length > 0 && (
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: palette.foreground }]}>
            Goals Progress
          </ThemedText>
          {goals.map((goal) => (
            <View key={goal.id} style={styles.goalRow}>
              <View style={styles.goalHeader}>
                <ThemedText style={[styles.goalTitle, { color: palette.foreground }]} numberOfLines={1}>
                  {goal.title}
                </ThemedText>
                <ThemedText style={[styles.goalPercent, { color: palette.muted }]}>
                  {goal.percent}%
                </ThemedText>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: palette.surfaceSecondary }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: palette.success,
                      width: `${Math.min(goal.percent, 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Coach's note */}
      {coachNote ? (
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: palette.foreground }]}>
            Coach's Note
          </ThemedText>
          <View style={[styles.noteBox, { backgroundColor: palette.surfaceSecondary }]}>
            <ThemedText style={[styles.noteText, { color: palette.foreground }]}>
              {coachNote}
            </ThemedText>
          </View>
        </View>
      ) : null}

      {/* Branding footer */}
      <View style={[styles.brandingFooter, { borderTopColor: palette.border }]}>
        <ThemedText style={[styles.brandingText, { color: palette.muted }]}>
          Clubroom
        </ThemedText>
      </View>

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        <Clickable onPress={handleShare} accessibilityLabel="Share report">
          <View style={[styles.actionButton, { backgroundColor: palette.tint }]}>
            <Ionicons name="share-outline" size={Components.icon.md} color={palette.surface} />
            <ThemedText style={[styles.actionText, { color: palette.surface }]}>Share</ThemedText>
          </View>
        </Clickable>
        <Clickable onPress={onDownload} accessibilityLabel="Download report">
          <View
            style={[
              styles.actionButton,
              { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
            ]}
          >
            <Ionicons name="download-outline" size={Components.icon.md} color={palette.foreground} />
            <ThemedText style={[styles.actionText, { color: palette.foreground }]}>
              Download
            </ThemedText>
          </View>
        </Clickable>
      </View>
    </SurfaceCard>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  header: {
    gap: Spacing.xs / 2,
  },
  reportTitle: {
    ...Typography.title,
  },
  period: {
    ...Typography.small,
  },
  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatarPlaceholder: {
    width: Components.avatar.lg,
    height: Components.avatar.lg,
    borderRadius: Components.avatar.lg / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  athleteInfo: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  athleteName: {
    ...Typography.heading,
  },
  athleteMeta: {
    ...Typography.small,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    gap: Spacing.xs / 2,
  },
  statValue: {
    ...Typography.title,
  },
  statLabel: {
    ...Typography.caption,
  },
  radarPlaceholder: {
    height: 160,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: Spacing.xs,
  },
  placeholderText: {
    ...Typography.caption,
  },
  section: {
    gap: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.subheading,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs / 2,
  },
  skillName: {
    ...Typography.body,
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  changeText: {
    ...Typography.bodySemiBold,
  },
  badgeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.pill,
    gap: Spacing.xs / 2,
  },
  badgeText: {
    ...Typography.small,
  },
  goalRow: {
    gap: Spacing.xs / 2,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalTitle: {
    ...Typography.body,
    flex: 1,
  },
  goalPercent: {
    ...Typography.caption,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  noteBox: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  noteText: {
    ...Typography.body,
    fontStyle: 'italic',
  },
  brandingFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
    alignItems: 'center',
  },
  brandingText: {
    ...Typography.caption,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: Components.button.height,
    borderRadius: Radii.button,
    gap: Spacing.xs,
  },
  actionText: {
    ...Typography.bodySemiBold,
  },
});
