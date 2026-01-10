import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
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
  const statusMeta = getStatusMeta(booking.status, palette);
  const startDate = new Date(booking.start);
  const dateLabel = startDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeLabel = startDate.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  const renderRightActions = () => (
    <View style={styles.actionsContainer}>
      <Clickable
        onPress={() => console.log('Reschedule booking', booking.id)}
        style={[styles.actionButton, { backgroundColor: palette.tint }]}>
        <Ionicons name="refresh" size={18} color={scheme === 'light' ? '#FFFFFF' : '#000000'} />
        <ThemedText style={styles.actionLabel} lightColor="#FFFFFF" darkColor="#000000">Reschedule</ThemedText>
      </Clickable>
      <Clickable
        onPress={() => console.log('Cancel booking', booking.id)}
        style={[styles.actionButton, { backgroundColor: palette.error }]}>
        <Ionicons name="close" size={18} color="#FFFFFF" />
        <ThemedText style={styles.actionLabel} lightColor="#FFFFFF" darkColor="#FFFFFF">Cancel</ThemedText>
      </Clickable>
    </View>
  );

  return (
    <Swipeable renderRightActions={renderRightActions} friction={2}>
      <SurfaceCard
        style={styles.card}
        outlineGradient={[statusMeta.color, withAlpha(statusMeta.color, 0.4)]}
        onPress={() => console.log('Open booking detail', booking.id)}>
        <View style={styles.row}>
          <Ionicons name={statusMeta.icon} size={22} color={statusMeta.color} />
          <View style={styles.meta}>
            <ThemedText type="defaultSemiBold">{booking.service}</ThemedText>
            <ThemedText style={styles.subtitle}>with {booking.coachName}</ThemedText>
          </View>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: withAlpha(statusMeta.color, 0.12),
              },
            ]}>
            <ThemedText
              style={[Typography.sm, styles.statusLabel, { color: statusMeta.color }]}>
              {booking.status}
            </ThemedText>
          </View>
        </View>
        {/* Child Name Badge */}
        {booking.childName && (
          <View style={styles.childBadgeRow}>
            <View style={[styles.childBadge, { backgroundColor: palette.tint + '15' }]}>
              <Ionicons name="person" size={14} color={palette.tint} />
              <ThemedText style={[styles.childBadgeText, { color: palette.tint }]}>
                For: {booking.childName}
              </ThemedText>
            </View>
          </View>
        )}
        <View>
          <ThemedText style={[Typography.xl, styles.dateText]}>{dateLabel}</ThemedText>
          <ThemedText style={[Typography.lg, styles.timeText]}>{timeLabel}</ThemedText>
        </View>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color={palette.icon} />
          <ThemedText style={styles.locationText}>{booking.locationLabel}</ThemedText>
        </View>
      </SurfaceCard>
    </Swipeable>
  );
}

function getStatusMeta(status: BookingSummary['status'], palette: (typeof Colors)['light']) {
  switch (status) {
    case 'Pending':
      return { icon: 'alert-circle-outline', color: palette.warning } as const;
    case 'Completed':
      return { icon: 'checkmark-circle-outline', color: palette.success } as const;
    case 'Cancelled':
      return { icon: 'close-circle-outline', color: palette.error } as const;
    case 'Confirmed':
    default:
      return { icon: 'time-outline', color: palette.tint } as const;
  }
}

function withAlpha(hexColor: string, alpha: number) {
  const hex = hexColor.replace('#', '');
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  meta: {
    flex: 1,
  },
  subtitle: {
    opacity: 0.7,
  },
  statusPill: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
  },
  statusLabel: {
    fontWeight: '600',
  },
  dateText: {
    fontWeight: '600',
  },
  timeText: {
    opacity: 0.8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  locationText: {
    opacity: 0.85,
  },
  childBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  childBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs - 2,
    borderRadius: Radii.pill,
  },
  childBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    gap: Spacing.xs / 2,
  },
  actionLabel: {
    ...Typography.sm,
    fontWeight: '600',
  },
});
