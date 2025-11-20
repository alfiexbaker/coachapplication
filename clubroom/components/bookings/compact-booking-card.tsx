import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BookingSummary } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CompactBookingCard');

type CompactBookingCardProps = {
  booking: BookingSummary;
};

export function CompactBookingCard({ booking }: CompactBookingCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  logger.debug('CompactBookingCard rendering', {
    bookingId: booking.id,
    service: booking.service,
    coachName: booking.coachName,
    status: booking.status
  });

  const getStatusColor = () => {
    switch (booking.status) {
      case 'Confirmed':
        return '#10B981'; // green
      case 'Pending':
        return '#F59E0B'; // orange
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
  const coachPhotoUrl = (booking as any).coach?.photoUrl || 'https://i.pravatar.cc/100';

  const handlePress = () => {
    const route = `/bookings/${booking.id}`;
    logger.press('BookingCard', {
      bookingId: booking.id,
      route,
      coachName: booking.coachName,
      service: booking.service
    });
    console.log('🔵 [CompactBookingCard] CLICKED - Navigating to:', route);
    router.push(route);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
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
    gap: Spacing.xs,
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
