/**
 * Location Map Preview
 *
 * Card showing a map placeholder area with location text
 * and a "Get Directions" button that opens in Maps.
 */

import { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';
import { openLocationInMaps } from '@/utils/map-links';
import { uiFeedback } from '@/services/ui-feedback';

interface LocationMapPreviewProps {
  location: string;
  coordinates?: { latitude: number; longitude: number };
}

function LocationMapPreviewComponent({ location, coordinates }: LocationMapPreviewProps) {
  const { colors: palette } = useTheme();

  const handleGetDirections = useCallback(() => {
    void openLocationInMaps({ location, coordinates }).then((opened) => {
      if (!opened) {
        uiFeedback.showToast('Could not open maps application.', 'error');
      }
    });
  }, [coordinates, location]);

  if (!location) return null;

  return (
    <SurfaceCard style={styles.card}>
      {/* Map placeholder */}
      <View style={[styles.mapPlaceholder, { backgroundColor: palette.background }]}>
        <Ionicons name="map-outline" size={48} color={palette.muted} />
      </View>

      {/* Location text */}
      <Row style={styles.locationRow}>
        <Ionicons name="location-outline" size={18} color={palette.muted} />
        <ThemedText style={styles.locationText} numberOfLines={2}>
          {location}
        </ThemedText>
      </Row>

      {/* Get Directions button */}
      <Clickable
        onPress={handleGetDirections}
        style={styles.directionsButton}
        accessibilityLabel="Get directions"
        hitSlop={4}
      >
        <Ionicons name="navigate-outline" size={16} color={palette.tint} />
        <ThemedText style={[styles.directionsText, { color: palette.tint }]}>
          Get Directions
        </ThemedText>
      </Clickable>
    </SurfaceCard>
  );
}

export const LocationMapPreview = memo(LocationMapPreviewComponent);

const styles = StyleSheet.create({
  card: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  mapPlaceholder: {
    height: 160,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  locationText: {
    ...Typography.bodySmall,
    flex: 1,
  },
  directionsButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xs,
    minHeight: 44,
  },
  directionsText: {
    ...Typography.bodySemiBold,
  },
});
