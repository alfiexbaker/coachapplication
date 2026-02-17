import { memo } from 'react';
import { View, StyleSheet } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Components, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface SpecialNeedsHeroProps {
  name: string;
  avatar?: string;
  totalCount: number;
  disabilityCount: number;
  specialNeedsCount: number;
  allergyCount: number;
  lastUpdated?: string;
}

export const SpecialNeedsHero = memo(function SpecialNeedsHero({
  name,
  avatar,
  totalCount,
  disabilityCount,
  specialNeedsCount,
  allergyCount,
  lastUpdated,
}: SpecialNeedsHeroProps) {
  const { colors } = useTheme();

  return (
    <SurfaceCard style={styles.heroCard}>
      <Row gap="sm" align="center">
        <View style={[styles.avatar, { backgroundColor: withAlpha(colors.muted, 0.09) }]}>
          <ThemedText style={[Typography.heading, { color: colors.text }]}>
            {avatar || name.charAt(0)}
          </ThemedText>
        </View>
        <View style={styles.heroInfo}>
          <ThemedText type="heading">{name}</ThemedText>
          <ThemedText style={[Typography.small, { color: colors.muted }]}>
            {totalCount > 0
              ? `${disabilityCount} disabilit${disabilityCount !== 1 ? 'ies' : 'y'} · ${specialNeedsCount} need${specialNeedsCount !== 1 ? 's' : ''} · ${allergyCount} allerg${allergyCount !== 1 ? 'ies' : 'y'}`
              : 'No special needs documented'}
          </ThemedText>
          {lastUpdated && (
            <ThemedText style={[Typography.micro, { color: colors.muted, textTransform: 'none' }]}>
              Updated by parent:{' '}
              {new Date(lastUpdated).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </ThemedText>
          )}
        </View>
      </Row>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  heroCard: { padding: Spacing.sm },
  avatar: {
    width: Components.avatar.md,
    height: Components.avatar.md,
    borderRadius: Components.avatar.md / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: { flex: 1, gap: Spacing.xxs },
});
