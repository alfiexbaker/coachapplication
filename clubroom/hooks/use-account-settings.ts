import { useState } from 'react';

import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import { uiFeedback } from '@/services/ui-feedback';
import { userService } from '@/services/user-service';
import { authService } from '@/services/auth-service';
import { buildMailtoUrl, openExternalUrl } from '@/utils/external-url';
import { formatSupportRef } from '@/utils/support-ref';

const logger = createLogger('useAccountSettings');
const SUPPORT_EMAIL = 'support@clubroom.app';

export function useAccountSettings() {
  const { currentUser } = useAuth();

  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(
    (currentUser as unknown as Record<string, string>)?.phone || '',
  );

  const handleSaveEmail = async () => {
    if (!currentUser?.id) return;

    logger.press('SaveEmail', { email });
    const nextEmail = email.trim();
    if (!apiClient.isMockMode) {
      const result = await authService.updateProfile({ email: nextEmail });
      if (!result.success) {
        uiFeedback.showToast(result.error.message, 'error');
        return;
      }

      setEditingEmail(false);
      uiFeedback.showToast(
        'Email updated. Verification stays managed separately from this field in the current build.',
        'success',
      );
      return;
    }

    const result = await userService.updateUserProfile(currentUser.id, { email: nextEmail });
    if (!result.success) {
      uiFeedback.showToast(result.error.message, 'error');
      return;
    }

    await apiClient.set(STORAGE_KEYS.AUTH_USER, {
      ...currentUser,
      email: result.data.email,
    });
    setEditingEmail(false);
    uiFeedback.showToast(
      'Email updated. Verification stays managed separately from this field in the current build.',
      'success',
    );
  };

  const handleSavePhone = async () => {
    if (!currentUser?.id) return;

    logger.press('SavePhone', { phone });
    const nextPhone = phone.trim();
    if (!apiClient.isMockMode) {
      const result = await authService.updateProfile({ phone: nextPhone });
      if (!result.success) {
        uiFeedback.showToast(result.error.message, 'error');
        return;
      }

      setEditingPhone(false);
      uiFeedback.showToast(
        'Phone number updated. Any verification review is handled separately from this field.',
        'success',
      );
      return;
    }

    const result = await userService.updateUserProfile(currentUser.id, {
      phone: nextPhone,
    });
    if (!result.success) {
      uiFeedback.showToast(result.error.message, 'error');
      return;
    }

    await apiClient.set(STORAGE_KEYS.AUTH_USER, {
      ...currentUser,
      phone: nextPhone,
    });
    setEditingPhone(false);
    uiFeedback.showToast(
      'Phone number updated. Any verification review is handled separately from this field.',
      'success',
    );
  };

  const handleChangePassword = () => {
    logger.press('ChangePassword');

    const body = [
      'I need help resetting the password for my Clubroom account.',
      '',
      `Support ref: ${formatSupportRef(currentUser?.id)}`,
      `Email on file: ${email.trim() || currentUser?.email || 'not set'}`,
    ].join('\n');

    void openExternalUrl(
      buildMailtoUrl(SUPPORT_EMAIL, {
        subject: 'Clubroom password reset request',
        body,
      }),
      'Could not open your email app right now.',
    );
  };

  const handleRequestLifecycleSupport = (mode: 'pause' | 'close') => {
    const subject =
      mode === 'pause'
        ? 'Clubroom account pause request'
        : 'Clubroom account closure request';
    const intro =
      mode === 'pause'
        ? 'I would like support to pause my Clubroom account.'
        : 'I would like support to close my Clubroom account.';
    const body = [
      intro,
      '',
      `Support ref: ${formatSupportRef(currentUser?.id)}`,
      `Email on file: ${email.trim() || currentUser?.email || 'not set'}`,
    ].join('\n');

    void openExternalUrl(
      buildMailtoUrl(SUPPORT_EMAIL, {
        subject,
        body,
      }),
      'Could not open your email app right now.',
    );
  };

  const handleDeleteAccount = () => {
    logger.press('DeleteAccount');
    uiFeedback.alert(
      'Request Account Closure',
      'Account closure is handled by support in this build. We will open an email draft so you can send the request with the correct account details.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => handleRequestLifecycleSupport('close'),
        },
      ],
    );
  };

  const handleDeactivateAccount = () => {
    logger.press('DeactivateAccount');
    uiFeedback.alert(
      'Request Account Pause',
      'Temporary account pausing is handled by support in this build. We will open an email draft so you can request it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => handleRequestLifecycleSupport('pause'),
        },
      ],
    );
  };

  return {
    currentUser,
    editingEmail,
    editingPhone,
    email,
    phone,
    setEditingEmail,
    setEditingPhone,
    setEmail,
    setPhone,
    handleSaveEmail,
    handleSavePhone,
    handleChangePassword,
    handleDeleteAccount,
    handleDeactivateAccount,
  };
}
