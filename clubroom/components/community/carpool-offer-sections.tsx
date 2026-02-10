/**
 * Extracted sub-components for CarpoolOfferCard.
 *
 * formatDate helper.
 * CompactCarpoolCard — list row variant.
 * CarpoolHeader — avatar + session name + driver + status.
 * CarpoolDetails — date, time, location, return trip rows.
 * CarpoolSeatsInfo — seats taken/available + pending badge.
 * CarpoolActions — action buttons / status banners.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/primitives/button';
import { Radii, Spacing, withAlpha } from '@/constants/theme';
import { scaleFont } from '@/utils/scale';
import type { ThemeColors } from '@/hooks/useTheme';
import type { CarpoolOffer } from '@/constants/types';
import { Row } from '@/components/primitives';

// ─── Helpers ────────────────────────────────────────────────────────────────

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function getStatusColor(offer: CarpoolOffer, palette: ThemeColors): string {
  if (offer.status === 'CANCELLED') return palette.error;
  if (offer.status === 'COMPLETED') return palette.muted;
  const seatsLeft = offer.seatsAvailable - offer.seatsTaken;
  if (seatsLeft === 0) return palette.warning;
  return palette.success;
}

export function getStatusText(offer: CarpoolOffer): string {
  if (offer.status === 'CANCELLED') return 'Cancelled';
  if (offer.status === 'COMPLETED') return 'Completed';
  const seatsLeft = offer.seatsAvailable - offer.seatsTaken;
  if (seatsLeft === 0) return 'Full';
  return `${seatsLeft} seat${seatsLeft !== 1 ? 's' : ''} left`;
}

// ─── CompactCarpoolCard ─────────────────────────────────────────────────────

interface CompactCarpoolCardProps {
  offer: CarpoolOffer;
  onPress?: () => void;
  palette: ThemeColors;
}

export const CompactCarpoolCard = memo(function CompactCarpoolCard({
  offer,
  onPress,
  palette,
}: CompactCarpoolCardProps) {
  const statusColor = getStatusColor(offer, palette);

  return (
    <SurfaceCard style={styles.compactCard} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
        <Ionicons name="car-outline" size={20} color={palette.tint} />
      </View>
      <View style={styles.compactContent}>
        <Row style={styles.compactHeader}>
          <ThemedText type="defaultSemiBold" style={styles.compactTitle} numberOfLines={1}>
            {offer.sessionName}
          </ThemedText>
          <View style={[styles.statusPill, { backgroundColor: withAlpha(statusColor, 0.09) }]}>
            <ThemedText style={[styles.statusText, { color: statusColor }]}>
              {getStatusText(offer)}
            </ThemedText>
          </View>
        </Row>
        <Row style={styles.compactDetails}>
          <Row style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={14} color={palette.muted} />
            <ThemedText style={[styles.detailText, { color: palette.muted }]}>
              {formatDate(offer.sessionDate)}
            </ThemedText>
          </Row>
          <Row style={styles.detailItem}>
            <Ionicons name="time-outline" size={14} color={palette.muted} />
            <ThemedText style={[styles.detailText, { color: palette.muted }]}>
              {offer.pickupTime}
            </ThemedText>
          </Row>
        </Row>
      </View>
      <Ionicons name="chevron-forward" size={20} color={palette.muted} />
    </SurfaceCard>
  );
});

// ─── CarpoolHeader ──────────────────────────────────────────────────────────

interface CarpoolHeaderProps {
  offer: CarpoolOffer;
  isOwnOffer: boolean;
  palette: ThemeColors;
}

export const CarpoolHeader = memo(function CarpoolHeader({
  offer,
  isOwnOffer,
  palette,
}: CarpoolHeaderProps) {
  const statusColor = getStatusColor(offer, palette);

  return (
    <Row style={styles.header}>
      <View style={[styles.avatarLarge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
        <Ionicons name="car" size={24} color={palette.tint} />
      </View>
      <View style={styles.headerInfo}>
        <ThemedText type="defaultSemiBold" style={styles.title}>
          {offer.sessionName}
        </ThemedText>
        <ThemedText style={[styles.driverName, { color: palette.muted }]}>
          Offered by {isOwnOffer ? 'you' : offer.parentName}
        </ThemedText>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.09) }]}>
        <ThemedText style={[styles.statusBadgeText, { color: statusColor }]}>
          {getStatusText(offer)}
        </ThemedText>
      </View>
    </Row>
  );
});

// ─── CarpoolDetails ─────────────────────────────────────────────────────────

interface CarpoolDetailsProps {
  offer: CarpoolOffer;
  palette: ThemeColors;
}

export const CarpoolDetails = memo(function CarpoolDetails({
  offer,
  palette,
}: CarpoolDetailsProps) {
  return (
    <View style={styles.detailsContainer}>
      <Row style={styles.detailRow}>
        <Ionicons name="calendar-outline" size={18} color={palette.icon} />
        <ThemedText style={styles.detailLabel}>{formatDate(offer.sessionDate)}</ThemedText>
      </Row>
      <Row style={styles.detailRow}>
        <Ionicons name="time-outline" size={18} color={palette.icon} />
        <ThemedText style={styles.detailLabel}>
          Pickup at {offer.pickupTime}
          {offer.returnOffered && offer.returnTime && ` - Return at ${offer.returnTime}`}
        </ThemedText>
      </Row>
      <Row style={styles.detailRow}>
        <Ionicons name="location-outline" size={18} color={palette.icon} />
        <ThemedText style={styles.detailLabel} numberOfLines={2}>
          {offer.pickupLocation}
        </ThemedText>
      </Row>
      {offer.returnOffered && (
        <Row style={styles.detailRow}>
          <Ionicons name="return-up-back-outline" size={18} color={palette.success} />
          <ThemedText style={[styles.detailLabel, { color: palette.success }]}>
            Return trip included
          </ThemedText>
        </Row>
      )}
    </View>
  );
});

// ─── CarpoolSeatsInfo ───────────────────────────────────────────────────────

interface CarpoolSeatsInfoProps {
  offer: CarpoolOffer;
  isOwnOffer: boolean;
  pendingRequests: number;
  palette: ThemeColors;
}

export const CarpoolSeatsInfo = memo(function CarpoolSeatsInfo({
  offer,
  isOwnOffer,
  pendingRequests,
  palette,
}: CarpoolSeatsInfoProps) {
  return (
    <Row style={[styles.seatsSection, { borderTopColor: palette.border }]}>
      <Row style={styles.seatsInfo}>
        <Ionicons name="people-outline" size={18} color={palette.icon} />
        <ThemedText style={styles.seatsText}>
          {offer.seatsTaken}/{offer.seatsAvailable} seats taken
        </ThemedText>
      </Row>
      {isOwnOffer && pendingRequests > 0 && (
        <View style={[styles.pendingBadge, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
          <ThemedText style={[styles.pendingText, { color: palette.warning }]}>
            {pendingRequests} pending
          </ThemedText>
        </View>
      )}
    </Row>
  );
});

// ─── CarpoolActions ─────────────────────────────────────────────────────────

interface CarpoolActionsProps {
  isOwnOffer: boolean;
  isFull: boolean;
  isActive: boolean;
  userRequestAccepted: boolean;
  hasUserRequested: boolean;
  onManageRequests?: () => void;
  onRequestSeat?: () => void;
  palette: ThemeColors;
}

export const CarpoolActions = memo(function CarpoolActions({
  isOwnOffer,
  isFull,
  isActive,
  userRequestAccepted,
  hasUserRequested,
  onManageRequests,
  onRequestSeat,
  palette,
}: CarpoolActionsProps) {
  if (isOwnOffer) {
    return (
      <View style={styles.actions}>
        <Button onPress={onManageRequests ?? (() => {})} variant="secondary" style={styles.actionButton}>
          <Row style={styles.buttonContent}>
            <Ionicons name="settings-outline" size={18} color={palette.text} />
            <ThemedText style={styles.buttonText}>Manage Requests</ThemedText>
          </Row>
        </Button>
      </View>
    );
  }

  if (userRequestAccepted) {
    return (
      <View style={styles.actions}>
        <Row style={[styles.confirmedBanner, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
          <Ionicons name="checkmark-circle" size={20} color={palette.success} />
          <ThemedText style={[styles.confirmedText, { color: palette.success }]}>
            Your seat is confirmed!
          </ThemedText>
        </Row>
      </View>
    );
  }

  if (hasUserRequested) {
    return (
      <View style={styles.actions}>
        <Row style={[styles.pendingBanner, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
          <Ionicons name="hourglass-outline" size={20} color={palette.warning} />
          <ThemedText style={[styles.pendingBannerText, { color: palette.warning }]}>
            Request pending
          </ThemedText>
        </Row>
      </View>
    );
  }

  if (!isFull && isActive) {
    return (
      <View style={styles.actions}>
        <Button onPress={onRequestSeat ?? (() => {})} style={styles.actionButton}>
          Request Seat
        </Button>
      </View>
    );
  }

  return null;
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  compactCard: {
    alignItems: 'center',
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: { flex: 1, gap: Spacing.xxs },
  compactHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  compactTitle: { flex: 1, fontSize: scaleFont(15) },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  statusText: { fontSize: scaleFont(11), fontWeight: '600' },
  compactDetails: { gap: Spacing.md },
  detailItem: { alignItems: 'center', gap: Spacing.xxs },
  detailText: { fontSize: scaleFont(12) },
  header: { alignItems: 'center', gap: Spacing.sm },
  avatarLarge: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1, gap: Spacing.micro },
  title: { fontSize: scaleFont(17), fontWeight: '700', letterSpacing: -0.2 },
  driverName: { fontSize: scaleFont(13) },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radii.sm },
  statusBadgeText: { fontSize: scaleFont(12), fontWeight: '600' },
  detailsContainer: { gap: Spacing.xs, marginTop: Spacing.xs },
  detailRow: { alignItems: 'flex-start', gap: Spacing.xs },
  detailLabel: { flex: 1, fontSize: scaleFont(14), lineHeight: scaleFont(20) },
  seatsSection: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    marginTop: Spacing.xs,
  },
  seatsInfo: { alignItems: 'center', gap: Spacing.xxs },
  seatsText: { fontSize: scaleFont(14), fontWeight: '500' },
  pendingBadge: { paddingHorizontal: 8, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  pendingText: { fontSize: scaleFont(12), fontWeight: '600' },
  actions: { marginTop: Spacing.xs },
  actionButton: { width: '100%' },
  buttonContent: { alignItems: 'center', gap: 8 },
  buttonText: { fontWeight: '600', fontSize: scaleFont(15) },
  confirmedBanner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  confirmedText: { fontWeight: '600', fontSize: scaleFont(14) },
  pendingBanner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  pendingBannerText: { fontWeight: '600', fontSize: scaleFont(14) },
});
