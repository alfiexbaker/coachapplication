import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
  const scheme = useColorScheme() ?? 'light';
  const baseColor = Colors[scheme];

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        dense ? styles.dense : undefined,
        {
          backgroundColor: isActive ? `${baseColor.tint}15` : baseColor.surface,
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
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
    marginRight: 0,
    marginBottom: 0,
  },
});
