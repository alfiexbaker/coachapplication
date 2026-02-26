import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
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
import { POSITION_LABELS, getParentGroup, mapSkillToCorner, SKILL_SUB_SKILLS } from '@/constants/position-skills';

interface HomeworkData {
  homework: string;
  coachName: string;
  setAt: string;
  completed: boolean;
  completedAt?: string;
  proofUri?: string;
  proofType?: 'photo' | 'video';
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
  if (value <= 0) return 0;
  // SessionSkillRating.rating is always 1-5
  return Math.max(1, Math.min(5, Math.round(value)));
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
  const homeworkExpandedByFeedbackIdRef = useRef<Record<string, boolean>>({});
  const [homeworkExpanded, setHomeworkExpanded] = useState(false);

  useEffect(() => {
    if (!feedback) {
      return;
    }
    quoteOpacity.value = 0;
    quoteLift.value = 10;
    quoteOpacity.value = withTiming(1, { duration: 220 });
    quoteLift.value = withTiming(0, { duration: 220 });
  }, [feedback?.id, quoteLift, quoteOpacity]);

  useEffect(() => {
    const key = feedback?.id ?? 'none';
    setHomeworkExpanded(Boolean(homeworkExpandedByFeedbackIdRef.current[key]));
  }, [feedback?.id]);

  const quoteStyle = useAnimatedStyle(() => ({
    opacity: quoteOpacity.value,
    transform: [{ translateY: quoteLift.value }],
  }));

  const toggleHomework = useCallback(() => {
    setHomeworkExpanded((prev) => {
      const next = !prev;
      const key = feedback?.id ?? 'none';
      homeworkExpandedByFeedbackIdRef.current[key] = next;
      return next;
    });
  }, [feedback?.id]);

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

        {/* Hero performance score */}
        {feedback.overallPerformance > 0 || feedback.effortRating > 0 ? (
          <Row align="baseline" gap="micro">
            <ThemedText style={styles.heroScore}>
              {feedback.overallPerformance > 0 ? feedback.overallPerformance : feedback.effortRating}
            </ThemedText>
            <ThemedText style={[styles.heroLabel, { color: colors.muted }]}>
              /5 {feedback.overallPerformance > 0 ? 'performance' : 'effort'}
            </ThemedText>
            {feedback.overallPerformance > 0 && feedback.effortRating > 0 ? (
              <>
                <View style={[styles.heroDot, { backgroundColor: withAlpha(colors.muted, 0.4) }]} />
                <ThemedText style={[styles.heroSub, { color: colors.muted }]}>
                  Effort {feedback.effortRating}/5
                </ThemedText>
              </>
            ) : null}
          </Row>
        ) : null}

        {/* Quote with inline attribution */}
        <Animated.View style={quoteStyle}>
          <Row
            align="start"
            gap="xs"
            style={[
              styles.quotePanel,
              {
                borderColor: withAlpha(colors.border, 0.72),
                backgroundColor: withAlpha(colors.background, 0.56),
              },
            ]}
          >
            <View style={[styles.quoteAccent, { backgroundColor: withAlpha(colors.tint, 0.62) }]} />
            <Column gap="xxs" style={styles.quoteBody}>
              <ThemedText style={styles.quote}>
                {feedback.publicSummary}
              </ThemedText>
              <Row align="center" gap="xxs" style={styles.attributionRow}>
                <ThemedText style={[styles.attribution, { color: colors.muted }]}>
                  — {feedback.coachName}, {formatDate(feedback.createdAt)}
                </ThemedText>
                {coachBadge ? <CoachBadge coach={coachBadge} /> : null}
              </Row>
            </Column>
          </Row>
        </Animated.View>

        {focusNarrative ? (
          <Row
            align="center"
            gap="xs"
            style={[
              styles.focusBanner,
              {
                borderColor: withAlpha(colors.info, 0.24),
                backgroundColor: withAlpha(colors.info, 0.08),
              },
            ]}
          >
            <Ionicons name="bulb-outline" size={16} color={colors.info} />
            <ThemedText style={[styles.focusText, { color: colors.text }]}>
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
                  styles.contextChip,
                  {
                    borderColor: withAlpha(colors.border, 0.7),
                    backgroundColor: withAlpha(colors.background, 0.52),
                  },
                ]}
              >
                <Ionicons name="layers-outline" size={13} color={colors.muted} />
                <ThemedText style={[styles.contextChipText, { color: colors.text }]}>
                  {sessionContextLabel}
                </ThemedText>
              </Row>
            ) : null}
            {feedback.positionPlayed ? (
              <Row
                align="center"
                gap="xxs"
                style={[
                  styles.contextChip,
                  {
                    borderColor: withAlpha(colors.border, 0.7),
                    backgroundColor: withAlpha(colors.background, 0.52),
                  },
                ]}
              >
                <Ionicons name="person-outline" size={13} color={colors.muted} />
                <ThemedText style={[styles.contextChipText, { color: colors.text }]}>
                  {POSITION_LABELS[feedback.positionPlayed]}
                </ThemedText>
              </Row>
            ) : null}
          </Row>
        ) : null}

        {/* Skill ratings — clean rows, no progress bars */}
        {skillRatings.length > 0 ? (
          <Column gap="xxs">
            <ThemedText style={styles.sectionTitle}>Skill ratings</ThemedText>
            <Column gap="xs">
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
                      const trendColor =
                        trend === 'improving'
                          ? withAlpha(colors.success, 0.82)
                          : withAlpha(colors.border, 0.72);
                      const cornerKey = mapSkillToCorner(entry.skill);
                      const barColor = CORNER_COLORS[cornerKey] ?? colors.tint;

                      const parentSubs = SKILL_SUB_SKILLS[entry.skill as FootballSkill] ?? [];
                      const workedOnSubs = (feedback.skillsWorkedOn ?? []).filter((tag) => parentSubs.includes(tag));

                      return (
                        <Column
                          key={`${group}_${entry.skill}_${entry.rating}`}
                          gap="micro"
                        >
                          <View
                            style={[
                              styles.skillRow,
                              {
                                borderLeftColor: withAlpha(barColor, 0.55),
                                backgroundColor: withAlpha(colors.background, 0.45),
                              },
                            ]}
                            accessibilityLabel={`${entry.skill}: ${dots} out of 5${trend === 'improving' ? ', improving' : ''}`}
                          >
                            <Row align="center" justify="between">
                              <ThemedText style={styles.skillName} numberOfLines={1}>
                                {entry.skill}
                              </ThemedText>
                              <Row align="center" gap="xs">
                                <ThemedText style={styles.skillScore}>{dots}/5</ThemedText>
                                <ThemedText style={[styles.trendGlyph, { color: trendColor }]}>
                                  {trend === 'improving' ? '\u2191' : '\u2192'}
                                </ThemedText>
                              </Row>
                            </Row>
                          </View>
                          {workedOnSubs.length > 0 ? (
                            <Row wrap gap="xxs" style={styles.subSkillRow}>
                              {workedOnSubs.map((sub) => (
                                <View
                                  key={sub}
                                  style={[
                                    styles.subSkillChip,
                                    { backgroundColor: withAlpha(barColor, 0.08) },
                                  ]}
                                >
                                  <ThemedText style={[styles.subSkillText, { color: colors.muted }]}>
                                    {sub}
                                  </ThemedText>
                                </View>
                              ))}
                            </Row>
                          ) : null}
                        </Column>
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

        {/* Homework */}
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
                        name={homework.proofType === 'video' ? 'videocam' : homework.proofType === 'photo' ? 'image' : 'checkmark-circle'}
                        size={16}
                        color={colors.success}
                      />
                      <ThemedText style={[styles.homeworkProofText, { color: colors.text }]}>
                        {homework.proofType === 'video'
                          ? 'Video proof uploaded'
                          : homework.proofType === 'photo'
                            ? 'Photo proof uploaded'
                            : 'Completed'}
                        {homework.completedAt ? ` · ${formatDate(homework.completedAt)}` : ''}
                      </ThemedText>
                    </Row>
                  ) : (
                    <Row
                      align="center"
                      gap="xxs"
                      style={[
                        styles.homeworkProofRow,
                        {
                          borderColor: withAlpha(colors.warning, 0.3),
                          backgroundColor: withAlpha(colors.warning, 0.08),
                        },
                      ]}
                    >
                      <Ionicons name="time-outline" size={16} color={colors.warning} />
                      <ThemedText style={[styles.homeworkProofText, { color: colors.muted }]}>
                        Not yet completed
                      </ThemedText>
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
  heroScore: {
    fontSize: Typography.hero.fontSize,
    fontWeight: '800',
    lineHeight: Typography.hero.lineHeight,
  },
  heroLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  heroDot: {
    width: 3,
    height: 3,
    borderRadius: Radii.xs,
    marginHorizontal: Spacing.micro,
  },
  heroSub: {
    ...Typography.caption,
  },
  quote: {
    ...Typography.bodySmall,
    lineHeight: Typography.body.lineHeight,
  },
  quotePanel: {
    borderWidth: 1,
    borderRadius: Radii.md,
    minHeight: 52,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  quoteAccent: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: Radii.pill,
    marginTop: Spacing.micro,
  },
  quoteBody: {
    flex: 1,
  },
  attributionRow: {
    flexWrap: 'wrap',
  },
  attribution: {
    ...Typography.caption,
    fontStyle: 'italic',
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
  },
  contextChip: {
    borderWidth: 1,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
  },
  contextChipText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  sectionTitle: {
    ...Typography.caption,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  groupTitle: {
    ...Typography.caption,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  skillRow: {
    borderLeftWidth: 3,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    minHeight: 36,
    justifyContent: 'center',
  },
  skillName: {
    ...Typography.bodySmall,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
  },
  skillScore: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  trendGlyph: {
    ...Typography.bodySmall,
    fontWeight: '700',
    minWidth: 14,
    textAlign: 'right',
  },
  subSkillRow: {
    paddingLeft: Spacing.sm,
  },
  subSkillChip: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.xs,
  },
  subSkillText: {
    ...Typography.micro,
  },
  improvementText: {
    ...Typography.bodySmall,
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
    lineHeight: Typography.subheading.lineHeight,
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
