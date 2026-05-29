/**
 * Map Content — Native (iOS/Android)
 *
 * Full Apple/Google Maps with price pins, clustered markers,
 * gesture-driven bottom sheet, GPS, search-as-you-move.
 *
 * Airbnb-quality design: premium cards, pill markers, polished transitions.
 */

import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, TextInput, View } from 'react-native';
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
import { Column } from '@/components/primitives/column';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { StatusBanner } from '@/components/ui/primitives/StatusBanner';
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
const SHEET_SNAP_POINTS = [140, '50%', '90%'];
const ListSeparator = () => <View style={{ height: Spacing.sm }} />;
const REGION_SHIFT_THRESHOLD = 0.3;

function hasRegionShifted(prev: Region, next: Region): boolean {
  const latShift = Math.abs(next.latitude - prev.latitude) / prev.latitudeDelta;
  const lngShift = Math.abs(next.longitude - prev.longitude) / prev.longitudeDelta;
  return latShift > REGION_SHIFT_THRESHOLD || lngShift > REGION_SHIFT_THRESHOLD;
}

// ─── SkillChip ─────────────────────────────────────────────────────────────

const SkillChip = function SkillChip({ label }: { label: string }) {
  const { colors: palette } = useTheme();
  return (
    <View style={[styles.skillChip, { backgroundColor: withAlpha(palette.tint, 0.08) }]}>
      <ThemedText style={[styles.skillChipText, { color: palette.tint }]}>{label}</ThemedText>
    </View>
  );
};

// ─── PricePin ──────────────────────────────────────────────────────────────

const PricePin = function PricePin({
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
            borderColor: selected ? palette.tint : withAlpha(palette.text, 0.08),
            ...Shadows[scheme].card,
            transform: [{ scale: selected ? 1.15 : 1 }],
          },
        ]}
      >
        <ThemedText style={[styles.pinText, { color: textColor }]}>£{price}</ThemedText>
      </View>
      <View
        style={[
          styles.pinArrow,
          {
            borderTopColor: bg,
            ...Shadows[scheme].subtle,
          },
        ]}
      />
    </View>
  );
};

const CoachMapMarker = function CoachMapMarker({
  result,
  selected,
  onSelect,
}: {
  result: CoachSearchResult;
  selected: boolean;
  onSelect: (coachId: string) => void;
}) {
  const handlePress = () => {
    onSelect(result.coach.id);
  };

  return (
    <Marker
      coordinate={{
        latitude: result.coach.location.lat,
        longitude: result.coach.location.lng,
      }}
      onPress={handlePress}
      tracksViewChanges={false}
      accessibilityLabel={`Coach ${result.coach.fullName} location${selected ? ', selected' : ''}`}
      accessibilityRole="button"
    >
      <PricePin
        price={result.coach.sessionRate ?? result.coach.priceRange.min}
        selected={selected}
      />
    </Marker>
  );
};

// ─── SearchHeader ──────────────────────────────────────────────────────────

const SearchHeader = function SearchHeader({
  searchQuery,
  onSearchChange,
  onSearch,
  onClearSearch,
  onBack,
  onToggleView,
  filterBar,
  permissionBanner,
}: {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  onBack: () => void;
  onToggleView: () => void;
  filterBar?: React.ReactNode;
  permissionBanner?: React.ReactNode;
}) {
  const { colors: palette, scheme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + Spacing.xs,
          backgroundColor: withAlpha(palette.background, 0.95),
        },
      ]}
    >
      <Row align="center" gap="xs">
        <Clickable
          onPress={onBack}
          style={[
            styles.headerBtn,
            {
              backgroundColor: palette.surface,
              ...Shadows[scheme].subtle,
            },
          ]}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={palette.text} />
        </Clickable>
        <Row
          align="center"
          gap="xs"
          style={[
            styles.searchBar,
            {
              backgroundColor: withAlpha(palette.muted, 0.06),
              borderColor: withAlpha(palette.border, 0.5),
            },
          ]}
        >
          <Ionicons name="search" size={18} color={palette.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={onSearchChange}
            onSubmitEditing={onSearch}
            placeholder="Search coaches..."
            placeholderTextColor={palette.muted}
            returnKeyType="search"
            style={[styles.searchInput, { color: palette.text }]}
            accessibilityLabel="Search coaches"

            maxLength={100}
          />
          {searchQuery.length > 0 ? (
            <Clickable accessibilityLabel="Clear search" onPress={onClearSearch} style={styles.clearSearchBtn}>
              <Ionicons name="close-circle" size={18} color={palette.muted} />
            </Clickable>
          ) : null}
        </Row>
        <Clickable
          onPress={onToggleView}
          style={[
            styles.headerBtn,
            {
              backgroundColor: palette.surface,
              ...Shadows[scheme].subtle,
            },
          ]}
          accessibilityLabel="Switch to list view"
        >
          <Ionicons name="list" size={20} color={palette.text} />
        </Clickable>
      </Row>
      {filterBar}
      {permissionBanner ? <View style={styles.permissionBanner}>{permissionBanner}</View> : null}
    </View>
  );
};

// ─── CoachSheetItem ────────────────────────────────────────────────────────

const CoachSheetItem = function CoachSheetItem({
  coach,
  selected,
  onPress,
  onProfile,
  onBook,
}: {
  coach: CoachProfile;
  selected: boolean;
  onPress: () => void;
  onProfile: () => void;
  onBook: () => void;
}) {
  const { colors: palette } = useTheme();
  const price = coach.sessionRate ?? coach.priceRange.min;
  const focuses = (coach.footballFocuses ?? []).slice(0, 3);

  return (
    <SurfaceCard
      onPress={onPress}
      style={styles.sheetCard}
      outlineGradient={selected ? [palette.tint, palette.tint] : undefined}
      gradientPadding={selected ? 2 : 0}
      accessibilityLabel={`Coach ${coach.fullName}, £${price} per session`}
    >
      <Row gap="sm" align="flex-start">
        {/* Avatar */}
        <View>
          <Image
            source={{ uri: coach.profilePhotoUrl }}
            style={styles.avatar}
            contentFit="cover"
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            transition={200}
          />
          {coach.badges?.length > 0 ? (
            <View style={[styles.verifiedBadge, { backgroundColor: palette.tint, borderColor: palette.card }]}>
              <Ionicons name="checkmark" size={10} color={palette.onPrimary} />
            </View>
          ) : null}
        </View>

        {/* Info */}
        <Column style={styles.sheetInfo} gap="xxs">
          {/* Name + Price */}
          <Row align="center" justify="between">
            <ThemedText style={styles.sheetName} numberOfLines={1}>
              {coach.fullName}
            </ThemedText>
            <Column align="flex-end">
              <ThemedText style={[styles.sheetPrice, { color: palette.text }]}>
                £{price}
              </ThemedText>
              <ThemedText style={[styles.priceUnit, { color: palette.muted }]}>
                /session
              </ThemedText>
            </Column>
          </Row>

          {/* Rating + Distance */}
          <Row align="center" gap="xs">
            <Row align="center" gap="micro">
              <Ionicons name="star" size={13} color={palette.rating} />
              <ThemedText style={styles.ratingText}>
                {coach.rating.average.toFixed(1)}
              </ThemedText>
            </Row>
            <ThemedText style={[styles.reviewCount, { color: palette.muted }]}>
              ({coach.rating.reviewCount})
            </ThemedText>
            {coach.distanceMiles > 0 ? (
              <>
                <View style={[styles.metaDot, { backgroundColor: palette.muted }]} />
                <Row align="center" gap="micro">
                  <Ionicons name="location-outline" size={12} color={palette.muted} />
                  <ThemedText style={[styles.distanceText, { color: palette.muted }]}>
                    {coach.distanceMiles.toFixed(1)} mi
                  </ThemedText>
                </Row>
              </>
            ) : null}
          </Row>

          {/* Skill chips */}
          {focuses.length > 0 ? (
            <Row gap="xxs" style={styles.skillRow}>
              {focuses.map((focus) => (
                <SkillChip key={focus} label={focus} />
              ))}
            </Row>
          ) : null}

          <Row gap="xs" style={styles.actionRow}>
            <Clickable
              onPress={onProfile}
              style={[
                styles.profileBtn,
                { borderColor: palette.border, backgroundColor: palette.surface },
              ]}
              accessibilityLabel={`View ${coach.fullName} profile`}
            >
              <ThemedText style={[styles.profileBtnText, { color: palette.text }]}>
                Profile
              </ThemedText>
            </Clickable>
            <Clickable
              onPress={onBook}
              style={[styles.bookBtn, { backgroundColor: palette.tint }]}
              accessibilityLabel={`Book ${coach.fullName}`}
            >
              <ThemedText style={[styles.bookBtnText, { color: palette.onPrimary }]}>
                Book session
              </ThemedText>
            </Clickable>
          </Row>
        </Column>
      </Row>
    </SurfaceCard>
  );
};

// ─── SheetHeader ──────────────────────────────────────────────────────────

const SheetHeader = function SheetHeader({ count }: { count: number }) {
  const { colors: palette } = useTheme();
  return (
    <Row align="center" gap="xs" style={styles.sheetHeader}>
      <ThemedText type="heading">
        {count} {count === 1 ? 'coach' : 'coaches'} nearby
      </ThemedText>
      <View style={[styles.countBadge, { backgroundColor: withAlpha(palette.tint, 0.1) }]}>
        <ThemedText style={[styles.countBadgeText, { color: palette.tint }]}>{count}</ThemedText>
      </View>
    </Row>
  );
};

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
    onCoachProfile,
    onBookCoach,
    onBack,
    onToggleView,
  } = props;

  const { colors: palette, scheme } = useTheme();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showRedoSearch, setShowRedoSearch] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [locationPermissionMessage, setLocationPermissionMessage] = useState<string | null>(null);

  const mapRef = useRef<MapView>(null);
  const sheetRef = useRef<BottomSheet>(null);
  const lastSearchRegion = useRef<Region>(DEFAULT_REGION);

  // ── GPS on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationPermissionMessage(
            'Location access helps center the map around you. Enable it in Settings to use recenter.',
          );
          return;
        }
        setLocationPermissionMessage(null);
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setUserLocation(coords);
        const region: Region = { ...coords, latitudeDelta: 0.06, longitudeDelta: 0.06 };
        lastSearchRegion.current = region;
        mapRef.current?.animateToRegion(region, 500);
      } catch {
        setLocationPermissionMessage(
          'Could not read your current location. The map is showing the default launch area.',
        );
      }
    })();
  }, []);

  const handleCoachSelect = (coachId: string) => {
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
  };

  const handleBookCoach = (coachId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onBookCoach(coachId);
  };

  const renderSheetCoachItem = ({ item }: { item: CoachSearchResult }) => (
    <CoachSheetItem
      coach={item.coach}
      selected={item.coach.id === selectedCoachId}
      onPress={() => handleCoachSelect(item.coach.id)}
      onProfile={() => onCoachProfile(item.coach.id)}
      onBook={() => handleBookCoach(item.coach.id)}
    />
  );

  const keyExtractor = (item: CoachSearchResult) => item.coach.id;

  const handleRegionChange = (region: Region) => {
    if (hasRegionShifted(lastSearchRegion.current, region)) {
      setShowRedoSearch(true);
    }
  };

  const handleSearchArea = () => {
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
  };

  const handleSheetChange = (index: number) => {
    setSheetExpanded(index > 0);
  };

  const handleRecenter = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (userLocation) {
      mapRef.current?.animateToRegion(
        { ...userLocation, latitudeDelta: 0.06, longitudeDelta: 0.06 },
        400,
      );
    }
  };

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
        mapPadding={{ top: 100, bottom: 160, left: 0, right: 0 }}
        onRegionChangeComplete={handleRegionChange}
        radius={40}
        clusterColor={palette.tint}
        clusterTextColor={palette.onPrimary}
      >
        {coaches.map((result) => (
          <CoachMapMarker
            key={result.coach.id}
            result={result}
            selected={result.coach.id === selectedCoachId}
            onSelect={handleCoachSelect}
          />
        ))}
      </ClusteredMapView>

      {/* Floating header + filters */}
      <SearchHeader
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onSearch={onSearch}
        onClearSearch={onClearSearch}
        onBack={onBack}
        onToggleView={onToggleView}
        permissionBanner={
          locationPermissionMessage ? (
            <StatusBanner
              variant="warning"
              message={locationPermissionMessage}
              action={{
                label: 'Open Settings',
                onPress: () => {
                  void Linking.openSettings();
                },
              }}
              onDismiss={() => setLocationPermissionMessage(null)}
            />
          ) : null
        }
        filterBar={
          filterOptions ? (
            <FilterBar
              filters={filters}
              onFilterChange={onFilterChange}
              onOpenFilters={() => onToggleFilterModal(true)}
              totalResults={coaches.length}
              activeFilterCount={activeFilterCount}
              variant="map"
            />
          ) : null
        }
      />

      {/* "Redo search here" pill — hidden when sheet is expanded */}
      {showRedoSearch && !sheetExpanded ? (
        <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(150)} style={styles.redoWrap}>
          <Clickable
            onPress={handleSearchArea}
            style={[styles.redoPill, { backgroundColor: palette.tint, ...Shadows[scheme].card }]}
            accessibilityLabel="Search this area"
          >
            <Ionicons name="refresh" size={14} color={palette.onPrimary} />
            <ThemedText style={[styles.redoText, { color: palette.onPrimary }]}>
              Search this area
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
              ...Shadows[scheme].card,
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
        backgroundStyle={[
          styles.sheetBackground,
          { backgroundColor: palette.background, ...Shadows[scheme].card },
        ]}
        handleIndicatorStyle={[styles.sheetHandle, { backgroundColor: withAlpha(palette.muted, 0.25) }]}
        enablePanDownToClose={false}
        onChange={handleSheetChange}
      >
        <BottomSheetFlatList
          data={coaches}
          keyExtractor={keyExtractor}
          renderItem={renderSheetCoachItem}
          contentContainerStyle={styles.sheetContent}
          ListHeaderComponent={<SheetHeader count={coaches.length} />}
          ListEmptyComponent={
            <SurfaceCard style={styles.emptyResultsCard}>
              <Column align="center" gap="xs">
                <Ionicons name="map-outline" size={28} color={palette.muted} />
                <ThemedText type="defaultSemiBold">No coaches in this area</ThemedText>
                <ThemedText style={[styles.emptyResultsText, { color: palette.muted }]}>
                  Search this area again or adjust filters to expand the map results.
                </ThemedText>
              </Column>
            </SurfaceCard>
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

  // ── Header ────────────────────────────────────────────────────────────
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  permissionBanner: {
    marginTop: Spacing.xs,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flex: 1,
    height: 44,
    borderRadius: Radii.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    padding: 0,
  },
  clearSearchBtn: {
    minHeight: 44,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Map pins ──────────────────────────────────────────────────────────
  pinWrap: { alignItems: 'center' },
  pin: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs + 2,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinText: {
    ...Typography.bodySmallSemiBold,
    fontWeight: '700',
  },
  pinArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },

  // ── Redo search ───────────────────────────────────────────────────────
  redoWrap: {
    position: 'absolute',
    top: 200,
    alignSelf: 'center',
    zIndex: 8,
  },
  redoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    height: 40,
    borderRadius: Radii.pill,
  },
  redoText: { ...Typography.smallSemiBold },

  // ── Re-center FAB ─────────────────────────────────────────────────────
  recenterFab: {
    position: 'absolute',
    bottom: 160,
    right: Spacing.sm,
    width: 44,
    height: 44,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 7,
  },

  // ── Bottom sheet ──────────────────────────────────────────────────────
  sheetBackground: {
    borderTopLeftRadius: Radii['2xl'],
    borderTopRightRadius: Radii['2xl'],
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: Radii.xs,
    marginTop: Spacing.xs,
  },
  sheetContent: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  sheetHeader: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xxs,
  },
  countBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
  },
  countBadgeText: {
    ...Typography.caption,
    fontWeight: '700',
  },

  // ── Coach card ────────────────────────────────────────────────────────
  sheetCard: {
    padding: Spacing.sm,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radii.xl,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  sheetInfo: { flex: 1 },
  sheetName: {
    ...Typography.bodySemiBold,
    flex: 1,
    marginRight: Spacing.xs,
  },
  sheetPrice: {
    ...Typography.heading,
  },
  priceUnit: {
    ...Typography.caption,
  },
  ratingText: {
    ...Typography.bodySmallSemiBold,
  },
  reviewCount: {
    ...Typography.caption,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: Radii.xs,
    opacity: 0.4,
  },
  distanceText: {
    ...Typography.caption,
  },

  // ── Skill chips ───────────────────────────────────────────────────────
  skillRow: {
    marginTop: Spacing.micro,
    flexWrap: 'wrap',
  },
  skillChip: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro + 1,
    borderRadius: Radii.sm,
  },
  skillChipText: {
    ...Typography.caption,
    fontWeight: '600',
  },

  actionRow: {
    marginTop: Spacing.xs,
  },
  profileBtn: {
    flex: 0.45,
    height: 36,
    borderRadius: Radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBtnText: {
    ...Typography.bodySmallSemiBold,
    fontWeight: '700',
  },
  // ── Book button ───────────────────────────────────────────────────────
  bookBtn: {
    flex: 1,
    height: 36,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtnText: {
    ...Typography.bodySmallSemiBold,
    fontWeight: '700',
  },
  emptyResultsCard: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyResultsText: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
});
