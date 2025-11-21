import { ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Components } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface PageHeaderProps {
  /**
   * Main title text
   */
  title: string;

  /**
   * Optional subtitle/description
   */
  subtitle?: string;

  /**
   * Optional left element (back button, etc.)
   */
  left?: ReactNode;

  /**
   * Optional right action button text
   */
  action?: string;

  /**
   * Optional right action icon name (Ionicons)
   */
  actionIcon?: keyof typeof Ionicons.glyphMap;

  /**
   * Handler for action button press
   */
  onActionPress?: () => void;

  /**
   * Custom right element (overrides action/actionIcon)
   */
  right?: ReactNode;
}

/**
 * PageHeader provides a consistent header layout with title, subtitle,
 * and optional action buttons.
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Development"
 *   subtitle="Track your athletes' progress"
 *   action="Add Session"
 *   actionIcon="add"
 *   onActionPress={() => router.push('/session/new')}
 * />
 * ```
 */
export function PageHeader({
  title,
  subtitle,
  left,
  action,
  actionIcon,
  onActionPress,
  right,
}: PageHeaderProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {left}
        <View style={styles.titleContainer}>
          <ThemedText type="title" style={styles.title}>
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        {right || (action || actionIcon) ? (
          <View style={styles.rightContainer}>
            {right || (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: palette.tint,
                  },
                ]}
                onPress={onActionPress}
              >
                {actionIcon ? (
                  <Ionicons name={actionIcon} size={20} color="#fff" />
                ) : null}
                {action ? (
                  <ThemedText
                    style={[
                      styles.actionText,
                      { color: '#fff' },
                      !actionIcon && styles.actionTextOnly,
                    ]}
                  >
                    {action}
                  </ThemedText>
                ) : null}
              </TouchableOpacity>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  titleContainer: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    borderRadius: Components.buttonCompact.borderRadius,
    gap: Spacing.xs / 2,
    height: Components.buttonCompact.height,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  actionTextOnly: {
    paddingHorizontal: Spacing.xs / 2,
  },
});
