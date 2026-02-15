import { memo } from 'react';

import type { SessionOffering } from '@/constants/types';
import { SessionOfferingCard as UnifiedSessionOfferingCard } from '@/components/sessions/session-offering-card';

interface SessionOfferingCardProps {
  offering: SessionOffering;
  onPress: (offering: SessionOffering) => void;
}

export const SessionOfferingCard = memo(function SessionOfferingCard({
  offering,
  onPress,
}: SessionOfferingCardProps) {
  return (
    <UnifiedSessionOfferingCard
      offering={offering}
      showCoach
      showCapacity
      onPress={() => onPress(offering)}
    />
  );
});
