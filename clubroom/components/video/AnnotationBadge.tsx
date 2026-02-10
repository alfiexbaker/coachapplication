/**
 * AnnotationBadge Component
 *
 * A badge component for displaying annotation type with color coding.
 * Can be used in lists, cards, and as filter indicators.
 */

import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { ANNOTATION_TYPE_CONFIG } from '@/services/video-service';
import type { VideoAnnotationType } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

// Re-export extracted components for backward compat
export {
  AnnotationTypeCountBadge,
  AnnotationTypesSummary,
  AnnotationInlineIndicator,
} from './annotation-badge-sections';

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
  const { colors: _palette } = useTheme();

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
      textColor: _palette.onPrimary,
      iconColor: _palette.onPrimary,
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
    <Row
      align="center"
      gap={currentSize.gap}
      style={[
        styles.badge,
        {
          backgroundColor: currentVariant.backgroundColor,
          borderColor: currentVariant.borderColor,
          paddingHorizontal: currentSize.paddingHorizontal,
          paddingVertical: currentSize.paddingVertical,
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
    </Row>
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

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  label: {
    fontWeight: '600',
  },
});
