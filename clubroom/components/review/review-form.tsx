import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { RatingStars } from './rating-stars';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { Clickable } from '@/components/primitives/clickable';
import { useTheme } from '@/hooks/useTheme';

const MAX_REVIEW_LENGTH = 500;
const MIN_REVIEW_LENGTH = 10;

interface ReviewFormProps {
  onSubmit: (payload: { rating: number; text: string; categories: Record<string, number> }) => void;
  isCoachView?: boolean;
}

export function ReviewForm({ onSubmit, isCoachView }: ReviewFormProps) {
  const { colors: palette } = useTheme();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [categories, setCategories] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const categoryFields = isCoachView
    ? [
        { key: 'Attitude', label: 'Player attitude' },
        { key: 'Work ethic', label: 'Work ethic' },
        { key: 'Coachability', label: 'Coachability' },
      ]
    : [
        { key: 'Communication', label: 'Communication skills' },
        { key: 'Skill development', label: 'Teaching ability' },
        { key: 'Punctuality', label: 'Punctuality' },
        { key: 'Value', label: 'Value for money' },
      ];

  const updateCategory = (key: string, value: number) => {
    setCategories((prev) => ({ ...prev, [key]: value }));
  };

  const handleTextChange = (newText: string) => {
    if (newText.length <= MAX_REVIEW_LENGTH) {
      setText(newText);
    }
  };

  const validateAndSubmit = () => {
    // Validate rating
    if (rating === 0) {
      Alert.alert('Missing Rating', 'Please select an overall rating');
      return;
    }

    // Validate review text
    if (text.trim().length > 0 && text.trim().length < MIN_REVIEW_LENGTH) {
      Alert.alert(
        'Review Too Short',
        `Please write at least ${MIN_REVIEW_LENGTH} characters or leave it empty`,
      );
      return;
    }

    setSubmitting(true);
    onSubmit({ rating, text: text.trim(), categories });
  };

  const remainingChars = MAX_REVIEW_LENGTH - text.length;
  const isValid = rating > 0;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* Overall Rating Section */}
      <View style={styles.section}>
        <Row justify="space-between" align="center">
          <ThemedText type="defaultSemiBold">Overall rating</ThemedText>
          {rating === 0 && (
            <ThemedText style={[styles.required, { color: palette.error }]}>Required</ThemedText>
          )}
        </Row>
        <Row align="center" gap="md">
          <RatingStars rating={rating} onRate={setRating} />
          {rating > 0 && (
            <ThemedText style={[styles.ratingHint, { color: palette.muted }]}>
              {rating === 5
                ? 'Excellent'
                : rating === 4
                  ? 'Great'
                  : rating === 3
                    ? 'Good'
                    : rating === 2
                      ? 'Fair'
                      : 'Poor'}
            </ThemedText>
          )}
        </Row>
      </View>

      {/* Category Ratings */}
      <View style={styles.section}>
        <Row justify="space-between" align="center">
          <ThemedText type="defaultSemiBold">Category ratings</ThemedText>
          <ThemedText style={[styles.optional, { color: palette.muted }]}>Optional</ThemedText>
        </Row>
        {categoryFields.map((field) => (
          <Row key={field.key} justify="space-between" align="center" style={styles.categoryRow}>
            <ThemedText style={[styles.categoryLabel, { color: palette.text }]}>
              {field.label}
            </ThemedText>
            <RatingStars
              rating={categories[field.key] || 0}
              onRate={(value) => updateCategory(field.key, value)}
            />
          </Row>
        ))}
      </View>

      {/* Review Text */}
      <View style={styles.section}>
        <Row justify="space-between" align="center">
          <ThemedText type="defaultSemiBold">Written review</ThemedText>
          <ThemedText style={[styles.optional, { color: palette.muted }]}>Optional</ThemedText>
        </Row>
        <TextInput
          placeholder="Share specific feedback that would be helpful..."
          placeholderTextColor={palette.muted}
          style={[
            styles.textArea,
            {
              borderColor:
                text.length > 0 && text.length < MIN_REVIEW_LENGTH
                  ? palette.warning
                  : palette.border,
              color: palette.text,
              backgroundColor: palette.surface,
            },
          ]}
          value={text}
          onChangeText={handleTextChange}
          multiline
          maxLength={MAX_REVIEW_LENGTH}
        />
        <View style={styles.charCount}>
          <ThemedText
            style={[
              styles.charCountText,
              { color: remainingChars < 50 ? palette.warning : palette.muted },
            ]}
          >
            {remainingChars} characters remaining
          </ThemedText>
        </View>
      </View>

      {/* Submit Button */}
      <Clickable
        onPress={validateAndSubmit}
        disabled={!isValid || submitting}
        style={[
          styles.submit,
          {
            backgroundColor: isValid ? palette.tint : palette.muted,
            opacity: submitting ? 0.6 : 1,
          },
        ]}
      >
        <Row align="center" justify="center" gap="sm">
          <Ionicons name="send" size={18} color={palette.onPrimary} />
          <ThemedText style={[styles.submitText, { color: palette.onPrimary }]}>
            {submitting ? 'Submitting...' : 'Submit review'}
          </ThemedText>
        </Row>
      </Clickable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.lg,
    padding: Spacing.md,
  },
  section: {
    gap: Spacing.sm,
  },
  required: { ...Typography.caption },
  optional: { ...Typography.caption },
  ratingHint: { ...Typography.bodySmallSemiBold },
  categoryRow: {
    paddingVertical: Spacing.xs,
  },
  categoryLabel: { ...Typography.bodySmall, flex: 1 },
  textArea: {
    ...Typography.body,
    minHeight: 100,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    padding: Spacing.sm,
    textAlignVertical: 'top',
  },
  charCount: {
    alignItems: 'flex-end',
  },
  charCountText: { ...Typography.caption },
  submit: {
    padding: Spacing.md,
    borderRadius: Radii.button,
  },
  submitText: { ...Typography.subheading },
});
