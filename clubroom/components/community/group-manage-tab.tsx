import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { GroupMemberRole, ParentGroup } from '@/constants/types';

interface GroupManageTabProps {
  group: ParentGroup;
  currentRole: GroupMemberRole;
  isCoach: boolean;
  isAdmin: boolean;
  onOpenManageHub: () => void;
  onManageMembers: () => void;
  onInviteToSession: () => void;
  onInviteMembers: () => void;
  onOpenClub: () => void;
}

interface ManageAction {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}

function GroupManageTabInner({
  group,
  currentRole,
  isCoach,
  isAdmin,
  onOpenManageHub,
  onManageMembers,
  onInviteToSession,
  onInviteMembers,
  onOpenClub,
}: GroupManageTabProps) {
  const { colors: palette } = useTheme();

  const actions: ManageAction[] = [];

  if (isCoach || isAdmin) {
    actions.push({
      id: 'manage-hub',
      title: 'Manage Hub',
      description: 'Open coach operations and session controls.',
      icon: 'construct-outline',
      color: palette.warning,
      onPress: onOpenManageHub,
    });
  }

  if (isAdmin) {
    actions.push({
      id: 'members',
      title: 'Manage Members',
      description: 'View roles, permissions, and membership controls.',
      icon: 'people-outline',
      color: palette.tint,
      onPress: onManageMembers,
    });
  }

  if (isCoach) {
    actions.push({
      id: 'invite-session',
      title: 'Invite to Session',
      description: 'Send session invites to athletes, squads, or groups.',
      icon: 'paper-plane-outline',
      color: palette.success,
      onPress: onInviteToSession,
    });
  }

  if (group.type === 'CLUB' || group.clubId) {
    actions.push({
      id: 'invite-members',
      title: 'Invite Members',
      description: 'Add parents, players, and staff to the club.',
      icon: 'person-add-outline',
      color: palette.warning,
      onPress: onInviteMembers,
    });
    actions.push({
      id: 'open-club',
      title: 'Open Club Hub',
      description: 'Jump into club operations, settings, branding, and members.',
      icon: 'shield-outline',
      color: palette.icon,
      onPress: onOpenClub,
    });
  }

  return (
    <View style={styles.container}>
      <SurfaceCard style={styles.headerCard}>
        <ThemedText type="subtitle">Manage</ThemedText>
        <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
          Operations tools for {currentRole.toLowerCase()} role.
        </ThemedText>
      </SurfaceCard>

      <View style={styles.actionList}>
        {actions.map((action) => (
          <Clickable
            key={action.id}
            onPress={action.onPress}
            style={[
              styles.actionRow,
              { borderColor: palette.border, backgroundColor: palette.surface },
            ]}
            accessibilityRole="button"
            accessibilityLabel={action.title}
          >
            <View style={[styles.iconWrap, { backgroundColor: withAlpha(action.color, 0.12) }]}>
              <Ionicons name={action.icon} size={18} color={action.color} />
            </View>
            <View style={styles.textWrap}>
              <ThemedText style={styles.actionTitle}>{action.title}</ThemedText>
              <ThemedText style={[styles.actionDescription, { color: palette.muted }]}>
                {action.description}
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.muted} />
          </Clickable>
        ))}
      </View>
    </View>
  );
}

export const GroupManageTab = memo(GroupManageTabInner);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  headerCard: {
    padding: Spacing.md,
    gap: Spacing.xxs,
  },
  subtitle: {
    ...Typography.caption,
  },
  actionList: {
    gap: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radii.lg,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: Spacing.micro,
  },
  actionTitle: {
    ...Typography.bodySemiBold,
  },
  actionDescription: {
    ...Typography.caption,
    lineHeight: Typography.micro.lineHeight,
  },
});
