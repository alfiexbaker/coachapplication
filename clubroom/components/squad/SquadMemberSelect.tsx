/**
 * Squad Member Select Component
 *
 * Multi-select component for choosing squad members to invite.
 */

import { useState, useEffect, startTransition } from 'react';
import { View, StyleSheet, FlatList, type ListRenderItemInfo } from 'react-native';
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
import { runAsyncTryCatchFinally } from '@/utils/async-control';
import type { ThemeColors } from '@/hooks/useTheme';
const logger = createLogger('SquadMemberSelect');
interface SquadMemberSelectProps {
  squadId: string;
  sessionId?: string;
  selectedMemberIds: string[];
  onSelectionChange: (memberIds: string[]) => void;
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
  showSelectAll = true,
  showNotificationCount = true,
  maxHeight = 400,
  disabled = false,
}: SquadMemberSelectProps) {
  const { colors: palette } = useTheme();
  const [members, setMembers] = useState<SquadMemberWithSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryLoadMembers = () => {
    void loadSquadMembers(squadId, sessionId, setMembers, setLoading, setError);
  };
  useEffect(() => {
    startTransition(() => {
      void loadSquadMembers(squadId, sessionId, setMembers, setLoading, setError);
    });
  }, [squadId, sessionId]);
  const toggleMember = (memberId: string) => {
    if (disabled) return;
    const newSelection = selectedMemberIds.includes(memberId)
      ? selectedMemberIds.filter((id) => id !== memberId)
      : [...selectedMemberIds, memberId];
    onSelectionChange(newSelection);
  };
  const selectAll = () => {
    if (disabled) return;
    const allIds = members.flatMap((m) => (!m.hasPendingInvite ? [m.id] : []));
    onSelectionChange(allIds);
  };
  const selectNone = () => {
    if (disabled) return;
    onSelectionChange([]);
  };
  const uniqueParentCount = (() => {
    const selectedMembers = members.filter((m) => selectedMemberIds.includes(m.id));
    const uniqueParents = new Set(selectedMembers.map((m) => m.parentId));
    return uniqueParents.size;
  })();
  const selectedCount = selectedMemberIds.length;
  const allSelected =
    selectedCount > 0 && selectedCount === members.filter((m) => !m.hasPendingInvite).length;
  const memberItems = getSquadMemberItems(
    members,
    selectedMemberIds,
    disabled,
    toggleMember,
    palette,
  );

  if (loading) return <MemberSelectLoading palette={palette} />;
  if (error)
    return <MemberSelectError error={error} onRetry={retryLoadMembers} palette={palette} />;
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

      <FlatList
        style={[
          styles.memberList,
          {
            maxHeight,
          },
        ]}
        data={memberItems}
        keyExtractor={keySquadMemberItem}
        renderItem={renderSquadMemberItem}
        contentContainerStyle={styles.memberListContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

async function loadSquadMembers(
  squadId: string,
  sessionId: string | undefined,
  setMembers: (members: SquadMemberWithSelection[]) => void,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
) {
  setLoading(true);
  setError(null);
  await runAsyncTryCatchFinally(
    async () => {
      const data = await squadBulkInviteService.getSquadMembersWithMetadata(squadId, sessionId);
      setMembers(data);
    },
    async (err) => {
      logger.error('Failed to load squad members', err);
      setError('Failed to load squad members');
    },
    () => {
      setLoading(false);
    },
  );
}

interface SquadMemberItem {
  key: string;
  member: SquadMemberWithSelection;
  isSelected: boolean;
  disabled: boolean;
  onToggle: () => void;
  palette: ThemeColors;
}

function getSquadMemberItems(
  members: SquadMemberWithSelection[],
  selectedMemberIds: string[],
  disabled: boolean,
  toggleMember: (memberId: string) => void,
  palette: ThemeColors,
): SquadMemberItem[] {
  return members.map((member) => ({
    key: member.id,
    member,
    isSelected: selectedMemberIds.includes(member.id),
    disabled,
    onToggle: () => toggleMember(member.id),
    palette,
  }));
}

function keySquadMemberItem(item: SquadMemberItem): string {
  return item.key;
}

function renderSquadMemberItem({ item }: ListRenderItemInfo<SquadMemberItem>) {
  return (
    <MemberCard
      member={item.member}
      isSelected={item.isSelected}
      disabled={item.disabled}
      onToggle={item.onToggle}
      palette={item.palette}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  memberList: {
    flex: 1,
  },
  memberListContent: {
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
});
