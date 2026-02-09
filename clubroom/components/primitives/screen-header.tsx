import { ReactNode } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

/**
 * GLOBAL TYPOGRAPHY STANDARDS - KEEP IT SIMPLE
 *
 * ALL PAGE/SCREEN HEADERS:
 * - Title: 22px, weight 600, letterSpacing -0.3
 * - Subtitle: 12px, weight 400, color muted
 *
 * Same everywhere. No exceptions. Simple.
 */

export interface ScreenHeaderProps {
  /** Main title - use sentence case, keep it short */
  title: string;
  /** Optional subtitle - describes the screen purpose */
  subtitle?: string;
  /** Optional action button on the right */
  action?: {
    icon?: keyof typeof Ionicons.glyphMap;
    label?: string;
    onPress: () => void;
  };
  /** Custom right element (overrides action) */
  rightElement?: ReactNode;
  /** Whether to show a border at the bottom */
  bordered?: boolean;
}

/**
 * ScreenHeader - Use this for main tab screens (Schedule, Athletes, Messages, etc.)
 *
 * This provides the large hero-style header that appears at the top of main screens.
 * For interior pages (detail views, modals), use PageHeader instead.
 *
 * @example
 * ```tsx
 * <ScreenHeader
 *   title="Schedule"
 *   subtitle="Your upcoming sessions"
 *   action={{ icon: 'add', onPress: () => {} }}
 * />
 * ```
 */
export function ScreenHeader({
  title,
  subtitle,
  action,
  rightElement,
  bordered = false,
}: ScreenHeaderProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={[
      styles.container,
      bordered ? { borderBottomWidth: 1, borderBottomColor: palette.border } : undefined,
    ]}>
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          {subtitle && (
            <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
              {subtitle}
            </ThemedText>
          )}
        </View>

        {(rightElement || action) && (
          <View style={styles.rightContainer}>
            {rightElement || (
              action && (
                <Pressable
                  onPress={action.onPress}
                  style={[styles.actionButton, { backgroundColor: palette.tint }]}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  {action.icon && (
                    <Ionicons name={action.icon} size={18} color={palette.onPrimary} />
                  )}
                  {action.label && (
                    <ThemedText style={[styles.actionLabel, { color: palette.onPrimary }]}>{action.label}</ThemedText>
                  )}
                </Pressable>
              )
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// STANDARDIZED STYLES - SAME AS PageHeader
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  textContainer: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  // GLOBAL: Title = 22px, weight 600 (same everywhere)
  title: { ...Typography.title, letterSpacing: -0.3 },
  // GLOBAL: Subtitle = 12px, weight 400
  subtitle: { ...Typography.caption, lineHeight: 18 },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  actionLabel: { ...Typography.smallSemiBold },
});

// SIMPLE TYPOGRAPHY - Same everywhere
export const SCREEN_TYPOGRAPHY = { // ALL headers use this - no exceptions
  title: {
    ...Typography.title,
    letterSpacing: -0.3,
  },
  subtitle: {
    ...Typography.caption,
    lineHeight: 18,
  },
} as const;
