import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Spacing, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { ParentGroup } from '@/constants/types';
import { scaleFont } from '@/utils/scale';

type RoleBreakdown = {
  OWNER: number;
  ADMIN: number;
  MODERATOR: number;
  MEMBER: number;
};

type HeaderProps = {
  colors: ThemeColors;
  group: ParentGroup;
  roleBreakdown: RoleBreakdown | null;
  onBack: () => void;
  onInfoOrMembersPress: () => void;
  onLeavePress: () => void;
};

const renderRoleBreakdown = (roleBreakdown: RoleBreakdown | null) => {
  if (!roleBreakdown) return '';

  const parts: string[] = [];
  if (roleBreakdown.OWNER > 0) parts.push(`${roleBreakdown.OWNER} Owner`);
  if (roleBreakdown.ADMIN > 0)
    parts.push(`${roleBreakdown.ADMIN} Admin${roleBreakdown.ADMIN > 1 ? 's' : ''}`);
  if (roleBreakdown.MODERATOR > 0)
    parts.push(`${roleBreakdown.MODERATOR} Mod${roleBreakdown.MODERATOR > 1 ? 's' : ''}`);
  if (roleBreakdown.MEMBER > 0)
    parts.push(`${roleBreakdown.MEMBER} Member${roleBreakdown.MEMBER > 1 ? 's' : ''}`);
  return parts.join(' / ');
};

export const GroupChatHeader = function GroupChatHeader({
  colors,
  group,
  roleBreakdown,
  onBack,
  onInfoOrMembersPress,
  onLeavePress,
}: HeaderProps) {
  return (
    <Row style={[styles.header, { borderBottomColor: colors.border }]}>
      <Clickable onPress={onBack} style={styles.backButton} accessibilityLabel="Go back">
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Clickable>
      <Clickable
        style={styles.headerInfo}
        onPress={onInfoOrMembersPress}
        accessibilityLabel="Open group members"
      >
        <ThemedText type="subtitle" style={styles.headerName}>
          {group.name}
        </ThemedText>
        <ThemedText style={[styles.headerSubtitle, { color: colors.muted }]}>
          {group.members.length} members
          {roleBreakdown ? ` \u00B7 ${renderRoleBreakdown(roleBreakdown)}` : ''}
        </ThemedText>
      </Clickable>
      {group.type === 'SQUAD' ? (
        <Clickable
          onPress={onInfoOrMembersPress}
          style={styles.moreButton}
          accessibilityLabel="Group info"
        >
          <Ionicons name="information-circle-outline" size={22} color={colors.tint} />
        </Clickable>
      ) : (
        <Clickable
          onPress={onLeavePress}
          style={styles.moreButton}
          accessibilityLabel="Leave group"
        >
          <Ionicons name="exit-outline" size={22} color={colors.error} />
        </Clickable>
      )}
    </Row>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
  },
  headerInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  headerName: {
    ...Typography.heading,
    fontSize: scaleFont(Typography.heading.fontSize),
  },
  headerSubtitle: {
    ...Typography.caption,
    fontSize: scaleFont(Typography.caption.fontSize),
  },
  moreButton: {
    padding: Spacing.xs,
  },
});
