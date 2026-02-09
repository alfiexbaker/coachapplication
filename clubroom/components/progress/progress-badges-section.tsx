/**
 * BadgesSection — Recent badges horizontal scroll for progress dashboard.
 */
import { memo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { AthleteProgress } from '@/services/progress-service';
import { useTheme } from '@/hooks/useTheme';

function BadgesSectionInner({ badges, onViewAll }: { badges: AthleteProgress['recentBadges']; onViewAll?: () => void }) {
  const { colors: palette } = useTheme();

  if (badges.length === 0) {
    return (
      <SurfaceCard style={styles.emptyCard}>
        <Ionicons name="ribbon-outline" size={24} color={palette.muted} />
        <ThemedText style={[styles.emptyText, { color: palette.muted }]}>No badges earned yet</ThemedText>
      </SurfaceCard>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      {badges.map((badge) => (
        <View key={badge.id} style={[styles.badgeCard, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
          <Ionicons name="ribbon" size={20} color={palette.tint} />
          <ThemedText style={styles.badgeLabel} numberOfLines={1}>{badge.label}</ThemedText>
          <ThemedText style={[styles.badgeDate, { color: palette.muted }]}>
            {new Date(badge.awardedAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
          </ThemedText>
        </View>
      ))}
      {onViewAll && badges.length >= 5 && (
        <SurfaceCard style={styles.viewAllCard} onPress={onViewAll} tactile>
          <Ionicons name="arrow-forward" size={20} color={palette.tint} />
          <ThemedText style={[styles.viewAllText, { color: palette.tint }]}>View All</ThemedText>
        </SurfaceCard>
      )}
    </ScrollView>
  );
}

export const BadgesSection = memo(BadgesSectionInner);

const styles = StyleSheet.create({
  scroll: { gap: Spacing.sm, paddingRight: Spacing.md },
  emptyCard: { alignItems: 'center', padding: Spacing.lg, gap: Spacing.xs },
  emptyText: { ...Typography.bodySmall },
  badgeCard: { alignItems: 'center', padding: Spacing.sm, borderRadius: Radii.md, gap: Spacing.xxs, minWidth: 80 },
  badgeLabel: { ...Typography.caption, textAlign: 'center' },
  badgeDate: { ...Typography.micro },
  viewAllCard: { alignItems: 'center', justifyContent: 'center', padding: Spacing.sm, minWidth: 70, gap: Spacing.xxs },
  viewAllText: { ...Typography.caption },
});
