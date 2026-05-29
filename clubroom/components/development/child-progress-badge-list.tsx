import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, withAlpha, Radii } from '@/constants/theme';
import type { BadgeAward } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';
import { formatShortDateWithYear } from '@/utils/format';

interface ChildProgressBadgeListProps {
  badges: BadgeAward[];
  colors: ThemeColors;
}

export function ChildProgressBadgeList({ badges, colors }: ChildProgressBadgeListProps) {
  return (
    <View style={styles.badgeList}>
      {badges.map((badge) => (
        <SurfaceCard key={badge.id} style={styles.badgeCard}>
          <View style={[styles.badgeIcon, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
            <Ionicons name="ribbon" size={24} color={colors.tint} />
          </View>
          <ThemedText type="defaultSemiBold">{badge.badgeLabel}</ThemedText>
          <ThemedText style={[Typography.small, { color: colors.muted }]}>
            {badge.reason}
          </ThemedText>
          <Row gap="sm">
            <ThemedText style={[Typography.caption, { color: colors.muted }]}>
              {formatShortDateWithYear(badge.awardedAt)}
            </ThemedText>
            {badge.coachId ? (
              <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                by {badge.coachId}
              </ThemedText>
            ) : null}
          </Row>
        </SurfaceCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  badgeList: { gap: Spacing.sm },
  badgeCard: { padding: Spacing.md, gap: Spacing.xs },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
});
