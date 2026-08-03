import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Spacing, Components, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { ChildProfile } from '@/services/child-service';

export interface DevSpecialNeedsCardProps {
  childProfile: ChildProfile | null;
  colors: ThemeColors;
  onPress: () => void;
}

export const DevSpecialNeedsCard = function DevSpecialNeedsCard({
  childProfile,
  colors,
  onPress,
}: DevSpecialNeedsCardProps) {
  const disabilityCount = childProfile?.disabilities.length ?? 0;
  const specialNeedsCount = childProfile?.specialNeeds.length ?? 0;
  const allergyCount = childProfile?.allergies.length ?? 0;
  const conditionCount = childProfile?.medicalConditions.length ?? 0;
  const medicationCount = childProfile?.medications.length ?? 0;
  const parentNoteCount =
    Number(Boolean(childProfile?.communicationNotes)) +
    Number(Boolean(childProfile?.behavioralNotes));
  const supportCount = disabilityCount + specialNeedsCount;
  const totalItems =
    supportCount + allergyCount + conditionCount + medicationCount + parentNoteCount;
  const summary = [
    supportCount > 0 ? `${supportCount} support need${supportCount === 1 ? '' : 's'}` : null,
    allergyCount > 0 ? `${allergyCount} allerg${allergyCount === 1 ? 'y' : 'ies'}` : null,
    conditionCount > 0
      ? `${conditionCount} condition${conditionCount === 1 ? '' : 's'}`
      : null,
    medicationCount > 0 ? `${medicationCount} medication${medicationCount === 1 ? '' : 's'}` : null,
    parentNoteCount > 0
      ? `${parentNoteCount} parent note${parentNoteCount === 1 ? '' : 's'}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <SurfaceCard tactile onPress={onPress} style={styles.card}>
      <Row gap="sm" align="center">
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor:
                totalItems > 0 ? withAlpha(colors.tint, 0.09) : withAlpha(colors.muted, 0.06),
            },
          ]}
        >
          <Ionicons
            name="accessibility"
            size={Components.icon.md}
            color={totalItems > 0 ? colors.tint : colors.muted}
          />
        </View>
        <View style={styles.info}>
          <ThemedText type="defaultSemiBold">Needs & notes</ThemedText>
          <ThemedText style={[Typography.caption, { color: colors.muted }]}>
            {summary || 'Nothing recorded'}
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={Components.icon.md} color={colors.icon} />
      </Row>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  iconContainer: {
    width: Components.avatar.md,
    height: Components.avatar.md,
    borderRadius: Components.avatar.md / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: Spacing.xs,
  },
});
