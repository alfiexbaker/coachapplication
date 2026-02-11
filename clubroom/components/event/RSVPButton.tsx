import { useState, useCallback } from 'react';
import { View } from 'react-native';

import { eventService } from '@/services/event-service';
import type { RSVPStatus, ClubEvent, EventRSVP } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import {
  RSVPStatusBanner,
  CompactRSVPButton,
  FullRSVPButtonRow,
  CurrentRSVPStatus,
  styles,
} from './RSVPButton-sections';

interface RSVPButtonProps {
  event: ClubEvent;
  currentRSVP?: EventRSVP | null;
  onRSVP: (status: RSVPStatus) => Promise<void>;
  disabled?: boolean;
  compact?: boolean;
}

export function RSVPButton({
  event,
  currentRSVP,
  onRSVP,
  disabled = false,
  compact = false,
}: RSVPButtonProps) {
  const { colors: palette } = useTheme();

  const [loading, setLoading] = useState<RSVPStatus | null>(null);

  const isFull = eventService.isEventFull(event);
  const rsvpClosed = eventService.isRSVPClosed(event);
  const isDisabled = disabled || rsvpClosed || (isFull && currentRSVP?.status !== 'GOING');

  const handlePress = useCallback(
    async (status: RSVPStatus) => {
      if (isDisabled || loading) return;

      setLoading(status);
      try {
        await onRSVP(status);
      } finally {
        setLoading(null);
      }
    },
    [isDisabled, loading, onRSVP],
  );

  if (event.status === 'CANCELLED') {
    return <RSVPStatusBanner variant="cancelled" palette={palette} />;
  }

  if (rsvpClosed) {
    return <RSVPStatusBanner variant="closed" palette={palette} />;
  }

  if (compact) {
    return (
      <CompactRSVPButton
        currentRSVP={currentRSVP}
        loading={loading}
        isDisabled={isDisabled}
        onPress={handlePress}
        palette={palette}
      />
    );
  }

  return (
    <View style={styles.container}>
      {isFull && !currentRSVP && <RSVPStatusBanner variant="full" palette={palette} />}

      <FullRSVPButtonRow
        currentRSVP={currentRSVP}
        loading={loading}
        isDisabled={isDisabled}
        disabled={disabled}
        onPress={handlePress}
        palette={palette}
      />

      {currentRSVP && <CurrentRSVPStatus currentRSVP={currentRSVP} palette={palette} />}
    </View>
  );
}
