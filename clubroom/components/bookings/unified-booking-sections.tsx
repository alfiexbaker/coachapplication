/**
 * Extracted sub-components for UnifiedBookingCard.
 *
 * Helpers: formatBookingDateTime, getBookingStatusColor.
 * ExtendedBooking — extended booking interface.
 * CompactBookingCard — minimal single-row variant.
 * DetailedBookingCard — full info variant with all metadata.
 */

import React, { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { BookingSummary } from '@/constants/types';
import { formatPrice } from '@/constants/styles';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExtendedBooking extends BookingSummary {
  athleteId?: string;
  price?: number;
  duration?: number;
  notes?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatBookingDateTime(start: string) {
  const date = new Date(start);
  return {
    day: date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' }),
    time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    full: date.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  };
}

export function getBookingStatusColor(status: string, palette: ThemeColors): string {
  switch (status) {
    case 'Confirmed': return palette.success;
    case 'Pending': return palette.warning;
    case 'Completed': return palette.muted;
    default: return palette.muted;
  }
}

// ─── CompactBookingCard ──────────────────────────────────────────────────────

interface CompactBookingCardProps {
  booking: BookingSummary;
  coachPhotoUrl: string;
  statusColor: string;
  day: string;
  onPress: () => void;
  palette: ThemeColors;
}

export const CompactBookingCard = memo(function CompactBookingCard({
  booking,
  coachPhotoUrl,
  statusColor,
  day,
  onPress,
  palette,
}: CompactBookingCardProps) {
  return (
    <Clickable onPress={onPress}>
      <SurfaceCard style={styles.compactCard}>
        <View style={styles.compactRow}>
          <Image source={{ uri: coachPhotoUrl }} style={styles.avatarSmall} />
          <View style={styles.compactContent}>
            <ThemedText style={styles.compactTitle} numberOfLines={1}>
              {booking.service}
            </ThemedText>
            <ThemedText style={[styles.compactMeta, { color: palette.muted }]} numberOfLines={1}>
              {booking.coachName} · {day}
            </ThemedText>
            {booking.locationLabel ? (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={12} color={palette.tint} />
                <ThemedText style={[styles.compactLocation, { color: palette.tint }]} numberOfLines={1}>
                  {booking.locationLabel}
                </ThemedText>
              </View>
            ) : null}
          </View>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        </View>
      </SurfaceCard>
    </Clickable>
  );
});

// ─── DetailedBookingCard ─────────────────────────────────────────────────────

interface DetailedBookingCardProps {
  booking: BookingSummary;
  extendedBooking: ExtendedBooking;
  coachPhotoUrl: string;
  statusColor: string;
  full: string;
  time: string;
  isCoach: boolean;
  showActions: boolean;
  onPress: () => void;
  onAthletePress: () => void;
  onRatePress: () => void;
  palette: ThemeColors;
}

export const DetailedBookingCard = memo(function DetailedBookingCard({
  booking,
  extendedBooking,
  coachPhotoUrl,
  statusColor,
  full,
  time,
  isCoach,
  showActions,
  onPress,
  onAthletePress,
  onRatePress,
  palette,
}: DetailedBookingCardProps) {
  return (
    <Clickable onPress={onPress}>
      <SurfaceCard style={styles.detailedCard}>
        {/* Header */}
        <View style={styles.detailedHeader}>
          <Image source={{ uri: coachPhotoUrl }} style={styles.avatarMedium} />
          <View style={styles.detailedHeaderContent}>
            <ThemedText style={styles.detailedTitle}>{booking.service}</ThemedText>
            <ThemedText style={[styles.detailedSubtitle, { color: palette.muted }]}>
              with {booking.coachName}
            </ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.09) }]}>
            <ThemedText style={[styles.statusText, { color: statusColor }]}>
              {booking.status}
            </ThemedText>
          </View>
        </View>

        {/* Meta rows */}
        <View style={[styles.metaSection, { borderTopColor: palette.border }]}>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color={palette.muted} />
            <ThemedText style={styles.metaText}>{full}</ThemedText>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={16} color={palette.muted} />
            <ThemedText style={styles.metaText}>
              {time}{extendedBooking.duration ? ` (${extendedBooking.duration} mins)` : ''}
            </ThemedText>
          </View>
          {booking.locationLabel && (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={16} color={palette.tint} />
              <ThemedText style={[styles.metaText, { color: palette.tint, fontWeight: '600' }]}>
                {booking.locationLabel}
              </ThemedText>
            </View>
          )}
          {booking.childName && (
            <Clickable
              style={styles.metaRow}
              onPress={isCoach ? onAthletePress : undefined}
              disabled={!isCoach}
            >
              <Ionicons name="person-outline" size={16} color={palette.tint} />
              <ThemedText style={[styles.metaText, { color: palette.tint }]}>
                {booking.childName}
              </ThemedText>
              {isCoach && <Ionicons name="chevron-forward" size={14} color={palette.tint} />}
            </Clickable>
          )}
        </View>

        {/* Price */}
        {extendedBooking.price !== undefined && extendedBooking.price > 0 && (
          <View style={styles.priceRow}>
            <ThemedText style={styles.priceText}>
              {formatPrice(extendedBooking.price)}
            </ThemedText>
          </View>
        )}

        {/* Actions */}
        {showActions && booking.status === 'Completed' && (
          <View style={[styles.actionsRow, { borderTopColor: palette.border }]}>
            <Clickable
              style={[styles.actionButton, { borderColor: palette.tint }]}
              onPress={onRatePress}
            >
              <Ionicons name="star-outline" size={16} color={palette.tint} />
              <ThemedText style={[styles.actionText, { color: palette.tint }]}>
                Rate Session
              </ThemedText>
            </Clickable>
          </View>
        )}
      </SurfaceCard>
    </Clickable>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  avatarSmall: { width: 36, height: 36, borderRadius: Radii.xl },
  avatarMedium: { width: 48, height: 48, borderRadius: Radii.xl },
  statusDot: { width: 8, height: 8, borderRadius: Radii.xs },
  statusBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  statusText: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.3 },
  compactCard: { padding: Spacing.xs },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  compactContent: { flex: 1, gap: Spacing.micro },
  compactTitle: { ...Typography.bodySemiBold },
  compactMeta: { ...Typography.small },
  compactLocation: { ...Typography.caption, fontWeight: '600' },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  detailedCard: { padding: Spacing.sm, gap: Spacing.sm },
  detailedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailedHeaderContent: { flex: 1, gap: Spacing.micro },
  detailedTitle: { ...Typography.heading },
  detailedSubtitle: { ...Typography.bodySmall },
  metaSection: {
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: { ...Typography.bodySmall, flex: 1 },
  priceRow: { alignItems: 'flex-end' },
  priceText: { ...Typography.heading },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  actionText: { ...Typography.bodySmallSemiBold },
});
