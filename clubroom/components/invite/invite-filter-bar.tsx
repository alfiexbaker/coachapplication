/**
 * InviteFilterBar — View mode toggle + status filter chips for invites list.
 */

import React, { memo } from 'react';
import { StyleSheet } from 'react-native';

import { Chip } from '@/components/primitives/chip';
import { Row } from '@/components/primitives';
import { Spacing } from '@/constants/theme';

type ViewMode = 'sent' | 'received';
type FilterMode = 'all' | 'pending' | 'responded';

interface InviteModeToggleProps {
  mode: ViewMode;
  onChangeMode: (mode: ViewMode) => void;
}

interface InviteStatusFilterProps {
  filter: FilterMode;
  pendingCount: number;
  onChangeFilter: (filter: FilterMode) => void;
}

export const InviteModeToggle = memo(function InviteModeToggle({
  mode,
  onChangeMode,
}: InviteModeToggleProps) {
  return (
    <Row gap="xs" paddingH="lg" style={styles.row}>
      <Chip
        label="Sent Invites"
        selected={mode === 'sent'}
        onPress={() => onChangeMode('sent')}
      />
      <Chip
        label="Received"
        selected={mode === 'received'}
        onPress={() => onChangeMode('received')}
      />
    </Row>
  );
});

export const InviteStatusFilter = memo(function InviteStatusFilter({
  filter,
  pendingCount,
  onChangeFilter,
}: InviteStatusFilterProps) {
  return (
    <Row gap="xs" paddingH="lg" style={styles.row}>
      <Chip
        label="All"
        selected={filter === 'all'}
        onPress={() => onChangeFilter('all')}
      />
      <Chip
        label={`Pending (${pendingCount})`}
        selected={filter === 'pending'}
        onPress={() => onChangeFilter('pending')}
      />
      <Chip
        label="Responded"
        selected={filter === 'responded'}
        onPress={() => onChangeFilter('responded')}
      />
    </Row>
  );
});

const styles = StyleSheet.create({
  row: {
    paddingBottom: Spacing.md,
  },
});
