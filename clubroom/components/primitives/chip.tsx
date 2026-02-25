import { PropsWithChildren, useCallback, useRef } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface ChipProps extends PressableProps {
  active?: boolean;
  selected?: boolean; // Alias for active
  dense?: boolean;
  muted?: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function Chip({
  active,
  selected,
  dense,
  muted,
  label,
  children,
  style,
  ...props
}: PropsWithChildren<ChipProps>) {
  // Support both 'active' and 'selected' props
  const isActive = active ?? selected ?? false;
  const { colors: baseColor } = useTheme();
  const isInteractive = Boolean(props.onPress || props.onLongPress || props.onPressIn || props.onPressOut);
  const lastPressRef = useRef(0);

  const containerStyles = [
    styles.base,
    dense ? styles.dense : undefined,
    {
      backgroundColor: isActive ? withAlpha(baseColor.tint, 0.09) : 'transparent',
      borderColor: muted ? withAlpha(baseColor.border, 0.5) : isActive ? baseColor.tint : baseColor.border,
    },
    style,
  ];

  const fontWeight: TextStyle['fontWeight'] = isActive ? '600' : muted ? '400' : '500';
  const labelStyles = [
    dense ? Typography.xs : Typography.sm,
    muted ? { fontSize: Typography.micro.fontSize } : undefined,
    {
      color: isActive ? baseColor.tint : baseColor.muted,
      fontWeight,
    },
  ];

  if (!isInteractive) {
    return (
      <View style={containerStyles}>
        <Text style={labelStyles}>{label ?? children}</Text>
      </View>
    );
  }

  const {
    onPress,
    onLongPress,
    onPressIn,
    onPressOut,
    delayLongPress,
    disabled,
    hitSlop,
    accessibilityLabel,
    accessibilityHint,
    accessibilityRole,
    accessibilityState,
  } = props;

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      if (disabled) return;
      const now = Date.now();
      if (now - lastPressRef.current < 300) return;
      lastPressRef.current = now;
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress?.(event);
    },
    [disabled, onPress],
  );

  return (
    <Clickable
      style={({ pressed }) => [
        containerStyles,
        { opacity: pressed ? 0.8 : 1 },
      ]}
      onPress={handlePress}
      onLongPress={onLongPress ?? undefined}
      onPressIn={onPressIn ?? undefined}
      onPressOut={onPressOut ?? undefined}
      delayLongPress={delayLongPress ?? undefined}
      disabled={disabled ?? undefined}
      hitSlop={hitSlop ?? undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole ?? 'button'}
      accessibilityState={accessibilityState}
    >
      <Text style={labelStyles}>{label ?? children}</Text>
    </Clickable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radii.pill,
    borderWidth: 1,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dense: {
    paddingVertical: Spacing.micro,
    paddingHorizontal: Spacing.sm,
    marginRight: 0,
    marginBottom: 0,
  },
});
