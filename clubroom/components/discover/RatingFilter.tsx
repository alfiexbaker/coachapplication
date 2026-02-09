/**
 * RatingFilter Component
 *
 * Interactive star rating filter with distribution chart.
 * Allows users to select minimum rating threshold.
 */

import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

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
    return distribution
      .filter((d) => d.rating >= rating)
      .reduce((sum, d) => sum + d.count, 0);
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
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={16}
            color={star <= rating ? palette.rating : palette.muted}
            style={styles.star}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={[styles.label, { color: palette.text }]}>
          Minimum Rating
        </ThemedText>
        {selectedRating !== undefined && (
          <Pressable
            accessibilityRole="button"
            onPress={() => onChange(undefined)}
            style={({ pressed }) => [
              styles.clearButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <ThemedText style={[styles.clearText, { color: palette.tint }]}>
              Clear
            </ThemedText>
          </Pressable>
        )}
      </View>

      <View style={styles.ratingsList}>
        {RATINGS.map((rating) => {
          const isSelected = selectedRating === rating;
          const count = getCountForRating(rating);
          const barWidth = getBarWidth(rating);

          return (
            <Pressable
              key={rating}
              accessibilityRole="button"
              accessibilityLabel={`${rating} stars and up, ${count} coaches`}
              accessibilityState={{ selected: isSelected }}
              onPress={() => handleRatingPress(rating)}
              style={({ pressed }) => [
                styles.ratingRow,
                {
                  backgroundColor: isSelected
                    ? withAlpha(palette.tint, 0.1)
                    : 'transparent',
                  borderColor: isSelected ? palette.tint : palette.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={styles.ratingInfo}>
                {renderStars(rating, isSelected)}
                <ThemedText
                  style={[
                    styles.ratingLabel,
                    { color: isSelected ? palette.tint : palette.muted },
                  ]}
                >
                  & up
                </ThemedText>
              </View>

              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      width: `${barWidth}%`,
                      backgroundColor: isSelected
                        ? palette.tint
                        : palette.border,
                    },
                  ]}
                />
              </View>

              <ThemedText
                style={[
                  styles.countText,
                  { color: isSelected ? palette.tint : palette.muted },
                ]}
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
            </Pressable>
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
    flexDirection: 'row',
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  ratingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },
  starsRow: {
    flexDirection: 'row',
  },
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
