/**
 * Extracted sub-components for MapViewPlaceholder.
 *
 * MOCK_MAP_COACHES — default mock data.
 * MapGridLines — simulated road grid (horizontal + vertical + diagonal).
 * MapParks — green park patches.
 * UserLocationDot — pulsing blue user location marker.
 * MapOverlayButtons — search area + GPS buttons.
 * MapInfoNote — bottom info bar.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, Components, withAlpha, Shadows } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { MapCoach } from './map-view-placeholder';

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const MOCK_MAP_COACHES: MapCoach[] = [
  { id: 'm1', fullName: 'James Whitfield', pricePerHour: 35, lat: 51.515, lng: -0.09, rating: 4.9, distanceMiles: 1.2 },
  { id: 'm2', fullName: 'Priya Sharma', pricePerHour: 40, lat: 51.525, lng: -0.12, rating: 4.8, distanceMiles: 2.4 },
  { id: 'm3', fullName: 'Daniel Okafor', pricePerHour: 30, lat: 51.505, lng: -0.07, rating: 4.7, distanceMiles: 3.1 },
  { id: 'm4', fullName: 'Emily Chen', pricePerHour: 45, lat: 51.530, lng: -0.05, rating: 5.0, distanceMiles: 0.8 },
  { id: 'm5', fullName: 'Marcus Rivera', pricePerHour: 25, lat: 51.510, lng: -0.15, rating: 4.6, distanceMiles: 4.5 },
  { id: 'm6', fullName: 'Sarah Mitchell', pricePerHour: 50, lat: 51.520, lng: -0.10, rating: 4.9, distanceMiles: 1.0, saved: true },
];

// ─── MapGridLines ─────────────────────────────────────────────────────────────

interface MapGridLinesProps {
  palette: ThemeColors;
}

export const MapGridLines = memo(function MapGridLines({ palette }: MapGridLinesProps) {
  return (
    <>
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
    </>
  );
});

// ─── MapParks ─────────────────────────────────────────────────────────────────

interface MapParksProps {
  palette: ThemeColors;
}

export const MapParks = memo(function MapParks({ palette }: MapParksProps) {
  return (
    <>
      <View style={[styles.parkPatch, styles.park1, { backgroundColor: withAlpha(palette.success, 0.07) }]} />
      <View style={[styles.parkPatch, styles.park2, { backgroundColor: withAlpha(palette.success, 0.06) }]} />
    </>
  );
});

// ─── UserLocationDot ──────────────────────────────────────────────────────────

interface UserLocationDotProps {
  palette: ThemeColors;
}

export const UserLocationDot = memo(function UserLocationDot({ palette }: UserLocationDotProps) {
  return (
    <View style={[styles.userDot, { backgroundColor: palette.tint }]}>
      <View style={[styles.userDotInner, { backgroundColor: palette.surface }]} />
    </View>
  );
});

// ─── MapOverlayButtons ────────────────────────────────────────────────────────

interface MapOverlayButtonsProps {
  onSearchArea?: () => void;
  onGpsPress?: () => void;
  palette: ThemeColors;
  scheme: 'light' | 'dark';
}

export const MapOverlayButtons = memo(function MapOverlayButtons({
  onSearchArea,
  onGpsPress,
  palette,
  scheme,
}: MapOverlayButtonsProps) {
  return (
    <>
      <Clickable
        accessibilityLabel="Search this area"
        onPress={onSearchArea}
        style={[
          styles.searchAreaButton,
          {
            backgroundColor: palette.tint,
            ...Shadows[scheme].card,
          },
        ]}
      >
        <Ionicons name="search" size={Components.icon.sm} color={palette.onPrimary} />
        <ThemedText style={[styles.searchAreaText, { color: palette.onPrimary }]}>
          Search this area
        </ThemedText>
      </Clickable>

      <Clickable
        accessibilityLabel="My location"
        onPress={onGpsPress}
        style={[
          styles.gpsButton,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            ...Shadows[scheme].card,
          },
        ]}
      >
        <Ionicons name="locate" size={Components.icon.lg} color={palette.tint} />
      </Clickable>
    </>
  );
});

// ─── MapInfoNote ──────────────────────────────────────────────────────────────

interface MapInfoNoteProps {
  palette: ThemeColors;
}

export const MapInfoNote = memo(function MapInfoNote({ palette }: MapInfoNoteProps) {
  return (
    <View style={[styles.infoNote, { backgroundColor: palette.surfaceSecondary }]}>
      <Ionicons name="information-circle-outline" size={Components.icon.sm} color={palette.muted} />
      <ThemedText style={[styles.infoText, { color: palette.muted }]}>
        Map view requires native build for full interactivity
      </ThemedText>
    </View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
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
  },
  searchAreaText: {
    ...Typography.smallSemiBold,
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
