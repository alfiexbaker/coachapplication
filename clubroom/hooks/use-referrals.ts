/**
 * Hook for the Referrals Dashboard screen.
 * Manages referral code, stats, history loading, and navigation.
 */

import { useCallback } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { referralService } from '@/services/referral-service';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import type { ReferralCode, Referral, ReferralStats } from '@/constants/types';

const logger = createLogger('ReferralsDashboardScreen');

interface ReferralsData {
  referralCode: ReferralCode | null;
  stats: ReferralStats | null;
  referrals: Referral[];
}

export function useReferrals() {
  const { currentUser } = useAuth();

  const userId = currentUser?.id ?? 'parent1';
  const userName = currentUser?.fullName ?? currentUser?.name ?? 'User';

  const loadData = useCallback(async () => {
    try {
      const [codeResult, statsResult, history] = await Promise.all([
        referralService.getUserCode(userId, userName),
        referralService.getReferralStats(userId),
        referralService.getReferralHistory(userId),
      ]);

      return ok<ReferralsData>({
        referralCode: codeResult.success ? codeResult.data : null,
        stats: statsResult.success ? statsResult.data : null,
        referrals: history,
      });
    } catch (error) {
      logger.error('Failed to load referral data:', error);
      return err(serviceError('UNKNOWN', 'Failed to load referral data.', error));
    }
  }, [userId, userName]);

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<ReferralsData>({
    load: loadData,
    deps: [userId, userName],
    isEmpty: (value) => !value.referralCode && value.referrals.length === 0,
    refetchOnFocus: true,
  });

  const handleInvitePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(Routes.REFERRALS_INVITE);
  }, []);

  const handleReferralPress = useCallback((_referral: Referral) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleViewAll = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  return {
    referralCode: data?.referralCode ?? null,
    stats: data?.stats ?? null,
    referrals: data?.referrals ?? [],
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    loading: status === 'loading',
    refreshing,
    userName,
    handleRefresh: onRefresh,
    retry,
    handleInvitePress,
    handleReferralPress,
    handleViewAll,
  };
}
