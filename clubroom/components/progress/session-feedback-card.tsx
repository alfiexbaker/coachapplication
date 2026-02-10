import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Chip } from '@/components/primitives/chip';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { SessionFeedback } from '@/services/progress-service';
import { useTheme } from '@/hooks/useTheme';
import {
  formatDate,
  getPerformanceLabel,
  RatingStars,
  CompactFeedbackCard,
  SkillRatingsGrid,
  FeedbackCardDetails,
} from './session-feedback-sections';

// ─── Types ──────────────────────────────────────────────────────────────────

type SessionFeedbackCardProps = {
  feedback: SessionFeedback;
  onPress?: () => void;
  showCoachName?: boolean;
  compact?: boolean;
};

// ─── Component ──────────────────────────────────────────────────────────────

export function SessionFeedbackCard({
  feedback,
  onPress,
  showCoachName = true,
  compact = false,
}: SessionFeedbackCardProps) {
  const { colors: palette } = useTheme();

  if (compact) {
    return <CompactFeedbackCard feedback={feedback} onPress={onPress} showCoachName={showCoachName} />;
  }

  return (
    <SurfaceCard style={styles.card} onPress={onPress} tactile={Boolean(onPress)}>
      {/* Header */}
      <Row justify="space-between" align="flex-start">
        <View style={styles.headerLeft}>
          <ThemedText type="defaultSemiBold" style={styles.date}>{formatDate(feedback.createdAt)}</ThemedText>
          {showCoachName && (
            <Row align="center" gap="xxs">
              <Ionicons name="person" size={12} color={palette.muted} />
              <ThemedText style={[styles.coachName, { color: palette.muted }]}>{feedback.coachName}</ThemedText>
            </Row>
          )}
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.performanceBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <ThemedText style={[styles.performanceText, { color: palette.tint }]}>
              {getPerformanceLabel(feedback.overallPerformance)}
            </ThemedText>
          </View>
        </View>
      </Row>

      {/* Ratings Row */}
      <Row gap="lg">
        <View style={styles.ratingItem}>
          <ThemedText style={[styles.ratingLabel, { color: palette.muted }]}>Performance</ThemedText>
          <RatingStars rating={feedback.overallPerformance} />
        </View>
        <View style={styles.ratingItem}>
          <ThemedText style={[styles.ratingLabel, { color: palette.muted }]}>Effort</ThemedText>
          <RatingStars rating={feedback.effortRating} />
        </View>
      </Row>

      {/* Summary */}
      {feedback.publicSummary && (
        <View style={styles.section}>
          <ThemedText style={styles.summaryText}>{feedback.publicSummary}</ThemedText>
        </View>
      )}

      {/* Skills Worked On */}
      {feedback.skillsWorkedOn.length > 0 && (
        <View style={styles.section}>
          <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Skills covered</ThemedText>
          <Row gap="xxs" wrap>
            {feedback.skillsWorkedOn.map((skill, index) => (
              <Chip key={index} dense>{skill}</Chip>
            ))}
          </Row>
        </View>
      )}

      <SkillRatingsGrid ratings={feedback.skillRatings} />
      <FeedbackCardDetails feedback={feedback} />

      {onPress && <Ionicons name="chevron-forward" size={16} color={palette.muted} style={styles.chevron} />}
    </SurfaceCard>
  );
}

// ─── FeedbackList ───────────────────────────────────────────────────────────

type FeedbackListProps = {
  feedback: SessionFeedback[];
  onPressFeedback?: (feedback: SessionFeedback) => void;
  showCoachName?: boolean;
  compact?: boolean;
  emptyMessage?: string;
};

export function FeedbackList({
  feedback,
  onPressFeedback,
  showCoachName = true,
  compact = false,
  emptyMessage = 'No session feedback yet',
}: FeedbackListProps) {
  const { colors: palette } = useTheme();

  if (feedback.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={32} color={palette.muted} />
        <ThemedText style={[styles.emptyText, { color: palette.muted }]}>{emptyMessage}</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {feedback.map((item) => (
        <SessionFeedbackCard
          key={item.id}
          feedback={item}
          onPress={onPressFeedback ? () => onPressFeedback(item) : undefined}
          showCoachName={showCoachName}
          compact={compact}
        />
      ))}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: { padding: Spacing.md, gap: Spacing.sm, position: 'relative' },
  headerLeft: { gap: Spacing.xxs },
  headerRight: {},
  date: { ...Typography.body },
  coachName: { ...Typography.caption },
  performanceBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  performanceText: { ...Typography.caption },
  ratingItem: { gap: Spacing.xxs },
  ratingLabel: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.3 },
  section: { gap: Spacing.xxs },
  sectionLabel: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.3, fontWeight: '600' },
  summaryText: { ...Typography.bodySmall, lineHeight: 20 },
  chevron: { position: 'absolute', top: Spacing.md, right: Spacing.sm },
  list: { gap: Spacing.sm },
  emptyContainer: { alignItems: 'center', padding: Spacing.lg, gap: Spacing.sm },
  emptyText: { ...Typography.bodySmall, textAlign: 'center' },
});
