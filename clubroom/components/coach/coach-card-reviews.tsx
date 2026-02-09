/**
 * CoachCardReviews Component
 *
 * Displays star rating, review count, and optional testimonial quote.
 * Used by CoachCard variants to show coach reviews consistently.
 */

import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useTheme, ThemeColors } from '@/hooks/useTheme';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CoachCardReviewsProps {
  /** Coach's average rating */
  rating?: number;
  /** Total number of reviews */
  reviewCount?: number;
  /** Whether to show the review count */
  showCount?: boolean;
  /** Optional review quote/testimonial */
  reviewQuote?: string;
  /** Author of the review quote */
  reviewAuthor?: string;
  /** Layout variant */
  variant?: 'inline' | 'full';
}

export interface RatingDisplayProps {
  rating: number;
  reviewCount?: number;
  showCount?: boolean;
}

type Palette = ThemeColors;

// -----------------------------------------------------------------------------
// RatingDisplay Component
// -----------------------------------------------------------------------------

export function RatingDisplay({
  rating,
  reviewCount,
  showCount = true,
}: RatingDisplayProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.ratingContainer}>
      <Ionicons name="star" size={Components.icon.sm} color={palette.rating} />
      <ThemedText style={[styles.ratingValue, { color: palette.text }]}>
        {rating.toFixed(1)}
      </ThemedText>
      {showCount && reviewCount !== undefined && (
        <ThemedText style={[styles.ratingCount, { color: palette.muted }]}>
          ({reviewCount})
        </ThemedText>
      )}
    </View>
  );
}

// -----------------------------------------------------------------------------
// Compact Rating (for favourite cards)
// -----------------------------------------------------------------------------

export interface CompactRatingProps {
  rating: number;
}

export function CompactRating({ rating }: CompactRatingProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.compactRatingContainer}>
      <Ionicons name="star" size={14} color={palette.premium} />
      <ThemedText style={[styles.compactRatingText, { color: palette.text }]}>
        {rating.toFixed(1)}
      </ThemedText>
    </View>
  );
}

// -----------------------------------------------------------------------------
// ReviewQuote Component
// -----------------------------------------------------------------------------

export interface ReviewQuoteProps {
  quote: string;
  author?: string;
}

export function ReviewQuote({ quote, author }: ReviewQuoteProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={[styles.quoteContainer, { backgroundColor: palette.surfaceSecondary }]}>
      <Ionicons name="chatbubble-outline" size={Components.icon.sm} color={palette.muted} />
      <View style={styles.quoteTextContainer}>
        <ThemedText
          style={[styles.quoteText, { color: palette.text }]}
          numberOfLines={2}
        >
          &ldquo;{quote}&rdquo;
        </ThemedText>
        {author && (
          <ThemedText style={[styles.quoteAuthor, { color: palette.muted }]}>
            — {author}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

// -----------------------------------------------------------------------------
// Full CoachCardReviews Component
// -----------------------------------------------------------------------------

export function CoachCardReviews({
  rating,
  reviewCount,
  showCount = true,
  reviewQuote,
  reviewAuthor,
  variant = 'inline',
}: CoachCardReviewsProps) {
  const { colors: palette } = useTheme();

  if (rating === undefined) {
    return null;
  }

  if (variant === 'inline') {
    return (
      <RatingDisplay
        rating={rating}
        reviewCount={reviewCount}
        showCount={showCount}
      />
    );
  }

  return (
    <View style={styles.fullContainer}>
      <RatingDisplay
        rating={rating}
        reviewCount={reviewCount}
        showCount={showCount}
      />
      {reviewQuote && (
        <ReviewQuote quote={reviewQuote} author={reviewAuthor} />
      )}
    </View>
  );
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  ratingValue: {
    ...Typography.caption,
    fontWeight: '700',
  },
  ratingCount: {
    ...Typography.caption,
    fontWeight: '400',
  },
  compactRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  compactRatingText: { ...Typography.smallSemiBold },
  quoteContainer: {
    flexDirection: 'row',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    alignItems: 'flex-start',
  },
  quoteTextContainer: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  quoteText: {
    ...Typography.small,
    fontStyle: 'italic',
  },
  quoteAuthor: {
    ...Typography.caption,
  },
  fullContainer: {
    gap: Spacing.sm,
  },
});

export default CoachCardReviews;
