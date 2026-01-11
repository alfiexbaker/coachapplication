/**
 * CategoryBadge Component
 *
 * A styled badge that displays the goal category with an icon and color.
 * Used to visually identify the type of goal (Speed, Technique, Fitness, etc.)
 */

import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import type { GoalCategory } from '@/constants/types';
import { goalService } from '@/services/goal-service';
import { scaleFont } from '@/utils/scale';

interface CategoryBadgeProps {
  /** The goal category to display */
  category: GoalCategory;
  /** Size variant of the badge */
  size?: 'small' | 'medium' | 'large';
  /** Whether to show just the icon (no label) */
  iconOnly?: boolean;
  /** Whether to show filled background or just text */
  variant?: 'filled' | 'text';
}

/**
 * A badge displaying the goal category with icon and color.
 *
 * @example
 * ```tsx
 * <CategoryBadge category="SPEED" />
 * <CategoryBadge category="TECHNIQUE" size="small" />
 * <CategoryBadge category="FITNESS" iconOnly />
 * ```
 */
export function CategoryBadge({
  category,
  size = 'medium',
  iconOnly = false,
  variant = 'filled',
}: CategoryBadgeProps) {
  const { label, icon, color } = goalService.getCategoryInfo(category);

  const sizeStyles = {
    small: {
      paddingHorizontal: Spacing.xs,
      paddingVertical: 2,
      iconSize: 12,
      fontSize: scaleFont(10),
      gap: 3,
    },
    medium: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      iconSize: 14,
      fontSize: scaleFont(12),
      gap: 4,
    },
    large: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 6,
      iconSize: 16,
      fontSize: scaleFont(14),
      gap: 6,
    },
  };

  const currentSize = sizeStyles[size];

  if (variant === 'text') {
    return (
      <View style={[styles.textBadge, { gap: currentSize.gap }]}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={currentSize.iconSize} color={color} />
        {!iconOnly && (
          <ThemedText style={[styles.textLabel, { fontSize: currentSize.fontSize, color }]}>
            {label}
          </ThemedText>
        )}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: `${color}15`,
          paddingHorizontal: iconOnly ? currentSize.paddingVertical + 2 : currentSize.paddingHorizontal,
          paddingVertical: currentSize.paddingVertical,
          gap: currentSize.gap,
        },
      ]}
    >
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={currentSize.iconSize} color={color} />
      {!iconOnly && (
        <ThemedText style={[styles.label, { fontSize: currentSize.fontSize, color }]}>
          {label}
        </ThemedText>
      )}
    </View>
  );
}

/**
 * Row of category badges for filtering or display
 */
export function CategoryBadgeRow({
  categories,
  selectedCategory,
  onSelect,
}: {
  categories: GoalCategory[];
  selectedCategory?: GoalCategory | null;
  onSelect?: (category: GoalCategory) => void;
}) {
  return (
    <View style={styles.badgeRow}>
      {categories.map((category) => {
        const { color } = goalService.getCategoryInfo(category);
        const isSelected = category === selectedCategory;

        return (
          <View
            key={category}
            style={[
              styles.selectableBadge,
              {
                backgroundColor: isSelected ? color : `${color}15`,
                borderColor: color,
              },
            ]}
            onTouchEnd={() => onSelect?.(category)}
          >
            <CategoryBadge
              category={category}
              size="small"
              variant={isSelected ? 'text' : 'filled'}
            />
            {isSelected && (
              <View style={[styles.selectedIndicator, { backgroundColor: color }]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  textBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textLabel: {
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  selectableBadge: {
    position: 'relative',
    borderRadius: Radii.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
});
