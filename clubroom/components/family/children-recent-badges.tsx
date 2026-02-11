/**
 * ChildrenRecentBadges — Horizontal scroll of recent badge awards.
 *
 * Shows badges awarded in the last 7 days across all children.
 * Unseen badges are highlighted with a "NEW" indicator.
 */

import { memo, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BadgeAward } from '@/constants/types';

interface ChildrenRecentBadgesProps {
  badges: BadgeAward[];
  onViewBadge: (badge: BadgeAward) => void;
}

const BadgeItem = memo(function BadgeItem({
  badge,
  onPress,
}: {
  badge: BadgeAward;
  onPress: () => void;
}) {
  const { colors: palette } = useTheme();
  const athleteLabel = badge.athleteId || 'Athlete';
  const coachLabel = (badge.coachId || 'Coach').split(' ')[0];

  return (
    <Clickable
      onPress={onPress}
      accessibilityLabel={`Badge: ${badge.badgeLabel} for ${athleteLabel}`}
      accessibilityRole="button"
    >
      <Column
        align="center"
        gap="xs"
        style={[
          styles.badgeCard,
          { borderColor: badge.seenByParent ? palette.border : palette.warning },
          !badge.seenByParent && { backgroundColor: withAlpha(palette.warning, 0.03) },
        ]}
      >
        {!badge.seenByParent && (
          <View style={[styles.newBadgeIndicator, { backgroundColor: palette.warning }]}>
            <ThemedText style={[styles.newBadgeText, { color: palette.onPrimary }]}>
              NEW
            </ThemedText>
          </View>
        )}
        <View style={[styles.badgeIconCircle, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
          <Ionicons name="ribbon" size={20} color={palette.warning} />
        </View>
        <ThemedText type="defaultSemiBold" style={styles.badgeLabel} numberOfLines={1}>
          {badge.badgeLabel}
        </ThemedText>
        <ThemedText style={[styles.badgeAthlete, { color: palette.muted }]} numberOfLines={1}>
          {athleteLabel}
        </ThemedText>
        <Row gap="micro" align="center">
          <Ionicons name="person" size={10} color={palette.icon} />
          <ThemedText style={[styles.badgeCoach, { color: palette.muted }]} numberOfLines={1}>
            Coach {coachLabel}
          </ThemedText>
        </Row>
      </Column>
    </Clickable>
  );
});

export const ChildrenRecentBadges = memo(function ChildrenRecentBadges({
  badges,
  onViewBadge,
}: ChildrenRecentBadgesProps) {
  const { colors: palette } = useTheme();

  const handleBadgePress = useCallback(
    (badge: BadgeAward) => () => onViewBadge(badge),
    [onViewBadge],
  );

  if (badges.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(75).springify()}>
      <SurfaceCard style={styles.card}>
        <Row justify="between" align="center">
          <Row gap="xs" align="center">
            <Ionicons name="ribbon" size={18} color={palette.warning} />
            <ThemedText type="defaultSemiBold">Recent Badges</ThemedText>
          </Row>
          <ThemedText style={[styles.hint, { color: palette.muted }]}>
            Tap to view details
          </ThemedText>
        </Row>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgeScroll}
        >
          {badges.map((badge) => (
            <BadgeItem
              key={badge.id}
              badge={badge}
              onPress={handleBadgePress(badge)}
            />
          ))}
        </ScrollView>
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  hint: {
    ...Typography.caption,
  },
  badgeScroll: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  badgeCard: {
    width: 120,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    position: 'relative',
  },
  newBadgeIndicator: {
    position: 'absolute',
    top: -6,
    right: -6,
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  newBadgeText: {
    ...Typography.micro,
    fontSize: 9,
  },
  badgeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    ...Typography.caption,
    textAlign: 'center',
  },
  badgeAthlete: {
    ...Typography.caption,
    textAlign: 'center',
  },
  badgeCoach: {
    ...Typography.micro,
  },
});
