import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography } from '@/constants/theme';
import type { FootballObjective } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

interface ObjectiveSelectorProps {
  objectives: FootballObjective[];
  selectedObjectives: FootballObjective[];
  onToggle: (objective: FootballObjective) => void;
}

export function ObjectiveSelector({ objectives, selectedObjectives, onToggle }: ObjectiveSelectorProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText type="defaultSemiBold" style={styles.title}>
        What do you want to work on?
      </ThemedText>
      <ThemedText style={[styles.helper, { color: palette.muted }]}>Select up to 3 focus areas</ThemedText>
      <Row wrap gap="sm" style={styles.grid}>
        {objectives.map((objective) => {
          const isSelected = selectedObjectives.includes(objective);
          return (
            <Clickable
              key={objective}
              onPress={() => onToggle(objective)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? palette.tint : palette.surface,
                  borderColor: isSelected ? palette.tint : palette.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={objective}
              accessibilityState={{ selected: isSelected }}
            >
              <Row align="center" gap="xs">
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'radio-button-off-outline'}
                  size={20}
                  color={isSelected ? palette.onPrimary : palette.muted}
                />
                <ThemedText style={[styles.label, { color: isSelected ? palette.onPrimary : palette.text }]}>
                  {objective}
                </ThemedText>
              </Row>
            </Clickable>
          );
        })}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  title: { ...Typography.subheading, paddingHorizontal: Spacing.lg },
  helper: { ...Typography.small, paddingHorizontal: Spacing.lg },
  grid: {
    paddingHorizontal: Spacing.lg,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1.25,
  },
  label: { ...Typography.bodySmallSemiBold },
});
