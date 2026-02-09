/**
 * Hook for the Wallet Promo Code screen.
 * Manages promo code redemption, usage history, and wallet balance.
 */

import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { promoService } from '@/services/promo-service';
import { walletService } from '@/services/wallet-service';
import { createLogger } from '@/utils/logger';
import type { PromoCodeUsage } from '@/constants/types';

const logger = createLogger('PromoCodeScreen');

export interface RedeemResult {
  code: string;
  creditAmount: number;
  newBalance: number;
}

export function useWalletPromo() {
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userUsage, setUserUsage] = useState<PromoCodeUsage[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [redeemSuccess, setRedeemSuccess] = useState<RedeemResult | null>(null);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const [usageData, walletBalance] = await Promise.all([
        promoService.getUserUsage(currentUser.id),
        walletService.getBalance(currentUser.id),
      ]);
      setUserUsage(usageData);
      setBalance(walletBalance);
    } catch (error) {
      logger.error('Failed to load promo data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useFocusEffect(useCallback(() => {
    loadData();
    setRedeemSuccess(null);
  }, [loadData]));

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleRedeem = useCallback((result: RedeemResult) => {
    setRedeemSuccess(result);
    setBalance(result.newBalance);
    loadData();
  }, [loadData]);

  const userId = currentUser?.id;

  return {
    loading, refreshing, userUsage, balance, redeemSuccess, userId,
    handleRefresh, handleRedeem,
  };
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return promoService.formatDate(dateString);
}
