/**
 * DrillForm — Sub-components.
 */
import { memo } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/primitives/button';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Components, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { drillService } from '@/services/drill-service';
import { scaleFont } from '@/utils/scale';
import type { DrillCategory, DrillDifficulty } from '@/constants/types';
import { CATEGORIES, DIFFICULTIES } from './drill-form-constants';
import { Row } from '@/components/primitives';

/* ─── Category Picker ─── */
interface CategoryPickerProps {
  selected: DrillCategory;
  onSelect: (c: DrillCategory) => void;
}
export const CategoryPicker = memo(function CategoryPicker({
  selected,
  onSelect,
}: CategoryPickerProps) {
  const { colors: palette } = useTheme();
  return (
    <Row style={styles.optionsRow}>
      {CATEGORIES.map((cat) => {
        const info = drillService.getCategoryInfo(cat);
        const isSelected = selected === cat;
        return (
          <Clickable
            key={cat}
            onPress={() => onSelect(cat)}
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
              style={[styles.categoryOptionText, { color: isSelected ? info.color : palette.text }]}
            >
              {info.label}
            </ThemedText>
          </Clickable>
        );
      })}
    </Row>
  );
});

/* ─── Difficulty Picker ─── */
interface DifficultyPickerProps {
  selected: DrillDifficulty;
  onSelect: (d: DrillDifficulty) => void;
}
export const DifficultyPicker = memo(function DifficultyPicker({
  selected,
  onSelect,
}: DifficultyPickerProps) {
  const { colors: palette } = useTheme();
  return (
    <Row style={styles.difficultyRow}>
      {DIFFICULTIES.map((diff) => {
        const info = drillService.getDifficultyInfo(diff);
        const isSelected = selected === diff;
        return (
          <Clickable
            key={diff}
            onPress={() => onSelect(diff)}
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
    </Row>
  );
});

/* ─── Duration Picker ─── */
const DURATION_PRESETS = [5, 10, 15, 20, 30, 45];
interface DurationPickerProps {
  duration: string;
  onDurationChange: (v: string) => void;
  error?: string;
}
export const DurationPicker = memo(function DurationPicker({
  duration,
  onDurationChange,
  error,
}: DurationPickerProps) {
  const { colors: palette } = useTheme();
  return (
    <View>
      <Row style={styles.durationRow}>
        {DURATION_PRESETS.map((mins) => (
          <Clickable
            key={mins}
            onPress={() => onDurationChange(mins.toString())}
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
            {
              backgroundColor: palette.surface,
              borderColor: error ? palette.error : palette.border,
              color: palette.text,
            },
          ]}
          placeholder="Custom"
          placeholderTextColor={palette.muted}
          value={!DURATION_PRESETS.includes(parseInt(duration, 10)) ? duration : ''}
          onChangeText={onDurationChange}
          keyboardType="number-pad"
          maxLength={3}
        />
      </Row>
      {error && (
        <ThemedText style={[styles.errorText, { color: palette.error }]}>{error}</ThemedText>
      )}
    </View>
  );
});

/* ─── Video URL Input ─── */
interface VideoUrlInputProps {
  videoUrl: string;
  onVideoUrlChange: (v: string) => void;
  error?: string;
}
export const VideoUrlInput = memo(function VideoUrlInput({
  videoUrl,
  onVideoUrlChange,
  error,
}: VideoUrlInputProps) {
  const { colors: palette } = useTheme();
  return (
    <View>
      <View style={styles.inputWithIcon}>
        <Ionicons
          name="videocam-outline"
          size={20}
          color={palette.muted}
          style={styles.inputIcon}
        />
        <TextInput
          style={[
            styles.input,
            styles.inputWithIconInput,
            {
              backgroundColor: palette.surface,
              borderColor: error ? palette.error : palette.border,
              color: palette.text,
            },
          ]}
          placeholder="https://..."
          placeholderTextColor={palette.muted}
          value={videoUrl}
          onChangeText={onVideoUrlChange}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      </View>
      {error && (
        <ThemedText style={[styles.errorText, { color: palette.error }]}>{error}</ThemedText>
      )}
    </View>
  );
});

/* ─── Form Actions ─── */
interface FormActionsProps {
  onSubmit: () => void;
  onCancel?: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}
export const DrillFormActions = memo(function DrillFormActions({
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel,
}: FormActionsProps) {
  return (
    <Row style={styles.actions}>
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
      <Button onPress={onSubmit} style={styles.submitButton} disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : submitLabel}
      </Button>
    </Row>
  );
});

const styles = StyleSheet.create({
  optionsRow: { flexWrap: 'wrap', gap: Spacing.xs },
  categoryOption: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    paddingVertical: 10,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  categoryOptionText: { fontSize: scaleFont(13), fontWeight: '500' },
  difficultyRow: { gap: Spacing.sm },
  difficultyOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs + Spacing.xxs,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  difficultyOptionText: { fontSize: scaleFont(13), fontWeight: '600' },
  durationRow: { flexWrap: 'wrap', gap: Spacing.xs },
  durationOption: {
    width: 48,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  durationOptionText: { fontSize: scaleFont(14), fontWeight: '600' },
  durationInput: {
    width: 72,
    height: 44,
    borderWidth: 1,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm,
    fontSize: scaleFont(14),
    textAlign: 'center',
  },
  inputWithIcon: { position: 'relative' },
  inputIcon: { position: 'absolute', left: Spacing.md, top: 12, zIndex: 1 },
  input: {
    height: Components.input.height,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    fontSize: scaleFont(15),
  },
  inputWithIconInput: { paddingLeft: 48 },
  errorText: { fontSize: scaleFont(12), marginTop: Spacing.xxs },
  actions: { gap: Spacing.md, marginTop: Spacing.md },
  cancelButton: { flex: 1 },
  submitButton: { flex: 2 },
});
