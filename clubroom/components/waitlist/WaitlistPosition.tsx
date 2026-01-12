import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii } from '@/constants/theme';
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
      <View style={[styles.compactContainer, { backgroundColor: `${color}15` }]}>
        <ThemedText style={[styles.compactText, { color }]}>
          #{position}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, currentSize.container, { backgroundColor: `${color}15` }]}>
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
    gap: 2,
  },
  containerSmall: {
    padding: 6,
    minWidth: 40,
  },
  containerMedium: {
    padding: 8,
    minWidth: 50,
  },
  containerLarge: {
    padding: 12,
    minWidth: 60,
  },
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  positionSmall: {
    fontSize: 14,
    fontWeight: '700',
  },
  positionMedium: {
    fontSize: 18,
    fontWeight: '700',
  },
  positionLarge: {
    fontSize: 24,
    fontWeight: '700',
  },
  labelSmall: {
    fontSize: 9,
  },
  labelMedium: {
    fontSize: 10,
  },
  labelLarge: {
    fontSize: 12,
  },
  nextBadge: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nextBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  compactText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
