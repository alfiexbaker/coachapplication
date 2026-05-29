/**
 * Badge Primitive
 *
 * Small label for status indicators and metadata.
 *
 * Variants: default, success, warning, error, info
 * Sizes: sm, md
 *
 * Usage:
 *   <Badge label="Active" variant="success" />
 *   <Badge label="3 new" variant="info" size="sm" />
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Fonts, Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme, type ThemeColors } from '@/hooks/useTheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  /** Badge text */
  label: string;
  /** Semantic variant */
  variant?: BadgeVariant;
  /** Size preset */
  size?: BadgeSize;
}

// ---------------------------------------------------------------------------
// Color map
// ---------------------------------------------------------------------------

interface BadgeColors {
  background: string;
  text: string;
}

function getVariantColors(variant: BadgeVariant, palette: ThemeColors): BadgeColors {
  switch (variant) {
    case 'success':
      return { background: withAlpha(palette.success, 0.09), text: palette.success };
    case 'warning':
      return { background: withAlpha(palette.warning, 0.09), text: palette.warning };
    case 'error':
      return { background: withAlpha(palette.error, 0.09), text: palette.error };
    case 'info':
      return { background: withAlpha(palette.info, 0.09), text: palette.info };
    case 'default':
    default:
      return { background: palette.overlay, text: palette.muted };
  }
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

const SIZE_MAP: Record<BadgeSize, SizeConfig> = {
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

function BadgeInner({ label, variant = 'default', size = 'md' }: BadgeProps) {
  const { colors } = useTheme();
  const variantColors = getVariantColors(variant, colors);
  const sizeConfig = SIZE_MAP[size];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: variantColors.background,
          paddingHorizontal: sizeConfig.paddingH,
          paddingVertical: sizeConfig.paddingV,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: variantColors.text,
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

export const Badge = BadgeInner;

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
