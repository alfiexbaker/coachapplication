import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { ANNOTATION_TYPE_CONFIG } from '@/services/video-service';
import type { VideoAnnotationType } from '@/constants/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ─── Timestamp Control ───────────────────────────────────────────────────────

type TimestampControlProps = {
  timestamp: number;
  videoDuration: number;
  onAdjust: (delta: number) => void;
};

export const TimestampControl = memo(function TimestampControl({
  timestamp,
  videoDuration,
  onAdjust,
}: TimestampControlProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Timestamp</ThemedText>
      <Row align="center" gap="sm">
        <Clickable
          accessibilityLabel="Rewind 5 seconds"
          onPress={() => onAdjust(-5)}
          style={[styles.timestampButton, { borderColor: palette.border }]}
        >
          <Ionicons name="remove" size={20} color={palette.text} />
        </Clickable>
        <Row
          flex
          align="center"
          justify="center"
          gap="xs"
          style={[styles.timestampDisplay, { backgroundColor: palette.background }]}
        >
          <Ionicons name="time-outline" size={18} color={palette.tint} />
          <ThemedText type="defaultSemiBold" style={styles.timestampText}>
            {formatTimestamp(timestamp)}
          </ThemedText>
          <ThemedText style={[styles.timestampTotal, { color: palette.muted }]}>
            / {formatTimestamp(videoDuration)}
          </ThemedText>
        </Row>
        <Clickable
          accessibilityLabel="Forward 5 seconds"
          onPress={() => onAdjust(5)}
          style={[styles.timestampButton, { borderColor: palette.border }]}
        >
          <Ionicons name="add" size={20} color={palette.text} />
        </Clickable>
      </Row>
    </View>
  );
});

// ─── Type Selector Grid ──────────────────────────────────────────────────────

const FORM_ANNOTATION_TYPES: VideoAnnotationType[] = [
  'HIGHLIGHT',
  'IMPROVEMENT',
  'TECHNIQUE',
  'GENERAL',
];

type TypeSelectorGridProps = {
  selectedType: VideoAnnotationType;
  onSelectType: (type: VideoAnnotationType) => void;
};

export const TypeSelectorGrid = memo(function TypeSelectorGrid({
  selectedType,
  onSelectType,
}: TypeSelectorGridProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Type</ThemedText>
      <Row gap="xs" wrap>
        {FORM_ANNOTATION_TYPES.map((annotationType) => {
          const config = ANNOTATION_TYPE_CONFIG[annotationType];
          const isSelected = selectedType === annotationType;
          return (
            <Clickable
              key={annotationType}
              onPress={() => onSelectType(annotationType)}
              style={[
                styles.typeOption,
                {
                  backgroundColor: isSelected ? withAlpha(config.color, 0.09) : palette.background,
                  borderColor: isSelected ? config.color : palette.border,
                },
              ]}
            >
              <View style={[styles.typeIcon, { backgroundColor: withAlpha(config.color, 0.12) }]}>
                <Ionicons
                  name={config.icon as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={config.color}
                />
              </View>
              <ThemedText
                style={[styles.typeLabel, { color: isSelected ? config.color : palette.text }]}
              >
                {config.label}
              </ThemedText>
            </Clickable>
          );
        })}
      </Row>
    </View>
  );
});

// ─── Annotation Preview ──────────────────────────────────────────────────────

type AnnotationPreviewProps = {
  label: string;
  note: string;
  timestamp: number;
  typeColor: string;
};

export const AnnotationPreview = memo(function AnnotationPreview({
  label,
  note,
  timestamp,
  typeColor,
}: AnnotationPreviewProps) {
  const { colors: palette } = useTheme();

  return (
    <Row
      align="start"
      gap="sm"
      style={[
        styles.preview,
        { backgroundColor: withAlpha(typeColor, 0.06), borderColor: typeColor },
      ]}
    >
      <View style={[styles.previewDot, { backgroundColor: typeColor }]} />
      <View style={styles.previewContent}>
        <Row align="center" justify="between">
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {label || 'Enter a label...'}
          </ThemedText>
          <ThemedText style={[styles.previewTime, { color: palette.muted }]}>
            {formatTimestamp(timestamp)}
          </ThemedText>
        </Row>
        {note ? (
          <ThemedText style={[styles.previewNote, { color: palette.muted }]} numberOfLines={1}>
            {note}
          </ThemedText>
        ) : null}
      </View>
    </Row>
  );
});

// ─── Error Display ───────────────────────────────────────────────────────────

type ErrorDisplayProps = {
  errors: string[];
};

export const ErrorDisplay = memo(function ErrorDisplay({ errors }: ErrorDisplayProps) {
  const { colors: palette } = useTheme();

  if (errors.length === 0) return null;

  return (
    <Animated.View entering={FadeIn} style={styles.errorsContainer}>
      {errors.map((error, index) => (
        <Row key={index} align="center" gap="xxs">
          <Ionicons name="alert-circle" size={14} color={palette.error} />
          <ThemedText style={[styles.errorText, { color: palette.error }]}>{error}</ThemedText>
        </Row>
      ))}
    </Animated.View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: { gap: Spacing.xs },
  sectionLabel: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  timestampButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timestampDisplay: { paddingVertical: Spacing.sm, borderRadius: Radii.md },
  timestampText: { ...Typography.heading },
  timestampTotal: { ...Typography.bodySmall },
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
  preview: { padding: Spacing.sm, borderRadius: Radii.md, borderWidth: 1 },
  previewDot: { width: 10, height: 10, borderRadius: Radii.sm, marginTop: Spacing.xxs },
  previewContent: { flex: 1, gap: Spacing.micro },
  previewTime: { ...Typography.caption },
  previewNote: { ...Typography.small },
  errorsContainer: { gap: Spacing.xxs },
  errorText: { ...Typography.caption },
});
