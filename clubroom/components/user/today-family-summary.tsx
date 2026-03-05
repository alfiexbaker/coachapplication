/**
 * TodayFamilySummary — Merged upcoming sessions for multi-child parents in "All" mode.
 * Shows deduplicated booking rows with color-coded child names.
 */
import { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, Radii, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { getBookingClubOwnershipContext } from '@/utils/booking-display';
import { formatTime } from '@/utils/format';
import type { Booking } from '@/constants/app-types';
import type { FamilyBookingRow } from '@/types/family-booking';

interface TodayFamilySummaryProps {
  rows: FamilyBookingRow[];
}

function buildChildLabel(row: FamilyBookingRow): string {
  return row.children.map((c) => c.name).join(' + ');
}

function buildAccessibilityLabel(row: FamilyBookingRow): string {
  const names = buildChildLabel(row);
  const service = row.booking.coachName || 'Session';
  const time = formatTime(row.booking.scheduledAt);
  return names ? `${names}: ${service} at ${time}` : `${service} at ${time}`;
}

export const TodayFamilySummary = memo(function TodayFamilySummary({
  rows,
}: TodayFamilySummaryProps) {
  const { colors: palette } = useTheme();

  const handleRowPress = useCallback((booking: Booking) => {
    router.push(Routes.booking(booking.id, { returnTo: Routes.HOME as string }) as Href);
  }, []);

  if (rows.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ThemedText type="heading">Upcoming Sessions</ThemedText>
        <ThemedText style={[styles.mutedText, { color: palette.muted }]}>
          No upcoming sessions
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText type="heading">Upcoming Sessions</ThemedText>
      {rows.map((row) => {
        const ownershipContext = getBookingClubOwnershipContext(row.booking);
        return (
          <SurfaceCard
            key={row.booking.id}
            onPress={() => handleRowPress(row.booking)}
            accessibilityLabel={buildAccessibilityLabel(row)}
          >
            {ownershipContext ? (
              <View
                style={[
                  styles.ownershipBlock,
                  {
                    backgroundColor: withAlpha(palette.info, 0.08),
                    borderColor: withAlpha(palette.info, 0.22),
                  },
                ]}
              >
                <Row gap="xxs" align="center">
                  <Ionicons name="business-outline" size={12} color={palette.info} />
                  <ThemedText style={[styles.ownershipLabel, { color: palette.info }]}>
                    {ownershipContext.clubLabel}
                  </ThemedText>
                </Row>
                <ThemedText style={[styles.mutedText, { color: palette.text }]} numberOfLines={1}>
                  Delivered by {ownershipContext.deliveredBy}
                </ThemedText>
                {ownershipContext.owner ? (
                  <ThemedText style={[styles.mutedText, { color: palette.muted }]} numberOfLines={1}>
                    Owner {ownershipContext.owner}
                  </ThemedText>
                ) : null}
              </View>
            ) : null}
            <Row align="center" gap="sm">
              {row.children.length > 0 && (
                <Row gap="micro" align="center">
                  {row.children.map((child) => (
                    <View
                      key={child.id}
                      style={[styles.colorDot, { backgroundColor: child.colorCode }]}
                    />
                  ))}
                </Row>
              )}
              <View style={styles.bookingInfo}>
                {row.children.length > 0 && (
                  <ThemedText
                    style={[styles.childName, { color: row.children[0]?.colorCode }]}
                    numberOfLines={1}
                  >
                    {buildChildLabel(row)}
                  </ThemedText>
                )}
                <ThemedText style={[styles.mutedText, { color: palette.muted }]} numberOfLines={1}>
                  {row.booking.coachName || 'Session'}
                </ThemedText>
              </View>
              <ThemedText style={styles.timeText}>
                {formatTime(row.booking.scheduledAt)}
              </ThemedText>
              <Ionicons name="chevron-forward" size={16} color={palette.icon} />
            </Row>
          </SurfaceCard>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  emptyContainer: { gap: Spacing.xs },
  colorDot: { width: 8, height: 8, borderRadius: Radii.xs },
  bookingInfo: { flex: 1, minWidth: 0, gap: Spacing.micro },
  childName: { ...Typography.bodySmallSemiBold },
  mutedText: { ...Typography.bodySmall },
  timeText: { ...Typography.bodySmallSemiBold },
  ownershipBlock: {
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    gap: Spacing.micro,
  },
  ownershipLabel: {
    ...Typography.micro,
    fontWeight: '700',
  },
});
