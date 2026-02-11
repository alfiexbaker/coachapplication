/**
 * Hook: useVerification
 *
 * Manages verification hub screen state: load status, compute progress.
 * Used by app/verification/index.tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { verificationService } from '@/services/verification-service';
import { createLogger } from '@/utils/logger';
import type { VerificationStatus, VerificationItem } from '@/constants/types';

const logger = createLogger('useVerification');
const COACH_ID = 'coach1';

export function useVerification() {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    const result = await verificationService.getStatus(COACH_ID);
    if (result.success) {
      setStatus(result.data);
    } else {
      logger.error('Failed to load verification status:', result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const progress = status ? verificationService.getProgressPercentage(status) : 0;
  const hasCredentials = (status?.credentials.length ?? 0) > 0;

  const credentialStatus: VerificationItem = hasCredentials
    ? status!.credentials.some((c) => c.status === 'VERIFIED')
      ? { status: 'VERIFIED' }
      : status!.credentials.some((c) => c.status === 'PENDING')
        ? { status: 'PENDING' }
        : { status: 'NOT_STARTED' }
    : { status: 'NOT_STARTED' };

  const handleEmailVerify = useCallback(() => {
    if (!status) return;
    if (status.email.status === 'VERIFIED') {
      Alert.alert('Email Verified', 'Your email is already verified.');
    } else {
      Alert.alert('Verify Email', 'We will send a verification code to your email address.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Code',
          onPress: () => Alert.alert('Code Sent', 'Check your inbox for the verification code.'),
        },
      ]);
    }
  }, [status]);

  const handlePhoneVerify = useCallback(() => {
    if (!status) return;
    if (status.phone.status === 'VERIFIED') {
      Alert.alert('Phone Verified', 'Your phone number is already verified.');
    } else {
      Alert.alert('Verify Phone', 'We will send an SMS verification code to your phone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send SMS',
          onPress: () => Alert.alert('Code Sent', 'Check your messages for the verification code.'),
        },
      ]);
    }
  }, [status]);

  const handleInsurancePress = useCallback(() => {
    if (!status) return;
    if (status.insurance.status === 'VERIFIED') {
      Alert.alert('Insurance Verified', 'Your insurance documents are verified and up to date.');
    } else {
      Alert.alert(
        'Upload Insurance',
        'Upload your public liability insurance certificate to get verified.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upload', onPress: () => router.push(Routes.VERIFICATION_INSURANCE) },
        ],
      );
    }
  }, [status]);

  const navigateToId = useCallback(() => router.push(Routes.VERIFICATION_ID), []);
  const navigateToBackground = useCallback(() => router.push(Routes.VERIFICATION_BACKGROUND), []);
  const navigateToCredentials = useCallback(() => router.push(Routes.VERIFICATION_CREDENTIALS), []);

  return {
    status,
    loading,
    progress,
    hasCredentials,
    credentialStatus,
    loadStatus,
    handleEmailVerify,
    handlePhoneVerify,
    handleInsurancePress,
    navigateToId,
    navigateToBackground,
    navigateToCredentials,
  };
}
