/**
 * Coach Select List
 *
 * Displays list of coaches available for rating, with reviewed badge.
 */

import { memo, useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { useTheme } from '@/hooks/useTheme';
import { formatCoachDate, type CoachToRate } from '@/hooks/use-rate-coach';

interface CoachSelectListProps {
  coaches: CoachToRate[];
  onSelect: (coach: CoachToRate) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export const CoachSelectList = memo(function CoachSelectList({
  coaches,
  onSelect,
  refreshing = false,
  onRefresh,
}: CoachSelectListProps) {
  const { colors: palette } = useTheme();

  const renderItem = useCallback(
    ({ item }: { item: CoachToRate }) => (
      <CoachSelectItem coach={item} onSelect={onSelect} palette={palette} />
    ),
    [onSelect, palette],
  );

  return (
    <FlatList
        accessibilityRole="list"
      data={coaches}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshing={refreshing}
      onRefresh={onRefresh}
      renderItem={renderItem}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={48} color={palette.muted} />
          <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
            No coaches to rate yet
          </ThemedText>
          <ThemedText style={[styles.emptySubtext, { color: palette.muted }]}>
            Complete some sessions first
          </ThemedText>
        </View>
      }
    />
  );
});

const CoachSelectItem = memo(function CoachSelectItem({
  coach,
  onSelect,
  palette,
}: {
  coach: CoachToRate;
  onSelect: (coach: CoachToRate) => void;
  palette: ThemeColors;
}) {
  const handlePress = useCallback(() => onSelect(coach), [onSelect, coach]);

  return (
    <Clickable onPress={handlePress}>
      <SurfaceCard>
        <Row align="center" gap="md" style={styles.coachCard}>
          <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
            <Ionicons name="person" size={28} color={palette.tint} />
          </View>
          <View style={styles.coachInfo}>
            <ThemedText type="defaultSemiBold">{coach.name}</ThemedText>
            <ThemedText style={[styles.coachMeta, { color: palette.muted }]}>
              {coach.sessionCount} session{coach.sessionCount !== 1 ? 's' : ''} - Last:{' '}
              {formatCoachDate(coach.lastSession)}
            </ThemedText>
          </View>
          {coach.hasReview ? (
            <Row
              align="center"
              gap="xxs"
              style={[
                styles.reviewedBadge,
                { backgroundColor: withAlpha(palette.success, 0.12) },
              ]}
            >
              <Ionicons name="checkmark-circle" size={16} color={palette.success} />
              <ThemedText style={[styles.reviewedText, { color: palette.success }]}>
                Reviewed
              </ThemedText>
            </Row>
          ) : (
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          )}
        </Row>
      </SurfaceCard>
    </Clickable>
  );
});

const styles = StyleSheet.create({
  list: { padding: Spacing.md, gap: Spacing.sm },
  coachCard: { padding: Spacing.md },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachInfo: { flex: 1, gap: Spacing.xxs },
  coachMeta: { ...Typography.small },
  reviewedBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  reviewedText: { ...Typography.caption },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xl * 2, gap: Spacing.sm },
  emptyText: { ...Typography.subheading },
  emptySubtext: { ...Typography.bodySmall },
});
