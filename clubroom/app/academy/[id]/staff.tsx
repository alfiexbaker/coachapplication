import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { createLogger } from '@/utils/logger';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { StaffRolePicker } from '@/components/academy/staff-role-picker';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { academyService } from '@/services/academy-service';
import type { Academy, AcademyMembership, AcademyPermission } from '@/constants/types';

const logger = createLogger('AcademyStaffScreen');

export default function AcademyStaffScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [academy, setAcademy] = useState<Academy | null>(null);
  const [staff, setStaff] = useState<AcademyMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [userMembership, setUserMembership] = useState<AcademyMembership | null>(null);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteRole, setInviteRole] = useState<AcademyMembership['role']>('COACH');
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  // Edit member modal state
  const [editingMember, setEditingMember] = useState<AcademyMembership | null>(null);
  const [editRole, setEditRole] = useState<AcademyMembership['role']>('COACH');

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [academyData, staffData] = await Promise.all([
        academyService.getAcademy(id),
        academyService.getStaff(id),
      ]);
      setAcademy(academyData);
      setStaff(staffData);

      if (currentUser?.id) {
        const membership = staffData.find((m) => m.userId === currentUser.id);
        setUserMembership(membership || null);
      }
    } catch (error) {
      logger.error('Failed to load staff:', error);
    } finally {
      setLoading(false);
    }
  }, [id, currentUser?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isOwner = userMembership?.role === 'OWNER';
  const canManageStaff = isOwner || userMembership?.permissions.includes('MANAGE_STAFF');

  const getPermissionsForRole = (role: AcademyMembership['role']): AcademyPermission[] => {
    switch (role) {
      case 'OWNER':
        return ['MANAGE_STAFF', 'MANAGE_SETTINGS', 'CREATE_SESSIONS', 'VIEW_ANALYTICS', 'MANAGE_BILLING', 'POST_AS_ACADEMY', 'INVITE_MEMBERS'];
      case 'ADMIN':
        return ['MANAGE_STAFF', 'CREATE_SESSIONS', 'VIEW_ANALYTICS', 'POST_AS_ACADEMY', 'INVITE_MEMBERS'];
      case 'HEAD_COACH':
        return ['CREATE_SESSIONS', 'VIEW_ANALYTICS', 'POST_AS_ACADEMY'];
      case 'COACH':
        return ['CREATE_SESSIONS', 'POST_AS_ACADEMY'];
      case 'ASSISTANT':
        return [];
      default:
        return [];
    }
  };

  const handleCreateInvite = async () => {
    if (!academy || !currentUser) return;

    setCreatingInvite(true);
    try {
      const permissions = getPermissionsForRole(inviteRole);
      const invite = await academyService.createInvite(
        academy.id,
        academy.name,
        inviteRole,
        permissions,
        currentUser.id,
        currentUser.name || 'Admin',
        30,
        10
      );
      setInviteCode(invite.code);
    } catch (error) {
      logger.error('Failed to create invite:', error);
      Alert.alert('Error', 'Failed to create invite code');
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingMember) return;

    try {
      const permissions = getPermissionsForRole(editRole);
      await academyService.updateMemberRole(editingMember.id, editRole, permissions);
      setEditingMember(null);
      await loadData();
      Alert.alert('Success', 'Role updated successfully');
    } catch (error) {
      logger.error('Failed to update role:', error);
      Alert.alert('Error', 'Failed to update role');
    }
  };

  const handleRemoveMember = async (member: AcademyMembership) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.userName} from this academy?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await academyService.removeMember(member.id);
              await loadData();
            } catch (error) {
              logger.error('Failed to remove member:', error);
              Alert.alert('Error', 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const roleColors: Record<AcademyMembership['role'], string> = {
    OWNER: '#7C3AED',
    ADMIN: '#0284C7',
    HEAD_COACH: '#059669',
    COACH: palette.tint,
    ASSISTANT: '#6B7280',
    MEMBER: '#9CA3AF',
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title">Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerTitle}>
          <ThemedText type="title">Staff</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            {academy?.name}
          </ThemedText>
        </View>
        {canManageStaff && (
          <Clickable
            onPress={() => {
              setInviteCode('');
              setShowInviteModal(true);
            }}
            style={[styles.inviteButton, { backgroundColor: palette.tint }]}
          >
            <Ionicons name="person-add" size={18} color={Colors.light.onPrimary} />
          </Clickable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {staff.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No staff members"
            message="Invite coaches to join your academy"
            actionLabel="Create Invite"
            onPressAction={() => setShowInviteModal(true)}
          />
        ) : (
          <View style={styles.list}>
            {staff.map((member, index) => (
              <Animated.View key={member.id} entering={FadeInDown.delay(index * 50).springify()}>
                <SurfaceCard
                  style={styles.staffCard}
                  onPress={canManageStaff && member.role !== 'OWNER' ? () => {
                    setEditingMember(member);
                    setEditRole(member.role);
                  } : undefined}
                >
                  <View style={styles.staffMain}>
                    <View style={[styles.avatar, { backgroundColor: withAlpha(roleColors[member.role], 0.12) }]}>
                      <ThemedText style={[styles.avatarText, { color: roleColors[member.role] }]}>
                        {member.userName.slice(0, 2).toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={styles.staffInfo}>
                      <ThemedText type="defaultSemiBold">{member.userName}</ThemedText>
                      <View style={[styles.roleBadge, { backgroundColor: withAlpha(roleColors[member.role], 0.09) }]}>
                        <ThemedText style={[styles.roleText, { color: roleColors[member.role] }]}>
                          {academyService.formatRole(member.role)}
                        </ThemedText>
                      </View>
                    </View>
                    {canManageStaff && member.role !== 'OWNER' && (
                      <Ionicons name="chevron-forward" size={20} color={palette.muted} />
                    )}
                  </View>
                </SurfaceCard>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Invite Modal */}
      <Modal visible={showInviteModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: palette.surface }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title">Invite Staff</ThemedText>
              <Clickable onPress={() => setShowInviteModal(false)}>
                <Ionicons name="close" size={24} color={palette.text} />
              </Clickable>
            </View>

            {inviteCode ? (
              <View style={styles.inviteCodeSection}>
                <ThemedText style={[styles.inviteCodeLabel, { color: palette.muted }]}>
                  Share this code with your staff:
                </ThemedText>
                <View style={[styles.inviteCodeBox, { backgroundColor: palette.background }]}>
                  <ThemedText type="heading" style={styles.inviteCodeText}>
                    {inviteCode}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.inviteCodeHint, { color: palette.muted }]}>
                  Valid for 30 days, up to 10 uses
                </ThemedText>
                <Button onPress={() => setShowInviteModal(false)}>Done</Button>
              </View>
            ) : (
              <>
                <ThemedText style={styles.modalLabel}>Select Role</ThemedText>
                <StaffRolePicker selectedRole={inviteRole} onSelectRole={setInviteRole} />
                <Button onPress={handleCreateInvite} disabled={creatingInvite}>
                  {creatingInvite ? 'Creating...' : 'Create Invite Code'}
                </Button>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Member Modal */}
      <Modal visible={!!editingMember} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: palette.surface }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title">Edit Member</ThemedText>
              <Clickable onPress={() => setEditingMember(null)}>
                <Ionicons name="close" size={24} color={palette.text} />
              </Clickable>
            </View>

            {editingMember && (
              <>
                <ThemedText style={[styles.editingName, { color: palette.muted }]}>
                  {editingMember.userName}
                </ThemedText>
                <ThemedText style={styles.modalLabel}>Change Role</ThemedText>
                <StaffRolePicker selectedRole={editRole} onSelectRole={setEditRole} />

                <View style={styles.modalActions}>
                  <Button onPress={handleUpdateRole}>Update Role</Button>
                  <Clickable
                    onPress={() => {
                      setEditingMember(null);
                      handleRemoveMember(editingMember);
                    }}
                    style={[styles.removeButton, { borderColor: palette.error }]}
                  >
                    <ThemedText style={{ color: palette.error, fontWeight: '600' }}>
                      Remove from Academy
                    </ThemedText>
                  </Clickable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  headerTitle: {
    flex: 1,
  },
  subtitle: {
    ...Typography.small,
    marginTop: Spacing.micro,
  },
  inviteButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.lg,
  },
  list: {
    gap: Spacing.sm,
  },
  staffCard: {
    padding: Spacing.md,
  },
  staffMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.subheading,
  },
  staffInfo: {
    flex: 1,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
    marginTop: Spacing.xxs,
  },
  roleText: {
    ...Typography.caption,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalLabel: {
    ...Typography.smallSemiBold,
    marginTop: Spacing.sm,
  },
  editingName: {
    ...Typography.bodySmall,
    marginTop: -Spacing.xs,
  },
  inviteCodeSection: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  inviteCodeLabel: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
  inviteCodeBox: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: Radii.md,
  },
  inviteCodeText: {
    ...Typography.display,
    letterSpacing: 4,
  },
  inviteCodeHint: {
    ...Typography.caption,
  },
  modalActions: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  removeButton: {
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
  },
});
