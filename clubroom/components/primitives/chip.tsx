import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface ChipProps extends PressableProps {
  active?: boolean;
  dense?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ active, dense, children, style, ...props }: PropsWithChildren<ChipProps>) {
  const scheme = useColorScheme() ?? 'light';
  const baseColor = Colors[scheme];

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        dense && styles.dense,
        {
          backgroundColor: active ? `${baseColor.tint}15` : baseColor.surface,
          borderColor: active ? baseColor.tint : baseColor.border,
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
      {...props}>
      <Text
        style={[
          dense ? Typography.xs : Typography.sm,
          {
            color: active ? baseColor.tint : baseColor.muted,
            fontWeight: active ? '600' : '500',
          },
        ]}>
        {children}
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
