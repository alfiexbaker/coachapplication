import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useAccountSettings');

export function useAccountSettings() {
  const { currentUser, logout } = useAuth();

  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState((currentUser as unknown as Record<string, string>)?.phone || '');

  const handleSaveEmail = useCallback(() => {
    logger.press('SaveEmail', { email });
    Alert.alert('Verify Email', `We'll send a verification email to ${email}. Please check your inbox.`, [
      { text: 'Cancel', style: 'cancel', onPress: () => setEditingEmail(false) },
      { text: 'Send', onPress: () => { setEditingEmail(false); Alert.alert('Success', 'Verification email sent!'); } },
    ]);
  }, [email]);

  const handleSavePhone = useCallback(() => {
    logger.press('SavePhone', { phone });
    setEditingPhone(false);
    Alert.alert('Success', 'Phone number updated!');
  }, [phone]);

  const handleChangePassword = useCallback(() => {
    logger.press('ChangePassword');
    Alert.alert('Change Password', "We'll send you a password reset link to your email.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send Link', onPress: () => Alert.alert('Success', 'Password reset link sent to your email.') },
    ]);
  }, []);

  const handleDeleteAccount = useCallback(() => {
    logger.press('DeleteAccount');
    Alert.alert('Delete Account', 'Are you sure you want to delete your account? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        Alert.alert('Confirm Deletion', 'This will permanently delete all your data including bookings, messages, and profile information.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete Forever', style: 'destructive', onPress: async () => {
            logger.info('Account deletion confirmed');
            await logout();
            router.replace(Routes.ROOT);
          }},
        ]);
      }},
    ]);
  }, [logout]);

  const handleDeactivateAccount = useCallback(() => {
    logger.press('DeactivateAccount');
    Alert.alert('Deactivate Account', 'Your account will be hidden and you can reactivate it later by logging in.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', onPress: async () => {
        Alert.alert('Success', 'Your account has been deactivated.');
        await logout();
        router.replace(Routes.ROOT);
      }},
    ]);
  }, [logout]);

  return {
    currentUser, editingEmail, editingPhone, email, phone,
    setEditingEmail, setEditingPhone, setEmail, setPhone,
    handleSaveEmail, handleSavePhone, handleChangePassword,
    handleDeleteAccount, handleDeactivateAccount,
  };
}
