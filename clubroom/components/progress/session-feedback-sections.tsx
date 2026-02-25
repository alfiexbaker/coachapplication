import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { SessionFeedback } from '@/services/progress-service';
import { useTheme } from '@/hooks/useTheme';
import { getParentSkill, SKILL_SUB_SKILLS } from '@/constants/position-skills';
import type { FootballSkill } from '@/types/progress-types';

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
      return 'Keep Going';
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
          <RatingStars rating={feedback.overallPerformance || feedback.effortRating} size={12} />
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
type SubSkillRatingEntry = { subSkill: string; parentSkill: string; rating: number };

/** Find sub-skills from skillsWorkedOn that belong to a given parent skill. */
function getSubSkillsForParent(parentSkill: string, workedOn: string[]): string[] {
  const subs = SKILL_SUB_SKILLS[parentSkill as FootballSkill];
  if (!subs || subs.length === 0) return [];
  return workedOn.filter((tag) => subs.includes(tag));
}

/** Group sub-skill ratings by parent, derive parent averages. */
function groupSubSkillsByParent(
  subSkillRatings: SubSkillRatingEntry[],
): Record<string, { avg: number; subs: SubSkillRatingEntry[] }> {
  const groups: Record<string, SubSkillRatingEntry[]> = {};
  for (const r of subSkillRatings) {
    if (!groups[r.parentSkill]) groups[r.parentSkill] = [];
    groups[r.parentSkill].push(r);
  }
  const result: Record<string, { avg: number; subs: SubSkillRatingEntry[] }> = {};
  for (const [parent, subs] of Object.entries(groups)) {
    const avg = subs.reduce((sum, s) => sum + s.rating, 0) / subs.length;
    result[parent] = { avg: Math.round(avg * 10) / 10, subs };
  }
  return result;
}

export const SkillRatingsGrid = memo(function SkillRatingsGrid({
  ratings,
  skillsWorkedOn = [],
  subSkillRatings,
}: {
  ratings: SkillRatingEntry[];
  skillsWorkedOn?: string[];
  subSkillRatings?: SubSkillRatingEntry[];
}) {
  const { colors: palette } = useTheme();

  // If sub-skill ratings exist, show grouped sub-skill display
  if (subSkillRatings && subSkillRatings.length > 0) {
    const grouped = groupSubSkillsByParent(subSkillRatings);
    return (
      <View style={styles.section}>
        <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Skill ratings</ThemedText>
        <View style={{ gap: Spacing.sm }}>
          {Object.entries(grouped).map(([parent, { avg, subs }]) => (
            <View key={parent} style={{ gap: Spacing.xxs }}>
              {/* Parent header with derived average */}
              <Row align="center" gap="xxs" style={styles.skillRatingItem}>
                <ThemedText style={[styles.skillRatingName, { fontWeight: '600' }]}>{parent}</ThemedText>
                <Row align="baseline">
                  <ThemedText
                    type="defaultSemiBold"
                    style={[styles.skillRatingNumber, { color: palette.tint }]}
                  >
                    {avg.toFixed(1)}
                  </ThemedText>
                  <ThemedText style={[styles.skillRatingMax, { color: palette.muted }]}>/5</ThemedText>
                </Row>
              </Row>
              {/* Sub-skills */}
              {subs.map((sub) => (
                <Row key={sub.subSkill} align="center" gap="xxs" style={{ paddingLeft: Spacing.sm }}>
                  <ThemedText style={[styles.skillRatingName, { color: palette.muted }]}>
                    {sub.subSkill}
                  </ThemedText>
                  <Row align="baseline">
                    <ThemedText style={[styles.skillRatingNumber, { color: palette.tint, ...Typography.small }]}>
                      {sub.rating}
                    </ThemedText>
                    <ThemedText style={[styles.skillRatingMax, { color: palette.muted }]}>/5</ThemedText>
                  </Row>
                </Row>
              ))}
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Fallback: legacy parent-only ratings
  if (ratings.length === 0) return null;

  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Skill ratings</ThemedText>
      <View style={{ gap: Spacing.xs }}>
        {ratings.slice(0, 6).map((sr, index) => {
          const subSkills = getSubSkillsForParent(sr.skill, skillsWorkedOn);
          return (
            <View key={index} style={{ gap: Spacing.micro }}>
              <Row align="center" gap="xxs" style={styles.skillRatingItem}>
                <ThemedText style={styles.skillRatingName}>{sr.skill}</ThemedText>
                <Row align="baseline">
                  <ThemedText
                    type="defaultSemiBold"
                    style={[styles.skillRatingNumber, { color: palette.tint }]}
                  >
                    {sr.rating}
                  </ThemedText>
                  <ThemedText style={[styles.skillRatingMax, { color: palette.muted }]}>/5</ThemedText>
                  {sr.previousRating !== undefined && sr.rating !== sr.previousRating && (
                    <Ionicons
                      name={sr.rating > sr.previousRating ? 'arrow-up' : 'arrow-down'}
                      size={10}
                      color={sr.rating > sr.previousRating ? palette.success : palette.muted}
                      style={{ marginLeft: Spacing.micro }}
                    />
                  )}
                </Row>
              </Row>
              {subSkills.length > 0 && (
                <Row gap="xxs" wrap style={{ paddingLeft: Spacing.xxs }}>
                  {subSkills.map((sub) => (
                    <View
                      key={sub}
                      style={[
                        styles.subSkillTag,
                        { backgroundColor: withAlpha(palette.tint, 0.08) },
                      ]}
                    >
                      <ThemedText style={[styles.subSkillTagText, { color: palette.muted }]}>
                        {sub}
                      </ThemedText>
                    </View>
                  ))}
                </Row>
              )}
            </View>
          );
        })}
      </View>
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

      {feedback.badgeAwarded && feedback.badgeAwarded.trim().length > 0 && (
        <Row
          align="center"
          gap="xs"
          wrap
          style={[styles.badgeRow, { backgroundColor: withAlpha(palette.success, 0.09) }]}
        >
          <Ionicons name="ribbon" size={16} color={palette.success} />
          {feedback.badgeAwarded
            .split(',')
            .map((label) => label.trim())
            .filter((label) => label.length > 0)
            .map((label, index) => (
              <ThemedText key={index} style={[styles.badgeText, { color: palette.success }]}>
                {index === 0 ? `Badge awarded: ${label}` : label}
              </ThemedText>
            ))}
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
  compactSummary: { ...Typography.small, lineHeight: Typography.caption.lineHeight },
  section: { gap: Spacing.xxs },
  sectionLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    fontWeight: '600',
  },
  sectionContent: { ...Typography.bodySmall },
  skillRatingItem: {},
  skillRatingName: { ...Typography.small, flex: 1 },
  skillRatingNumber: { ...Typography.body, fontVariant: ['tabular-nums'] },
  skillRatingMax: { ...Typography.caption },
  homeworkSection: { padding: Spacing.sm, borderRadius: Radii.md, marginTop: Spacing.xs },
  mediaText: { ...Typography.smallSemiBold },
  badgeRow: { padding: Spacing.sm, borderRadius: Radii.md },
  badgeText: { ...Typography.smallSemiBold },
  subSkillTag: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.xs,
  },
  subSkillTagText: { ...Typography.micro },
});
