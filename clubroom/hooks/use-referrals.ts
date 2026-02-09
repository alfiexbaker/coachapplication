/**
 * Hook for the Referrals Dashboard screen.
 * Manages referral code, stats, history loading, and navigation.
 */

import { useState, useCallback } from 'react';
import { useFocusEffect, router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/use-auth';
import { referralService } from '@/services/referral-service';
import { createLogger } from '@/utils/logger';
import type { ReferralCode, Referral, ReferralStats } from '@/constants/types';

const logger = createLogger('ReferralsDashboardScreen');

export function useReferrals() {
  const { currentUser } = useAuth();

  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userId = currentUser?.id ?? 'parent1';
  const userName = currentUser?.fullName ?? currentUser?.name ?? 'User';

  const loadData = useCallback(async () => {
    try {
      const [codeResult, statsResult, history] = await Promise.all([
        referralService.getUserCode(userId, userName),
        referralService.getReferralStats(userId),
        referralService.getReferralHistory(userId),
      ]);
      if (codeResult.success) setReferralCode(codeResult.data);
      else logger.error('Failed to load referral code:', codeResult.error);
      if (statsResult.success) setStats(statsResult.data);
      else logger.error('Failed to load referral stats:', statsResult.error);
      setReferrals(history);
    } catch (error) {
      logger.error('Failed to load referral data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, userName]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

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
    referralCode, stats, referrals, loading, refreshing, userName,
    handleRefresh, handleInvitePress, handleReferralPress, handleViewAll,
  };
}
