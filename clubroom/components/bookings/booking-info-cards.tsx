/**
 * BookingInfoCards — Date/Time, Location, and Payment cards for booking detail.
 *
 * Three small card components that display booking metadata with icon rows.
 */

import React, { memo, useCallback } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/components/ui/toast';
import { createLogger } from '@/utils/logger';
import { openLocationInMaps } from '@/utils/map-links';

// ============================================================================
// DATE & TIME CARD
// ============================================================================

interface DateTimeCardProps {
  weekday: string;
  dateStr: string;
  time: string;
}

export const DateTimeCard = memo(function DateTimeCard({
  weekday,
  dateStr,
  time,
}: DateTimeCardProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <Row gap="md" align="center">
        <View style={[styles.iconCircle, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
          <Ionicons name="calendar" size={24} color={palette.tint} />
        </View>
        <Column gap="xxs" style={styles.flex1}>
          <ThemedText style={styles.cardTitle}>Date & Time</ThemedText>
          <ThemedText type="subtitle" style={styles.cardValue}>
            {weekday}, {dateStr}
          </ThemedText>
          <ThemedText style={styles.cardSubtext}>{time}</ThemedText>
        </Column>
      </Row>
    </SurfaceCard>
  );
});

// ============================================================================
// LOCATION CARD
// ============================================================================

interface LocationCardProps {
  locationLabel: string;
}

export const LocationCard = memo(function LocationCard({ locationLabel }: LocationCardProps) {
  const { colors: palette } = useTheme();

  const handleOpenMap = useCallback(() => {
    void openLocationInMaps({ location: locationLabel }).then((opened) => {
      if (!opened) {
        Alert.alert('Error', 'Could not open maps application.');
      }
    });
  }, [locationLabel]);

  return (
    <SurfaceCard style={styles.card}>
      <Row gap="md" align="center">
        <View style={[styles.iconCircle, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
          <Ionicons name="location" size={24} color={palette.tint} />
        </View>
        <Column gap="xxs" style={styles.flex1}>
          <ThemedText style={styles.cardTitle}>Location</ThemedText>
          <ThemedText type="subtitle" style={styles.cardValue}>
            {locationLabel}
          </ThemedText>
        </Column>
        <Clickable
          style={[styles.actionIconButton, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
          onPress={handleOpenMap}
          accessibilityLabel="Open in maps"
        >
          <Ionicons name="navigate" size={20} color={palette.tint} />
        </Clickable>
      </Row>
      <Clickable
        style={[
          styles.mapPreview,
          {
            backgroundColor: withAlpha(palette.tint, 0.04),
            borderColor: withAlpha(palette.tint, 0.12),
          },
        ]}
        onPress={handleOpenMap}
        accessibilityLabel="Open directions in maps"
      >
        <View style={[styles.mapGrid, { borderColor: withAlpha(palette.border, 0.8) }]} />
        <View style={[styles.mapPin, { backgroundColor: palette.tint }]}>
          <Ionicons name="location" size={18} color={palette.onPrimary} />
        </View>
        <ThemedText style={[styles.mapText, { color: palette.muted }]}>Tap for directions</ThemedText>
      </Clickable>
    </SurfaceCard>
  );
});

// ============================================================================
// PAYMENT CARD
// ============================================================================

export const PaymentCard = memo(function PaymentCard() {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <Row gap="md" align="center">
        <View style={[styles.iconCircle, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
          <Ionicons name="card" size={24} color={palette.tint} />
        </View>
        <Column gap="xxs" style={styles.flex1}>
          <ThemedText style={styles.cardTitle}>Payment</ThemedText>
          <ThemedText type="subtitle" style={styles.cardValue}>
            £65.00
          </ThemedText>
        </Column>
      </Row>
    </SurfaceCard>
  );
});

// ============================================================================
// COACH CARD
// ============================================================================
const logger = createLogger('BookingInfoCards');

interface CoachCardProps {
  coachId?: string;
  bookingId?: string;
  coachName: string;
  coachPhotoUrl: string;
}

export const BookingCoachCard = memo(function BookingCoachCard({
  coachId,
  bookingId,
  coachName,
  coachPhotoUrl,
}: CoachCardProps) {
  const { colors: palette } = useTheme();
  const { showToast } = useToast();

  const handlePress = useCallback(() => {
    if (!coachId) {
      logger.warn('Coach profile unavailable from booking card', { bookingId });
      showToast('Coach profile unavailable', 'warning');
      return;
    }
    router.push(Routes.profile(coachId));
  }, [bookingId, coachId, showToast]);

  return (
    <Clickable onPress={handlePress} accessibilityLabel={`View ${coachName} profile`}>
      <SurfaceCard style={styles.card}>
        <Row gap="md" align="center">
          <Image
            source={{ uri: coachPhotoUrl }}
            style={styles.avatar}
            accessibilityLabel={`${coachName} photo`}
          />
          <Column gap="xxs" style={styles.flex1}>
            <ThemedText style={styles.cardTitle}>Your Coach</ThemedText>
            <ThemedText type="subtitle" style={styles.cardValue}>
              {coachName}
            </ThemedText>
            <Row gap="xxs" align="center">
              <Ionicons name="star" size={14} color={palette.warning} />
              <ThemedText style={styles.ratingText}>4.9 &middot; 127 reviews</ThemedText>
            </Row>
          </Column>
          <Ionicons name="chevron-forward" size={20} color={palette.muted} />
        </Row>
      </SurfaceCard>
    </Clickable>
  );
});

// ============================================================================
// ATHLETE CARD (coach view only)
// ============================================================================

interface AthleteCardProps {
  childName: string;
  clientId: string;
  clientPhotoUrl: string;
}

export const BookingAthleteCard = memo(function BookingAthleteCard({
  childName,
  clientId,
  clientPhotoUrl,
}: AthleteCardProps) {
  const { colors: palette } = useTheme();

  const handlePress = useCallback(() => {
    router.push(Routes.developmentAthlete(clientId));
  }, [clientId]);

  return (
    <Clickable onPress={handlePress} accessibilityLabel={`View ${childName} profile`}>
      <SurfaceCard style={styles.card}>
        <Row gap="md" align="center">
          <Image
            source={{ uri: clientPhotoUrl }}
            style={styles.avatar}
            accessibilityLabel={`${childName} photo`}
          />
          <Column gap="xxs" style={styles.flex1}>
            <ThemedText style={styles.cardTitle}>Athlete</ThemedText>
            <ThemedText type="subtitle" style={styles.cardValue}>
              {childName}
            </ThemedText>
          </Column>
          <Ionicons name="chevron-forward" size={20} color={palette.muted} />
        </Row>
      </SurfaceCard>
    </Clickable>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: { padding: Spacing.lg, gap: Spacing.md },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flex1: { flex: 1 },
  cardTitle: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.6,
    fontWeight: '600',
  },
  cardValue: { ...Typography.subheading },
  cardSubtext: { ...Typography.bodySmall, opacity: 0.6 },
  mapPreview: {
    height: 120,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
    borderWidth: 1,
    borderStyle: 'dashed',
    margin: Spacing.sm,
    borderRadius: Radii.sm,
  },
  mapPin: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapText: { ...Typography.caption },
  avatar: { width: 48, height: 48, borderRadius: Radii.xl },
  ratingText: { ...Typography.caption, opacity: 0.6 },
  actionIconButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
