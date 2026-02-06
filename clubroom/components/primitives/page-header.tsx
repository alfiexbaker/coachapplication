import { ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Components, Radii, Typography } from '@/constants/theme';
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
   * Show back button automatically
   */
  showBack?: boolean;

  /**
   * Handler for back button press (optional, defaults to router.back())
   */
  onBackPress?: () => void;

  /**
   * Alias for onBackPress for backward compatibility
   */
  onBack?: () => void;

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

  /**
   * Alias for right (for convenience)
   */
  rightAction?: ReactNode;
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
  showBack,
  onBackPress,
  onBack, // Alias for onBackPress
  action,
  actionIcon,
  onActionPress,
  right,
  rightAction,
}: PageHeaderProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const router = useRouter();

  const handleBackPress = () => {
    const backHandler = onBackPress ?? onBack;
    if (backHandler) {
      backHandler();
    } else {
      router.back();
    }
  };

  const renderLeft = () => {
    if (left) return left;
    if (showBack) {
      return (
        <TouchableOpacity
          onPress={handleBackPress}
          style={[styles.backButton, { backgroundColor: palette.surface }]}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons name="chevron-back" size={20} color={palette.foreground} />
        </TouchableOpacity>
      );
    }
    return null;
  };

  // Support rightAction as an alias for right
  const rightContent = right ?? rightAction;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {renderLeft()}
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
        {rightContent || (action || actionIcon) ? (
          <View style={styles.rightContainer}>
            {rightContent || (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                  },
                ]}
                onPress={onActionPress}
              >
                {actionIcon ? (
                  <Ionicons name={actionIcon} size={18} color={palette.foreground} />
                ) : null}
                {action ? (
                  <ThemedText
                    style={[
                      styles.actionText,
                      { color: palette.foreground },
                      !actionIcon ? styles.actionTextOnly : undefined,
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
    paddingTop: Spacing.sm,
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
  title: { ...Typography.title, letterSpacing: -0.3 },
  subtitle: { ...Typography.caption, lineHeight: 18,
    fontWeight: '400' },
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
    borderWidth: 1,
  },
  actionText: { ...Typography.smallSemiBold, letterSpacing: -0.05 },
  actionTextOnly: {
    paddingHorizontal: Spacing.xs / 2,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
