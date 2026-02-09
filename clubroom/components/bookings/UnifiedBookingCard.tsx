/**
 * UnifiedBookingCard
 *
 * Single component for all booking card variants.
 * Replaces: booking-card.tsx, compact-booking-card.tsx, booking-card-enhanced.tsx
 *
 * Usage:
 *   <UnifiedBookingCard booking={booking} variant="compact" />
 *   <UnifiedBookingCard booking={booking} variant="standard" />
 *   <UnifiedBookingCard booking={booking} variant="detailed" />
 */

import { Image, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { BookingSummary } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import {
  ExtendedBooking,
  formatBookingDateTime,
  getBookingStatusColor,
  CompactBookingCard,
  DetailedBookingCard,
} from './unified-booking-sections';

const logger = createLogger('UnifiedBookingCard');

export type BookingCardVariant = 'compact' | 'standard' | 'detailed';

interface UnifiedBookingCardProps {
  booking: BookingSummary;
  variant?: BookingCardVariant;
  onPress?: () => void;
  showActions?: boolean;
}

export function UnifiedBookingCard({
  booking,
  variant = 'standard',
  onPress,
  showActions = false,
}: UnifiedBookingCardProps) {
  const { currentUser } = useAuth();
  const { colors: palette } = useTheme();
  const extendedBooking = booking as ExtendedBooking;

  const isCoach = currentUser?.role === 'COACH';
  const statusColor = getBookingStatusColor(booking.status, palette);
  const { day, time, full } = formatBookingDateTime(booking.start);
  const coachPhotoUrl = extendedBooking.coach?.photoUrl || `https://i.pravatar.cc/100?u=${booking.coachId || 'default'}`;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      logger.press('BookingCard', { bookingId: booking.id, variant });
      router.push(Routes.booking(booking.id));
    }
  };

  const handleAthletePress = () => {
    const athleteId = extendedBooking.athleteId;
    if (athleteId && isCoach) {
      logger.press('AthleteLink', { athleteId });
      router.push(Routes.developmentAthlete(athleteId));
    }
  };

  const handleRatePress = () => {
    router.push(Routes.review(booking.id));
  };

  if (variant === 'compact') {
    return (
      <CompactBookingCard
        booking={booking}
        coachPhotoUrl={coachPhotoUrl}
        statusColor={statusColor}
        day={day}
        onPress={handlePress}
        palette={palette}
      />
    );
  }

  if (variant === 'detailed') {
    return (
      <DetailedBookingCard
        booking={booking}
        extendedBooking={extendedBooking}
        coachPhotoUrl={coachPhotoUrl}
        statusColor={statusColor}
        full={full}
        time={time}
        isCoach={isCoach}
        showActions={showActions}
        onPress={handlePress}
        onAthletePress={handleAthletePress}
        onRatePress={handleRatePress}
        palette={palette}
      />
    );
  }

  // STANDARD VARIANT (default) - Balanced info
  return (
    <Clickable onPress={handlePress}>
      <SurfaceCard style={styles.standardCard}>
        <View style={styles.standardRow}>
          <Image source={{ uri: coachPhotoUrl }} style={styles.avatarMedium} />

          <View style={styles.standardContent}>
            <ThemedText style={styles.standardTitle} numberOfLines={1}>
              {booking.service}
            </ThemedText>
            <ThemedText style={[styles.standardSubtitle, { color: palette.muted }]} numberOfLines={1}>
              with {booking.coachName}
            </ThemedText>

            {booking.childName && (
              <View style={styles.childRow}>
                <Ionicons name="person" size={14} color={palette.tint} />
                <ThemedText style={[styles.childText, { color: palette.tint }]}>
                  {booking.childName}
                </ThemedText>
              </View>
            )}

            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={14} color={palette.muted} />
              <ThemedText style={[styles.dateText, { color: palette.muted }]}>
                {day} · {time}
              </ThemedText>
            </View>

            {booking.locationLabel ? (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={palette.tint} />
                <ThemedText style={[styles.locationText, { color: palette.tint }]} numberOfLines={1}>
                  {booking.locationLabel}
                </ThemedText>
              </View>
            ) : null}
          </View>

          <View style={styles.standardRight}>
            <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.09) }]}>
              <ThemedText style={[styles.statusText, { color: statusColor }]}>
                {booking.status}
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.muted} />
          </View>
        </View>
      </SurfaceCard>
    </Clickable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  avatarMedium: { width: 48, height: 48, borderRadius: Radii.xl },
  statusBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  statusText: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.3 },
  standardCard: { padding: Spacing.sm },
  standardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  standardContent: { flex: 1, gap: Spacing.micro },
  standardTitle: { ...Typography.subheading },
  standardSubtitle: { ...Typography.bodySmall },
  standardRight: { alignItems: 'flex-end', gap: Spacing.xxs },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  childText: { ...Typography.smallSemiBold },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  dateText: { ...Typography.caption },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  locationText: { ...Typography.smallSemiBold },
});
