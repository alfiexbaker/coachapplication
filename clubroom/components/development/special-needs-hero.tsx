import { memo } from 'react';
import { View, StyleSheet } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface SpecialNeedsHeroProps {
  name: string;
  avatar?: string;
  totalCount: number;
  disabilityCount: number;
  specialNeedsCount: number;
  allergyCount: number;
}

export const SpecialNeedsHero = memo(function SpecialNeedsHero({
  name,
  avatar,
  totalCount,
  disabilityCount,
  specialNeedsCount,
  allergyCount,
}: SpecialNeedsHeroProps) {
  const { colors } = useTheme();

  return (
    <>
      <SurfaceCard style={styles.heroCard}>
        <Row gap="sm" align="center">
          <View style={[styles.avatar, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
            <ThemedText style={[Typography.heading, { color: colors.tint }]}>
              {avatar || name.charAt(0)}
            </ThemedText>
          </View>
          <View style={styles.heroInfo}>
            <ThemedText type="heading">{name}</ThemedText>
            <ThemedText style={[Typography.small, { color: colors.muted }]}>
              {totalCount > 0
                ? `${totalCount} accommodation${totalCount !== 1 ? 's' : ''} documented`
                : 'No special needs documented'}
            </ThemedText>
          </View>
        </Row>
      </SurfaceCard>

      <Row gap="xs">
        <StatCard value={disabilityCount} label="Disabilities" color={colors.warning} />
        <StatCard value={specialNeedsCount} label="Special Needs" color={colors.tint} />
        <StatCard value={allergyCount} label="Allergies" color={colors.error} />
      </Row>
    </>
  );
});

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={[styles.statCard, { backgroundColor: withAlpha(color, 0.06) }]}>
      <ThemedText style={[Typography.title, { color }]}>{value}</ThemedText>
      <ThemedText style={[Typography.micro, { color }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: { padding: Spacing.sm },
  avatar: {
    width: Components.avatar.md,
    height: Components.avatar.md,
    borderRadius: Components.avatar.md / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: { flex: 1, gap: Spacing.xs },
  statCard: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: Radii.card,
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
