import React, { memo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { CarpoolOffer } from '@/constants/types';
import { Row } from '@/components/primitives';
import { getCarpoolOfferParentLabel, getCarpoolSessionLabel } from '@/utils/carpool-display';

import { formatDate, getStatusColor, getStatusText } from './carpool-offer-helpers';
import { styles } from './carpool-offer-styles';

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
            {getCarpoolSessionLabel(offer)}
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
          {getCarpoolSessionLabel(offer)}
        </ThemedText>
        <ThemedText style={[styles.driverName, { color: palette.muted }]}>
          Offered by {isOwnOffer ? 'you' : getCarpoolOfferParentLabel(offer)}
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
