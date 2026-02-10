/**
 * Map View Screen
 *
 * Full-screen map view showing coaches by location.
 * Allows location-based discovery and filtering.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { MapView } from '@/components/discover/MapView';
import { createLogger } from '@/utils/logger';
import { FilterBar } from '@/components/discover/FilterBar';
import { FilterModal } from '@/components/discover/FilterModal';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { discoverService } from '@/services/discover-service';
import type {
  CoachSearchFilters,
  CoachSearchResult,
  CoachProfile,
  FilterOptions,
} from '@/constants/types';

const logger = createLogger('MapScreen');

// Default location (London)
const DEFAULT_LOCATION = { lat: 51.5074, lng: -0.1278 };
const DEFAULT_RADIUS = 10; // km

export default function MapScreen() {
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const router = useRouter();
  const params = useLocalSearchParams<{ filters?: string }>();

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CoachSearchFilters>({
    location: { ...DEFAULT_LOCATION, radiusKm: DEFAULT_RADIUS },
  });
  const [coaches, setCoaches] = useState<CoachSearchResult[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState<string>();
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Load coaches
  const loadCoaches = useCallback(async () => {
    setLoading(true);
    try {
      const responseResult = await discoverService.searchCoaches(filters);
      if (!responseResult.success) {
        logger.error('Failed to load coaches', responseResult.error);
        setCoaches([]);
        setFilterOptions(null);
        return;
      }
      setCoaches(responseResult.data.results);
      setFilterOptions(responseResult.data.filterOptions);
    } catch (error) {
      logger.error('Failed to load coaches', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Parse filters from params on mount
  useEffect(() => {
    if (params.filters) {
      try {
        const parsed = JSON.parse(params.filters) as CoachSearchFilters;
        setFilters((prev) => ({
          ...prev,
          ...parsed,
          location: parsed.location ?? prev.location,
        }));
      } catch (error) {
        logger.error('Failed to parse filters', error);
      }
    }
    loadCoaches();
  }, [params.filters, loadCoaches]);

  // Reload when filters change
  useEffect(() => {
    loadCoaches();
  }, [loadCoaches]);

  const handleSearch = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      query: searchQuery || undefined,
    }));
  }, [searchQuery]);

  const handleFilterChange = useCallback((newFilters: CoachSearchFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      // Preserve location from current filters
      location: prev.location,
    }));
    setShowFilterModal(false);
  }, []);

  const handleCoachSelect = useCallback((coachId: string) => {
    setSelectedCoachId((prev) => (prev === coachId ? undefined : coachId));
  }, []);

  const handleCoachPress = useCallback(
    (coach: CoachProfile) => {
      router.push(Routes.bookCoach(coach.id));
    },
    [router]
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleToggleView = useCallback(() => {
    // Navigate to list view with current filters
    router.replace(Routes.ROOT);
  }, [router, filters]);

  const activeFilterCount = discoverService.getActiveFilterCount(filters);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      {/* Header */}
      <Row align="center" gap="sm" style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={handleBack}
          style={({ pressed }) => [
            styles.headerButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Pressable>

        {/* Search Bar */}
        <Row
          align="center"
          gap="sm"
          style={[
            styles.searchBar,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <Ionicons name="search" size={18} color={palette.muted} />
          <TextInput
            style={[styles.searchInput, { color: palette.text }]}
            placeholder="Search coaches..."
            placeholderTextColor={palette.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setSearchQuery('');
                setFilters((prev) => ({ ...prev, query: undefined }));
              }}
            >
              <Ionicons name="close-circle" size={18} color={palette.muted} />
            </Pressable>
          )}
        </Row>

        {/* Toggle View Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Switch to list view"
          onPress={handleToggleView}
          style={({ pressed }) => [
            styles.headerButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="list" size={24} color={palette.text} />
        </Pressable>
      </Row>

      {/* Filter Bar */}
      {filterOptions && (
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onOpenFilters={() => setShowFilterModal(true)}
          totalResults={coaches.length}
          activeFilterCount={activeFilterCount}
        />
      )}

      {/* Map */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      ) : (
        <MapView
          coaches={coaches}
          selectedCoachId={selectedCoachId}
          onCoachSelect={handleCoachSelect}
          onCoachPress={handleCoachPress}
          userLocation={DEFAULT_LOCATION}
          showUserLocation
        />
      )}

      {/* Filter Modal */}
      {filterOptions && (
        <FilterModal
          visible={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          filters={filters}
          filterOptions={filterOptions}
          onApply={handleFilterChange}
          resultCount={coaches.length}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerButton: {
    padding: Spacing.xs,
  },
  searchBar: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
