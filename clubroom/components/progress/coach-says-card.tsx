import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  FadeInDown,
  FadeOutUp,
} from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SessionFeedback } from '@/services/progress-service';
import type { FootballSkill, ParentSkillGroup, PhotoAsset, VideoAsset } from '@/types/progress-types';
import type { CoachBadgeData } from './coach-badge';
import { CoachBadge } from './coach-badge';
import { CornerDotsCompact } from './corner-dots-compact';
import { MediaStrip } from './media-strip';
import { CORNER_COLORS } from '@/constants/four-corner-mapping';
import { POSITION_LABELS, getParentGroup, mapSkillToCorner } from '@/constants/position-skills';
import { getSkillLabel } from './skill-level-helpers';

interface HomeworkData {
  homework: string;
  coachName: string;
  setAt: string;
  completed: boolean;
  completedAt?: string;
  proofUri?: string;
  proofType?: 'photo' | 'video';
  isSubmittingProof?: boolean;
  onAddPhotoProof?: () => void;
  onAddVideoProof?: () => void;
}

interface CoachSaysCardProps {
  feedback: SessionFeedback | null;
  coachBadge?: CoachBadgeData | null;
  media?: { photos: PhotoAsset[]; video: VideoAsset | null } | null;
  homework?: HomeworkData | null;
  focusNarrative?: string | null;
  onViewAll?: () => void;
  onOpenMediaGallery?: () => void;
  onAskCoachAboutThis?: () => void;
}

function formatDate(dateString: string): string {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) {
    return 'Recently';
  }
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function toFivePointDots(value: number): number {
  if (value <= 0) {
    return 0;
  }
  if (value <= 5) {
    return Math.max(1, Math.min(5, Math.round(value)));
  }
  return Math.max(1, Math.min(5, Math.round(value / 2)));
}

export const CoachSaysCard = memo(function CoachSaysCard({
  feedback,
  coachBadge,
  media,
  homework,
  focusNarrative,
  onViewAll,
  onOpenMediaGallery,
  onAskCoachAboutThis,
}: CoachSaysCardProps) {
  const { colors } = useTheme();
  const quoteOpacity = useSharedValue(0);
  const quoteLift = useSharedValue(10);
  const coachOpacity = useSharedValue(0);
  const [homeworkExpanded, setHomeworkExpanded] = useState(false);

  useEffect(() => {
    if (!feedback) {
      return;
    }
    quoteOpacity.value = 0;
    quoteLift.value = 10;
    coachOpacity.value = 0;
    quoteOpacity.value = withTiming(1, { duration: 220 });
    quoteLift.value = withTiming(0, { duration: 220 });
    coachOpacity.value = withDelay(120, withTiming(1, { duration: 200 }));
  }, [coachOpacity, feedback?.id, quoteLift, quoteOpacity]);

  const quoteStyle = useAnimatedStyle(() => ({
    opacity: quoteOpacity.value,
    transform: [{ translateY: quoteLift.value }],
  }));

  const coachMetaStyle = useAnimatedStyle(() => ({
    opacity: coachOpacity.value,
  }));

  const toggleHomework = useCallback(() => {
    setHomeworkExpanded((prev) => !prev);
  }, []);
  const trimmedImprovements = feedback?.improvements?.trim() ?? '';
  const trimmedTemplate = feedback?.sessionTemplateName?.trim() ?? '';
  const trimmedSessionTitle = feedback?.sessionTitle?.trim() ?? '';
  const trimmedBadgeAward = feedback?.badgeAwarded?.trim() ?? '';
  const sessionContextLabel = trimmedTemplate || trimmedSessionTitle;
  const sessionBadges = useMemo(
    () =>
      trimmedBadgeAward
        .split(',')
        .map((label) => label.trim())
        .filter((label) => label.length > 0),
    [trimmedBadgeAward],
  );
  const skillRatings = useMemo(
    () => (feedback?.skillRatings ?? []).filter((entry) => entry.skill.trim().length > 0),
    [feedback?.skillRatings],
  );
  const groupedSkillRatings = useMemo(() => {
    const next: Partial<Record<ParentSkillGroup, typeof skillRatings>> = {};
    for (const entry of skillRatings) {
      const group = getParentGroup(entry.skill as FootballSkill);
      next[group] = [...(next[group] ?? []), entry];
    }
    return next;
  }, [skillRatings]);
  const skillRatingInsights = useMemo(() => {
    let improving = 0;
    let topSkill: { label: string; dots: number } | null = null;

    for (const entry of skillRatings) {
      const dots = toFivePointDots(entry.rating);
      const previousDots =
        typeof entry.previousRating === 'number' ? toFivePointDots(entry.previousRating) : undefined;
      if (typeof previousDots === 'number' && dots > previousDots) {
        improving += 1;
      }
      if (!topSkill || dots > topSkill.dots) {
        topSkill = { label: entry.skill, dots };
      }
    }

    return { improving, topSkill };
  }, [skillRatings]);

  if (!feedback) {
    return (
      <SurfaceCard style={styles.card}>
        <Column gap="sm">
          <ThemedText style={styles.title}>Coach Feedback</ThemedText>
          <ThemedText style={[styles.emptyTitle, { color: colors.muted }]}>No feedback yet</ThemedText>
          <ThemedText style={[styles.emptyBody, { color: colors.muted }]}>
            After the next session, your coach will share notes and skill ratings here.
          </ThemedText>
        </Column>
      </SurfaceCard>
    );
  }

  const hasHomework = homework && homework.homework.trim().length > 0;
  const skillGroupOrder: ParentSkillGroup[] = [
    'Character',
    'Ball Skills',
    'Attacking',
    'Defending',
    'Game Sense',
  ];

  return (
    <SurfaceCard style={styles.card}>
      <Column gap="sm">
        <ThemedText style={styles.title}>Coach feedback</ThemedText>

        {media && (media.photos.length > 0 || media.video) ? (
          <MediaStrip
            photos={media.photos}
            video={media.video}
            onPressOverflow={onOpenMediaGallery}
          />
        ) : null}

        <Animated.View style={quoteStyle}>
          <View
            style={[
              styles.quotePanel,
              {
                borderColor: withAlpha(colors.border, 0.72),
                backgroundColor: withAlpha(colors.background, 0.56),
              },
            ]}
          >
            <View style={[styles.quoteAccent, { backgroundColor: withAlpha(colors.tint, 0.62) }]} />
            <ThemedText style={styles.quote}>
              {feedback.publicSummary}
            </ThemedText>
          </View>
        </Animated.View>

        <Animated.View style={coachMetaStyle}>
          <Row align="center" gap="xs">
            <Row
              align="center"
              justify="center"
              style={[styles.avatarCircle, { backgroundColor: withAlpha(colors.tint, 0.1) }]}
            >
              <Ionicons name="person" size={14} color={colors.tint} />
            </Row>
            <Column gap="xxs" style={styles.coachMeta}>
              <ThemedText style={styles.coachName}>{feedback.coachName}</ThemedText>
              <ThemedText style={[styles.coachSub, { color: colors.muted }]}>
                {formatDate(feedback.createdAt)}
              </ThemedText>
              {coachBadge ? <CoachBadge coach={coachBadge} /> : null}
            </Column>
          </Row>
        </Animated.View>

        {(feedback.overallPerformance > 0 || feedback.effortRating > 0 || skillRatings.length > 0) ? (
          <Row wrap gap="xxs">
            {feedback.overallPerformance > 0 ? (
              <View
                style={[
                  styles.quickStatPill,
                  {
                    borderColor: withAlpha(colors.border, 0.7),
                    backgroundColor: withAlpha(colors.background, 0.56),
                  },
                ]}
              >
                <ThemedText style={[styles.quickStatLabel, { color: colors.muted }]}>Performance</ThemedText>
                <ThemedText style={styles.quickStatValue}>{feedback.overallPerformance}/5</ThemedText>
              </View>
            ) : null}
            {feedback.effortRating > 0 ? (
              <View
                style={[
                  styles.quickStatPill,
                  {
                    borderColor: withAlpha(colors.border, 0.7),
                    backgroundColor: withAlpha(colors.background, 0.56),
                  },
                ]}
              >
                <ThemedText style={[styles.quickStatLabel, { color: colors.muted }]}>Effort</ThemedText>
                <ThemedText style={styles.quickStatValue}>{feedback.effortRating}/5</ThemedText>
              </View>
            ) : null}
            {skillRatings.length > 0 ? (
              <View
                style={[
                  styles.quickStatPill,
                  {
                    borderColor: withAlpha(colors.border, 0.7),
                    backgroundColor: withAlpha(colors.background, 0.56),
                  },
                ]}
              >
                <ThemedText style={[styles.quickStatLabel, { color: colors.muted }]}>
                  {skillRatingInsights.improving > 0 ? `${skillRatingInsights.improving} improving` : 'Skills rated'}
                </ThemedText>
                <ThemedText style={styles.quickStatValue}>
                  {skillRatingInsights.topSkill ? `${skillRatingInsights.topSkill.label} ${skillRatingInsights.topSkill.dots}/5` : `${skillRatings.length} skills`}
                </ThemedText>
              </View>
            ) : null}
          </Row>
        ) : null}

        {focusNarrative ? (
          <Row
            align="center"
            gap="xs"
            style={[
              styles.focusBanner,
              {
                borderColor: withAlpha(colors.border, 0.72),
                backgroundColor: withAlpha(colors.background, 0.5),
              },
            ]}
          >
            <Ionicons name="analytics-outline" size={14} color={colors.muted} />
            <ThemedText style={[styles.focusText, { color: colors.muted }]}>
              {focusNarrative}
            </ThemedText>
          </Row>
        ) : null}

        {(sessionContextLabel || feedback.positionPlayed) ? (
          <Row wrap gap="xxs">
            {sessionContextLabel ? (
              <Row
                align="center"
                gap="xxs"
                style={[
                  styles.templateBanner,
                  {
                    borderColor: withAlpha(colors.border, 0.7),
                    backgroundColor: withAlpha(colors.background, 0.52),
                  },
                ]}
              >
                <Ionicons name="layers-outline" size={13} color={colors.muted} />
                <ThemedText style={[styles.templateText, { color: colors.text }]}>
                  {sessionContextLabel}
                </ThemedText>
              </Row>
            ) : null}
            {feedback.positionPlayed ? (
              <Row
                align="center"
                gap="xxs"
                style={[
                  styles.templateBanner,
                  {
                    borderColor: withAlpha(colors.border, 0.7),
                    backgroundColor: withAlpha(colors.background, 0.52),
                  },
                ]}
              >
                <Ionicons name="person-outline" size={13} color={colors.muted} />
                <ThemedText style={[styles.templateText, { color: colors.text }]}>
                  {POSITION_LABELS[feedback.positionPlayed]}
                </ThemedText>
              </Row>
            ) : null}
          </Row>
        ) : null}

        {feedback.skillsWorkedOn.length > 0 ? (
          <Row wrap gap="xxs">
            {feedback.skillsWorkedOn.slice(0, 4).map((skill) => (
              <Row
                key={skill}
                style={[
                  styles.skillChip,
                  {
                    borderColor: withAlpha(colors.border, 0.7),
                    backgroundColor: withAlpha(colors.background, 0.52),
                  },
                ]}
              >
                <ThemedText style={styles.skillChipText}>{skill}</ThemedText>
              </Row>
            ))}
          </Row>
        ) : null}

        {skillRatings.length > 0 ? (
          <Column gap="xxs">
            <ThemedText style={styles.sectionTitle}>Skill ratings</ThemedText>
            <Column gap="sm">
              {skillGroupOrder.map((group) => {
                const entries = groupedSkillRatings[group] ?? [];
                if (entries.length === 0) {
                  return null;
                }

                return (
                  <Column key={group} gap="xxs">
                    <ThemedText style={[styles.groupTitle, { color: colors.muted }]}>{group}</ThemedText>
                    {entries.map((entry) => {
                      const dots = toFivePointDots(entry.rating);
                      const previousDots =
                        typeof entry.previousRating === 'number' ? toFivePointDots(entry.previousRating) : undefined;
                      const trend =
                        typeof previousDots === 'number'
                          ? (dots > previousDots ? 'improving' : dots < previousDots ? 'declining' : 'consistent')
                          : 'consistent';
                      const trendDotColor =
                        trend === 'improving'
                          ? withAlpha(colors.success, 0.82)
                          : withAlpha(colors.border, 0.72);
                      const levelLabel = getSkillLabel(dots);
                      const cornerKey = mapSkillToCorner(entry.skill);
                      const barColor = CORNER_COLORS[cornerKey] ?? colors.tint;

                      return (
                        <View
                          key={`${group}_${entry.skill}_${entry.rating}`}
                          style={[
                            styles.skillRatingRow,
                            {
                              borderColor: withAlpha(colors.border, 0.72),
                              backgroundColor: withAlpha(colors.background, 0.56),
                            },
                          ]}
                        >
                          <View style={[styles.skillAccent, { backgroundColor: withAlpha(barColor, 0.75) }]} />
                          <Column gap="xxs" style={styles.skillRatingBody}>
                            <Row align="center" justify="between">
                              <ThemedText style={styles.skillRatingName}>{entry.skill}</ThemedText>
                              <Row align="center" gap="xs" style={styles.scoreMeta}>
                                <View
                                  style={[
                                    styles.pointsPill,
                                    {
                                      borderColor: withAlpha(colors.border, 0.65),
                                      backgroundColor: withAlpha(colors.background, 0.7),
                                    },
                                  ]}
                                >
                                  <ThemedText style={[styles.pointsText, { color: colors.text }]}>
                                    {dots}/5
                                  </ThemedText>
                                </View>
                                <ThemedText style={[styles.skillRatingValue, { color: colors.text }]} numberOfLines={1}>
                                  {levelLabel}
                                </ThemedText>
                                <ThemedText style={[styles.trendGlyph, { color: trendDotColor }]}>
                                  {trend === 'improving' ? '↑' : '→'}
                                </ThemedText>
                              </Row>
                            </Row>
                            <View style={[styles.ratingTrack, { backgroundColor: withAlpha(colors.border, 0.35) }]}>
                              <View
                                style={[
                                  styles.ratingFill,
                                  {
                                    width: `${dots * 20}%`,
                                    backgroundColor: withAlpha(barColor, 0.65),
                                  },
                                ]}
                              />
                            </View>
                          </Column>
                        </View>
                      );
                    })}
                  </Column>
                );
              })}
            </Column>
          </Column>
        ) : null}

        {feedback.fourCorners ? (
          <Column gap="xxs">
            <ThemedText style={styles.sectionTitle}>Corner ratings</ThemedText>
            <CornerDotsCompact
              corners={feedback.fourCorners}
              effort={feedback.effortRating}
              positionPlayed={feedback.positionPlayed}
            />
          </Column>
        ) : null}

        {trimmedImprovements ? (
          <Column gap="xxs">
            <ThemedText style={styles.sectionTitle}>Improvements</ThemedText>
            <ThemedText style={styles.improvementText}>
              {trimmedImprovements}
            </ThemedText>
          </Column>
        ) : null}

        {sessionBadges.length > 0 ? (
          <Column gap="xxs">
            <ThemedText style={styles.sectionTitle}>Session badges</ThemedText>
            <Row wrap gap="xxs">
              {sessionBadges.map((badge, index) => (
                <Row
                  key={`${badge}_${index}`}
                  align="center"
                  gap="xxs"
                  style={[
                    styles.sessionBadgeChip,
                    {
                      borderColor: withAlpha(colors.warning, 0.35),
                      backgroundColor: withAlpha(colors.warning, 0.12),
                    },
                  ]}
                >
                  <Ionicons name="ribbon-outline" size={13} color={colors.warning} />
                  <ThemedText style={[styles.sessionBadgeText, { color: colors.text }]}>
                    {badge}
                  </ThemedText>
                </Row>
              ))}
            </Row>
          </Column>
        ) : null}

        {/* Homework sub-section (absorbed from HomeworkCard) */}
        {hasHomework ? (
          <Column gap="xs">
            <View style={[styles.homeworkDivider, { backgroundColor: withAlpha(colors.border, 0.5) }]} />
            <Clickable
              onPress={toggleHomework}
              style={styles.homeworkToggle}
              accessibilityLabel={homeworkExpanded ? 'Collapse homework' : 'Expand homework'}
              accessibilityRole="button"
            >
              <Row align="center" justify="between">
                <Row align="center" gap="xxs">
                  <Ionicons name="create-outline" size={14} color={colors.tint} />
                  <ThemedText style={[styles.homeworkLabel, { color: colors.text }]}>
                    Coach&apos;s Homework
                  </ThemedText>
                </Row>
                <Ionicons
                  name={homeworkExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.muted}
                />
              </Row>
            </Clickable>

            {homeworkExpanded ? (
              <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOutUp.duration(180)}>
                <Column gap="xs">
                  <ThemedText style={styles.homeworkText}>
                    &ldquo;{homework.homework.trim()}&rdquo;
                  </ThemedText>
                  <ThemedText style={[styles.homeworkMeta, { color: colors.muted }]}>
                    {homework.coachName} · Set {formatDate(homework.setAt)}
                  </ThemedText>
                  {homework.completed ? (
                    <Row
                      align="center"
                      gap="xxs"
                      style={[
                        styles.homeworkProofRow,
                        {
                          borderColor: withAlpha(colors.success, 0.3),
                          backgroundColor: withAlpha(colors.success, 0.12),
                        },
                      ]}
                    >
                      <Ionicons
                        name={homework.proofType === 'video' ? 'videocam' : 'image'}
                        size={16}
                        color={colors.muted}
                      />
                      <ThemedText style={[styles.homeworkProofText, { color: colors.text }]}>
                        {homework.proofType === 'video' ? 'Video proof uploaded' : 'Photo proof uploaded'}
                        {homework.completedAt ? ` · ${formatDate(homework.completedAt)}` : ''}
                      </ThemedText>
                    </Row>
                  ) : (
                    <Row gap="xs">
                      <Clickable
                        style={[
                          styles.homeworkActionButton,
                          {
                            borderColor: withAlpha(colors.tint, 0.24),
                            backgroundColor: withAlpha(colors.tint, 0.1),
                          },
                        ]}
                        onPress={homework.onAddPhotoProof}
                        disabled={homework.isSubmittingProof || !homework.onAddPhotoProof}
                        accessibilityLabel="Upload photo proof"
                        accessibilityRole="button"
                        accessibilityState={{
                          disabled: homework.isSubmittingProof || !homework.onAddPhotoProof,
                        }}
                      >
                        <Row align="center" justify="center" gap="xxs">
                          <Ionicons name="image-outline" size={15} color={colors.tint} />
                          <ThemedText style={[styles.homeworkActionButtonLabel, { color: colors.text }]}>
                            {homework.isSubmittingProof ? 'Uploading...' : 'Photo proof'}
                          </ThemedText>
                        </Row>
                      </Clickable>

                      <Clickable
                        style={[
                          styles.homeworkActionButton,
                          {
                            borderColor: withAlpha(colors.tint, 0.24),
                            backgroundColor: withAlpha(colors.tint, 0.1),
                          },
                        ]}
                        onPress={homework.onAddVideoProof}
                        disabled={homework.isSubmittingProof || !homework.onAddVideoProof}
                        accessibilityLabel="Upload video proof"
                        accessibilityRole="button"
                        accessibilityState={{
                          disabled: homework.isSubmittingProof || !homework.onAddVideoProof,
                        }}
                      >
                        <Row align="center" justify="center" gap="xxs">
                          <Ionicons name="videocam-outline" size={15} color={colors.tint} />
                          <ThemedText style={[styles.homeworkActionButtonLabel, { color: colors.text }]}>
                            {homework.isSubmittingProof ? 'Uploading...' : 'Video proof'}
                          </ThemedText>
                        </Row>
                      </Clickable>
                    </Row>
                  )}
                </Column>
              </Animated.View>
            ) : null}
          </Column>
        ) : null}

        {onAskCoachAboutThis || onViewAll ? (
          <Row gap="sm" style={styles.actionsRow}>
            {onAskCoachAboutThis ? (
              <Clickable
                style={[
                  styles.secondaryActionButton,
                  {
                    borderColor: withAlpha(colors.tint, 0.25),
                    backgroundColor: withAlpha(colors.tint, 0.08),
                  },
                ]}
                onPress={onAskCoachAboutThis}
                accessibilityLabel="Ask coach about this feedback"
                accessibilityRole="button"
              >
                <Row align="center" justify="center" gap="xxs">
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.tint} />
                  <ThemedText style={[styles.secondaryActionText, { color: colors.text }]}>
                    Ask coach about this
                  </ThemedText>
                </Row>
              </Clickable>
            ) : null}

            {onViewAll ? (
              <Clickable
                style={styles.viewAllButton}
                onPress={onViewAll}
                accessibilityLabel="View all feedback"
                accessibilityRole="button"
              >
                <Row align="center" justify="center" gap="xxs">
                  <ThemedText style={[styles.viewAllText, { color: colors.text }]}>
                    View all feedback
                  </ThemedText>
                  <Ionicons name="arrow-forward" size={14} color={colors.muted} />
                </Row>
              </Clickable>
            ) : null}
          </Row>
        ) : null}
      </Column>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  title: {
    ...Typography.subheading,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  emptyTitle: {
    ...Typography.bodySmallSemiBold,
  },
  emptyBody: {
    ...Typography.bodySmall,
  },
  quote: {
    ...Typography.bodySmall,
    lineHeight: 22,
  },
  quotePanel: {
    borderWidth: 1,
    borderRadius: Radii.md,
    minHeight: 52,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  quoteAccent: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: Radii.pill,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
  },
  coachMeta: {
    flex: 1,
  },
  coachName: {
    ...Typography.bodySmallSemiBold,
  },
  coachSub: {
    ...Typography.caption,
  },
  focusBanner: {
    borderWidth: 1,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  focusText: {
    ...Typography.caption,
    flex: 1,
    lineHeight: 18,
  },
  templateBanner: {
    borderWidth: 1,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
  },
  templateText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  sectionTitle: {
    ...Typography.caption,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  quickStatPill: {
    minHeight: 44,
    minWidth: 92,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    justifyContent: 'center',
    gap: 2,
  },
  quickStatLabel: {
    ...Typography.micro,
    letterSpacing: 0.2,
  },
  quickStatValue: {
    ...Typography.caption,
    fontWeight: '700',
  },
  skillChip: {
    minHeight: 30,
    borderRadius: Radii.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.xs,
    justifyContent: 'center',
  },
  skillChipText: {
    ...Typography.caption,
  },
  groupTitle: {
    ...Typography.caption,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  skillRatingName: {
    ...Typography.bodySmallSemiBold,
    flex: 1,
    minWidth: 0,
  },
  skillRatingRow: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingVertical: Spacing.xxs,
    paddingLeft: Spacing.xxs,
    paddingRight: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.xs,
  },
  skillAccent: {
    width: 3,
    borderRadius: Radii.pill,
  },
  skillRatingBody: {
    flex: 1,
  },
  scoreMeta: {
    flexShrink: 1,
  },
  pointsPill: {
    minHeight: 20,
    minWidth: 40,
    borderRadius: Radii.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.xxs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsText: {
    ...Typography.micro,
    fontWeight: '700',
  },
  skillRatingValue: {
    ...Typography.caption,
    fontWeight: '700',
    maxWidth: 94,
  },
  trendGlyph: {
    ...Typography.caption,
    fontWeight: '700',
    minWidth: 12,
    textAlign: 'right',
  },
  ratingTrack: {
    width: '100%',
    height: 7,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  ratingFill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
  improvementText: {
    ...Typography.bodySmall,
    lineHeight: 20,
  },
  sessionBadgeChip: {
    minHeight: 30,
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.xs,
  },
  sessionBadgeText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  homeworkDivider: {
    height: StyleSheet.hairlineWidth,
  },
  homeworkToggle: {
    minHeight: 44,
    justifyContent: 'center',
  },
  homeworkLabel: {
    ...Typography.bodySmallSemiBold,
  },
  homeworkText: {
    ...Typography.body,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  homeworkMeta: {
    ...Typography.caption,
  },
  homeworkProofRow: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
  },
  homeworkProofText: {
    ...Typography.bodySmallSemiBold,
  },
  homeworkActionButton: {
    minHeight: 44,
    flex: 1,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    justifyContent: 'center',
  },
  homeworkActionButtonLabel: {
    ...Typography.bodySmallSemiBold,
  },
  actionsRow: {
    width: '100%',
  },
  secondaryActionButton: {
    minHeight: 44,
    flex: 1,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    justifyContent: 'center',
  },
  secondaryActionText: {
    ...Typography.bodySmallSemiBold,
  },
  viewAllButton: {
    minHeight: 44,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  viewAllText: {
    ...Typography.bodySmallSemiBold,
  },
});
