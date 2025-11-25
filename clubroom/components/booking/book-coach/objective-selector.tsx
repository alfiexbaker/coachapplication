import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { FootballObjective } from '@/constants/types';

interface ObjectiveSelectorProps {
  objectives: FootballObjective[];
  selectedObjectives: FootballObjective[];
  onToggle: (objective: FootballObjective) => void;
}

export function ObjectiveSelector({ objectives, selectedObjectives, onToggle }: ObjectiveSelectorProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={styles.container}>
      <ThemedText type="defaultSemiBold" style={styles.title}>
        What do you want to work on?
      </ThemedText>
      <ThemedText style={[styles.helper, { color: palette.muted }]}>Select up to 3 focus areas</ThemedText>
      <View style={styles.grid}>
        {objectives.map((objective) => {
          const isSelected = selectedObjectives.includes(objective);
          return (
            <Pressable
              key={objective}
              onPress={() => onToggle(objective)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? palette.tint : palette.surface,
                  borderColor: isSelected ? palette.tint : palette.border,
                },
              ]}
            >
              <Ionicons
                name={isSelected ? 'checkmark-circle' : 'radio-button-off-outline'}
                size={20}
                color={isSelected ? '#fff' : palette.muted}
              />
              <ThemedText style={[styles.label, { color: isSelected ? '#fff' : palette.text }]}>
                {objective}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 16,
    paddingHorizontal: Spacing.lg,
  },
  helper: {
    fontSize: 13,
    paddingHorizontal: Spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1.25,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
