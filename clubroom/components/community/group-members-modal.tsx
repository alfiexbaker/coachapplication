import React from 'react';
import { View, StyleSheet, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useTheme, type ThemeColors } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';
import { communityGroupService } from '@/services/community/community-group-service';
import type { GroupMember, GroupMemberRole } from '@/constants/types';

// ---------------------------------------------------------------------------
// Role helpers
// ---------------------------------------------------------------------------

const ROLE_LABELS: Record<GroupMemberRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MODERATOR: 'Moderator',
  MEMBER: 'Member',
};

function getRoleBadgeColor(role: GroupMemberRole, palette: ThemeColors) {
  switch (role) {
    case 'OWNER':
      return { bg: withAlpha(palette.warning, 0.12), text: palette.warning };
    case 'ADMIN':
      return { bg: withAlpha(palette.info, 0.12), text: palette.info };
    case 'MODERATOR':
      return { bg: withAlpha(palette.success, 0.12), text: palette.success };
    default:
      return { bg: withAlpha(palette.muted, 0.09), text: palette.muted };
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GroupMembersModalProps {
  visible: boolean;
  onClose: () => void;
  members: GroupMember[];
  parentId: string;
  currentRole: GroupMemberRole;
  isAdmin: boolean;
  onMemberManage: (member: GroupMember) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function GroupMembersModalInner({
  visible,
  onClose,
  members,
  parentId,
  currentRole,
  isAdmin,
  onMemberManage,
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
    const colors = getRoleBadgeColor(item.role, palette);

    return (
      <View style={[styles.memberRow, { borderBottomColor: palette.border }]}>
        <View style={[styles.memberAvatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <Ionicons name="person" size={18} color={palette.tint} />
        </View>
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <ThemedText style={[styles.memberName, { color: palette.text }]} numberOfLines={1}>
              {item.parentName}
              {isSelf ? ' (You)' : ''}
            </ThemedText>
            <View style={[styles.roleBadge, { backgroundColor: colors.bg }]}>
              <ThemedText style={[styles.roleBadgeText, { color: colors.text }]}>
                {ROLE_LABELS[item.role]}
              </ThemedText>
            </View>
          </View>
          <ThemedText style={[styles.memberJoined, { color: palette.muted }]}>
            Joined {new Date(item.joinedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </ThemedText>
        </View>
        {canManage && (
          <Clickable
            onPress={() => onMemberManage(item)}
            style={[styles.manageButton, { borderColor: palette.border }]}
          >
            <ThemedText style={[styles.manageButtonText, { color: palette.tint }]}>
              Manage
            </ThemedText>
          </Clickable>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: palette.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
          <ThemedText type="title" style={styles.modalTitle}>
            Members ({members.length})
          </ThemedText>
          <Clickable onPress={onClose}>
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
            <ThemedText style={[styles.manageMembersLabel, { color: palette.tint }]}>
              Manage Members
            </ThemedText>
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...Typography.title,
  },
  roleBreakdownBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  roleBreakdownText: {
    ...Typography.caption,
  },
  manageMembersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  manageMembersLabel: {
    ...Typography.caption,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  memberListContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.lg,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  memberName: {
    ...Typography.bodySemiBold,
    flexShrink: 1,
  },
  memberJoined: {
    ...Typography.caption,
  },
  roleBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  roleBadgeText: {
    ...Typography.micro,
    fontSize: scaleFont(Typography.micro.fontSize),
    letterSpacing: 0.3,
  },
  manageButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  manageButtonText: {
    ...Typography.caption,
  },
});
