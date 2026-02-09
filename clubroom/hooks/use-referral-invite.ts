/**
 * Hook for the Referral Invite screen.
 * Manages referral code loading, clipboard operations, and share state.
 */

import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/use-auth';
import { referralService } from '@/services/referral-service';
import { createLogger } from '@/utils/logger';
import type { ReferralCode } from '@/constants/types';

const logger = createLogger('ReferralInviteScreen');

export function useReferralInvite() {
  const { currentUser } = useAuth();

  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const userId = currentUser?.id ?? 'parent1';
  const userName = currentUser?.fullName ?? currentUser?.name ?? 'User';

  useEffect(() => {
    async function loadCode() {
      try {
        const result = await referralService.getUserCode(userId, userName);
        if (!result.success) {
          logger.error('Failed to load referral code:', result.error);
          Alert.alert('Error', 'Failed to load your referral code');
          return;
        }
        setReferralCode(result.data);
      } catch (error) {
        logger.error('Failed to load referral code:', error);
        Alert.alert('Error', 'Failed to load your referral code');
      } finally {
        setLoading(false);
      }
    }
    loadCode();
  }, [userId, userName]);

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
    referralCode, loading, copied, linkCopied,
    userName, creditAmount, creditText,
    handleCopyCode, handleCopyLink,
  };
}
