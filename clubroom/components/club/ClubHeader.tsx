import { useMemo, useState, useCallback } from 'react';
import { StyleSheet, View, Share, ActivityIndicator, Linking } from 'react-native';
import { SafeImage } from '@/components/primitives/safe-image';
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
import { Row } from '@/components/primitives';
import { Column } from '@/components/primitives/column';
import { uiFeedback } from '@/services/ui-feedback';
import { StatusBanner } from '@/components/ui/primitives/StatusBanner';

// ─── Re-exports ─────────────────────────────────────────────────────────────

export { ClubStatsRow, type ClubStatsRowProps } from './club-stats-row';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ClubHeaderProps {
  club: Club;
  membership: ClubMembership;
  onLeave: () => void;
  onUpdatePhotos?: (updates: { profilePhotoUrl?: string; coverPhotoUrl?: string }) => void;
  includeManagementActions?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ClubHeader({
  club,
  membership,
  onLeave,
  onUpdatePhotos,
  includeManagementActions = true,
}: ClubHeaderProps) {
  const { colors: palette } = useTheme();
  const [showMenu, setShowMenu] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPermissionMessage, setPhotoPermissionMessage] = useState<string | null>(null);

  const roleLabel = useMemo(() => {
    switch (membership.role) {
      case 'OWNER':
        return 'Owner';
      case 'HEAD_COACH':
        return 'Head Coach';
      case 'ADMIN':
        return 'Admin';
      case 'COACH':
        return 'Coach';
      default:
        return 'Member';
    }
  }, [membership.role]);

  const canManage = ['OWNER', 'ADMIN', 'HEAD_COACH'].includes(membership.role);
  const canShareInvite = ['OWNER', 'ADMIN', 'HEAD_COACH', 'COACH'].includes(membership.role);
  const isOwner = membership.role === 'OWNER';
  const badgeText = club.name?.slice(0, 2).toUpperCase() || 'CL';
  const showCoverPhotoArea = Boolean(club.coverPhotoUrl || canManage);

  const pickImage = useCallback(
    async (type: 'profile' | 'cover') => {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setPhotoPermissionMessage(
          'Photo library access is needed to update club photos. Enable it in Settings to continue.',
        );
        uiFeedback.showToast('Photo library access is needed to update club photos.', 'warning');
        return;
      }
      setPhotoPermissionMessage(null);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'cover' ? [16, 9] : [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setUploadingPhoto(true);
        onUpdatePhotos?.(type === 'profile' ? { profilePhotoUrl: uri } : { coverPhotoUrl: uri });
        setUploadingPhoto(false);
      }
    },
    [onUpdatePhotos],
  );

  const handleShareInvite = useCallback(async () => {
    setShowMenu(false);
    try {
      await Share.share({
        message: `Join ${club.name} on the app! Use invite code: ${club.inviteCode}`,
        title: `Join ${club.name}`,
      });
    } catch {
      uiFeedback.showToast('Failed to share invite code', 'error');
    }
  }, [club.name, club.inviteCode]);

  const handleOpenClubSettings = useCallback(() => {
    setShowMenu(false);
    router.push(Routes.clubSettings({ clubId: club.id, section: 'details' }));
  }, [club.id]);

  const handleLeaveClub = useCallback(() => {
    setShowMenu(false);
    uiFeedback.alert('Leave Club', `Are you sure you want to leave ${club.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: onLeave },
    ]);
  }, [club.name, onLeave]);

  const handleDeleteClub = useCallback(() => {
    setShowMenu(false);
    uiFeedback.alert(
      'Delete Club',
      `This will permanently delete "${club.name}" and all associated data. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            router.push(Routes.clubSettings({ clubId: club.id, section: 'delete' }));
          },
        },
      ],
    );
  }, [club.name, club.id]);

  const handleCreateGroup = useCallback(() => {
    setShowMenu(false);
    router.push(Routes.clubSquadCreate(club.id));
  }, [club.id]);

  const menuItems: ClubMenuItem[] = [
    ...(canShareInvite
      ? [
          {
            icon: 'share-outline' as const,
            label: 'Share Invite Code',
            onPress: handleShareInvite,
            color: palette.tint,
          },
        ]
      : []),
    ...(canManage && includeManagementActions
      ? [
          {
            icon: 'settings-outline' as const,
            label: 'Manage Club',
            onPress: handleOpenClubSettings,
            color: palette.warning,
          },
        ]
      : []),
    ...(canManage && includeManagementActions
      ? [
          {
            icon: 'people-outline' as const,
            label: 'Create Group',
            onPress: handleCreateGroup,
            color: palette.text,
          },
        ]
      : []),
    {
      icon: (isOwner ? 'trash-outline' : 'exit-outline') as keyof typeof Ionicons.glyphMap,
      label: isOwner ? 'Delete Club' : 'Leave Club',
      onPress: isOwner ? handleDeleteClub : handleLeaveClub,
      color: palette.error,
    },
  ];

  return (
    <>
      {/* Cover Photo */}
      {showCoverPhotoArea && (
        <Clickable
          onPress={() => canManage && pickImage('cover')}
          disabled={!canManage}
          style={styles.coverPhotoContainer}
        >
          {club.coverPhotoUrl ? (
            <SafeImage
              source={{ uri: club.coverPhotoUrl }}
              fallbackIcon="image-outline"
              fallbackIconSize={48}
              style={styles.coverPhoto}
              contentFit="cover"
            />
          ) : (
            <View
              style={[
                styles.coverPhotoPlaceholder,
                { backgroundColor: withAlpha(palette.tint, 0.06) },
              ]}
            >
              {canManage && (
                <Row style={styles.coverPhotoHint}>
                  <Ionicons name="camera-outline" size={20} color={palette.muted} />
                  <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
                    Add cover photo
                  </ThemedText>
                </Row>
              )}
            </View>
          )}
          {canManage && club.coverPhotoUrl && (
            <View style={[styles.coverEditBadge, { backgroundColor: palette.surface }]}>
              <Ionicons name="camera-outline" size={14} color={palette.tint} />
            </View>
          )}
        </Clickable>
      )}

      {/* Club Info Row */}
      <Row style={[styles.clubHeader, showCoverPhotoArea ? styles.clubHeaderWithCover : undefined]}>
        <Clickable
          onPress={() => canManage && pickImage('profile')}
          disabled={!canManage}
          style={styles.profilePhotoTouchable}
        >
          {club.profilePhotoUrl ? (
            <SafeImage
              source={{ uri: club.profilePhotoUrl }}
              fallbackIcon="people-outline"
              fallbackIconSize={24}
              style={[styles.clubAvatar, { borderColor: palette.surface }]}
            />
          ) : (
            <View
              style={[
                styles.clubAvatar,
                { backgroundColor: withAlpha(palette.tint, 0.06), borderColor: palette.surface },
              ]}
            >
              <ThemedText style={styles.clubAvatarText}>{badgeText}</ThemedText>
            </View>
          )}
          {canManage && !uploadingPhoto && (
            <View style={[styles.profileEditBadge, { backgroundColor: palette.tint }]}>
              <Ionicons name="camera" size={10} color={palette.surface} />
            </View>
          )}
          {uploadingPhoto && (
            <View style={[styles.profileEditBadge, { backgroundColor: palette.tint, width: 56, height: 56, borderRadius: Radii['2xl'], position: 'absolute', top: 0, left: 0, opacity: 0.7, alignItems: 'center', justifyContent: 'center' }]}>
              <ActivityIndicator size="small" color={palette.surface} />
            </View>
          )}
        </Clickable>

        <Column flex>
          <ThemedText type="title" style={{ ...Typography.title }}>
            {club.name}
          </ThemedText>
          <ThemedText style={{ color: palette.muted }}>
            {roleLabel} -- {club.memberCount} members
          </ThemedText>
          {club.tagline ? (
            <ThemedText
              style={{ ...Typography.small, color: palette.muted, marginTop: Spacing.micro }}
            >
              {club.tagline}
            </ThemedText>
          ) : null}
        </Column>
        <Clickable
          accessibilityLabel="Club options"
          onPress={() => setShowMenu(true)}
          hitSlop={10}
          style={[styles.menuButton, { backgroundColor: withAlpha(palette.muted, 0.06) }]}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={palette.muted} />
        </Clickable>
      </Row>

      {photoPermissionMessage ? (
        <View style={styles.permissionBanner}>
          <StatusBanner
            variant="warning"
            message={photoPermissionMessage}
            action={{
              label: 'Open Settings',
              onPress: () => {
                void Linking.openSettings();
              },
            }}
            onDismiss={() => setPhotoPermissionMessage(null)}
          />
        </View>
      ) : null}

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
  coverPhotoContainer: { width: '100%', marginBottom: Spacing.sm },
  coverPhoto: { width: '100%', height: 112, borderRadius: Radii.md },
  coverPhotoPlaceholder: {
    width: '100%',
    height: 112,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPhotoHint: { alignItems: 'center', gap: Spacing.xs },
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
  profilePhotoTouchable: { position: 'relative' },
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
  clubHeader: { alignItems: 'center', gap: Spacing.md },
  clubHeaderWithCover: { marginTop: 0 },
  permissionBanner: {
    marginTop: Spacing.sm,
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
});
