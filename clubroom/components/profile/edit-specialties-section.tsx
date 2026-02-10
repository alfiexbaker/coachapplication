/**
 * EditSpecialtiesSection — Coaching specialty chip selector.
 */

import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography } from '@/constants/theme';
import type { FootballObjective } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';

interface EditSpecialtiesSectionProps {
  colors: ThemeColors;
  objectives: readonly FootballObjective[];
  selectedFocuses: FootballObjective[];
  onToggleFocus: (focus: FootballObjective) => void;
}

export const EditSpecialtiesSection = memo(function EditSpecialtiesSection({
  colors, objectives, selectedFocuses, onToggleFocus,
}: EditSpecialtiesSectionProps) {
  return (
    <SurfaceCard style={styles.section}>
      <ThemedText type="subtitle">Coaching Specialties</ThemedText>
      <ThemedText style={styles.subtitle}>Select the areas you specialize in</ThemedText>

      <Row wrap gap="xs">
        {objectives.map((focus) => {
          const isSelected = selectedFocuses.includes(focus);
          return (
            <Pressable
              key={focus}
              onPress={() => onToggleFocus(focus)}
              style={[
                styles.focusChip,
                {
                  backgroundColor: isSelected ? colors.tint : colors.card,
                  borderColor: isSelected ? colors.tint : colors.border,
                },
              ]}
              accessibilityLabel={`${focus} ${isSelected ? 'selected' : 'not selected'}`}
              accessibilityRole="button"
            >
              <ThemedText style={[styles.focusText, isSelected && { color: colors.onPrimary }]}>
                {focus}
              </ThemedText>
            </Pressable>
          );
        })}
      </Row>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  section: { gap: Spacing.md },
  subtitle: { opacity: 0.6, ...Typography.bodySmall },
  focusChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radii.pill, borderWidth: 1,
  },
  focusText: { fontWeight: '600' },
});
