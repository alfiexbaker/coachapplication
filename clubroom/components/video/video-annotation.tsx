import { useState } from 'react';
import { View, StyleSheet, TextInput, Modal, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { VideoAnnotation, VideoAnnotationType } from '@/constants/types';

const ANNOTATION_TYPES: { type: VideoAnnotationType; label: string; color: string; icon: string }[] = [
  { type: 'HIGHLIGHT', label: 'Highlight', color: '#4CAF50', icon: 'star' },
  { type: 'TECHNIQUE', label: 'Technique', color: '#2196F3', icon: 'football' },
  { type: 'IMPROVEMENT', label: 'Improvement', color: '#FF9800', icon: 'trending-up' },
];

interface AddAnnotationModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (annotation: Omit<VideoAnnotation, 'id'>) => Promise<void>;
  currentTime: number;
  duration: number;
}

export function AddAnnotationModal({
  visible,
  onClose,
  onSave,
  currentTime,
  duration,
}: AddAnnotationModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [timestamp, setTimestamp] = useState(currentTime);
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [type, setType] = useState<VideoAnnotationType>('TECHNIQUE');
  const [saving, setSaving] = useState(false);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSave = async () => {
    if (!label.trim()) {
      Alert.alert('Missing Label', 'Please enter a label for this annotation.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        timestamp,
        label: label.trim(),
        note: note.trim() || undefined,
        type,
      });
      handleClose();
    } catch (error) {
      console.error('Failed to save annotation:', error);
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
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
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
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Timestamp Display */}
          <View style={[styles.timestampCard, { backgroundColor: palette.surface }]}>
            <Ionicons name="time-outline" size={24} color={palette.tint} />
            <View style={styles.timestampInfo}>
              <ThemedText style={[styles.timestampLabel, { color: palette.muted }]}>
                Timestamp
              </ThemedText>
              <ThemedText type="heading">{formatTime(timestamp)}</ThemedText>
            </View>
            <ThemedText style={{ color: palette.muted }}>
              / {formatTime(duration)}
            </ThemedText>
          </View>

          {/* Type Selection */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Type</ThemedText>
            <View style={styles.typesRow}>
              {ANNOTATION_TYPES.map((annotationType) => {
                const isSelected = type === annotationType.type;
                return (
                  <Clickable
                    key={annotationType.type}
                    onPress={() => setType(annotationType.type)}
                    style={[
                      styles.typeButton,
                      {
                        backgroundColor: isSelected ? `${annotationType.color}15` : palette.surface,
                        borderColor: isSelected ? annotationType.color : palette.border,
                      },
                    ]}
                  >
                    <View style={[styles.typeIcon, { backgroundColor: `${annotationType.color}20` }]}>
                      <Ionicons
                        name={annotationType.icon as any}
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
            </View>
          </View>

          {/* Label Input */}
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

          {/* Note Input */}
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
            <View
              style={[
                styles.previewCard,
                {
                  backgroundColor: `${selectedTypeConfig.color}10`,
                  borderColor: selectedTypeConfig.color,
                },
              ]}
            >
              <View style={[styles.previewDot, { backgroundColor: selectedTypeConfig.color }]} />
              <View style={styles.previewContent}>
                <View style={styles.previewHeader}>
                  <ThemedText type="defaultSemiBold">
                    {label || 'Enter a label...'}
                  </ThemedText>
                  <ThemedText style={[styles.previewTime, { color: palette.muted }]}>
                    {formatTime(timestamp)}
                  </ThemedText>
                </View>
                {note ? (
                  <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
                    {note}
                  </ThemedText>
                ) : null}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// Compact annotation badge for displaying in video overlay
interface AnnotationBadgeProps {
  annotation: VideoAnnotation;
  onPress?: () => void;
  compact?: boolean;
}

export function AnnotationBadge({ annotation, onPress, compact = false }: AnnotationBadgeProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const typeConfig = ANNOTATION_TYPES.find((t) => t.type === annotation.type) || ANNOTATION_TYPES[0];

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (compact) {
    return (
      <Clickable
        onPress={onPress}
        style={[styles.compactBadge, { backgroundColor: typeConfig.color }]}
      >
        <Ionicons name={typeConfig.icon as any} size={10} color="#fff" />
      </Clickable>
    );
  }

  return (
    <Clickable
      onPress={onPress}
      style={[styles.badge, { backgroundColor: palette.surface, borderColor: typeConfig.color }]}
    >
      <View style={[styles.badgeDot, { backgroundColor: typeConfig.color }]} />
      <ThemedText style={styles.badgeLabel}>{annotation.label}</ThemedText>
      <ThemedText style={[styles.badgeTime, { color: palette.muted }]}>
        {formatTime(annotation.timestamp)}
      </ThemedText>
    </Clickable>
  );
}

// Quick annotation buttons that appear during playback
interface QuickAnnotationBarProps {
  onAdd: (type: VideoAnnotationType) => void;
  disabled?: boolean;
}

export function QuickAnnotationBar({ onAdd, disabled = false }: QuickAnnotationBarProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={styles.quickBar}>
      <ThemedText style={[styles.quickBarLabel, { color: palette.muted }]}>
        Quick Add:
      </ThemedText>
      <View style={styles.quickButtons}>
        {ANNOTATION_TYPES.map((type) => (
          <Clickable
            key={type.type}
            onPress={() => onAdd(type.type)}
            disabled={disabled}
            style={[
              styles.quickButton,
              { backgroundColor: `${type.color}15`, opacity: disabled ? 0.5 : 1 },
            ]}
          >
            <Ionicons name={type.icon as any} size={16} color={type.color} />
            <ThemedText style={{ color: type.color, fontSize: 12, fontWeight: '600' }}>
              {type.label}
            </ThemedText>
          </Clickable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  timestampCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    gap: Spacing.md,
  },
  timestampInfo: {
    flex: 1,
  },
  timestampLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  typesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
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
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    textAlign: 'right',
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  previewDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  previewContent: {
    flex: 1,
    gap: 4,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewTime: {
    fontSize: 12,
    fontWeight: '600',
  },
  compactBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTime: {
    fontSize: 11,
  },
  quickBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  quickBarLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  quickButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
  },
});
