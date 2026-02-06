/**
 * Tag Primitive
 *
 * Colored label for categorization. Accepts semantic color names or hex values.
 *
 * Sizes: sm, md
 *
 * Usage:
 *   <Tag label="Active" color="success" />
 *   <Tag label="Beginner" color="info" size="sm" />
 *   <Tag label="Custom" color="#8B5CF6" />
 */

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Fonts, Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useTheme, type ThemeColors } from '@/hooks/useTheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TagSemanticColor = 'success' | 'warning' | 'error' | 'info';
export type TagColor = TagSemanticColor | string;
export type TagSize = 'sm' | 'md';

export interface TagProps {
  /** Tag text */
  label: string;
  /** Semantic color name or arbitrary hex */
  color?: TagColor;
  /** Size preset */
  size?: TagSize;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveColor(color: TagColor, palette: ThemeColors): string {
  const SEMANTIC_COLORS: Record<TagSemanticColor, string> = {
    success: palette.success,
    warning: palette.warning,
    error: palette.error,
    info: palette.info,
  };

  if (color in SEMANTIC_COLORS) {
    return SEMANTIC_COLORS[color as TagSemanticColor];
  }
  return color;
}

// ---------------------------------------------------------------------------
// Size config
// ---------------------------------------------------------------------------

interface SizeConfig {
  paddingH: number;
  paddingV: number;
  fontSize: number;
  lineHeight: number;
}

const SIZE_MAP: Record<TagSize, SizeConfig> = {
  sm: {
    paddingH: 6,
    paddingV: 2,
    fontSize: Typography.micro.fontSize,
    lineHeight: Typography.micro.lineHeight,
  },
  md: {
    paddingH: Spacing.xs,
    paddingV: 4,
    fontSize: Typography.caption.fontSize,
    lineHeight: Typography.caption.lineHeight,
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function TagInner({ label, color = 'info', size = 'md' }: TagProps) {
  const { colors } = useTheme();
  const resolved = useMemo(() => resolveColor(color, colors), [color, colors]);
  const sizeConfig = SIZE_MAP[size];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: withAlpha(resolved, 0.09),
          paddingHorizontal: sizeConfig.paddingH,
          paddingVertical: sizeConfig.paddingV,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: resolved,
            fontSize: sizeConfig.fontSize,
            lineHeight: sizeConfig.lineHeight,
            fontFamily: Fonts?.sans,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

export const Tag = React.memo(TagInner);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    borderRadius: Radii.sm,
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
