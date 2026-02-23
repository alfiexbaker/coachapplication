import { PropsWithChildren } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

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
    muted ? { fontSize: 11 } : undefined,
    {
      color: isActive ? baseColor.tint : muted ? baseColor.mutedForeground : baseColor.muted,
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

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        containerStyles,
        { opacity: pressed ? 0.8 : 1 },
      ]}
      {...props}
    >
      <Text style={labelStyles}>{label ?? children}</Text>
    </Pressable>
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
