/**
 * Hook for the Wallet Promo Code screen.
 * Manages promo code redemption, usage history, and wallet balance.
 */

import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { promoService } from '@/services/promo-service';
import { walletService } from '@/services/wallet-service';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import type { PromoCodeUsage } from '@/constants/types';

const logger = createLogger('PromoCodeScreen');

export interface RedeemResult {
  code: string;
  creditAmount: number;
  newBalance: number;
}

interface WalletPromoData {
  userUsage: PromoCodeUsage[];
  balance: number;
}

export function useWalletPromo() {
  const { currentUser } = useAuth();

  const [redeemSuccess, setRedeemSuccess] = useState<RedeemResult | null>(null);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) {
      return ok<WalletPromoData>({ userUsage: [], balance: 0 });
    }

    try {
      const [usageData, walletBalance] = await Promise.all([
        promoService.getUserUsage(currentUser.id),
        walletService.getBalance(currentUser.id),
      ]);
      return ok<WalletPromoData>({
        userUsage: usageData,
        balance: walletBalance,
      });
    } catch (error) {
      logger.error('Failed to load promo data:', error);
      return err(serviceError('UNKNOWN', 'Failed to load promo code data.', error));
    }
  }, [currentUser?.id]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<WalletPromoData>({
    load: loadData,
    deps: [currentUser?.id],
    isEmpty: () => false,
    refetchOnFocus: true,
  });

  const userUsage = data?.userUsage ?? [];
  const balance = data?.balance ?? 0;

  useFocusEffect(
    useCallback(() => {
      setRedeemSuccess(null);
    }, []),
  );

  const handleRedeem = useCallback(
    (result: RedeemResult) => {
      setRedeemSuccess(result);
      onRefresh();
    },
    [onRefresh],
  );

  const userId = currentUser?.id;

  return {
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    loading: status === 'loading',
    refreshing,
    userUsage,
    balance,
    redeemSuccess,
    userId,
    onRefresh,
    retry,
    handleRefresh: onRefresh,
    handleRedeem,
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
