/**
 * MapViewPlaceholder Component — Sprint 8C
 *
 * A pure React Native View that simulates a map experience for the POC.
 * No native map libraries required. Shows coach price pills as
 * absolute-positioned markers on a canvas-style background.
 */

import { useCallback, useMemo, useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { CoachMarkerPill } from './coach-marker';

import {
  MOCK_MAP_COACHES,
  MapGridLines,
  MapParks,
  UserLocationDot,
  MapOverlayButtons,
  MapInfoNote,
  styles,
} from './map-view-placeholder-sections';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export function MapViewPlaceholder({
  coaches,
  selectedCoachId,
  onCoachSelect,
  onSearchArea,
  onGpsPress,
  savedCoachIds = [],
}: MapViewPlaceholderProps) {
  const { colors: palette, scheme } = useTheme();
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });

  const data = coaches.length > 0 ? coaches : MOCK_MAP_COACHES;

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

  const coordToPosition = useCallback(
    (lat: number, lng: number) => {
      if (mapSize.width === 0 || mapSize.height === 0) return { x: 0, y: 0 };
      const latRange = bounds.maxLat - bounds.minLat;
      const lngRange = bounds.maxLng - bounds.minLng;
      const x = ((lng - bounds.minLng) / lngRange) * mapSize.width;
      const y = ((bounds.maxLat - lat) / latRange) * mapSize.height;
      return { x, y };
    },
    [bounds, mapSize],
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setMapSize({ width, height });
  }, []);

  return (
    <View style={styles.container}>
      <View
        style={[styles.mapCanvas, { backgroundColor: palette.background }]}
        onLayout={handleLayout}
      >
        <MapGridLines palette={palette} />
        <MapParks palette={palette} />
        <UserLocationDot palette={palette} />

        {mapSize.width > 0 &&
          data.map((coach) => {
            const pos = coordToPosition(coach.lat, coach.lng);
            const isSaved = coach.saved || savedCoachIds.includes(coach.id);
            return (
              <View
                key={coach.id}
                style={[styles.markerContainer, { left: pos.x - 30, top: pos.y - 28 }]}
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

        <MapOverlayButtons
          onSearchArea={onSearchArea}
          onGpsPress={onGpsPress}
          palette={palette}
          scheme={scheme}
        />
      </View>

      <MapInfoNote palette={palette} />
    </View>
  );
}

export { MOCK_MAP_COACHES };
