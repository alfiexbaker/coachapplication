/**
 * useFamilySharing — All state, data loading, and handlers for the Family Sharing screen.
 */
import { useState, useCallback } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { familyService } from '@/services/family';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import type {
  FamilyAccount,
  FamilyGuardian,
  GuardianRole,
  GuardianPermission,
} from '@/constants/types';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('FamilySharing');
const EMAIL_REGEX = /^(?!\.)(?!.*\.\.)([A-Za-z0-9._%+-]+)@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

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

  const [showInviteModal, setShowInviteModal] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<GuardianRole>('GUARDIAN');
  const [inviteRelationship, setInviteRelationship] = useState('Co-parent');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteEmailTouched, setInviteEmailTouched] = useState(false);

  const loadFamilyData = useCallback(async () => {
    if (!currentUser?.id) {
      return ok<FamilyAccount | null>(null);
    }

    try {
      const account = await familyService.getFamilyAccount(
        currentUser.id,
        currentUser.fullName || 'Parent',
      );
      return ok<FamilyAccount | null>(account);
    } catch (error) {
      logger.error('Failed to load family data', error);
      return err(serviceError('UNKNOWN', 'Failed to load family sharing settings.', error));
    }
  }, [currentUser?.id, currentUser?.fullName]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<FamilyAccount | null>({
    load: loadFamilyData,
    deps: [currentUser?.id],
    isEmpty: (value) => !value,
    refetchOnFocus: true,
  });

  const family = data ?? null;
  const normalizedInviteEmail = inviteEmail.trim().toLowerCase();
  const duplicateInvite =
    family?.pendingInvites.some(
      (invite) => invite.inviteeEmail.toLowerCase() === normalizedInviteEmail,
    ) ??
    false;
  const inviteEmailError =
    !inviteEmailTouched || normalizedInviteEmail.length === 0
      ? null
      : duplicateInvite
        ? 'This email has already been invited'
        : !EMAIL_REGEX.test(normalizedInviteEmail)
          ? 'Enter a valid email address'
          : null;

  const resetInviteForm = useCallback(() => {
    setInviteEmail('');
    setInviteName('');
    setInviteRole('GUARDIAN');
    setInviteRelationship('Co-parent');
    setInviteMessage('');
    setInviteEmailTouched(false);
  }, []);

  const handleInvite = useCallback(async () => {
    if (!family || !currentUser) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      uiFeedback.alert('Error', 'Please enter an email address');
      return;
    }
    setInviteEmailTouched(true);
    if (duplicateInvite) {
      uiFeedback.alert('Error', 'This email has already been invited');
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      uiFeedback.alert('Error', 'Please enter a valid email address');
      return;
    }
    setInviting(true);
    try {
      await familyService.inviteGuardian(
        family.id,
        currentUser.id,
        currentUser.fullName || 'Parent',
        email,
        inviteName.trim() || 'Guardian',
        inviteRole,
        inviteRelationship,
        [],
        inviteMessage.trim() || undefined,
      );
      uiFeedback.alert(
        'Invitation Sent',
        `An invitation has been sent to ${email}. They'll receive instructions to join your family account.`,
      );
      setShowInviteModal(false);
      resetInviteForm();
      onRefresh();
      logger.success('InviteSent', { email, role: inviteRole });
    } catch (error: unknown) {
      logger.error('Failed to send invite', error);
      uiFeedback.alert('Error', error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  }, [
    family,
    currentUser,
    inviteEmail,
    duplicateInvite,
    inviteName,
    inviteRole,
    inviteRelationship,
    inviteMessage,
    resetInviteForm,
    loadFamilyData,
  ]);

  const handleRemoveGuardian = useCallback(
    (guardian: FamilyGuardian) => {
      if (!family || !currentUser) return;
      const guardianLabel = guardian.userId || 'Guardian';
      uiFeedback.alert(
        'Remove Guardian',
        `Are you sure you want to remove ${guardianLabel} from your family account? They will no longer be able to access your children's information.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await familyService.removeGuardian(family.id, currentUser.id, guardian.id);
                uiFeedback.alert(
                  'Removed',
                  `${guardianLabel} has been removed from your family account.`,
                );
                onRefresh();
              } catch (error: unknown) {
                uiFeedback.alert(
                  'Error',
                  error instanceof Error ? error.message : 'Failed to remove guardian',
                );
              }
            },
          },
        ],
      );
    },
    [family, currentUser, onRefresh],
  );

  const handleCancelInvite = useCallback(
    (inviteId: string, email: string) => {
      if (!family || !currentUser) return;
      uiFeedback.alert('Cancel Invitation', `Cancel the invitation to ${email}?`, [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Invite',
          style: 'destructive',
          onPress: async () => {
            try {
              await familyService.cancelInvite(family.id, currentUser.id, inviteId);
              onRefresh();
            } catch (error: unknown) {
              uiFeedback.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to cancel invitation',
              );
            }
          },
        },
      ]);
    },
    [family, currentUser, onRefresh],
  );

  return {
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    loading: status === 'loading',
    refreshing,
    onRefresh,
    retry,
    family,
    showInviteModal,
    setShowInviteModal,
    inviteEmail,
    setInviteEmail,
    inviteEmailTouched,
    setInviteEmailTouched,
    inviteEmailError,
    inviteName,
    setInviteName,
    inviteRole,
    setInviteRole,
    inviteRelationship,
    setInviteRelationship,
    inviteMessage,
    setInviteMessage,
    inviting,
    handleInvite,
    handleRemoveGuardian,
    handleCancelInvite,
  };
}
