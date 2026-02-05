/**
 * DifficultyBadge Component
 *
 * Displays a colored badge indicating drill difficulty level.
 * Uses traffic light coloring: green (beginner), amber (intermediate), red (advanced).
 */

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii } from '@/constants/theme';
import type { DrillDifficulty } from '@/constants/types';
import { drillService } from '@/services/drill-service';
import { scaleFont } from '@/utils/scale';

interface DifficultyBadgeProps {
  /** The difficulty level to display */
  difficulty: DrillDifficulty;
  /** Size variant */
  size?: 'small' | 'medium';
}

/**
 * Badge component showing drill difficulty with appropriate color coding.
 */
export function DifficultyBadge({ difficulty, size = 'medium' }: DifficultyBadgeProps) {
  const { label, color, bgColor } = drillService.getDifficultyInfo(difficulty);

  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bgColor },
        isSmall ? styles.badgeSmall : undefined,
      ]}
    >
      <ThemedText
        style={[
          styles.text,
          { color },
          isSmall ? styles.textSmall : undefined,
        ]}
      >
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  text: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  textSmall: {
    fontSize: scaleFont(10),
  },
});
