import { StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native';

import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type BadgeTone = 'success' | 'warning' | 'error' | 'info' | 'secondary' | 'default';
export type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  size?: BadgeSize;
  /** Show outline border in addition to background */
  outlined?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Badge component for displaying status, labels, or tags.
 * Use Badge for display-only indicators.
 * Use Chip for interactive/selectable items.
 *
 * @example
 * ```tsx
 * <Badge label="Confirmed" tone="success" />
 * <Badge label="Pending" tone="warning" size="sm" />
 * <Badge label="Cancelled" tone="error" outlined />
 * ```
 */
export function Badge({ label, tone = 'default', size = 'md', outlined = false, style }: BadgeProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const colorMap: Record<BadgeTone, string> = {
    success: palette.success,
    warning: palette.warning,
    error: palette.error,
    info: palette.tint,
    secondary: palette.secondary,
    default: palette.muted,
  };

  const color = colorMap[tone];
  const backgroundColor = `${color}22`;

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.badgeSm,
        { backgroundColor },
        outlined && { borderWidth: 1, borderColor: color },
        style,
      ]}
    >
      <Text
        style={[
          size === 'sm' ? Typography.xs : styles.label,
          { color, fontWeight: '700', letterSpacing: 0.4 },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  badgeSm: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  label: {
    fontSize: 12,
    lineHeight: 18,
  },
});
