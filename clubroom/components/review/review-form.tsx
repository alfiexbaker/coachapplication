import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { RatingStars } from './rating-stars';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Clickable } from '@/components/primitives/clickable';

interface ReviewFormProps {
  onSubmit: (payload: { rating: number; text: string; categories: Record<string, number> }) => void;
  isCoachView?: boolean;
}

export function ReviewForm({ onSubmit, isCoachView }: ReviewFormProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [categories, setCategories] = useState<Record<string, number>>({});

  const categoryFields = isCoachView
    ? ['Attitude', 'Work ethic', 'Coachability']
    : ['Communication', 'Skill development', 'Punctuality', 'Value'];

  const updateCategory = (key: string, value: number) => {
    setCategories((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedText type="defaultSemiBold">Overall rating</ThemedText>
      <RatingStars rating={rating} onRate={setRating} />

      <View style={{ gap: Spacing.sm }}>
        <ThemedText type="defaultSemiBold">Category ratings</ThemedText>
        {categoryFields.map((field) => (
          <View key={field} style={styles.categoryRow}>
            <ThemedText style={{ flex: 1 }}>{field}</ThemedText>
            <RatingStars rating={categories[field] || 0} onRate={(value) => updateCategory(field, value)} />
          </View>
        ))}
      </View>

      <View style={{ gap: Spacing.sm }}>
        <ThemedText type="defaultSemiBold">Review</ThemedText>
        <TextInput
          placeholder="Keep it constructive and specific"
          placeholderTextColor={palette.muted}
          style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
          value={text}
          onChangeText={setText}
          multiline
        />
      </View>

      <Clickable
        onPress={() => onSubmit({ rating, text, categories })}
        style={[styles.submit, { backgroundColor: palette.tint }]}
      >
        <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Submit review</ThemedText>
      </Clickable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.lg,
    padding: Spacing.lg,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textArea: {
    minHeight: 120,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    padding: Spacing.md,
    textAlignVertical: 'top',
  },
  submit: {
    padding: Spacing.md,
    borderRadius: Radii.button,
    alignItems: 'center',
  },
});
