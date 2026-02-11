/**
 * StatusBanner Primitive
 *
 * Full-width banner for contextual messages (alerts, notifications, warnings).
 *
 * Variants: success, warning, error, info
 *
 * Usage:
 *   <StatusBanner message="Payment received!" variant="success" />
 *   <StatusBanner message="Your profile is incomplete" variant="warning" icon="alert-circle" onDismiss={dismiss} />
 */

import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { Components, Fonts, Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useTheme, type ThemeColors } from '@/hooks/useTheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StatusBannerVariant = 'success' | 'warning' | 'error' | 'info';

export interface StatusBannerProps {
  /** Banner message */
  message: string;
  /** Semantic variant */
  variant?: StatusBannerVariant;
  /** Ionicons icon name (defaults based on variant) */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Show dismiss button and handle dismissal */
  onDismiss?: () => void;
}

// ---------------------------------------------------------------------------
// Variant configuration
// ---------------------------------------------------------------------------

interface VariantConfig {
  background: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
}

function getVariantConfig(variant: StatusBannerVariant, palette: ThemeColors): VariantConfig {
  switch (variant) {
    case 'success':
      return {
        background: withAlpha(palette.success, 0.09),
        text: palette.success,
        icon: 'checkmark-circle',
      };
    case 'warning':
      return {
        background: withAlpha(palette.warning, 0.09),
        text: palette.warning,
        icon: 'alert-circle',
      };
    case 'error':
      return {
        background: withAlpha(palette.error, 0.09),
        text: palette.error,
        icon: 'close-circle',
      };
    case 'info':
    default:
      return {
        background: withAlpha(palette.info, 0.09),
        text: palette.info,
        icon: 'information-circle',
      };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function StatusBannerInner({
  message,
  variant = 'info',
  icon,
  onDismiss,
}: StatusBannerProps) {
  const { colors } = useTheme();
  const config = useMemo(() => getVariantConfig(variant, colors), [variant, colors]);
  const iconName = icon ?? config.icon;

  return (
    <Row align="center" gap="xs" style={[styles.container, { backgroundColor: config.background }]}>
      <Ionicons
        name={iconName}
        size={Components.icon.md}
        color={config.text}
      />

      <Text
        style={[styles.message, { color: config.text }]}
        numberOfLines={3}
      >
        {message}
      </Text>

      {onDismiss ? (
        <Clickable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={onDismiss}
          hitSlop={8}
          style={styles.dismissButton}
        >
          <Ionicons
            name="close"
            size={Components.icon.md}
            color={config.text}
          />
        </Clickable>
      ) : null}
    </Row>
  );
}

export const StatusBanner = React.memo(StatusBannerInner);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.md,
  },
  message: {
    ...Typography.small,
    fontWeight: '500',
    flex: 1,
    fontFamily: Fonts?.sans,
  },
  dismissButton: {
    padding: Spacing.xxs,
  },
});
