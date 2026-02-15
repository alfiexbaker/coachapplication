import { Components, Spacing, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface SizeConfig {
  height: number;
  paddingHorizontal: number;
  borderRadius: number;
  fontSize: number;
  lineHeight: number;
  iconSize: number;
  gap: number;
}

export const SIZE_MAP: Record<ButtonSize, SizeConfig> = {
  sm: {
    height: Components.buttonCompact.height,
    paddingHorizontal: Spacing.sm,
    borderRadius: Components.buttonCompact.borderRadius,
    fontSize: Typography.small.fontSize,
    lineHeight: Typography.small.lineHeight,
    iconSize: Components.icon.sm,
    gap: Spacing.xxs,
  },
  md: {
    height: Components.button.height,
    paddingHorizontal: Spacing.md,
    borderRadius: Components.button.borderRadius,
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
    iconSize: Components.icon.md,
    gap: Spacing.xs,
  },
  lg: {
    height: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: Components.button.borderRadius,
    fontSize: Typography.subheading.fontSize,
    lineHeight: Typography.subheading.lineHeight,
    iconSize: Components.icon.lg,
    gap: Spacing.xs,
  },
};

interface VariantColors {
  background: string;
  backgroundPressed: string;
  text: string;
  border: string;
  borderWidth: number;
}

export function getVariantColors(variant: ButtonVariant, disabled: boolean, palette: ThemeColors): VariantColors {
  if (disabled) {
    return {
      background: palette.border,
      backgroundPressed: palette.border,
      text: palette.muted,
      border: palette.border,
      borderWidth: 0,
    };
  }

  switch (variant) {
    case 'primary':
      return {
        background: palette.tint,
        backgroundPressed: palette.tintPressed,
        text: palette.onPrimary,
        border: 'transparent',
        borderWidth: 0,
      };
    case 'secondary':
      return {
        background: palette.surfaceSecondary,
        backgroundPressed: palette.border,
        text: palette.foreground,
        border: palette.border,
        borderWidth: 1,
      };
    case 'outline':
      return {
        background: 'transparent',
        backgroundPressed: palette.overlay,
        text: palette.foreground,
        border: palette.borderMedium,
        borderWidth: 1.5,
      };
    case 'ghost':
      return {
        background: 'transparent',
        backgroundPressed: palette.overlay,
        text: palette.tint,
        border: 'transparent',
        borderWidth: 0,
      };
    case 'destructive':
      return {
        background: palette.destructive,
        backgroundPressed: palette.error,
        text: palette.onDestructive,
        border: 'transparent',
        borderWidth: 0,
      };
  }
}
