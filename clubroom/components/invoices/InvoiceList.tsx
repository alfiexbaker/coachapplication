import { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { InvoiceCard } from './InvoiceCard';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Invoice, InvoiceStatus, InvoiceFilter } from '@/constants/types';

// ============================================================================
// TYPES
// ============================================================================

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

interface FilterOption {
  value: InvoiceStatus | 'ALL';
  label: string;
  color: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FILTER_OPTIONS: FilterOption[] = [
  { value: 'ALL', label: 'All', color: '#6B7280' },
  { value: 'DRAFT', label: 'Draft', color: '#6B7280' },
  { value: 'SENT', label: 'Sent', color: '#2563EB' },
  { value: 'PAID', label: 'Paid', color: '#059669' },
  { value: 'VOID', label: 'Voided', color: '#DC2626' },
];

// ============================================================================
// COMPONENT
// ============================================================================

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});

  const handleStatusFilter = useCallback(
    (status: InvoiceStatus | 'ALL') => {
      setSelectedStatus(status);
      if (onFilterChange) {
        onFilterChange({
          status: status === 'ALL' ? undefined : status,
          dateFrom: dateRange.from,
          dateTo: dateRange.to,
        });
      }
    },
    [onFilterChange, dateRange]
  );

  const handleDateFilterClear = useCallback(() => {
    setDateRange({});
    if (onFilterChange) {
      onFilterChange({
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
      });
    }
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

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={48} color={palette.muted} />
      <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
        {emptyMessage}
      </ThemedText>
      {selectedStatus !== 'ALL' && (
        <TouchableOpacity
          style={[styles.clearFilterButton, { borderColor: palette.border }]}
          onPress={() => handleStatusFilter('ALL')}
        >
          <ThemedText style={[styles.clearFilterText, { color: palette.tint }]}>
            Clear filters
          </ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <View style={styles.filterContainer}>
        {/* Status Filter Pills */}
        <FlatList
          horizontal
          data={FILTER_OPTIONS}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterPill,
                {
                  backgroundColor:
                    selectedStatus === item.value ? `${item.color}15` : palette.surface,
                  borderColor: selectedStatus === item.value ? item.color : palette.border,
                },
              ]}
              onPress={() => handleStatusFilter(item.value)}
            >
              <View
                style={[
                  styles.filterDot,
                  { backgroundColor: item.value === 'ALL' ? 'transparent' : item.color },
                ]}
              />
              <ThemedText
                style={[
                  styles.filterPillText,
                  { color: selectedStatus === item.value ? item.color : palette.text },
                ]}
              >
                {item.label}
              </ThemedText>
            </TouchableOpacity>
          )}
        />

        {/* Date Range Filter */}
        <TouchableOpacity
          style={[
            styles.dateFilterButton,
            {
              backgroundColor: dateRange.from || dateRange.to ? `${palette.tint}15` : palette.surface,
              borderColor: dateRange.from || dateRange.to ? palette.tint : palette.border,
            },
          ]}
          onPress={() => setShowDateFilter(true)}
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={dateRange.from || dateRange.to ? palette.tint : palette.muted}
          />
          {(dateRange.from || dateRange.to) && (
            <TouchableOpacity onPress={handleDateFilterClear} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <Ionicons name="close-circle" size={16} color={palette.tint} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderHeader = () => (
    <>
      {ListHeaderComponent}
      {renderFilters()}
    </>
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
        ItemSeparatorComponent={() => <View style={{ height: compact ? 0 : Spacing.sm }} />}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />
          ) : undefined
        }
      />

      {/* Date Filter Modal - Simplified for demo */}
      <Modal
        visible={showDateFilter}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDateFilter(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="title">Filter by Date</ThemedText>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: palette.surfaceSecondary }]}
              onPress={() => setShowDateFilter(false)}
            >
              <Ionicons name="close" size={24} color={palette.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <ThemedText style={[styles.dateHint, { color: palette.muted }]}>
              Date range filtering coming soon...
            </ThemedText>

            {/* Quick date options */}
            {[
              { label: 'Last 7 days', days: 7 },
              { label: 'Last 30 days', days: 30 },
              { label: 'Last 90 days', days: 90 },
              { label: 'This year', days: 365 },
            ].map((option) => (
              <Pressable
                key={option.days}
                style={[styles.dateOption, { backgroundColor: palette.surface, borderColor: palette.border }]}
                onPress={() => {
                  const now = new Date();
                  const from = new Date();
                  from.setDate(now.getDate() - option.days);
                  setDateRange({ from: from.toISOString(), to: now.toISOString() });
                  setShowDateFilter(false);
                  if (onFilterChange) {
                    onFilterChange({
                      status: selectedStatus === 'ALL' ? undefined : selectedStatus,
                      dateFrom: from.toISOString(),
                      dateTo: now.toISOString(),
                    });
                  }
                }}
              >
                <ThemedText>{option.label}</ThemedText>
                <Ionicons name="chevron-forward" size={18} color={palette.muted} />
              </Pressable>
            ))}

            <TouchableOpacity
              style={[styles.clearButton, { borderColor: palette.border }]}
              onPress={handleDateFilterClear}
            >
              <ThemedText style={{ color: palette.error }}>Clear date filter</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  emptyContent: {
    flexGrow: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  filterList: {
    gap: Spacing.xs,
    flex: 1,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
    gap: 6,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dateFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  clearFilterButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  clearFilterText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Modal styles
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
  dateHint: {
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  dateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  clearButton: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
});
