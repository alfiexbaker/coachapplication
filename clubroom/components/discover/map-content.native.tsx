/**
 * Map Content — Native (iOS/Android)
 *
 * Full Apple/Google Maps with price pins, clustered markers,
 * gesture-driven bottom sheet, GPS, search-as-you-move.
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import ClusteredMapView from 'react-native-map-clustering';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { FilterBar } from '@/components/discover/FilterBar';
import { FilterModal } from '@/components/discover/FilterModal';
import { Radii, Shadows, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CoachProfile, CoachSearchResult } from '@/constants/types';
import type { MapContentProps } from './map-content-types';

// ─── Constants ─────────────────────────────────────────────────────────────

const DEFAULT_REGION: Region = {
  latitude: 51.5074,
  longitude: -0.1278,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};
const SHEET_SNAP_POINTS = [130, '45%', '85%'];
const ListSeparator = () => <View style={{ height: Spacing.xs }} />;
const REGION_SHIFT_THRESHOLD = 0.3;

function hasRegionShifted(prev: Region, next: Region): boolean {
  const latShift = Math.abs(next.latitude - prev.latitude) / prev.latitudeDelta;
  const lngShift = Math.abs(next.longitude - prev.longitude) / prev.longitudeDelta;
  return latShift > REGION_SHIFT_THRESHOLD || lngShift > REGION_SHIFT_THRESHOLD;
}

// ─── PricePin ──────────────────────────────────────────────────────────────

const PricePin = memo(function PricePin({
  price,
  selected,
}: {
  price: number;
  selected: boolean;
}) {
  const { colors: palette, scheme } = useTheme();
  const bg = selected ? palette.tint : palette.surface;
  const textColor = selected ? palette.onPrimary : palette.text;

  return (
    <View style={styles.pinWrap}>
      <View
        style={[
          styles.pin,
          {
            backgroundColor: bg,
            borderColor: selected ? palette.tint : palette.border,
            ...(selected ? Shadows[scheme].cardHover : Shadows[scheme].subtle),
            transform: [{ scale: selected ? 1.12 : 1 }],
          },
        ]}
      >
        <ThemedText style={[styles.pinText, { color: textColor }]}>£{price}</ThemedText>
      </View>
      <View style={[styles.pinArrow, { borderTopColor: bg }]} />
    </View>
  );
});

// ─── SearchHeader ──────────────────────────────────────────────────────────

const SearchHeader = memo(function SearchHeader({
  searchQuery,
  onSearchChange,
  onSearch,
  onClearSearch,
  onBack,
  onToggleView,
}: {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  onBack: () => void;
  onToggleView: () => void;
}) {
  const { colors: palette, scheme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + Spacing.xs,
          backgroundColor: withAlpha(palette.background, 0.92),
        },
      ]}
    >
      <Row align="center" gap="xs">
        <Clickable
          onPress={onBack}
          style={[styles.headerBtn, { backgroundColor: palette.surface, borderColor: palette.border, ...Shadows[scheme].subtle }]}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={palette.text} />
        </Clickable>
        <Row
          align="center"
          gap="sm"
          style={[styles.searchBar, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <Ionicons name="search" size={16} color={palette.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={onSearchChange}
            onSubmitEditing={onSearch}
            placeholder="Search coaches..."
            placeholderTextColor={palette.muted}
            returnKeyType="search"
            style={[styles.searchInput, { color: palette.text }]}
            accessibilityLabel="Search coaches"
          />
          {searchQuery.length > 0 ? (
            <Clickable accessibilityLabel="Clear search" onPress={onClearSearch}>
              <Ionicons name="close-circle" size={16} color={palette.muted} />
            </Clickable>
          ) : null}
        </Row>
        <Clickable
          onPress={onToggleView}
          style={[styles.headerBtn, { backgroundColor: palette.surface, borderColor: palette.border, ...Shadows[scheme].subtle }]}
          accessibilityLabel="Switch to list view"
        >
          <Ionicons name="list" size={20} color={palette.text} />
        </Clickable>
      </Row>
    </View>
  );
});

// ─── CoachSheetItem ────────────────────────────────────────────────────────

const CoachSheetItem = memo(function CoachSheetItem({
  coach,
  selected,
  onPress,
  onBook,
}: {
  coach: CoachProfile;
  selected: boolean;
  onPress: () => void;
  onBook: () => void;
}) {
  const { colors: palette } = useTheme();
  const price = coach.sessionRate ?? coach.priceRange.minUsd;

  return (
    <SurfaceCard
      onPress={onPress}
      style={styles.sheetCard}
      outlineGradient={selected ? [palette.tint, palette.tint] : undefined}
      gradientPadding={selected ? 2 : 0}
      accessibilityLabel={`Coach ${coach.fullName}, £${price} per session`}
    >
      <Row gap="sm" align="center">
        <Image
          source={{ uri: coach.profilePhotoUrl }}
          style={styles.avatar}
          contentFit="cover"
        />
        <View style={styles.sheetInfo}>
          <Row align="center" justify="between">
            <ThemedText style={styles.sheetName} numberOfLines={1}>
              {coach.fullName}
            </ThemedText>
            <ThemedText style={[styles.sheetPrice, { color: palette.text }]}>
              £{price}
            </ThemedText>
          </Row>
          <Row align="center" gap="xs">
            <Ionicons name="star" size={12} color={palette.warning} />
            <ThemedText style={[styles.sheetMeta, { color: palette.muted }]}>
              {coach.rating.average.toFixed(1)} ({coach.rating.reviewCount})
            </ThemedText>
            {coach.distanceMiles > 0 ? (
              <ThemedText style={[styles.sheetMeta, { color: palette.muted }]}>
                · {coach.distanceMiles.toFixed(1)} mi
              </ThemedText>
            ) : null}
          </Row>
          <Row align="center" justify="between">
            <ThemedText style={[styles.sheetFocus, { color: palette.muted }]} numberOfLines={1}>
              {(coach.footballFocuses ?? []).slice(0, 2).join(' · ')}
            </ThemedText>
            <Clickable onPress={onBook} accessibilityLabel={`Book ${coach.fullName}`}>
              <ThemedText style={[styles.bookLink, { color: palette.tint }]}>Book</ThemedText>
            </Clickable>
          </Row>
        </View>
      </Row>
    </SurfaceCard>
  );
});

// ─── MapContent ────────────────────────────────────────────────────────────

export default function MapContent(props: MapContentProps) {
  const {
    coaches,
    filterOptions,
    filters,
    searchQuery,
    selectedCoachId,
    activeFilterCount,
    showFilterModal,
    onSearchChange,
    onSearch,
    onClearSearch,
    onFilterChange,
    onToggleFilterModal,
    onCoachSelect,
    onBookCoach,
    onBack,
    onToggleView,
  } = props;

  const { colors: palette, scheme } = useTheme();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showRedoSearch, setShowRedoSearch] = useState(false);

  const mapRef = useRef<MapView>(null);
  const sheetRef = useRef<BottomSheet>(null);
  const lastSearchRegion = useRef<Region>(DEFAULT_REGION);

  // ── GPS on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setUserLocation(coords);
        const region: Region = { ...coords, latitudeDelta: 0.06, longitudeDelta: 0.06 };
        lastSearchRegion.current = region;
        mapRef.current?.animateToRegion(region, 500);
      } catch {
        // GPS unavailable — stay on London default
      }
    })();
  }, []);

  const handleCoachSelect = useCallback(
    (coachId: string) => {
      onCoachSelect(coachId);
      Haptics.selectionAsync();
      const coach = coaches.find((c) => c.coach.id === coachId)?.coach;
      if (coach) {
        mapRef.current?.animateToRegion(
          {
            latitude: coach.location.lat,
            longitude: coach.location.lng,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          300,
        );
      }
      sheetRef.current?.snapToIndex(1);
    },
    [coaches, onCoachSelect],
  );

  const handleBookCoach = useCallback(
    (coachId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onBookCoach(coachId);
    },
    [onBookCoach],
  );

  const handleRegionChange = useCallback((region: Region) => {
    if (hasRegionShifted(lastSearchRegion.current, region)) {
      setShowRedoSearch(true);
    }
  }, []);

  const handleSearchArea = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    mapRef.current?.getCamera?.().then?.((camera) => {
      if (camera?.center) {
        onFilterChange({
          ...filters,
          location: {
            lat: camera.center.latitude,
            lng: camera.center.longitude,
            radiusKm: filters.location?.radiusKm ?? 10,
          },
        });
        lastSearchRegion.current = {
          latitude: camera.center.latitude,
          longitude: camera.center.longitude,
          latitudeDelta: lastSearchRegion.current.latitudeDelta,
          longitudeDelta: lastSearchRegion.current.longitudeDelta,
        };
      }
    });
    setShowRedoSearch(false);
  }, [filters, onFilterChange]);

  const handleRecenter = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (userLocation) {
      mapRef.current?.animateToRegion(
        { ...userLocation, latitudeDelta: 0.06, longitudeDelta: 0.06 },
        400,
      );
    }
  }, [userLocation]);

  const initialRegion = userLocation
    ? { ...userLocation, latitudeDelta: 0.06, longitudeDelta: 0.06 }
    : DEFAULT_REGION;

  return (
    <View style={styles.container}>
      {/* Native Map — full bleed */}
      <ClusteredMapView
        ref={mapRef as React.RefObject<MapView>}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={!!userLocation}
        showsMyLocationButton={false}
        showsCompass={false}
        mapPadding={{ top: 100, bottom: 140, left: 0, right: 0 }}
        onRegionChangeComplete={handleRegionChange}
        radius={40}
        clusterColor={palette.tint}
        clusterTextColor={palette.onPrimary}
      >
        {coaches.map((result) => (
          <Marker
            key={result.coach.id}
            coordinate={{
              latitude: result.coach.location.lat,
              longitude: result.coach.location.lng,
            }}
            onPress={() => handleCoachSelect(result.coach.id)}
            tracksViewChanges={false}
          >
            <PricePin
              price={result.coach.sessionRate ?? result.coach.priceRange.minUsd}
              selected={result.coach.id === selectedCoachId}
            />
          </Marker>
        ))}
      </ClusteredMapView>

      {/* Floating header */}
      <SearchHeader
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onSearch={onSearch}
        onClearSearch={onClearSearch}
        onBack={onBack}
        onToggleView={onToggleView}
      />

      {/* Filter bar — below header */}
      {filterOptions ? (
        <View style={[styles.filterBarWrap, { backgroundColor: withAlpha(palette.background, 0.88) }]}>
          <FilterBar
            filters={filters}
            onFilterChange={onFilterChange}
            onOpenFilters={() => onToggleFilterModal(true)}
            totalResults={coaches.length}
            activeFilterCount={activeFilterCount}
            variant="map"
          />
        </View>
      ) : null}

      {/* "Redo search here" pill */}
      {showRedoSearch ? (
        <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)} style={styles.redoWrap}>
          <Clickable
            onPress={handleSearchArea}
            style={[styles.redoPill, { backgroundColor: palette.tint, ...Shadows[scheme].card }]}
            accessibilityLabel="Search this area"
          >
            <Ionicons name="refresh" size={14} color={palette.onPrimary} />
            <ThemedText style={[styles.redoText, { color: palette.onPrimary }]}>
              Redo search here
            </ThemedText>
          </Clickable>
        </Animated.View>
      ) : null}

      {/* Re-center FAB */}
      {userLocation ? (
        <Clickable
          onPress={handleRecenter}
          style={[
            styles.recenterFab,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              ...Shadows[scheme].subtle,
            },
          ]}
          accessibilityLabel="Re-center on my location"
        >
          <Ionicons name="locate" size={20} color={palette.tint} />
        </Clickable>
      ) : null}

      {/* Bottom sheet */}
      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={SHEET_SNAP_POINTS}
        backgroundStyle={{ backgroundColor: palette.surface, borderRadius: Radii.xl }}
        handleIndicatorStyle={{ backgroundColor: withAlpha(palette.muted, 0.3), width: 40 }}
        enablePanDownToClose={false}
      >
        <BottomSheetFlatList
          data={coaches}
          keyExtractor={(item: CoachSearchResult) => item.coach.id}
          renderItem={({ item }: { item: CoachSearchResult }) => (
            <CoachSheetItem
              coach={item.coach}
              selected={item.coach.id === selectedCoachId}
              onPress={() => handleCoachSelect(item.coach.id)}
              onBook={() => handleBookCoach(item.coach.id)}
            />
          )}
          contentContainerStyle={styles.sheetContent}
          ListHeaderComponent={
            <ThemedText type="heading" style={styles.sheetHeader}>
              {coaches.length} {coaches.length === 1 ? 'coach' : 'coaches'} nearby
            </ThemedText>
          }
          ItemSeparatorComponent={ListSeparator}
        />
      </BottomSheet>

      {/* Filter modal */}
      {filterOptions ? (
        <FilterModal
          visible={showFilterModal}
          onClose={() => onToggleFilterModal(false)}
          filters={filters}
          filterOptions={filterOptions}
          onApply={onFilterChange}
          resultCount={coaches.length}
        />
      ) : null}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radii.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.bodySmall,
    padding: 0,
  },

  filterBarWrap: {
    position: 'absolute',
    top: 96,
    left: 0,
    right: 0,
    zIndex: 9,
  },

  pinWrap: { alignItems: 'center' },
  pin: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    borderWidth: 1,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinText: { ...Typography.smallSemiBold },
  pinArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },

  redoWrap: {
    position: 'absolute',
    top: 150,
    alignSelf: 'center',
    zIndex: 8,
  },
  redoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: Radii.pill,
  },
  redoText: { ...Typography.smallSemiBold },

  recenterFab: {
    position: 'absolute',
    bottom: 150,
    right: Spacing.sm,
    width: 44,
    height: 44,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 7,
  },

  sheetContent: { paddingHorizontal: Spacing.sm, paddingBottom: Spacing.xl },
  sheetHeader: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.xxs },
  sheetCard: { padding: Spacing.sm },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  sheetInfo: { flex: 1, gap: Spacing.xxs },
  sheetName: { ...Typography.bodySemiBold, flex: 1 },
  sheetPrice: { ...Typography.bodySemiBold },
  sheetMeta: { ...Typography.caption },
  sheetFocus: { ...Typography.caption, flex: 1 },
  bookLink: { ...Typography.smallSemiBold },
});
