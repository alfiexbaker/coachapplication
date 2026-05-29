import { View, FlatList, StyleSheet, type ListRenderItemInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { AthleteProgress } from '@/services/progress-service';
import { useTheme } from '@/hooks/useTheme';

function BadgesSectionInner({
  badges,
  onViewAll,
}: {
  badges: AthleteProgress['recentBadges'];
  onViewAll?: () => void;
}) {
  const { colors: palette } = useTheme();

  if (badges.length === 0) {
    return (
      <SurfaceCard style={styles.emptyCard}>
        <Ionicons name="ribbon-outline" size={24} color={palette.muted} />
        <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
          No badges earned yet
        </ThemedText>
      </SurfaceCard>
    );
  }
  const badgeItems = getBadgeItems(badges, onViewAll, palette);

  return (
    <FlatList
      horizontal
      data={badgeItems}
      keyExtractor={keyBadgeItem}
      renderItem={renderBadgeItem}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    />
  );
}

export const BadgesSection = BadgesSectionInner;

type BadgeItem =
  | {
      kind: 'badge';
      key: string;
      label: string;
      awardedAt: string;
      tint: string;
      muted: string;
      backgroundColor: string;
    }
  | {
      kind: 'viewAll';
      key: string;
      tint: string;
      onPress: () => void;
    };

function getBadgeItems(
  badges: AthleteProgress['recentBadges'],
  onViewAll: (() => void) | undefined,
  palette: ReturnType<typeof useTheme>['colors'],
): BadgeItem[] {
  const items: BadgeItem[] = badges.map((badge) => ({
    kind: 'badge',
    key: badge.id,
    label: badge.label,
    awardedAt: badge.awardedAt,
    tint: palette.tint,
    muted: palette.muted,
    backgroundColor: withAlpha(palette.tint, 0.06),
  }));

  if (onViewAll && badges.length >= 5) {
    items.push({ kind: 'viewAll', key: 'view-all', tint: palette.tint, onPress: onViewAll });
  }

  return items;
}

function keyBadgeItem(item: BadgeItem) {
  return item.key;
}

function renderBadgeItem({ item }: ListRenderItemInfo<BadgeItem>) {
  if (item.kind === 'viewAll') {
    return (
      <SurfaceCard style={styles.viewAllCard} onPress={item.onPress} tactile>
        <Ionicons name="arrow-forward" size={20} color={item.tint} />
        <ThemedText style={[styles.viewAllText, { color: item.tint }]}>View All</ThemedText>
      </SurfaceCard>
    );
  }

  return (
    <View style={[styles.badgeCard, { backgroundColor: item.backgroundColor }]}>
      <Ionicons name="ribbon" size={20} color={item.tint} />
      <ThemedText style={styles.badgeLabel} numberOfLines={1}>
        {item.label}
      </ThemedText>
      <ThemedText style={[styles.badgeDate, { color: item.muted }]}>
        {new Date(item.awardedAt).toLocaleDateString('en-GB', {
          month: 'short',
          day: 'numeric',
        })}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: Spacing.sm, paddingRight: Spacing.md },
  emptyCard: { alignItems: 'center', padding: Spacing.lg, gap: Spacing.xs },
  emptyText: { ...Typography.bodySmall },
  badgeCard: {
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    gap: Spacing.xxs,
    minWidth: 80,
  },
  badgeLabel: { ...Typography.caption, textAlign: 'center' },
  badgeDate: { ...Typography.micro },
  viewAllCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    minWidth: 70,
    gap: Spacing.xxs,
  },
  viewAllText: { ...Typography.caption },
});
