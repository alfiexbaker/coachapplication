/**
 * useWallet — Data loading hook for the Wallet screen.
 *
 * Handles wallet + transaction fetching, top-up flow state,
 * refresh, and helper utilities (icon mapping, date formatting).
 */

import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/hooks/use-auth';
import { walletService, type WalletTransaction, type Wallet } from '@/services/wallet-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useWallet');

export const PRESET_AMOUNTS = [10, 25, 50, 100] as const;

export type TransactionIconName = keyof typeof Ionicons.glyphMap;

// ============================================================================
// HELPERS
// ============================================================================

export function getTransactionIcon(type: WalletTransaction['type']): TransactionIconName {
  switch (type) {
    case 'TOP_UP':
      return 'add-circle-outline';
    case 'SESSION_PAYMENT':
      return 'calendar-outline';
    case 'PENDING_PAYMENT':
      return 'time-outline';
    case 'REFUND':
      return 'arrow-undo-outline';
    case 'WITHDRAWAL':
      return 'arrow-down-circle-outline';
    default:
      return 'swap-horizontal-outline';
  }
}

export function formatWalletDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}

// ============================================================================
// HOOK
// ============================================================================

export interface UseWalletResult {
  // Data
  wallet: Wallet | null;
  transactions: WalletTransaction[];
  pendingTransactions: WalletTransaction[];
  loading: boolean;
  refreshing: boolean;

  // Top-up modal state
  showTopUpModal: boolean;
  selectedAmount: number | null;
  customAmount: string;
  processing: boolean;

  // Actions
  handleRefresh: () => Promise<void>;
  openTopUpModal: () => void;
  closeTopUpModal: () => void;
  selectPresetAmount: (amount: number) => void;
  setCustomAmount: (text: string) => void;
  handleTopUp: () => Promise<void>;
}

export function useWallet(): UseWalletResult {
  const { currentUser } = useAuth();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmountState] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      const [walletData, transactionsData] = await Promise.all([
        walletService.getWallet(currentUser.id),
        walletService.getTransactions(currentUser.id),
      ]);

      setWallet(walletData);
      setTransactions(transactionsData);
    } catch (error) {
      logger.error('Failed to load wallet data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const openTopUpModal = useCallback(() => {
    setSelectedAmount(null);
    setCustomAmountState('');
    setShowTopUpModal(true);
  }, []);

  const closeTopUpModal = useCallback(() => {
    setShowTopUpModal(false);
  }, []);

  const selectPresetAmount = useCallback((amount: number) => {
    setSelectedAmount(amount);
    setCustomAmountState('');
  }, []);

  const setCustomAmount = useCallback((text: string) => {
    setCustomAmountState(text);
    setSelectedAmount(null);
  }, []);

  const handleTopUp = useCallback(async () => {
    const amount = selectedAmount || (customAmount ? parseFloat(customAmount) : 0);

    if (!amount || amount <= 0 || !currentUser?.id) return;

    setProcessing(true);

    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const result = await walletService.topUp({
      userId: currentUser.id,
      amount,
      paymentMethod: 'card',
    });

    if (result.success) {
      await loadData();
      setShowTopUpModal(false);
      setSelectedAmount(null);
      setCustomAmountState('');
    }

    setProcessing(false);
  }, [selectedAmount, customAmount, currentUser?.id, loadData]);

  const pendingTransactions = transactions.filter((t) => t.status === 'PENDING');

  return {
    wallet,
    transactions,
    pendingTransactions,
    loading,
    refreshing,
    showTopUpModal,
    selectedAmount,
    customAmount,
    processing,
    handleRefresh,
    openTopUpModal,
    closeTopUpModal,
    selectPresetAmount,
    setCustomAmount,
    handleTopUp,
  };
}
