/**
 * Earnings Screen
 *
 * Coach financial dashboard: balance, period stats, withdrawals, payout methods, transactions.
 * All state/logic in useEarnings hook. Balance card and withdraw modal extracted.
 */

import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { StatCard } from '@/components/primitives/stat-card';
import { TransactionListItem } from '@/components/earnings/transaction-list-item';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { EarningsBalanceCard } from '@/components/earnings/earnings-balance-card';
import { EarningsWithdrawModal } from '@/components/earnings/earnings-withdraw-modal';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useEarnings, FILTER_OPTIONS } from '@/hooks/use-earnings';

export default function EarningsScreen() {
  const { colors: palette } = useTheme();
  const e = useEarnings();

  if (e.loading && !e.earnings) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={{ color: palette.muted, marginTop: Spacing.sm }}>Loading earnings...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Earnings" subtitle="Track your income" />

        <EarningsBalanceCard earnings={e.earnings} formatCurrency={e.formatCurrency} onWithdraw={e.openWithdrawModal} />

        {/* Period Stats */}
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Period Stats</ThemedText>
        <View style={styles.statsRow}>
          <View style={styles.statWrapper}><StatCard label="This Week" value={e.formatCurrency(e.earnings?.thisWeek || 0).replace(/^[+-]/, '')} variant="compact" /></View>
          <View style={styles.statWrapper}><StatCard label="This Month" value={e.formatCurrency(e.earnings?.thisMonth || 0).replace(/^[+-]/, '')} variant="compact" /></View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statWrapper}><StatCard label="Last Month" value={e.formatCurrency(e.earnings?.lastMonth || 0).replace(/^[+-]/, '')} variant="compact" /></View>
          <View style={styles.statWrapper}><StatCard label="Avg Session" value={e.formatCurrency(e.earnings?.averageSessionValue || 0).replace(/^[+-]/, '')} variant="compact" /></View>
        </View>

        {/* Pending Withdrawals */}
        {e.pendingWithdrawals.length > 0 && (
          <>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Pending Withdrawals</ThemedText>
            <SurfaceCard style={styles.listCard}>
              {e.pendingWithdrawals.map((w, i) => (
                <View key={w.id}>
                  {i > 0 && <View style={[styles.listDivider, { backgroundColor: palette.border }]} />}
                  <View style={styles.withdrawalItem}>
                    <View style={styles.withdrawalInfo}>
                      <ThemedText type="defaultSemiBold">{e.formatCurrency(w.amount).replace(/^[+-]/, '')}</ThemedText>
                      <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
                        {w.payoutMethod === 'BANK_ACCOUNT' ? 'Bank Transfer' : w.payoutMethod}
                      </ThemedText>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
                      <ThemedText style={{ color: palette.warning, ...Typography.caption }}>{e.getWithdrawalStatusLabel(w.status)}</ThemedText>
                    </View>
                  </View>
                </View>
              ))}
            </SurfaceCard>
          </>
        )}

        {/* Payout Methods */}
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Payout Methods</ThemedText>
        <SurfaceCard style={styles.listCard}>
          {e.payoutMethods.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={32} color={palette.muted} />
              <ThemedText style={{ color: palette.muted, textAlign: 'center', marginTop: Spacing.xs }}>No payout methods added yet</ThemedText>
            </View>
          ) : (
            e.payoutMethods.map((method, i) => (
              <View key={method.id}>
                {i > 0 && <View style={[styles.listDivider, { backgroundColor: palette.border }]} />}
                <View style={styles.payoutItem}>
                  <View style={[styles.payoutIcon, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                    <Ionicons name={method.type === 'BANK_ACCOUNT' ? 'business' : method.type === 'PAYPAL' ? 'logo-paypal' : 'card'} size={20} color={palette.tint} />
                  </View>
                  <View style={styles.payoutInfo}>
                    <View style={styles.payoutHeader}>
                      <ThemedText type="defaultSemiBold">{method.nickname || method.type}</ThemedText>
                      {method.isDefault && (
                        <View style={[styles.defaultBadge, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
                          <ThemedText style={{ color: palette.success, ...Typography.micro }}>DEFAULT</ThemedText>
                        </View>
                      )}
                    </View>
                    <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
                      {method.type === 'BANK_ACCOUNT' ? `${method.bankName} ****${method.accountLastFour}` : method.type === 'PAYPAL' ? method.paypalEmail : 'Stripe Connect'}
                    </ThemedText>
                  </View>
                  {method.isVerified ? (
                    <Ionicons name="checkmark-circle" size={20} color={palette.success} />
                  ) : (
                    <View style={[styles.unverifiedBadge, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
                      <ThemedText style={{ color: palette.warning, ...Typography.micro }}>UNVERIFIED</ThemedText>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
          <Clickable onPress={e.handleAddPayoutMethod}>
            <View style={[styles.addMethodBtn, { borderColor: palette.border }]}>
              <Ionicons name="add-circle-outline" size={18} color={palette.tint} />
              <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>Add Payout Method</ThemedText>
            </View>
          </Clickable>
        </SurfaceCard>

        {/* Transaction History */}
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Transaction History</ThemedText>
        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map((opt) => (
            <Clickable key={opt.value} onPress={() => e.setTransactionFilter(opt.value)}>
              <View style={[styles.filterChip, { backgroundColor: e.transactionFilter === opt.value ? withAlpha(palette.tint, 0.09) : 'transparent', borderColor: e.transactionFilter === opt.value ? palette.tint : palette.border }]}>
                <ThemedText style={{ color: e.transactionFilter === opt.value ? palette.tint : palette.muted, ...Typography.small, fontWeight: e.transactionFilter === opt.value ? '600' : '500' }}>{opt.label}</ThemedText>
              </View>
            </Clickable>
          ))}
        </View>
        <SurfaceCard style={styles.listCard}>
          {e.transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={32} color={palette.muted} />
              <ThemedText style={{ color: palette.muted, textAlign: 'center', marginTop: Spacing.xs }}>No transactions found</ThemedText>
            </View>
          ) : (
            e.transactions.map((txn) => {
              const date = new Date(txn.createdAt);
              const subtitle = txn.sessionDate
                ? `${txn.athleteName || 'Session'} - ${new Date(txn.sessionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
              return <TransactionListItem key={txn.id} title={txn.description} subtitle={subtitle} amount={e.formatCurrency(txn.amount)} status={txn.status === 'COMPLETED' ? 'Paid' : txn.status === 'PENDING' ? 'Pending' : txn.status} />;
            })
          )}
        </SurfaceCard>
      </ScrollView>

      <EarningsWithdrawModal
        visible={e.showWithdrawModal} earnings={e.earnings} payoutMethods={e.payoutMethods}
        withdrawAmount={e.withdrawAmount} selectedPayoutMethod={e.selectedPayoutMethod}
        withdrawing={e.withdrawing} withdrawError={e.withdrawError}
        feePercent={e.feePercent} fee={e.fee} netAmount={e.netAmount}
        formatCurrency={e.formatCurrency} onChangeAmount={e.setWithdrawAmount}
        onSelectMethod={e.setSelectedPayoutMethod} onConfirm={e.handleWithdraw} onClose={e.closeWithdrawModal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing['2xl'] },
  sectionTitle: { marginTop: Spacing.sm },
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  statWrapper: { flex: 1 },
  listCard: { padding: Spacing.md, gap: Spacing.xs },
  listDivider: { height: 1, marginVertical: Spacing.sm },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.lg },
  withdrawalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  withdrawalInfo: { gap: Spacing.micro },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  payoutItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  payoutIcon: { width: 40, height: 40, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  payoutInfo: { flex: 1, gap: Spacing.micro },
  payoutHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  defaultBadge: { paddingHorizontal: Spacing.xxs, paddingVertical: Spacing.micro, borderRadius: Radii.sm },
  unverifiedBadge: { paddingHorizontal: Spacing.xxs, paddingVertical: Spacing.micro, borderRadius: Radii.sm },
  addMethodBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1.5, borderStyle: 'dashed', marginTop: Spacing.sm },
  filterRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radii.pill, borderWidth: 1 },
});
