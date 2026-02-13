/**
 * Map View Screen
 *
 * Full-screen map view showing coaches by location.
 */

import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MapView } from '@/components/discover/MapView';
import { FilterBar } from '@/components/discover/FilterBar';
import { FilterModal } from '@/components/discover/FilterModal';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useTheme } from '@/hooks/useTheme';
import { discoverService } from '@/services/discover-service';
import { createLogger } from '@/utils/logger';
import { MapScreenHeader } from '@/components/discover/map-screen-sections';
import type {
  CoachSearchFilters,
  CoachSearchResult,
  CoachProfile,
  FilterOptions,
} from '@/constants/types';

const logger = createLogger('MapScreen');
const DEFAULT_LOCATION = { lat: 51.5074, lng: -0.1278 };
const DEFAULT_RADIUS = 10;

interface MapScreenData {
  coaches: CoachSearchResult[];
  filterOptions: FilterOptions;
}

export default function MapScreen() {
  const { colors: palette } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ filters?: string }>();

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CoachSearchFilters>({
    location: { ...DEFAULT_LOCATION, radiusKm: DEFAULT_RADIUS },
  });
  const [selectedCoachId, setSelectedCoachId] = useState<string>();
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const loadMapData = useCallback(async () => {
    const result = await discoverService.searchCoaches(filters);
    if (!result.success) {
      logger.error('Failed to load coaches', result.error);
      return result;
    }

    return ok<MapScreenData>({
      coaches: result.data.results,
      filterOptions: result.data.filterOptions,
    });
  }, [filters]);

  const { data, status, error, onRefresh, retry } = useScreen<MapScreenData>({
    load: loadMapData,
    deps: [filters],
    isEmpty: (value) => value.coaches.length === 0,
    refetchOnFocus: true,
  });

  const coaches = data?.coaches ?? [];
  const filterOptions = data?.filterOptions ?? null;
  const activeFilterCount = discoverService.getActiveFilterCount(filters);

  useEffect(() => {
    if (!params.filters) return;

    try {
      const parsed = JSON.parse(params.filters) as CoachSearchFilters;
      setFilters((prev) => ({ ...prev, ...parsed, location: parsed.location ?? prev.location }));
    } catch (parseError) {
      logger.error('Failed to parse filters', parseError);
    }
  }, [params.filters]);

  const handleSearch = useCallback(() => {
    setFilters((prev) => ({ ...prev, query: searchQuery || undefined }));
  }, [searchQuery]);

  const handleFilterChange = useCallback((newFilters: CoachSearchFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters, location: prev.location }));
    setShowFilterModal(false);
  }, []);

  const handleCoachPress = useCallback(
    (coach: CoachProfile) => {
      router.push(Routes.bookCoach(coach.id));
    },
    [router],
  );

  const header = (
    <MapScreenHeader
      colors={palette}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onSearch={handleSearch}
      onClearSearch={() => {
        setSearchQuery('');
        setFilters((prev) => ({ ...prev, query: undefined }));
      }}
      onBack={() => router.back()}
      onToggleView={() => router.replace(Routes.ROOT)}
    />
  );

  if (status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top']}
      >
        {header}
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top']}
      >
        {header}
        <ErrorState
          message={error?.message || 'Failed to load coaches on the map.'}
          onRetry={retry}
        />
      </SafeAreaView>
    );
  }

  if (status === 'empty') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top']}
      >
        {header}
        {filterOptions ? (
          <FilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            onOpenFilters={() => setShowFilterModal(true)}
            totalResults={0}
            activeFilterCount={activeFilterCount}
          />
        ) : null}

        <EmptyState
          icon="map-outline"
          title="No coaches found"
          message="Try adjusting your filters or search to find coaches in this area."
          actionLabel={activeFilterCount > 0 ? 'Adjust filters' : 'Refresh'}
          onPressAction={activeFilterCount > 0 ? () => setShowFilterModal(true) : onRefresh}
        />

        {filterOptions ? (
          <FilterModal
            visible={showFilterModal}
            onClose={() => setShowFilterModal(false)}
            filters={filters}
            filterOptions={filterOptions}
            onApply={handleFilterChange}
            resultCount={0}
          />
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      {header}

      {filterOptions ? (
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onOpenFilters={() => setShowFilterModal(true)}
          totalResults={coaches.length}
          activeFilterCount={activeFilterCount}
        />
      ) : null}

      <MapView
        coaches={coaches}
        selectedCoachId={selectedCoachId}
        onCoachSelect={setSelectedCoachId}
        onCoachPress={handleCoachPress}
        userLocation={DEFAULT_LOCATION}
        showUserLocation
        zoomLevel={zoomLevel}
        onSearchAreaPress={onRefresh}
        onZoomInPress={() => setZoomLevel((prev) => Math.min(prev + 0.5, 4))}
        onZoomOutPress={() => setZoomLevel((prev) => Math.max(prev - 0.5, 0.5))}
      />

      {filterOptions ? (
        <FilterModal
          visible={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          filters={filters}
          filterOptions={filterOptions}
          onApply={handleFilterChange}
          resultCount={coaches.length}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
