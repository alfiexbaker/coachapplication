/**
 * MapView Component
 *
 * Interactive map displaying coaches by location.
 * Uses a simplified map representation for React Native compatibility.
 * In production, this would integrate with react-native-maps.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { CoachMarker, ClusterMarker } from './CoachMarker';
import { CoachCard } from './coach-card';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { CoachProfile, CoachSearchResult } from '@/constants/types';

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

// Group nearby coaches into clusters
interface Cluster {
  coaches: CoachProfile[];
  lat: number;
  lng: number;
}

const MIN_CLUSTER_DISTANCE = 0.01; // ~1km at equator

export function MapView({
  coaches,
  selectedCoachId,
  onCoachSelect,
  onCoachPress,
  userLocation,
  showUserLocation = true,
  zoomLevel = 1,
}: MapViewProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [expandedCluster, setExpandedCluster] = useState<Cluster | null>(null);

  // Calculate map bounds from coaches
  const bounds = useMemo<MapBounds>(() => {
    if (coaches.length === 0) {
      return { minLat: 51.4, maxLat: 51.6, minLng: -0.3, maxLng: 0.1 };
    }

    const lats = coaches.map((c) => c.coach.location.lat);
    const lngs = coaches.map((c) => c.coach.location.lng);

    // Add padding
    const latPadding = 0.02 / zoomLevel;
    const lngPadding = 0.04 / zoomLevel;

    return {
      minLat: Math.min(...lats) - latPadding,
      maxLat: Math.max(...lats) + latPadding,
      minLng: Math.min(...lngs) - lngPadding,
      maxLng: Math.max(...lngs) + lngPadding,
    };
  }, [coaches, zoomLevel]);

  // Convert lat/lng to screen position
  const coordToPosition = useCallback(
    (lat: number, lng: number) => {
      if (mapSize.width === 0 || mapSize.height === 0) {
        return { x: 0, y: 0 };
      }

      const latRange = bounds.maxLat - bounds.minLat;
      const lngRange = bounds.maxLng - bounds.minLng;

      const x = ((lng - bounds.minLng) / lngRange) * mapSize.width;
      const y = ((bounds.maxLat - lat) / latRange) * mapSize.height;

      return { x, y };
    },
    [bounds, mapSize]
  );

  // Group coaches into clusters
  const clusters = useMemo<Cluster[]>(() => {
    const clusterList: Cluster[] = [];
    const processed = new Set<string>();

    coaches.forEach(({ coach }) => {
      if (processed.has(coach.id)) return;

      // Find nearby coaches
      const nearby = coaches.filter(({ coach: other }) => {
        if (processed.has(other.id) || other.id === coach.id) return false;
        const distance = Math.sqrt(
          Math.pow(coach.location.lat - other.location.lat, 2) +
            Math.pow(coach.location.lng - other.location.lng, 2)
        );
        return distance < MIN_CLUSTER_DISTANCE / zoomLevel;
      });

      if (nearby.length > 0) {
        // Create cluster
        const clusterCoaches = [coach, ...nearby.map((n) => n.coach)];
        const avgLat =
          clusterCoaches.reduce((sum, c) => sum + c.location.lat, 0) /
          clusterCoaches.length;
        const avgLng =
          clusterCoaches.reduce((sum, c) => sum + c.location.lng, 0) /
          clusterCoaches.length;

        clusterList.push({
          coaches: clusterCoaches,
          lat: avgLat,
          lng: avgLng,
        });

        clusterCoaches.forEach((c) => processed.add(c.id));
      } else {
        // Single coach marker
        clusterList.push({
          coaches: [coach],
          lat: coach.location.lat,
          lng: coach.location.lng,
        });
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
      {/* Map Area */}
      <View
        style={[
          styles.mapContainer,
          { backgroundColor: `${palette.tint}08` },
        ]}
        onLayout={handleLayout}
      >
        {/* Grid lines for visual reference */}
        {[0.25, 0.5, 0.75].map((pos) => (
          <View
            key={`h-${pos}`}
            style={[
              styles.gridLineH,
              {
                top: `${pos * 100}%`,
                backgroundColor: `${palette.border}40`,
              },
            ]}
          />
        ))}
        {[0.25, 0.5, 0.75].map((pos) => (
          <View
            key={`v-${pos}`}
            style={[
              styles.gridLineV,
              {
                left: `${pos * 100}%`,
                backgroundColor: `${palette.border}40`,
              },
            ]}
          />
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
            <View style={styles.userMarkerInner} />
          </View>
        )}

        {/* Coach Markers */}
        {mapSize.width > 0 &&
          clusters.map((cluster, index) => {
            const position = coordToPosition(cluster.lat, cluster.lng);

            if (cluster.coaches.length > 1) {
              return (
                <View
                  key={`cluster-${index}`}
                  style={[
                    styles.markerContainer,
                    {
                      left: position.x - 22,
                      top: position.y - 22,
                    },
                  ]}
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
                style={[
                  styles.markerContainer,
                  {
                    left: position.x - 22,
                    top: position.y - 30,
                  },
                ]}
              >
                <CoachMarker
                  coach={coach}
                  isSelected={coach.id === selectedCoachId}
                  onPress={() => onCoachSelect?.(coach.id)}
                  size="medium"
                  showRating
                />
              </View>
            );
          })}

        {/* Search This Area Button */}
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.searchAreaButton,
            {
              backgroundColor: palette.tint,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <ThemedText style={styles.searchAreaText} lightColor="#fff" darkColor="#fff">
            Search this area
          </ThemedText>
        </Pressable>

        {/* Zoom Controls */}
        <View style={styles.zoomControls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zoom in"
            style={[styles.zoomButton, { backgroundColor: palette.surface }]}
          >
            <Ionicons name="add" size={20} color={palette.text} />
          </Pressable>
          <View style={[styles.zoomDivider, { backgroundColor: palette.border }]} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Zoom out"
            style={[styles.zoomButton, { backgroundColor: palette.surface }]}
          >
            <Ionicons name="remove" size={20} color={palette.text} />
          </Pressable>
        </View>
      </View>

      {/* Selected Coach Card */}
      {selectedCoach && (
        <View style={styles.selectedCardContainer}>
          <CoachCard
            coach={selectedCoach}
            active
            onPress={() => onCoachPress?.(selectedCoach)}
          />
        </View>
      )}

      {/* Expanded Cluster View */}
      {expandedCluster && (
        <View style={[styles.clusterOverlay, { backgroundColor: `${palette.text}80` }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setExpandedCluster(null)}
          />
          <SurfaceCard style={styles.clusterCard}>
            <View style={styles.clusterHeader}>
              <ThemedText type="defaultSemiBold">
                {expandedCluster.coaches.length} Coaches
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => setExpandedCluster(null)}
              >
                <Ionicons name="close" size={24} color={palette.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.clusterList}>
              {expandedCluster.coaches.map((coach) => (
                <CoachCard
                  key={coach.id}
                  coach={coach}
                  onPress={() => {
                    setExpandedCluster(null);
                    onCoachPress?.(coach);
                  }}
                />
              ))}
            </ScrollView>
          </SurfaceCard>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
  },
  markerContainer: {
    position: 'absolute',
  },
  userMarker: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  searchAreaButton: {
    position: 'absolute',
    top: Spacing.md,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  searchAreaText: {
    ...Typography.sm,
    fontWeight: '600',
  },
  zoomControls: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.md,
    borderRadius: Radii.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  zoomButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
  },
  selectedCardContainer: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
  },
  clusterOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  clusterCard: {
    width: '100%',
    maxHeight: '70%',
  },
  clusterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  clusterList: {
    flex: 1,
  },
});
