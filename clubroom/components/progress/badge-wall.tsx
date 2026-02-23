import { memo, useMemo, useState, type ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { CORNER_COLORS } from '@/constants/four-corner-mapping';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { MEANINGFUL_SKILL_BADGE_IDS } from '@/constants/badge-registry';
import type { AllBadgeWithProgress } from '@/services/badge-service';
import { BadgeCircle } from './badge-circle';
import { BadgeDetailModal } from './badge-detail-modal';

interface BadgeWallProps {
  badges: AllBadgeWithProgress[];
  athleteName?: string;
  onViewFull?: () => void;
}

const CATEGORY_ORDER = ['technical', 'physical', 'psychological', 'social', 'other'] as const;

const CATEGORY_LABELS: Record<(typeof CATEGORY_ORDER)[number], string> = {
  technical: 'Technical',
  physical: 'Physical',
  psychological: 'Psychological',
  social: 'Social',
  other: 'Other',
};

const CATEGORY_ICONS: Record<(typeof CATEGORY_ORDER)[number], ComponentProps<typeof Ionicons>['name']> = {
  technical: 'football-outline',
  physical: 'fitness-outline',
  psychological: 'bulb-outline',
  social: 'people-outline',
  other: 'ribbon-outline',
};

// MEANINGFUL_SKILL_BADGE_IDS imported from @/constants/badge-registry

export const BadgeWall = memo(function BadgeWall({ badges, athleteName, onViewFull }: BadgeWallProps) {
  const { colors } = useTheme();
  const [selectedBadge, setSelectedBadge] = useState<AllBadgeWithProgress | null>(null);
  const [showAllBadges, setShowAllBadges] = useState(false);

  const curatedBadges = useMemo(
    () =>
      badges.filter((badge) => {
        if (badge.badgeType === 'skill') {
          return MEANINGFUL_SKILL_BADGE_IDS.has(badge.id);
        }
        return badge.badgeType === 'milestone' || badge.badgeType === 'event';
      }),
    [badges],
  );
  const visibleBadges = useMemo(
    () => (showAllBadges ? curatedBadges : curatedBadges.filter((badge) => badge.isUnlocked)),
    [curatedBadges, showAllBadges],
  );

  const grouped = useMemo(() => {
    const groups: Record<(typeof CATEGORY_ORDER)[number], AllBadgeWithProgress[]> = {
      technical: [],
      physical: [],
      psychological: [],
      social: [],
      other: [],
    };

    for (const badge of visibleBadges) {
      if (!badge.category) {
        groups.other.push(badge);
      } else if (badge.category in groups) {
        groups[badge.category].push(badge);
      } else {
        groups.other.push(badge);
      }
    }

    return groups;
  }, [visibleBadges]);

  const unlockedCount = curatedBadges.filter((badge) => badge.isUnlocked).length;

  return (
    <>
      <SurfaceCard style={styles.card}>
        <Column gap="sm">
          <Row align="center" justify="between">
            <ThemedText style={styles.title}>Badge Wall</ThemedText>
            <ThemedText style={[styles.counter, { color: colors.muted }]}>
              {unlockedCount}/{curatedBadges.length || 0}
            </ThemedText>
          </Row>

          <Row align="center" justify="between">
            <ThemedText style={[styles.filterLabel, { color: colors.muted }]}>
              {showAllBadges ? 'Showing all curated badges' : 'Showing earned badges'}
            </ThemedText>
            <Clickable
              style={[
                styles.filterToggle,
                {
                  borderColor: withAlpha(colors.tint, 0.24),
                  backgroundColor: withAlpha(colors.tint, 0.08),
                },
              ]}
              onPress={() => setShowAllBadges((prev) => !prev)}
              accessibilityLabel={showAllBadges ? 'Show earned badges only' : 'Show all curated badges'}
              accessibilityRole="button"
            >
              <ThemedText style={[styles.filterToggleText, { color: colors.tint }]}>
                {showAllBadges ? 'Earned only' : 'View all'}
              </ThemedText>
            </Clickable>
          </Row>

          {visibleBadges.length === 0 ? (
            <ThemedText style={[styles.emptyText, { color: colors.muted }]}>
              No earned badges yet.
            </ThemedText>
          ) : (
            <Column gap="sm">
              {CATEGORY_ORDER.map((category) =>
                grouped[category].length > 0 ? (
                  <Animated.View
                    key={category}
                    entering={FadeInDown.delay(CATEGORY_ORDER.indexOf(category) * 80).springify()}
                  >
                    <Column gap="xs">
                      <Row align="center" gap="xxs">
                        <Ionicons
                          name={CATEGORY_ICONS[category]}
                          size={14}
                          color={category in CORNER_COLORS ? CORNER_COLORS[category as keyof typeof CORNER_COLORS] : colors.muted}
                        />
                        <ThemedText style={[styles.categoryLabel, { color: category in CORNER_COLORS ? CORNER_COLORS[category as keyof typeof CORNER_COLORS] : colors.muted }]}>
                          {CATEGORY_LABELS[category]}
                        </ThemedText>
                      </Row>
                      <Row wrap gap="xs">
                        {grouped[category].map((badge, badgeIndex) => (
                          <Animated.View
                            key={badge.id}
                            entering={FadeInDown.delay(
                              CATEGORY_ORDER.indexOf(category) * 80 + badgeIndex * 28,
                            ).springify()}
                          >
                            <BadgeCircle badge={badge} onPress={setSelectedBadge} />
                          </Animated.View>
                        ))}
                      </Row>
                    </Column>
                  </Animated.View>
                ) : null,
              )}
            </Column>
          )}

          {onViewFull ? (
            <Clickable
              style={styles.viewAllButton}
              onPress={onViewFull}
              accessibilityLabel="View full badge collection"
              accessibilityRole="button"
            >
              <Row align="center" gap="xxs">
                <ThemedText style={[styles.viewAllText, { color: colors.tint }]}>
                  View full collection
                </ThemedText>
                <Ionicons name="arrow-forward" size={14} color={colors.tint} />
              </Row>
            </Clickable>
          ) : null}
        </Column>
      </SurfaceCard>

      <BadgeDetailModal
        badge={selectedBadge}
        visible={Boolean(selectedBadge)}
        athleteName={athleteName}
        onClose={() => setSelectedBadge(null)}
      />
    </>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  title: {
    ...Typography.subheading,
    fontWeight: '700',
  },
  counter: {
    ...Typography.caption,
  },
  filterLabel: {
    ...Typography.caption,
  },
  filterToggle: {
    minHeight: 30,
    borderWidth: 1,
    borderRadius: Radii.sm,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  filterToggleText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  emptyText: {
    ...Typography.bodySmall,
  },
  categoryLabel: {
    ...Typography.caption,
  },
  viewAllButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  viewAllText: {
    ...Typography.bodySmallSemiBold,
  },
});
