import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { scaleFont } from '@/utils/scale';
import type { GroupMember } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';
import { getRoleBadgeColor, ROLE_LABELS } from './group-members-modal-helpers';

// ─── MemberRowItem ──────────────────────────────────────────────

export interface MemberRowItemProps {
  item: GroupMember;
  parentId: string;
  canManage: boolean;
  onMemberManage: (member: GroupMember) => void;
  palette: ThemeColors;
}

export const MemberRowItem = function MemberRowItem({
  item,
  parentId,
  canManage,
  onMemberManage,
  palette,
}: MemberRowItemProps) {
  const isSelf = item.parentId === parentId;
  const colors = getRoleBadgeColor(item.role, palette);

  return (
    <Row style={[styles.memberRow, { borderBottomColor: palette.border }]}>
      <View style={[styles.memberAvatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
        <Ionicons name="person" size={18} color={palette.tint} />
      </View>
      <View style={styles.memberInfo}>
        <Row style={styles.memberNameRow}>
          <ThemedText style={[styles.memberName, { color: palette.text }]} numberOfLines={1}>
            {item.parentId}
            {isSelf ? ' (You)' : ''}
          </ThemedText>
          <View style={[styles.roleBadge, { backgroundColor: colors.bg }]}>
            <ThemedText style={[styles.roleBadgeText, { color: colors.text }]}>
              {ROLE_LABELS[item.role]}
            </ThemedText>
          </View>
        </Row>
        <ThemedText style={[styles.memberJoined, { color: palette.muted }]}>
          Joined{' '}
          {new Date(item.joinedAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </ThemedText>
      </View>
      {canManage && (
        <Clickable
          onPress={() => onMemberManage(item)}
          style={[styles.manageButton, { borderColor: palette.border }]}
        >
          <ThemedText style={[styles.manageButtonText, { color: palette.tint }]}>Manage</ThemedText>
        </Clickable>
      )}
    </Row>
  );
};

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  memberRow: {
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
