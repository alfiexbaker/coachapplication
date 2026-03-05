import React from 'react';

import { useTheme } from '@/hooks/useTheme';
import type { Club } from '@/constants/types';

import {
  FilterTabsContent,
  ClubPillRow,
  EmptyFeedNoClubs,
  EmptyFeedFiltered,
} from './feed-filters-sections';

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

// ─── Club Hub Card ──────────────────────────────────────────────

function ClubHubCardInner({ clubs }: ClubHubCardProps) {
  const { colors: palette } = useTheme();
  return <ClubPillRow clubs={clubs} palette={palette} />;
}

// ─── Empty Feed State ───────────────────────────────────────────

function EmptyFeedStateInner({ hasClubs, filter, isCoach }: EmptyFeedStateProps) {
  const { colors: palette } = useTheme();

  if (!hasClubs) {
    return <EmptyFeedNoClubs isCoach={isCoach} palette={palette} />;
  }

  return <EmptyFeedFiltered filter={filter} palette={palette} />;
}

// ─── Exports ────────────────────────────────────────────────────

export const FeedFilters = React.memo(FeedFiltersInner);
export const ClubHubCard = React.memo(ClubHubCardInner);
export const EmptyFeedState = React.memo(EmptyFeedStateInner);
export default FeedFilters;
