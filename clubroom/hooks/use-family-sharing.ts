/**
 * useFamilySharing — All state, data loading, and handlers for the Family Sharing screen.
 */
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { familyService } from '@/services/family';
import { createLogger } from '@/utils/logger';
import type { FamilyAccount, FamilyGuardian, GuardianRole, GuardianPermission } from '@/constants/types';

const logger = createLogger('FamilySharing');

export const ROLE_INFO: Record<GuardianRole, { label: string; description: string }> = {
  PRIMARY: { label: 'Primary', description: 'Full access with admin controls' },
  GUARDIAN: { label: 'Guardian', description: 'Can view and book sessions' },
  VIEWER: { label: 'Viewer', description: 'View-only access' },
};

export function getPermissionIcons(permissions: GuardianPermission[]): string[] {
  const icons: string[] = [];
  if (permissions.includes('VIEW_SCHEDULE')) icons.push('calendar-outline');
  if (permissions.includes('BOOK_SESSIONS')) icons.push('add-circle-outline');
  if (permissions.includes('MANAGE_PAYMENTS')) icons.push('wallet-outline');
  if (permissions.includes('ADMIN')) icons.push('shield-outline');
  return icons.slice(0, 3);
}

export function useFamilySharing() {
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState<FamilyAccount | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<GuardianRole>('GUARDIAN');
  const [inviteRelationship, setInviteRelationship] = useState('Co-parent');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviting, setInviting] = useState(false);

  const loadFamilyData = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const account = await familyService.getFamilyAccount(currentUser.id, currentUser.fullName || 'Parent');
      setFamily(account);
    } catch (error) {
      logger.error('Failed to load family data', error);
      Alert.alert('Error', 'Failed to load family sharing settings');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, currentUser?.fullName]);

  useFocusEffect(useCallback(() => { loadFamilyData(); }, [loadFamilyData]));

  const resetInviteForm = useCallback(() => {
    setInviteEmail(''); setInviteName(''); setInviteRole('GUARDIAN');
    setInviteRelationship('Co-parent'); setInviteMessage('');
  }, []);

  const handleInvite = useCallback(async () => {
    if (!family || !currentUser) return;
    if (!inviteEmail.trim()) { Alert.alert('Error', 'Please enter an email address'); return; }
    if (!inviteEmail.includes('@')) { Alert.alert('Error', 'Please enter a valid email address'); return; }
    setInviting(true);
    try {
      await familyService.inviteGuardian(
        family.id, currentUser.id, currentUser.fullName || 'Parent',
        inviteEmail.trim(), inviteName.trim() || 'Guardian', inviteRole,
        inviteRelationship, [], inviteMessage.trim() || undefined
      );
      Alert.alert('Invitation Sent', `An invitation has been sent to ${inviteEmail}. They'll receive instructions to join your family account.`);
      setShowInviteModal(false);
      resetInviteForm();
      loadFamilyData();
      logger.success('InviteSent', { email: inviteEmail, role: inviteRole });
    } catch (error: unknown) {
      logger.error('Failed to send invite', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  }, [family, currentUser, inviteEmail, inviteName, inviteRole, inviteRelationship, inviteMessage, resetInviteForm, loadFamilyData]);

  const handleRemoveGuardian = useCallback((guardian: FamilyGuardian) => {
    if (!family || !currentUser) return;
    const guardianLabel = guardian.userId || 'Guardian';
    Alert.alert('Remove Guardian',
      `Are you sure you want to remove ${guardianLabel} from your family account? They will no longer be able to access your children's information.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await familyService.removeGuardian(family.id, currentUser.id, guardian.id);
            Alert.alert('Removed', `${guardianLabel} has been removed from your family account.`);
            loadFamilyData();
          } catch (error: unknown) { Alert.alert('Error', error instanceof Error ? error.message : 'Failed to remove guardian'); }
        }},
      ]
    );
  }, [family, currentUser, loadFamilyData]);

  const handleCancelInvite = useCallback((inviteId: string, email: string) => {
    if (!family || !currentUser) return;
    Alert.alert('Cancel Invitation', `Cancel the invitation to ${email}?`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel Invite', style: 'destructive', onPress: async () => {
        try { await familyService.cancelInvite(family.id, currentUser.id, inviteId); loadFamilyData(); }
        catch (error: unknown) { Alert.alert('Error', error instanceof Error ? error.message : 'Failed to cancel invitation'); }
      }},
    ]);
  }, [family, currentUser, loadFamilyData]);

  return {
    loading, family, showInviteModal, setShowInviteModal,
    inviteEmail, setInviteEmail, inviteName, setInviteName,
    inviteRole, setInviteRole, inviteRelationship, setInviteRelationship,
    inviteMessage, setInviteMessage, inviting,
    handleInvite, handleRemoveGuardian, handleCancelInvite,
  };
}
