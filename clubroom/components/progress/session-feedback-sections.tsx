import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { SessionFeedback } from '@/services/progress-service';
import { useTheme } from '@/hooks/useTheme';

// ─── Helpers ────────────────────────────────────────────────────────────────

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

export function getPerformanceLabel(rating: number): string {
  switch (rating) {
    case 5:
      return 'Excellent';
    case 4:
      return 'Great';
    case 3:
      return 'Good';
    case 2:
      return 'Fair';
    default:
      return 'Needs Work';
  }
}

// ─── RatingStars ────────────────────────────────────────────────────────────

export const RatingStars = memo(function RatingStars({
  rating,
  size = 14,
}: {
  rating: number;
  size?: number;
}) {
  const { colors: palette } = useTheme();

  return (
    <Row gap="micro">
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= rating ? 'star' : 'star-outline'}
          size={size}
          color={star <= rating ? palette.rating : palette.muted}
        />
      ))}
    </Row>
  );
});

// ─── CompactFeedbackCard ────────────────────────────────────────────────────

type CompactFeedbackCardProps = {
  feedback: SessionFeedback;
  onPress?: () => void;
  showCoachName?: boolean;
};

export const CompactFeedbackCard = memo(function CompactFeedbackCard({
  feedback,
  onPress,
  showCoachName = true,
}: CompactFeedbackCardProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.compactCard} onPress={onPress} tactile={Boolean(onPress)}>
      <Row justify="space-between" align="center">
        <View style={styles.compactLeft}>
          <ThemedText type="defaultSemiBold" style={styles.compactDate}>
            {formatDate(feedback.createdAt)}
          </ThemedText>
          {showCoachName && (
            <ThemedText style={[styles.compactCoach, { color: palette.muted }]}>
              {feedback.coachName}
            </ThemedText>
          )}
        </View>
        <View style={styles.compactRight}>
          <RatingStars rating={feedback.overallPerformance} size={12} />
        </View>
      </Row>
      {feedback.publicSummary && (
        <ThemedText style={[styles.compactSummary, { color: palette.muted }]} numberOfLines={2}>
          {feedback.publicSummary}
        </ThemedText>
      )}
    </SurfaceCard>
  );
});

// ─── SkillRatingsGrid ───────────────────────────────────────────────────────

type SkillRatingEntry = { skill: string; rating: number; previousRating?: number };

export const SkillRatingsGrid = memo(function SkillRatingsGrid({
  ratings,
}: {
  ratings: SkillRatingEntry[];
}) {
  const { colors: palette } = useTheme();

  if (ratings.length === 0) return null;

  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Skill ratings</ThemedText>
      <Row gap="sm" wrap>
        {ratings.slice(0, 4).map((sr, index) => (
          <Row key={index} align="center" gap="xxs" style={styles.skillRatingItem}>
            <ThemedText style={styles.skillRatingName}>{sr.skill}</ThemedText>
            <Row align="baseline">
              <ThemedText
                type="defaultSemiBold"
                style={[styles.skillRatingNumber, { color: palette.tint }]}
              >
                {sr.rating}
              </ThemedText>
              <ThemedText style={[styles.skillRatingMax, { color: palette.muted }]}>/10</ThemedText>
              {sr.previousRating !== undefined && sr.rating !== sr.previousRating && (
                <Ionicons
                  name={sr.rating > sr.previousRating ? 'arrow-up' : 'arrow-down'}
                  size={10}
                  color={sr.rating > sr.previousRating ? palette.success : palette.error}
                  style={{ marginLeft: Spacing.micro }}
                />
              )}
            </Row>
          </Row>
        ))}
      </Row>
    </View>
  );
});

// ─── FeedbackCardDetails ────────────────────────────────────────────────────

export const FeedbackCardDetails = memo(function FeedbackCardDetails({
  feedback,
}: {
  feedback: SessionFeedback;
}) {
  const { colors: palette } = useTheme();

  return (
    <>
      {feedback.improvements && (
        <View style={styles.section}>
          <Row align="center" gap="xxs">
            <Ionicons name="trending-up" size={14} color={palette.success} />
            <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>
              Improvements noted
            </ThemedText>
          </Row>
          <ThemedText style={[styles.sectionContent, { color: palette.text }]}>
            {feedback.improvements}
          </ThemedText>
        </View>
      )}

      {feedback.homework && (
        <View
          style={[
            styles.section,
            styles.homeworkSection,
            { backgroundColor: withAlpha(palette.tint, 0.03) },
          ]}
        >
          <Row align="center" gap="xxs">
            <Ionicons name="clipboard-outline" size={14} color={palette.tint} />
            <ThemedText style={[styles.sectionLabel, { color: palette.tint }]}>Homework</ThemedText>
          </Row>
          <ThemedText style={[styles.sectionContent, { color: palette.text }]}>
            {feedback.homework}
          </ThemedText>
        </View>
      )}

      {feedback.videoClipUrls && feedback.videoClipUrls.length > 0 && (
        <Row align="center" gap="xxs">
          <Ionicons name="videocam" size={14} color={palette.tint} />
          <ThemedText style={[styles.mediaText, { color: palette.tint }]}>
            {feedback.videoClipUrls.length} video{feedback.videoClipUrls.length > 1 ? 's' : ''}{' '}
            attached
          </ThemedText>
        </Row>
      )}

      {feedback.badgeAwarded && (
        <Row
          align="center"
          gap="xs"
          style={[styles.badgeRow, { backgroundColor: withAlpha(palette.success, 0.09) }]}
        >
          <Ionicons name="ribbon" size={16} color={palette.success} />
          <ThemedText style={[styles.badgeText, { color: palette.success }]}>
            Badge awarded: {feedback.badgeAwarded}
          </ThemedText>
        </Row>
      )}
    </>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  compactCard: { padding: Spacing.sm, gap: Spacing.xxs },
  compactLeft: { gap: Spacing.micro },
  compactRight: {},
  compactDate: { ...Typography.bodySmall },
  compactCoach: { ...Typography.caption },
  compactSummary: { ...Typography.small, lineHeight: 18 },
  section: { gap: Spacing.xxs },
  sectionLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    fontWeight: '600',
  },
  sectionContent: { ...Typography.bodySmall, lineHeight: 20 },
  skillRatingItem: { minWidth: '45%' },
  skillRatingName: { ...Typography.small, flex: 1 },
  skillRatingNumber: { ...Typography.body, fontVariant: ['tabular-nums'] },
  skillRatingMax: { ...Typography.caption },
  homeworkSection: { padding: Spacing.sm, borderRadius: Radii.md, marginTop: Spacing.xs },
  mediaText: { ...Typography.smallSemiBold },
  badgeRow: { padding: Spacing.sm, borderRadius: Radii.md },
  badgeText: { ...Typography.smallSemiBold },
});
