import React, { memo } from 'react';
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

interface PublicProfileReviewsProps {
  coach: Coach;
  reviews: PublicReview[];
}

export const PublicProfileReviews = memo(function PublicProfileReviews({
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
          {summaryStars.map((s, i) => (
            <Ionicons key={i} name={s.name} size={14} color={s.color} />
          ))}
        </Row>
        <ThemedText style={[Typography.small, { color: palette.muted, marginTop: Spacing.xs }]}>
          {coach.reviewCount} review{coach.reviewCount !== 1 ? 's' : ''}
        </ThemedText>
      </SurfaceCard>

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
                    <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
                      {review.reviewerName}
                    </ThemedText>
                    <Row style={styles.starsRow}>
                      {reviewStars.map((s, i) => (
                        <Ionicons key={i} name={s.name} size={14} color={s.color} />
                      ))}
                    </Row>
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
                {review.sessionType ? (
                  <View
                    style={[
                      styles.sessionBadge,
                      { backgroundColor: withAlpha(palette.tint, 0.06) },
                    ]}
                  >
                    <ThemedText style={[Typography.caption, { color: palette.tint }]}>
                      {review.sessionType}
                    </ThemedText>
                  </View>
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
});

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
