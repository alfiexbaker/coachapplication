import React, { memo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { ProgressionSummary } from '@/hooks/use-athlete-development';

export interface DevProgressionCardProps {
  summary: ProgressionSummary;
  colors: ThemeColors;
}

export const DevProgressionCard = memo(function DevProgressionCard({
  summary,
  colors,
}: DevProgressionCardProps) {
  return (
    <SurfaceCard style={styles.card}>
      <Row gap="sm" align="center">
        <View style={styles.badge}>
          <Ionicons name="trophy" size={20} color={colors.tint} />
        </View>
        <View style={styles.info}>
          <ThemedText type="defaultSemiBold">
            Level {summary.currentLevel.level}: {summary.currentLevel.name}
          </ThemedText>
          <ThemedText style={[Typography.caption, { color: colors.muted }]}>
            {summary.totalPoints} pts from {summary.totalBadges} badge{summary.totalBadges !== 1 ? 's' : ''}
          </ThemedText>
        </View>
      </Row>

      {summary.nextLevel && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.tint, width: `${summary.progressPercent}%` },
              ]}
            />
          </View>
          <ThemedText style={[styles.progressText, { color: colors.muted }]}>
            {summary.pointsToNext} pts to {summary.nextLevel.name}
          </ThemedText>
        </View>
      )}

      {summary.topCategories.length > 0 && (
        <View style={styles.categoriesSection}>
          <ThemedText style={[Typography.micro, { color: colors.muted }]}>Top categories</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Row gap="xs">
              {summary.topCategories.map((cat) => (
                <View
                  key={cat.category}
                  style={[styles.categoryChip, { backgroundColor: withAlpha(colors.tint, 0.07) }]}
                >
                  <ThemedText style={[Typography.caption, { color: colors.tint }]}>
                    {cat.label}
                  </ThemedText>
                  <View style={[styles.countBadge, { backgroundColor: colors.tint }]}>
                    <ThemedText style={[Typography.micro, { color: colors.onPrimary }]}>
                      {cat.badgeCount}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </Row>
          </ScrollView>
        </View>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  badge: {
    width: Components.avatar.md,
    height: Components.avatar.md,
    borderRadius: Components.avatar.md / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: Spacing.xs,
  },
  progressContainer: {
    gap: Spacing.xs,
  },
  progressBar: {
    height: Spacing.xs,
    borderRadius: Radii.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.sm,
  },
  progressText: {
    ...Typography.micro,
    textTransform: 'none',
    textAlign: 'right',
  },
  categoriesSection: {
    gap: Spacing.xs,
  },
  categoryChip: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  countBadge: {
    minWidth: Components.icon.md,
    height: Components.icon.md,
    borderRadius: Components.icon.md / 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
});
