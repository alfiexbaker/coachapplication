import { ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * GLOBAL TYPOGRAPHY STANDARDS
 *
 * Screen Headers (Tab Screens):
 * - Title: 28px, weight 700, letterSpacing -0.5
 * - Subtitle: 15px, weight 400, color muted
 *
 * Page Headers (Interior Pages):
 * - Title: 22px, weight 600, letterSpacing -0.3
 * - Subtitle: 13px, weight 400, color muted
 *
 * Section Headers:
 * - Title: 18px, weight 600, letterSpacing -0.2
 * - Subtitle: 13px, weight 400, color muted
 *
 * Card Headers:
 * - Title: 16px, weight 600
 * - Subtitle: 13px, weight 400, color muted
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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={[
      styles.container,
      bordered && { borderBottomWidth: 1, borderBottomColor: palette.border },
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
                <TouchableOpacity
                  onPress={action.onPress}
                  style={[styles.actionButton, { backgroundColor: palette.tint }]}
                  hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  {action.icon && (
                    <Ionicons name={action.icon} size={18} color="#fff" />
                  )}
                  {action.label && (
                    <ThemedText style={styles.actionLabel}>{action.label}</ThemedText>
                  )}
                </TouchableOpacity>
              )
            )}
          </View>
        )}
      </View>
    </View>
  );
}

// STANDARDIZED STYLES - DO NOT OVERRIDE IN INDIVIDUAL SCREENS
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  // GLOBAL STANDARD: Screen title = 28px, weight 700
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  // GLOBAL STANDARD: Screen subtitle = 15px, weight 400
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  rightContainer: {
    marginLeft: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

// Export typography constants for consistency across the app
export const SCREEN_TYPOGRAPHY = {
  // Tab screen headers (Schedule, Athletes, Messages, etc.)
  screenTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  screenSubtitle: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  // Interior page headers (detail views, settings, etc.)
  pageTitle: {
    fontSize: 22,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  pageSubtitle: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  // Section headers within pages
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 24,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  // Card headers
  cardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
} as const;
