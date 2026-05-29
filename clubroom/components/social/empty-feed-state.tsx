import { useTheme } from '@/hooks/useTheme';

import { EmptyFeedFiltered, EmptyFeedNoClubs } from './feed-filters-sections';
import type { EmptyFeedStateProps } from './feed-filters';

export function EmptyFeedState({ hasClubs, filter, isCoach }: EmptyFeedStateProps) {
  const { colors: palette } = useTheme();

  if (!hasClubs) {
    return <EmptyFeedNoClubs isCoach={isCoach} palette={palette} />;
  }

  return <EmptyFeedFiltered filter={filter} palette={palette} />;
}
