/**
 * FilterBar Component
 *
 * Horizontal scrollable bar of quick filter chips with active filter counts.
 * Allows users to quickly toggle common filters and clear all filters.
 */

import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, type ListRenderItemInfo } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { Chip } from '@/components/primitives/chip';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { CoachSearchFilters, FootballObjective } from '@/constants/types';
import { discoverService } from '@/services/discover-service';

import { QUICK_FILTERS, FOCUS_FILTERS } from './filter-bar-sections';
import type { QuickFilter } from './filter-bar-sections';
import { Row } from '@/components/primitives';

import { runAsyncFinally } from '@/utils/async-control';

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
  const isMapVariant = variant === 'map';
  const quickFilters = isMapVariant ? QUICK_FILTERS.slice(0, 3) : QUICK_FILTERS;
  const showFocusFilters = !isMapVariant;
  const [filterCounts, setFilterCounts] = useState<Record<string, number>>({});
  const [isCountingFilters, setIsCountingFilters] = useState(false);

  useEffect(() => {
    let active = true;
    const timeout = setTimeout(async () => {
      setIsCountingFilters(true);

      return await runAsyncFinally(
        async () => {
          const filtersToCount = [
            ...(isMapVariant ? QUICK_FILTERS.slice(0, 3) : QUICK_FILTERS).map((quickFilter) => ({
              id: quickFilter.id,
              apply: (nextFilters: CoachSearchFilters) =>
                quickFilter.getIsActive(nextFilters)
                  ? nextFilters
                  : quickFilter.toggle(nextFilters),
            })),
            ...(!isMapVariant
              ? FOCUS_FILTERS.map((focus) => ({
                  id: `focus:${focus.id}`,
                  apply: (nextFilters: CoachSearchFilters) => {
                    const current = nextFilters.focuses ?? [];
                    return {
                      ...nextFilters,
                      focuses: current.includes(focus.id) ? current : [...current, focus.id],
                    };
                  },
                }))
              : []),
          ];
          const entries = await Promise.all(
            filtersToCount.map(async (item) => {
              const result = await discoverService.countCoaches(item.apply(filters));
              return [item.id, result.success ? result.data : 0] as const;
            }),
          );
          if (!active) return;
          setFilterCounts(Object.fromEntries(entries));
        },
        () => {
          if (active) setIsCountingFilters(false);
        },
      );
    }, 200);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [filters, isMapVariant]);

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
  const filterBarItems = getFilterBarItems({
    activeFilterCount,
    filterCounts,
    filters,
    hasActiveFilters,
    isCountingFilters,
    isMapVariant,
    onClearFilters: handleClearFilters,
    onFocusToggle: handleFocusToggle,
    onOpenFilters,
    onQuickFilterToggle: handleQuickFilterToggle,
    palette,
    quickFilters,
    showFocusFilters,
  });

  return (
    <View style={[styles.container, isMapVariant && styles.containerMap]}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={filterBarItems}
        keyExtractor={keyFilterBarItem}
        renderItem={renderFilterBarItem}
        contentContainerStyle={styles.scrollContent}
      />

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
      {isCountingFilters ? (
        <ThemedText style={[styles.countingText, { color: palette.muted }]}>
          Updating filter counts…
        </ThemedText>
      ) : null}
    </View>
  );
}

type FocusFilter = (typeof FOCUS_FILTERS)[number];

interface FilterBarItemsInput {
  activeFilterCount: number;
  filterCounts: Record<string, number>;
  filters: CoachSearchFilters;
  hasActiveFilters: boolean;
  isCountingFilters: boolean;
  isMapVariant: boolean;
  onClearFilters: () => void;
  onFocusToggle: (focus: FootballObjective) => void;
  onOpenFilters: () => void;
  onQuickFilterToggle: (quickFilter: QuickFilter) => void;
  palette: ThemeColors;
  quickFilters: QuickFilter[];
  showFocusFilters: boolean;
}

type FilterBarItem =
  | {
      kind: 'all';
      key: string;
      activeFilterCount: number;
      hasActiveFilters: boolean;
      onPress: () => void;
      palette: ThemeColors;
    }
  | {
      kind: 'quick';
      key: string;
      active: boolean;
      count: number | undefined;
      countKnown: boolean;
      disabled: boolean;
      isCountingFilters: boolean;
      label: string;
      onPress: () => void;
    }
  | {
      kind: 'divider';
      key: string;
    }
  | {
      kind: 'focus';
      key: string;
      active: boolean;
      count: number | undefined;
      countKnown: boolean;
      disabled: boolean;
      focus: FocusFilter;
      isCountingFilters: boolean;
      onPress: () => void;
    }
  | {
      kind: 'clear';
      key: string;
      onPress: () => void;
      palette: ThemeColors;
    };

function getFilterBarItems({
  activeFilterCount,
  filterCounts,
  filters,
  hasActiveFilters,
  isCountingFilters,
  isMapVariant,
  onClearFilters,
  onFocusToggle,
  onOpenFilters,
  onQuickFilterToggle,
  palette,
  quickFilters,
  showFocusFilters,
}: FilterBarItemsInput): FilterBarItem[] {
  const items: FilterBarItem[] = [
    {
      kind: 'all',
      key: 'all-filters',
      activeFilterCount,
      hasActiveFilters,
      onPress: onOpenFilters,
      palette,
    },
  ];

  quickFilters.forEach((quickFilter) => {
    const count = filterCounts[quickFilter.id];
    const countKnown = typeof count === 'number';
    const active = quickFilter.getIsActive(filters);
    items.push({
      kind: 'quick',
      key: `quick:${quickFilter.id}`,
      active,
      count,
      countKnown,
      disabled: countKnown && count === 0 && !active,
      isCountingFilters,
      label: quickFilter.label,
      onPress: () => onQuickFilterToggle(quickFilter),
    });
  });

  if (showFocusFilters) {
    items.push({ kind: 'divider', key: 'focus-divider' });

    FOCUS_FILTERS.forEach((focus) => {
      const key = `focus:${focus.id}`;
      const count = filterCounts[key];
      const countKnown = typeof count === 'number';
      const active = filters.focuses?.includes(focus.id) ?? false;

      items.push({
        kind: 'focus',
        key,
        active,
        count,
        countKnown,
        disabled: countKnown && count === 0 && !active,
        focus,
        isCountingFilters,
        onPress: () => onFocusToggle(focus.id),
      });
    });
  }

  if (isMapVariant && hasActiveFilters) {
    items.push({
      kind: 'clear',
      key: 'clear',
      onPress: onClearFilters,
      palette,
    });
  }

  return items;
}

function keyFilterBarItem(item: FilterBarItem): string {
  return item.key;
}

function renderFilterBarItem({ item }: ListRenderItemInfo<FilterBarItem>) {
  switch (item.kind) {
    case 'all':
      return (
        <Clickable
          accessibilityLabel="Open all filters"
          onPress={item.onPress}
          style={[
            styles.filterButton,
            {
              backgroundColor: item.hasActiveFilters
                ? withAlpha(item.palette.tint, 0.12)
                : withAlpha(item.palette.surface, 0.95),
              borderColor: item.hasActiveFilters
                ? item.palette.tint
                : withAlpha(item.palette.border, 0.6),
            },
          ]}
        >
          <Ionicons
            name="options-outline"
            size={16}
            color={item.hasActiveFilters ? item.palette.tint : item.palette.text}
          />
          <ThemedText
            style={[
              styles.filterButtonText,
              { color: item.hasActiveFilters ? item.palette.tint : item.palette.text },
            ]}
          >
            Filters
          </ThemedText>
          {item.activeFilterCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: item.palette.tint }]}>
              <ThemedText style={[styles.badgeText, { color: item.palette.onPrimary }]}>
                {item.activeFilterCount}
              </ThemedText>
            </View>
          ) : null}
        </Clickable>
      );
    case 'quick':
      return (
        <Chip
          active={item.active}
          onPress={item.onPress}
          disabled={item.disabled}
          style={[styles.chip, item.disabled ? styles.dimChip : undefined]}
        >
          {item.label}
          {item.countKnown ? ` (${item.count})` : item.isCountingFilters ? ' (...)' : ''}
        </Chip>
      );
    case 'divider':
      return <Divider vertical style={styles.filterDivider} />;
    case 'focus':
      return (
        <Chip
          active={item.active}
          onPress={item.onPress}
          disabled={item.disabled}
          style={[styles.chip, item.disabled ? styles.dimChip : undefined]}
        >
          {item.focus.label}
          {item.countKnown ? ` (${item.count})` : item.isCountingFilters ? ' (...)' : ''}
        </Chip>
      );
    case 'clear':
      return (
        <Clickable
          accessibilityLabel="Clear all filters"
          onPress={item.onPress}
          style={styles.inlineClear}
        >
          <Ionicons name="close-circle" size={14} color={item.palette.tint} />
          <ThemedText style={[styles.clearText, { color: item.palette.tint }]}>Clear</ThemedText>
        </Clickable>
      );
  }
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
  filterDivider: {
    height: 24,
    marginHorizontal: Spacing.sm,
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
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  badgeText: {
    fontSize: Typography.micro.fontSize,
    fontWeight: '700',
  },
  chip: {
    marginRight: 0,
    marginBottom: 0,
    minHeight: 36,
    justifyContent: 'center',
  },
  dimChip: {
    opacity: 0.5,
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
  countingText: {
    ...Typography.caption,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xxs,
  },
});
