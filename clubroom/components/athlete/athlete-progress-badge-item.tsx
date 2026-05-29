import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BadgeSummary } from './athlete-progress-helpers';

export function BadgeItem({ badge }: { badge: BadgeSummary }) {
  const { colors } = useTheme();

  return (
    <Row style={[styles.badgeItem, { backgroundColor: withAlpha(colors.rating, 0.09) }]}>
      <Ionicons name={badge.icon as 'ribbon'} size={20} color={colors.rating} />
      <Column gap="micro">
        <ThemedText style={styles.badgeName}>{badge.name}</ThemedText>
        <ThemedText style={[styles.badgeDate, { color: colors.muted }]}>
          {new Date(badge.awardedAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </ThemedText>
      </Column>
    </Row>
  );
}

const styles = StyleSheet.create({
  badgeItem: { alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radii.md },
  badgeName: { ...Typography.bodySemiBold },
  badgeDate: { ...Typography.caption },
});
