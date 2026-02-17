/**
 * RosterFilterChips — Horizontal scrollable status filter chips for the roster.
 *
 * Displays chip filters for All + each roster status with counts.
 * Memoized to avoid re-renders from parent state changes.
 */

import { memo } from 'react';
import { StyleSheet, ScrollView } from 'react-native';

import { Chip } from '@/components/primitives/chip';
import { Spacing } from '@/constants/theme';
import type { RosterEntry } from '@/constants/types';
import { ROSTER_STATUSES, rosterService } from '@/services/roster-service';

export type StatusFilter = 'ALL' | RosterEntry['status'];

interface RosterFilterChipsProps {
  statusFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  stats: Record<string, number>;
}

const STATUS_FILTERS: {
  label: string;
  value: StatusFilter;
  statKey: string;
}[] = [
  { label: 'All', value: 'ALL', statKey: 'total' },
  ...ROSTER_STATUSES.filter((s) => s !== 'INACTIVE').map((status) => ({
    label: rosterService.formatStatus(status),
    value: status as StatusFilter,
    statKey: status.toLowerCase(),
  })),
];

export const RosterFilterChips = memo(function RosterFilterChips({
  statusFilter,
  onFilterChange,
  stats,
}: RosterFilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {STATUS_FILTERS.map((filter) => (
        <Chip
          key={filter.value}
          label={`${filter.label} (${stats[filter.statKey]})`}
          selected={statusFilter === filter.value}
          onPress={() => onFilterChange(filter.value)}
          accessibilityLabel={`Filter by ${filter.label}, ${stats[filter.statKey]} athletes`}
        />
      ))}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
    paddingRight: Spacing.lg,
  },
});
