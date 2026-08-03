import { View, StyleSheet } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Avatar } from '@/components/ui/primitives/Avatar';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface SpecialNeedsHeroProps {
  name: string;
  avatar?: string;
  totalCount: number;
  disabilityCount: number;
  specialNeedsCount: number;
  allergyCount: number;
  conditionCount: number;
  medicationCount: number;
  parentNoteCount: number;
  lastUpdated?: string;
}

export const SpecialNeedsHero = function SpecialNeedsHero({
  name,
  avatar,
  totalCount,
  disabilityCount,
  specialNeedsCount,
  allergyCount,
  conditionCount,
  medicationCount,
  parentNoteCount,
  lastUpdated,
}: SpecialNeedsHeroProps) {
  const { colors } = useTheme();
  const summary = [
    disabilityCount > 0
      ? `${disabilityCount} disabilit${disabilityCount === 1 ? 'y' : 'ies'}`
      : null,
    specialNeedsCount > 0
      ? `${specialNeedsCount} support need${specialNeedsCount === 1 ? '' : 's'}`
      : null,
    allergyCount > 0 ? `${allergyCount} allerg${allergyCount === 1 ? 'y' : 'ies'}` : null,
    conditionCount > 0
      ? `${conditionCount} medical condition${conditionCount === 1 ? '' : 's'}`
      : null,
    medicationCount > 0 ? `${medicationCount} medication${medicationCount === 1 ? '' : 's'}` : null,
    parentNoteCount > 0
      ? `${parentNoteCount} parent note${parentNoteCount === 1 ? '' : 's'}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <SurfaceCard style={styles.heroCard}>
      <Row gap="sm" align="center">
        <Avatar uri={avatar} name={name} size="md" />
        <View style={styles.heroInfo}>
          <ThemedText type="heading">{name}</ThemedText>
          <ThemedText style={[Typography.small, { color: colors.muted }]}>
            {totalCount > 0 ? summary : 'Nothing recorded'}
          </ThemedText>
          {lastUpdated && (
            <ThemedText style={[Typography.micro, { color: colors.muted, textTransform: 'none' }]}>
              Updated{' '}
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
};

const styles = StyleSheet.create({
  heroCard: { padding: Spacing.sm },
  heroInfo: { flex: 1, gap: Spacing.xxs },
});
