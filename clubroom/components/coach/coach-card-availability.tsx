/**
 * CoachCardAvailability Component
 *
 * Displays coach availability information including next available slot
 * and distance from user's location.
 */

import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Spacing, Radii, Components, Typography } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

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

type Palette = (typeof Colors)['light'];

// -----------------------------------------------------------------------------
// DistanceDisplay Component
// -----------------------------------------------------------------------------

export function DistanceDisplay({
  distanceMiles,
  iconSize = 14,
}: DistanceDisplayProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={styles.distanceContainer}>
      <Ionicons name="location" size={iconSize} color={palette.icon} />
      <ThemedText style={[styles.distanceText, { color: palette.muted }]}>
        {distanceMiles.toFixed(1)} mi
      </ThemedText>
    </View>
  );
}

// -----------------------------------------------------------------------------
// LocationDisplay Component
// -----------------------------------------------------------------------------

export function LocationDisplay({
  city,
  iconSize = 14,
}: LocationDisplayProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={styles.locationContainer}>
      <Ionicons name="location-outline" size={iconSize} color={palette.muted} />
      <ThemedText style={[styles.locationText, { color: palette.muted }]}>
        {city}
      </ThemedText>
    </View>
  );
}

// -----------------------------------------------------------------------------
// NextAvailableDisplay Component
// -----------------------------------------------------------------------------

export function NextAvailableDisplay({ nextAvailable }: NextAvailableDisplayProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={styles.availabilityContainer}>
      <Ionicons name="calendar-outline" size={Components.icon.sm} color={palette.success} />
      <ThemedText style={[styles.availabilityText, { color: palette.success }]}>
        {nextAvailable}
      </ThemedText>
    </View>
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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const hasDistance = distanceMiles !== undefined;
  const hasPrice = pricePerHour !== undefined;

  if (!hasDistance && !hasPrice) {
    return null;
  }

  return (
    <View style={styles.metaRow}>
      {hasDistance && (
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={Components.icon.sm} color={palette.muted} />
          <ThemedText style={[styles.metaText, { color: palette.muted }]}>
            {distanceMiles.toFixed(1)} mi
          </ThemedText>
        </View>
      )}
      {showDivider && hasDistance && hasPrice && (
        <View style={[styles.metaDot, { backgroundColor: palette.border }]} />
      )}
      {hasPrice && (
        <ThemedText style={[styles.priceText, { color: palette.text }]}>
          £{pricePerHour}/hr
        </ThemedText>
      )}
    </View>
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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  if (variant === 'compact') {
    return (
      <View style={styles.compactContainer}>
        {distanceMiles !== undefined && (
          <DistanceDisplay distanceMiles={distanceMiles} />
        )}
        {city && <LocationDisplay city={city} />}
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fullContainer: {
    gap: Spacing.xs,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '500',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '500',
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  availabilityText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
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
