import { memo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface CalendarSquadFilterProps {
  squads: { id: string; name: string }[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export const CalendarSquadFilter = memo(function CalendarSquadFilter({ squads, selected, onSelect }: CalendarSquadFilterProps) {
  const { colors } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <Clickable
        onPress={() => onSelect(null)}
        accessibilityLabel="All squads"
        style={[styles.chip, { backgroundColor: selected === null ? colors.tint : colors.surface, borderColor: selected === null ? colors.tint : colors.border }]}
      >
        <ThemedText style={[Typography.caption, { color: selected === null ? colors.onPrimary : colors.muted }]}>All</ThemedText>
      </Clickable>
      {squads.map((squad) => (
        <Clickable
          key={squad.id}
          onPress={() => onSelect(squad.id === selected ? null : squad.id)}
          accessibilityLabel={`Filter by ${squad.name}`}
          style={[styles.chip, { backgroundColor: selected === squad.id ? colors.tint : colors.surface, borderColor: selected === squad.id ? colors.tint : colors.border }]}
        >
          <ThemedText style={[Typography.caption, { color: selected === squad.id ? colors.onPrimary : colors.muted }]}>{squad.name}</ThemedText>
        </Clickable>
      ))}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  row: { gap: Spacing.xs, paddingVertical: Spacing.xs / 2 },
  chip: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs / 2, borderRadius: Radii.pill, borderWidth: 1 },
});
