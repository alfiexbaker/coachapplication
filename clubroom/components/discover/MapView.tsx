import { useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { CoachMarker, ClusterMarker } from './CoachMarker';
import { CoachCard, type CoachCardData } from '@/components/coach';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CoachProfile, CoachSearchResult } from '@/constants/types';
import { MapClusterOverlay, type Cluster } from './map-cluster-overlay';

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── Types ──────────────────────────────────────────────────────────────────

interface MapViewProps {
  coaches: CoachSearchResult[];
  selectedCoachId?: string;
  onCoachSelect?: (coachId: string) => void;
  onCoachPress?: (coach: CoachProfile) => void;
  userLocation?: { lat: number; lng: number };
  showUserLocation?: boolean;
  zoomLevel?: number;
}

interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MapView({
  coaches,
  selectedCoachId,
  onCoachSelect,
  onCoachPress,
  userLocation,
  showUserLocation = true,
  zoomLevel = 1,
}: MapViewProps) {
  const { colors: palette } = useTheme();
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [expandedCluster, setExpandedCluster] = useState<Cluster | null>(null);

  const bounds = useMemo<MapBounds>(() => {
    if (coaches.length === 0) {
      return { minLat: 51.4, maxLat: 51.6, minLng: -0.3, maxLng: 0.1 };
    }
    const lats = coaches.map((c) => c.coach.location.lat);
    const lngs = coaches.map((c) => c.coach.location.lng);
    const latPadding = 0.02 / zoomLevel;
    const lngPadding = 0.04 / zoomLevel;
    return {
      minLat: Math.min(...lats) - latPadding,
      maxLat: Math.max(...lats) + latPadding,
      minLng: Math.min(...lngs) - lngPadding,
      maxLng: Math.max(...lngs) + lngPadding,
    };
  }, [coaches, zoomLevel]);

  const coordToPosition = useCallback(
    (lat: number, lng: number) => {
      if (mapSize.width === 0 || mapSize.height === 0) return { x: 0, y: 0 };
      const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * mapSize.width;
      const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * mapSize.height;
      return { x, y };
    },
    [bounds, mapSize],
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
        const avgLat = clusterCoaches.reduce((sum, c) => sum + c.location.lat, 0) / clusterCoaches.length;
        const avgLng = clusterCoaches.reduce((sum, c) => sum + c.location.lng, 0) / clusterCoaches.length;
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
      onCoachSelect?.(cluster.coaches[0].id);
    } else {
      setExpandedCluster(cluster);
    }
  };

  const selectedCoach = coaches.find((c) => c.coach.id === selectedCoachId)?.coach;

  return (
    <View style={styles.container}>
      <View
        style={[styles.mapContainer, { backgroundColor: withAlpha(palette.tint, 0.03) }]}
        onLayout={handleLayout}
      >
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((pos) => (
          <View key={`h-${pos}`} style={[styles.gridLineH, { top: `${pos * 100}%`, backgroundColor: withAlpha(palette.border, 0.25) }]} />
        ))}
        {[0.25, 0.5, 0.75].map((pos) => (
          <View key={`v-${pos}`} style={[styles.gridLineV, { left: `${pos * 100}%`, backgroundColor: withAlpha(palette.border, 0.25) }]} />
        ))}

        {/* User Location */}
        {showUserLocation && userLocation && mapSize.width > 0 && (
          <View
            style={[
              styles.userMarker,
              {
                left: coordToPosition(userLocation.lat, userLocation.lng).x - 8,
                top: coordToPosition(userLocation.lat, userLocation.lng).y - 8,
                backgroundColor: palette.tint,
              },
            ]}
          >
            <View style={[styles.userMarkerInner, { backgroundColor: palette.surface }]} />
          </View>
        )}

        {/* Coach Markers */}
        {mapSize.width > 0 &&
          clusters.map((cluster, index) => {
            const position = coordToPosition(cluster.lat, cluster.lng);
            if (cluster.coaches.length > 1) {
              return (
                <View key={`cluster-${index}`} style={[styles.markerContainer, { left: position.x - 22, top: position.y - 22 }]}>
                  <ClusterMarker count={cluster.coaches.length} onPress={() => handleClusterPress(cluster)} />
                </View>
              );
            }
            const coach = cluster.coaches[0];
            return (
              <View key={coach.id} style={[styles.markerContainer, { left: position.x - 22, top: position.y - 30 }]}>
                <CoachMarker coach={coach} isSelected={coach.id === selectedCoachId} onPress={() => onCoachSelect?.(coach.id)} size="medium" showRating />
              </View>
            );
          })}

        {/* Search This Area */}
        <Clickable style={[styles.searchAreaButton, { backgroundColor: palette.tint, shadowColor: palette.text }]}>
          <ThemedText style={[styles.searchAreaText, { color: palette.onPrimary }]}>Search this area</ThemedText>
        </Clickable>

        {/* Zoom Controls */}
        <View style={[styles.zoomControls, { shadowColor: palette.text }]}>
          <Clickable accessibilityLabel="Zoom in" style={[styles.zoomButton, { backgroundColor: palette.surface }]}>
            <Ionicons name="add" size={20} color={palette.text} />
          </Clickable>
          <View style={[styles.zoomDivider, { backgroundColor: palette.border }]} />
          <Clickable accessibilityLabel="Zoom out" style={[styles.zoomButton, { backgroundColor: palette.surface }]}>
            <Ionicons name="remove" size={20} color={palette.text} />
          </Clickable>
        </View>
      </View>

      {/* Selected Coach Card */}
      {selectedCoach && (
        <View style={styles.selectedCardContainer}>
          <CoachCard coach={toCoachCardData(selectedCoach)} variant="compact" active onPress={() => onCoachPress?.(selectedCoach)} />
        </View>
      )}

      {/* Expanded Cluster */}
      {expandedCluster && (
        <MapClusterOverlay
          cluster={expandedCluster}
          onClose={() => setExpandedCluster(null)}
          onCoachPress={(coach) => onCoachPress?.(coach)}
          toCoachCardData={toCoachCardData}
        />
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { flex: 1, borderRadius: Radii.lg, overflow: 'hidden', position: 'relative' },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1 },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1 },
  markerContainer: { position: 'absolute' },
  userMarker: { position: 'absolute', width: 16, height: 16, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center' },
  userMarkerInner: { width: 8, height: 8, borderRadius: Radii.xs },
  searchAreaButton: { position: 'absolute', top: Spacing.md, alignSelf: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radii.pill, shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  searchAreaText: { ...Typography.small, fontWeight: '600' },
  zoomControls: { position: 'absolute', right: Spacing.md, bottom: Spacing.md, borderRadius: Radii.md, overflow: 'hidden', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  zoomButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  zoomDivider: { height: 1 },
  selectedCardContainer: { position: 'absolute', bottom: Spacing.md, left: Spacing.md, right: Spacing.md },
});
