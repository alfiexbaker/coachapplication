import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Coach, PublicReview } from '@/services/coach-service';
import { Column, Row } from '@/components/primitives';
import { CoachReviewProofSummary } from '@/components/coach/coach-review-proof-summary';
import { formatReviewContext } from '@/utils/coach-review-proof';

const STAR_KEYS = ['star-1', 'star-2', 'star-3', 'star-4', 'star-5'] as const;

export function RatingStars({ rating, color }: { rating: number; color: string }) {
  const stars = [];
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  for (const key of STAR_KEYS) {
    const starPosition = stars.length;
    if (starPosition < full) stars.push(<Ionicons key={key} name="star" size={14} color={color} />);
    else if (starPosition === full && hasHalf)
      stars.push(<Ionicons key={key} name="star-half" size={14} color={color} />);
    else stars.push(<Ionicons key={key} name="star-outline" size={14} color={color} />);
  }
  return <>{stars}</>;
}

interface CoachDetailReviewsProps {
  coach: Coach;
  reviews: PublicReview[];
}

export const CoachDetailReviews = function CoachDetailReviews({
  coach,
  reviews,
}: CoachDetailReviewsProps) {
  const { colors: palette } = useTheme();

  return (
    <Animated.View entering={FadeIn} style={styles.tabContent}>
      <SurfaceCard style={styles.ratingsSummary}>
        <View style={styles.ratingBig}>
          <ThemedText style={styles.ratingNumber}>{coach.rating.toFixed(1)}</ThemedText>
          <Row style={styles.starsRow}>
            <RatingStars rating={coach.rating} color={palette.warning} />
          </Row>
          <ThemedText style={{ color: palette.muted }}>
            {coach.reviewCount} review{coach.reviewCount !== 1 ? 's' : ''}
          </ThemedText>
        </View>
      </SurfaceCard>
      <CoachReviewProofSummary reviews={reviews} />
      {reviews.length > 0 ? (
        reviews.map((review, index) => (
          <Animated.View key={review.id} entering={FadeInDown.delay(index * 50)}>
            <SurfaceCard style={styles.reviewCard}>
              <Row style={styles.reviewHeader}>
                <View
                  style={[styles.reviewAvatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
                >
                  <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>
                    {review.reviewerName.charAt(0)}
                  </ThemedText>
                </View>
                <Column flex>
                  <Row align="center" gap="xs" wrap>
                    <ThemedText type="defaultSemiBold">{review.reviewerName}</ThemedText>
                    {review.isVerifiedBooking ? (
                      <View
                        style={[
                          styles.verifiedBadge,
                          { backgroundColor: withAlpha(palette.success, 0.12) },
                        ]}
                      >
                        <Ionicons
                          name="shield-checkmark-outline"
                          size={12}
                          color={palette.success}
                        />
                        <ThemedText style={[styles.badgeText, { color: palette.success }]}>
                          Verified booking
                        </ThemedText>
                      </View>
                    ) : null}
                  </Row>
                  <Row style={styles.starsRow}>
                    <RatingStars rating={review.rating} color={palette.warning} />
                  </Row>
                  {formatReviewContext(review) ? (
                    <ThemedText style={[styles.reviewContext, { color: palette.muted }]}>
                      {formatReviewContext(review)}
                    </ThemedText>
                  ) : null}
                </Column>
                <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
                  {new Date(review.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </ThemedText>
              </Row>
              {review.comment && (
                <ThemedText style={styles.reviewText}>{review.comment}</ThemedText>
              )}
              {review.categories && Object.keys(review.categories).length > 0 ? (
                <Row gap="xs" wrap>
                  {Object.entries(review.categories)
                    .filter(([, value]) => value >= 4)
                    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
                    .slice(0, 3)
                    .map(([label, value]) => (
                      <View
                        key={label}
                        style={[
                          styles.sessionTypeBadge,
                          { backgroundColor: withAlpha(palette.tint, 0.06) },
                        ]}
                      >
                        <ThemedText style={{ color: palette.tint, ...Typography.caption }}>
                          {label} {value}/5
                        </ThemedText>
                      </View>
                    ))}
                </Row>
              ) : null}
            </SurfaceCard>
          </Animated.View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="star-outline" size={48} color={palette.muted} />
          <ThemedText style={{ color: palette.muted }}>No reviews yet</ThemedText>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  tabContent: { padding: Spacing.lg, gap: Spacing.md },
  ratingsSummary: { alignItems: 'center', paddingVertical: Spacing.lg },
  ratingBig: { alignItems: 'center', gap: Spacing.xs },
  ratingNumber: { ...Typography.display },
  starsRow: { gap: Spacing.micro },
  reviewCard: { gap: Spacing.sm },
  reviewHeader: { alignItems: 'center', gap: Spacing.sm },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  badgeText: { ...Typography.caption, fontWeight: '600' },
  reviewContext: { ...Typography.caption },
  reviewText: { lineHeight: Typography.bodySmall.lineHeight },
  sessionTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
});
