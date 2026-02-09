import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Coach, PublicReview } from '@/services/coach-service';

/** Renders 5 star icons for a given rating. Shared with hero. */
export function renderStars(rating: number, color: string) {
  const stars = [];
  const full = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  for (let i = 0; i < 5; i++) {
    if (i < full) stars.push(<Ionicons key={i} name="star" size={14} color={color} />);
    else if (i === full && hasHalf) stars.push(<Ionicons key={i} name="star-half" size={14} color={color} />);
    else stars.push(<Ionicons key={i} name="star-outline" size={14} color={color} />);
  }
  return stars;
}

interface CoachDetailReviewsProps { coach: Coach; reviews: PublicReview[]; }

export const CoachDetailReviews = memo(function CoachDetailReviews({ coach, reviews }: CoachDetailReviewsProps) {
  const { colors: palette } = useTheme();

  return (
    <Animated.View entering={FadeIn} style={styles.tabContent}>
      <SurfaceCard style={styles.ratingsSummary}>
        <View style={styles.ratingBig}>
          <ThemedText style={styles.ratingNumber}>{coach.rating.toFixed(1)}</ThemedText>
          <View style={styles.starsRow}>{renderStars(coach.rating, palette.warning)}</View>
          <ThemedText style={{ color: palette.muted }}>{coach.reviewCount} review{coach.reviewCount !== 1 ? 's' : ''}</ThemedText>
        </View>
      </SurfaceCard>
      {reviews.length > 0 ? (
        reviews.map((review, index) => (
          <Animated.View key={review.id} entering={FadeInDown.delay(index * 50)}>
            <SurfaceCard style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={[styles.reviewAvatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                  <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>{review.reviewerName.charAt(0)}</ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold">{review.reviewerName}</ThemedText>
                  <View style={styles.starsRow}>{renderStars(review.rating, palette.warning)}</View>
                </View>
                <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
                  {new Date(review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </ThemedText>
              </View>
              {review.comment && <ThemedText style={styles.reviewText}>{review.comment}</ThemedText>}
              {review.sessionType && (
                <View style={[styles.sessionTypeBadge, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                  <ThemedText style={{ color: palette.tint, ...Typography.caption }}>{review.sessionType}</ThemedText>
                </View>
              )}
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
});

const styles = StyleSheet.create({
  tabContent: { padding: Spacing.lg, gap: Spacing.md },
  ratingsSummary: { alignItems: 'center', paddingVertical: Spacing.lg },
  ratingBig: { alignItems: 'center', gap: Spacing.xs },
  ratingNumber: { ...Typography.display },
  starsRow: { flexDirection: 'row', gap: Spacing.micro },
  reviewCard: { gap: Spacing.sm },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  reviewAvatar: { width: 40, height: 40, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  reviewText: { lineHeight: 20 },
  sessionTypeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['2xl'], gap: Spacing.sm },
});
