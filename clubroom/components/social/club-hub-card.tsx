import { useTheme } from '@/hooks/useTheme';

import { ClubPillRow } from './feed-filters-sections';
import type { ClubHubCardProps } from './feed-filters';

export function ClubHubCard({ clubs }: ClubHubCardProps) {
  const { colors: palette } = useTheme();
  return <ClubPillRow clubs={clubs} palette={palette} />;
}
