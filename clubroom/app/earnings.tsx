/**
 * Earnings Screen — Cash Reconciliation
 *
 * 3-tab view: Owed (default), Paid, Written Off.
 * Coaches track who owes money, mark paid, write off bad debts, send reminders.
 */

import { memo, useCallback, useState, useMemo } from 'react';
import { FlatList, StyleSheet, View, RefreshControl, Share, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { PageHeader } from '@/components/primitives/page-header';
import {
  SessionPaymentItem,
  type PaymentTab,
} from '@/components/earnings/session-payment-item';
import { PaymentSummaryCard } from '@/components/earnings/payment-summary-card';
import { CoachPaymentInstructionsCard } from '@/components/earnings/coach-payment-instructions-card';
import { ThemedText } from '@/components/themed-text';
import { AccessibleListCell } from '@/components/ui/list-accessibility';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Typography, Radii, withAlpha, Components } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { coachPaymentInstructionsService } from '@/services/coach-payment-instructions-service';
import {
  useSessionPayments,
  type SessionPaymentItem as SessionPaymentItemType,
} from '@/hooks/use-session-payments';

const Separator = memo(function Separator() {
  const { colors } = useTheme();
  return <View style={[styles.separator, { backgroundColor: colors.border }]} />;
});

const TABS: { key: PaymentTab; label: string }[] = [
  { key: 'owed', label: 'Owed' },
  { key: 'paid', label: 'Paid' },
  { key: 'written_off', label: 'Written Off' },
];

type Period = 'week' | 'month' | 'all';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
];

export default function EarningsScreen() {
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<PaymentTab>('owed');
  const [period, setPeriod] = useState<Period>('all');
  const [showPaymentInstructions, setShowPaymentInstructions] = useState(false);

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
    overdueCount,
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

  const filteredData = useMemo(() => {
    if (period === 'all') return activeData;

    const now = new Date();
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const cutoff = period === 'week' ? startOfWeek : startOfMonth;

    return activeData.filter(
      (item) => new Date(item.booking.scheduledAt).getTime() >= cutoff.getTime(),
    );
  }, [activeData, period]);

  const handleSendReminder = useCallback(
    async (item: SessionPaymentItemType) => {
      const result = await coachPaymentInstructionsService.getCoachPaymentInstructions(
        currentUser?.id ?? '',
      );
      const instructions =
        result.success && result.data.coachId
          ? result.data
          : {
              coachId: currentUser?.id ?? '',
              payeeName: '',
              bankTransferDetails: '',
              paymentNotes: '',
            };
      const message = coachPaymentInstructionsService.buildReminderMessage({
        item,
        coachName: currentUser?.name,
        instructions,
      });
      try {
        await Share.share({ message });
      } catch {
        // User cancelled share sheet — no action needed
      }
    },
    [currentUser?.id, currentUser?.name],
  );

  const handleRemindAllOverdue = useCallback(async () => {
    const overdueItems = unpaidSessions.filter((s) => s.isOverdue);
    if (overdueItems.length === 0) return;

    const result = await coachPaymentInstructionsService.getCoachPaymentInstructions(
      currentUser?.id ?? '',
    );
    const instructions =
      result.success && result.data.coachId
        ? result.data
        : {
            coachId: currentUser?.id ?? '',
            payeeName: '',
            bankTransferDetails: '',
            paymentNotes: '',
          };
    const message = coachPaymentInstructionsService.buildBatchReminderMessage({
      items: overdueItems,
      coachName: currentUser?.name,
      instructions,
    });
    try {
      await Share.share({ message });
    } catch {
      // User cancelled
    }
  }, [currentUser?.id, currentUser?.name, unpaidSessions]);

  const subtitle = useMemo(() => {
    if (overdueCount > 0) {
      return `${overdueCount} overdue \u2014 chase payments`;
    }
    if (unpaidCount > 0) {
      return `\u00A3${totalOwed.toFixed(2)} outstanding`;
    }
    if (paidCount > 0) {
      return `\u00A3${totalCollected.toFixed(2)} collected`;
    }
    return 'Track your session payments';
  }, [overdueCount, unpaidCount, paidCount, totalOwed, totalCollected]);

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

  const renderPaymentInstructionsSection = useCallback(() => {
    if (!currentUser?.id) return null;

    return (
      <View style={styles.instructionsSection}>
        <Clickable
          onPress={() => setShowPaymentInstructions((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel={
            showPaymentInstructions ? 'Hide payment instructions' : 'Show payment instructions'
          }
        >
          <View
            style={[
              styles.instructionsToggle,
              {
                borderColor: showPaymentInstructions ? colors.tint : colors.border,
                backgroundColor: showPaymentInstructions
                  ? withAlpha(colors.tint, 0.06)
                  : colors.surface,
              },
            ]}
          >
            <Row align="center" justify="between" gap="sm">
              <Row align="center" gap="xs" style={styles.instructionsToggleTextWrap}>
                <Ionicons name="business-outline" size={16} color={colors.tint} />
                <View style={styles.instructionsToggleTextWrap}>
                  <ThemedText style={styles.instructionsToggleTitle}>
                    Payment Instructions
                  </ThemedText>
                  <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                    {showPaymentInstructions ? 'Tap to hide' : 'Set up / copy / share details'}
                  </ThemedText>
                </View>
              </Row>
              <Ionicons
                name={showPaymentInstructions ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.muted}
              />
            </Row>
          </View>
        </Clickable>

        {showPaymentInstructions ? (
          <CoachPaymentInstructionsCard
            coachId={currentUser.id}
            coachName={currentUser.name}
            editable
          />
        ) : null}
      </View>
    );
  }, [colors, currentUser?.id, currentUser?.name, showPaymentInstructions]);

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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
          }
        >
          <View style={styles.listHeader}>
            <PageHeader
              title="Earnings"
              subtitle="Track your session payments"
              showBack
            />
            {renderPaymentInstructionsSection()}
          </View>
          <EmptyState
            icon="cash-outline"
            title="No earnings yet"
            message="Complete your first paid session to start tracking earnings."
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const listHeader = (
    <View style={styles.listHeader}>
      <PageHeader title="Earnings" subtitle={subtitle} showBack />

      <PaymentSummaryCard
        totalOwed={totalOwed}
        totalCollected={totalCollected}
        unpaidCount={unpaidCount}
        paidCount={paidCount}
        totalWrittenOff={totalWrittenOff}
        writtenOffCount={writtenOffCount}
      />

      {renderPaymentInstructionsSection()}

      <Row gap="xs" style={styles.tabRow}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tab.key === 'owed' ? unpaidCount : tab.key === 'paid' ? paidCount : writtenOffCount;
          return (
            <Clickable key={tab.key} onPress={() => setActiveTab(tab.key)} accessibilityRole="tab" accessibilityLabel={`${tab.label} tab${count > 0 ? `, ${count} items` : ''}`}>
              <View
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isActive ? withAlpha(colors.tint, 0.09) : 'transparent',
                    borderColor: isActive ? colors.tint : colors.border,
                  },
                ]}
              >
                <Row align="center" gap="xxs">
                  <ThemedText
                    style={{
                      color: isActive ? colors.tint : colors.muted,
                      ...Typography.small,
                      fontWeight: isActive ? '600' : '500',
                    }}
                  >
                    {tab.label}{count > 0 ? ` (${count})` : ''}
                  </ThemedText>
                  {tab.key === 'owed' && overdueCount > 0 && (
                    <View style={[styles.overdueDot, { backgroundColor: colors.error }]}>
                      <ThemedText style={[Typography.micro, { color: colors.onError, fontWeight: '700' }]}>
                        {overdueCount}
                      </ThemedText>
                    </View>
                  )}
                </Row>
              </View>
            </Clickable>
          );
        })}
      </Row>

      <Row gap="xs" style={{ marginTop: Spacing.xs }}>
        {PERIODS.map((p) => {
          const isActive = period === p.key;
          return (
            <Clickable key={p.key} onPress={() => setPeriod(p.key)} accessibilityRole="button" accessibilityLabel={`${p.label} filter`}>
              <View
                style={[
                  styles.periodChip,
                  {
                    backgroundColor: isActive ? withAlpha(colors.foreground, 0.06) : 'transparent',
                  },
                ]}
              >
                <ThemedText
                  style={{
                    ...Typography.caption,
                    color: isActive ? colors.foreground : colors.muted,
                    fontWeight: isActive ? '600' : '400',
                  }}
                >
                  {p.label}
                </ThemedText>
              </View>
            </Clickable>
          );
        })}
      </Row>

      {activeTab === 'owed' && overdueCount > 0 && (
        <Row style={{ marginTop: Spacing.xs }}>
          <Button
            onPress={handleRemindAllOverdue}
            variant="outline"
            style={{ minHeight: Components.buttonCompact.height }}
            accessibilityLabel={`Send reminder for ${overdueCount} overdue payments`}
          >
            Remind All Overdue ({overdueCount})
          </Button>
        </Row>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <FlatList
        CellRendererComponent={AccessibleListCell}
        accessibilityRole="list"
        data={filteredData}
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
        ItemSeparatorComponent={Separator}
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
  overdueDot: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: Spacing.xxs,
  },
  tabEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.xs,
  },
  periodChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  instructionsSection: {
    gap: Spacing.xs,
  },
  instructionsToggle: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  instructionsToggleTextWrap: {
    flex: 1,
  },
  instructionsToggleTitle: {
    ...Typography.bodySmallSemiBold,
  },
});
