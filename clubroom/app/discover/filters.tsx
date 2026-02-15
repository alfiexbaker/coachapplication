/**
 * Advanced Filters Screen
 *
 * Full-page filter selection screen for coach discovery.
 * Accessible via modal navigation from the main discover screen.
 */

import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilterModal } from '@/components/discover/FilterModal';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { createLogger } from '@/utils/logger';
import { useScreen } from '@/hooks/use-screen';
import { combineResults, ok } from '@/types/result';
import { discoverService } from '@/services/discover-service';
import { useTheme } from '@/hooks/useTheme';
import type { CoachSearchFilters, FilterOptions } from '@/constants/types';

const logger = createLogger('FiltersScreen');

interface FiltersScreenData {
  filterOptions: FilterOptions;
  resultCount: number;
}

export default function FiltersScreen() {
  const { colors: palette } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    filters?: string;
    returnTo?: string;
  }>();

  const [filters, setFilters] = useState<CoachSearchFilters>({});

  // Parse initial filters from params
  useEffect(() => {
    if (!params.filters) {
      setFilters({});
      return;
    }

    try {
      const parsed = JSON.parse(params.filters) as CoachSearchFilters;
      setFilters(parsed);
    } catch (error) {
      logger.error('Failed to parse filters', error);
      setFilters({});
    }
  }, [params.filters]);

  const loadFilterData = useCallback(async () => {
    const [optionsResult, countResult] = await Promise.all([
      discoverService.getFilterOptions(filters),
      discoverService.countCoaches(filters),
    ]);

    const combined = combineResults([optionsResult, countResult] as const);
    if (!combined.success) {
      logger.error('Failed to load filter data', combined.error);
      return combined;
    }

    const [filterOptions, resultCount] = combined.data;
    return ok<FiltersScreenData>({ filterOptions, resultCount });
  }, [filters]);

  const { data, status, error, retry, onRefresh } = useScreen<FiltersScreenData>({
    load: loadFilterData,
    deps: [filters],
    isEmpty: () => false,
    refetchOnFocus: true,
  });

  const filterOptions = data?.filterOptions ?? null;
  const resultCount = data?.resultCount ?? 0;

  const handleApply = useCallback(
    (newFilters: CoachSearchFilters) => {
      // Navigate back with applied filters
      const returnTo = params.returnTo ?? '/';
      const filtersParam = encodeURIComponent(JSON.stringify(newFilters));

      router.replace({
        pathname: returnTo,
        params: { appliedFilters: filtersParam },
      } as Href);
    },
    [router, params.returnTo],
  );

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  if (status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <ErrorState message={error?.message || 'Failed to load filter options.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (status === 'empty' || !filterOptions) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <EmptyState
          icon="options-outline"
          title="No filters available"
          message="Filter options could not be loaded right now."
          actionLabel="Refresh"
          onPressAction={onRefresh}
        />
      </SafeAreaView>
    );
  }

  return (
    <FilterModal
      visible
      onClose={handleClose}
      filters={filters}
      filterOptions={filterOptions}
      onApply={handleApply}
      resultCount={resultCount}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
