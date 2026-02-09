import React from 'react';
import { View, StyleSheet, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { communityGroupService } from '@/services/community/community-group-service';
import type { GroupMember } from '@/constants/types';

// Re-export extracted components for backward compat
export { ROLE_LABELS, getRoleBadgeColor, MemberRowItem } from './group-members-modal-sections';
export type { MemberRowItemProps } from './group-members-modal-sections';

import { MemberRowItem } from './group-members-modal-sections';

interface GroupMembersModalProps {
  visible: boolean;
  onClose: () => void;
  members: GroupMember[];
  parentId: string;
  currentRole: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';
  isAdmin: boolean;
  onMemberManage: (member: GroupMember) => void;
}

function GroupMembersModalInner({
  visible, onClose, members, parentId, currentRole, isAdmin, onMemberManage,
}: GroupMembersModalProps) {
  const { colors: palette } = useTheme();

  const roleBreakdown = communityGroupService.getRoleBreakdown(members);

  const renderRoleBreakdown = () => {
    const parts: string[] = [];
    if (roleBreakdown.OWNER > 0) parts.push(`${roleBreakdown.OWNER} Owner`);
    if (roleBreakdown.ADMIN > 0) parts.push(`${roleBreakdown.ADMIN} Admin${roleBreakdown.ADMIN > 1 ? 's' : ''}`);
    if (roleBreakdown.MODERATOR > 0) parts.push(`${roleBreakdown.MODERATOR} Mod${roleBreakdown.MODERATOR > 1 ? 's' : ''}`);
    if (roleBreakdown.MEMBER > 0) parts.push(`${roleBreakdown.MEMBER} Member${roleBreakdown.MEMBER > 1 ? 's' : ''}`);
    return parts.join(' / ');
  };

  const sortedMembers = [...members].sort(
    (a, b) => communityGroupService.getRoleWeight(b.role) - communityGroupService.getRoleWeight(a.role)
  );

  const renderMemberItem = ({ item }: { item: GroupMember }) => {
    const isSelf = item.parentId === parentId;
    const canManage = isAdmin && !isSelf && (
      currentRole === 'OWNER' || communityGroupService.getRoleWeight(currentRole) > communityGroupService.getRoleWeight(item.role)
    );

    return (
      <MemberRowItem
        item={item}
        parentId={parentId}
        canManage={canManage}
        onMemberManage={onMemberManage}
        palette={palette}
      />
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: palette.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
          <ThemedText type="title" style={styles.modalTitle}>Members ({members.length})</ThemedText>
          <Clickable accessibilityLabel="Close" onPress={onClose}>
            <Ionicons name="close" size={24} color={palette.text} />
          </Clickable>
        </View>

        <View style={[styles.roleBreakdownBar, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
          <ThemedText style={[styles.roleBreakdownText, { color: palette.muted }]}>
            {renderRoleBreakdown()}
          </ThemedText>
        </View>

        {isAdmin && (
          <View style={styles.manageMembersHeader}>
            <Ionicons name="shield-checkmark-outline" size={18} color={palette.tint} />
            <ThemedText style={[styles.manageMembersLabel, { color: palette.tint }]}>Manage Members</ThemedText>
          </View>
        )}

        <FlatList
          data={sortedMembers}
          keyExtractor={(item) => item.parentId}
          renderItem={renderMemberItem}
          contentContainerStyle={styles.memberListContent}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </Modal>
  );
}

export const GroupMembersModal = React.memo(GroupMembersModalInner);

const styles = StyleSheet.create({
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: { ...Typography.title },
  roleBreakdownBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  roleBreakdownText: { ...Typography.caption },
  manageMembersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  manageMembersLabel: { ...Typography.caption, letterSpacing: 0.5, textTransform: 'uppercase' },
  memberListContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.lg,
  },
});
