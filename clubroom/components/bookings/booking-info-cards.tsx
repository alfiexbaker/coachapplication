/**
 * BookingInfoCards — Date/Time, Location, and Payment cards for booking detail.
 *
 * Three small card components that display booking metadata with icon rows.
 */

import React, { memo, useCallback } from 'react';
import { Image, StyleSheet, View, Alert, Linking } from 'react-native';
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
    const location = encodeURIComponent(locationLabel);
    Linking.openURL(`https://maps.google.com/?q=${location}`).catch(() =>
      Alert.alert('Error', 'Could not open maps application.'),
    );
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
      <View style={[styles.mapPreview, { backgroundColor: palette.border }]}>
        <Ionicons name="map" size={32} color={palette.muted} />
        <ThemedText style={styles.mapText}>Map preview</ThemedText>
      </View>
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
            &pound;65 (mock)
          </ThemedText>
        </Column>
      </Row>
    </SurfaceCard>
  );
});

// ============================================================================
// COACH CARD
// ============================================================================

interface CoachCardProps {
  coachName: string;
  coachPhotoUrl: string;
}

export const BookingCoachCard = memo(function BookingCoachCard({
  coachName,
  coachPhotoUrl,
}: CoachCardProps) {
  const { colors: palette } = useTheme();

  const handlePress = useCallback(() => {
    router.push(Routes.COACH_PROFILE);
  }, []);

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
  },
  mapText: { ...Typography.caption, opacity: 0.5 },
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
