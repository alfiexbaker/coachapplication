/**
 * ChallengeCard Component
 *
 * Displays a video challenge with demo placeholder, title, description,
 * deadline, progress indicator, leaderboard of completions, and a CTA
 * to submit an attempt.
 */

import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import type { Challenge, ChallengeSubmission } from '@/services/challenge-service';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChallengeCardProps {
  /** The challenge to render */
  challenge: Challenge;
  /** Submissions for the leaderboard */
  submissions: ChallengeSubmission[];
  /** Total athletes in the squad */
  totalAthletes: number;
  /** Called when the user taps Submit My Attempt */
  onSubmitAttempt?: () => void;
  /** Called when the user taps the video demo placeholder */
  onPlayDemo?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDeadline(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function isExpired(deadline: string): boolean {
  return new Date(deadline) < new Date();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChallengeCard({
  challenge,
  submissions,
  totalAthletes,
  onSubmitAttempt,
  onPlayDemo,
}: ChallengeCardProps) {
  const { colors: palette } = useTheme();
  const expired = isExpired(challenge.deadline);
  const completedCount = submissions.length;

  return (
    <SurfaceCard style={styles.card}>
      {/* Video demo placeholder */}
      <Clickable onPress={onPlayDemo} accessibilityLabel="Play demo video">
        <View style={[styles.videoPlaceholder, { backgroundColor: palette.surfaceSecondary }]}>
          <View style={[styles.playCircle, { backgroundColor: palette.overlay }]}>
            <Ionicons name="play" size={Components.icon.xl} color={palette.foreground} />
          </View>
          <ThemedText style={[styles.videoLabel, { color: palette.muted }]}>Demo Video</ThemedText>
        </View>
      </Clickable>

      {/* Title + description */}
      <ThemedText style={[styles.title, { color: palette.foreground }]}>
        {challenge.title}
      </ThemedText>

      <ThemedText style={[styles.description, { color: palette.muted }]} numberOfLines={3}>
        {challenge.description}
      </ThemedText>

      {/* Deadline */}
      <Row style={styles.metaRow}>
        <Ionicons name="calendar-outline" size={Components.icon.sm} color={palette.muted} />
        <ThemedText style={[styles.metaText, { color: expired ? palette.error : palette.muted }]}>
          {expired ? 'Ended' : `Due ${formatDeadline(challenge.deadline)}`}
        </ThemedText>
      </Row>

      {/* Progress */}
      <Row style={styles.metaRow}>
        <Ionicons name="people-outline" size={Components.icon.sm} color={palette.muted} />
        <ThemedText style={[styles.metaText, { color: palette.muted }]}>
          {completedCount} of {totalAthletes} completed
        </ThemedText>
      </Row>

      {/* Submit CTA */}
      {!expired && (
        <Clickable onPress={onSubmitAttempt} accessibilityLabel="Submit My Attempt">
          <Row style={[styles.ctaButton, { backgroundColor: palette.tint }]}>
            <Ionicons name="videocam-outline" size={Components.icon.md} color={palette.surface} />
            <ThemedText style={[styles.ctaText, { color: palette.surface }]}>
              Submit My Attempt
            </ThemedText>
          </Row>
        </Clickable>
      )}

      {/* Leaderboard */}
      {submissions.length > 0 && (
        <View style={styles.leaderboardSection}>
          <Divider spacing={Spacing.xs} />
          <ThemedText style={[styles.leaderboardTitle, { color: palette.foreground }]}>
            Completions
          </ThemedText>

          {submissions.slice(0, 10).map((sub, index) => (
            <Row key={sub.id} style={styles.leaderboardRow}>
              <View style={[styles.rankCircle, { backgroundColor: palette.surfaceSecondary }]}>
                <ThemedText style={[styles.rankText, { color: palette.foreground }]}>
                  {index + 1}
                </ThemedText>
              </View>
              <ThemedText
                style={[styles.leaderName, { color: palette.foreground }]}
                numberOfLines={1}
              >
                {sub.athleteName}
              </ThemedText>
              {sub.awardedBadge && (
                <Ionicons name="trophy" size={Components.icon.sm} color={palette.warning} />
              )}
            </Row>
          ))}
        </View>
      )}
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
  videoPlaceholder: {
    width: '100%',
    height: 180,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  playCircle: {
    width: 56,
    height: 56,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoLabel: {
    ...Typography.caption,
  },
  title: {
    ...Typography.heading,
  },
  description: {
    ...Typography.body,
  },
  metaRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    ...Typography.small,
  },
  ctaButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: Components.button.height,
    borderRadius: Radii.button,
    gap: Spacing.xs,
  },
  ctaText: {
    ...Typography.bodySemiBold,
  },
  leaderboardSection: {
    gap: Spacing.xs,
  },
  leaderboardTitle: {
    ...Typography.subheading,
  },
  leaderboardRow: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
  },
  rankCircle: {
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    ...Typography.caption,
  },
  leaderName: {
    ...Typography.body,
    flex: 1,
  },
});
