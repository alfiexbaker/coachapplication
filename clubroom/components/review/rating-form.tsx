/**
 * Rating Form
 *
 * Coach rating form with star selection, feedback chips, and submit button.
 */

import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { RatingStars } from '@/components/review/rating-stars';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { FEEDBACK_CHIPS, RATING_LABELS, type CoachToRate } from '@/hooks/use-rate-coach';

interface RatingFormProps {
  coach: CoachToRate;
  rating: number;
  reviewText: string;
  submitting: boolean;
  onRate: (rating: number) => void;
  onToggleChip: (label: string) => void;
  onSubmit: () => void;
}

export const RatingForm = memo(function RatingForm({
  coach, rating, reviewText, submitting, onRate, onToggleChip, onSubmit,
}: RatingFormProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.content}>
      {/* Coach Info */}
      <View style={styles.coachHeader}>
        <View style={[styles.avatarLarge, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
          <Ionicons name="person" size={40} color={palette.tint} />
        </View>
        <ThemedText type="subtitle" style={styles.coachName}>{coach.name}</ThemedText>
        <ThemedText style={[styles.sessionCount, { color: palette.muted }]}>
          {coach.sessionCount} session{coach.sessionCount !== 1 ? 's' : ''} together
        </ThemedText>
      </View>

      {/* Star Rating */}
      <View style={styles.ratingSection}>
        <ThemedText type="defaultSemiBold" style={styles.ratingLabel}>How was your experience?</ThemedText>
        <View style={styles.starsContainer}><RatingStars rating={rating} onRate={onRate} /></View>
        {rating > 0 && (
          <ThemedText style={[styles.ratingHint, { color: palette.muted }]}>{RATING_LABELS[rating]}</ThemedText>
        )}
      </View>

      {/* Quick Feedback Chips */}
      <View style={styles.quickFeedback}>
        <ThemedText type="defaultSemiBold" style={styles.feedbackLabel}>What stood out? (optional)</ThemedText>
        <View style={styles.chipContainer}>
          {FEEDBACK_CHIPS.map((label) => {
            const isSelected = reviewText.includes(label);
            return (
              <Clickable key={label} onPress={() => onToggleChip(label)}
                style={[styles.chip, {
                  backgroundColor: isSelected ? palette.tint : palette.surface,
                  borderColor: isSelected ? palette.tint : palette.border,
                }]}>
                <ThemedText style={[styles.chipText, { color: isSelected ? palette.onPrimary : palette.text }]}>{label}</ThemedText>
              </Clickable>
            );
          })}
        </View>
      </View>

      {/* Submit Button */}
      <Clickable onPress={onSubmit} disabled={submitting || rating === 0}
        style={[styles.submitButton, {
          backgroundColor: rating > 0 ? palette.tint : palette.muted,
          opacity: submitting ? 0.6 : 1,
        }]}>
        <Ionicons name="star" size={20} color={palette.onPrimary} />
        <ThemedText style={[styles.submitText, { color: palette.onPrimary }]}>
          {submitting ? 'Submitting...' : 'Submit Rating'}
        </ThemedText>
      </Clickable>
    </View>
  );
});

const styles = StyleSheet.create({
  content: { flex: 1, padding: Spacing.lg, gap: Spacing.xl },
  coachHeader: { alignItems: 'center', gap: Spacing.sm },
  avatarLarge: { width: 80, height: 80, borderRadius: Radii['3xl'], alignItems: 'center', justifyContent: 'center' },
  coachName: { ...Typography.title },
  sessionCount: { ...Typography.bodySmall },
  ratingSection: { alignItems: 'center', gap: Spacing.sm },
  ratingLabel: { ...Typography.subheading },
  starsContainer: { paddingVertical: Spacing.sm },
  ratingHint: { ...Typography.bodySmall },
  quickFeedback: { gap: Spacing.sm },
  feedbackLabel: { ...Typography.bodySmall },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radii.pill, borderWidth: 1 },
  chipText: { ...Typography.smallSemiBold },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, borderRadius: Radii.md, marginTop: 'auto' },
  submitText: { ...Typography.subheading },
});
