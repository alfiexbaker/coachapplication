/**
 * Bills & Expenses Screen
 *
 * Lists coach bills with summary card, 4-state screen pattern.
 */

import { useCallback } from 'react';
import { FlatList, StyleSheet, View, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { PageHeader } from '@/components/primitives/page-header';
import { Button } from '@/components/primitives/button';
import { BillListItem } from '@/components/bills/bill-list-item';
import { BillSummaryCard } from '@/components/bills/bill-summary-card';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useBills } from '@/hooks/use-bills';
import { Routes } from '@/navigation/routes';
import type { Bill } from '@/constants/types';

export default function BillsScreen() {
  const { colors } = useTheme();
  const { bills, summary, status, error, refreshing, onRefresh, retry } = useBills();

  const handleCreateBill = useCallback(() => {
    router.push(Routes.BILLS_CREATE);
  }, []);

  const renderItem = useCallback(({ item }: { item: Bill }) => {
    return <BillListItem bill={item} />;
  }, []);

  const keyExtractor = useCallback((item: Bill) => item.id, []);

  const header = (
    <PageHeader
      title="Bills & Expenses"
      showBack
      centerTitle
      rightAction={{ label: 'Add', onPress: handleCreateBill }}
    />
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
        <ErrorState message={error?.message ?? 'Failed to load bills.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (status === 'empty') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        {header}
        <EmptyState
          icon="receipt-outline"
          title="No bills yet"
          message="Track your coaching expenses — pitch hire, equipment, insurance and more."
          actionLabel="Add First Bill"
          onPressAction={handleCreateBill}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {header}
      <FlatList
        data={bills}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={summary ? <BillSummaryCard summary={summary} /> : null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
        )}
      />
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Button onPress={handleCreateBill} accessibilityLabel="Add new bill">
          Add Bill
        </Button>
      </View>
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
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  footer: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
