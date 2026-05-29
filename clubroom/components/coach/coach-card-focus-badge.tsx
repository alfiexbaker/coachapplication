import { StyleSheet, View } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/useTheme';

export interface FocusBadgeProps {
  focus: string;
}

export function FocusBadge({ focus }: FocusBadgeProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={[styles.focusBadge, { backgroundColor: palette.surfaceSecondary }]}>
      <ThemedText style={[styles.focusText, { color: palette.muted }]}>{focus}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  focusBadge: {
    paddingHorizontal: Spacing.sm - 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
  },
  focusText: { ...Typography.caption },
});
