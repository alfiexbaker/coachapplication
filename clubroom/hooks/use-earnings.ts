/**
 * Hook for the Earnings screen.
 * Manages balance data, transactions, withdrawals, and payout methods.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { earningsService, type TransactionFilter } from '@/services/earnings';
import type { CoachEarnings, EarningTransaction, Withdrawal, PayoutMethod } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('EarningsScreen');

export type FilterOption = { label: string; value: TransactionFilter };

export const FILTER_OPTIONS: FilterOption[] = [
  { label: 'All', value: 'all' },
  { label: 'Payments', value: 'payments' },
  { label: 'Refunds', value: 'refunds' },
  { label: 'Withdrawals', value: 'withdrawals' },
];

interface EarningsLoadData {
  earnings: CoachEarnings | null;
  transactions: EarningTransaction[];
  pendingWithdrawals: Withdrawal[];
  payoutMethods: PayoutMethod[];
}

export function useEarnings() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id || 'coach1';

  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('all');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedPayoutMethod, setSelectedPayoutMethod] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [earningsData, transactionsData, withdrawalsData, methodsData] = await Promise.all([
        earningsService.getEarnings(coachId),
        earningsService.getTransactionHistory(coachId),
        earningsService.getPendingWithdrawals(coachId),
        earningsService.getPayoutMethods(coachId),
      ]);

      return ok<EarningsLoadData>({
        earnings: earningsData,
        transactions: transactionsData,
        pendingWithdrawals: withdrawalsData,
        payoutMethods: methodsData,
      });
    } catch (error) {
      logger.error('Failed to load data:', error);
      return err(serviceError('UNKNOWN', 'Failed to load earnings data.', error));
    }
  }, [coachId]);

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<EarningsLoadData>({
    load: loadData,
    deps: [coachId],
    isEmpty: (value) =>
      value.transactions.length === 0 &&
      value.pendingWithdrawals.length === 0 &&
      value.payoutMethods.length === 0 &&
      value.earnings === null,
    refetchOnFocus: true,
  });

  const earnings = data?.earnings ?? null;
  const pendingWithdrawals = data?.pendingWithdrawals ?? [];
  const payoutMethods = data?.payoutMethods ?? [];
  const allTransactions = data?.transactions ?? [];

  useEffect(() => {
    if (selectedPayoutMethod || payoutMethods.length === 0) {
      return;
    }
    const defaultMethod = payoutMethods.find((method) => method.isDefault) || payoutMethods[0];
    setSelectedPayoutMethod(defaultMethod.id);
  }, [selectedPayoutMethod, payoutMethods]);

  const transactions = useMemo(() => {
    if (transactionFilter === 'all') {
      return allTransactions;
    }

    if (transactionFilter === 'payments') {
      return allTransactions.filter((txn) => txn.type === 'SESSION_PAYMENT');
    }

    if (transactionFilter === 'refunds') {
      return allTransactions.filter((txn) => txn.type === 'REFUND');
    }

    return allTransactions.filter((txn) => txn.type === 'WITHDRAWAL');
  }, [allTransactions, transactionFilter]);

  const handleWithdraw = useCallback(async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) { setWithdrawError('Please enter a valid amount'); return; }
    if (!selectedPayoutMethod) { setWithdrawError('Please select a payout method'); return; }
    if (!earnings || amount > earnings.availableBalance) { setWithdrawError('Insufficient available balance'); return; }

    setWithdrawing(true);
    setWithdrawError(null);
    try {
      const result = await earningsService.requestWithdrawal(coachId, amount, selectedPayoutMethod);
      if (result.success) {
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        onRefresh();
      } else {
        setWithdrawError(result.error || 'Failed to request withdrawal');
      }
    } catch {
      setWithdrawError('An error occurred. Please try again.');
    } finally {
      setWithdrawing(false);
    }
  }, [coachId, withdrawAmount, selectedPayoutMethod, earnings, onRefresh]);

  const formatCurrency = useCallback((amount: number) => {
    return earningsService.formatCurrency(amount, earnings?.currency || 'GBP');
  }, [earnings?.currency]);

  const getWithdrawalStatusLabel = useCallback((status: string) => {
    switch (status) {
      case 'PENDING': return 'Pending';
      case 'PROCESSING': return 'Processing';
      case 'COMPLETED': return 'Completed';
      case 'FAILED': return 'Failed';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  }, []);

  const handleAddPayoutMethod = useCallback(() => {
    Alert.alert('Add Payout Method', 'Choose how you want to receive your earnings.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Bank Account', onPress: () => Alert.alert('Coming Soon', 'Bank account linking will be available soon.') },
      { text: 'PayPal', onPress: () => Alert.alert('Coming Soon', 'PayPal integration will be available soon.') },
    ]);
  }, []);

  const feePercent = earnings?.platformFeePercent || earningsService.getPlatformFeePercent();
  const withdrawalGross = parseFloat(withdrawAmount) || 0;
  const fee = withdrawalGross * (feePercent / 100);
  const netAmount = withdrawalGross - fee;

  const openWithdrawModal = useCallback(() => setShowWithdrawModal(true), []);
  const closeWithdrawModal = useCallback(() => setShowWithdrawModal(false), []);

  return {
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    loading: status === 'loading',
    refreshing,
    onRefresh,
    retry,
    earnings,
    transactions,
    pendingWithdrawals,
    payoutMethods,
    transactionFilter,
    setTransactionFilter,
    showWithdrawModal,
    openWithdrawModal,
    closeWithdrawModal,
    withdrawAmount,
    setWithdrawAmount,
    selectedPayoutMethod,
    setSelectedPayoutMethod,
    withdrawing,
    withdrawError,
    feePercent,
    fee,
    netAmount,
    handleWithdraw,
    formatCurrency,
    getWithdrawalStatusLabel,
    handleAddPayoutMethod,
  };
}
