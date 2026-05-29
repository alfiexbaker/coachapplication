import { FlatList, StyleSheet, type ListRenderItemInfo } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface CalendarSquadFilterProps {
  squads: { id: string; name: string }[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export const CalendarSquadFilter = function CalendarSquadFilter({
  squads,
  selected,
  onSelect,
}: CalendarSquadFilterProps) {
  const { colors } = useTheme();
  const filterItems = getCalendarSquadFilterItems(squads, selected, onSelect, colors);

  return (
    <FlatList
      horizontal
      data={filterItems}
      keyExtractor={keyCalendarSquadFilterItem}
      renderItem={renderCalendarSquadFilterItem}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    />
  );
};

interface CalendarSquadFilterItem {
  key: string;
  label: string;
  selected: boolean;
  accessibilityLabel: string;
  colors: ReturnType<typeof useTheme>['colors'];
  onPress: () => void;
}

function getCalendarSquadFilterItems(
  squads: { id: string; name: string }[],
  selected: string | null,
  onSelect: (id: string | null) => void,
  colors: ReturnType<typeof useTheme>['colors'],
): CalendarSquadFilterItem[] {
  return [
    {
      key: 'all',
      label: 'All',
      selected: selected === null,
      accessibilityLabel: 'All squads',
      colors,
      onPress: () => onSelect(null),
    },
    ...squads.map((squad) => ({
      key: squad.id,
      label: squad.name,
      selected: selected === squad.id,
      accessibilityLabel: `Filter by ${squad.name}`,
      colors,
      onPress: () => onSelect(squad.id === selected ? null : squad.id),
    })),
  ];
}

function keyCalendarSquadFilterItem(item: CalendarSquadFilterItem) {
  return item.key;
}

function renderCalendarSquadFilterItem({ item }: ListRenderItemInfo<CalendarSquadFilterItem>) {
  return (
    <Clickable
      onPress={item.onPress}
      accessibilityLabel={item.accessibilityLabel}
      style={[
        styles.chip,
        {
          backgroundColor: item.selected ? item.colors.tint : item.colors.surface,
          borderColor: item.selected ? item.colors.tint : item.colors.border,
        },
      ]}
    >
      <ThemedText
        style={[
          Typography.caption,
          { color: item.selected ? item.colors.onPrimary : item.colors.muted },
        ]}
      >
        {item.label}
      </ThemedText>
    </Clickable>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.xs, paddingVertical: Spacing.xs / 2 },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
});
