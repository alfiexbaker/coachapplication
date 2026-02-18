/**
 * Session Payments Screen
 *
 * Reconciliation view: completed sessions grouped by payment status.
 * Coaches can mark unpaid sessions as paid via inline MarkPaidButton.
 */

import { useCallback } from 'react';
import { SectionList, StyleSheet, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/primitives/page-header';
import { SessionPaymentItem } from '@/components/earnings/session-payment-item';
import { PaymentSummaryCard } from '@/components/earnings/payment-summary-card';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useSessionPayments, type SessionPaymentItem as SessionPaymentItemType } from '@/hooks/use-session-payments';

interface PaymentSection {
  title: string;
  data: SessionPaymentItemType[];
}

export default function SessionPaymentsScreen() {
  const { colors } = useTheme();
  const {
    unpaidSessions,
    paidSessions,
    totalOwed,
    totalCollected,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useSessionPayments();

  const renderItem = useCallback(
    ({ item }: { item: SessionPaymentItemType }) => <SessionPaymentItem item={item} />,
    [],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: PaymentSection }) => {
      if (section.data.length === 0) return null;
      return (
        <ThemedText type="defaultSemiBold" style={styles.sectionHeader}>
          {section.title}
        </ThemedText>
      );
    },
    [],
  );

  const keyExtractor = useCallback(
    (item: SessionPaymentItemType) => item.booking.id,
    [],
  );

  const header = (
    <PageHeader title="Session Payments" showBack centerTitle />
  );

  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        {header}
        <LoadingState variant="list" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        {header}
        <ErrorState message={error?.message ?? 'Failed to load payments.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (status === 'empty') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        {header}
        <EmptyState
          icon="checkmark-circle-outline"
          title="All sessions paid"
          message="You're up to date — no outstanding payments."
        />
      </SafeAreaView>
    );
  }

  const sections: PaymentSection[] = [
    { title: 'Unpaid', data: unpaidSessions },
    { title: 'Paid', data: paidSessions },
  ].filter((s) => s.data.length > 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {header}
      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <PaymentSummaryCard
            totalOwed={totalOwed}
            totalCollected={totalCollected}
            unpaidCount={unpaidSessions.length}
            paidCount={paidSessions.length}
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
        )}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing['3xl'],
  },
  sectionHeader: {
    marginTop: Spacing.sm,
    ...Typography.subheading,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
});
