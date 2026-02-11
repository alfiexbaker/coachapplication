import { useState } from 'react';
import { View, StyleSheet, TextInput, Modal, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { createLogger } from '@/utils/logger';
import type { VideoAnnotation, VideoAnnotationType } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { ANNOTATION_TYPES, formatTime } from './video-annotation-helpers';

// ─── Re-exports ─────────────────────────────────────────────────────────────

export { AnnotationBadge } from './annotation-badge';
export { QuickAnnotationBar } from './quick-annotation-bar';
export { ANNOTATION_TYPES } from './video-annotation-helpers';

const logger = createLogger('VideoAnnotation');

// ─── Types ──────────────────────────────────────────────────────────────────

interface AddAnnotationModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (annotation: Omit<VideoAnnotation, 'id'>) => Promise<void>;
  currentTime: number;
  duration: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AddAnnotationModal({
  visible,
  onClose,
  onSave,
  currentTime,
  duration,
}: AddAnnotationModalProps) {
  const { colors: palette } = useTheme();

  const [timestamp] = useState(currentTime);
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState<VideoAnnotationType>('TECHNIQUE');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!label.trim()) {
      Alert.alert('Missing Label', 'Please enter a label for this annotation.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ timestamp, label: label.trim(), note: note.trim() || undefined, type });
      handleClose();
    } catch (error) {
      logger.error('Failed to save annotation', error);
      Alert.alert('Error', 'Failed to save annotation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setLabel('');
    setNote('');
    setType('TECHNIQUE');
    onClose();
  };

  const selectedTypeConfig = ANNOTATION_TYPES.find((t) => t.type === type)!;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        {/* Header */}
        <Row
          align="center"
          justify="between"
          style={[styles.header, { borderBottomColor: palette.border }]}
        >
          <Clickable onPress={handleClose} disabled={saving}>
            <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
          </Clickable>
          <ThemedText type="subtitle">Add Annotation</ThemedText>
          <Clickable onPress={handleSave} disabled={saving || !label.trim()}>
            <ThemedText
              style={{
                color: !saving && label.trim() ? palette.tint : palette.muted,
                fontWeight: '600',
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </ThemedText>
          </Clickable>
        </Row>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Timestamp */}
          <Row
            align="center"
            gap="md"
            style={[styles.timestampCard, { backgroundColor: palette.surface }]}
          >
            <Ionicons name="time-outline" size={24} color={palette.tint} />
            <View style={styles.timestampInfo}>
              <ThemedText style={[styles.timestampLabel, { color: palette.muted }]}>
                Timestamp
              </ThemedText>
              <ThemedText type="title">{formatTime(timestamp)}</ThemedText>
            </View>
            <ThemedText style={{ color: palette.muted }}>/ {formatTime(duration)}</ThemedText>
          </Row>

          {/* Type Selection */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Type</ThemedText>
            <Row gap="sm">
              {ANNOTATION_TYPES.map((annotationType) => {
                const isSelected = type === annotationType.type;
                return (
                  <Clickable
                    key={annotationType.type}
                    onPress={() => setType(annotationType.type)}
                    style={[
                      styles.typeButton,
                      {
                        backgroundColor: isSelected
                          ? withAlpha(annotationType.color, 0.09)
                          : palette.surface,
                        borderColor: isSelected ? annotationType.color : palette.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.typeIcon,
                        { backgroundColor: withAlpha(annotationType.color, 0.12) },
                      ]}
                    >
                      <Ionicons
                        name={annotationType.icon as keyof typeof Ionicons.glyphMap}
                        size={18}
                        color={annotationType.color}
                      />
                    </View>
                    <ThemedText
                      style={[
                        styles.typeLabel,
                        { color: isSelected ? annotationType.color : palette.text },
                      ]}
                    >
                      {annotationType.label}
                    </ThemedText>
                  </Clickable>
                );
              })}
            </Row>
          </View>

          {/* Label */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Label *</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  color: palette.text,
                  borderColor: palette.border,
                  backgroundColor: palette.surface,
                },
              ]}
              placeholder="e.g., Great technique"
              placeholderTextColor={palette.muted}
              value={label}
              onChangeText={setLabel}
              maxLength={50}
            />
            <ThemedText style={[styles.charCount, { color: palette.muted }]}>
              {label.length}/50
            </ThemedText>
          </View>

          {/* Note */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Note (optional)</ThemedText>
            <TextInput
              style={[
                styles.textArea,
                {
                  color: palette.text,
                  borderColor: palette.border,
                  backgroundColor: palette.surface,
                },
              ]}
              placeholder="Add additional details..."
              placeholderTextColor={palette.muted}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
              maxLength={200}
            />
            <ThemedText style={[styles.charCount, { color: palette.muted }]}>
              {note.length}/200
            </ThemedText>
          </View>

          {/* Preview */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Preview</ThemedText>
            <Row
              align="start"
              gap="md"
              style={[
                styles.previewCard,
                {
                  backgroundColor: withAlpha(selectedTypeConfig.color, 0.06),
                  borderColor: selectedTypeConfig.color,
                },
              ]}
            >
              <View style={[styles.previewDot, { backgroundColor: selectedTypeConfig.color }]} />
              <View style={styles.previewContent}>
                <Row align="center" justify="between">
                  <ThemedText type="defaultSemiBold">{label || 'Enter a label...'}</ThemedText>
                  <ThemedText style={[styles.previewTime, { color: palette.muted }]}>
                    {formatTime(timestamp)}
                  </ThemedText>
                </Row>
                {note ? (
                  <ThemedText style={{ ...Typography.small, color: palette.muted }}>
                    {note}
                  </ThemedText>
                ) : null}
              </View>
            </Row>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  timestampCard: { padding: Spacing.lg, borderRadius: Radii.lg },
  timestampInfo: { flex: 1 },
  timestampLabel: { ...Typography.caption },
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.bodySmallSemiBold },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  typeIcon: {
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: { ...Typography.caption },
  input: {
    ...Typography.subheading,
    height: 48,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
  },
  textArea: {
    ...Typography.body,
    height: 80,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    textAlignVertical: 'top',
  },
  charCount: { ...Typography.caption, textAlign: 'right' },
  previewCard: { padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1 },
  previewDot: { width: 10, height: 10, borderRadius: Radii.sm, marginTop: Spacing.xxs },
  previewContent: { flex: 1, gap: Spacing.xxs },
  previewTime: { ...Typography.caption },
});
