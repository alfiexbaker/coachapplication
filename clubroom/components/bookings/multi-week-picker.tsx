import { View, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

import { WeekSeparator, WeekRowItem } from './multi-week-picker-sections';
import { Row } from '@/components/primitives';
import { AccessibleListCell } from '@/components/ui/list-accessibility';

export interface WeekRow {
  weekDate: string;
  dayName: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
  location: string;
  price: number;
  available: boolean;
  unavailableReason?: string;
}

interface MultiWeekPickerProps {
  weeks: WeekRow[];
  selectedWeeks: Set<string>;
  onToggleWeek: (weekDate: string) => void;
  currency?: string;
}

export function MultiWeekPicker({
  weeks,
  selectedWeeks,
  onToggleWeek,
  currency = '\u00A3',
}: MultiWeekPickerProps) {
  const { colors: palette } = useTheme();

  const selectedCount = selectedWeeks.size;
  const totalCost = weeks
    .filter((w) => selectedWeeks.has(w.weekDate))
    .reduce((sum, w) => sum + w.price, 0);

  const renderItem = ({ item }: { item: WeekRow }) => (
    <WeekRowItem
      week={item}
      isSelected={selectedWeeks.has(item.weekDate)}
      onToggle={onToggleWeek}
      currency={currency}
      palette={palette}
    />
  );

  const keyExtractor = (item: WeekRow) => item.weekDate;

  return (
    <View style={styles.container}>
      {/* Selection summary */}
      <Row style={[styles.summaryRow, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
        <Row style={styles.summaryLeft}>
          <Ionicons name="calendar-outline" size={16} color={palette.tint} />
          <ThemedText style={[Typography.smallSemiBold, { color: palette.tint }]}>
            {selectedCount} week{selectedCount !== 1 ? 's' : ''} selected
          </ThemedText>
        </Row>
        <ThemedText style={[Typography.bodySemiBold, { color: palette.tint }]}>
          {currency}
          {totalCost.toFixed(0)}
        </ThemedText>
      </Row>

      {/* Week rows */}
      <FlatList
        CellRendererComponent={AccessibleListCell}
        accessibilityRole="list"
        data={weeks}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={WeekSeparator}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  summaryRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
  },
  summaryLeft: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  listContent: {
    paddingBottom: Spacing.sm,
  },
});
