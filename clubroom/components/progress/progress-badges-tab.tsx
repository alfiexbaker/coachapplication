import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Chip } from '@/components/primitives/chip';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { BadgeAward } from '@/constants/types';

interface ProgressBadgesTabProps {
  badges: BadgeAward[];
  colors: ThemeColors;
}

export const ProgressBadgesTab = memo(function ProgressBadgesTab({ badges, colors }: ProgressBadgesTabProps) {
  return (
    <View style={styles.section}>
      <Row align="center" justify="space-between">
        <ThemedText type="heading" style={Typography.heading}>My Badges</ThemedText>
        <Chip dense>{badges.length} earned</Chip>
      </Row>

      {badges.length > 0 ? (
        <View style={styles.grid}>
          {badges.map((badge) => (
            <SurfaceCard key={badge.id} style={styles.card}>
              <View style={[styles.icon, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
                <Ionicons name="ribbon" size={28} color={colors.tint} />
              </View>
              <ThemedText type="defaultSemiBold" style={[Typography.subheading, { textAlign: 'center' }]}>{badge.badgeLabel}</ThemedText>
              <ThemedText style={[Typography.small, { color: colors.muted, textAlign: 'center', lineHeight: 18 }]}>{badge.reason}</ThemedText>
              {badge.badgeCategory && <Chip dense style={styles.category}>{badge.badgeCategory}</Chip>}
            </SurfaceCard>
          ))}
        </View>
      ) : (
        <SurfaceCard style={styles.empty}>
          <Ionicons name="ribbon-outline" size={32} color={colors.muted} />
          <ThemedText style={[Typography.bodySemiBold, { color: colors.muted }]}>No badges yet</ThemedText>
          <ThemedText style={[Typography.small, { color: colors.muted, textAlign: 'center' }]}>Keep training to earn badges and achievements</ThemedText>
        </SurfaceCard>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  section: { gap: Spacing.md },
  grid: { gap: Spacing.sm },
  card: { padding: Spacing.md, alignItems: 'center', gap: Spacing.xs },
  icon: { width: 56, height: 56, borderRadius: Radii['2xl'], alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  category: { marginTop: Spacing.xs },
  empty: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
});
