/**
 * FilterBar Component
 *
 * Horizontal scrollable bar of quick filter chips with active filter counts.
 * Allows users to quickly toggle common filters and clear all filters.
 */

import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Chip } from '@/components/primitives/chip';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type {
  CoachSearchFilters,
  ActiveFilter,
  FootballObjective,
  TrainingFormat,
} from '@/constants/types';

interface FilterBarProps {
  filters: CoachSearchFilters;
  onFilterChange: (filters: CoachSearchFilters) => void;
  onOpenFilters: () => void;
  totalResults: number;
  activeFilterCount: number;
}

interface QuickFilter {
  id: string;
  label: string;
  getIsActive: (filters: CoachSearchFilters) => boolean;
  toggle: (filters: CoachSearchFilters) => CoachSearchFilters;
}

const QUICK_FILTERS: QuickFilter[] = [
  {
    id: 'rating',
    label: '4+ Stars',
    getIsActive: (f) => f.rating !== undefined && f.rating >= 4,
    toggle: (f) => ({
      ...f,
      rating: f.rating !== undefined && f.rating >= 4 ? undefined : 4,
    }),
  },
  {
    id: 'nearby',
    label: 'Nearby',
    getIsActive: (f) => f.distance !== undefined && f.distance <= 5,
    toggle: (f) => ({
      ...f,
      distance: f.distance !== undefined && f.distance <= 5 ? undefined : 5,
    }),
  },
  {
    id: 'inperson',
    label: 'In-person',
    getIsActive: (f) => f.formats?.includes('In-person') ?? false,
    toggle: (f) => {
      const current = f.formats ?? [];
      const hasFormat = current.includes('In-person');
      return {
        ...f,
        formats: hasFormat
          ? current.filter((fmt) => fmt !== 'In-person')
          : [...current, 'In-person' as TrainingFormat],
      };
    },
  },
  {
    id: 'virtual',
    label: 'Virtual',
    getIsActive: (f) => f.formats?.includes('Virtual') ?? false,
    toggle: (f) => {
      const current = f.formats ?? [];
      const hasFormat = current.includes('Virtual');
      return {
        ...f,
        formats: hasFormat
          ? current.filter((fmt) => fmt !== 'Virtual')
          : [...current, 'Virtual' as TrainingFormat],
      };
    },
  },
  {
    id: 'group',
    label: 'Small group',
    getIsActive: (f) => f.formats?.includes('Small group') ?? false,
    toggle: (f) => {
      const current = f.formats ?? [];
      const hasFormat = current.includes('Small group');
      return {
        ...f,
        formats: hasFormat
          ? current.filter((fmt) => fmt !== 'Small group')
          : [...current, 'Small group' as TrainingFormat],
      };
    },
  },
];

const FOCUS_FILTERS: { id: FootballObjective; label: string }[] = [
  { id: 'Goalkeeping', label: 'Goalkeeping' },
  { id: 'Finishing', label: 'Finishing' },
  { id: 'Dribbling', label: 'Dribbling' },
  { id: 'Passing', label: 'Passing' },
  { id: 'Defending', label: 'Defending' },
  { id: 'Conditioning', label: 'Conditioning' },
];

export function FilterBar({
  filters,
  onFilterChange,
  onOpenFilters,
  totalResults,
  activeFilterCount,
}: FilterBarProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open all filters"
          onPress={onOpenFilters}
          style={({ pressed }) => [
            styles.filterButton,
            {
              backgroundColor: hasActiveFilters ? `${palette.tint}15` : palette.surface,
              borderColor: hasActiveFilters ? palette.tint : palette.border,
              opacity: pressed ? 0.8 : 1,
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
              <ThemedText style={styles.badgeText} lightColor="#fff" darkColor="#fff">
                {activeFilterCount}
              </ThemedText>
            </View>
          )}
        </Pressable>

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
        <View style={[styles.separator, { backgroundColor: palette.border }]} />

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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
            onPress={handleClearFilters}
            style={({ pressed }) => [
              styles.clearButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="close-circle" size={16} color={palette.tint} />
            <ThemedText style={[styles.clearText, { color: palette.tint }]}>
              Clear all
            </ThemedText>
          </Pressable>
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
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    ...Typography.xs,
    fontWeight: '700',
    fontSize: 11,
  },
  chip: {
    marginRight: 0,
    marginBottom: 0,
  },
  separator: {
    width: 1,
    height: 24,
    marginHorizontal: Spacing.sm,
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
    gap: 4,
  },
  clearText: {
    ...Typography.sm,
    fontWeight: '600',
  },
});
