/**
 * AnnotationForm Component
 *
 * A form for creating or editing video annotations.
 * Supports timestamp selection, type selection, and note input.
 */

import { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii , Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { ANNOTATION_TYPE_CONFIG, videoService } from '@/services/video-service';
import type { VideoAnnotation, VideoAnnotationType } from '@/constants/types';

interface AnnotationFormProps {
  videoId: string;
  videoDuration: number;
  currentTimestamp: number;
  existingAnnotation?: VideoAnnotation;
  onSave: (annotation: Omit<VideoAnnotation, 'id'>) => Promise<void>;
  onCancel: () => void;
  onTimestampChange?: (timestamp: number) => void;
}

export function AnnotationForm({
  videoId,
  videoDuration,
  currentTimestamp,
  existingAnnotation,
  onSave,
  onCancel,
  onTimestampChange,
}: AnnotationFormProps) {
  const { colors: palette } = useTheme();

  const [timestamp, setTimestamp] = useState(existingAnnotation?.timestamp ?? currentTimestamp);
  const [label, setLabel] = useState(existingAnnotation?.label ?? '');
  const [note, setNote] = useState(existingAnnotation?.note ?? '');
  const [type, setType] = useState<VideoAnnotationType>(existingAnnotation?.type ?? 'TECHNIQUE');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const isEditing = !!existingAnnotation;

  useEffect(() => {
    if (!isEditing) {
      setTimestamp(currentTimestamp);
    }
  }, [currentTimestamp, isEditing]);

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimestampAdjust = (delta: number) => {
    const newTimestamp = Math.max(0, Math.min(videoDuration, timestamp + delta));
    setTimestamp(newTimestamp);
    onTimestampChange?.(newTimestamp);
  };

  const validateAndSave = async () => {
    const validationErrors = videoService.validateInput(
      { timestamp, label, note, type },
      videoDuration
    );

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    setSaving(true);

    try {
      await onSave({
        timestamp,
        label: label.trim(),
        note: note.trim() || undefined,
        type,
      });
    } catch {
      Alert.alert('Error', 'Failed to save annotation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const annotationTypes: VideoAnnotationType[] = ['HIGHLIGHT', 'IMPROVEMENT', 'TECHNIQUE', 'GENERAL'];
  const selectedTypeConfig = ANNOTATION_TYPE_CONFIG[type];

  return (
    <Animated.View
      entering={SlideInDown.springify()}
      exiting={FadeOut.duration(150)}
      style={[styles.container, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="defaultSemiBold">
          {isEditing ? 'Edit Annotation' : 'Add Annotation'}
        </ThemedText>
        <Clickable onPress={onCancel} hitSlop={8}>
          <Ionicons name="close" size={24} color={palette.muted} />
        </Clickable>
      </View>

      {/* Timestamp Control */}
      <View style={styles.section}>
        <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>
          Timestamp
        </ThemedText>
        <View style={styles.timestampControl}>
          <Clickable
            onPress={() => handleTimestampAdjust(-5)}
            style={[styles.timestampButton, { borderColor: palette.border }]}
          >
            <Ionicons name="remove" size={20} color={palette.text} />
          </Clickable>

          <View style={[styles.timestampDisplay, { backgroundColor: palette.background }]}>
            <Ionicons name="time-outline" size={18} color={palette.tint} />
            <ThemedText type="defaultSemiBold" style={styles.timestampText}>
              {formatTimestamp(timestamp)}
            </ThemedText>
            <ThemedText style={[styles.timestampTotal, { color: palette.muted }]}>
              / {formatTimestamp(videoDuration)}
            </ThemedText>
          </View>

          <Clickable
            onPress={() => handleTimestampAdjust(5)}
            style={[styles.timestampButton, { borderColor: palette.border }]}
          >
            <Ionicons name="add" size={20} color={palette.text} />
          </Clickable>
        </View>
      </View>

      {/* Type Selection */}
      <View style={styles.section}>
        <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>
          Type
        </ThemedText>
        <View style={styles.typesGrid}>
          {annotationTypes.map((annotationType) => {
            const config = ANNOTATION_TYPE_CONFIG[annotationType];
            const isSelected = type === annotationType;

            return (
              <Clickable
                key={annotationType}
                onPress={() => setType(annotationType)}
                style={[
                  styles.typeOption,
                  {
                    backgroundColor: isSelected ? withAlpha(config.color, 0.09) : palette.background,
                    borderColor: isSelected ? config.color : palette.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.typeIcon,
                    { backgroundColor: withAlpha(config.color, 0.12) },
                  ]}
                >
                  <Ionicons
                    name={config.icon as keyof typeof Ionicons.glyphMap}
                    size={18}
                    color={config.color}
                  />
                </View>
                <ThemedText
                  style={[
                    styles.typeLabel,
                    { color: isSelected ? config.color : palette.text },
                  ]}
                >
                  {config.label}
                </ThemedText>
              </Clickable>
            );
          })}
        </View>
      </View>

      {/* Label Input */}
      <View style={styles.section}>
        <View style={styles.labelHeader}>
          <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>
            Label *
          </ThemedText>
          <ThemedText style={[styles.charCount, { color: palette.muted }]}>
            {label.length}/100
          </ThemedText>
        </View>
        <TextInput
          style={[
            styles.input,
            {
              color: palette.text,
              borderColor: errors.some((e) => e.includes('Label')) ? palette.error : palette.border,
              backgroundColor: palette.background,
            },
          ]}
          placeholder="e.g., Great technique on the turn"
          placeholderTextColor={palette.muted}
          value={label}
          onChangeText={(text) => {
            setLabel(text);
            setErrors([]);
          }}
          maxLength={100}
        />
      </View>

      {/* Note Input */}
      <View style={styles.section}>
        <View style={styles.labelHeader}>
          <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>
            Note (optional)
          </ThemedText>
          <ThemedText style={[styles.charCount, { color: palette.muted }]}>
            {note.length}/500
          </ThemedText>
        </View>
        <TextInput
          style={[
            styles.textArea,
            {
              color: palette.text,
              borderColor: errors.some((e) => e.includes('Note')) ? palette.error : palette.border,
              backgroundColor: palette.background,
            },
          ]}
          placeholder="Add detailed feedback or instructions..."
          placeholderTextColor={palette.muted}
          value={note}
          onChangeText={(text) => {
            setNote(text);
            setErrors([]);
          }}
          multiline
          numberOfLines={3}
          maxLength={500}
          textAlignVertical="top"
        />
      </View>

      {/* Errors */}
      {errors.length > 0 && (
        <Animated.View entering={FadeIn} style={styles.errorsContainer}>
          {errors.map((error, index) => (
            <View key={index} style={styles.errorRow}>
              <Ionicons name="alert-circle" size={14} color={palette.error} />
              <ThemedText style={[styles.errorText, { color: palette.error }]}>
                {error}
              </ThemedText>
            </View>
          ))}
        </Animated.View>
      )}

      {/* Preview */}
      <View style={[styles.preview, { backgroundColor: withAlpha(selectedTypeConfig.color, 0.06), borderColor: selectedTypeConfig.color }]}>
        <View style={[styles.previewDot, { backgroundColor: selectedTypeConfig.color }]} />
        <View style={styles.previewContent}>
          <View style={styles.previewHeader}>
            <ThemedText type="defaultSemiBold" numberOfLines={1}>
              {label || 'Enter a label...'}
            </ThemedText>
            <ThemedText style={[styles.previewTime, { color: palette.muted }]}>
              {formatTimestamp(timestamp)}
            </ThemedText>
          </View>
          {note ? (
            <ThemedText style={[styles.previewNote, { color: palette.muted }]} numberOfLines={1}>
              {note}
            </ThemedText>
          ) : null}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Clickable
          onPress={onCancel}
          style={[styles.cancelButton, { borderColor: palette.border }]}
        >
          <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
        </Clickable>
        <Clickable
          onPress={validateAndSave}
          disabled={saving || !label.trim()}
          style={[
            styles.saveButton,
            {
              backgroundColor: saving || !label.trim() ? palette.muted : palette.tint,
              opacity: saving || !label.trim() ? 0.5 : 1,
            },
          ]}
        >
          <Ionicons name="checkmark" size={18} color={palette.onPrimary} />
          <ThemedText style={[styles.saveButtonText, { color: palette.onPrimary }]}>
            {saving ? 'Saving...' : isEditing ? 'Update' : 'Add'}
          </ThemedText>
        </Clickable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  section: {
    gap: Spacing.xs,
  },
  sectionLabel: { ...Typography.caption, textTransform: 'uppercase',
    letterSpacing: 0.5 },
  labelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: { ...Typography.caption },
  timestampControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timestampButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timestampDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    gap: Spacing.xs,
  },
  timestampText: { ...Typography.heading },
  timestampTotal: { ...Typography.bodySmall },
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  typeOption: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: { ...Typography.smallSemiBold },
  input: { ...Typography.body, height: 48,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md },
  textArea: { ...Typography.body, minHeight: 80,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md },
  errorsContainer: {
    gap: Spacing.xxs,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  errorText: { ...Typography.caption },
  preview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  previewDot: {
    width: 10,
    height: 10,
    borderRadius: Radii.sm,
    marginTop: Spacing.xxs,
  },
  previewContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewTime: { ...Typography.caption },
  previewNote: { ...Typography.small },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    gap: Spacing.xs,
  },
  saveButtonText: {
    fontWeight: '600',
  },
});
