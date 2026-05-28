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
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { useScreen } from '@/hooks/use-screen';
import { useTheme } from '@/hooks/useTheme';
import { Routes } from '@/navigation/routes';
import { apiClient } from '@/services/api-client';
import { listPublicCoachOfferingsFromApi } from '@/services/coach-offering-api';
import { discoverService } from '@/services/discover-service';
import { accountIdsMatch } from '@/utils/account-id';
import { createLogger } from '@/utils/logger';
import { getFixedScheduleFromOffering } from '@/utils/session-offering-booking';
import { getSessionOfferingHeadcount } from '@/utils/session-offering-capacity';
import { ok } from '@/types/result';
import type { MapScreenData } from '@/components/discover/map-content-types';
import type { CoachSearchFilters, SessionOffering } from '@/constants/types';

// ─── Constants ─────────────────────────────────────────────────────────────

const DEFAULT_LOCATION = { lat: 51.5074, lng: -0.1278, radiusKm: 10 };
const logger = createLogger('DiscoverMapScreen');
let lastMapSnapshot: MapScreenData | null = null;

function selectPreferredOffering(
  offerings: SessionOffering[],
  coachId: string,
): SessionOffering | null {
  const now = Date.now();

  return (
    offerings
      .filter((offering) => accountIdsMatch(offering.coachId, coachId))
      .filter((offering) => offering.status === 'active')
      .filter((offering) => {
        const startsAt = new Date(offering.scheduledAt).getTime();
        return offering.isRecurring || (Number.isFinite(startsAt) && startsAt >= now);
      })
      .filter((offering) => getSessionOfferingHeadcount(offering) < offering.maxParticipants)
      .sort((a, b) => {
        const aDate = getFixedScheduleFromOffering(a)?.date ?? a.scheduledAt;
        const bDate = getFixedScheduleFromOffering(b)?.date ?? b.scheduledAt;
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      })[0] ?? null
  );
}

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
    loadingStrategy: 'section-skeleton',
  });

  useEffect(() => {
    if (data) {
      lastMapSnapshot = data;
    }
  }, [data]);

  const resolvedData = data ?? lastMapSnapshot;
  const coaches = resolvedData?.coaches ?? [];
  const filterOptions = resolvedData?.filterOptions ?? null;
  const activeFilterCount = discoverService.getActiveFilterCount(filters);
  const coldLoading = status === 'loading' && resolvedData === null;
  const blockingError = status === 'error' && resolvedData === null;
  const blockingEmpty = status === 'empty' && resolvedData === null;

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

  const handleCoachProfile = useCallback(
    (coachId: string) => {
      router.push(Routes.coach(coachId));
    },
    [router],
  );

  const handleBookCoach = useCallback(
    (coachId: string) => {
      void (async () => {
        let offeringId: string | undefined;
        try {
          if (apiClient.isMockMode) {
            const offerings = await apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []);
            offeringId = selectPreferredOffering(offerings, coachId)?.id;
          } else {
            const offeringsResult = await listPublicCoachOfferingsFromApi(
              coachId,
              new Date().toISOString(),
            );
            if (!offeringsResult.success) {
              logger.warn('Discover map offering fast-track unavailable', {
                coachId,
                error: offeringsResult.error,
              });
            }
            const offerings = offeringsResult.success ? offeringsResult.data : [];
            offeringId = selectPreferredOffering(offerings, coachId)?.id;
          }
        } catch {
          offeringId = undefined;
        }

        logger.debug('Discover map routing decision', {
          coachId,
          source: 'discover_map_coach',
          target: offeringId ? 'offering_fast_track' : 'session_list_first',
          offeringId: offeringId ?? null,
        });

        router.push(
          Routes.bookCoach(coachId, {
            source: 'discover_map_coach',
            offeringId,
          }),
        );
      })();
    },
    [router],
  );

  const handleToggleView = useCallback(() => {
    router.replace(Routes.bookCoachSearch({ filters: JSON.stringify(filters) }));
  }, [filters, router]);

  // ── Non-success states ────────────────────────────────────────────────
  if (coldLoading) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <LoadingState variant="detail" />
      </View>
    );
  }

  if (blockingError) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <ErrorState message={error?.message ?? 'Failed to load coaches.'} onRetry={retry} />
      </View>
    );
  }

  if (blockingEmpty) {
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
      onCoachProfile={handleCoachProfile}
      onBookCoach={handleBookCoach}
      onBack={() => router.back()}
      onToggleView={handleToggleView}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
