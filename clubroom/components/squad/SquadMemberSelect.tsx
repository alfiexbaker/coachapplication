/**
 * Squad Member Select Component
 *
 * Multi-select component for choosing squad members to invite.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';

import { Spacing } from '@/constants/theme';
import { createLogger } from '@/utils/logger';
import {
  inviteService as squadBulkInviteService,
  type SquadMemberWithSelection,
} from '@/services/invite';
import { useTheme } from '@/hooks/useTheme';
import {
  SelectAllHeader,
  NotificationBanner,
  MemberCard,
  MemberSelectLoading,
  MemberSelectError,
  MemberSelectEmpty,
} from './squad-member-select-sections';

const logger = createLogger('SquadMemberSelect');

interface SquadMemberSelectProps {
  squadId: string;
  sessionId?: string;
  selectedMemberIds: string[];
  onSelectionChange: (memberIds: string[]) => void;
  onParentCountChange?: (count: number) => void;
  showSelectAll?: boolean;
  showNotificationCount?: boolean;
  maxHeight?: number;
  disabled?: boolean;
}

export function SquadMemberSelect({
  squadId,
  sessionId,
  selectedMemberIds,
  onSelectionChange,
  onParentCountChange,
  showSelectAll = true,
  showNotificationCount = true,
  maxHeight = 400,
  disabled = false,
}: SquadMemberSelectProps) {
  const { colors: palette } = useTheme();

  const [members, setMembers] = useState<SquadMemberWithSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await squadBulkInviteService.getSquadMembersWithMetadata(squadId, sessionId);
      setMembers(data);
    } catch (err) {
      logger.error('Failed to load squad members', err);
      setError('Failed to load squad members');
    } finally {
      setLoading(false);
    }
  }, [squadId, sessionId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const toggleMember = useCallback(
    (memberId: string) => {
      if (disabled) return;
      const newSelection = selectedMemberIds.includes(memberId)
        ? selectedMemberIds.filter((id) => id !== memberId)
        : [...selectedMemberIds, memberId];
      onSelectionChange(newSelection);
    },
    [selectedMemberIds, onSelectionChange, disabled]
  );

  const selectAll = useCallback(() => {
    if (disabled) return;
    const allIds = members.filter((m) => !m.hasPendingInvite).map((m) => m.id);
    onSelectionChange(allIds);
  }, [members, onSelectionChange, disabled]);

  const selectNone = useCallback(() => {
    if (disabled) return;
    onSelectionChange([]);
  }, [onSelectionChange, disabled]);

  const uniqueParentCount = useMemo(() => {
    const selectedMembers = members.filter((m) => selectedMemberIds.includes(m.id));
    const uniqueParents = new Set(selectedMembers.map((m) => m.parentId));
    return uniqueParents.size;
  }, [members, selectedMemberIds]);

  useEffect(() => {
    onParentCountChange?.(uniqueParentCount);
  }, [uniqueParentCount, onParentCountChange]);

  const selectedCount = selectedMemberIds.length;
  const allSelected = selectedCount > 0 && selectedCount === members.filter((m) => !m.hasPendingInvite).length;

  if (loading) return <MemberSelectLoading palette={palette} />;
  if (error) return <MemberSelectError error={error} onRetry={loadMembers} palette={palette} />;
  if (members.length === 0) return <MemberSelectEmpty palette={palette} />;

  return (
    <View style={styles.container}>
      {showSelectAll && (
        <SelectAllHeader
          selectedCount={selectedCount}
          totalCount={members.length}
          allSelected={allSelected}
          disabled={disabled}
          onSelectAll={selectAll}
          onSelectNone={selectNone}
          palette={palette}
        />
      )}

      {showNotificationCount && selectedCount > 0 && (
        <NotificationBanner parentCount={uniqueParentCount} palette={palette} />
      )}

      <ScrollView
        style={[styles.memberList, { maxHeight }]}
        contentContainerStyle={styles.memberListContent}
        showsVerticalScrollIndicator={false}
      >
        {members.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            isSelected={selectedMemberIds.includes(member.id)}
            disabled={disabled}
            onToggle={() => toggleMember(member.id)}
            palette={palette}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  memberList: { flex: 1 },
  memberListContent: { gap: Spacing.sm, paddingBottom: Spacing.sm },
});
