/**
 * RosterFilterChips — Horizontal scrollable status filter chips for the roster.
 *
 * Displays chip filters for All / Active / Paused / Graduated with counts.
 * Memoized to avoid re-renders from parent state changes.
 */

import { memo } from 'react';
import { StyleSheet, ScrollView } from 'react-native';

import { Chip } from '@/components/primitives/chip';
import { Spacing } from '@/constants/theme';
import type { RosterEntry } from '@/constants/types';

export type StatusFilter = 'ALL' | RosterEntry['status'];

interface RosterFilterChipsProps {
  statusFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  stats: {
    total: number;
    active: number;
    paused: number;
    graduated: number;
  };
}

const STATUS_FILTERS: {
  label: string;
  value: StatusFilter;
  statKey: keyof RosterFilterChipsProps['stats'];
}[] = [
  { label: 'All', value: 'ALL', statKey: 'total' },
  { label: 'Active', value: 'ACTIVE', statKey: 'active' },
  { label: 'Paused', value: 'PAUSED', statKey: 'paused' },
  { label: 'Graduated', value: 'GRADUATED', statKey: 'graduated' },
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
