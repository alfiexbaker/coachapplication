import { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { walletService, type WalletTransaction, type Wallet } from '@/services/wallet-service';

const PRESET_AMOUNTS = [10, 25, 50, 100];

type TransactionIconName = keyof typeof Ionicons.glyphMap;

function getTransactionIcon(type: WalletTransaction['type']): TransactionIconName {
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

function formatDate(dateString: string): string {
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

export default function WalletScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
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
      console.error('Failed to load wallet data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleTopUp = async () => {
    const amount = selectedAmount || (customAmount ? parseFloat(customAmount) : 0);

    if (!amount || amount <= 0 || !currentUser?.id) return;

    setProcessing(true);

    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const result = await walletService.topUp(currentUser.id, amount);

    if (result.success) {
      await loadData();
      setShowTopUpModal(false);
      setSelectedAmount(null);
      setCustomAmount('');
    }

    setProcessing(false);
  };

  const openTopUpModal = () => {
    setSelectedAmount(null);
    setCustomAmount('');
    setShowTopUpModal(true);
  };

  const pendingTransactions = transactions.filter((t) => t.status === 'PENDING');

  const renderTransaction = ({ item }: { item: WalletTransaction }) => {
    const isCredit = item.amount > 0;
    const iconName = getTransactionIcon(item.type);
    const isPending = item.status === 'PENDING';

    return (
      <View style={styles.transactionItem}>
        <View
          style={[
            styles.transactionIcon,
            {
              backgroundColor: isPending
                ? `${palette.warning}15`
                : isCredit
                ? `${palette.success}15`
                : `${palette.error}15`,
            },
          ]}
        >
          <Ionicons
            name={iconName}
            size={20}
            color={isPending ? palette.warning : isCredit ? palette.success : palette.error}
          />
        </View>
        <View style={styles.transactionDetails}>
          <ThemedText type="defaultSemiBold" style={styles.transactionDescription}>
            {item.description}
          </ThemedText>
          <ThemedText style={[styles.transactionDate, { color: palette.muted }]}>
            {formatDate(item.createdAt)}
            {isPending && ' - Pending'}
          </ThemedText>
        </View>
        <ThemedText
          type="defaultSemiBold"
          style={[
            styles.transactionAmount,
            {
              color: isPending ? palette.warning : isCredit ? palette.success : palette.text,
            },
          ]}
        >
          {isCredit ? '+' : ''}
          {walletService.formatAmount(item.amount)}
        </ThemedText>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="wallet-outline" size={48} color={palette.muted} />
      <ThemedText style={[styles.emptyStateText, { color: palette.muted }]}>
        No transactions yet
      </ThemedText>
      <ThemedText style={[styles.emptyStateSubtext, { color: palette.muted }]}>
        Top up your wallet to get started
      </ThemedText>
    </View>
  );

  if (loading) {
    return (
      <PageContainer header={<PageHeader title="Wallet" subtitle="Manage your balance" />}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
            Loading wallet...
          </ThemedText>
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={<PageHeader title="Wallet" subtitle="Manage your balance" />}
      gap={Spacing.md}
      scrollable={false}
    >
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.tint} />
        }
        ListHeaderComponent={
          <>
            {/* Balance Card */}
            <Animated.View entering={FadeInDown.delay(50).springify()}>
              <SurfaceCard style={styles.balanceCard}>
                <View style={styles.balanceHeader}>
                  <ThemedText style={[styles.balanceLabel, { color: palette.muted }]}>
                    Available Balance
                  </ThemedText>
                </View>
                <ThemedText style={styles.balanceAmount}>
                  {wallet ? walletService.formatAmount(wallet.balance) : '\u00A30.00'}
                </ThemedText>
                {wallet && wallet.pendingBalance > 0 && (
                  <View style={styles.pendingRow}>
                    <Ionicons name="time-outline" size={14} color={palette.warning} />
                    <ThemedText style={[styles.pendingText, { color: palette.warning }]}>
                      {walletService.formatAmount(wallet.pendingBalance)} pending
                    </ThemedText>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.topUpButtonLarge, { backgroundColor: palette.tint }]}
                  onPress={openTopUpModal}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.topUpButtonText}>Top Up</ThemedText>
                </TouchableOpacity>
              </SurfaceCard>
            </Animated.View>

            {/* Quick Actions */}
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={[styles.quickActionButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
                  onPress={openTopUpModal}
                >
                  <Ionicons name="add-circle-outline" size={24} color={palette.tint} />
                  <ThemedText style={[styles.quickActionText, { color: palette.text }]}>
                    Top Up
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickActionButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
                  onPress={() => {
                    // Scroll to transactions is handled by default since they're below
                  }}
                >
                  <Ionicons name="receipt-outline" size={24} color={palette.tint} />
                  <ThemedText style={[styles.quickActionText, { color: palette.text }]}>
                    History
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Pending Transactions Section */}
            {pendingTransactions.length > 0 && (
              <Animated.View entering={FadeInDown.delay(150).springify()}>
                <SurfaceCard style={styles.pendingCard}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="time-outline" size={18} color={palette.warning} />
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                      Pending Transactions
                    </ThemedText>
                  </View>
                  {pendingTransactions.map((transaction) => (
                    <View key={transaction.id} style={styles.pendingItem}>
                      <ThemedText style={{ flex: 1 }}>{transaction.description}</ThemedText>
                      <ThemedText type="defaultSemiBold" style={{ color: palette.warning }}>
                        {walletService.formatAmount(Math.abs(transaction.amount))}
                      </ThemedText>
                    </View>
                  ))}
                </SurfaceCard>
              </Animated.View>
            )}

            {/* Recent Transactions Header */}
            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <View style={styles.transactionsHeader}>
                <ThemedText type="subtitle" style={styles.transactionsTitle}>
                  Recent Transactions
                </ThemedText>
              </View>
            </Animated.View>
          </>
        }
      />

      {/* Top Up Modal */}
      <Modal
        visible={showTopUpModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTopUpModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="title" style={styles.modalTitle}>
              Top Up Wallet
            </ThemedText>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: palette.surfaceSecondary }]}
              onPress={() => setShowTopUpModal(false)}
            >
              <Ionicons name="close" size={24} color={palette.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {/* Preset Amounts */}
            <ThemedText style={[styles.selectAmountLabel, { color: palette.muted }]}>
              Select an amount
            </ThemedText>
            <View style={styles.presetGrid}>
              {PRESET_AMOUNTS.map((amount) => (
                <Pressable
                  key={amount}
                  style={[
                    styles.presetButton,
                    {
                      backgroundColor:
                        selectedAmount === amount ? `${palette.tint}15` : palette.surface,
                      borderColor: selectedAmount === amount ? palette.tint : palette.border,
                    },
                  ]}
                  onPress={() => {
                    setSelectedAmount(amount);
                    setCustomAmount('');
                  }}
                >
                  <ThemedText
                    type="defaultSemiBold"
                    style={[
                      styles.presetAmountText,
                      { color: selectedAmount === amount ? palette.tint : palette.text },
                    ]}
                  >
                    {'\u00A3'}{amount}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            {/* Custom Amount */}
            <ThemedText style={[styles.selectAmountLabel, { color: palette.muted, marginTop: Spacing.md }]}>
              Or enter a custom amount
            </ThemedText>
            <View
              style={[
                styles.customAmountContainer,
                {
                  backgroundColor: palette.surface,
                  borderColor: customAmount ? palette.tint : palette.border,
                },
              ]}
            >
              <ThemedText style={styles.currencySymbol}>{'\u00A3'}</ThemedText>
              <TextInput
                style={[styles.customAmountInput, { color: palette.text }]}
                placeholder="0.00"
                placeholderTextColor={palette.muted}
                keyboardType="decimal-pad"
                value={customAmount}
                onChangeText={(text) => {
                  setCustomAmount(text);
                  setSelectedAmount(null);
                }}
              />
            </View>

            {/* Add Funds Button */}
            <TouchableOpacity
              style={[
                styles.addFundsButton,
                {
                  backgroundColor: palette.tint,
                  opacity: (!selectedAmount && !customAmount) || processing ? 0.6 : 1,
                },
              ]}
              onPress={handleTopUp}
              disabled={(!selectedAmount && !customAmount) || processing}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="card-outline" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.addFundsButtonText}>
                    Add {'\u00A3'}
                    {selectedAmount || customAmount || '0'}
                  </ThemedText>
                </>
              )}
            </TouchableOpacity>

            {processing && (
              <ThemedText style={[styles.processingText, { color: palette.muted }]}>
                Processing payment...
              </ThemedText>
            )}
          </View>
        </View>
      </Modal>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
  },
  listContent: {
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },

  // Balance Card
  balanceCard: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -1,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  pendingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  topUpButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.lg,
    marginTop: Spacing.sm,
  },
  topUpButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  quickActionText: {
    fontWeight: '600',
    fontSize: 14,
  },

  // Pending Section
  pendingCard: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 15,
  },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },

  // Transactions
  transactionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  transactionsTitle: {
    fontSize: 18,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionDetails: {
    flex: 1,
    gap: 2,
  },
  transactionDescription: {
    fontSize: 15,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionAmount: {
    fontSize: 15,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    paddingTop: Spacing.lg,
  },
  modalTitle: {
    fontSize: 22,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  selectAmountLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  presetButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetAmountText: {
    fontSize: 20,
  },
  customAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    height: 56,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    marginRight: Spacing.xs,
  },
  customAmountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
  },
  addFundsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    marginTop: Spacing.lg,
  },
  addFundsButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  processingText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: Spacing.sm,
  },
});
