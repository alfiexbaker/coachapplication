/**
 * Multi-Week Picker
 *
 * FlatList of toggleable week rows for multi-week booking.
 * Each row shows date, day name, time, location, and price.
 * Running total displayed at the bottom.
 * Disabled rows for unavailable weeks show the reason.
 */

import { useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// Re-export extracted components for backward compat
export { formatTimeDisplay, WeekSeparator, WeekRowItem } from './multi-week-picker-sections';
export type { WeekRowItemProps } from './multi-week-picker-sections';

import { WeekSeparator, WeekRowItem } from './multi-week-picker-sections';

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

  const renderItem = useCallback(
    ({ item }: { item: WeekRow }) => (
      <WeekRowItem
        week={item}
        isSelected={selectedWeeks.has(item.weekDate)}
        onToggle={onToggleWeek}
        currency={currency}
        palette={palette}
      />
    ),
    [selectedWeeks, onToggleWeek, currency, palette]
  );

  const keyExtractor = useCallback((item: WeekRow) => item.weekDate, []);

  return (
    <View style={styles.container}>
      {/* Selection summary */}
      <View style={[styles.summaryRow, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
        <View style={styles.summaryLeft}>
          <Ionicons name="calendar-outline" size={16} color={palette.tint} />
          <ThemedText style={[Typography.smallSemiBold, { color: palette.tint }]}>
            {selectedCount} week{selectedCount !== 1 ? 's' : ''} selected
          </ThemedText>
        </View>
        <ThemedText style={[Typography.bodySemiBold, { color: palette.tint }]}>
          {currency}{totalCost.toFixed(0)}
        </ThemedText>
      </View>

      {/* Week rows */}
      <FlatList
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  listContent: {
    paddingBottom: Spacing.sm,
  },
});
