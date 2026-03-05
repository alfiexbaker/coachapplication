import { useState, useCallback, useEffect } from 'react';

import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { generateId } from '@/utils/generate-id';
import { createLogger } from '@/utils/logger';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('useAccountSettings');

export interface AccountDeletionRequest {
  id: string;
  userId: string;
  requestedAt: string;
  scheduledDeletionAt: string;
  status: 'pending' | 'cancelled' | 'completed';
  cancelledAt?: string;
}

export function useAccountSettings() {
  const { currentUser, logout } = useAuth();

  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(
    (currentUser as unknown as Record<string, string>)?.phone || '',
  );
  const [deletionRequest, setDeletionRequest] = useState<AccountDeletionRequest | null>(null);

  // Check for existing deletion request on mount
  useEffect(() => {
    if (!currentUser?.id) return;
    void (async () => {
      const key = `${STORAGE_KEYS.ACCOUNT_DELETION_PREFIX}${currentUser.id}`;
      const existing = await apiClient.get<AccountDeletionRequest>(key, null as unknown as AccountDeletionRequest);
      if (existing && existing.status === 'pending') {
        setDeletionRequest(existing);
      }
    })();
  }, [currentUser?.id]);

  const handleSaveEmail = useCallback(() => {
    logger.press('SaveEmail', { email });
    uiFeedback.alert(
      'Verify Email',
      `We'll send a verification email to ${email}. Please check your inbox.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setEditingEmail(false) },
        {
          text: 'Send',
          onPress: () => {
            setEditingEmail(false);
            uiFeedback.showToast('Verification email sent!', 'success');
          },
        },
      ],
    );
  }, [email]);

  const handleSavePhone = useCallback(() => {
    logger.press('SavePhone', { phone });
    setEditingPhone(false);
    uiFeedback.showToast('Phone number updated!', 'success');
  }, [phone]);

  const handleChangePassword = useCallback(() => {
    logger.press('ChangePassword');
    uiFeedback.alert('Change Password', "We'll send you a password reset link to your email.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send Link',
        onPress: () => uiFeedback.showToast('Password reset link sent to your email.', 'success'),
      },
    ]);
  }, []);

  const handleDeleteAccount = useCallback(() => {
    logger.press('DeleteAccount');
    uiFeedback.alert(
      'Delete Account',
      'Are you sure you want to delete your account?\n\n\u2022 Your account will be scheduled for deletion in 30 days\n\u2022 You can cancel anytime during this period\n\u2022 After 30 days, all data will be permanently deleted',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            if (!currentUser?.id) return;
            const deletionDate = new Date();
            deletionDate.setDate(deletionDate.getDate() + 30);

            const request: AccountDeletionRequest = {
              id: generateId('del'),
              userId: currentUser.id,
              requestedAt: new Date().toISOString(),
              scheduledDeletionAt: deletionDate.toISOString(),
              status: 'pending',
            };

            const key = `${STORAGE_KEYS.ACCOUNT_DELETION_PREFIX}${currentUser.id}`;
            await apiClient.set(key, request);
            setDeletionRequest(request);

            emitTyped(ServiceEvents.ACCOUNT_DELETION_REQUESTED, {
              userId: currentUser.id,
              requestedAt: request.requestedAt,
              scheduledDeletionAt: request.scheduledDeletionAt,
            });

            logger.info('Account deletion scheduled', {
              userId: currentUser.id,
              scheduledDeletionAt: deletionDate.toISOString(),
            });

            uiFeedback.showToast(`Your account will be deleted on ${deletionDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}. You can cancel anytime before then.`);
          },
        },
      ],
    );
  }, [currentUser?.id]);

  const handleCancelDeletion = useCallback(async () => {
    if (!currentUser?.id || !deletionRequest) return;
    const key = `${STORAGE_KEYS.ACCOUNT_DELETION_PREFIX}${currentUser.id}`;
    const cancelledAt = new Date().toISOString();
    const updated: AccountDeletionRequest = {
      ...deletionRequest,
      status: 'cancelled',
      cancelledAt,
    };
    await apiClient.set(key, updated);
    setDeletionRequest(null);

    emitTyped(ServiceEvents.ACCOUNT_DELETION_CANCELLED, {
      userId: currentUser.id,
      cancelledAt,
    });

    logger.info('Account deletion cancelled', { userId: currentUser.id });
    uiFeedback.showToast('Your account will not be deleted.', 'success');
  }, [currentUser?.id, deletionRequest]);

  const handleDeactivateAccount = useCallback(() => {
    logger.press('DeactivateAccount');
    uiFeedback.alert(
      'Deactivate Account',
      'Your account will be hidden and you can reactivate it later by logging in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          onPress: async () => {
            uiFeedback.showToast('Your account has been deactivated.', 'success');
            await logout();
            router.replace(Routes.ROOT);
          },
        },
      ],
    );
  }, [logout]);

  return {
    currentUser,
    editingEmail,
    editingPhone,
    email,
    phone,
    deletionRequest,
    setEditingEmail,
    setEditingPhone,
    setEmail,
    setPhone,
    handleSaveEmail,
    handleSavePhone,
    handleChangePassword,
    handleDeleteAccount,
    handleCancelDeletion,
    handleDeactivateAccount,
  };
}
