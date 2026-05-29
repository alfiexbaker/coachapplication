import React from 'react';

import { useTheme } from '@/hooks/useTheme';
import type { Club } from '@/constants/types';

import { FilterTabsContent } from './feed-filters-sections';

// ─── Types ──────────────────────────────────────────────────────

export type FeedFilter =
  | 'all'
  | 'announcement'
  | 'photo'
  | 'video'
  | 'event'
  | 'achievement'
  | 'session_announcement';

export interface FeedFiltersProps {
  activeFilter: FeedFilter;
  onFilterChange: (filter: FeedFilter) => void;
}

export interface ClubHubCardProps {
  clubs: Club[];
}

export interface EmptyFeedStateProps {
  hasClubs: boolean;
  filter: FeedFilter;
  isCoach: boolean;
}

// ─── Filter Tabs ────────────────────────────────────────────────

function FeedFiltersInner({ activeFilter, onFilterChange }: FeedFiltersProps) {
  const { colors: palette } = useTheme();
  return (
    <FilterTabsContent
      activeFilter={activeFilter}
      onFilterChange={onFilterChange}
      palette={palette}
    />
  );
}

// ─── Exports ────────────────────────────────────────────────────

export const FeedFilters = FeedFiltersInner;
export { ClubHubCard } from './club-hub-card';
export { EmptyFeedState } from './empty-feed-state';
export default FeedFilters;
