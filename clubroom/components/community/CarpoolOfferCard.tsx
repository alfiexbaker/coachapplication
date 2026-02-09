import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { CarpoolOffer } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import {
  CompactCarpoolCard,
  CarpoolHeader,
  CarpoolDetails,
  CarpoolSeatsInfo,
  CarpoolActions,
} from './carpool-offer-sections';

interface CarpoolOfferCardProps {
  offer: CarpoolOffer;
  currentUserId: string;
  onPress?: () => void;
  onRequestSeat?: () => void;
  onManageRequests?: () => void;
  compact?: boolean;
}

function CarpoolOfferCardComponent({
  offer,
  currentUserId,
  onPress,
  onRequestSeat,
  onManageRequests,
  compact = false,
}: CarpoolOfferCardProps) {
  const { colors: palette } = useTheme();

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

  if (compact) {
    return <CompactCarpoolCard offer={offer} onPress={onPress} palette={palette} />;
  }

  return (
    <SurfaceCard style={styles.card} onPress={onPress}>
      <CarpoolHeader offer={offer} isOwnOffer={isOwnOffer} palette={palette} />
      <CarpoolDetails offer={offer} palette={palette} />

      {offer.notes && (
        <View style={[styles.notesSection, { backgroundColor: palette.surfaceSecondary }]}>
          <ThemedText style={[styles.notesText, { color: palette.muted }]}>
            {offer.notes}
          </ThemedText>
        </View>
      )}

      <CarpoolSeatsInfo
        offer={offer}
        isOwnOffer={isOwnOffer}
        pendingRequests={pendingRequests}
        palette={palette}
      />

      <CarpoolActions
        isOwnOffer={isOwnOffer}
        isFull={isFull}
        isActive={offer.status === 'ACTIVE'}
        userRequestAccepted={userRequestAccepted}
        hasUserRequested={hasUserRequested}
        onManageRequests={onManageRequests}
        onRequestSeat={onRequestSeat}
        palette={palette}
      />
    </SurfaceCard>
  );
}

export const CarpoolOfferCard = memo(CarpoolOfferCardComponent);

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.md, gap: Spacing.sm },
  notesSection: { padding: Spacing.sm, borderRadius: 8 },
  notesText: { fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
});
