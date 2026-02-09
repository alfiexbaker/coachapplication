import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { scaleFont } from '@/utils/scale';
import type { GroupMember, GroupMemberRole } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';

// ─── Role Helpers ───────────────────────────────────────────────

export const ROLE_LABELS: Record<GroupMemberRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MODERATOR: 'Moderator',
  MEMBER: 'Member',
};

export function getRoleBadgeColor(role: GroupMemberRole, palette: ThemeColors) {
  switch (role) {
    case 'OWNER': return { bg: withAlpha(palette.warning, 0.12), text: palette.warning };
    case 'ADMIN': return { bg: withAlpha(palette.info, 0.12), text: palette.info };
    case 'MODERATOR': return { bg: withAlpha(palette.success, 0.12), text: palette.success };
    default: return { bg: withAlpha(palette.muted, 0.09), text: palette.muted };
  }
}

// ─── MemberRowItem ──────────────────────────────────────────────

export interface MemberRowItemProps {
  item: GroupMember;
  parentId: string;
  canManage: boolean;
  onMemberManage: (member: GroupMember) => void;
  palette: ThemeColors;
}

export const MemberRowItem = memo(function MemberRowItem({
  item,
  parentId,
  canManage,
  onMemberManage,
  palette,
}: MemberRowItemProps) {
  const isSelf = item.parentId === parentId;
  const colors = getRoleBadgeColor(item.role, palette);

  return (
    <View style={[styles.memberRow, { borderBottomColor: palette.border }]}>
      <View style={[styles.memberAvatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
        <Ionicons name="person" size={18} color={palette.tint} />
      </View>
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <ThemedText style={[styles.memberName, { color: palette.text }]} numberOfLines={1}>
            {item.parentName}{isSelf ? ' (You)' : ''}
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
        <Clickable onPress={() => onMemberManage(item)} style={[styles.manageButton, { borderColor: palette.border }]}>
          <ThemedText style={[styles.manageButtonText, { color: palette.tint }]}>Manage</ThemedText>
        </Clickable>
      )}
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
  memberName: { ...Typography.bodySemiBold, flexShrink: 1 },
  memberJoined: { ...Typography.caption },
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
  manageButtonText: { ...Typography.caption },
});
