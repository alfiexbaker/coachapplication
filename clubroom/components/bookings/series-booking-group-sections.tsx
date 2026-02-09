/**
 * Series Booking Group — Extracted sections
 *
 * Helpers and sub-components for SeriesBookingGroup.
 */

import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BookingSummary } from '@/constants/types';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getStatusColor(status: BookingSummary['status'], palette: ThemeColors): string {
  switch (status) {
    case 'Confirmed': return palette.success;
    case 'Pending': return palette.warning;
    case 'Completed': return palette.muted;
    case 'Cancelled': return palette.error;
    default: return palette.muted;
  }
}

export function formatBookingDate(dateStr: string): { day: string; time: string } {
  const date = new Date(dateStr);
  return {
    day: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
    time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  };
}

// ---------------------------------------------------------------------------
// SeriesWeekRow
// ---------------------------------------------------------------------------

export interface SeriesWeekRowProps {
  booking: BookingSummary;
  index: number;
  total: number;
  palette: ThemeColors;
  onPress?: (booking: BookingSummary) => void;
}

export const SeriesWeekRow = memo(function SeriesWeekRow({
  booking,
  index,
  total,
  palette,
  onPress,
}: SeriesWeekRowProps) {
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

const styles = StyleSheet.create({
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
