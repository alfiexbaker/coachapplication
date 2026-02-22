/**
 * Earnings Screen — Cash Reconciliation
 *
 * 3-tab view: Owed (default), Paid, Written Off.
 * Coaches track who owes money, mark paid, write off bad debts, send reminders.
 */

import { useCallback, useState, useMemo } from 'react';
import { FlatList, StyleSheet, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { SessionPaymentItem, type PaymentTab } from '@/components/earnings/session-payment-item';
import { PaymentSummaryCard } from '@/components/earnings/payment-summary-card';
import { ThemedText } from '@/components/themed-text';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Typography, Radii, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  useSessionPayments,
  type SessionPaymentItem as SessionPaymentItemType,
} from '@/hooks/use-session-payments';

const TABS: { key: PaymentTab; label: string }[] = [
  { key: 'owed', label: 'Owed' },
  { key: 'paid', label: 'Paid' },
  { key: 'written_off', label: 'Written Off' },
];

export default function EarningsScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<PaymentTab>('owed');

  const {
    unpaidSessions,
    paidSessions,
    writtenOffSessions,
    totalOwed,
    totalCollected,
    totalWrittenOff,
    unpaidCount,
    paidCount,
    writtenOffCount,
    handleMarkPaid,
    handleMarkUnpaid,
    handleWriteOff,
    handleRestore,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useSessionPayments();

  const activeData = useMemo(() => {
    switch (activeTab) {
      case 'owed':
        return unpaidSessions;
      case 'paid':
        return paidSessions;
      case 'written_off':
        return writtenOffSessions;
    }
  }, [activeTab, unpaidSessions, paidSessions, writtenOffSessions]);

  const handleSendReminder = useCallback(
    (item: SessionPaymentItemType) => {
      const amount = `\u00A3${item.invoice.total.toFixed(2)}`;
      const sessionDate = new Date(item.booking.scheduledAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      });
      const prefill = `Hi! Just a friendly reminder about the ${amount} payment for the session on ${sessionDate}. Let me know if you have any questions!`;

      // Navigate to messaging — use coach's thread or fallback
      router.push({
        pathname: '/chat/[threadId]',
        params: {
          threadId: item.booking.id,
          prefill,
        },
      } as never);
    },
    [],
  );

  const emptyMessage = useMemo(() => {
    switch (activeTab) {
      case 'owed':
        return { icon: 'checkmark-circle-outline' as const, title: 'All caught up!', message: 'No outstanding payments right now.' };
      case 'paid':
        return { icon: 'cash-outline' as const, title: 'No payments collected yet', message: 'Payments will appear here once you mark sessions as paid.' };
      case 'written_off':
        return { icon: 'close-circle-outline' as const, title: 'No written-off sessions', message: 'Sessions you write off will appear here.' };
    }
  }, [activeTab]);

  const renderItem = useCallback(
    ({ item }: { item: SessionPaymentItemType }) => (
      <SessionPaymentItem
        item={item}
        tab={activeTab}
        onMarkPaid={handleMarkPaid}
        onMarkUnpaid={handleMarkUnpaid}
        onWriteOff={handleWriteOff}
        onRestore={handleRestore}
        onSendReminder={handleSendReminder}
      />
    ),
    [activeTab, handleMarkPaid, handleMarkUnpaid, handleWriteOff, handleRestore, handleSendReminder],
  );

  const keyExtractor = useCallback(
    (item: SessionPaymentItemType) => item.booking.id,
    [],
  );

  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <ErrorState message={error?.message || 'Failed to load earnings.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (status === 'empty') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <EmptyState
          icon="cash-outline"
          title="No earnings yet"
          message="Complete your first paid session to start tracking earnings."
        />
      </SafeAreaView>
    );
  }

  const listHeader = (
    <View style={styles.listHeader}>
      <ScreenHeader title="Earnings" subtitle="Cash reconciliation" />

      <PaymentSummaryCard
        totalOwed={totalOwed}
        totalCollected={totalCollected}
        unpaidCount={unpaidCount}
        paidCount={paidCount}
        totalWrittenOff={totalWrittenOff}
        writtenOffCount={writtenOffCount}
      />

      <Row gap="xs" style={styles.tabRow}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tab.key === 'owed' ? unpaidCount : tab.key === 'paid' ? paidCount : writtenOffCount;
          return (
            <Clickable key={tab.key} onPress={() => setActiveTab(tab.key)}>
              <View
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isActive ? withAlpha(colors.tint, 0.09) : 'transparent',
                    borderColor: isActive ? colors.tint : colors.border,
                  },
                ]}
              >
                <ThemedText
                  style={{
                    color: isActive ? colors.tint : colors.muted,
                    ...Typography.small,
                    fontWeight: isActive ? '600' : '500',
                  }}
                >
                  {tab.label}{count > 0 ? ` (${count})` : ''}
                </ThemedText>
              </View>
            </Clickable>
          );
        })}
      </Row>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <FlatList
        data={activeData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.content}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <View style={styles.tabEmpty}>
            <Ionicons name={emptyMessage.icon} size={32} color={colors.muted} />
            <ThemedText type="defaultSemiBold" style={{ color: colors.muted, textAlign: 'center' }}>
              {emptyMessage.title}
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: colors.muted, textAlign: 'center' }]}>
              {emptyMessage.message}
            </ThemedText>
          </View>
        }
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  listHeader: {
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  tabRow: {
    marginTop: Spacing.xs,
  },
  tabChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  tabEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
});
