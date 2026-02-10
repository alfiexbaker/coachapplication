/**
 * Badge Component
 *
 * Versatile badge for status indicators, labels, and tags.
 *
 * Props:
 * - label: Text to display
 * - tone: Semantic color (success, warning, error, info, neutral, premium)
 * - variant: Visual style (filled, outlined, subtle)
 * - size: Size variant (sm, md, lg)
 * - icon: Optional Ionicons icon name
 *
 * Usage:
 *   <Badge label="Active" tone="success" />
 *   <Badge label="Pending" tone="warning" variant="outlined" />
 *   <Badge label="4.9" tone="premium" icon="star" size="sm" />
 */

import { StyleSheet, View } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Ionicons } from '@expo/vector-icons';

import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/useTheme';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type BadgeTone = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'premium';
export type BadgeVariant = 'filled' | 'outlined' | 'subtle';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: keyof typeof Ionicons.glyphMap;
}

// -----------------------------------------------------------------------------
// Size config
// -----------------------------------------------------------------------------

const SIZE_CONFIG: Record<BadgeSize, {
  paddingH: number;
  paddingV: number;
  fontSize: number;
  iconSize: number;
  gap: number;
}> = {
  sm: {
    ...Typography.micro,
    paddingH: Spacing.xs + 2,
    paddingV: 2,
    iconSize: 10,
    gap: Spacing.micro,
  },
  md: { ...Typography.caption, paddingH: Spacing.sm,
    paddingV: Spacing.xs,
    iconSize: 12,
    gap: Spacing.xxs },
  lg: { ...Typography.bodySmall, paddingH: Spacing.sm + 2,
    paddingV: Spacing.xs + 2,
    iconSize: 14,
    gap: Spacing.xxs },
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function Badge({
  label,
  tone = 'neutral',
  variant = 'subtle',
  size = 'md',
  icon,
}: BadgeProps) {
  const { colors: palette } = useTheme();
  const sizeConfig = SIZE_CONFIG[size];

  // Get tone color
  const getToneColor = (): string => {
    const colorMap: Record<BadgeTone, string> = {
      success: palette.success,
      warning: palette.warning,
      error: palette.error,
      info: palette.tint,
      neutral: palette.muted,
      premium: palette.premium,
    };
    return colorMap[tone];
  };

  const toneColor = getToneColor();

  // Get styles based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'filled':
        return {
          backgroundColor: toneColor,
          borderWidth: 0,
          textColor: palette.onPrimary,
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: toneColor,
          textColor: toneColor,
        };
      case 'subtle':
      default:
        return {
          backgroundColor: withAlpha(toneColor, 0.09),
          borderWidth: 0,
          textColor: toneColor,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <Row
      align="center"
      gap={sizeConfig.gap}
      style={[
        styles.badge,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderWidth: variantStyles.borderWidth,
          borderColor: variantStyles.borderColor,
          paddingHorizontal: sizeConfig.paddingH,
          paddingVertical: sizeConfig.paddingV,
        },
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={sizeConfig.iconSize}
          color={variantStyles.textColor}
        />
      )}
      <ThemedText
        style={[
          styles.label,
          {
            color: variantStyles.textColor,
            fontSize: sizeConfig.fontSize,
          },
        ]}
        lightColor={variant === 'filled' ? palette.onPrimary : undefined}
        darkColor={variant === 'filled' ? palette.onPrimary : undefined}
      >
        {label}
      </ThemedText>
    </Row>
  );
}

// -----------------------------------------------------------------------------
// Convenience exports for common badge types
// -----------------------------------------------------------------------------

export function SuccessBadge({ label, ...props }: Omit<BadgeProps, 'tone'>) {
  return <Badge label={label} tone="success" {...props} />;
}

export function WarningBadge({ label, ...props }: Omit<BadgeProps, 'tone'>) {
  return <Badge label={label} tone="warning" {...props} />;
}

export function ErrorBadge({ label, ...props }: Omit<BadgeProps, 'tone'>) {
  return <Badge label={label} tone="error" {...props} />;
}

export function InfoBadge({ label, ...props }: Omit<BadgeProps, 'tone'>) {
  return <Badge label={label} tone="info" {...props} />;
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radii.pill,
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
