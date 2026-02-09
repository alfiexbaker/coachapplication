/**
 * WalletScreen — Wallet balance, transactions, and top-up.
 *
 * Decomposed from 672 lines to <250 lines.
 * Sub-components live in components/wallet/.
 * Data logic lives in hooks/use-wallet.ts.
 */

import { useCallback } from 'react';
import { StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageContainer } from '@/components/primitives/page-container';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { Center } from '@/components/primitives/center';
import { Column } from '@/components/primitives/column';
import { ThemedText } from '@/components/themed-text';
import { WalletBalanceCard } from '@/components/wallet/wallet-balance-card';
import { WalletQuickActions } from '@/components/wallet/wallet-quick-actions';
import { WalletPendingSection } from '@/components/wallet/wallet-pending-section';
import { WalletTransactionItem } from '@/components/wallet/wallet-transaction-item';
import { WalletTopUpModal } from '@/components/wallet/wallet-top-up-modal';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useWallet } from '@/hooks/use-wallet';
import type { WalletTransaction } from '@/services/wallet-service';

export default function WalletScreen() {
  const { colors } = useTheme();
  const {
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
  } = useWallet();

  const renderTransaction = useCallback(
    ({ item }: { item: WalletTransaction }) => (
      <WalletTransactionItem transaction={item} />
    ),
    []
  );

  const keyExtractor = useCallback((item: WalletTransaction) => item.id, []);

  const renderEmpty = useCallback(
    () => (
      <Center padding="xl">
        <Column align="center" gap="sm">
          <Ionicons name="wallet-outline" size={48} color={colors.muted} />
          <ThemedText style={[styles.emptyTitle, { color: colors.muted }]}>
            No transactions yet
          </ThemedText>
          <ThemedText style={[styles.emptySubtitle, { color: colors.muted }]}>
            Top up your wallet to get started
          </ThemedText>
        </Column>
      </Center>
    ),
    [colors.muted]
  );

  const renderHeader = useCallback(
    () => (
      <Column gap="md">
        <WalletBalanceCard wallet={wallet} onTopUp={openTopUpModal} />
        <WalletQuickActions onTopUp={openTopUpModal} />
        <WalletPendingSection transactions={pendingTransactions} />
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <ThemedText type="subtitle" style={styles.transactionsTitle}>
            Recent Transactions
          </ThemedText>
        </Animated.View>
      </Column>
    ),
    [wallet, openTopUpModal, pendingTransactions]
  );

  if (loading) {
    return (
      <PageContainer header={<ScreenHeader title="Wallet" subtitle="Manage your earnings" />}>
        <Center flex>
          <Column align="center" gap="md">
            <ActivityIndicator size="large" color={colors.tint} />
            <ThemedText style={[styles.loadingText, { color: colors.muted }]}>
              Loading wallet...
            </ThemedText>
          </Column>
        </Center>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={<ScreenHeader title="Wallet" subtitle="Manage your earnings" />}
      gap={Spacing.md}
      scrollable={false}
    >
      <FlatList
        data={transactions}
        keyExtractor={keyExtractor}
        renderItem={renderTransaction}
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.tint}
          />
        }
      />

      <WalletTopUpModal
        visible={showTopUpModal}
        selectedAmount={selectedAmount}
        customAmount={customAmount}
        processing={processing}
        onClose={closeTopUpModal}
        onSelectPreset={selectPresetAmount}
        onChangeCustomAmount={setCustomAmount}
        onConfirm={handleTopUp}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  transactionsTitle: {
    ...Typography.heading,
    marginTop: Spacing.sm,
  },
  loadingText: {
    ...Typography.bodySmall,
  },
  emptyTitle: {
    ...Typography.subheading,
  },
  emptySubtitle: {
    ...Typography.bodySmall,
  },
});
