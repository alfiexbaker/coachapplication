import { useMemo, useState, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View, Modal, Share, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography, Components , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Club, ClubMembership } from '@/constants/types';

export interface ClubHeaderProps {
  club: Club;
  membership: ClubMembership;
  onLeave: () => void;
  onManage?: () => void;
  onUpdatePhotos?: (updates: { profilePhotoUrl?: string; coverPhotoUrl?: string }) => void;
}

export function ClubHeader({ club, membership, onLeave, onManage, onUpdatePhotos }: ClubHeaderProps) {
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

  const pickImage = useCallback(async (type: 'profile' | 'cover') => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Please allow access to your photo library to change the club photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'cover' ? [16, 9] : [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      if (type === 'profile') {
        onUpdatePhotos?.({ profilePhotoUrl: uri });
      } else {
        onUpdatePhotos?.({ coverPhotoUrl: uri });
      }
    }
  }, [onUpdatePhotos]);

  const handleShareInvite = async () => {
    setShowMenu(false);
    try {
      await Share.share({
        message: `Join ${club.name} on the app! Use invite code: ${club.inviteCode}`,
        title: `Join ${club.name}`,
      });
    } catch {
      Alert.alert('Error', 'Failed to share invite code');
    }
  };

  const handleManageClub = () => {
    setShowMenu(false);
    if (onManage) {
      onManage();
    } else {
      router.push(Routes.CLUB_SETTINGS);
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
    router.push(Routes.CLUB_SQUAD_CREATE);
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
      {/* Cover Photo */}
      <TouchableOpacity
        activeOpacity={canManage ? 0.8 : 1}
        onPress={() => canManage && pickImage('cover')}
        disabled={!canManage}
        style={styles.coverPhotoContainer}
      >
        {club.coverPhotoUrl ? (
          <Image
            source={{ uri: club.coverPhotoUrl }}
            style={styles.coverPhoto}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.coverPhotoPlaceholder, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
            {canManage && (
              <View style={styles.coverPhotoHint}>
                <Ionicons name="camera-outline" size={20} color={palette.muted} />
                <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
                  Add cover photo
                </ThemedText>
              </View>
            )}
          </View>
        )}
        {canManage && club.coverPhotoUrl && (
          <View style={[styles.coverEditBadge, { backgroundColor: palette.surface }]}>
            <Ionicons name="camera-outline" size={14} color={palette.tint} />
          </View>
        )}
      </TouchableOpacity>

      {/* Club Info Row */}
      <View style={styles.clubHeader}>
        {/* Profile Photo / Avatar */}
        <TouchableOpacity
          activeOpacity={canManage ? 0.8 : 1}
          onPress={() => canManage && pickImage('profile')}
          disabled={!canManage}
          style={styles.profilePhotoTouchable}
        >
          {club.profilePhotoUrl ? (
            <Image
              source={{ uri: club.profilePhotoUrl }}
              style={[styles.clubAvatar, { borderColor: palette.surface }]}
            />
          ) : (
            <View style={[styles.clubAvatar, { backgroundColor: withAlpha(palette.tint, 0.06), borderColor: palette.surface }]}>
              <ThemedText style={styles.clubAvatarText}>{badgeText}</ThemedText>
            </View>
          )}
          {canManage && (
            <View style={[styles.profileEditBadge, { backgroundColor: palette.tint }]}>
              <Ionicons name="camera" size={10} color={palette.surface} />
            </View>
          )}
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <ThemedText type="title" style={{ ...Typography.title }}>{club.name}</ThemedText>
          <ThemedText style={{ color: palette.muted }}>{roleLabel} -- {club.memberCount} members</ThemedText>
          {club.tagline ? (
            <ThemedText style={{ ...Typography.small, color: palette.muted, marginTop: Spacing.micro }}>
              {club.tagline}
            </ThemedText>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={() => setShowMenu(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.menuButton, { backgroundColor: withAlpha(palette.muted, 0.06) }]}
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
          <View
            onStartShouldSetResponder={() => true}
            style={[styles.menuContainer, { backgroundColor: palette.surface }]}
          >
            <View style={styles.menuHeader}>
              <ThemedText type="defaultSemiBold">{club.name}</ThemedText>
              <TouchableOpacity onPress={() => setShowMenu(false)}>
                <Ionicons name="close" size={24} color={palette.muted} />
              </TouchableOpacity>
            </View>

            {/* Invite Code Display */}
            {canShareInvite && (
              <View style={[styles.inviteCodeSection, { backgroundColor: withAlpha(palette.tint, 0.06), borderColor: withAlpha(palette.tint, 0.19) }]}>
                <View>
                  <ThemedText style={{ ...Typography.caption, color: palette.muted }}>Invite Code</ThemedText>
                  <ThemedText type="defaultSemiBold" style={{ ...Typography.heading, color: palette.tint, letterSpacing: 2 }}>
                    {club.inviteCode}
                  </ThemedText>
                </View>
                <TouchableOpacity
                  style={[styles.copyButton, { backgroundColor: palette.tint }]}
                  onPress={handleShareInvite}
                >
                  <Ionicons name="share-outline" size={16} color={palette.onPrimary} />
                  <ThemedText style={{ ...Typography.smallSemiBold, color: palette.onPrimary }}>Share</ThemedText>
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
  squadCount: number;
  sessionCount: number;
  inviteCount: number;
  canManageMembers: boolean;
  showMembersSection: boolean;
  onToggleMembersSection: () => void;
}

export function ClubStatsRow({
  memberCount,
  squadCount,
  sessionCount,
  inviteCount,
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
        <ThemedText type="title" style={{ ...Typography.heading }}>{memberCount}</ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.micro }}>
          <ThemedText style={{ ...Typography.caption, color: palette.muted }}>Members</ThemedText>
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
        <ThemedText type="title" style={{ ...Typography.heading }}>{squadCount}</ThemedText>
        <ThemedText style={{ ...Typography.caption, color: palette.muted }}>Squads</ThemedText>
      </View>
      <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
      <View style={styles.statItem}>
        <ThemedText type="title" style={{ ...Typography.heading }}>{sessionCount}</ThemedText>
        <ThemedText style={{ ...Typography.caption, color: palette.muted }}>Sessions</ThemedText>
      </View>
      <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
      <View style={styles.statItem}>
        <ThemedText type="title" style={{ ...Typography.heading }}>{inviteCount}</ThemedText>
        <ThemedText style={{ ...Typography.caption, color: palette.muted }}>Invites</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  coverPhotoContainer: {
    width: '100%',
    marginBottom: -Spacing.lg,
  },
  coverPhoto: {
    width: '100%',
    height: 140,
    borderRadius: Radii.md,
  },
  coverPhotoPlaceholder: {
    width: '100%',
    height: 140,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPhotoHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  coverEditBadge: {
    position: 'absolute',
    bottom: Spacing.xs,
    right: Spacing.xs,
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePhotoTouchable: {
    position: 'relative',
  },
  profileEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  clubAvatar: {
    width: 56,
    height: 56,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  clubAvatarText: { ...Typography.title },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
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
    borderTopLeftRadius: Components.modal.borderRadius,
    borderTopRightRadius: Components.modal.borderRadius,
    padding: Components.modal.padding,
    paddingBottom: Spacing.xl + 20,
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
    padding: Components.modal.padding,
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
