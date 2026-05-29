import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BookingSummary } from '@/constants/types';
import { Row } from '@/components/primitives';
import { formatBookingDate, getStatusColor } from './series-booking-group-helpers';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

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

export const SeriesWeekRow = function SeriesWeekRow({
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
      style={[
        styles.weekRow,
        { borderBottomColor: index < total - 1 ? palette.border : 'transparent' },
      ]}
    >
      <View style={styles.weekRowLeft}>
        <ThemedText style={[Typography.smallSemiBold, { color: palette.text }]}>{day}</ThemedText>
        <Row style={styles.weekMeta}>
          <Ionicons name="time-outline" size={12} color={palette.muted} />
          <ThemedText style={[Typography.small, { color: palette.muted }]}>{time}</ThemedText>
        </Row>
        {booking.locationLabel ? (
          <Row style={styles.weekMeta}>
            <Ionicons name="location-outline" size={12} color={palette.tint} />
            <ThemedText style={[Typography.small, { color: palette.tint }]} numberOfLines={1}>
              {booking.locationLabel}
            </ThemedText>
          </Row>
        ) : null}
      </View>
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
    </Clickable>
  );
};

const styles = StyleSheet.create({
  weekRow: {
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
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
});
