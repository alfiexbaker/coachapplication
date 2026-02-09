/**
 * Member Management Screen
 *
 * Deep management screen for individual club members.
 * Allows role changes, squad assignments, banning, and removal.
 * Accessible to club admins, head coaches, and owners.
 */

import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { useToast } from '@/components/ui/toast';
import { Spacing, Radii, Typography, Components , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { clubService, type ClubMember } from '@/services/club-service';
import { getClubById, getClubSquads, getAllClubMembershipsForUser } from '@/constants/mock-data';
import type { Club, ClubSquad, ClubRole } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('MemberManagement');

export default function MemberManagementScreen() {
  const { clubId, memberId } = useLocalSearchParams<{ clubId: string; memberId: string }>();
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [member, setMember] = useState<ClubMember | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [squads, setSquads] = useState<ClubSquad[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<ClubRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRolePicker, setShowRolePicker] = useState(false);

  const loadData = useCallback(async () => {
    if (!clubId || !memberId) return;
    setLoading(true);
    try {
      const clubData = getClubById(clubId);
      setClub(clubData || null);

      const memberData = await clubService.getMember(clubId, memberId);
      setMember(memberData);

      const squadData = getClubSquads(clubId);
      setSquads(squadData);

      if (currentUser?.id) {
        const memberships = getAllClubMembershipsForUser(currentUser.id);
        const myMembership = memberships.find((m) => m.clubId === clubId);
        setCurrentUserRole(myMembership?.role || null);
      }
    } catch (error) {
      logger.error('Failed to load member data', error);
    } finally {
      setLoading(false);
    }
  }, [clubId, memberId, currentUser?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const canManage = currentUserRole
    ? clubService.canRemoveMembers(currentUserRole) &&
      member?.role !== 'OWNER' &&
      (currentUserRole === 'OWNER' || clubService.canManageRole(currentUserRole, member?.role || 'MEMBER'))
    : false;

  const handleChangeRole = async (newRole: ClubRole) => {
    if (!clubId || !memberId || !currentUser || !member) return;

    try {
      const result = await clubService.changeMemberRole(
        clubId,
        memberId,
        newRole,
        { id: currentUser.id, name: currentUser.fullName || currentUser.username || 'Admin' }
      );

      if (!result.success) {
        showToast('Failed to change role', 'error');
        return;
      }

      setMember(result.data);
      setShowRolePicker(false);
      showToast(`${member.userName} is now ${clubService.formatRole(newRole)}`, 'success');
      logger.action('ChangeRole', { memberId, newRole });
    } catch (error) {
      logger.error('Failed to change role', error);
      showToast('Failed to change role', 'error');
    }
  };

  const handleRemoveMember = () => {
    if (!member) return;

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.userName} from ${club?.name || 'this club'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!clubId || !memberId || !currentUser) return;
            try {
              const result = await clubService.removeMember(
                clubId,
                memberId,
                'LEFT_CLUB',
                { id: currentUser.id, name: currentUser.fullName || currentUser.username || 'Admin' }
              );
              if (result.success) {
                showToast(`${member.userName} removed from club`, 'success');
                router.back();
              } else {
                showToast('Failed to remove member', 'error');
              }
            } catch (error) {
              logger.error('Failed to remove member', error);
              showToast('Failed to remove member', 'error');
            }
          },
        },
      ]
    );
  };

  const handleBanMember = () => {
    if (!member) return;

    Alert.alert(
      'Ban Member',
      `This will permanently ban ${member.userName} from ${club?.name || 'this club'}. They will not be able to rejoin.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ban',
          style: 'destructive',
          onPress: async () => {
            if (!clubId || !memberId || !currentUser) return;
            try {
              const result = await clubService.banMember(
                clubId,
                memberId,
                'Banned by club management',
                { id: currentUser.id, name: currentUser.fullName || currentUser.username || 'Admin' }
              );
              if (result.success) {
                showToast(`${member.userName} has been banned`, 'success');
                router.back();
              } else {
                showToast('Failed to ban member', 'error');
              }
            } catch (error) {
              logger.error('Failed to ban member', error);
              showToast('Failed to ban member', 'error');
            }
          },
        },
      ]
    );
  };

  const handleToggleSquad = async (squadId: string) => {
    if (!clubId || !memberId || !member) return;
    const isInSquad = member.squadIds?.includes(squadId);

    try {
      const result = isInSquad
        ? await clubService.removeMemberFromSquad(clubId, memberId, squadId)
        : await clubService.addMemberToSquad(clubId, memberId, squadId);

      if (result.success) {
        setMember(result.data);
        const squad = squads.find((s) => s.id === squadId);
        showToast(
          isInSquad
            ? `Removed from ${squad?.name || 'squad'}`
            : `Added to ${squad?.name || 'squad'}`,
          'success'
        );
      } else {
        showToast('Failed to update squad membership', 'error');
      }
    } catch (error) {
      logger.error('Failed to toggle squad', error);
      showToast('Failed to update squad membership', 'error');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ThemedText style={{ color: palette.muted }}>Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!member || !club) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>Member</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={48} color={palette.muted} />
          <ThemedText style={{ color: palette.muted, marginTop: Spacing.md }}>
            Member not found
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const roleColor = clubService.getRoleColor(member.role);
  const initials = member.userName.slice(0, 2).toUpperCase();
  const assignableRoles = currentUserRole ? clubService.getAssignableRoles(currentUserRole) : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title" style={styles.headerTitle}>Member</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <SurfaceCard style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {member.userPhotoUrl ? (
              <Image
                source={{ uri: member.userPhotoUrl }}
                style={[styles.profileAvatar, { borderColor: roleColor }]}
              />
            ) : (
              <View style={[styles.profileAvatar, { backgroundColor: withAlpha(roleColor, 0.09), borderColor: roleColor }]}>
                <ThemedText style={[styles.profileAvatarText, { color: roleColor }]}>
                  {initials}
                </ThemedText>
              </View>
            )}
            <View style={styles.profileInfo}>
              <ThemedText type="title" style={{ ...Typography.title }}>{member.userName}</ThemedText>
              <View style={[styles.roleBadge, { backgroundColor: withAlpha(roleColor, 0.09) }]}>
                <View style={[styles.roleDot, { backgroundColor: roleColor }]} />
                <ThemedText style={[styles.roleText, { color: roleColor }]}>
                  {clubService.formatRole(member.role)}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Member Details */}
          <View style={[styles.detailsRow, { borderTopColor: palette.border }]}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={16} color={palette.muted} />
              <ThemedText style={{ ...Typography.small, color: palette.muted }}>
                Joined {formatDate(member.joinedAt)}
              </ThemedText>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="shield-checkmark-outline" size={16} color={palette.muted} />
              <ThemedText style={{ ...Typography.small, color: palette.muted }}>
                Status: {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
              </ThemedText>
            </View>
            {member.squadIds && member.squadIds.length > 0 && (
              <View style={styles.detailItem}>
                <Ionicons name="people-outline" size={16} color={palette.muted} />
                <ThemedText style={{ ...Typography.small, color: palette.muted }}>
                  {member.squadIds.length} squad{member.squadIds.length !== 1 ? 's' : ''}
                </ThemedText>
              </View>
            )}
          </View>
        </SurfaceCard>

        {/* Squad Assignments */}
        {canManage && squads.length > 0 && (
          <SurfaceCard style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="layers-outline" size={20} color={palette.tint} />
              <ThemedText type="defaultSemiBold" style={{ ...Typography.subheading }}>
                Squad Assignments
              </ThemedText>
            </View>
            <ThemedText style={{ ...Typography.small, color: palette.muted }}>
              Tap to add or remove from squads
            </ThemedText>
            <View style={styles.squadList}>
              {squads.map((squad) => {
                const isInSquad = member.squadIds?.includes(squad.id) || false;
                return (
                  <Clickable
                    key={squad.id}
                    style={[
                      styles.squadRow,
                      {
                        borderColor: isInSquad ? palette.tint : palette.border,
                        backgroundColor: isInSquad ? withAlpha(palette.tint, 0.03) : palette.surface,
                      },
                    ]}
                    onPress={() => handleToggleSquad(squad.id)}
                  >
                    <View style={[styles.squadIcon, { backgroundColor: isInSquad ? withAlpha(palette.tint, 0.09) : withAlpha(palette.muted, 0.06) }]}>
                      <Ionicons
                        name="people"
                        size={18}
                        color={isInSquad ? palette.tint : palette.muted}
                      />
                    </View>
                    <View style={styles.squadInfo}>
                      <ThemedText type="defaultSemiBold">{squad.name}</ThemedText>
                      <ThemedText style={{ ...Typography.small, color: palette.muted }}>
                        {squad.level} -- {squad.memberCount} members
                      </ThemedText>
                    </View>
                    <View style={[
                      styles.squadToggle,
                      { backgroundColor: isInSquad ? palette.tint : palette.border },
                    ]}>
                      <Ionicons
                        name={isInSquad ? 'checkmark' : 'add'}
                        size={16}
                        color={palette.surface}
                      />
                    </View>
                  </Clickable>
                );
              })}
            </View>
          </SurfaceCard>
        )}

        {/* Role Management */}
        {canManage && (
          <SurfaceCard style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="key-outline" size={20} color={palette.tint} />
              <ThemedText type="defaultSemiBold" style={{ ...Typography.subheading }}>
                Role Management
              </ThemedText>
            </View>
            <ThemedText style={{ ...Typography.small, color: palette.muted }}>
              Current role: {clubService.formatRole(member.role)}
            </ThemedText>

            {showRolePicker ? (
              <View style={styles.rolePickerContainer}>
                {assignableRoles.map((role) => {
                  const isCurrentRole = role === member.role;
                  const color = clubService.getRoleColor(role);
                  return (
                    <Clickable
                      key={role}
                      style={[
                        styles.roleOption,
                        {
                          borderColor: isCurrentRole ? color : palette.border,
                          backgroundColor: isCurrentRole ? withAlpha(color, 0.06) : palette.surface,
                        },
                      ]}
                      onPress={() => handleChangeRole(role)}
                      disabled={isCurrentRole}
                    >
                      <View style={[styles.roleOptionDot, { backgroundColor: color }]} />
                      <View style={{ flex: 1 }}>
                        <ThemedText type="defaultSemiBold">{clubService.formatRole(role)}</ThemedText>
                      </View>
                      {isCurrentRole && (
                        <Ionicons name="checkmark-circle" size={20} color={color} />
                      )}
                    </Clickable>
                  );
                })}
                <Clickable
                  style={[styles.cancelButton, { borderColor: palette.border }]}
                  onPress={() => setShowRolePicker(false)}
                >
                  <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
                </Clickable>
              </View>
            ) : (
              <Clickable
                style={[styles.actionRow, { borderColor: palette.border }]}
                onPress={() => setShowRolePicker(true)}
              >
                <Ionicons name="swap-horizontal-outline" size={20} color={palette.tint} />
                <ThemedText style={{ flex: 1, color: palette.text }}>Change Role</ThemedText>
                <Ionicons name="chevron-forward" size={18} color={palette.muted} />
              </Clickable>
            )}
          </SurfaceCard>
        )}

        {/* Danger Zone */}
        {canManage && (
          <SurfaceCard style={[styles.sectionCard, { borderColor: withAlpha(palette.error, 0.19) }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning-outline" size={20} color={palette.error} />
              <ThemedText type="defaultSemiBold" style={{ ...Typography.subheading, color: palette.error }}>
                Danger Zone
              </ThemedText>
            </View>

            <Clickable
              style={[styles.dangerRow, { borderColor: palette.border }]}
              onPress={handleRemoveMember}
            >
              <Ionicons name="person-remove-outline" size={20} color={palette.error} />
              <View style={{ flex: 1 }}>
                <ThemedText style={{ color: palette.error, fontWeight: '600' }}>
                  Remove from Club
                </ThemedText>
                <ThemedText style={{ ...Typography.small, color: palette.muted }}>
                  Member can rejoin later with an invite
                </ThemedText>
              </View>
            </Clickable>

            <Clickable
              style={[styles.dangerRow, { borderColor: palette.error, backgroundColor: withAlpha(palette.error, 0.03) }]}
              onPress={handleBanMember}
            >
              <Ionicons name="ban-outline" size={20} color={palette.error} />
              <View style={{ flex: 1 }}>
                <ThemedText style={{ color: palette.error, fontWeight: '600' }}>
                  Ban from Club
                </ThemedText>
                <ThemedText style={{ ...Typography.small, color: palette.muted }}>
                  Permanently prevents this member from rejoining
                </ThemedText>
              </View>
            </Clickable>
          </SurfaceCard>
        )}

        {/* Non-admin info */}
        {!canManage && (
          <SurfaceCard style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle-outline" size={20} color={palette.muted} />
              <ThemedText style={{ ...Typography.small, color: palette.muted }}>
                Only club admins and coaches can manage member settings.
              </ThemedText>
            </View>
          </SurfaceCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    ...Typography.heading,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.md,
    paddingBottom: Spacing.xl * 2,
  },
  profileCard: {
    gap: Spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  profileAvatar: {
    width: Components.avatar.lg,
    height: Components.avatar.lg,
    borderRadius: Components.avatar.lg / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  profileAvatarText: {
    ...Typography.display,
  },
  profileInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.pill,
    alignSelf: 'flex-start',
  },
  roleDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  roleText: {
    ...Typography.caption,
  },
  detailsRow: {
    borderTopWidth: 1,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sectionCard: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  squadList: {
    gap: Spacing.xs,
  },
  squadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  squadIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squadInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  squadToggle: {
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rolePickerContainer: {
    gap: Spacing.xs,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  roleOptionDot: {
    width: 12,
    height: 12,
    borderRadius: Radii.sm,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
});
