import { Image, Pressable, StyleSheet, TouchableOpacity, View, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { BookingSummary } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CompactBookingCard');

type CompactBookingCardProps = {
  booking: BookingSummary;
};

interface ExtendedBooking extends BookingSummary {
  coach?: { photoUrl?: string };
  athleteId?: string;
}

export function CompactBookingCard({ booking }: CompactBookingCardProps) {
  const { currentUser } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const getStatusColor = () => {
    switch (booking.status) {
      case 'Confirmed':
        return palette.success;
      case 'Pending':
        return palette.warning;
      case 'Completed':
        return palette.muted;
      default:
        return palette.muted;
    }
  };

  const formatDateTime = () => {
    const date = new Date(booking.start);
    const day = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });
    return { day, time };
  };

  const { day, time } = formatDateTime();

  // Get coach photo from the extended booking data
  const extendedBooking = booking as ExtendedBooking;
  const coachPhotoUrl = extendedBooking.coach?.photoUrl || 'https://i.pravatar.cc/100';

  const handlePress = () => {
    logger.press('BookingCard', { bookingId: booking.id });
    router.push(`/bookings/${booking.id}`);
  };

  const handleAthleteClick = (e: { stopPropagation?: () => void }) => {
    e.stopPropagation?.();
    const athleteId = extendedBooking.athleteId;
    if (athleteId) {
      logger.press('AthleteLink', { athleteId });
      router.push(`/development/athlete/${athleteId}`);
    }
  };

  const isCoach = currentUser?.role === 'COACH';

  const CardContent = () => (
    <SurfaceCard style={styles.card}>
        <View style={styles.content}>
          {/* Coach Avatar */}
          <Image source={{ uri: coachPhotoUrl }} style={styles.avatar} />

          {/* Booking Info */}
          <View style={styles.info}>
            <ThemedText style={styles.sessionType} numberOfLines={1}>
              {booking.service}
            </ThemedText>
            <ThemedText style={styles.coachName} numberOfLines={1}>
              with {booking.coachName}
            </ThemedText>
            {booking.childName && (
              <Pressable
                onPress={isCoach ? handleAthleteClick : undefined}
                style={styles.childRow}
                disabled={!isCoach}
                accessibilityRole="button"
                accessibilityLabel={`View ${booking.childName}'s profile`}
              >
                <Ionicons name="person" size={14} color={palette.tint} />
                <ThemedText style={[
                  styles.childName,
                  { color: palette.tint },
                  isCoach && styles.clickableText
                ]} numberOfLines={1}>
                  For: {booking.childName}
                </ThemedText>
                {isCoach && <Ionicons name="arrow-forward" size={12} color={palette.tint} />}
              </Pressable>
            )}
            <View style={styles.dateTimeRow}>
              <Ionicons name="calendar-outline" size={14} color={palette.muted} />
              <ThemedText style={styles.dateTime}>
                {day} · {time}
              </ThemedText>
            </View>
          </View>

          {/* Status Badge & Chevron */}
          <View style={styles.right}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
              <ThemedText style={[styles.statusText, { color: getStatusColor() }]}>
                {booking.status}
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </View>
        </View>
      </SurfaceCard>
  );

  // Web uses View with onMouseUp (onClick doesn't work on RN View), Native uses TouchableOpacity
  if (Platform.OS === 'web') {
    return (
      <View
        onMouseUp={handlePress as any}
        style={[styles.touchable, { cursor: 'pointer' } as any]}
        accessibilityRole="button"
        accessibilityLabel={`${booking.service} with ${booking.coachName} on ${day}`}
      >
        <CardContent />
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={styles.touchable}
      accessibilityRole="button"
      accessibilityLabel={`${booking.service} with ${booking.coachName} on ${day}`}
    >
      <CardContent />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    // No styles needed, just for structure
  },
  card: {
    padding: Spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  sessionType: {
    fontSize: 16,
    fontWeight: '600',
  },
  coachName: {
    fontSize: 14,
    opacity: 0.7,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  childName: {
    fontSize: 13,
    fontWeight: '600',
  },
  clickableText: {
    textDecorationLine: 'underline',
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateTime: {
    fontSize: 12,
    opacity: 0.6,
  },
  right: {
    alignItems: 'flex-end',
    gap: Spacing.xs / 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
