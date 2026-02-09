import type { ClubEvent } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import { CompactEventCard, FullEventCardContent } from './event-card-sections';

interface EventCardProps {
  event: ClubEvent;
  onPress?: () => void;
  compact?: boolean;
}

export function EventCard({ event, onPress, compact = false }: EventCardProps) {
  const { colors: palette } = useTheme();

  if (compact) {
    return <CompactEventCard event={event} onPress={onPress} palette={palette} />;
  }

  return <FullEventCardContent event={event} onPress={onPress} palette={palette} />;
}
