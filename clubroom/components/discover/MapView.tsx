import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { Image } from 'expo-image';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { CoachMarker, ClusterMarker } from './CoachMarker';
import { CoachCard, type CoachCardData } from '@/components/coach';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CoachProfile, CoachSearchResult } from '@/constants/types';
import { MapClusterOverlay, type Cluster } from './map-cluster-overlay';
import { Row } from '@/components/primitives';

function toCoachCardData(coach: CoachProfile): CoachCardData {
  return {
    id: coach.id,
    fullName: coach.fullName,
    profilePhotoUrl: coach.profilePhotoUrl,
    rating: coach.rating.average,
    reviewCount: coach.rating.reviewCount,
    distanceMiles: coach.distanceMiles,
    priceMin: coach.priceRange.minUsd,
    priceMax: coach.priceRange.maxUsd,
    footballFocuses: coach.footballFocuses as string[],
    city: coach.city,
  };
}

const MIN_CLUSTER_DISTANCE = 0.01;
const TILE_SIZE = 256;
const MIN_RADIUS_KM = 2;
const MAX_RADIUS_KM = 30;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function latLngToWorldPixel(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const scale = TILE_SIZE * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const latRad = (lat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale;
  return { x, y };
}

function wrapTileX(x: number, zoom: number): number {
  const tileCount = Math.pow(2, zoom);
  return ((x % tileCount) + tileCount) % tileCount;
}

interface MapViewProps {
  coaches: CoachSearchResult[];
  selectedCoachId?: string;
  onCoachSelect: (coachId: string) => void;
  onCoachPress?: (coach: CoachProfile) => void;
  userLocation?: { lat: number; lng: number };
  showUserLocation?: boolean;
  zoomLevel?: number;
  radiusKm?: number;
  onRadiusCommit?: (radiusKm: number) => void;
  onSearchAreaPress?: () => void;
  onZoomInPress?: () => void;
  onZoomOutPress?: () => void;
}

export function MapView({
  coaches,
  selectedCoachId,
  onCoachSelect,
  onCoachPress,
  userLocation,
  showUserLocation = true,
  zoomLevel = 1,
  radiusKm = 10,
  onRadiusCommit,
  onSearchAreaPress,
  onZoomInPress,
  onZoomOutPress,
}: MapViewProps) {
  const { colors: palette } = useTheme();
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [expandedCluster, setExpandedCluster] = useState<Cluster | null>(null);
  const [radiusDraft, setRadiusDraft] = useState(clamp(radiusKm, MIN_RADIUS_KM, MAX_RADIUS_KM));

  useEffect(() => {
    setRadiusDraft(clamp(radiusKm, MIN_RADIUS_KM, MAX_RADIUS_KM));
  }, [radiusKm]);

  const centerPoint = useMemo(() => {
    if (userLocation) return userLocation;
    if (coaches.length === 0) return { lat: 51.5074, lng: -0.1278 };
    const avgLat = coaches.reduce((sum, c) => sum + c.coach.location.lat, 0) / coaches.length;
    const avgLng = coaches.reduce((sum, c) => sum + c.coach.location.lng, 0) / coaches.length;
    return { lat: avgLat, lng: avgLng };
  }, [coaches, userLocation]);

  const tileZoom = useMemo(() => clamp(Math.round(10 + zoomLevel * 1.5), 10, 16), [zoomLevel]);

  const projection = useMemo(() => {
    if (mapSize.width === 0 || mapSize.height === 0) return null;
    const centerWorld = latLngToWorldPixel(centerPoint.lat, centerPoint.lng, tileZoom);
    return {
      zoom: tileZoom,
      topLeftWorld: {
        x: centerWorld.x - mapSize.width / 2,
        y: centerWorld.y - mapSize.height / 2,
      },
    };
  }, [centerPoint.lat, centerPoint.lng, mapSize.height, mapSize.width, tileZoom]);

  const mapTiles = useMemo(() => {
    if (!projection || mapSize.width === 0 || mapSize.height === 0) return [];
    const zoom = projection.zoom;
    const tileCount = Math.pow(2, zoom);
    const startTileX = Math.floor(projection.topLeftWorld.x / TILE_SIZE);
    const endTileX = Math.floor((projection.topLeftWorld.x + mapSize.width) / TILE_SIZE);
    const startTileY = Math.floor(projection.topLeftWorld.y / TILE_SIZE);
    const endTileY = Math.floor((projection.topLeftWorld.y + mapSize.height) / TILE_SIZE);

    const tiles: { key: string; uri: string; left: number; top: number }[] = [];
    for (let tileY = startTileY; tileY <= endTileY; tileY += 1) {
      if (tileY < 0 || tileY >= tileCount) continue;
      for (let tileX = startTileX; tileX <= endTileX; tileX += 1) {
        const wrappedX = wrapTileX(tileX, zoom);
        tiles.push({
          key: `${zoom}-${wrappedX}-${tileY}`,
          uri: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${tileY}.png`,
          left: tileX * TILE_SIZE - projection.topLeftWorld.x,
          top: tileY * TILE_SIZE - projection.topLeftWorld.y,
        });
      }
    }
    return tiles;
  }, [mapSize.height, mapSize.width, projection]);

  const coordToPosition = useCallback(
    (lat: number, lng: number) => {
      if (!projection) return { x: 0, y: 0 };
      const world = latLngToWorldPixel(lat, lng, projection.zoom);
      return {
        x: world.x - projection.topLeftWorld.x,
        y: world.y - projection.topLeftWorld.y,
      };
    },
    [projection],
  );

  const clusters = useMemo<Cluster[]>(() => {
    const clusterList: Cluster[] = [];
    const processed = new Set<string>();

    coaches.forEach(({ coach }) => {
      if (processed.has(coach.id)) return;
      const nearby = coaches.filter(({ coach: other }) => {
        if (processed.has(other.id) || other.id === coach.id) return false;
        const distance = Math.sqrt(
          Math.pow(coach.location.lat - other.location.lat, 2) +
            Math.pow(coach.location.lng - other.location.lng, 2),
        );
        return distance < MIN_CLUSTER_DISTANCE / zoomLevel;
      });

      if (nearby.length > 0) {
        const clusterCoaches = [coach, ...nearby.map((n) => n.coach)];
        const avgLat =
          clusterCoaches.reduce((sum, c) => sum + c.location.lat, 0) / clusterCoaches.length;
        const avgLng =
          clusterCoaches.reduce((sum, c) => sum + c.location.lng, 0) / clusterCoaches.length;
        clusterList.push({ coaches: clusterCoaches, lat: avgLat, lng: avgLng });
        clusterCoaches.forEach((c) => processed.add(c.id));
      } else {
        clusterList.push({ coaches: [coach], lat: coach.location.lat, lng: coach.location.lng });
        processed.add(coach.id);
      }
    });

    return clusterList;
  }, [coaches, zoomLevel]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setMapSize({ width, height });
  };

  const handleClusterPress = (cluster: Cluster) => {
    if (cluster.coaches.length === 1) {
      onCoachSelect(cluster.coaches[0].id);
    } else {
      setExpandedCluster(cluster);
    }
  };

  const selectedCoach = coaches.find((c) => c.coach.id === selectedCoachId)?.coach;
  const userPosition =
    showUserLocation && userLocation && projection
      ? coordToPosition(userLocation.lat, userLocation.lng)
      : null;

  const metersPerPixel = useMemo(() => {
    if (!userLocation) return 0;
    return (
      (156543.03392 * Math.cos((userLocation.lat * Math.PI) / 180)) / Math.pow(2, tileZoom)
    );
  }, [tileZoom, userLocation]);

  const radiusPixels = useMemo(() => {
    if (!metersPerPixel) return 0;
    return clamp((radiusDraft * 1000) / metersPerPixel, 16, 640);
  }, [metersPerPixel, radiusDraft]);

  return (
    <View style={styles.container}>
      <View
        style={[styles.mapContainer, { backgroundColor: withAlpha(palette.tint, 0.03) }]}
        onLayout={handleLayout}
      >
        {mapTiles.map((tile) => (
          <Image
            key={tile.key}
            source={{ uri: tile.uri }}
            style={[styles.mapTile, { left: tile.left, top: tile.top }]}
            contentFit="cover"
          />
        ))}

        <View style={[styles.mapOverlay, { backgroundColor: withAlpha(palette.surface, 0.04) }]} />

        {userPosition && onRadiusCommit ? (
          <View
            style={[
              styles.radiusRing,
              {
                width: radiusPixels * 2,
                height: radiusPixels * 2,
                left: userPosition.x - radiusPixels,
                top: userPosition.y - radiusPixels,
                borderColor: withAlpha(palette.tint, 0.35),
                backgroundColor: withAlpha(palette.tint, 0.08),
              },
            ]}
          />
        ) : null}

        {userPosition ? (
          <View
            style={[
              styles.userMarker,
              {
                left: userPosition.x - 8,
                top: userPosition.y - 8,
                backgroundColor: palette.tint,
              },
            ]}
          >
            <View style={[styles.userMarkerInner, { backgroundColor: palette.surface }]} />
          </View>
        ) : null}

        {projection &&
          clusters.map((cluster, index) => {
            const position = coordToPosition(cluster.lat, cluster.lng);
            if (cluster.coaches.length > 1) {
              return (
                <View
                  key={`cluster-${index}`}
                  style={[styles.markerContainer, { left: position.x - 22, top: position.y - 22 }]}
                >
                  <ClusterMarker
                    count={cluster.coaches.length}
                    onPress={() => handleClusterPress(cluster)}
                  />
                </View>
              );
            }
            const coach = cluster.coaches[0];
            return (
              <View
                key={coach.id}
                style={[styles.markerContainer, { left: position.x - 22, top: position.y - 30 }]}
              >
                <CoachMarker
                  coach={coach}
                  isSelected={coach.id === selectedCoachId}
                  onPress={() => onCoachSelect(coach.id)}
                  size="medium"
                  showRating
                />
              </View>
            );
          })}

        {onSearchAreaPress ? (
          <Clickable
            onPress={onSearchAreaPress}
            accessibilityRole="button"
            accessibilityLabel="Search in current map area"
            style={[
              styles.searchAreaButton,
              { backgroundColor: palette.tint, shadowColor: palette.text },
            ]}
          >
            <ThemedText style={[styles.searchAreaText, { color: palette.onPrimary }]}>Search this area</ThemedText>
          </Clickable>
        ) : null}

        {onRadiusCommit ? (
          <View
            style={[
              styles.radiusControl,
              {
                backgroundColor: withAlpha(palette.surface, 0.96),
                borderColor: withAlpha(palette.border, 0.9),
                shadowColor: palette.text,
              },
            ]}
          >
            <Row style={styles.radiusHeader}>
              <ThemedText style={[styles.radiusLabel, { color: palette.muted }]}>Search radius</ThemedText>
              <ThemedText style={[styles.radiusValue, { color: palette.text }]}>
                {radiusDraft.toFixed(0)} km
              </ThemedText>
            </Row>
            <Slider
              minimumValue={MIN_RADIUS_KM}
              maximumValue={MAX_RADIUS_KM}
              step={1}
              value={radiusDraft}
              onValueChange={(value) => setRadiusDraft(value)}
              onSlidingComplete={(value) => onRadiusCommit(Math.round(value))}
              minimumTrackTintColor={palette.tint}
              maximumTrackTintColor={withAlpha(palette.border, 0.9)}
              thumbTintColor={palette.tint}
            />
          </View>
        ) : null}

        {onZoomInPress && onZoomOutPress ? (
          <View
            style={[
              styles.zoomControls,
              {
                shadowColor: palette.text,
                bottom: onRadiusCommit ? 96 : Spacing.md,
              },
            ]}
          >
            <Clickable
              accessibilityLabel="Zoom in"
              onPress={onZoomInPress}
              style={[styles.zoomButton, { backgroundColor: palette.surface }]}
            >
              <Ionicons name="add" size={20} color={palette.text} />
            </Clickable>
            <View style={[styles.zoomDivider, { backgroundColor: palette.border }]} />
            <Clickable
              accessibilityLabel="Zoom out"
              onPress={onZoomOutPress}
              style={[styles.zoomButton, { backgroundColor: palette.surface }]}
            >
              <Ionicons name="remove" size={20} color={palette.text} />
            </Clickable>
          </View>
        ) : null}
      </View>

      {selectedCoach ? (
        <View style={[styles.selectedCardContainer, { bottom: onRadiusCommit ? 102 : Spacing.md }]}>
          <CoachCard
            coach={toCoachCardData(selectedCoach)}
            variant="compact"
            active
            onPress={() => onCoachPress?.(selectedCoach)}
          />
        </View>
      ) : null}

      {expandedCluster ? (
        <MapClusterOverlay
          cluster={expandedCluster}
          onClose={() => setExpandedCluster(null)}
          onCoachPress={(coach) => onCoachPress?.(coach)}
          toCoachCardData={toCoachCardData}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { flex: 1, borderRadius: Radii.lg, overflow: 'hidden', position: 'relative' },
  mapTile: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  markerContainer: { position: 'absolute' },
  radiusRing: {
    position: 'absolute',
    borderRadius: Radii.pill,
    borderWidth: 2,
  },
  userMarker: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerInner: { width: 8, height: 8, borderRadius: Radii.xs },
  searchAreaButton: {
    position: 'absolute',
    top: Spacing.md,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  searchAreaText: { ...Typography.small, fontWeight: '600' },
  radiusControl: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    bottom: Spacing.md,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  radiusHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.micro,
  },
  radiusLabel: { ...Typography.caption, fontWeight: '600' },
  radiusValue: { ...Typography.smallSemiBold },
  zoomControls: {
    position: 'absolute',
    right: Spacing.md,
    borderRadius: Radii.md,
    overflow: 'hidden',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  zoomButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  zoomDivider: { height: 1 },
  selectedCardContainer: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
  },
});
