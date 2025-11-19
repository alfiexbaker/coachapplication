import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface BadgeProps {
  label: string;
  tone?: 'success' | 'warning' | 'default';
}

export function Badge({ label, tone = 'default' }: BadgeProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const backgroundMap = {
    success: `${palette.success}22`,
    warning: `${palette.warning}22`,
    default: `${palette.muted}22`,
  } as const;
  const textMap = {
    success: palette.success,
    warning: palette.warning,
    default: palette.muted,
  } as const;

  return (
    <View style={[styles.badge, { backgroundColor: backgroundMap[tone] }]}>
      <Text style={[Typography.xs, styles.label, { color: textMap[tone] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  label: {
    fontWeight: '600',
  },
});
