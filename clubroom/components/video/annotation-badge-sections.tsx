/**
 * Extracted sub-components for AnnotationBadge.
 *
 * AnnotationTypeCountBadge — type count with icon for filter toggles.
 * AnnotationTypesSummary — all types summary showing counts.
 * AnnotationInlineIndicator — inline dot with optional label/timestamp.
 */

import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { ANNOTATION_TYPE_CONFIG } from '@/services/video-service';
import type { VideoAnnotationType } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

// ============================================================================
// TYPE COUNT BADGE
// ============================================================================

interface TypeCountBadgeProps {
  type: VideoAnnotationType;
  count: number;
  onPress?: () => void;
  isSelected?: boolean;
}

export function AnnotationTypeCountBadge({
  type,
  count,
  onPress,
  isSelected = false,
}: TypeCountBadgeProps) {
  const { colors: palette } = useTheme();
  const config = ANNOTATION_TYPE_CONFIG[type];

  const content = (
    <View
      style={[
        styles.countBadge,
        {
          backgroundColor: isSelected ? withAlpha(config.color, 0.12) : palette.background,
          borderColor: isSelected ? config.color : palette.border,
        },
      ]}
    >
      <Ionicons
        name={config.icon as keyof typeof Ionicons.glyphMap}
        size={14}
        color={isSelected ? config.color : palette.muted}
      />
      <ThemedText
        style={[
          styles.countLabel,
          { color: isSelected ? config.color : palette.text },
        ]}
      >
        {config.label}
      </ThemedText>
      <View
        style={[
          styles.countNumber,
          { backgroundColor: isSelected ? config.color : palette.muted },
        ]}
      >
        <ThemedText style={[styles.countText, { color: palette.onPrimary }]}>{count}</ThemedText>
      </View>
    </View>
  );

  if (onPress) {
    return <Clickable onPress={onPress}>{content}</Clickable>;
  }

  return content;
}

// ============================================================================
// TYPES SUMMARY
// ============================================================================

interface TypesSummaryProps {
  counts: Record<VideoAnnotationType, number>;
  selectedTypes?: VideoAnnotationType[];
  onTypePress?: (type: VideoAnnotationType) => void;
}

export function AnnotationTypesSummary({
  counts,
  selectedTypes = [],
  onTypePress,
}: TypesSummaryProps) {
  const types: VideoAnnotationType[] = ['HIGHLIGHT', 'IMPROVEMENT', 'TECHNIQUE', 'GENERAL'];

  return (
    <View style={styles.summaryContainer}>
      {types.map((type) => (
        <AnnotationTypeCountBadge
          key={type}
          type={type}
          count={counts[type]}
          isSelected={selectedTypes.includes(type)}
          onPress={onTypePress ? () => onTypePress(type) : undefined}
        />
      ))}
    </View>
  );
}

// ============================================================================
// INLINE INDICATOR
// ============================================================================

interface InlineIndicatorProps {
  type: VideoAnnotationType;
  label?: string;
  timestamp?: string;
}

export function AnnotationInlineIndicator({
  type,
  label,
  timestamp,
}: InlineIndicatorProps) {
  const { colors: palette } = useTheme();
  const config = ANNOTATION_TYPE_CONFIG[type];

  return (
    <View style={styles.inlineContainer}>
      <View style={[styles.inlineDot, { backgroundColor: config.color }]} />
      {label && (
        <ThemedText style={styles.inlineLabel} numberOfLines={1}>
          {label}
        </ThemedText>
      )}
      {timestamp && (
        <ThemedText style={[styles.inlineTimestamp, { color: palette.muted }]}>
          {timestamp}
        </ThemedText>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    borderWidth: 1,
    gap: Spacing.xxs,
  },
  countLabel: { ...Typography.caption },
  countNumber: {
    minWidth: 20,
    height: 20,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  countText: { ...Typography.caption },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  inlineDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  inlineLabel: { ...Typography.smallSemiBold, flex: 1 },
  inlineTimestamp: { ...Typography.caption },
});
