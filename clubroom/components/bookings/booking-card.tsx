import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { BookingSummary } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface BookingCardProps {
  booking: BookingSummary;
}

export function BookingCard({ booking }: BookingCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.row}>
        <Ionicons name="calendar" size={22} color={palette.tint} />
        <View style={styles.meta}>
          <ThemedText type="defaultSemiBold">{booking.service}</ThemedText>
          <ThemedText style={styles.subtitle}>with {booking.coachName}</ThemedText>
        </View>
        <View style={[styles.statusPill, { backgroundColor: `${palette.tint}12` }]}>
          <ThemedText style={[Typography.sm, styles.statusLabel]}>{booking.status}</ThemedText>
        </View>
      </View>
      <ThemedText style={styles.detail}>{new Date(booking.start).toLocaleString()}</ThemedText>
      <ThemedText style={styles.detail}>{booking.locationLabel}</ThemedText>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  meta: {
    flex: 1,
  },
  subtitle: {
    opacity: 0.7,
  },
  detail: {
    opacity: 0.8,
  },
  statusPill: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  statusLabel: {
    fontWeight: '600',
  },
});
