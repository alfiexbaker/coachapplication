/**
 * Extracted sub-components for GoalList.
 *
 * GoalListSkeleton — loading skeleton for goal cards.
 * GoalSectionHeader — section header with icon + count badge.
 * GoalListEmptyState — animated empty state with CTA.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/primitives/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spacing, Radii, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';
import { Row } from '@/components/primitives';

// ─── GoalListSkeleton ─────────────────────────────────────────────────────────

interface GoalListSkeletonProps {
  count?: number;
  variant?: 'default' | 'compact' | 'featured';
  palette: ThemeColors;
}

const SKELETON_HEIGHTS = {
  default: 140,
  compact: 72,
  featured: 200,
};

export const GoalListSkeletonInner = memo(function GoalListSkeletonInner({
  count = 3,
  variant = 'default',
  palette,
}: GoalListSkeletonProps) {
  return (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.skeletonCard,
            {
              height: SKELETON_HEIGHTS[variant],
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <Skeleton width="30%" height={20} />
          <Skeleton width="80%" height={16} style={{ marginTop: Spacing.xs + Spacing.xxs }} />
          <Skeleton width="60%" height={14} style={{ marginTop: Spacing.xs }} />
          {variant === 'featured' && (
            <>
              <Skeleton width="100%" height={12} style={{ marginTop: Spacing.sm }} />
              <Skeleton width="90%" height={12} style={{ marginTop: Spacing.xxs }} />
            </>
          )}
        </View>
      ))}
    </View>
  );
});

// ─── GoalSectionHeader ────────────────────────────────────────────────────────

interface GoalSectionHeaderProps {
  title: string;
  count?: number;
  icon?: string;
  color?: string;
  palette: ThemeColors;
}

export const GoalSectionHeaderInner = memo(function GoalSectionHeaderInner({
  title,
  count,
  icon,
  color,
  palette,
}: GoalSectionHeaderProps) {
  return (
    <Row style={styles.sectionHeader}>
      <Row style={styles.sectionTitleRow}>
        {icon && (
          <Ionicons
            name={icon as keyof typeof Ionicons.glyphMap}
            size={20}
            color={color ?? palette.tint}
          />
        )}
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          {title}
        </ThemedText>
      </Row>
      {count !== undefined && (
        <View style={[styles.countBadge, { backgroundColor: palette.surfaceSecondary }]}>
          <ThemedText style={[styles.countText, { color: palette.muted }]}>{count}</ThemedText>
        </View>
      )}
    </Row>
  );
});

// ─── GoalListEmptyState ───────────────────────────────────────────────────────

interface GoalListEmptyStateProps {
  title: string;
  message: string;
  showCreateButton: boolean;
  onCreateGoal?: () => void;
  palette: ThemeColors;
}

export const GoalListEmptyState = memo(function GoalListEmptyState({
  title,
  message,
  showCreateButton,
  onCreateGoal,
  palette,
}: GoalListEmptyStateProps) {
  return (
    <Animated.View entering={FadeIn.delay(200)} style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: withAlpha(palette.tint, 0.15) }]}>
        <Ionicons name="flag-outline" size={48} color={palette.tint} />
      </View>
      <ThemedText type="subtitle" style={styles.emptyTitle}>
        {title}
      </ThemedText>
      <ThemedText style={[styles.emptyText, { color: palette.muted }]}>{message}</ThemedText>
      {showCreateButton && onCreateGoal && (
        <Button onPress={onCreateGoal} style={styles.emptyButton}>
          Create Goal
        </Button>
      )}
    </Animated.View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: scaleFont(15),
    lineHeight: scaleFont(22),
    maxWidth: 280,
  },
  emptyButton: {
    marginTop: Spacing.sm,
  },
  skeletonContainer: {
    gap: Spacing.md,
    paddingTop: Spacing.md,
  },
  skeletonCard: {
    borderRadius: Radii.lg,
    borderWidth: 0.75,
    padding: Spacing.md,
  },
  sectionHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  sectionTitleRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontSize: scaleFont(16),
  },
  countBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  countText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
  },
});
