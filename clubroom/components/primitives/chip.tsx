import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface ChipProps extends PressableProps {
  active?: boolean;
  selected?: boolean; // Alias for active
  dense?: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ active, selected, dense, label, children, style, ...props }: PropsWithChildren<ChipProps>) {
  // Support both 'active' and 'selected' props
  const isActive = active ?? selected ?? false;
  const { colors: baseColor } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        dense ? styles.dense : undefined,
        {
          backgroundColor: isActive ? withAlpha(baseColor.tint, 0.09) : baseColor.surface,
          borderColor: isActive ? baseColor.tint : baseColor.border,
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
      {...props}>
      <Text
        style={[
          dense ? Typography.xs : Typography.sm,
          {
            color: isActive ? baseColor.tint : baseColor.muted,
            fontWeight: isActive ? '600' : '500',
          },
        ]}>
        {label ?? children}
      </Text>
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
