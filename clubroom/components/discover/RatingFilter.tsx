/**
 * RatingFilter Component
 *
 * Interactive star rating filter with distribution chart.
 * Allows users to select minimum rating threshold.
 */

import { StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

interface RatingDistribution {
  rating: number;
  count: number;
}

interface RatingFilterProps {
  selectedRating?: number;
  distribution?: RatingDistribution[];
  totalCount: number;
  onChange: (rating: number | undefined) => void;
}

const RATINGS = [5, 4, 3, 2, 1];

export function RatingFilter({
  selectedRating,
  distribution = [],
  totalCount,
  onChange,
}: RatingFilterProps) {
  const { colors: palette } = useTheme();

  const getCountForRating = (rating: number): number => {
    // Sum counts for this rating and above
    return distribution.filter((d) => d.rating >= rating).reduce((sum, d) => sum + d.count, 0);
  };

  const getBarWidth = (rating: number): number => {
    const count = getCountForRating(rating);
    if (totalCount === 0) return 0;
    return (count / totalCount) * 100;
  };

  const handleRatingPress = (rating: number) => {
    // Toggle off if already selected
    if (selectedRating === rating) {
      onChange(undefined);
    } else {
      onChange(rating);
    }
  };

  const renderStars = (rating: number, isActive: boolean) => {
    return (
      <Row style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={16}
            color={star <= rating ? palette.rating : palette.muted}
            style={styles.star}
          />
        ))}
      </Row>
    );
  };

  return (
    <View style={styles.container}>
      <Row style={styles.header}>
        <ThemedText style={[styles.label, { color: palette.text }]}>Minimum Rating</ThemedText>
        {selectedRating !== undefined && (
          <Clickable onPress={() => onChange(undefined)} style={styles.clearButton}>
            <ThemedText style={[styles.clearText, { color: palette.tint }]}>Clear</ThemedText>
          </Clickable>
        )}
      </Row>

      <View style={styles.ratingsList}>
        {RATINGS.map((rating) => {
          const isSelected = selectedRating === rating;
          const count = getCountForRating(rating);
          const barWidth = getBarWidth(rating);

          return (
            <Clickable
              key={rating}
              accessibilityLabel={`${rating} stars and up, ${count} coaches`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => handleRatingPress(rating)}
              style={[
                styles.ratingRow,
                {
                  backgroundColor: isSelected ? withAlpha(palette.tint, 0.1) : 'transparent',
                  borderColor: isSelected ? palette.tint : palette.border,
                },
              ]}
            >
              <Row style={styles.ratingInfo}>
                {renderStars(rating, isSelected)}
                <ThemedText
                  style={[styles.ratingLabel, { color: isSelected ? palette.tint : palette.muted }]}
                >
                  & up
                </ThemedText>
              </Row>

              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      width: `${barWidth}%`,
                      backgroundColor: isSelected ? palette.tint : palette.border,
                    },
                  ]}
                />
              </View>

              <ThemedText
                style={[styles.countText, { color: isSelected ? palette.tint : palette.muted }]}
              >
                {count}
              </ThemedText>

              {isSelected && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={palette.tint}
                  style={styles.checkmark}
                />
              )}
            </Clickable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.bodySemiBold,
  },
  clearButton: {
    padding: Spacing.xs,
  },
  clearText: {
    ...Typography.sm,
    fontWeight: '600',
  },
  ratingsList: {
    gap: Spacing.xs,
  },
  ratingRow: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  ratingInfo: {
    alignItems: 'center',
    width: 100,
  },
  starsRow: {},
  star: {
    marginRight: 1,
  },
  ratingLabel: {
    ...Typography.xs,
    marginLeft: Spacing.xs,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'transparent',
    borderRadius: Radii.xs,
    marginHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: Radii.xs,
  },
  countText: {
    ...Typography.sm,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'right',
  },
  checkmark: {
    marginLeft: Spacing.xs,
  },
});
