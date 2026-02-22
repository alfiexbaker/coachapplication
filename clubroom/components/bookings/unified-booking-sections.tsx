/**
 * Extracted sub-components for UnifiedBookingCard.
 *
 * Helpers: formatBookingDateTime, getBookingStatusColor.
 * ExtendedBooking — extended booking interface.
 * CompactBookingCard — minimal single-row variant.
 * DetailedBookingCard — full info variant with all metadata.
 */

import React, { memo } from 'react';
import { Image, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { BookingSummary } from '@/constants/types';
import { formatPrice } from '@/constants/styles';
import { Row } from '@/components/primitives';
import { getBookingSummaryClientName, getBookingSummaryCoachName } from '@/utils/booking-display';
import { styles } from './unified-booking-styles';

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
    full: date.toLocaleDateString('en-GB', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
  };
}

export function getBookingStatusColor(status: string, palette: ThemeColors): string {
  switch (status) {
    case 'Confirmed':
      return palette.success;
    case 'Pending':
      return palette.warning;
    case 'Completed':
      return palette.muted;
    default:
      return palette.muted;
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
  const coachName = getBookingSummaryCoachName(booking);
  return (
    <Clickable onPress={onPress}>
      <SurfaceCard style={styles.compactCard}>
        <Row style={styles.compactRow}>
          <Image source={{ uri: coachPhotoUrl }} style={styles.avatarSmall} />
          <View style={styles.compactContent}>
            <ThemedText style={styles.compactTitle} numberOfLines={1}>
              {booking.service}
            </ThemedText>
            <ThemedText style={[styles.compactMeta, { color: palette.muted }]} numberOfLines={1}>
              {coachName} · {day}
            </ThemedText>
            {booking.locationLabel ? (
              <Row style={styles.locationRow}>
                <Ionicons name="location-outline" size={12} color={palette.tint} />
                <ThemedText
                  style={[styles.compactLocation, { color: palette.tint }]}
                  numberOfLines={1}
                >
                  {booking.locationLabel}
                </ThemedText>
              </Row>
            ) : null}
          </View>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        </Row>
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
  const coachName = getBookingSummaryCoachName(booking);
  const childName = getBookingSummaryClientName(booking);
  return (
    <Clickable onPress={onPress}>
      <SurfaceCard style={styles.detailedCard}>
        {/* Header */}
        <Row style={styles.detailedHeader}>
          <Image source={{ uri: coachPhotoUrl }} style={styles.avatarMedium} />
          <View style={styles.detailedHeaderContent}>
            <ThemedText style={styles.detailedTitle}>{booking.service}</ThemedText>
            <ThemedText style={[styles.detailedSubtitle, { color: palette.muted }]}>
              with {coachName}
            </ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.09) }]}>
            <ThemedText style={[styles.statusText, { color: statusColor }]}>
              {booking.status}
            </ThemedText>
          </View>
        </Row>

        {/* Meta rows */}
        <View style={[styles.metaSection, { borderTopColor: palette.border }]}>
          <Row style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color={palette.muted} />
            <ThemedText style={styles.metaText}>{full}</ThemedText>
          </Row>
          <Row style={styles.metaRow}>
            <Ionicons name="time-outline" size={16} color={palette.muted} />
            <ThemedText style={styles.metaText}>
              {time}
              {extendedBooking.duration ? ` (${extendedBooking.duration} mins)` : ''}
            </ThemedText>
          </Row>
          {booking.locationLabel && (
            <Row style={styles.metaRow}>
              <Ionicons name="location-outline" size={16} color={palette.tint} />
              <ThemedText style={[styles.metaText, { color: palette.tint, fontWeight: '600' }]}>
                {booking.locationLabel}
              </ThemedText>
            </Row>
          )}
          {childName && (
            <Clickable
              style={styles.metaRow}
              onPress={isCoach ? onAthletePress : undefined}
              disabled={!isCoach}
            >
              <Ionicons name="person-outline" size={16} color={palette.tint} />
              <ThemedText style={[styles.metaText, { color: palette.tint }]}>
                For: {childName}
              </ThemedText>
              {isCoach && <Ionicons name="chevron-forward" size={14} color={palette.tint} />}
            </Clickable>
          )}
        </View>

        {/* Price */}
        {extendedBooking.price !== undefined && extendedBooking.price > 0 && (
          <View style={styles.priceRow}>
            <ThemedText style={styles.priceText}>{formatPrice(extendedBooking.price)}</ThemedText>
          </View>
        )}

        {/* Actions */}
        {showActions && booking.status === 'Completed' && (
          <Row style={[styles.actionsRow, { borderTopColor: palette.border }]}>
            <Clickable
              style={[styles.actionButton, { borderColor: palette.tint }]}
              onPress={onRatePress}
            >
              <Ionicons name="star-outline" size={16} color={palette.tint} />
              <ThemedText style={[styles.actionText, { color: palette.tint }]}>
                Rate Session
              </ThemedText>
            </Clickable>
          </Row>
        )}
      </SurfaceCard>
    </Clickable>
  );
});
