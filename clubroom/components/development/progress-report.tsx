/**
 * ProgressReport Component
 *
 * A shareable, beautifully laid-out progress report card showing athlete
 * development data: sessions attended, attendance rate, skill improvements,
 * badges earned, goal progress, and a coach's note.
 */

import { useCallback } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  StatsRow,
  SkillsSection,
  BadgesSection,
  GoalsSection,
  CoachNoteSection,
  type SkillImprovement,
  type BadgeEarned,
  type GoalProgress,
} from './progress-report-sections';
import { Row } from '@/components/primitives';

// ─── Re-exports ─────────────────────────────────────────────────────────────

export type { SkillImprovement, BadgeEarned, GoalProgress };

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── Component ──────────────────────────────────────────────────────────────

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
  const { colors: palette } = useTheme();

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
        <ThemedText style={[styles.reportTitle, { color: palette.foreground }]}>Progress Report</ThemedText>
        <ThemedText style={[styles.period, { color: palette.muted }]}>{period}</ThemedText>
      </View>

      {/* Athlete info */}
      <Row style={styles.athleteRow}>
        <View style={[styles.avatarPlaceholder, { backgroundColor: palette.surfaceSecondary }]}>
          <Ionicons name="person" size={Components.icon.lg} color={palette.muted} />
        </View>
        <View style={styles.athleteInfo}>
          <ThemedText style={[styles.athleteName, { color: palette.foreground }]}>{athleteName}</ThemedText>
          <ThemedText style={[styles.athleteMeta, { color: palette.muted }]}>
            Age {athleteAge} &middot; Coach: {coachName}
          </ThemedText>
        </View>
      </Row>

      <StatsRow sessionsCount={sessionsCount} attendanceRate={attendanceRate} />

      {/* Radar chart placeholder */}
      <View style={[styles.radarPlaceholder, { backgroundColor: palette.surfaceSecondary, borderColor: palette.border }]}>
        <Ionicons name="analytics-outline" size={Components.icon.xl} color={palette.muted} />
        <ThemedText style={[styles.placeholderText, { color: palette.muted }]}>Radar chart integration</ThemedText>
      </View>

      <SkillsSection skillImprovements={skillImprovements} />
      <BadgesSection badgesEarned={badgesEarned} />
      <GoalsSection goals={goals} />
      {coachNote ? <CoachNoteSection coachNote={coachNote} /> : null}

      {/* Branding footer */}
      <View style={[styles.brandingFooter, { borderTopColor: palette.border }]}>
        <ThemedText style={[styles.brandingText, { color: palette.muted }]}>Clubroom</ThemedText>
      </View>

      {/* Action buttons */}
      <Row style={styles.actionsRow}>
        <Clickable onPress={handleShare} accessibilityLabel="Share report">
          <Row style={[styles.actionButton, { backgroundColor: palette.tint }]}>
            <Ionicons name="share-outline" size={Components.icon.md} color={palette.surface} />
            <ThemedText style={[styles.actionText, { color: palette.surface }]}>Share</ThemedText>
          </Row>
        </Clickable>
        <Clickable onPress={onDownload} accessibilityLabel="Download report">
          <Row style={[styles.actionButton, { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border }]}>
            <Ionicons name="download-outline" size={Components.icon.md} color={palette.foreground} />
            <ThemedText style={[styles.actionText, { color: palette.foreground }]}>Download</ThemedText>
          </Row>
        </Clickable>
      </Row>
    </SurfaceCard>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  header: { gap: Spacing.xs / 2 },
  reportTitle: { ...Typography.title },
  period: { ...Typography.small },
  athleteRow: { alignItems: 'center', gap: Spacing.sm },
  avatarPlaceholder: { width: Components.avatar.lg, height: Components.avatar.lg, borderRadius: Components.avatar.lg / 2, alignItems: 'center', justifyContent: 'center' },
  athleteInfo: { flex: 1, gap: Spacing.xs / 2 },
  athleteName: { ...Typography.heading },
  athleteMeta: { ...Typography.small },
  radarPlaceholder: { height: 160, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', gap: Spacing.xs },
  placeholderText: { ...Typography.caption },
  brandingFooter: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.sm, alignItems: 'center' },
  brandingText: { ...Typography.caption, letterSpacing: 1, textTransform: 'uppercase' },
  actionsRow: { gap: Spacing.sm },
  actionButton: { flex: 1, alignItems: 'center', justifyContent: 'center', height: Components.button.height, borderRadius: Radii.button, gap: Spacing.xs },
  actionText: { ...Typography.bodySemiBold },
});
