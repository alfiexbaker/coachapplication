/**
 * Coach Select List
 *
 * Displays list of coaches available for rating, with reviewed badge.
 */

import { memo } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatCoachDate, type CoachToRate } from '@/hooks/use-rate-coach';

interface CoachSelectListProps {
  coaches: CoachToRate[];
  onSelect: (coach: CoachToRate) => void;
}

export const CoachSelectList = memo(function CoachSelectList({ coaches, onSelect }: CoachSelectListProps) {
  const { colors: palette } = useTheme();

  return (
    <FlatList
      data={coaches}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <Clickable onPress={() => onSelect(item)}>
          <SurfaceCard>
            <Row align="center" gap="md" style={styles.coachCard}>
              <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
                <Ionicons name="person" size={28} color={palette.tint} />
              </View>
              <View style={styles.coachInfo}>
                <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                <ThemedText style={[styles.coachMeta, { color: palette.muted }]}>
                  {item.sessionCount} session{item.sessionCount !== 1 ? 's' : ''} - Last: {formatCoachDate(item.lastSession)}
                </ThemedText>
              </View>
              {item.hasReview ? (
                <Row align="center" gap="xxs" style={[styles.reviewedBadge, { backgroundColor: withAlpha(palette.success, 0.12) }]}>
                  <Ionicons name="checkmark-circle" size={16} color={palette.success} />
                  <ThemedText style={[styles.reviewedText, { color: palette.success }]}>Reviewed</ThemedText>
                </Row>
              ) : (
                <Ionicons name="chevron-forward" size={20} color={palette.muted} />
              )}
            </Row>
          </SurfaceCard>
        </Clickable>
      )}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={48} color={palette.muted} />
          <ThemedText style={[styles.emptyText, { color: palette.muted }]}>No coaches to rate yet</ThemedText>
          <ThemedText style={[styles.emptySubtext, { color: palette.muted }]}>Complete some sessions first</ThemedText>
        </View>
      }
    />
  );
});

const styles = StyleSheet.create({
  list: { padding: Spacing.md, gap: Spacing.sm },
  coachCard: { padding: Spacing.md },
  avatar: { width: 52, height: 52, borderRadius: Radii['2xl'], alignItems: 'center', justifyContent: 'center' },
  coachInfo: { flex: 1, gap: Spacing.xxs },
  coachMeta: { ...Typography.small },
  reviewedBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  reviewedText: { ...Typography.caption },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xl * 2, gap: Spacing.sm },
  emptyText: { ...Typography.subheading },
  emptySubtext: { ...Typography.bodySmall },
});
