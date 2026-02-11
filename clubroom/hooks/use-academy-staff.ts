/**
 * Hook: useAcademyStaff
 *
 * Manages academy staff screen state: load staff, invite, edit role, remove member.
 * Used by app/academy/[id]/staff.tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';

import { useAuth } from '@/hooks/use-auth';
import { academyService } from '@/services/academy-service';
import type { Academy, AcademyMembership, AcademyPermission } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useAcademyStaff');

// Decorative: staff role hierarchy colors
export const ROLE_COLORS = {
  OWNER: '#7C3AED',
  ADMIN: '#0284C7',
  HEAD_COACH: '#059669',
  ASSISTANT: '#6B7280',
  MEMBER: '#9CA3AF',
} as const;

function getPermissionsForRole(role: AcademyMembership['role']): AcademyPermission[] {
  switch (role) {
    case 'OWNER': return ['MANAGE_STAFF', 'MANAGE_SETTINGS', 'CREATE_SESSIONS', 'VIEW_ANALYTICS', 'MANAGE_BILLING', 'POST_AS_ACADEMY', 'INVITE_MEMBERS'];
    case 'ADMIN': return ['MANAGE_STAFF', 'CREATE_SESSIONS', 'VIEW_ANALYTICS', 'POST_AS_ACADEMY', 'INVITE_MEMBERS'];
    case 'HEAD_COACH': return ['CREATE_SESSIONS', 'VIEW_ANALYTICS', 'POST_AS_ACADEMY'];
    case 'COACH': return ['CREATE_SESSIONS', 'POST_AS_ACADEMY'];
    default: return [];
  }
}

export function useAcademyStaff(id: string | undefined) {
  const { currentUser } = useAuth();

  const [academy, setAcademy] = useState<Academy | null>(null);
  const [staff, setStaff] = useState<AcademyMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [userMembership, setUserMembership] = useState<AcademyMembership | null>(null);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteRole, setInviteRole] = useState<AcademyMembership['role']>('COACH');
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState('');

  // Edit member modal
  const [editingMember, setEditingMember] = useState<AcademyMembership | null>(null);
  const [editRole, setEditRole] = useState<AcademyMembership['role']>('COACH');

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [academyResult, staffResult] = await Promise.all([
        academyService.getAcademy(id),
        academyService.getStaff(id),
      ]);
      if (!academyResult.success) {
        logger.error('Failed to load academy', academyResult.error);
        setAcademy(null);
        setStaff([]);
        return;
      }
      if (!staffResult.success) {
        logger.error('Failed to load academy staff', staffResult.error);
        setAcademy(null);
        setStaff([]);
        return;
      }
      setAcademy(academyResult.data);
      setStaff(staffResult.data);
      if (currentUser?.id) {
        const membership = staffResult.data.find((m) => m.userId === currentUser.id);
        setUserMembership(membership || null);
      }
    } catch (error) {
      logger.error('Failed to load staff:', error);
    } finally {
      setLoading(false);
    }
  }, [id, currentUser?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const isOwner = userMembership?.role === 'OWNER';
  const canManageStaff = isOwner || !!userMembership?.permissions.includes('MANAGE_STAFF');

  const openInviteModal = useCallback(() => {
    setInviteCode('');
    setShowInviteModal(true);
  }, []);

  const handleCreateInvite = useCallback(async () => {
    if (!academy || !currentUser) return;
    setCreatingInvite(true);
    try {
      const permissions = getPermissionsForRole(inviteRole);
      const result = await academyService.createInvite(academy.id, academy.name, inviteRole, permissions, currentUser.id, currentUser.name || 'Admin', 30, 10);
      if (!result.success) {
        Alert.alert('Error', result.error.message);
        return;
      }
      setInviteCode(result.data.code);
    } catch (error) {
      logger.error('Failed to create invite:', error);
      Alert.alert('Error', 'Failed to create invite code');
    } finally {
      setCreatingInvite(false);
    }
  }, [academy, currentUser, inviteRole]);

  const openEditMember = useCallback((member: AcademyMembership) => {
    setEditingMember(member);
    setEditRole(member.role);
  }, []);

  const handleUpdateRole = useCallback(async () => {
    if (!editingMember) return;
    try {
      const permissions = getPermissionsForRole(editRole);
      const result = await academyService.updateMemberRole(editingMember.id, editRole, permissions);
      if (!result.success) {
        Alert.alert('Error', result.error.message);
        return;
      }
      setEditingMember(null);
      await loadData();
      Alert.alert('Success', 'Role updated successfully');
    } catch (error) {
      logger.error('Failed to update role:', error);
      Alert.alert('Error', 'Failed to update role');
    }
  }, [editingMember, editRole, loadData]);

  const handleRemoveMember = useCallback((member: AcademyMembership) => {
    Alert.alert('Remove Member', `Are you sure you want to remove ${member.userId} from this academy?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            const result = await academyService.removeMember(member.id);
            if (!result.success) {
              Alert.alert('Error', result.error.message);
              return;
            }
            await loadData();
          } catch (error) {
            logger.error('Failed to remove member:', error);
            Alert.alert('Error', 'Failed to remove member');
          }
        },
      },
    ]);
  }, [loadData]);

  return {
    academy, staff, loading, canManageStaff,
    showInviteModal, inviteRole, creatingInvite, inviteCode,
    editingMember, editRole,
    setShowInviteModal, setInviteRole, setEditRole, setEditingMember,
    openInviteModal, handleCreateInvite,
    openEditMember, handleUpdateRole, handleRemoveMember,
  };
}
