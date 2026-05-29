/**
 * Earnings Screen — Cash Reconciliation
 *
 * 3-tab view: Owed (default), Paid, Written Off.
 * Coaches track who owes money, mark paid, write off bad debts, send reminders.
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
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
import { CoachBusinessFilterRow } from '@/components/coach/coach-business-filter-row';
import { ThemedText } from '@/components/themed-text';
import { AccessibleListCell } from '@/components/ui/list-accessibility';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Typography, Radii, withAlpha, Components } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { coachPaymentInstructionsService } from '@/services/coach-payment-instructions-service';
import {
  useSessionPayments,
  type PaymentBusinessSummary,
  type SessionPaymentItem as SessionPaymentItemType,
} from '@/hooks/use-session-payments';
import type { CoachBusinessFilter } from '@/utils/coach-business-context';

const Separator = function Separator() {
  const { colors } = useTheme();
  return <View style={[styles.separator, { backgroundColor: colors.border }]} />;
};

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
  const [businessFilter, setBusinessFilter] = useState<CoachBusinessFilter>('all');
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
    orgSummary,
    independentSummary,
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

  const activeData = (() => {
    switch (activeTab) {
      case 'owed':
        return unpaidSessions;
      case 'paid':
        return paidSessions;
      case 'written_off':
        return writtenOffSessions;
    }
  })();

  const businessCounts = ({
    all: activeData.length,
    org: activeData.filter((item) => item.businessContext === 'org').length,
    independent: activeData.filter((item) => item.businessContext === 'independent').length,
  });

  const filteredData = (() => {
    const businessScopedData =
      businessFilter === 'all'
        ? activeData
        : activeData.filter((item) => item.businessContext === businessFilter);

    if (period === 'all') return businessScopedData;

    const now = new Date();
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const cutoff = period === 'week' ? startOfWeek : startOfMonth;

    return businessScopedData.filter(
      (item) => new Date(item.booking.scheduledAt).getTime() >= cutoff.getTime(),
    );
  })();

  const visibleOverdueItems = filteredData.filter((item) => item.isOverdue);

  const activeSummary = (() => {
    if (businessFilter === 'org') return orgSummary;
    if (businessFilter === 'independent') return independentSummary;
    return null;
  })();

  const summaryTitle = (() => {
    if (businessFilter === 'org') return 'Org Delivery Summary';
    if (businessFilter === 'independent') return 'Independent Revenue Summary';
    return 'Payment Summary';
  })();

  const summaryNote = (() => {
    if (businessFilter === 'org') {
      if (orgSummary.creditOwed > 0 || orgSummary.creditCollected > 0) {
        return 'Org-owned work is tracked as reconciler credit until real payout rails exist.';
      }
      return 'Club-routed work stays separate from your independent direct revenue.';
    }
    if (businessFilter === 'independent') {
      return 'This view only counts direct client revenue you manage yourself.';
    }
    return 'Org-assigned work stays split from independent client revenue.';
  })();

  const summaryBreakdown = (() => {
    if (businessFilter !== 'all') return undefined;

    const orgTotal = orgSummary.totalOwed + orgSummary.totalCollected + orgSummary.totalWrittenOff;
    const independentTotal =
      independentSummary.totalOwed +
      independentSummary.totalCollected +
      independentSummary.totalWrittenOff;

    return [
      {
        key: 'org',
        label: 'Org-assigned work',
        detail:
          orgSummary.creditOwed > 0 || orgSummary.creditCollected > 0
            ? `£${orgSummary.creditOwed.toFixed(2)} reconciler due · £${orgSummary.directOwed.toFixed(2)} coach-collected open`
            : 'Club work tracked separately from independent revenue',
        amount: orgTotal,
      },
      {
        key: 'independent',
        label: 'Independent work',
        detail: 'Direct clients you bill outside the app',
        amount: independentTotal,
      },
    ].filter((item) => item.amount > 0);
  })();

  const summaryMetrics = (() => {
    if (!activeSummary) {
      return {
        totalOwed,
        totalCollected,
        totalWrittenOff,
        unpaidCount,
        paidCount,
        writtenOffCount,
      };
    }

    return {
      totalOwed: activeSummary.totalOwed,
      totalCollected: activeSummary.totalCollected,
      totalWrittenOff: activeSummary.totalWrittenOff,
      unpaidCount: activeSummary.unpaidCount,
      paidCount: activeSummary.paidCount,
      writtenOffCount: activeSummary.writtenOffCount,
    };
  })();

  const overdueBadgeCount =
    businessFilter === 'org'
      ? orgSummary.overdueCount
      : businessFilter === 'independent'
        ? independentSummary.overdueCount
        : overdueCount;

  const handleSendReminder = async (item: SessionPaymentItemType) => {
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
  };

  const handleRemindAllOverdue = async () => {
    const overdueItems = visibleOverdueItems;
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
  };

  const subtitle = (() => {
    const summaryOverdueCount = activeSummary?.overdueCount ?? overdueCount;
    const summaryOwed = activeSummary?.totalOwed ?? totalOwed;
    const summaryCollected = activeSummary?.totalCollected ?? totalCollected;
    const summaryUnpaidCount = activeSummary?.unpaidCount ?? unpaidCount;
    const summaryPaidCount = activeSummary?.paidCount ?? paidCount;

    if (summaryOverdueCount > 0) {
      return `${summaryOverdueCount} overdue \u2014 chase payments`;
    }
    if (summaryUnpaidCount > 0) {
      return `\u00A3${summaryOwed.toFixed(2)} outstanding`;
    }
    if (summaryPaidCount > 0) {
      return `\u00A3${summaryCollected.toFixed(2)} collected`;
    }
    if (businessFilter === 'org') {
      return 'Track club-assigned delivery and reconciler state';
    }
    if (businessFilter === 'independent') {
      return 'Track direct client revenue';
    }
    return 'Track your session payments';
  })();

  const emptyMessage = (() => {
    switch (activeTab) {
      case 'owed':
        return {
          icon: 'checkmark-circle-outline' as const,
          title:
            businessFilter === 'org'
              ? 'No org payments due'
              : businessFilter === 'independent'
                ? 'No independent payments due'
                : 'All caught up!',
          message:
            businessFilter === 'org'
              ? 'No outstanding org-assigned work is waiting on payment right now.'
              : businessFilter === 'independent'
                ? 'No outstanding independent payments right now.'
                : 'No outstanding payments right now.',
        };
      case 'paid':
        return {
          icon: 'cash-outline' as const,
          title:
            businessFilter === 'org'
              ? 'No org payments reconciled yet'
              : businessFilter === 'independent'
                ? 'No independent payments collected yet'
                : 'No payments collected yet',
          message: 'Payments will appear here once you mark sessions as paid.',
        };
      case 'written_off':
        return {
          icon: 'close-circle-outline' as const,
          title:
            businessFilter === 'org'
              ? 'No org work written off'
              : businessFilter === 'independent'
                ? 'No independent sessions written off'
                : 'No written-off sessions',
          message: 'Sessions you write off will appear here.',
        };
    }
  })();

  const renderItem = ({ item }: { item: SessionPaymentItemType }) => (
    <SessionPaymentItem
      item={item}
      tab={activeTab}
      onMarkPaid={handleMarkPaid}
      onMarkUnpaid={handleMarkUnpaid}
      onWriteOff={handleWriteOff}
      onRestore={handleRestore}
      onSendReminder={handleSendReminder}
    />
  );

  const keyExtractor = (item: SessionPaymentItemType) => item.booking.id;

  const renderPaymentInstructionsSection = () => {
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
  };
  const renderShell = (content: ReactNode) => (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {content}
    </SafeAreaView>
  );
  const renderScrollableShell = (content: ReactNode) =>
    renderShell(
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      >
        {content}
      </ScrollView>,
  );

  if (status === 'loading') {
    return renderShell(
      <>
        <View style={styles.listHeader}>
          <PageHeader title="Earnings" subtitle="Loading payment summary" showBack />
        </View>
        <LoadingState variant="detail" />
      </>,
    );
  }

  if (status === 'error') {
    return renderShell(
      <>
        <View style={styles.listHeader}>
          <PageHeader title="Earnings" subtitle="Payment summary unavailable" showBack />
        </View>
        <ErrorState message={error?.message || 'Failed to load earnings.'} onRetry={retry} />
      </>,
    );
  }

  if (status === 'empty') {
    return renderScrollableShell(
      <>
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
      </>,
    );
  }

  const listHeader = (
    <View style={styles.listHeader}>
      <PageHeader title="Earnings" subtitle={subtitle} showBack />

      <PaymentSummaryCard
        title={summaryTitle}
        note={summaryNote}
        totalOwed={summaryMetrics.totalOwed}
        totalCollected={summaryMetrics.totalCollected}
        unpaidCount={summaryMetrics.unpaidCount}
        paidCount={summaryMetrics.paidCount}
        totalWrittenOff={summaryMetrics.totalWrittenOff}
        writtenOffCount={summaryMetrics.writtenOffCount}
        breakdownItems={summaryBreakdown}
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
                  {tab.key === 'owed' && overdueBadgeCount > 0 && (
                    <View style={[styles.overdueDot, { backgroundColor: colors.error }]}>
                      <ThemedText style={[Typography.micro, { color: colors.onError, fontWeight: '700' }]}>
                        {overdueBadgeCount}
                      </ThemedText>
                    </View>
                  )}
                </Row>
              </View>
            </Clickable>
          );
        })}
      </Row>

      <CoachBusinessFilterRow
        value={businessFilter}
        onChange={setBusinessFilter}
        counts={businessCounts}
      />

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

      {activeTab === 'owed' && visibleOverdueItems.length > 0 && (
        <Row style={{ marginTop: Spacing.xs }}>
          <Button
            onPress={handleRemindAllOverdue}
            variant="outline"
            style={{ minHeight: Components.buttonCompact.height }}
            accessibilityLabel={`Send reminder for ${visibleOverdueItems.length} overdue payments`}
            label={`Remind All Overdue (${visibleOverdueItems.length})`}
          />
        </Row>
      )}
    </View>
  );

  return renderShell(
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
    />,
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
