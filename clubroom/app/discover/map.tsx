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

import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import MapContent from '@/components/discover/map-content';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { useScreen } from '@/hooks/use-screen';
import { useTheme } from '@/hooks/useTheme';
import { Routes } from '@/navigation/routes';
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

interface InitialMapSearchState {
  filters: CoachSearchFilters;
  searchQuery: string;
}

function getInitialMapSearchState(filtersParam: string | undefined): InitialMapSearchState {
  if (!filtersParam) {
    return {
      filters: {
        location: DEFAULT_LOCATION,
      },
      searchQuery: '',
    };
  }

  try {
    const parsed = JSON.parse(filtersParam) as CoachSearchFilters;
    return {
      filters: {
        ...parsed,
        location: parsed.location ?? DEFAULT_LOCATION,
      },
      searchQuery: parsed.query ?? '',
    };
  } catch {
    return {
      filters: {
        location: DEFAULT_LOCATION,
      },
      searchQuery: '',
    };
  }
}

function selectPreferredOffering(
  offerings: SessionOffering[],
  coachId: string,
): SessionOffering | null {
  const now = Date.now();

  return offerings.reduce<SessionOffering | null>((preferred, offering) => {
    const startsAt = new Date(offering.scheduledAt).getTime();
    if (
      !accountIdsMatch(offering.coachId, coachId) ||
      offering.status !== 'active' ||
      (!offering.isRecurring && (!Number.isFinite(startsAt) || startsAt < now)) ||
      getSessionOfferingHeadcount(offering) >= offering.maxParticipants
    ) {
      return preferred;
    }

    if (!preferred) {
      return offering;
    }

    const offeringDate = getFixedScheduleFromOffering(offering)?.date ?? offering.scheduledAt;
    const preferredDate = getFixedScheduleFromOffering(preferred)?.date ?? preferred.scheduledAt;
    return new Date(offeringDate).getTime() < new Date(preferredDate).getTime()
      ? offering
      : preferred;
  }, null);
}

// ─── Screen ────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const params = useLocalSearchParams<{ filters?: string }>();
  const initialState = getInitialMapSearchState(params.filters);
  const { colors: palette } = useTheme();
  const { back, push, replace } = useRouter();

  const [searchQuery, setSearchQuery] = useState(initialState.searchQuery);
  const [filters, setFilters] = useState<CoachSearchFilters>(initialState.filters);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedCoachId, setSelectedCoachId] = useState<string | undefined>();
  const filtersRef = useRef(filters);

  useEffect(() => {
    filtersRef.current = filters;
  });

  // ── Data loading ──────────────────────────────────────────────────────
  const loadMapData = async () => {
    const result = await discoverService.searchCoaches(filtersRef.current);
    if (!result.success) return result;
    return ok<MapScreenData>({
      coaches: result.data.results,
      filterOptions: result.data.filterOptions,
    });
  };

  const { data, status, error, onRefresh, retry } = useScreen<MapScreenData>({
    load: loadMapData,
    deps: [filters],
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
  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, query: searchQuery.trim() || undefined }));
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setFilters((prev) => ({ ...prev, query: undefined }));
  };

  const handleFilterChange = (next: CoachSearchFilters) => {
    setFilters((prev) => ({ ...prev, ...next, location: prev.location }));
    setShowFilterModal(false);
  };

  const handleCoachSelect = (coachId: string) => {
    setSelectedCoachId(coachId);
  };

  const handleCoachProfile = (coachId: string) => {
    push(Routes.coach(coachId));
  };

  const handleBookCoach = (coachId: string) => {
    void (async () => {
      let offeringId: string | undefined;
      try {
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
      } catch {
        offeringId = undefined;
      }

      logger.debug('Discover map routing decision', {
        coachId,
        source: 'discover_map_coach',
        target: offeringId ? 'offering_fast_track' : 'session_list_first',
        offeringId: offeringId ?? null,
      });

      push(
        Routes.bookCoach(coachId, {
          source: 'discover_map_coach',
          offeringId,
        }),
      );
    })();
  };

  const handleToggleView = () => {
    replace(Routes.bookCoachSearch({ filters: JSON.stringify(filters) }));
  };

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
      onBack={() => back()}
      onToggleView={handleToggleView}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
