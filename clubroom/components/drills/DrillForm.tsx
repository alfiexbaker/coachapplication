/**
 * DrillForm — Composition root.
 * Form for creating or editing drills in the coach's library.
 */
import { StyleSheet, View, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Components } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useDrillForm } from '@/hooks/use-drill-form';
import type { CreateDrillInput } from '@/constants/types';
import { scaleFont } from '@/utils/scale';
import { CategoryPicker, DifficultyPicker, DurationPicker, VideoUrlInput, DrillFormActions } from './drill-form-sections';

interface DrillFormProps {
  initialValues?: Partial<CreateDrillInput>;
  onSubmit: (values: CreateDrillInput) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function DrillForm({ initialValues, onSubmit, onCancel, isSubmitting = false, submitLabel = 'Create Drill' }: DrillFormProps) {
  const { colors: palette } = useTheme();
  const form = useDrillForm({ initialValues, onSubmit });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold" style={styles.label}>Title *</ThemedText>
          <TextInput style={[styles.input, { backgroundColor: palette.surface, borderColor: form.errors.title ? palette.error : palette.border, color: palette.text }]}
            placeholder="e.g., Ball Juggling Challenge" placeholderTextColor={palette.muted} value={form.title} onChangeText={form.setTitle} maxLength={100} />
          {form.errors.title && <ThemedText style={[styles.errorText, { color: palette.error }]}>{form.errors.title}</ThemedText>}
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold" style={styles.label}>Description *</ThemedText>
          <TextInput style={[styles.input, styles.textArea, { backgroundColor: palette.surface, borderColor: form.errors.description ? palette.error : palette.border, color: palette.text }]}
            placeholder="Describe how to perform this drill..." placeholderTextColor={palette.muted}
            value={form.description} onChangeText={form.setDescription} multiline numberOfLines={4} textAlignVertical="top" maxLength={500} />
          {form.errors.description && <ThemedText style={[styles.errorText, { color: palette.error }]}>{form.errors.description}</ThemedText>}
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold" style={styles.label}>Category</ThemedText>
          <CategoryPicker selected={form.category} onSelect={form.setCategory} />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold" style={styles.label}>Difficulty</ThemedText>
          <DifficultyPicker selected={form.difficulty} onSelect={form.setDifficulty} />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold" style={styles.label}>Duration (minutes)</ThemedText>
          <DurationPicker duration={form.duration} onDurationChange={form.setDuration} error={form.errors.duration} />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold" style={styles.label}>Video URL (optional)</ThemedText>
          <VideoUrlInput videoUrl={form.videoUrl} onVideoUrlChange={form.setVideoUrl} error={form.errors.videoUrl} />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold" style={styles.label}>Equipment (optional)</ThemedText>
          <TextInput style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
            placeholder="e.g., Football, Cones, Stopwatch" placeholderTextColor={palette.muted} value={form.equipment} onChangeText={form.setEquipment} />
          <ThemedText style={[styles.helperText, { color: palette.muted }]}>Separate items with commas</ThemedText>
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold" style={styles.label}>Tags (optional)</ThemedText>
          <TextInput style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
            placeholder="e.g., ball control, agility, speed" placeholderTextColor={palette.muted} value={form.tags} onChangeText={form.setTags} />
          <ThemedText style={[styles.helperText, { color: palette.muted }]}>Separate tags with commas</ThemedText>
        </View>

        <DrillFormActions onSubmit={form.handleSubmit} onCancel={onCancel} isSubmitting={isSubmitting} submitLabel={submitLabel} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing['3xl'] },
  fieldGroup: { marginBottom: Spacing.lg },
  label: { fontSize: scaleFont(14), marginBottom: Spacing.xs },
  input: { height: Components.input.height, borderWidth: 1, borderRadius: Radii.md, paddingHorizontal: Spacing.md, fontSize: scaleFont(15) },
  textArea: { height: 120, paddingTop: Spacing.sm, paddingBottom: Spacing.sm },
  errorText: { fontSize: scaleFont(12), marginTop: Spacing.xxs },
  helperText: { fontSize: scaleFont(12), marginTop: Spacing.xxs },
});
