/**
 * ListItem Primitive
 *
 * Standard list row with optional left icon/avatar, title, subtitle, right slot, and press handler.
 *
 * Usage:
 *   <ListItem title="Notifications" leftIcon="notifications" right={<Badge label="3" />} onPress={nav} />
 *   <ListItem title="John Doe" subtitle="Coach" leftAvatar={{ uri: img, name: "JD" }} />
 *   <ListItem title="Compact row" compact />
 */

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Components, Fonts, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Avatar, type AvatarProps } from './Avatar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ListItemProps {
  /** Primary text */
  title: string;
  /** Secondary text */
  subtitle?: string;
  /** Ionicons icon name for the left slot */
  leftIcon?: keyof typeof Ionicons.glyphMap;
  /** Avatar props for the left slot (takes precedence over leftIcon) */
  leftAvatar?: Pick<AvatarProps, 'uri' | 'name'>;
  /** Right-side element: chevron, switch, badge, text, etc. */
  right?: React.ReactNode;
  /** Press handler — makes the item interactive */
  onPress?: () => void;
  /** Use compact height */
  compact?: boolean;
  /** Additional container styles */
  style?: StyleProp<ViewStyle>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ListItemInner({
  title,
  subtitle,
  leftIcon,
  leftAvatar,
  right,
  onPress,
  compact = false,
  style,
}: ListItemProps) {
  const { colors } = useTheme();
  const minHeight = compact ? Components.listItem.compact : Components.listItem.standard;

  const themedStyles = useMemo(
    () => ({
      pressed: { backgroundColor: colors.overlay },
      iconContainer: { backgroundColor: colors.surfaceSecondary },
      title: { color: colors.foreground },
      subtitle: { color: colors.muted },
    }),
    [colors],
  );

  const content = (
    <Row align="center" gap={compact ? 'xs' : 'sm'} flex>
      {/* Left slot */}
      {leftAvatar ? (
        <Avatar uri={leftAvatar.uri} name={leftAvatar.name} size={compact ? 'sm' : 'sm'} />
      ) : leftIcon ? (
        <View style={[styles.iconContainer, themedStyles.iconContainer]}>
          <Ionicons name={leftIcon} size={Components.icon.md} color={colors.icon} />
        </View>
      ) : null}

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, themedStyles.title]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, themedStyles.subtitle]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Right slot */}
      {right != null ? (
        <View style={styles.rightSlot}>{right}</View>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={Components.icon.md} color={colors.muted} />
      ) : null}
    </Row>
  );

  const containerStyle = [
    styles.container,
    compact ? styles.compact : undefined,
    { minHeight },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [...containerStyle, pressed ? themedStyles.pressed : undefined]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={containerStyle}>{content}</View>;
}

export const ListItem = React.memo(ListItemInner);

// ---------------------------------------------------------------------------
// Styles (color-independent)
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  compact: {
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
  },
  iconContainer: {
    width: Components.avatar.sm,
    height: Components.avatar.sm,
    borderRadius: Components.avatar.sm / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: Spacing.micro,
  },
  title: {
    ...Typography.body,
    fontWeight: '500',
    fontFamily: Fonts?.sans,
  },
  subtitle: {
    ...Typography.small,
    fontFamily: Fonts?.sans,
  },
  rightSlot: {
    flexShrink: 0,
  },
});
