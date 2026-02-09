/**
 * Series Booking Group
 *
 * Collapsible card that groups bookings belonging to the same series.
 * Collapsed: "8 weeks with Coach X, next: Tue 18:00 @ Hyde Park"
 * Expanded: All weeks with date/time/location/status
 * Includes progress bar showing completed/total.
 */

import { useState, useCallback, memo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BookingSummary } from '@/constants/types';

interface SeriesBookingGroupProps {
  seriesId: string;
  bookings: BookingSummary[];
  coachName: string;
  onBookingPress?: (booking: BookingSummary) => void;
}

function getStatusColor(status: BookingSummary['status'], palette: ReturnType<typeof useTheme>['colors']): string {
  switch (status) {
    case 'Confirmed': return palette.success;
    case 'Pending': return palette.warning;
    case 'Completed': return palette.muted;
    case 'Cancelled': return palette.error;
    default: return palette.muted;
  }
}

function formatBookingDate(dateStr: string): { day: string; time: string } {
  const date = new Date(dateStr);
  return {
    day: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
    time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  };
}

const SeriesWeekRow = memo(function SeriesWeekRow({
  booking,
  index,
  total,
  palette,
  onPress,
}: {
  booking: BookingSummary;
  index: number;
  total: number;
  palette: ReturnType<typeof useTheme>['colors'];
  onPress?: (booking: BookingSummary) => void;
}) {
  const { day, time } = formatBookingDate(booking.start);
  const statusColor = getStatusColor(booking.status, palette);

  return (
    <Clickable
      onPress={() => onPress?.(booking)}
      style={[styles.weekRow, { borderBottomColor: index < total - 1 ? palette.border : 'transparent' }]}
    >
      <View style={styles.weekRowLeft}>
        <ThemedText style={[Typography.smallSemiBold, { color: palette.text }]}>
          {day}
        </ThemedText>
        <View style={styles.weekMeta}>
          <Ionicons name="time-outline" size={12} color={palette.muted} />
          <ThemedText style={[Typography.small, { color: palette.muted }]}>
            {time}
          </ThemedText>
        </View>
        {booking.locationLabel ? (
          <View style={styles.weekMeta}>
            <Ionicons name="location-outline" size={12} color={palette.tint} />
            <ThemedText style={[Typography.small, { color: palette.tint }]} numberOfLines={1}>
              {booking.locationLabel}
            </ThemedText>
          </View>
        ) : null}
      </View>
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
    </Clickable>
  );
});

export const SeriesBookingGroup = memo(function SeriesBookingGroup({
  seriesId,
  bookings,
  coachName,
  onBookingPress,
}: SeriesBookingGroupProps) {
  const { colors: palette } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setExpanded((prev) => !prev);
  }, []);

  // Sort bookings by date
  const sorted = [...bookings].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  const totalWeeks = sorted.length;
  const completedCount = sorted.filter((b) => b.status === 'Completed').length;
  const cancelledCount = sorted.filter((b) => b.status === 'Cancelled').length;
  const activeCount = totalWeeks - cancelledCount;
  const progress = activeCount > 0 ? completedCount / activeCount : 0;

  // Find next upcoming booking
  const now = new Date();
  const nextBooking = sorted.find(
    (b) => new Date(b.start) > now && b.status !== 'Cancelled'
  );

  const nextLabel = nextBooking
    ? (() => {
        const { day, time } = formatBookingDate(nextBooking.start);
        const loc = nextBooking.locationLabel ? ` @ ${nextBooking.locationLabel}` : '';
        return `Next: ${day} ${time}${loc}`;
      })()
    : 'All sessions complete';

  return (
    <SurfaceCard style={styles.card} onPress={toggleExpanded}>
      {/* Collapsed header - always visible */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.seriesBadge, { backgroundColor: withAlpha(palette.tint, 0.08) }]}>
            <ThemedText style={[Typography.smallSemiBold, { color: palette.tint }]}>
              {totalWeeks}w
            </ThemedText>
          </View>
          <View style={styles.headerText}>
            <ThemedText type="defaultSemiBold" numberOfLines={1}>
              {totalWeeks} weeks with {coachName}
            </ThemedText>
            <ThemedText style={[Typography.small, { color: palette.muted }]} numberOfLines={1}>
              {nextLabel}
            </ThemedText>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={palette.muted}
        />
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressTrack, { backgroundColor: withAlpha(palette.muted, 0.1) }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: palette.success,
                width: `${Math.round(progress * 100)}%`,
              },
            ]}
          />
        </View>
        <ThemedText style={[Typography.small, { color: palette.muted }]}>
          {completedCount}/{activeCount} completed
        </ThemedText>
      </View>

      {/* Expanded: all week rows */}
      {expanded && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.expandedContent}>
          {sorted.map((booking, index) => (
            <SeriesWeekRow
              key={booking.id}
              booking={booking}
              index={index}
              total={sorted.length}
              palette={palette}
              onPress={onBookingPress}
            />
          ))}
        </Animated.View>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  seriesBadge: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: Spacing.micro,
  },
  progressContainer: {
    gap: Spacing.xxs,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  expandedContent: {
    gap: 0,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  weekRowLeft: {
    flex: 1,
    gap: Spacing.micro,
  },
  weekMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
