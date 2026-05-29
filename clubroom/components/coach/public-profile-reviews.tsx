import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { renderStars } from '@/hooks/use-public-profile';
import type { Coach, PublicReview } from '@/services/coach-service';
import { Column, Row } from '@/components/primitives';
import { CoachReviewProofSummary } from '@/components/coach/coach-review-proof-summary';
import { formatReviewContext } from '@/utils/coach-review-proof';

const STAR_SLOT_KEYS = ['star-1', 'star-2', 'star-3', 'star-4', 'star-5'] as const;

interface PublicProfileReviewsProps {
  coach: Coach;
  reviews: PublicReview[];
}

export const PublicProfileReviews = function PublicProfileReviews({
  coach,
  reviews,
}: PublicProfileReviewsProps) {
  const { colors: palette } = useTheme();
  const summaryStars = renderStars(coach.rating, palette.rating);

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      <SurfaceCard style={[styles.section, { alignItems: 'center', paddingVertical: Spacing.lg }]}>
        <ThemedText style={[styles.ratingNumber, { color: palette.text }]}>
          {coach.rating.toFixed(1)}
        </ThemedText>
        <Row style={styles.starsRow}>
          {summaryStars.map((s, starSlot) => (
            <Ionicons key={STAR_SLOT_KEYS[starSlot]} name={s.name} size={14} color={s.color} />
          ))}
        </Row>
        <ThemedText style={[Typography.small, { color: palette.muted, marginTop: Spacing.xs }]}>
          {coach.reviewCount} review{coach.reviewCount !== 1 ? 's' : ''}
        </ThemedText>
      </SurfaceCard>
      <CoachReviewProofSummary reviews={reviews} />

      {reviews.length > 0 ? (
        reviews.map((review, index) => {
          const reviewStars = renderStars(review.rating, palette.rating);
          return (
            <Animated.View key={review.id} entering={FadeInDown.delay(index * 50)}>
              <SurfaceCard style={styles.reviewCard}>
                <Row style={styles.reviewHeader}>
                  <View
                    style={[
                      styles.reviewAvatar,
                      { backgroundColor: withAlpha(palette.tint, 0.09) },
                    ]}
                  >
                    <ThemedText style={[Typography.bodySemiBold, { color: palette.tint }]}>
                      {review.reviewerName.charAt(0)}
                    </ThemedText>
                  </View>
                  <Column flex>
                    <Row align="center" gap="xs" wrap>
                      <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
                        {review.reviewerName}
                      </ThemedText>
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
                      {reviewStars.map((s, starSlot) => (
                        <Ionicons
                          key={STAR_SLOT_KEYS[starSlot]}
                          name={s.name}
                          size={14}
                          color={s.color}
                        />
                      ))}
                    </Row>
                    {formatReviewContext(review) ? (
                      <ThemedText style={[styles.reviewContext, { color: palette.muted }]}>
                        {formatReviewContext(review)}
                      </ThemedText>
                    ) : null}
                  </Column>
                  <ThemedText style={[Typography.caption, { color: palette.muted }]}>
                    {new Date(review.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </ThemedText>
                </Row>
                {review.comment ? (
                  <ThemedText style={[Typography.body, { color: palette.text }]}>
                    {review.comment}
                  </ThemedText>
                ) : null}
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
                            styles.sessionBadge,
                            { backgroundColor: withAlpha(palette.tint, 0.06) },
                          ]}
                        >
                          <ThemedText style={[Typography.caption, { color: palette.tint }]}>
                            {label} {value}/5
                          </ThemedText>
                        </View>
                      ))}
                  </Row>
                ) : null}
              </SurfaceCard>
            </Animated.View>
          );
        })
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="star-outline" size={48} color={palette.muted} />
          <ThemedText style={[Typography.body, { color: palette.muted }]}>
            No reviews yet
          </ThemedText>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { padding: Spacing.md, gap: Spacing.md },
  section: { gap: Spacing.sm },
  starsRow: { gap: Spacing.micro },
  ratingNumber: { ...Typography.display },
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
  sessionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
});
