/**
 * Map Discovery Screen — Route File
 *
 * Thin route that delegates to platform-specific content:
 * - Native (iOS/Android): components/discover/map-content.native.tsx
 * - Web: components/discover/map-content.web.tsx
 *
 * Metro resolves the correct file per platform. This route file
 * contains zero native-only imports.
 */

import { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import MapContent from '@/components/discover/map-content';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { useScreen } from '@/hooks/use-screen';
import { useTheme } from '@/hooks/useTheme';
import { Routes } from '@/navigation/routes';
import { discoverService } from '@/services/discover-service';
import { ok } from '@/types/result';
import type { MapScreenData } from '@/components/discover/map-content-types';
import type { CoachSearchFilters } from '@/constants/types';

// ─── Constants ─────────────────────────────────────────────────────────────

const DEFAULT_LOCATION = { lat: 51.5074, lng: -0.1278, radiusKm: 10 };

// ─── Screen ────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const { colors: palette } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ filters?: string }>();

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CoachSearchFilters>({
    location: DEFAULT_LOCATION,
  });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedCoachId, setSelectedCoachId] = useState<string | undefined>();

  // ── Parse route params ────────────────────────────────────────────────
  useEffect(() => {
    if (!params.filters) return;
    try {
      const parsed = JSON.parse(params.filters) as CoachSearchFilters;
      setFilters((prev) => ({ ...prev, ...parsed, location: parsed.location ?? prev.location }));
      setSearchQuery(parsed.query ?? '');
    } catch {
      // ignore malformed
    }
  }, [params.filters]);

  // ── Data loading ──────────────────────────────────────────────────────
  const loadMapData = useCallback(async () => {
    const result = await discoverService.searchCoaches(filters);
    if (!result.success) return result;
    return ok<MapScreenData>({
      coaches: result.data.results,
      filterOptions: result.data.filterOptions,
    });
  }, [filters]);

  const { data, status, error, onRefresh, retry } = useScreen<MapScreenData>({
    load: loadMapData,
    deps: [loadMapData],
    isEmpty: (value) => value.coaches.length === 0,
    refetchOnFocus: true,
  });

  const coaches = data?.coaches ?? [];
  const filterOptions = data?.filterOptions ?? null;
  const activeFilterCount = discoverService.getActiveFilterCount(filters);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    setFilters((prev) => ({ ...prev, query: searchQuery.trim() || undefined }));
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setFilters((prev) => ({ ...prev, query: undefined }));
  }, []);

  const handleFilterChange = useCallback((next: CoachSearchFilters) => {
    setFilters((prev) => ({ ...prev, ...next, location: prev.location }));
    setShowFilterModal(false);
  }, []);

  const handleCoachSelect = useCallback((coachId: string) => {
    setSelectedCoachId(coachId);
  }, []);

  const handleBookCoach = useCallback(
    (coachId: string) => {
      router.push(Routes.bookSessionType(coachId));
    },
    [router],
  );

  const handleToggleView = useCallback(() => {
    router.replace({
      pathname: Routes.BOOK_COACH,
      params: { filters: JSON.stringify(filters) },
    } as never);
  }, [filters, router]);

  // ── Non-success states ────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <LoadingState variant="detail" />
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <ErrorState message={error?.message ?? 'Failed to load coaches.'} onRetry={retry} />
      </View>
    );
  }

  if (status === 'empty') {
    return (
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <EmptyState
          icon="map-outline"
          title="No coaches nearby"
          message="Try expanding your search or adjusting filters."
          actionLabel={activeFilterCount > 0 ? 'Clear filters' : 'Refresh'}
          onPressAction={activeFilterCount > 0 ? () => handleFilterChange({}) : onRefresh}
        />
      </View>
    );
  }

  // ── Success — delegate to platform content ────────────────────────────
  return (
    <MapContent
      coaches={coaches}
      filterOptions={filterOptions}
      filters={filters}
      searchQuery={searchQuery}
      selectedCoachId={selectedCoachId}
      activeFilterCount={activeFilterCount}
      showFilterModal={showFilterModal}
      onSearchChange={setSearchQuery}
      onSearch={handleSearch}
      onClearSearch={handleClearSearch}
      onFilterChange={handleFilterChange}
      onToggleFilterModal={setShowFilterModal}
      onCoachSelect={handleCoachSelect}
      onBookCoach={handleBookCoach}
      onBack={() => router.back()}
      onToggleView={handleToggleView}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
