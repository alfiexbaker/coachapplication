import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/primitives/button';
import { Colors, Radii, Spacing } from '@/constants/theme';
import type { CarpoolOffer } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { scaleFont } from '@/utils/scale';

interface CarpoolOfferCardProps {
  offer: CarpoolOffer;
  currentUserId: string;
  onPress?: () => void;
  onRequestSeat?: () => void;
  onManageRequests?: () => void;
  compact?: boolean;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function CarpoolOfferCardComponent({
  offer,
  currentUserId,
  onPress,
  onRequestSeat,
  onManageRequests,
  compact = false,
}: CarpoolOfferCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const isOwnOffer = offer.parentId === currentUserId;
  const seatsLeft = offer.seatsAvailable - offer.seatsTaken;
  const isFull = seatsLeft === 0;
  const pendingRequests = offer.requests.filter((r) => r.status === 'PENDING').length;
  const hasUserRequested = offer.requests.some(
    (r) => r.parentId === currentUserId && (r.status === 'PENDING' || r.status === 'ACCEPTED')
  );
  const userRequestAccepted = offer.requests.some(
    (r) => r.parentId === currentUserId && r.status === 'ACCEPTED'
  );

  const getStatusColor = () => {
    if (offer.status === 'CANCELLED') return palette.error;
    if (offer.status === 'COMPLETED') return palette.muted;
    if (isFull) return palette.warning;
    return palette.success;
  };

  const getStatusText = () => {
    if (offer.status === 'CANCELLED') return 'Cancelled';
    if (offer.status === 'COMPLETED') return 'Completed';
    if (isFull) return 'Full';
    return `${seatsLeft} seat${seatsLeft !== 1 ? 's' : ''} left`;
  };

  if (compact) {
    return (
      <SurfaceCard style={styles.compactCard} onPress={onPress}>
        <View style={[styles.iconContainer, { backgroundColor: `${palette.tint}15` }]}>
          <Ionicons name="car-outline" size={20} color={palette.tint} />
        </View>
        <View style={styles.compactContent}>
          <View style={styles.compactHeader}>
            <ThemedText type="defaultSemiBold" style={styles.compactTitle} numberOfLines={1}>
              {offer.sessionName}
            </ThemedText>
            <View style={[styles.statusPill, { backgroundColor: `${getStatusColor()}15` }]}>
              <ThemedText style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
              </ThemedText>
            </View>
          </View>
          <View style={styles.compactDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={14} color={palette.muted} />
              <ThemedText style={[styles.detailText, { color: palette.muted }]}>
                {formatDate(offer.sessionDate)}
              </ThemedText>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={14} color={palette.muted} />
              <ThemedText style={[styles.detailText, { color: palette.muted }]}>
                {offer.pickupTime}
              </ThemedText>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard style={styles.card} onPress={onPress}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatarLarge, { backgroundColor: `${palette.tint}15` }]}>
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
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}15` }]}>
          <ThemedText style={[styles.statusBadgeText, { color: getStatusColor() }]}>
            {getStatusText()}
          </ThemedText>
        </View>
      </View>

      {/* Details */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={18} color={palette.icon} />
          <ThemedText style={styles.detailLabel}>{formatDate(offer.sessionDate)}</ThemedText>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={18} color={palette.icon} />
          <ThemedText style={styles.detailLabel}>
            Pickup at {offer.pickupTime}
            {offer.returnOffered && offer.returnTime && ` - Return at ${offer.returnTime}`}
          </ThemedText>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={18} color={palette.icon} />
          <ThemedText style={styles.detailLabel} numberOfLines={2}>
            {offer.pickupLocation}
          </ThemedText>
        </View>
        {offer.returnOffered && (
          <View style={styles.detailRow}>
            <Ionicons name="return-up-back-outline" size={18} color={palette.success} />
            <ThemedText style={[styles.detailLabel, { color: palette.success }]}>
              Return trip included
            </ThemedText>
          </View>
        )}
      </View>

      {/* Notes */}
      {offer.notes && (
        <View style={[styles.notesSection, { backgroundColor: palette.surfaceSecondary }]}>
          <ThemedText style={[styles.notesText, { color: palette.muted }]}>
            {offer.notes}
          </ThemedText>
        </View>
      )}

      {/* Seats Info */}
      <View style={[styles.seatsSection, { borderTopColor: palette.border }]}>
        <View style={styles.seatsInfo}>
          <Ionicons name="people-outline" size={18} color={palette.icon} />
          <ThemedText style={styles.seatsText}>
            {offer.seatsTaken}/{offer.seatsAvailable} seats taken
          </ThemedText>
        </View>
        {isOwnOffer && pendingRequests > 0 && (
          <View style={[styles.pendingBadge, { backgroundColor: `${palette.warning}15` }]}>
            <ThemedText style={[styles.pendingText, { color: palette.warning }]}>
              {pendingRequests} pending
            </ThemedText>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {isOwnOffer ? (
          <Button
            onPress={onManageRequests}
            variant="secondary"
            style={styles.actionButton}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="settings-outline" size={18} color={palette.text} />
              <ThemedText style={styles.buttonText}>Manage Requests</ThemedText>
            </View>
          </Button>
        ) : userRequestAccepted ? (
          <View style={[styles.confirmedBanner, { backgroundColor: `${palette.success}15` }]}>
            <Ionicons name="checkmark-circle" size={20} color={palette.success} />
            <ThemedText style={[styles.confirmedText, { color: palette.success }]}>
              Your seat is confirmed!
            </ThemedText>
          </View>
        ) : hasUserRequested ? (
          <View style={[styles.pendingBanner, { backgroundColor: `${palette.warning}15` }]}>
            <Ionicons name="hourglass-outline" size={20} color={palette.warning} />
            <ThemedText style={[styles.pendingBannerText, { color: palette.warning }]}>
              Request pending
            </ThemedText>
          </View>
        ) : !isFull && offer.status === 'ACTIVE' ? (
          <Button
            onPress={onRequestSeat}
            style={styles.actionButton}
          >
            Request Seat
          </Button>
        ) : null}
      </View>
    </SurfaceCard>
  );
}

export const CarpoolOfferCard = memo(CarpoolOfferCardComponent);

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: scaleFont(17),
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  driverName: {
    fontSize: scaleFont(13),
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.sm,
  },
  statusBadgeText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
  },
  detailsContainer: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  detailLabel: {
    flex: 1,
    fontSize: scaleFont(14),
    lineHeight: scaleFont(20),
  },
  notesSection: {
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  notesText: {
    fontSize: scaleFont(13),
    lineHeight: scaleFont(19),
    fontStyle: 'italic',
  },
  seatsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    marginTop: Spacing.xs,
  },
  seatsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  seatsText: {
    fontSize: scaleFont(14),
    fontWeight: '500',
  },
  pendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  pendingText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
  },
  actions: {
    marginTop: Spacing.xs,
  },
  actionButton: {
    width: '100%',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: scaleFont(15),
  },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  confirmedText: {
    fontWeight: '600',
    fontSize: scaleFont(14),
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  pendingBannerText: {
    fontWeight: '600',
    fontSize: scaleFont(14),
  },

  // Compact styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContent: {
    flex: 1,
    gap: 4,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  compactTitle: {
    flex: 1,
    fontSize: scaleFont(15),
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
  },
  statusText: {
    fontSize: scaleFont(11),
    fontWeight: '600',
  },
  compactDetails: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: scaleFont(12),
  },
});
