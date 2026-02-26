/**
 * Hook for the Referral Invite screen.
 * Manages referral code loading, clipboard operations, and share state.
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { referralService } from '@/services/referral-service';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import type { ReferralCode } from '@/constants/types';

const logger = createLogger('ReferralInviteScreen');

export function useReferralInvite() {
  const { currentUser } = useAuth();

  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [isDemoData, setIsDemoData] = useState(false);

  const userId = currentUser?.id ?? 'parent1';
  const userName = currentUser?.fullName ?? currentUser?.name ?? 'User';

  const loadCode = useCallback(async () => {
    try {
      const demo = await referralService.isUsingDemoData();
      setIsDemoData(demo);
      const result = await referralService.getUserCode(userId, userName);
      if (!result.success) {
        logger.error('Failed to load referral code:', result.error);
        return err(serviceError('UNKNOWN', 'Failed to load your referral code.', result.error));
      }
      return ok<ReferralCode | null>(result.data);
    } catch (error) {
      logger.error('Failed to load referral code:', error);
      return err(serviceError('UNKNOWN', 'Failed to load your referral code.', error));
    }
  }, [userId, userName]);

  const {
    data: referralCode,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<ReferralCode | null>({
    load: loadCode,
    deps: [userId, userName],
    isEmpty: (value) => !value,
    refetchOnFocus: true,
  });

  const handleCopyCode = useCallback(async () => {
    if (!referralCode) return;
    try {
      await Clipboard.setStringAsync(referralCode.code);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert('Error', 'Failed to copy code');
    }
  }, [referralCode]);

  const handleCopyLink = useCallback(async () => {
    if (!referralCode) return;
    try {
      const url = referralService.getShareUrl(referralCode.code);
      await Clipboard.setStringAsync(url);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      Alert.alert('Error', 'Failed to copy link');
    }
  }, [referralCode]);

  const creditAmount = referralCode?.creditAmount ?? 10;
  const creditText = referralService.formatCredit(creditAmount);

  return {
    referralCode: referralCode ?? null,
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    loading: status === 'loading',
    refreshing,
    onRefresh,
    retry,
    copied,
    linkCopied,
    userName,
    creditAmount,
    creditText,
    isDemoData,
    handleCopyCode,
    handleCopyLink,
  };
}
