import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SelectionTile } from '@/components/primitives/selection-tile';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { User } from '@/constants/app-types';

interface ChildSelectionGridProps {
  childrenOptions: User[];
  selectedChildIds: string[];
  onToggle: (id: string) => void;
}

export function ChildSelectionGrid({ childrenOptions, selectedChildIds, onToggle }: ChildSelectionGridProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={styles.container}>
      <ThemedText type="defaultSemiBold" style={styles.title}>
        Who is this session for?
      </ThemedText>
      <ThemedText style={[styles.helper, { color: palette.muted }]}>Select one or more children</ThemedText>
      <View style={styles.grid}>
        {childrenOptions.map((child) => {
          const selected = selectedChildIds.includes(child.id);
          return (
            <SelectionTile
              key={child.id}
              title={child.name}
              description={child.email}
              iconName={selected ? 'checkmark-circle' : ('radio-button-off-outline' as const)}
              selected={selected}
              onPress={() => onToggle(child.id)}
              layout="column"
              rightAdornment={
                <Ionicons
                  name={selected ? 'checkmark-circle' : 'person-circle-outline'}
                  size={22}
                  color={selected ? palette.tint : palette.muted}
                />
              }
            />
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
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
});
