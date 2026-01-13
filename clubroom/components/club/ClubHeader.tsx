import { useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Modal, Share, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Club, ClubMembership, ClubSquad, SessionOffering, ClubInvite } from '@/constants/types';

export interface ClubHeaderProps {
  club: Club;
  membership: ClubMembership;
  onLeave: () => void;
  onManage?: () => void;
}

export function ClubHeader({ club, membership, onLeave, onManage }: ClubHeaderProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [showMenu, setShowMenu] = useState(false);

  const roleLabel = useMemo(() => {
    switch (membership.role) {
      case 'OWNER': return 'Owner';
      case 'HEAD_COACH': return 'Head Coach';
      case 'ADMIN': return 'Admin';
      case 'COACH': return 'Coach';
      default: return 'Member';
    }
  }, [membership.role]);

  const canManage = ['OWNER', 'ADMIN', 'HEAD_COACH'].includes(membership.role);
  const canShareInvite = ['OWNER', 'ADMIN', 'HEAD_COACH', 'COACH'].includes(membership.role);
  const isOwner = membership.role === 'OWNER';

  const badgeText = club.name?.slice(0, 2).toUpperCase() || 'CL';

  const handleShareInvite = async () => {
    setShowMenu(false);
    try {
      await Share.share({
        message: `Join ${club.name} on the app! Use invite code: ${club.inviteCode}`,
        title: `Join ${club.name}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share invite code');
    }
  };

  const handleManageClub = () => {
    setShowMenu(false);
    if (onManage) {
      onManage();
    } else {
      // Navigate to club settings/management
      router.push({
        pathname: '/club/[id]',
        params: { id: club.id, manage: 'true' },
      });
    }
  };

  const handleLeaveClub = () => {
    setShowMenu(false);
    if (isOwner) {
      Alert.alert(
        'Cannot Leave',
        'As the club owner, you cannot leave. Please transfer ownership first or delete the club.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Leave Club',
        `Are you sure you want to leave ${club.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: onLeave },
        ]
      );
    }
  };

  const handleCreateGroup = () => {
    setShowMenu(false);
    router.push({
      pathname: '/(modal)/create-squad',
      params: { clubId: club.id },
    });
  };

  const menuItems = [
    ...(canShareInvite ? [{
      icon: 'share-outline' as const,
      label: 'Share Invite Code',
      onPress: handleShareInvite,
      color: palette.tint,
    }] : []),
    ...(canManage ? [{
      icon: 'settings-outline' as const,
      label: 'Manage Club',
      onPress: handleManageClub,
      color: palette.text,
    }] : []),
    ...(canManage ? [{
      icon: 'people-outline' as const,
      label: 'Create Group',
      onPress: handleCreateGroup,
      color: palette.text,
    }] : []),
    {
      icon: isOwner ? 'trash-outline' as const : 'exit-outline' as const,
      label: isOwner ? 'Delete Club' : 'Leave Club',
      onPress: handleLeaveClub,
      color: palette.error,
    },
  ];

  return (
    <>
      <View style={styles.clubHeader}>
        <View style={[styles.clubAvatar, { backgroundColor: `${palette.tint}10` }]}>
          <ThemedText style={styles.clubAvatarText}>{badgeText}</ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="title" style={{ fontSize: 20 }}>{club.name}</ThemedText>
          <ThemedText style={{ color: palette.muted }}>{roleLabel} · {club.memberCount} members</ThemedText>
        </View>
        <TouchableOpacity
          onPress={() => setShowMenu(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.menuButton, { backgroundColor: `${palette.muted}10` }]}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={palette.muted} />
        </TouchableOpacity>
      </View>

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={[styles.menuContainer, { backgroundColor: palette.surface }]}>
            <View style={styles.menuHeader}>
              <ThemedText type="defaultSemiBold">{club.name}</ThemedText>
              <TouchableOpacity onPress={() => setShowMenu(false)}>
                <Ionicons name="close" size={24} color={palette.muted} />
              </TouchableOpacity>
            </View>

            {/* Invite Code Display */}
            {canShareInvite && (
              <View style={[styles.inviteCodeSection, { backgroundColor: `${palette.tint}10`, borderColor: `${palette.tint}30` }]}>
                <View>
                  <ThemedText style={{ color: palette.muted, fontSize: 12 }}>Invite Code</ThemedText>
                  <ThemedText type="defaultSemiBold" style={{ color: palette.tint, fontSize: 18, letterSpacing: 2 }}>
                    {club.inviteCode}
                  </ThemedText>
                </View>
                <TouchableOpacity
                  style={[styles.copyButton, { backgroundColor: palette.tint }]}
                  onPress={handleShareInvite}
                >
                  <Ionicons name="share-outline" size={16} color="#fff" />
                  <ThemedText style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Share</ThemedText>
                </TouchableOpacity>
              </View>
            )}

            {/* Menu Items */}
            <View style={styles.menuItems}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={item.onPress}
                >
                  <Ionicons name={item.icon} size={20} color={item.color} />
                  <ThemedText style={{ color: item.color, flex: 1 }}>{item.label}</ThemedText>
                  <Ionicons name="chevron-forward" size={16} color={palette.muted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export interface ClubStatsRowProps {
  memberCount: number;
  squads: ClubSquad[];
  sessions: SessionOffering[];
  invites: ClubInvite[];
  canManageMembers: boolean;
  showMembersSection: boolean;
  onToggleMembersSection: () => void;
}

export function ClubStatsRow({
  memberCount,
  squads,
  sessions,
  invites,
  canManageMembers,
  showMembersSection,
  onToggleMembersSection,
}: ClubStatsRowProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={[styles.statsRow, { borderColor: palette.border }]}>
      <TouchableOpacity
        style={styles.statItem}
        onPress={() => canManageMembers && onToggleMembersSection()}
      >
        <ThemedText type="title" style={{ fontSize: 18 }}>{memberCount}</ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <ThemedText style={{ color: palette.muted, fontSize: 12 }}>Members</ThemedText>
          {canManageMembers && (
            <Ionicons
              name={showMembersSection ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={palette.muted}
            />
          )}
        </View>
      </TouchableOpacity>
      <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
      <View style={styles.statItem}>
        <ThemedText type="title" style={{ fontSize: 18 }}>{squads.length}</ThemedText>
        <ThemedText style={{ color: palette.muted, fontSize: 12 }}>Squads</ThemedText>
      </View>
      <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
      <View style={styles.statItem}>
        <ThemedText type="title" style={{ fontSize: 18 }}>{sessions.length}</ThemedText>
        <ThemedText style={{ color: palette.muted, fontSize: 12 }}>Sessions</ThemedText>
      </View>
      <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
      <View style={styles.statItem}>
        <ThemedText type="title" style={{ fontSize: 18 }}>{invites.length}</ThemedText>
        <ThemedText style={{ color: palette.muted, fontSize: 12 }}>Invites</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  clubAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubAvatarText: {
    fontSize: 22,
    fontWeight: '700',
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: '100%',
  },
  // Menu Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl + 20, // Extra padding for safe area
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  inviteCodeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  menuItems: {
    gap: Spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
});
