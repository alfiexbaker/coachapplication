import { SurfaceCard } from '@/components/primitives/surface-card';
import { withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CounterOffer } from '@/constants/types';
import { AcceptRejectButtons } from './AcceptRejectButtons';

import {
  getStatusConfig,
  OfferHeader,
  TimeChangeDisplay,
  OfferMessage,
  RejectionReason,
  ExpiryTimer,
  styles,
} from './counter-offer-card-sections';

interface CounterOfferCardProps {
  offer: CounterOffer;
  isActionable: boolean;
  onAccept?: (offerId: string) => void;
  onReject?: (offerId: string) => void;
  onCounterPropose?: (offerId: string) => void;
  isLoading?: boolean;
}

export function CounterOfferCard({
  offer,
  isActionable,
  onAccept,
  onReject,
  onCounterPropose,
  isLoading = false,
}: CounterOfferCardProps) {
  const { colors: palette } = useTheme();
  const statusConfig = getStatusConfig(offer.status, palette);
  const isPending = offer.status === 'PENDING';

  return (
    <SurfaceCard
      style={styles.card}
      outlineGradient={
        isPending
          ? [palette.warning, withAlpha(palette.warning, 0.25)]
          : [palette.border, palette.border]
      }
    >
      <OfferHeader
        proposerName={offer.proposerId}
        proposedBy={offer.proposedBy}
        status={offer.status}
        palette={palette}
      />

      <TimeChangeDisplay
        originalTime={offer.originalTime}
        proposedTime={offer.proposedTime}
        palette={palette}
      />

      {offer.message && (
        <OfferMessage message={offer.message} palette={palette} />
      )}

      {offer.status === 'REJECTED' && offer.rejectionReason && (
        <RejectionReason reason={offer.rejectionReason} palette={palette} />
      )}

      {isPending && (
        <ExpiryTimer expiresAt={offer.expiresAt} palette={palette} />
      )}

      {isActionable && isPending && (
        <AcceptRejectButtons
          onAccept={() => onAccept?.(offer.id)}
          onReject={() => onReject?.(offer.id)}
          onCounterPropose={onCounterPropose ? () => onCounterPropose(offer.id) : undefined}
          isLoading={isLoading}
        />
      )}
    </SurfaceCard>
  );
}
