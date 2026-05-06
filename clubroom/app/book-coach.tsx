import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { CoachCard, type CoachCardData } from '@/components/coach';
import { FilterBar } from '@/components/discover/FilterBar';
import { FilterModal } from '@/components/discover/FilterModal';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState } from '@/components/ui/screen-states';
import {
  Skeleton,
  SkeletonCircle,
  SkeletonPill,
  SkeletonText,
} from '@/components/ui/skeleton';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { Routes } from '@/navigation/routes';
import { discoverService } from '@/services/discover-service';
import { ok } from '@/types/result';
import type {
  CoachProfile,
  CoachSearchFilters,
  CoachSearchResult,
  FilterOptions,
} from '@/constants/types';

const DEFAULT_LOCATION = { lat: 51.5074, lng: -0.1278, radiusKm: 25 };
const FALLBACK_LOCATION_LABEL = 'London';

interface FindCoachData {
  results: CoachSearchResult[];
  filterOptions: FilterOptions;
  totalCount: number;
}

let lastFindCoachSnapshot: FindCoachData | null = null;

function formatNextAvailability(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Check next availability';
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (date.toDateString() === now.toDateString()) {
    return `Next: Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Next: Tomorrow ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return `Next: ${date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}`;
}

function toCoachCardData(coach: CoachProfile): CoachCardData {
  return {
    id: coach.id,
    fullName: coach.fullName,
    profilePhotoUrl: coach.profilePhotoUrl,
    verified: coach.badges.some((badge) => badge.label.toLowerCase().includes('verified')),
    rating: coach.rating.average,
    reviewCount: coach.rating.reviewCount,
    distanceMiles: coach.distanceMiles,
    pricePerHour: coach.sessionRate ?? coach.priceRange.min,
    city: coach.city,
    footballFocuses: coach.footballFocuses,
    reviewQuote: coach.shortBio,
    nextAvailable: formatNextAvailability(coach.nextAvailability),
  };
}

export default function BookCoachScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ coachId?: string; filters?: string }>();

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CoachSearchFilters>({
    location: DEFAULT_LOCATION,
  });
  const [showFilterModal, setShowFilterModal] = useState(false);

  useEffect(() => {
    if (!params.coachId) return;
    router.replace(
      Routes.bookCoach(params.coachId, {
        source: 'discover_search',
      }),
    );
  }, [params.coachId, router]);

  useEffect(() => {
    if (!params.filters) return;
    try {
      const parsed = JSON.parse(params.filters) as CoachSearchFilters;
      setFilters((prev) => ({
        ...prev,
        ...parsed,
        location: parsed.location ?? prev.location ?? DEFAULT_LOCATION,
      }));
      setSearchQuery(parsed.query ?? '');
    } catch {
      // Ignore malformed route params and keep defaults.
    }
  }, [params.filters]);

  const loadResults = useCallback(async () => {
    const result = await discoverService.searchCoaches(filters, 1, 40);
    if (!result.success) return result;
    return ok<FindCoachData>({
      results: result.data.results,
      filterOptions: result.data.filterOptions,
      totalCount: result.data.totalCount,
    });
  }, [filters]);

  const { data, status, error, retry, refreshing, onRefresh } = useScreen<FindCoachData>({
    load: loadResults,
    deps: [loadResults],
    isEmpty: (value) => value.totalCount === 0,
    refetchOnFocus: true,
    loadingStrategy: 'warm-first',
  });

  useEffect(() => {
    if (data) {
      lastFindCoachSnapshot = data;
    }
  }, [data]);

  const resolvedData = data ?? lastFindCoachSnapshot;
  const loading = status === 'loading' && resolvedData === null;
  const loadError = status === 'error' && resolvedData === null ? error : null;
  const filterOptions = resolvedData?.filterOptions ?? null;
  const activeFilterCount = discoverService.getActiveFilterCount(filters);

  const cards = useMemo(
    () => (resolvedData?.results ?? []).map((result) => toCoachCardData(result.coach)),
    [resolvedData?.results],
  );
  const minSessionPrice = useMemo(
    () =>
      cards.reduce((lowest, coach) => {
        const price = coach.pricePerHour ?? 0;
        if (price <= 0) return lowest;
        return lowest === 0 ? price : Math.min(lowest, price);
      }, 0),
    [cards],
  );
  const averageRating = useMemo(() => {
    const rated = cards.filter((coach) => typeof coach.rating === 'number' && coach.rating > 0);
    if (rated.length === 0) return 0;
    const total = rated.reduce((sum, coach) => sum + (coach.rating ?? 0), 0);
    return Number((total / rated.length).toFixed(1));
  }, [cards]);

  const handleSearch = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      query: searchQuery.trim().length > 0 ? searchQuery.trim() : undefined,
    }));
  }, [searchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setFilters((prev) => ({ ...prev, query: undefined }));
  }, []);

  const handleFilterChange = useCallback((next: CoachSearchFilters) => {
    setFilters({
      ...next,
      location: next.location ?? DEFAULT_LOCATION,
    });
  }, []);

  const handleOpenMap = useCallback(() => {
    router.push(Routes.discoverMap({ filters: JSON.stringify(filters) }));
  }, [filters, router]);

  const locationLabel = useMemo(() => {
    if (currentUser?.postcode) return currentUser.postcode;
    return FALLBACK_LOCATION_LABEL;
  }, [currentUser?.postcode]);
  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      {content}
    </SafeAreaView>
  );

  const header = (
    <View style={styles.headerWrap}>
      <View style={styles.headerContent}>
        <Row align="center" justify="between" style={styles.headerTop}>
          <Clickable
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: palette.surface }]}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={palette.text} />
          </Clickable>
          <Clickable
            onPress={handleOpenMap}
            style={[
              styles.locationPill,
              {
                backgroundColor: withAlpha(palette.tint, 0.08),
                borderColor: withAlpha(palette.tint, 0.18),
              },
            ]}
            accessibilityLabel="Edit location"
          >
            <Row align="center" justify="center" gap="xs">
              <Ionicons name="location" size={14} color={palette.tint} />
              <ThemedText style={[styles.locationText, { color: palette.tint }]}>
                {locationLabel}
              </ThemedText>
              <Ionicons name="chevron-down" size={14} color={palette.tint} />
            </Row>
          </Clickable>
          <Clickable
            onPress={handleOpenMap}
            style={[styles.mapIconButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
            accessibilityLabel="Open map view"
          >
            <Ionicons name="map-outline" size={18} color={palette.text} />
          </Clickable>
        </Row>
        <SurfaceCard
          style={[
            styles.heroCard,
            {
              backgroundColor: palette.surface,
              borderColor: withAlpha(palette.border, 0.9),
            },
          ]}
          tactile={false}
        >
          <ThemedText style={[styles.eyebrow, { color: palette.muted }]}>Map-first discovery</ThemedText>
          <ThemedText type="title" style={styles.title}>
            Find a Coach Nearby
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Search trusted local coaches, then open the map to choose by distance, fit, and next bookable session.
          </ThemedText>

          <Row
            align="center"
            gap="sm"
            style={[
              styles.searchBar,
              {
                borderColor: palette.border,
                backgroundColor: palette.background,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={palette.muted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              placeholder="Search coach, focus, city..."
              placeholderTextColor={palette.muted}
              returnKeyType="search"
              style={[styles.searchInput, { color: palette.text }]}
              accessibilityLabel="Search coaches"

            maxLength={100}
          />
            {searchQuery.length > 0 ? (
              <Clickable accessibilityLabel="Clear search" onPress={handleClearSearch}>
                <Ionicons name="close-circle" size={18} color={palette.muted} />
              </Clickable>
            ) : null}
          </Row>

          <Row gap="sm">
            <View
              style={[
                styles.metricChip,
                {
                  backgroundColor: withAlpha(palette.tint, 0.09),
                },
              ]}
            >
              <ThemedText style={[styles.metricValue, { color: palette.tint }]}>
                {resolvedData?.totalCount ?? 0}
              </ThemedText>
              <ThemedText style={[styles.metricLabel, { color: palette.muted }]}>Available</ThemedText>
            </View>
            <View
              style={[
                styles.metricChip,
                {
                  backgroundColor: withAlpha(palette.success, 0.1),
                },
              ]}
            >
              <ThemedText style={[styles.metricValue, { color: palette.success }]}>
                {minSessionPrice > 0 ? `£${minSessionPrice}` : '£--'}
              </ThemedText>
              <ThemedText style={[styles.metricLabel, { color: palette.muted }]}>Starting price</ThemedText>
            </View>
            <View
              style={[
                styles.metricChip,
                {
                  backgroundColor: withAlpha(palette.rating, 0.12),
                },
              ]}
            >
              <ThemedText style={[styles.metricValue, { color: palette.rating }]}>
                {averageRating > 0 ? `${averageRating}★` : '--'}
              </ThemedText>
              <ThemedText style={[styles.metricLabel, { color: palette.muted }]}>Avg rating</ThemedText>
            </View>
          </Row>
        </SurfaceCard>
      </View>

      {filterOptions ? (
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onOpenFilters={() => setShowFilterModal(true)}
          totalResults={cards.length}
          activeFilterCount={activeFilterCount}
        />
      ) : loading || params.coachId ? (
        <Row style={styles.filterSkeletonRow} gap="xs">
          <SkeletonPill width={96} height={34} />
          <SkeletonPill width={124} height={34} />
          <SkeletonPill width={88} height={34} />
        </Row>
      ) : null}
    </View>
  );

  if (params.coachId) {
    return renderShell(
      <>
        {header}
        <CoachDiscoveryResultsSkeleton />
      </>,
    );
  }

  if (loadError) {
    return renderShell(
      <>
        {header}
        <ErrorState message={loadError.message ?? 'Failed to load coaches.'} onRetry={retry} />
      </>,
    );
  }

  if (!loading && status === 'empty') {
    return renderShell(
      <>
        {header}
        <EmptyState
          icon="search-outline"
          title="No coaches found"
          message="Try adjusting filters or searching a different focus area."
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
      </>,
    );
  }

  return renderShell(
    <>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />
        }
      >
        {header}
        {loading ? (
          <CoachDiscoveryResultsSkeleton />
        ) : (
          <View style={styles.results}>
            {cards.map((coach, index) => (
              <CoachCard
                key={coach.id}
                coach={coach}
                variant="discovery"
                index={index}
                onPress={() => router.push(Routes.coach(coach.id))}
                onBookNow={() =>
                  router.push(
                    Routes.bookCoach(coach.id, {
                      source: 'discover_search',
                    }),
                  )
                }
              />
            ))}
          </View>
        )}
      </ScrollView>

      {filterOptions ? (
        <FilterModal
          visible={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          filters={filters}
          filterOptions={filterOptions}
          onApply={handleFilterChange}
          resultCount={cards.length}
        />
      ) : null}
    </>,
  );
}

function CoachDiscoveryResultsSkeleton() {
  return (
    <View style={styles.results}>
      {Array.from({ length: 3 }).map((_, index) => (
        <SurfaceCard key={index} style={styles.resultSkeletonCard} tactile={false}>
          <Row align="center" justify="between" style={styles.resultSkeletonHeader}>
            <Row align="center" gap="sm">
              <SkeletonCircle size={56} />
              <View style={styles.resultSkeletonCopy}>
                <SkeletonText lines={2} widths={['58%', '34%']} />
              </View>
            </Row>
            <SkeletonPill width={68} height={28} />
          </Row>
          <SkeletonText lines={2} widths={['100%', '72%']} />
          <Row gap="xs" wrap>
            <SkeletonPill width={86} />
            <SkeletonPill width={74} />
            <SkeletonPill width={96} />
          </Row>
          <Skeleton height={118} radius={Radii.lg} />
          <Row gap="sm">
            <SkeletonPill width={102} height={40} />
            <SkeletonPill width={138} height={40} />
          </Row>
        </SurfaceCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  headerWrap: {
    gap: Spacing.sm,
  },
  headerContent: {
    gap: Spacing.sm,
  },
  headerTop: {
    minHeight: 44,
    gap: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  locationPill: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radii.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
  },
  locationText: {
    ...Typography.smallSemiBold,
  },
  mapIconButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  heroCard: {
    padding: Spacing.sm,
    borderRadius: Radii.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  eyebrow: {
    ...Typography.micro,
    letterSpacing: 0.8,
  },
  title: {
    ...Typography.display,
    letterSpacing: -0.8,
  },
  subtitle: {
    ...Typography.body,
  },
  searchBar: {
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.md,
    minHeight: 50,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    paddingVertical: 0,
  },
  metricChip: {
    flex: 1,
    borderRadius: Radii.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    gap: Spacing.micro,
  },
  metricValue: {
    ...Typography.heading,
  },
  metricLabel: {
    ...Typography.small,
  },
  results: {
    gap: Spacing.xs,
    paddingBottom: Spacing.md,
  },
  filterSkeletonRow: {
    paddingHorizontal: Spacing.xs,
  },
  resultSkeletonCard: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  resultSkeletonHeader: {
    alignItems: 'center',
  },
  resultSkeletonCopy: {
    flex: 1,
  },
});
