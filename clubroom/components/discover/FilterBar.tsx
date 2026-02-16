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
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CoachSearchFilters, FootballObjective } from '@/constants/types';

import { QUICK_FILTERS, FOCUS_FILTERS } from './filter-bar-sections';
import type { QuickFilter } from './filter-bar-sections';
import { Row } from '@/components/primitives';

interface FilterBarProps {
  filters: CoachSearchFilters;
  onFilterChange: (filters: CoachSearchFilters) => void;
  onOpenFilters: () => void;
  totalResults: number;
  activeFilterCount: number;
  variant?: 'default' | 'map';
}

export function FilterBar({
  filters,
  onFilterChange,
  onOpenFilters,
  totalResults,
  activeFilterCount,
  variant = 'default',
}: FilterBarProps) {
  const { colors: palette } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const isMapVariant = variant === 'map';
  const quickFilters = isMapVariant ? QUICK_FILTERS.slice(0, 3) : QUICK_FILTERS;
  const showFocusFilters = !isMapVariant;

  const handleQuickFilterToggle = (quickFilter: QuickFilter) => {
    const newFilters = quickFilter.toggle(filters);
    onFilterChange(newFilters);
  };

  const handleFocusToggle = (focus: FootballObjective) => {
    const current = filters.focuses ?? [];
    const hasFocus = current.includes(focus);
    const newFocuses = hasFocus ? current.filter((f) => f !== focus) : [...current, focus];

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
    <View style={[styles.container, isMapVariant && styles.containerMap]}>
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
              backgroundColor: hasActiveFilters
                ? withAlpha(palette.tint, 0.12)
                : withAlpha(palette.surface, 0.95),
              borderColor: hasActiveFilters ? palette.tint : withAlpha(palette.border, 0.6),
            },
          ]}
        >
          <Ionicons
            name="options-outline"
            size={16}
            color={hasActiveFilters ? palette.tint : palette.text}
          />
          <ThemedText
            style={[
              styles.filterButtonText,
              { color: hasActiveFilters ? palette.tint : palette.text },
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
        {quickFilters.map((quickFilter) => (
          <Chip
            key={quickFilter.id}
            active={quickFilter.getIsActive(filters)}
            onPress={() => handleQuickFilterToggle(quickFilter)}
            style={styles.chip}
          >
            {quickFilter.label}
          </Chip>
        ))}

        {showFocusFilters ? (
          <>
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
          </>
        ) : null}

        {/* Clear all — inline for map variant */}
        {isMapVariant && hasActiveFilters ? (
          <Clickable
            accessibilityLabel="Clear all filters"
            onPress={handleClearFilters}
            style={styles.inlineClear}
          >
            <Ionicons name="close-circle" size={14} color={palette.tint} />
            <ThemedText style={[styles.clearText, { color: palette.tint }]}>Clear</ThemedText>
          </Clickable>
        ) : null}
      </ScrollView>

      {/* Results count and Clear — only on default variant */}
      {!isMapVariant ? (
        <Row style={styles.footer}>
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
              <ThemedText style={[styles.clearText, { color: palette.tint }]}>Clear all</ThemedText>
            </Clickable>
          )}
        </Row>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.xs,
  },
  containerMap: {
    paddingVertical: Spacing.xxs,
  },
  scrollContent: {
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    height: 36,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  filterButtonText: {
    ...Typography.bodySmallSemiBold,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chip: {
    marginRight: 0,
    marginBottom: 0,
    minHeight: 36,
    justifyContent: 'center',
  },
  inlineClear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    minHeight: 36,
    paddingHorizontal: Spacing.xs,
  },
  footer: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
  },
  resultsText: {
    ...Typography.caption,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    minHeight: 44,
  },
  clearText: {
    ...Typography.caption,
    fontWeight: '600',
  },
});
