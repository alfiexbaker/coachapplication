/**
 * MapViewPlaceholder Component — Sprint 8C
 *
 * A pure React Native View that simulates a map experience for the POC.
 * No native map libraries required. Shows coach price pills as
 * absolute-positioned markers on a canvas-style background.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Typography, Components , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CoachMarkerPill } from './coach-marker';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MapCoach {
  id: string;
  fullName: string;
  pricePerHour: number;
  lat: number;
  lng: number;
  rating: number;
  distanceMiles: number;
  saved?: boolean;
}

interface MapViewPlaceholderProps {
  coaches: MapCoach[];
  selectedCoachId?: string;
  onCoachSelect?: (coachId: string) => void;
  onSearchArea?: () => void;
  onGpsPress?: () => void;
  savedCoachIds?: string[];
}

// ---------------------------------------------------------------------------
// Mock coaches for standalone use
// ---------------------------------------------------------------------------

export const MOCK_MAP_COACHES: MapCoach[] = [
  { id: 'm1', fullName: 'James Whitfield', pricePerHour: 35, lat: 51.515, lng: -0.09, rating: 4.9, distanceMiles: 1.2 },
  { id: 'm2', fullName: 'Priya Sharma', pricePerHour: 40, lat: 51.525, lng: -0.12, rating: 4.8, distanceMiles: 2.4 },
  { id: 'm3', fullName: 'Daniel Okafor', pricePerHour: 30, lat: 51.505, lng: -0.07, rating: 4.7, distanceMiles: 3.1 },
  { id: 'm4', fullName: 'Emily Chen', pricePerHour: 45, lat: 51.530, lng: -0.05, rating: 5.0, distanceMiles: 0.8 },
  { id: 'm5', fullName: 'Marcus Rivera', pricePerHour: 25, lat: 51.510, lng: -0.15, rating: 4.6, distanceMiles: 4.5 },
  { id: 'm6', fullName: 'Sarah Mitchell', pricePerHour: 50, lat: 51.520, lng: -0.10, rating: 4.9, distanceMiles: 1.0, saved: true },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MapViewPlaceholder({
  coaches,
  selectedCoachId,
  onCoachSelect,
  onSearchArea,
  onGpsPress,
  savedCoachIds = [],
}: MapViewPlaceholderProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });

  const data = coaches.length > 0 ? coaches : MOCK_MAP_COACHES;

  // Calculate bounds from coaches
  const bounds = useMemo(() => {
    if (data.length === 0) {
      return { minLat: 51.4, maxLat: 51.6, minLng: -0.3, maxLng: 0.1 };
    }
    const lats = data.map((c) => c.lat);
    const lngs = data.map((c) => c.lng);
    const latPadding = 0.01;
    const lngPadding = 0.02;
    return {
      minLat: Math.min(...lats) - latPadding,
      maxLat: Math.max(...lats) + latPadding,
      minLng: Math.min(...lngs) - lngPadding,
      maxLng: Math.max(...lngs) + lngPadding,
    };
  }, [data]);

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
    [bounds, mapSize],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setMapSize({ width, height });
  };

  return (
    <View style={styles.container}>
      {/* Map canvas */}
      <View
        style={[styles.mapCanvas, { backgroundColor: palette.background }]}
        onLayout={handleLayout}
      >
        {/* Simulated road grid */}
        {[0.2, 0.4, 0.6, 0.8].map((pos) => (
          <View
            key={`h-${pos}`}
            style={[
              styles.gridLineH,
              { top: `${pos * 100}%`, backgroundColor: withAlpha(palette.border, 0.38) },
            ]}
          />
        ))}
        {[0.2, 0.4, 0.6, 0.8].map((pos) => (
          <View
            key={`v-${pos}`}
            style={[
              styles.gridLineV,
              { left: `${pos * 100}%`, backgroundColor: withAlpha(palette.border, 0.38) },
            ]}
          />
        ))}

        {/* Diagonal "roads" for a more map-like feel */}
        <View
          style={[
            styles.diagonalRoad,
            { backgroundColor: withAlpha(palette.border, 0.25), transform: [{ rotate: '30deg' }] },
          ]}
        />
        <View
          style={[
            styles.diagonalRoad2,
            { backgroundColor: withAlpha(palette.border, 0.25), transform: [{ rotate: '-20deg' }] },
          ]}
        />

        {/* Green "park" patches */}
        <View style={[styles.parkPatch, styles.park1, { backgroundColor: withAlpha(palette.success, 0.07) }]} />
        <View style={[styles.parkPatch, styles.park2, { backgroundColor: withAlpha(palette.success, 0.06) }]} />

        {/* User location dot */}
        <View style={[styles.userDot, { backgroundColor: palette.tint }]}>
          <View style={styles.userDotInner} />
        </View>

        {/* Coach price pill markers */}
        {mapSize.width > 0 &&
          data.map((coach) => {
            const pos = coordToPosition(coach.lat, coach.lng);
            const isSaved = coach.saved || savedCoachIds.includes(coach.id);
            return (
              <View
                key={coach.id}
                style={[
                  styles.markerContainer,
                  { left: pos.x - 30, top: pos.y - 28 },
                ]}
              >
                <CoachMarkerPill
                  price={`\u00A3${coach.pricePerHour}/hr`}
                  selected={coach.id === selectedCoachId}
                  saved={isSaved}
                  onPress={() => onCoachSelect?.(coach.id)}
                />
              </View>
            );
          })}

        {/* "Search this area" button overlay */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search this area"
          onPress={onSearchArea}
          style={({ pressed }) => [
            styles.searchAreaButton,
            {
              backgroundColor: palette.tint,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name="search" size={Components.icon.sm} color={palette.onPrimary} />
          <ThemedText style={styles.searchAreaText} lightColor={Colors.light.onPrimary} darkColor={Colors.light.onPrimary}>
            Search this area
          </ThemedText>
        </Pressable>

        {/* GPS / My Location button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="My location"
          onPress={onGpsPress}
          style={({ pressed }) => [
            styles.gpsButton,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name="locate" size={Components.icon.lg} color={palette.tint} />
        </Pressable>
      </View>

      {/* Info note at bottom */}
      <View style={[styles.infoNote, { backgroundColor: palette.surfaceSecondary }]}>
        <Ionicons name="information-circle-outline" size={Components.icon.sm} color={palette.muted} />
        <ThemedText style={[styles.infoText, { color: palette.muted }]}>
          Map view requires native build for full interactivity
        </ThemedText>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.xs,
  },
  mapCanvas: {
    flex: 1,
    minHeight: 320,
    borderRadius: Radii.card,
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
  diagonalRoad: {
    position: 'absolute',
    width: '140%',
    height: 1,
    top: '50%',
    left: '-20%',
  },
  diagonalRoad2: {
    position: 'absolute',
    width: '140%',
    height: 1,
    top: '35%',
    left: '-20%',
  },
  parkPatch: {
    position: 'absolute',
    borderRadius: Radii.md,
  },
  park1: {
    width: 60,
    height: 40,
    top: '15%',
    left: '10%',
  },
  park2: {
    width: 45,
    height: 50,
    top: '60%',
    right: '15%',
  },
  userDot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 18,
    height: 18,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -9,
    marginTop: -9,
  },
  userDotInner: {
    width: 8,
    height: 8,
    borderRadius: Radii.pill,
    backgroundColor: Colors.light.surface,
  },
  markerContainer: {
    position: 'absolute',
    zIndex: 10,
  },
  searchAreaButton: {
    position: 'absolute',
    top: Spacing.sm,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  searchAreaText: {
    ...Typography.small,
    fontWeight: '600',
  },
  gpsButton: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    width: 44,
    height: 44,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
  },
  infoText: {
    ...Typography.caption,
  },
});
