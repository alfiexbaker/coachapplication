import { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import { EarningsStatCard } from '@/components/earnings/stat-card';
import { TransactionListItem } from '@/components/earnings/transaction-list-item';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { earningsService, type TransactionFilter } from '@/services/earnings-service';
import type {
  CoachEarnings,
  EarningTransaction,
  Withdrawal,
  PayoutMethod,
} from '@/constants/types';

type FilterOption = { label: string; value: TransactionFilter };

const FILTER_OPTIONS: FilterOption[] = [
  { label: 'All', value: 'all' },
  { label: 'Payments', value: 'payments' },
  { label: 'Refunds', value: 'refunds' },
  { label: 'Withdrawals', value: 'withdrawals' },
];

export default function EarningsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<CoachEarnings | null>(null);
  const [transactions, setTransactions] = useState<EarningTransaction[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<Withdrawal[]>([]);
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('all');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedPayoutMethod, setSelectedPayoutMethod] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const coachId = currentUser?.id || 'coach1';
  const coachName = currentUser?.name || currentUser?.fullName || 'Coach';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [earningsData, transactionsData, withdrawalsData, methodsData] = await Promise.all([
        earningsService.getEarnings(coachId),
        earningsService.getTransactionHistory(coachId),
        earningsService.getPendingWithdrawals(coachId),
        earningsService.getPayoutMethods(coachId),
      ]);

      setEarnings(earningsData);
      setTransactions(transactionsData);
      setPendingWithdrawals(withdrawalsData);
      setPayoutMethods(methodsData);

      // Set default payout method if available
      if (methodsData.length > 0 && !selectedPayoutMethod) {
        const defaultMethod = methodsData.find((m) => m.isDefault) || methodsData[0];
        setSelectedPayoutMethod(defaultMethod.id);
      }
    } catch (error) {
      console.error('[EarningsScreen] Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [coachId, transactionFilter, selectedPayoutMethod]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Reload transactions when filter changes
  useEffect(() => {
    earningsService.getTransactionHistory(coachId).then(setTransactions);
  }, [coachId, transactionFilter]);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setWithdrawError('Please enter a valid amount');
      return;
    }

    if (!selectedPayoutMethod) {
      setWithdrawError('Please select a payout method');
      return;
    }

    if (!earnings || amount > earnings.availableBalance) {
      setWithdrawError('Insufficient available balance');
      return;
    }

    setWithdrawing(true);
    setWithdrawError(null);

    try {
      const result = await earningsService.requestWithdrawal(
        coachId,
        amount,
        selectedPayoutMethod
      );

      if (result.success) {
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        await loadData();
      } else {
        setWithdrawError(result.error || 'Failed to request withdrawal');
      }
    } catch (error) {
      setWithdrawError('An error occurred. Please try again.');
    } finally {
      setWithdrawing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return earningsService.formatCurrency(amount, earnings?.currency || 'GBP');
  };

  const getTransactionStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return palette.success;
      case 'PENDING':
        return palette.warning;
      case 'FAILED':
        return palette.error;
      default:
        return palette.muted;
    }
  };

  const getWithdrawalStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'PROCESSING':
        return 'Processing';
      case 'COMPLETED':
        return 'Completed';
      case 'FAILED':
        return 'Failed';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  };

  // Calculate withdrawal fee and net amount
  const withdrawalGross = parseFloat(withdrawAmount) || 0;
  const feePercent = earnings?.platformFeePercent || earningsService.getPlatformFeePercent();
  const fee = withdrawalGross * (feePercent / 100);
  const netAmount = withdrawalGross - fee;

  if (loading && !earnings) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={{ color: palette.muted, marginTop: Spacing.sm }}>
            Loading earnings...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>Earnings</ThemedText>
          <ThemedText style={{ color: palette.muted }}>
            Track your income and manage withdrawals
          </ThemedText>
        </View>

        {/* Balance Card */}
        <SurfaceCard style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View style={[styles.balanceIcon, { backgroundColor: `${palette.success}15` }]}>
              <Ionicons name="wallet" size={24} color={palette.success} />
            </View>
            <View style={styles.balanceInfo}>
              <ThemedText style={{ color: palette.muted, fontSize: 13 }}>Available Balance</ThemedText>
              <ThemedText type="title" style={styles.balanceAmount}>
                {formatCurrency(earnings?.availableBalance || 0).replace(/^[+-]/, '')}
              </ThemedText>
            </View>
          </View>
          <View style={[styles.balanceDivider, { backgroundColor: palette.border }]} />
          <View style={styles.balanceDetails}>
            <View style={styles.balanceRow}>
              <View style={styles.balanceItem}>
                <Ionicons name="time-outline" size={16} color={palette.warning} />
                <ThemedText style={{ color: palette.muted, fontSize: 13 }}>Pending</ThemedText>
              </View>
              <ThemedText type="defaultSemiBold">
                {formatCurrency(earnings?.pendingBalance || 0).replace(/^[+-]/, '')}
              </ThemedText>
            </View>
            <View style={styles.balanceRow}>
              <View style={styles.balanceItem}>
                <Ionicons name="trending-up" size={16} color={palette.success} />
                <ThemedText style={{ color: palette.muted, fontSize: 13 }}>Total Earned</ThemedText>
              </View>
              <ThemedText type="defaultSemiBold">
                {formatCurrency(earnings?.totalEarned || 0).replace(/^[+-]/, '')}
              </ThemedText>
            </View>
            <View style={styles.balanceRow}>
              <View style={styles.balanceItem}>
                <Ionicons name="arrow-down-circle-outline" size={16} color={palette.tint} />
                <ThemedText style={{ color: palette.muted, fontSize: 13 }}>Total Withdrawn</ThemedText>
              </View>
              <ThemedText type="defaultSemiBold">
                {formatCurrency(earnings?.totalWithdrawn || 0).replace(/^[+-]/, '')}
              </ThemedText>
            </View>
          </View>
          <Clickable onPress={() => setShowWithdrawModal(true)}>
            <View style={[styles.withdrawButton, { backgroundColor: palette.tint }]}>
              <Ionicons name="cash-outline" size={18} color={palette.background} />
              <ThemedText style={{ color: palette.background, fontWeight: '700' }}>Withdraw</ThemedText>
            </View>
          </Clickable>
        </SurfaceCard>

        {/* Period Stats */}
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Period Stats</ThemedText>
        <View style={styles.statsRow}>
          <EarningsStatCard
            label="This Week"
            value={formatCurrency(earnings?.thisWeek || 0).replace(/^[+-]/, '')}
          />
          <EarningsStatCard
            label="This Month"
            value={formatCurrency(earnings?.thisMonth || 0).replace(/^[+-]/, '')}
          />
        </View>
        <View style={styles.statsRow}>
          <EarningsStatCard
            label="Last Month"
            value={formatCurrency(earnings?.lastMonth || 0).replace(/^[+-]/, '')}
          />
          <EarningsStatCard
            label="Avg Session"
            value={formatCurrency(earnings?.averageSessionValue || 0).replace(/^[+-]/, '')}
          />
        </View>

        {/* Pending Withdrawals */}
        {pendingWithdrawals.length > 0 && (
          <>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Pending Withdrawals
            </ThemedText>
            <SurfaceCard style={styles.listCard}>
              {pendingWithdrawals.map((withdrawal, index) => (
                <View key={withdrawal.id}>
                  {index > 0 && <View style={[styles.listDivider, { backgroundColor: palette.border }]} />}
                  <View style={styles.withdrawalItem}>
                    <View style={styles.withdrawalInfo}>
                      <ThemedText type="defaultSemiBold">
                        {formatCurrency(withdrawal.amount).replace(/^[+-]/, '')}
                      </ThemedText>
                      <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                        {withdrawal.payoutMethod === 'BANK_ACCOUNT' ? 'Bank Transfer' : withdrawal.payoutMethod}
                      </ThemedText>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: `${palette.warning}15` }
                    ]}>
                      <ThemedText style={{ color: palette.warning, fontSize: 11, fontWeight: '600' }}>
                        {getWithdrawalStatusLabel(withdrawal.status)}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              ))}
            </SurfaceCard>
          </>
        )}

        {/* Payout Methods */}
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Payout Methods
        </ThemedText>
        <SurfaceCard style={styles.listCard}>
          {payoutMethods.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={32} color={palette.muted} />
              <ThemedText style={{ color: palette.muted, textAlign: 'center', marginTop: Spacing.xs }}>
                No payout methods added yet
              </ThemedText>
            </View>
          ) : (
            payoutMethods.map((method, index) => (
              <View key={method.id}>
                {index > 0 && <View style={[styles.listDivider, { backgroundColor: palette.border }]} />}
                <View style={styles.payoutMethodItem}>
                  <View style={[styles.payoutMethodIcon, { backgroundColor: `${palette.tint}10` }]}>
                    <Ionicons
                      name={method.type === 'BANK_ACCOUNT' ? 'business' : method.type === 'PAYPAL' ? 'logo-paypal' : 'card'}
                      size={20}
                      color={palette.tint}
                    />
                  </View>
                  <View style={styles.payoutMethodInfo}>
                    <View style={styles.payoutMethodHeader}>
                      <ThemedText type="defaultSemiBold">
                        {method.nickname || method.type}
                      </ThemedText>
                      {method.isDefault && (
                        <View style={[styles.defaultBadge, { backgroundColor: `${palette.success}15` }]}>
                          <ThemedText style={{ color: palette.success, fontSize: 10, fontWeight: '600' }}>
                            DEFAULT
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                      {method.type === 'BANK_ACCOUNT'
                        ? `${method.bankName} ****${method.accountLastFour}`
                        : method.type === 'PAYPAL'
                        ? method.paypalEmail
                        : 'Stripe Connect'}
                    </ThemedText>
                  </View>
                  {method.isVerified ? (
                    <Ionicons name="checkmark-circle" size={20} color={palette.success} />
                  ) : (
                    <View style={[styles.unverifiedBadge, { backgroundColor: `${palette.warning}15` }]}>
                      <ThemedText style={{ color: palette.warning, fontSize: 10, fontWeight: '600' }}>
                        UNVERIFIED
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
          <Clickable onPress={() => {}}>
            <View style={[styles.addMethodButton, { borderColor: palette.border }]}>
              <Ionicons name="add-circle-outline" size={18} color={palette.tint} />
              <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
                Add Payout Method
              </ThemedText>
            </View>
          </Clickable>
        </SurfaceCard>

        {/* Transaction History */}
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Transaction History
        </ThemedText>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map((option) => (
            <Clickable key={option.value} onPress={() => setTransactionFilter(option.value)}>
              <View
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: transactionFilter === option.value ? `${palette.tint}15` : 'transparent',
                    borderColor: transactionFilter === option.value ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={{
                    color: transactionFilter === option.value ? palette.tint : palette.muted,
                    fontSize: 13,
                    fontWeight: transactionFilter === option.value ? '600' : '500',
                  }}
                >
                  {option.label}
                </ThemedText>
              </View>
            </Clickable>
          ))}
        </View>

        <SurfaceCard style={styles.listCard}>
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={32} color={palette.muted} />
              <ThemedText style={{ color: palette.muted, textAlign: 'center', marginTop: Spacing.xs }}>
                No transactions found
              </ThemedText>
            </View>
          ) : (
            transactions.map((txn, index) => {
              const date = new Date(txn.createdAt);
              const subtitle = txn.sessionDate
                ? `${txn.athleteName || 'Session'} - ${new Date(txn.sessionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

              return (
                <TransactionListItem
                  key={txn.id}
                  title={txn.description}
                  subtitle={subtitle}
                  amount={formatCurrency(txn.amount)}
                  status={txn.status === 'COMPLETED' ? 'Paid' : txn.status === 'PENDING' ? 'Pending' : txn.status}
                />
              );
            })
          )}
        </SurfaceCard>
      </ScrollView>

      {/* Withdrawal Modal */}
      <Modal visible={showWithdrawModal} transparent animationType="fade" onRequestClose={() => setShowWithdrawModal(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: `${palette.text}80` }]}>
          <SurfaceCard style={[styles.modalCard, { paddingBottom: insets.bottom + Spacing.md }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Withdraw Funds</ThemedText>
              <Clickable onPress={() => setShowWithdrawModal(false)}>
                <Ionicons name="close" size={24} color={palette.icon} />
              </Clickable>
            </View>

            <View style={styles.modalContent}>
              {/* Available Balance */}
              <View style={[styles.availableBalanceCard, { backgroundColor: `${palette.success}10` }]}>
                <ThemedText style={{ color: palette.muted, fontSize: 13 }}>Available to withdraw</ThemedText>
                <ThemedText type="title" style={{ color: palette.success }}>
                  {formatCurrency(earnings?.availableBalance || 0).replace(/^[+-]/, '')}
                </ThemedText>
              </View>

              {/* Amount Input */}
              <View style={styles.inputGroup}>
                <ThemedText type="defaultSemiBold">Amount</ThemedText>
                <View style={[styles.amountInputContainer, { borderColor: palette.border }]}>
                  <ThemedText style={styles.currencySymbol}>
                    {earnings?.currency === 'GBP' ? '£' : earnings?.currency === 'USD' ? '$' : '€'}
                  </ThemedText>
                  <TextInput
                    style={[styles.amountInput, { color: palette.text }]}
                    placeholder="0.00"
                    placeholderTextColor={palette.muted}
                    keyboardType="decimal-pad"
                    value={withdrawAmount}
                    onChangeText={setWithdrawAmount}
                  />
                </View>
              </View>

              {/* Payout Method Selection */}
              <View style={styles.inputGroup}>
                <ThemedText type="defaultSemiBold">Payout Method</ThemedText>
                {payoutMethods.length === 0 ? (
                  <View style={[styles.noMethodsCard, { borderColor: palette.border }]}>
                    <ThemedText style={{ color: palette.muted, textAlign: 'center' }}>
                      Add a payout method to withdraw funds
                    </ThemedText>
                  </View>
                ) : (
                  <View style={styles.methodOptions}>
                    {payoutMethods.filter((m) => m.isVerified).map((method) => (
                      <Clickable key={method.id} onPress={() => setSelectedPayoutMethod(method.id)}>
                        <View
                          style={[
                            styles.methodOption,
                            {
                              borderColor: selectedPayoutMethod === method.id ? palette.tint : palette.border,
                              backgroundColor: selectedPayoutMethod === method.id ? `${palette.tint}10` : 'transparent',
                            },
                          ]}
                        >
                          <View style={styles.methodOptionContent}>
                            <Ionicons
                              name={method.type === 'BANK_ACCOUNT' ? 'business' : method.type === 'PAYPAL' ? 'logo-paypal' : 'card'}
                              size={18}
                              color={selectedPayoutMethod === method.id ? palette.tint : palette.icon}
                            />
                            <View>
                              <ThemedText style={{ fontWeight: '500' }}>
                                {method.nickname || method.type}
                              </ThemedText>
                              <ThemedText style={{ color: palette.muted, fontSize: 11 }}>
                                {method.type === 'BANK_ACCOUNT'
                                  ? `****${method.accountLastFour}`
                                  : method.paypalEmail}
                              </ThemedText>
                            </View>
                          </View>
                          <View
                            style={[
                              styles.radioCircle,
                              {
                                borderColor: selectedPayoutMethod === method.id ? palette.tint : palette.border,
                                backgroundColor: selectedPayoutMethod === method.id ? palette.tint : 'transparent',
                              },
                            ]}
                          >
                            {selectedPayoutMethod === method.id && (
                              <View style={[styles.radioInner, { backgroundColor: palette.background }]} />
                            )}
                          </View>
                        </View>
                      </Clickable>
                    ))}
                  </View>
                )}
              </View>

              {/* Fee Calculation */}
              {parseFloat(withdrawAmount) > 0 && (
                <View style={[styles.feeCard, { borderColor: palette.border }]}>
                  <View style={styles.feeRow}>
                    <ThemedText style={{ color: palette.muted }}>Withdrawal amount</ThemedText>
                    <ThemedText>
                      {formatCurrency(parseFloat(withdrawAmount) || 0).replace(/^[+-]/, '')}
                    </ThemedText>
                  </View>
                  <View style={styles.feeRow}>
                    <ThemedText style={{ color: palette.muted }}>
                      Platform fee ({earnings?.platformFeePercent || 10}%)
                    </ThemedText>
                    <ThemedText style={{ color: palette.error }}>
                      -{formatCurrency(fee).replace(/^[+-]/, '')}
                    </ThemedText>
                  </View>
                  <View style={[styles.feeDivider, { backgroundColor: palette.border }]} />
                  <View style={styles.feeRow}>
                    <ThemedText type="defaultSemiBold">You will receive</ThemedText>
                    <ThemedText type="defaultSemiBold" style={{ color: palette.success }}>
                      {formatCurrency(netAmount).replace(/^[+-]/, '')}
                    </ThemedText>
                  </View>
                </View>
              )}

              {/* Error Message */}
              {withdrawError && (
                <View style={[styles.errorCard, { backgroundColor: `${palette.error}10` }]}>
                  <Ionicons name="alert-circle" size={16} color={palette.error} />
                  <ThemedText style={{ color: palette.error, flex: 1 }}>{withdrawError}</ThemedText>
                </View>
              )}

              {/* Confirm Button */}
              <Clickable
                onPress={handleWithdraw}
                disabled={withdrawing || !selectedPayoutMethod || !withdrawAmount}
              >
                <View
                  style={[
                    styles.confirmButton,
                    {
                      backgroundColor: withdrawing || !selectedPayoutMethod || !withdrawAmount
                        ? palette.border
                        : palette.tint,
                    },
                  ]}
                >
                  {withdrawing ? (
                    <ActivityIndicator size="small" color={palette.background} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color={palette.background} />
                      <ThemedText style={{ color: palette.background, fontWeight: '700' }}>
                        Confirm Withdrawal
                      </ThemedText>
                    </>
                  )}
                </View>
              </Clickable>
            </View>
          </SurfaceCard>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  header: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  sectionTitle: {
    marginTop: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  balanceCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  balanceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceInfo: {
    flex: 1,
    gap: 2,
  },
  balanceAmount: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  balanceDivider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  balanceDetails: {
    gap: Spacing.sm,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.xs,
  },
  listCard: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  listDivider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  withdrawalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  withdrawalInfo: {
    gap: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  payoutMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  payoutMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payoutMethodInfo: {
    flex: 1,
    gap: 2,
  },
  payoutMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  defaultBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  unverifiedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  addMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: Spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: Spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalContent: {
    gap: Spacing.md,
  },
  availableBalanceCard: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    alignItems: 'center',
    gap: 4,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    marginRight: Spacing.xs,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    height: '100%',
  },
  noMethodsCard: {
    padding: Spacing.lg,
    borderWidth: 1,
    borderRadius: Radii.md,
    borderStyle: 'dashed',
  },
  methodOptions: {
    gap: Spacing.sm,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderWidth: 1.5,
    borderRadius: Radii.md,
  },
  methodOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  feeCard: {
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radii.md,
    gap: Spacing.sm,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeDivider: {
    height: 1,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    marginTop: Spacing.xs,
  },
});
