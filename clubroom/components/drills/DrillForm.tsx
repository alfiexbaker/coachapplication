/**
 * DrillForm Component
 *
 * Form for creating or editing drills in the coach's library.
 * Includes fields for title, description, category, difficulty, duration, and video URL.
 */

import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { Button } from '@/components/primitives/button';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Components, withAlpha } from '@/constants/theme';
import type { DrillCategory, DrillDifficulty, CreateDrillInput } from '@/constants/types';
import { drillService } from '@/services/drill-service';
import { scaleFont } from '@/utils/scale';
import { useTheme } from '@/hooks/useTheme';

interface DrillFormProps {
  /** Initial values for editing */
  initialValues?: Partial<CreateDrillInput>;
  /** Callback when form is submitted */
  onSubmit: (values: CreateDrillInput) => void;
  /** Callback when form is cancelled */
  onCancel?: () => void;
  /** Whether form is in submitting state */
  isSubmitting?: boolean;
  /** Label for submit button */
  submitLabel?: string;
}

const CATEGORIES: DrillCategory[] = ['WARMUP', 'TECHNIQUE', 'FITNESS', 'COOLDOWN', 'TACTICAL'];
const DIFFICULTIES: DrillDifficulty[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

/**
 * Form component for creating or editing drills.
 */
export function DrillForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Create Drill',
}: DrillFormProps) {
  const { colors: palette } = useTheme();

  // Form state
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [category, setCategory] = useState<DrillCategory>(initialValues?.category ?? 'TECHNIQUE');
  const [difficulty, setDifficulty] = useState<DrillDifficulty>(initialValues?.difficulty ?? 'BEGINNER');
  const [duration, setDuration] = useState(initialValues?.duration?.toString() ?? '15');
  const [videoUrl, setVideoUrl] = useState(initialValues?.videoUrl ?? '');
  const [equipment, setEquipment] = useState(initialValues?.equipment?.join(', ') ?? '');
  const [tags, setTags] = useState(initialValues?.tags?.join(', ') ?? '');

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validate form fields
   */
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }

    const durationNum = parseInt(duration, 10);
    if (isNaN(durationNum) || durationNum < 1 || durationNum > 180) {
      newErrors.duration = 'Duration must be between 1 and 180 minutes';
    }

    if (videoUrl && !isValidUrl(videoUrl)) {
      newErrors.videoUrl = 'Please enter a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, description, duration, videoUrl]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(() => {
    if (!validate()) return;

    const values: CreateDrillInput = {
      title: title.trim(),
      description: description.trim(),
      category,
      difficulty,
      duration: parseInt(duration, 10),
      videoUrl: videoUrl.trim() || undefined,
      equipment: equipment.trim()
        ? equipment.split(',').map((e) => e.trim()).filter(Boolean)
        : undefined,
      tags: tags.trim()
        ? tags.split(',').map((t) => t.trim()).filter(Boolean)
        : undefined,
    };

    onSubmit(values);
  }, [title, description, category, difficulty, duration, videoUrl, equipment, tags, validate, onSubmit]);

  /**
   * Validate URL format
   */
  function isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Title *
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: palette.surface, borderColor: errors.title ? palette.error : palette.border, color: palette.text },
            ]}
            placeholder="e.g., Ball Juggling Challenge"
            placeholderTextColor={palette.muted}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          {errors.title && (
            <ThemedText style={[styles.errorText, { color: palette.error }]}>
              {errors.title}
            </ThemedText>
          )}
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Description *
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              { backgroundColor: palette.surface, borderColor: errors.description ? palette.error : palette.border, color: palette.text },
            ]}
            placeholder="Describe how to perform this drill..."
            placeholderTextColor={palette.muted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          {errors.description && (
            <ThemedText style={[styles.errorText, { color: palette.error }]}>
              {errors.description}
            </ThemedText>
          )}
        </View>

        {/* Category */}
        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Category
          </ThemedText>
          <View style={styles.optionsRow}>
            {CATEGORIES.map((cat) => {
              const info = drillService.getCategoryInfo(cat);
              const isSelected = category === cat;

              return (
                <Clickable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.categoryOption,
                    {
                      backgroundColor: isSelected ? withAlpha(info.color, 0.12) : palette.surface,
                      borderColor: isSelected ? info.color : palette.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={info.icon as keyof typeof Ionicons.glyphMap}
                    size={16}
                    color={isSelected ? info.color : palette.muted}
                  />
                  <ThemedText
                    style={[
                      styles.categoryOptionText,
                      { color: isSelected ? info.color : palette.text },
                    ]}
                  >
                    {info.label}
                  </ThemedText>
                </Clickable>
              );
            })}
          </View>
        </View>

        {/* Difficulty */}
        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Difficulty
          </ThemedText>
          <View style={styles.difficultyRow}>
            {DIFFICULTIES.map((diff) => {
              const info = drillService.getDifficultyInfo(diff);
              const isSelected = difficulty === diff;

              return (
                <Clickable
                  key={diff}
                  onPress={() => setDifficulty(diff)}
                  style={[
                    styles.difficultyOption,
                    {
                      backgroundColor: isSelected ? info.bgColor : palette.surface,
                      borderColor: isSelected ? info.color : palette.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.difficultyOptionText,
                      { color: isSelected ? info.color : palette.text },
                    ]}
                  >
                    {info.label}
                  </ThemedText>
                </Clickable>
              );
            })}
          </View>
        </View>

        {/* Duration */}
        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Duration (minutes)
          </ThemedText>
          <View style={styles.durationRow}>
            {[5, 10, 15, 20, 30, 45].map((mins) => (
              <Clickable
                key={mins}
                onPress={() => setDuration(mins.toString())}
                style={[
                  styles.durationOption,
                  {
                    backgroundColor: duration === mins.toString() ? palette.tint : palette.surface,
                    borderColor: duration === mins.toString() ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.durationOptionText,
                    { color: duration === mins.toString() ? palette.onPrimary : palette.text },
                  ]}
                >
                  {mins}
                </ThemedText>
              </Clickable>
            ))}
            <TextInput
              style={[
                styles.durationInput,
                { backgroundColor: palette.surface, borderColor: errors.duration ? palette.error : palette.border, color: palette.text },
              ]}
              placeholder="Custom"
              placeholderTextColor={palette.muted}
              value={![5, 10, 15, 20, 30, 45].includes(parseInt(duration, 10)) ? duration : ''}
              onChangeText={setDuration}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
          {errors.duration && (
            <ThemedText style={[styles.errorText, { color: palette.error }]}>
              {errors.duration}
            </ThemedText>
          )}
        </View>

        {/* Video URL */}
        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Video URL (optional)
          </ThemedText>
          <View style={styles.inputWithIcon}>
            <Ionicons name="videocam-outline" size={20} color={palette.muted} style={styles.inputIcon} />
            <TextInput
              style={[
                styles.input,
                styles.inputWithIconInput,
                { backgroundColor: palette.surface, borderColor: errors.videoUrl ? palette.error : palette.border, color: palette.text },
              ]}
              placeholder="https://..."
              placeholderTextColor={palette.muted}
              value={videoUrl}
              onChangeText={setVideoUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>
          {errors.videoUrl && (
            <ThemedText style={[styles.errorText, { color: palette.error }]}>
              {errors.videoUrl}
            </ThemedText>
          )}
        </View>

        {/* Equipment */}
        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Equipment (optional)
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
            ]}
            placeholder="e.g., Football, Cones, Stopwatch"
            placeholderTextColor={palette.muted}
            value={equipment}
            onChangeText={setEquipment}
          />
          <ThemedText style={[styles.helperText, { color: palette.muted }]}>
            Separate items with commas
          </ThemedText>
        </View>

        {/* Tags */}
        <View style={styles.fieldGroup}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Tags (optional)
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
            ]}
            placeholder="e.g., ball control, agility, speed"
            placeholderTextColor={palette.muted}
            value={tags}
            onChangeText={setTags}
          />
          <ThemedText style={[styles.helperText, { color: palette.muted }]}>
            Separate tags with commas
          </ThemedText>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {onCancel && (
            <Button
              variant="secondary"
              onPress={onCancel}
              style={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            onPress={handleSubmit}
            style={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : submitLabel}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  fieldGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: scaleFont(14),
    marginBottom: Spacing.xs,
  },
  input: {
    height: Components.input.height,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    fontSize: scaleFont(15),
  },
  textArea: {
    height: 120,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  inputWithIcon: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: Spacing.md,
    top: 12,
    zIndex: 1,
  },
  inputWithIconInput: {
    paddingLeft: 48,
  },
  errorText: {
    fontSize: scaleFont(12),
    marginTop: Spacing.xxs,
  },
  helperText: {
    fontSize: scaleFont(12),
    marginTop: Spacing.xxs,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    paddingVertical: 10,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  categoryOptionText: {
    fontSize: scaleFont(13),
    fontWeight: '500',
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  difficultyOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs + Spacing.xxs,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  difficultyOptionText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  durationOption: {
    width: 48,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  durationOptionText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  durationInput: {
    width: 72,
    height: 44,
    borderWidth: 1,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm,
    fontSize: scaleFont(14),
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});
