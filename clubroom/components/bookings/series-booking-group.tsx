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
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BookingSummary } from '@/constants/types';

import { formatBookingDate, SeriesWeekRow } from './series-booking-group-sections';
import { Row } from '@/components/primitives';

// Re-export extracted components for backward compat
export { getStatusColor, formatBookingDate, SeriesWeekRow } from './series-booking-group-sections';
export type { SeriesWeekRowProps } from './series-booking-group-sections';

interface SeriesBookingGroupProps {
  seriesId: string;
  bookings: BookingSummary[];
  coachName: string;
  onBookingPress?: (booking: BookingSummary) => void;
}

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

  const sorted = [...bookings].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );

  const totalWeeks = sorted.length;
  const completedCount = sorted.filter((b) => b.status === 'Completed').length;
  const cancelledCount = sorted.filter((b) => b.status === 'Cancelled').length;
  const activeCount = totalWeeks - cancelledCount;
  const progress = activeCount > 0 ? completedCount / activeCount : 0;

  const now = new Date();
  const nextBooking = sorted.find((b) => new Date(b.start) > now && b.status !== 'Cancelled');

  const nextLabel = nextBooking
    ? (() => {
        const { day, time } = formatBookingDate(nextBooking.start);
        const loc = nextBooking.locationLabel ? ` @ ${nextBooking.locationLabel}` : '';
        return `Next: ${day} ${time}${loc}`;
      })()
    : 'All sessions complete';

  return (
    <SurfaceCard style={styles.card} onPress={toggleExpanded}>
      <Row style={styles.header}>
        <Row style={styles.headerLeft}>
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
        </Row>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={palette.muted} />
      </Row>

      <View style={styles.progressContainer}>
        <View style={[styles.progressTrack, { backgroundColor: withAlpha(palette.muted, 0.1) }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: palette.success, width: `${Math.round(progress * 100)}%` },
            ]}
          />
        </View>
        <ThemedText style={[Typography.small, { color: palette.muted }]}>
          {completedCount}/{activeCount} completed
        </ThemedText>
      </View>

      {expanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={styles.expandedContent}
        >
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
  card: { gap: Spacing.sm },
  header: { alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flex: 1, alignItems: 'center', gap: Spacing.sm },
  seriesBadge: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: Spacing.micro },
  progressContainer: { gap: Spacing.xxs },
  progressTrack: { height: 4, borderRadius: Radii.xs, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radii.xs },
  expandedContent: { gap: 0 },
});
