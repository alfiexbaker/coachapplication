import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Chip } from '@/components/primitives/chip';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SessionFeedback } from '@/services/progress-service';

type SessionFeedbackCardProps = {
  feedback: SessionFeedback;
  onPress?: () => void;
  showCoachName?: boolean;
  compact?: boolean;
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function RatingStars({ rating, size = 14 }: { rating: number; size?: number }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= rating ? 'star' : 'star-outline'}
          size={size}
          color={star <= rating ? '#F59E0B' : palette.muted}
        />
      ))}
    </View>
  );
}

export function SessionFeedbackCard({
  feedback,
  onPress,
  showCoachName = true,
  compact = false,
}: SessionFeedbackCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const getPerformanceLabel = (rating: number) => {
    switch (rating) {
      case 5: return 'Excellent';
      case 4: return 'Great';
      case 3: return 'Good';
      case 2: return 'Fair';
      default: return 'Needs Work';
    }
  };

  if (compact) {
    return (
      <SurfaceCard
        style={styles.compactCard}
        onPress={onPress}
        tactile={Boolean(onPress)}
      >
        <View style={styles.compactHeader}>
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
        </View>
        {feedback.publicSummary && (
          <ThemedText
            style={[styles.compactSummary, { color: palette.muted }]}
            numberOfLines={2}
          >
            {feedback.publicSummary}
          </ThemedText>
        )}
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard
      style={styles.card}
      onPress={onPress}
      tactile={Boolean(onPress)}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ThemedText type="defaultSemiBold" style={styles.date}>
            {formatDate(feedback.createdAt)}
          </ThemedText>
          {showCoachName && (
            <View style={styles.coachRow}>
              <Ionicons name="person" size={12} color={palette.muted} />
              <ThemedText style={[styles.coachName, { color: palette.muted }]}>
                {feedback.coachName}
              </ThemedText>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.performanceBadge, { backgroundColor: `${palette.tint}15` }]}>
            <ThemedText style={[styles.performanceText, { color: palette.tint }]}>
              {getPerformanceLabel(feedback.overallPerformance)}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Ratings Row */}
      <View style={styles.ratingsRow}>
        <View style={styles.ratingItem}>
          <ThemedText style={[styles.ratingLabel, { color: palette.muted }]}>
            Performance
          </ThemedText>
          <RatingStars rating={feedback.overallPerformance} />
        </View>
        <View style={styles.ratingItem}>
          <ThemedText style={[styles.ratingLabel, { color: palette.muted }]}>
            Effort
          </ThemedText>
          <RatingStars rating={feedback.effortRating} />
        </View>
      </View>

      {/* Summary */}
      {feedback.publicSummary && (
        <View style={styles.section}>
          <ThemedText style={styles.summaryText}>
            {feedback.publicSummary}
          </ThemedText>
        </View>
      )}

      {/* Skills Worked On */}
      {feedback.skillsWorkedOn.length > 0 && (
        <View style={styles.section}>
          <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>
            Skills covered
          </ThemedText>
          <View style={styles.skillsRow}>
            {feedback.skillsWorkedOn.map((skill, index) => (
              <Chip key={index} dense>
                {skill}
              </Chip>
            ))}
          </View>
        </View>
      )}

      {/* Skill Ratings */}
      {feedback.skillRatings.length > 0 && (
        <View style={styles.section}>
          <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>
            Skill ratings
          </ThemedText>
          <View style={styles.skillRatingsGrid}>
            {feedback.skillRatings.slice(0, 4).map((sr, index) => (
              <View key={index} style={styles.skillRatingItem}>
                <ThemedText style={styles.skillRatingName}>{sr.skill}</ThemedText>
                <View style={styles.skillRatingValue}>
                  <ThemedText type="defaultSemiBold" style={[styles.skillRatingNumber, { color: palette.tint }]}>
                    {sr.rating}
                  </ThemedText>
                  <ThemedText style={[styles.skillRatingMax, { color: palette.muted }]}>/10</ThemedText>
                  {sr.previousRating !== undefined && sr.rating !== sr.previousRating && (
                    <Ionicons
                      name={sr.rating > sr.previousRating ? 'arrow-up' : 'arrow-down'}
                      size={10}
                      color={sr.rating > sr.previousRating ? palette.success : palette.error}
                      style={{ marginLeft: 2 }}
                    />
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Improvements */}
      {feedback.improvements && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={14} color={palette.success} />
            <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>
              Improvements noted
            </ThemedText>
          </View>
          <ThemedText style={[styles.sectionContent, { color: palette.text }]}>
            {feedback.improvements}
          </ThemedText>
        </View>
      )}

      {/* Homework */}
      {feedback.homework && (
        <View style={[styles.section, styles.homeworkSection, { backgroundColor: `${palette.tint}08` }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="clipboard-outline" size={14} color={palette.tint} />
            <ThemedText style={[styles.sectionLabel, { color: palette.tint }]}>
              Homework
            </ThemedText>
          </View>
          <ThemedText style={[styles.sectionContent, { color: palette.text }]}>
            {feedback.homework}
          </ThemedText>
        </View>
      )}

      {/* Video clips */}
      {feedback.videoClipUrls && feedback.videoClipUrls.length > 0 && (
        <View style={styles.mediaRow}>
          <Ionicons name="videocam" size={14} color={palette.tint} />
          <ThemedText style={[styles.mediaText, { color: palette.tint }]}>
            {feedback.videoClipUrls.length} video{feedback.videoClipUrls.length > 1 ? 's' : ''} attached
          </ThemedText>
        </View>
      )}

      {/* Badge awarded */}
      {feedback.badgeAwarded && (
        <View style={[styles.badgeRow, { backgroundColor: `${palette.success}15` }]}>
          <Ionicons name="ribbon" size={16} color={palette.success} />
          <ThemedText style={[styles.badgeText, { color: palette.success }]}>
            Badge awarded: {feedback.badgeAwarded}
          </ThemedText>
        </View>
      )}

      {onPress && (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={palette.muted}
          style={styles.chevron}
        />
      )}
    </SurfaceCard>
  );
}

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  if (feedback.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={32} color={palette.muted} />
        <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
          {emptyMessage}
        </ThemedText>
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

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    gap: Spacing.sm,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    gap: 4,
  },
  headerRight: {},
  date: {
    fontSize: 15,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coachName: {
    fontSize: 12,
  },
  performanceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  performanceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ratingsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  ratingItem: {
    gap: 4,
  },
  ratingLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  section: {
    gap: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    fontWeight: '600',
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillRatingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  skillRatingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: '45%',
  },
  skillRatingName: {
    fontSize: 13,
    flex: 1,
  },
  skillRatingValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  skillRatingNumber: {
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  skillRatingMax: {
    fontSize: 11,
  },
  homeworkSection: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.xs,
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mediaText: {
    fontSize: 13,
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chevron: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.sm,
  },
  // Compact styles
  compactCard: {
    padding: Spacing.sm,
    gap: 6,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactLeft: {
    gap: 2,
  },
  compactRight: {},
  compactDate: {
    fontSize: 14,
  },
  compactCoach: {
    fontSize: 11,
  },
  compactSummary: {
    fontSize: 13,
    lineHeight: 18,
  },
  // List styles
  list: {
    gap: Spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
