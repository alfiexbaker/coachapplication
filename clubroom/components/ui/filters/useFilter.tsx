/**
 * useFilter - State management hook for filter systems.
 *
 * Provides:
 * - Filter state with type safety
 * - Draft state for modal apply/cancel pattern
 * - Active filter count calculation
 * - Reset to defaults
 *
 * @example
 * const { filters, setFilter, resetFilters, activeCount } = useFilter({
 *   distance: { default: undefined, isActive: (v) => v !== undefined },
 *   price: { default: undefined },
 *   specialties: { default: [], isActive: (v) => v.length > 0 },
 * });
 */

import { useState, useCallback, useMemo } from 'react';

export interface FilterFieldConfig<T> {
  /** Default/initial value */
  default: T;
  /** Custom function to determine if filter is "active" */
  isActive?: (value: T) => boolean;
}

export type FilterConfig<T> = {
  [K in keyof T]: FilterFieldConfig<T[K]>;
};

export type FilterState<T> = {
  [K in keyof T]: T[K];
};

export interface UseFilterReturn<T> {
  /** Current filter values */
  filters: FilterState<T>;
  /** Set a single filter value */
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Set multiple filter values at once */
  setFilters: (updates: Partial<T>) => void;
  /** Reset all filters to defaults */
  resetFilters: () => void;
  /** Reset a single filter to default */
  resetFilter: <K extends keyof T>(key: K) => void;
  /** Number of active filters */
  activeCount: number;
  /** Check if a specific filter is active */
  isActive: <K extends keyof T>(key: K) => boolean;
  /** Check if any filters are active */
  hasActiveFilters: boolean;

  // Draft state for modal pattern
  /** Draft filter values (for apply/cancel pattern) */
  draft: FilterState<T>;
  /** Update draft value */
  setDraft: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Apply draft to main filters */
  applyDraft: () => void;
  /** Discard draft changes */
  discardDraft: () => void;
  /** Sync draft with current filters (call when opening modal) */
  syncDraft: () => void;
}

export function useFilter<T extends Record<string, unknown>>(
  config: FilterConfig<T>
): UseFilterReturn<T> {
  // Build initial state from config defaults
  const getDefaults = useCallback((): FilterState<T> => {
    const defaults = {} as FilterState<T>;
    for (const key in config) {
      defaults[key as keyof T] = config[key].default;
    }
    return defaults;
  }, [config]);

  const [filters, setFiltersState] = useState<FilterState<T>>(getDefaults);
  const [draft, setDraftState] = useState<FilterState<T>>(getDefaults);

  // Set single filter
  const setFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Set multiple filters
  const setFilters = useCallback((updates: Partial<T>) => {
    setFiltersState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFiltersState(getDefaults());
  }, [getDefaults]);

  // Reset single filter
  const resetFilter = useCallback(
    <K extends keyof T>(key: K) => {
      setFiltersState((prev) => ({ ...prev, [key]: config[key].default }));
    },
    [config]
  );

  // Check if filter is active
  const isActive = useCallback(
    <K extends keyof T>(key: K): boolean => {
      const value = filters[key];
      const fieldConfig = config[key];

      if (fieldConfig.isActive) {
        return fieldConfig.isActive(value);
      }

      // Default: active if not equal to default
      const defaultValue = fieldConfig.default;

      if (Array.isArray(value)) {
        return value.length > 0;
      }
      if (value === undefined || value === null) {
        return false;
      }
      return value !== defaultValue;
    },
    [filters, config]
  );

  // Count active filters
  const activeCount = useMemo(() => {
    let count = 0;
    for (const key in config) {
      if (isActive(key as keyof T)) {
        count++;
      }
    }
    return count;
  }, [config, isActive]);

  const hasActiveFilters = activeCount > 0;

  // Draft state methods
  const setDraft = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setDraftState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyDraft = useCallback(() => {
    setFiltersState(draft);
  }, [draft]);

  const discardDraft = useCallback(() => {
    setDraftState(filters);
  }, [filters]);

  const syncDraft = useCallback(() => {
    setDraftState(filters);
  }, [filters]);

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    resetFilter,
    activeCount,
    isActive,
    hasActiveFilters,
    draft,
    setDraft,
    applyDraft,
    discardDraft,
    syncDraft,
  };
}
