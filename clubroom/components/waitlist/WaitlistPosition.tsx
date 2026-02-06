import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii , Typography, Spacing, withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface WaitlistPositionProps {
  /** Position in the waitlist (1 = first in line) */
  position: number;
  /** Total number of people on waitlist (optional) */
  totalWaiting?: number;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Show the ordinal suffix (1st, 2nd, etc.) */
  showOrdinal?: boolean;
  /** Whether to show in compact mode */
  compact?: boolean;
}

export function WaitlistPosition({
  position,
  totalWaiting,
  size = 'medium',
  showOrdinal = false,
  compact = false,
}: WaitlistPositionProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Determine color based on position
  const getPositionColor = () => {
    if (position === 1) return palette.success; // First in line
    if (position <= 3) return palette.warning; // Top 3
    return palette.muted; // Others
  };

  const color = getPositionColor();

  // Get ordinal suffix
  const getOrdinalSuffix = (n: number): string => {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
  };

  const sizeStyles = {
    small: {
      container: styles.containerSmall,
      icon: 12,
      position: styles.positionSmall,
      label: styles.labelSmall,
    },
    medium: {
      container: styles.containerMedium,
      icon: 16,
      position: styles.positionMedium,
      label: styles.labelMedium,
    },
    large: {
      container: styles.containerLarge,
      icon: 20,
      position: styles.positionLarge,
      label: styles.labelLarge,
    },
  };

  const currentSize = sizeStyles[size];

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: withAlpha(color, 0.09) }]}>
        <ThemedText style={[styles.compactText, { color }]}>
          #{position}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, currentSize.container, { backgroundColor: withAlpha(color, 0.09) }]}>
      <View style={styles.positionRow}>
        <Ionicons name="time" size={currentSize.icon} color={color} />
        <ThemedText style={[currentSize.position, { color }]}>
          {showOrdinal ? `${position}${getOrdinalSuffix(position)}` : `#${position}`}
        </ThemedText>
      </View>

      {totalWaiting !== undefined && totalWaiting > 1 && (
        <ThemedText style={[currentSize.label, { color: palette.muted }]}>
          of {totalWaiting}
        </ThemedText>
      )}

      {position === 1 && (
        <View style={[styles.nextBadge, { backgroundColor: color }]}>
          <ThemedText style={styles.nextBadgeText}>Next</ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: Radii.md,
    gap: Spacing.micro,
  },
  containerSmall: {
    padding: Spacing.xxs,
    minWidth: 40,
  },
  containerMedium: {
    padding: 8,
    minWidth: 50,
  },
  containerLarge: {
    padding: Spacing.xs + Spacing.xxs,
    minWidth: 60,
  },
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  positionSmall: { ...Typography.bodySmallSemiBold },
  positionMedium: { ...Typography.heading },
  positionLarge: { ...Typography.display },
  labelSmall: { ...Typography.micro },
  labelMedium: { ...Typography.micro },
  labelLarge: { ...Typography.caption },
  nextBadge: {
    marginTop: Spacing.xxs,
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  nextBadgeText: { ...Typography.micro, color: Colors.light.onPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5 },
  compactContainer: {
    paddingHorizontal: 8,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  compactText: { ...Typography.caption },
});
