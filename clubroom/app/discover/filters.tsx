/**
 * Advanced Filters Screen
 *
 * Full-page filter selection screen for coach discovery.
 * Accessible via modal navigation from the main discover screen.
 */

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FilterModal } from '@/components/discover/FilterModal';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { discoverService } from '@/services/discover-service';
import type { CoachSearchFilters, FilterOptions } from '@/constants/types';

export default function FiltersScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const router = useRouter();
  const params = useLocalSearchParams<{
    filters?: string;
    returnTo?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CoachSearchFilters>({});
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [resultCount, setResultCount] = useState(0);

  // Parse initial filters from params
  useEffect(() => {
    const parseFilters = async () => {
      try {
        if (params.filters) {
          const parsed = JSON.parse(params.filters) as CoachSearchFilters;
          setFilters(parsed);
        }

        // Load filter options
        const options = await discoverService.getFilterOptions(filters);
        setFilterOptions(options);
        setResultCount(options.totalCount);
      } catch (error) {
        console.error('[FiltersScreen] Failed to parse filters:', error);
      } finally {
        setLoading(false);
      }
    };

    parseFilters();
  }, [params.filters]);

  // Update result count when filters change
  useEffect(() => {
    const updateCount = async () => {
      const count = await discoverService.countCoaches(filters);
      setResultCount(count);
    };

    if (!loading) {
      updateCount();
    }
  }, [filters, loading]);

  const handleApply = useCallback(
    (newFilters: CoachSearchFilters) => {
      // Navigate back with applied filters
      const returnTo = params.returnTo ?? '/';
      const filtersParam = encodeURIComponent(JSON.stringify(newFilters));

      router.replace({
        pathname: returnTo as `/${string}`,
        params: { appliedFilters: filtersParam },
      });
    },
    [router, params.returnTo]
  );

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  if (loading || !filterOptions) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top']}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
