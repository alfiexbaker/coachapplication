import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface AlertCountBadgeProps {
  count: number;
  type?: 'allergy' | 'condition' | 'medication' | 'total';
}

export function AlertCountBadge({ count, type = 'allergy' }: AlertCountBadgeProps) {
  const { colors: palette } = useTheme();

  if (count === 0) {
    return null;
  }

  const color =
    type === 'allergy'
      ? palette.error
      : type === 'condition'
        ? palette.warning
        : type === 'medication'
          ? palette.tint
          : count >= 3
            ? palette.error
            : count >= 1
              ? palette.warning
              : palette.muted;

  return (
    <View style={[styles.countBadge, { backgroundColor: withAlpha(color, 0.09) }]}>
      <ThemedText style={[styles.countText, { color }]}>{count}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  countText: { ...Typography.caption },
});
