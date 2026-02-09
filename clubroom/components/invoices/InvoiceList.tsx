import { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { InvoiceCard } from './InvoiceCard';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Invoice, InvoiceStatus, InvoiceFilter } from '@/constants/types';
import {
  StatusFilterBar,
  DateFilterModal,
  InvoiceEmptyState,
  InvoiceSeparator,
} from './invoice-list-sections';

interface InvoiceListProps {
  invoices: Invoice[];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onFilterChange?: (filter: InvoiceFilter) => void;
  compact?: boolean;
  showFilters?: boolean;
  emptyMessage?: string;
  ListHeaderComponent?: React.ReactElement;
}

export function InvoiceList({
  invoices,
  loading = false,
  refreshing = false,
  onRefresh,
  onFilterChange,
  compact = false,
  showFilters = true,
  emptyMessage = 'No invoices found',
  ListHeaderComponent,
}: InvoiceListProps) {
  const { colors: palette } = useTheme();
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});

  const handleStatusFilter = useCallback(
    (status: InvoiceStatus | 'ALL') => {
      setSelectedStatus(status);
      onFilterChange?.({
        status: status === 'ALL' ? undefined : status,
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
      });
    },
    [onFilterChange, dateRange]
  );

  const handleDateSelect = useCallback(
    (from: string, to: string) => {
      setDateRange({ from, to });
      setShowDateFilter(false);
      onFilterChange?.({
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        dateFrom: from,
        dateTo: to,
      });
    },
    [onFilterChange, selectedStatus]
  );

  const handleDateClear = useCallback(() => {
    setDateRange({});
    onFilterChange?.({
      status: selectedStatus === 'ALL' ? undefined : selectedStatus,
    });
    setShowDateFilter(false);
  }, [onFilterChange, selectedStatus]);

  const filteredInvoices =
    selectedStatus === 'ALL'
      ? invoices
      : invoices.filter((inv) => inv.status === selectedStatus);

  const renderItem = useCallback(
    ({ item, index }: { item: Invoice; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
        <InvoiceCard invoice={item} compact={compact} />
      </Animated.View>
    ),
    [compact]
  );

  const renderEmpty = useCallback(
    () => (
      <InvoiceEmptyState
        message={emptyMessage}
        hasFilter={selectedStatus !== 'ALL'}
        onClearFilter={() => handleStatusFilter('ALL')}
        palette={palette}
      />
    ),
    [emptyMessage, selectedStatus, handleStatusFilter, palette]
  );

  const renderHeader = useCallback(
    () => (
      <>
        {ListHeaderComponent}
        {showFilters && (
          <StatusFilterBar
            selectedStatus={selectedStatus}
            onStatusChange={handleStatusFilter}
            dateRange={dateRange}
            onDatePress={() => setShowDateFilter(true)}
            onDateClear={handleDateClear}
            palette={palette}
          />
        )}
      </>
    ),
    [ListHeaderComponent, showFilters, selectedStatus, handleStatusFilter, dateRange, handleDateClear, palette]
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredInvoices}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          filteredInvoices.length === 0 && styles.emptyContent,
        ]}
        ItemSeparatorComponent={compact ? undefined : InvoiceSeparator}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />
          ) : undefined
        }
      />

      <DateFilterModal
        visible={showDateFilter}
        onClose={() => setShowDateFilter(false)}
        onSelect={handleDateSelect}
        onClear={handleDateClear}
        palette={palette}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingBottom: Spacing.xl, paddingHorizontal: Spacing.sm },
  emptyContent: { flexGrow: 1 },
});
