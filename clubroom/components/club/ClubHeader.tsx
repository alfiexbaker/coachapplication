import { useMemo, useState, useCallback } from 'react';
import { StyleSheet, View, Share, Alert, Image } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { Club, ClubMembership } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { ClubHeaderMenu, type ClubMenuItem } from './club-header-menu';

// ─── Re-exports ─────────────────────────────────────────────────────────────

export { ClubStatsRow, type ClubStatsRowProps } from './club-stats-row';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ClubHeaderProps {
  club: Club;
  membership: ClubMembership;
  onLeave: () => void;
  onManage?: () => void;
  onUpdatePhotos?: (updates: { profilePhotoUrl?: string; coverPhotoUrl?: string }) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ClubHeader({ club, membership, onLeave, onManage, onUpdatePhotos }: ClubHeaderProps) {
  const { colors: palette } = useTheme();
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
      onUpdatePhotos?.(type === 'profile' ? { profilePhotoUrl: uri } : { coverPhotoUrl: uri });
    }
  }, [onUpdatePhotos]);

  const handleShareInvite = async () => {
    setShowMenu(false);
    try {
      await Share.share({ message: `Join ${club.name} on the app! Use invite code: ${club.inviteCode}`, title: `Join ${club.name}` });
    } catch {
      Alert.alert('Error', 'Failed to share invite code');
    }
  };

  const handleManageClub = () => {
    setShowMenu(false);
    if (onManage) onManage();
    else router.push(Routes.CLUB_SETTINGS);
  };

  const handleLeaveClub = () => {
    setShowMenu(false);
    if (isOwner) {
      Alert.alert('Cannot Leave', 'As the club owner, you cannot leave. Please transfer ownership first or delete the club.', [{ text: 'OK' }]);
    } else {
      Alert.alert('Leave Club', `Are you sure you want to leave ${club.name}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: onLeave },
      ]);
    }
  };

  const handleCreateGroup = () => {
    setShowMenu(false);
    router.push(Routes.clubSquadCreate(club.id));
  };

  const menuItems: ClubMenuItem[] = [
    ...(canShareInvite ? [{ icon: 'share-outline' as const, label: 'Share Invite Code', onPress: handleShareInvite, color: palette.tint }] : []),
    ...(canManage ? [{ icon: 'settings-outline' as const, label: 'Manage Club', onPress: handleManageClub, color: palette.text }] : []),
    ...(canManage ? [{ icon: 'people-outline' as const, label: 'Create Group', onPress: handleCreateGroup, color: palette.text }] : []),
    { icon: (isOwner ? 'trash-outline' : 'exit-outline') as keyof typeof Ionicons.glyphMap, label: isOwner ? 'Delete Club' : 'Leave Club', onPress: handleLeaveClub, color: palette.error },
  ];

  return (
    <>
      {/* Cover Photo */}
      <Clickable
        onPress={() => canManage && pickImage('cover')}
        disabled={!canManage}
        style={styles.coverPhotoContainer}
      >
        {club.coverPhotoUrl ? (
          <Image source={{ uri: club.coverPhotoUrl }} style={styles.coverPhoto} resizeMode="cover" />
        ) : (
          <View style={[styles.coverPhotoPlaceholder, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
            {canManage && (
              <View style={styles.coverPhotoHint}>
                <Ionicons name="camera-outline" size={20} color={palette.muted} />
                <ThemedText style={{ ...Typography.caption, color: palette.muted }}>Add cover photo</ThemedText>
              </View>
            )}
          </View>
        )}
        {canManage && club.coverPhotoUrl && (
          <View style={[styles.coverEditBadge, { backgroundColor: palette.surface }]}>
            <Ionicons name="camera-outline" size={14} color={palette.tint} />
          </View>
        )}
      </Clickable>

      {/* Club Info Row */}
      <View style={styles.clubHeader}>
        <Clickable
          onPress={() => canManage && pickImage('profile')}
          disabled={!canManage}
          style={styles.profilePhotoTouchable}
        >
          {club.profilePhotoUrl ? (
            <Image source={{ uri: club.profilePhotoUrl }} style={[styles.clubAvatar, { borderColor: palette.surface }]} />
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
        </Clickable>

        <View style={{ flex: 1 }}>
          <ThemedText type="title" style={{ ...Typography.title }}>{club.name}</ThemedText>
          <ThemedText style={{ color: palette.muted }}>{roleLabel} -- {club.memberCount} members</ThemedText>
          {club.tagline ? (
            <ThemedText style={{ ...Typography.small, color: palette.muted, marginTop: Spacing.micro }}>{club.tagline}</ThemedText>
          ) : null}
        </View>
        <Clickable
          accessibilityLabel="Club options"
          onPress={() => setShowMenu(true)}
          hitSlop={10}
          style={[styles.menuButton, { backgroundColor: withAlpha(palette.muted, 0.06) }]}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={palette.muted} />
        </Clickable>
      </View>

      {/* Menu Modal */}
      <ClubHeaderMenu
        visible={showMenu}
        clubName={club.name}
        inviteCode={club.inviteCode}
        canShareInvite={canShareInvite}
        menuItems={menuItems}
        onClose={() => setShowMenu(false)}
        onShareInvite={handleShareInvite}
      />
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  coverPhotoContainer: { width: '100%', marginBottom: -Spacing.lg },
  coverPhoto: { width: '100%', height: 140, borderRadius: Radii.md },
  coverPhotoPlaceholder: { width: '100%', height: 140, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  coverPhotoHint: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  coverEditBadge: { position: 'absolute', bottom: Spacing.xs, right: Spacing.xs, width: 28, height: 28, borderRadius: Radii.lg, alignItems: 'center', justifyContent: 'center' },
  profilePhotoTouchable: { position: 'relative' },
  profileEditBadge: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  clubHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.lg },
  clubAvatar: { width: 56, height: 56, borderRadius: Radii['2xl'], alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  clubAvatarText: { ...Typography.title },
  menuButton: { width: 44, height: 44, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
});
