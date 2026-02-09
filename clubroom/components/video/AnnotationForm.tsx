/**
 * AnnotationForm Component
 *
 * A form for creating or editing video annotations.
 * Supports timestamp selection, type selection, and note input.
 */

import { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeOut, SlideInDown } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { ANNOTATION_TYPE_CONFIG, videoService } from '@/services/video-service';
import type { VideoAnnotation, VideoAnnotationType } from '@/constants/types';
import {
  TimestampControl,
  TypeSelectorGrid,
  AnnotationPreview,
  ErrorDisplay,
} from './annotation-form-sections';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AnnotationFormProps {
  videoId: string;
  videoDuration: number;
  currentTimestamp: number;
  existingAnnotation?: VideoAnnotation;
  onSave: (annotation: Omit<VideoAnnotation, 'id'>) => Promise<void>;
  onCancel: () => void;
  onTimestampChange?: (timestamp: number) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

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
    if (!isEditing) setTimestamp(currentTimestamp);
  }, [currentTimestamp, isEditing]);

  const handleTimestampAdjust = (delta: number) => {
    const newTs = Math.max(0, Math.min(videoDuration, timestamp + delta));
    setTimestamp(newTs);
    onTimestampChange?.(newTs);
  };

  const validateAndSave = async () => {
    const validationErrors = videoService.validateInput(
      { timestamp, label, note, type },
      videoDuration,
    );
    if (validationErrors.length > 0) { setErrors(validationErrors); return; }
    setErrors([]);
    setSaving(true);
    try {
      await onSave({ timestamp, label: label.trim(), note: note.trim() || undefined, type });
    } catch {
      Alert.alert('Error', 'Failed to save annotation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

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
        <Clickable accessibilityLabel="Close" onPress={onCancel} hitSlop={8}>
          <Ionicons name="close" size={24} color={palette.muted} />
        </Clickable>
      </View>

      <TimestampControl timestamp={timestamp} videoDuration={videoDuration} onAdjust={handleTimestampAdjust} />
      <TypeSelectorGrid selectedType={type} onSelectType={setType} />

      {/* Label Input */}
      <View style={styles.section}>
        <View style={styles.labelHeader}>
          <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Label *</ThemedText>
          <ThemedText style={[styles.charCount, { color: palette.muted }]}>{label.length}/100</ThemedText>
        </View>
        <TextInput
          style={[styles.input, { color: palette.text, borderColor: errors.some((e) => e.includes('Label')) ? palette.error : palette.border, backgroundColor: palette.background }]}
          placeholder="e.g., Great technique on the turn"
          placeholderTextColor={palette.muted}
          value={label}
          onChangeText={(text) => { setLabel(text); setErrors([]); }}
          maxLength={100}
        />
      </View>

      {/* Note Input */}
      <View style={styles.section}>
        <View style={styles.labelHeader}>
          <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Note (optional)</ThemedText>
          <ThemedText style={[styles.charCount, { color: palette.muted }]}>{note.length}/500</ThemedText>
        </View>
        <TextInput
          style={[styles.textArea, { color: palette.text, borderColor: errors.some((e) => e.includes('Note')) ? palette.error : palette.border, backgroundColor: palette.background }]}
          placeholder="Add detailed feedback or instructions..."
          placeholderTextColor={palette.muted}
          value={note}
          onChangeText={(text) => { setNote(text); setErrors([]); }}
          multiline
          numberOfLines={3}
          maxLength={500}
          textAlignVertical="top"
        />
      </View>

      <ErrorDisplay errors={errors} />
      <AnnotationPreview label={label} note={note} timestamp={timestamp} typeColor={selectedTypeConfig.color} />

      {/* Actions */}
      <View style={styles.actions}>
        <Clickable onPress={onCancel} style={[styles.cancelButton, { borderColor: palette.border }]}>
          <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
        </Clickable>
        <Clickable
          onPress={validateAndSave}
          disabled={saving || !label.trim()}
          style={[styles.saveButton, { backgroundColor: saving || !label.trim() ? palette.muted : palette.tint, opacity: saving || !label.trim() ? 0.5 : 1 }]}
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { borderRadius: Radii.lg, borderWidth: 1, padding: Spacing.md, gap: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { gap: Spacing.xs },
  sectionLabel: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  labelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  charCount: { ...Typography.caption },
  input: { ...Typography.body, height: 48, borderWidth: 1, borderRadius: Radii.md, paddingHorizontal: Spacing.md },
  textArea: { ...Typography.body, minHeight: 80, borderWidth: 1, borderRadius: Radii.md, padding: Spacing.md },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  cancelButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1 },
  saveButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm, borderRadius: Radii.md, gap: Spacing.xs },
  saveButtonText: { fontWeight: '600' },
});
