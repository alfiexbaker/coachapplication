import { View, StyleSheet, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { BadgeCard } from './badge-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { AllBadgeWithProgress } from '@/services/badge-service';
import { useTheme } from '@/hooks/useTheme';

import { BadgeSectionGridInner, BadgeStatsInner } from './badge-grid-sections';

interface BadgeGridProps {
  badges: AllBadgeWithProgress[];
  title?: string;
  subtitle?: string;
  onBadgePress?: (badge: AllBadgeWithProgress) => void;
  showCounts?: boolean;
  columns?: 2 | 3;
  compact?: boolean;
}

export function BadgeGrid({
  badges,
  title,
  subtitle,
  onBadgePress,
  showCounts = true,
  columns = 2,
  compact = false,
}: BadgeGridProps) {
  const { colors: palette } = useTheme();
  const { width } = useWindowDimensions();

  const containerPadding = Spacing.sm * 2;
  const gapWidth = Spacing.sm * (columns - 1);
  const cardWidth = (width - containerPadding - gapWidth - Spacing.lg * 2) / columns;

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;
  const totalCount = badges.length;

  if (badges.length === 0) return null;

  return (
    <SurfaceCard style={styles.container}>
      {(title || showCounts) && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {title && (
              <ThemedText type="defaultSemiBold" style={styles.title}>{title}</ThemedText>
            )}
            {subtitle && (
              <ThemedText style={[styles.subtitle, { color: palette.muted }]}>{subtitle}</ThemedText>
            )}
          </View>
          {showCounts && (
            <View style={[styles.countPill, { backgroundColor: withAlpha(palette.tint, 0.07) }]}>
              <ThemedText style={[styles.countText, { color: palette.tint }]}>
                {unlockedCount}/{totalCount}
              </ThemedText>
            </View>
          )}
        </View>
      )}

      <View style={[styles.grid, { gap: Spacing.sm }]}>
        {badges.map((badge) => (
          <View key={badge.id} style={{ width: cardWidth }}>
            <BadgeCard
              badge={badge}
              onPress={onBadgePress ? () => onBadgePress(badge) : undefined}
              compact={compact}
            />
          </View>
        ))}
      </View>
    </SurfaceCard>
  );
}

// Thin wrappers for backward compat
export function BadgeSectionGrid(props: {
  sectionKey: string;
  badges: AllBadgeWithProgress[];
  onBadgePress?: (badge: AllBadgeWithProgress) => void;
  columns?: 2 | 3;
}) {
  const { colors: palette } = useTheme();
  return <BadgeSectionGridInner {...props} palette={palette} />;
}

export function BadgeStats(props: {
  totalBadges: number;
  unlockedBadges: number;
  totalPoints: number;
}) {
  const { colors: palette } = useTheme();
  return <BadgeStatsInner {...props} palette={palette} />;
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    gap: Spacing.micro,
  },
  title: { ...Typography.subheading },
  subtitle: { ...Typography.caption },
  countPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  countText: { ...Typography.caption },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
