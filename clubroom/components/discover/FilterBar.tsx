/**
 * FilterBar Component
 *
 * Horizontal scrollable bar of quick filter chips with active filter counts.
 * Allows users to quickly toggle common filters and clear all filters.
 */

import { useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { Chip } from '@/components/primitives/chip';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CoachSearchFilters, FootballObjective } from '@/constants/types';

import { QUICK_FILTERS, FOCUS_FILTERS } from './filter-bar-sections';
import type { QuickFilter } from './filter-bar-sections';

interface FilterBarProps {
  filters: CoachSearchFilters;
  onFilterChange: (filters: CoachSearchFilters) => void;
  onOpenFilters: () => void;
  totalResults: number;
  activeFilterCount: number;
}

export function FilterBar({
  filters,
  onFilterChange,
  onOpenFilters,
  totalResults,
  activeFilterCount,
}: FilterBarProps) {
  const { colors: palette } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  const handleQuickFilterToggle = (quickFilter: QuickFilter) => {
    const newFilters = quickFilter.toggle(filters);
    onFilterChange(newFilters);
  };

  const handleFocusToggle = (focus: FootballObjective) => {
    const current = filters.focuses ?? [];
    const hasFocus = current.includes(focus);
    const newFocuses = hasFocus
      ? current.filter((f) => f !== focus)
      : [...current, focus];

    onFilterChange({
      ...filters,
      focuses: newFocuses.length > 0 ? newFocuses : undefined,
    });
  };

  const handleClearFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* All Filters Button */}
        <Clickable
          accessibilityLabel="Open all filters"
          onPress={onOpenFilters}
          style={[
            styles.filterButton,
            {
              backgroundColor: hasActiveFilters ? withAlpha(palette.tint, 0.09) : palette.surface,
              borderColor: hasActiveFilters ? palette.tint : palette.border,
            },
          ]}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={hasActiveFilters ? palette.tint : palette.muted}
          />
          <ThemedText
            style={[
              styles.filterButtonText,
              { color: hasActiveFilters ? palette.tint : palette.muted },
            ]}
          >
            Filters
          </ThemedText>
          {activeFilterCount > 0 && (
            <View style={[styles.badge, { backgroundColor: palette.tint }]}>
              <ThemedText style={[styles.badgeText, { color: palette.onPrimary }]}>
                {activeFilterCount}
              </ThemedText>
            </View>
          )}
        </Clickable>

        {/* Quick Filters */}
        {QUICK_FILTERS.map((quickFilter) => (
          <Chip
            key={quickFilter.id}
            active={quickFilter.getIsActive(filters)}
            onPress={() => handleQuickFilterToggle(quickFilter)}
            style={styles.chip}
          >
            {quickFilter.label}
          </Chip>
        ))}

        {/* Separator */}
        <Divider vertical style={{ height: 24, marginHorizontal: Spacing.sm }} />

        {/* Focus Filters */}
        {FOCUS_FILTERS.map((focus) => (
          <Chip
            key={focus.id}
            active={filters.focuses?.includes(focus.id) ?? false}
            onPress={() => handleFocusToggle(focus.id)}
            style={styles.chip}
          >
            {focus.label}
          </Chip>
        ))}
      </ScrollView>

      {/* Results count and Clear */}
      <View style={styles.footer}>
        <ThemedText style={[styles.resultsText, { color: palette.muted }]}>
          {totalResults} {totalResults === 1 ? 'coach' : 'coaches'} found
        </ThemedText>
        {hasActiveFilters && (
          <Clickable
            accessibilityLabel="Clear all filters"
            onPress={handleClearFilters}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={16} color={palette.tint} />
            <ThemedText style={[styles.clearText, { color: palette.tint }]}>
              Clear all
            </ThemedText>
          </Clickable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.pill,
    borderWidth: 1,
    marginRight: Spacing.xs,
  },
  filterButtonText: {
    ...Typography.sm,
    fontWeight: '500',
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  badgeText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  chip: {
    marginRight: 0,
    marginBottom: 0,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  resultsText: {
    ...Typography.sm,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  clearText: {
    ...Typography.sm,
    fontWeight: '600',
  },
});
