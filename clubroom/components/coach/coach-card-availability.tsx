/**
 * CoachCardAvailability Component
 *
 * Displays coach availability information including next available slot
 * and distance from user's location.
 */

import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useTheme, ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CoachCardAvailabilityProps {
  /** Next available time slot description */
  nextAvailable?: string;
  /** Distance from user in miles */
  distanceMiles?: number;
  /** City/location name */
  city?: string;
  /** Layout variant */
  variant?: 'compact' | 'full';
}

export interface DistanceDisplayProps {
  distanceMiles: number;
  iconSize?: number;
}

export interface LocationDisplayProps {
  city: string;
  iconSize?: number;
}

export interface NextAvailableDisplayProps {
  nextAvailable: string;
}

type Palette = ThemeColors;

// -----------------------------------------------------------------------------
// DistanceDisplay Component
// -----------------------------------------------------------------------------

export function DistanceDisplay({
  distanceMiles,
  iconSize = 14,
}: DistanceDisplayProps) {
  const { colors: palette } = useTheme();

  return (
    <Row style={styles.distanceContainer}>
      <Ionicons name="location" size={iconSize} color={palette.icon} />
      <ThemedText style={[styles.distanceText, { color: palette.muted }]}>
        {distanceMiles.toFixed(1)} mi
      </ThemedText>
    </Row>
  );
}

// -----------------------------------------------------------------------------
// LocationDisplay Component
// -----------------------------------------------------------------------------

export function LocationDisplay({
  city,
  iconSize = 14,
}: LocationDisplayProps) {
  const { colors: palette } = useTheme();

  return (
    <Row style={styles.locationContainer}>
      <Ionicons name="location-outline" size={iconSize} color={palette.muted} />
      <ThemedText style={[styles.locationText, { color: palette.muted }]}>
        {city}
      </ThemedText>
    </Row>
  );
}

// -----------------------------------------------------------------------------
// NextAvailableDisplay Component
// -----------------------------------------------------------------------------

export function NextAvailableDisplay({ nextAvailable }: NextAvailableDisplayProps) {
  const { colors: palette } = useTheme();

  return (
    <Row style={styles.availabilityContainer}>
      <Ionicons name="calendar-outline" size={Components.icon.sm} color={palette.success} />
      <ThemedText style={[styles.availabilityText, { color: palette.success }]}>
        {nextAvailable}
      </ThemedText>
    </Row>
  );
}

// -----------------------------------------------------------------------------
// MetaRow Component (distance + price together)
// -----------------------------------------------------------------------------

export interface MetaRowProps {
  distanceMiles?: number;
  pricePerHour?: number;
  showDivider?: boolean;
}

export function MetaRow({
  distanceMiles,
  pricePerHour,
  showDivider = true,
}: MetaRowProps) {
  const { colors: palette } = useTheme();

  const hasDistance = distanceMiles !== undefined;
  const hasPrice = pricePerHour !== undefined;

  if (!hasDistance && !hasPrice) {
    return null;
  }

  return (
    <Row style={styles.metaRow}>
      {hasDistance && (
        <Row style={styles.metaItem}>
          <Ionicons name="location-outline" size={Components.icon.sm} color={palette.muted} />
          <ThemedText style={[styles.metaText, { color: palette.muted }]}>
            {distanceMiles.toFixed(1)} mi
          </ThemedText>
        </Row>
      )}
      {showDivider && hasDistance && hasPrice && (
        <View style={[styles.metaDot, { backgroundColor: palette.border }]} />
      )}
      {hasPrice && (
        <ThemedText style={[styles.priceText, { color: palette.text }]}>
          £{pricePerHour}/hr
        </ThemedText>
      )}
    </Row>
  );
}

// -----------------------------------------------------------------------------
// Full CoachCardAvailability Component
// -----------------------------------------------------------------------------

export function CoachCardAvailability({
  nextAvailable,
  distanceMiles,
  city,
  variant = 'compact',
}: CoachCardAvailabilityProps) {
  const { colors: palette } = useTheme();

  if (variant === 'compact') {
    return (
      <Row style={styles.compactContainer}>
        {distanceMiles !== undefined && (
          <DistanceDisplay distanceMiles={distanceMiles} />
        )}
        {city && <LocationDisplay city={city} />}
      </Row>
    );
  }

  return (
    <View style={styles.fullContainer}>
      {distanceMiles !== undefined && (
        <DistanceDisplay distanceMiles={distanceMiles} />
      )}
      {city && <LocationDisplay city={city} />}
      {nextAvailable && (
        <NextAvailableDisplay nextAvailable={nextAvailable} />
      )}
    </View>
  );
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  compactContainer: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fullContainer: {
    gap: Spacing.xs,
  },
  distanceContainer: {
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  distanceText: { ...Typography.smallSemiBold },
  locationContainer: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  locationText: { ...Typography.smallSemiBold },
  availabilityContainer: {
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  availabilityText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  metaRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaItem: {
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: Radii.pill,
  },
  metaText: {
    ...Typography.small,
  },
  priceText: {
    ...Typography.bodySemiBold,
  },
});

export default CoachCardAvailability;
