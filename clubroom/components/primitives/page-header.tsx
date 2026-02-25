import { ReactNode, useState } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Components, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

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

  /**
   * Center title and reserve balanced left/right slots.
   */
  centerTitle?: boolean;

  /**
   * Override icon used by the default back button.
   */
  backIcon?: keyof typeof Ionicons.glyphMap;

  /**
   * Optional style override for header container.
   */
  containerStyle?: StyleProp<ViewStyle>;
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
  centerTitle = false,
  backIcon = 'chevron-back',
  containerStyle,
}: PageHeaderProps) {
  const { colors: palette } = useTheme();
  const router = useRouter();
  const [leftSlotWidth, setLeftSlotWidth] = useState(0);
  const [rightSlotWidth, setRightSlotWidth] = useState(0);

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
        <Clickable
          onPress={handleBackPress}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={[styles.backButton, { backgroundColor: palette.surface }]}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons name={backIcon} size={20} color={palette.foreground} />
        </Clickable>
      );
    }
    return null;
  };

  // Support rightAction as an alias for right
  const rightContent = right ?? rightAction;
  const leftNode = renderLeft();
  const rightNode =
    rightContent || action || actionIcon ? (
      <Row align="center">
        {rightContent || (
          <Clickable
            style={[
              styles.actionButton,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
            onPress={onActionPress}
            accessibilityRole="button"
            accessibilityLabel={action ?? 'Header action'}
          >
            <Row align="center" gap={Spacing.xs / 2}>
              {actionIcon ? <Ionicons name={actionIcon} size={18} color={palette.foreground} /> : null}
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
            </Row>
          </Clickable>
        )}
      </Row>
    ) : null;
  const balancedEdgeWidth = Math.max(44, leftSlotWidth, rightSlotWidth);
  const shouldBalanceEdges = leftSlotWidth > 44 || rightSlotWidth > 44;

  if (centerTitle) {
    return (
      <View style={[styles.container, containerStyle]}>
        <Row align="center" style={styles.centerRow}>
          <View
            style={[styles.edgeSlot, shouldBalanceEdges ? { width: balancedEdgeWidth } : undefined]}
            onLayout={(event) => {
              const nextWidth = Math.ceil(event.nativeEvent.layout.width);
              setLeftSlotWidth((prev) => (prev === nextWidth ? prev : nextWidth));
            }}
          >
            {leftNode}
          </View>
          <View style={[styles.titleContainer, styles.centerTitleContainer]}>
            <ThemedText type="title" style={[styles.title, styles.centerTitleText]} numberOfLines={1}>
              {title}
            </ThemedText>
            {subtitle ? (
              <ThemedText
                style={[styles.subtitle, styles.centerSubtitleText, { color: palette.muted }]}
                numberOfLines={1}
              >
                {subtitle}
              </ThemedText>
            ) : null}
          </View>
          <View
            style={[
              styles.edgeSlot,
              styles.rightEdgeSlot,
              shouldBalanceEdges ? { width: balancedEdgeWidth } : undefined,
            ]}
            onLayout={(event) => {
              const nextWidth = Math.ceil(event.nativeEvent.layout.width);
              setRightSlotWidth((prev) => (prev === nextWidth ? prev : nextWidth));
            }}
          >
            {rightNode}
          </View>
        </Row>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <Row align="center" gap="sm">
        {leftNode}
        <View style={styles.titleContainer}>
          <ThemedText type="title" style={styles.title}>
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText style={[styles.subtitle, { color: palette.muted }]}>{subtitle}</ThemedText>
          ) : null}
        </View>
        {rightNode}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  centerRow: {
    minHeight: 44,
  },
  edgeSlot: {
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightEdgeSlot: {
    alignItems: 'flex-end',
  },
  titleContainer: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  centerTitleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  title: { ...Typography.title, letterSpacing: -0.3 },
  centerTitleText: {
    textAlign: 'center',
  },
  subtitle: { ...Typography.caption, fontWeight: '400' },
  centerSubtitleText: {
    textAlign: 'center',
  },
  actionButton: {
    paddingHorizontal: Spacing.sm,
    borderRadius: Components.buttonCompact.borderRadius,
    minHeight: 44,
    borderWidth: 1,
    justifyContent: 'center',
  },
  actionText: { ...Typography.smallSemiBold, letterSpacing: -0.05 },
  actionTextOnly: {
    paddingHorizontal: Spacing.xs / 2,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
