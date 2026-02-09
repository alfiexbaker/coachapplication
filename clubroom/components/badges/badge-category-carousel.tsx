/**
 * BadgeCategoryCarousel — Horizontal scroll of category progress cards.
 *
 * Displays each badge category (leadership, technique, etc.) with
 * badge count, milestone progress bar, and current milestone badge.
 */

import { memo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BadgeCategory } from '@/constants/types';

export interface CategoryBreakdownItem {
  category: BadgeCategory;
  label: string;
  icon: string;
  badgeCount: number;
  currentMilestone: string;
  nextMilestone: string | null;
  badgesToNext: number;
  progressPercent: number;
  totalPoints: number;
}

interface BadgeCategoryCarouselProps {
  categories: CategoryBreakdownItem[];
}

const CATEGORY_ICONS: Record<BadgeCategory, keyof typeof Ionicons.glyphMap> = {
  leadership: 'people',
  consistency: 'refresh',
  technique: 'football',
  mindset: 'bulb',
  teamwork: 'hand-left',
  resilience: 'fitness',
};

const CategoryCard = memo(function CategoryCard({
  cat,
}: {
  cat: CategoryBreakdownItem;
}) {
  const { colors: palette } = useTheme();
  const hasActivity = cat.badgeCount > 0;

  return (
    <View
      style={[
        styles.categoryCard,
        {
          backgroundColor: hasActivity ? withAlpha(palette.tint, 0.03) : palette.surface,
          borderColor: hasActivity ? palette.tint : palette.border,
        },
      ]}
    >
      <View style={[styles.categoryIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
        <Ionicons
          name={CATEGORY_ICONS[cat.category]}
          size={18}
          color={hasActivity ? palette.tint : palette.muted}
        />
      </View>
      <ThemedText
        type="defaultSemiBold"
        style={[styles.categoryLabel, { color: hasActivity ? palette.foreground : palette.muted }]}
      >
        {cat.label}
      </ThemedText>
      <ThemedText style={[styles.categoryCount, { color: palette.tint }]}>
        {cat.badgeCount} badge{cat.badgeCount !== 1 ? 's' : ''}
      </ThemedText>

      {cat.nextMilestone && (
        <Column gap="xxs">
          <ThemedText style={[styles.milestoneText, { color: palette.muted }]}>
            {cat.badgeCount}/{cat.badgeCount + cat.badgesToNext} to {cat.nextMilestone}
          </ThemedText>
          <View style={[styles.miniProgressBar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <View
              style={[
                styles.miniProgressFill,
                { backgroundColor: palette.tint, width: `${cat.progressPercent}%` },
              ]}
            />
          </View>
        </Column>
      )}

      {cat.currentMilestone !== 'None' && (
        <Row gap="xxs" align="center" style={[styles.milestoneBadge, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
          <Ionicons name="checkmark-circle" size={12} color={palette.success} />
          <ThemedText style={[styles.milestoneBadgeText, { color: palette.success }]}>
            {cat.currentMilestone}
          </ThemedText>
        </Row>
      )}
    </View>
  );
});

export const BadgeCategoryCarousel = memo(function BadgeCategoryCarousel({
  categories,
}: BadgeCategoryCarouselProps) {
  const { colors: palette } = useTheme();

  if (categories.length === 0) return null;

  return (
    <SurfaceCard style={styles.sectionCard}>
      <Row justify="between" align="center">
        <ThemedText type="defaultSemiBold">Category Progress</ThemedText>
        <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
          Earn badges to unlock milestones
        </ThemedText>
      </Row>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {categories.map((cat) => (
          <CategoryCard key={cat.category} cat={cat} />
        ))}
      </ScrollView>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  sectionCard: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  sectionHint: {
    ...Typography.caption,
  },
  categoryScroll: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  categoryCard: {
    width: 140,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    ...Typography.bodySmall,
  },
  categoryCount: {
    ...Typography.caption,
  },
  milestoneText: {
    ...Typography.micro,
  },
  miniProgressBar: {
    height: 4,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: Radii.xs,
  },
  milestoneBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
  },
  milestoneBadgeText: {
    ...Typography.micro,
  },
});
