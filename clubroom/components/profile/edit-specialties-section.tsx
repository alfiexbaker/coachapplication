/**
 * EditSpecialtiesSection — Coaching specialty chip selector.
 */

import React from 'react';
import { StyleSheet } from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing } from '@/constants/theme';
import type { FootballObjective } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';

interface EditSpecialtiesSectionProps {
  colors: ThemeColors;
  objectives: readonly FootballObjective[];
  selectedFocuses: FootballObjective[];
  onToggleFocus: (focus: FootballObjective) => void;
}

export const EditSpecialtiesSection = function EditSpecialtiesSection({
  colors,
  objectives,
  selectedFocuses,
  onToggleFocus,
}: EditSpecialtiesSectionProps) {
  return (
    <SurfaceCard style={styles.section}>
      <ThemedText type="subtitle">Coaching focus</ThemedText>

      <Row wrap gap="xs">
        {objectives.map((focus) => {
          const isSelected = selectedFocuses.includes(focus);
          return (
            <Clickable
              key={focus}
              onPress={() => onToggleFocus(focus)}
              style={[
                styles.focusChip,
                {
                  backgroundColor: isSelected ? colors.tint : colors.card,
                  borderColor: isSelected ? colors.tint : colors.border,
                },
              ]}
              accessibilityLabel={focus}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
            >
              <ThemedText style={[styles.focusText, isSelected && { color: colors.onPrimary }]}>
                {focus}
              </ThemedText>
            </Clickable>
          );
        })}
      </Row>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  section: { gap: Spacing.md },
  focusChip: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  focusText: { fontWeight: '600' },
});
