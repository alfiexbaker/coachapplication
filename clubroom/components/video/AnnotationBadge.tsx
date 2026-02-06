/**
 * AnnotationBadge Component
 *
 * A badge component for displaying annotation type with color coding.
 * Can be used in lists, cards, and as filter indicators.
 */

import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii , Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ANNOTATION_TYPE_CONFIG } from '@/services/video-service';
import type { VideoAnnotationType } from '@/constants/types';

interface AnnotationBadgeProps {
  type: VideoAnnotationType;
  variant?: 'filled' | 'outlined' | 'subtle';
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  showLabel?: boolean;
  onPress?: () => void;
}

export function AnnotationBadge({
  type,
  variant = 'subtle',
  size = 'medium',
  showIcon = true,
  showLabel = true,
  onPress,
}: AnnotationBadgeProps) {
  useColorScheme();

  const config = ANNOTATION_TYPE_CONFIG[type];

  const sizeStyles = {
    small: {
      ...Typography.micro,
      paddingHorizontal: Spacing.xxs,
      paddingVertical: Spacing.micro,
      iconSize: 10,
      gap: Spacing.micro,
    },
    medium: { ...Typography.caption, paddingHorizontal: 8,
      paddingVertical: Spacing.xxs,
      iconSize: 12,
      gap: Spacing.xxs },
    large: { ...Typography.small, paddingHorizontal: Spacing.xs + Spacing.xxs,
      paddingVertical: Spacing.xxs,
      iconSize: 14,
      gap: Spacing.xxs },
  };

  const currentSize = sizeStyles[size];

  const variantStyles = {
    filled: {
      backgroundColor: config.color,
      borderColor: config.color,
      textColor: '#fff',
      iconColor: '#fff',
    },
    outlined: {
      backgroundColor: 'transparent',
      borderColor: config.color,
      textColor: config.color,
      iconColor: config.color,
    },
    subtle: {
      backgroundColor: withAlpha(config.color, 0.09),
      borderColor: 'transparent',
      textColor: config.color,
      iconColor: config.color,
    },
  };

  const currentVariant = variantStyles[variant];

  const content = (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: currentVariant.backgroundColor,
          borderColor: currentVariant.borderColor,
          paddingHorizontal: currentSize.paddingHorizontal,
          paddingVertical: currentSize.paddingVertical,
          gap: currentSize.gap,
        },
      ]}
    >
      {showIcon && (
        <Ionicons
          name={config.icon as keyof typeof Ionicons.glyphMap}
          size={currentSize.iconSize}
          color={currentVariant.iconColor}
        />
      )}
      {showLabel && (
        <ThemedText
          style={[
            styles.label,
            { color: currentVariant.textColor, fontSize: currentSize.fontSize },
          ]}
        >
          {config.label}
        </ThemedText>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Clickable onPress={onPress} hitSlop={4}>
        {content}
      </Clickable>
    );
  }

  return content;
}

/**
 * Annotation type count badge
 */
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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

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
        <ThemedText style={styles.countText}>{count}</ThemedText>
      </View>
    </View>
  );

  if (onPress) {
    return <Clickable onPress={onPress}>{content}</Clickable>;
  }

  return content;
}

/**
 * All types summary showing counts for each type
 */
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

/**
 * Inline annotation indicator (dot with optional label)
 */
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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

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

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  label: {
    fontWeight: '600',
  },
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
  countText: { ...Typography.caption, color: '#fff' },
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
