import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { StatusBadge } from '@/components/booking/status-badge';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { upcomingBookings } from '@/constants/mock-data';
import { EmptyState } from '@/components/ui/empty-state';

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const booking = useMemo(() => upcomingBookings.find((b) => b.id === id), [id]);

  if (!booking) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
        <EmptyState
          icon="warning"
          title="Booking not found"
          message="Double-check the link or pick a booking from the list."
          actionLabel="Back to bookings"
          onPressAction={() => history.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, gap: 6 }}>
            <ThemedText type="title">{booking.service}</ThemedText>
            <ThemedText style={{ color: palette.muted }}>{booking.locationLabel}</ThemedText>
          </View>
          <StatusBadge status={booking.status as any} />
        </View>

        <SurfaceCard style={styles.card}>
          <InfoRow icon="person" label="Coach" value={booking.coachName} />
          <InfoRow icon="calendar" label="Date" value={new Date(booking.start).toLocaleString()} />
          <InfoRow icon="navigate" label="Directions" value="Launch maps" actionLabel="Open" />
          <InfoRow icon="card" label="Payment" value="£65 (mock)" />
        </SurfaceCard>

        <SurfaceCard style={styles.card}>
          <ThemedText type="defaultSemiBold">Actions</ThemedText>
          <View style={styles.actionRow}>
            <Clickable style={styles.actionButton} onPress={() => {}}>
              <Ionicons name="chatbubbles" size={18} color={palette.tint} />
              <ThemedText style={[styles.actionLabel, { color: palette.tint }]}>Message coach</ThemedText>
            </Clickable>
            <Clickable style={[styles.actionButton, { backgroundColor: `${palette.error}10` }]} onPress={() => {}}>
              <Ionicons name="close-circle" size={18} color={palette.error} />
              <ThemedText style={[styles.actionLabel, { color: palette.error }]}>Cancel</ThemedText>
            </Clickable>
          </View>
        </SurfaceCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  actionLabel,
}: {
  icon: string;
  label: string;
  value: string;
  actionLabel?: string;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon as any} size={18} color={palette.icon} />
        <View style={{ gap: 2 }}>
          <ThemedText type="defaultSemiBold">{label}</ThemedText>
          <ThemedText style={{ color: palette.muted }}>{value}</ThemedText>
        </View>
      </View>
      {actionLabel ? (
        <Clickable style={styles.linkPill} onPress={() => {}}>
          <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>{actionLabel}</ThemedText>
        </Clickable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  card: {
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  infoLeft: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  linkPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    backgroundColor: '#f1f5f9',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionLabel: {
    fontWeight: '700',
  },
});

