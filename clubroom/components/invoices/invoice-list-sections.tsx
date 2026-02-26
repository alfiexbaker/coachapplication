/**
 * Extracted sub-components for InvoiceList.
 *
 * FILTER_OPTIONS constant, FilterOption type.
 * StatusFilterBar — horizontal filter pills + date filter button.
 * DateFilterModal — date range quick-select modal.
 * InvoiceEmptyState — empty state with optional clear-filter button.
 * InvoiceSeparator — list item separator.
 */

import React, { memo, useCallback } from 'react';
import { View, Modal, FlatList } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { InvoiceStatus } from '@/constants/types';
import { styles } from './invoice-list-styles';

export interface FilterOption {
  value: InvoiceStatus | 'ALL';
  label: string;
  color: string;
}

function getFilterOptions(palette: ThemeColors): FilterOption[] {
  return [
    { value: 'ALL', label: 'All', color: palette.muted },
    { value: 'DRAFT', label: 'Draft', color: palette.muted },
    { value: 'SENT', label: 'Sent', color: palette.info },
    { value: 'PAID', label: 'Paid', color: palette.success },
    { value: 'VOID', label: 'Voided', color: palette.error },
  ];
}

export function InvoiceSeparator() {
  return <View style={{ height: Spacing.sm }} />;
}

// ─── StatusFilterBar ────────────────────────────────────────────────────────

interface StatusFilterBarProps {
  selectedStatus: InvoiceStatus | 'ALL';
  onStatusChange: (status: InvoiceStatus | 'ALL') => void;
  dateRange: { from?: string; to?: string };
  onDatePress: () => void;
  onDateClear: () => void;
  palette: ThemeColors;
}

export const StatusFilterBar = memo(function StatusFilterBar({
  selectedStatus,
  onStatusChange,
  dateRange,
  onDatePress,
  onDateClear,
  palette,
}: StatusFilterBarProps) {
  const filterOptions = getFilterOptions(palette);

  const renderFilterPill = useCallback(
    ({ item }: { item: FilterOption }) => (
      <Clickable
        style={[
          styles.filterPill,
          {
            backgroundColor:
              selectedStatus === item.value ? withAlpha(item.color, 0.15) : palette.surface,
            borderColor: selectedStatus === item.value ? item.color : palette.border,
          },
        ]}
        onPress={() => onStatusChange(item.value)}
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
      </Clickable>
    ),
    [selectedStatus, palette, onStatusChange],
  );

  const filterKeyExtractor = useCallback((item: FilterOption) => item.value, []);
  const hasDateFilter = !!(dateRange.from || dateRange.to);

  return (
    <Row align="center" gap="xs" style={styles.filterContainer}>
      <FlatList
        accessibilityRole="list"
        horizontal
        data={filterOptions}
        keyExtractor={filterKeyExtractor}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        renderItem={renderFilterPill}
      />
      <Clickable
        accessibilityLabel="Filter by date"
        style={[
          styles.dateFilterButton,
          {
            backgroundColor: hasDateFilter ? withAlpha(palette.tint, 0.15) : palette.surface,
            borderColor: hasDateFilter ? palette.tint : palette.border,
          },
        ]}
        onPress={onDatePress}
      >
        <Ionicons
          name="calendar-outline"
          size={16}
          color={hasDateFilter ? palette.tint : palette.muted}
        />
        {hasDateFilter && (
          <Clickable accessibilityLabel="Clear date filter" onPress={onDateClear} hitSlop={10}>
            <Ionicons name="close-circle" size={16} color={palette.tint} />
          </Clickable>
        )}
      </Clickable>
    </Row>
  );
});

// ─── DateFilterModal ────────────────────────────────────────────────────────

interface DateFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (from: string, to: string) => void;
  onClear: () => void;
  palette: ThemeColors;
}

const DATE_OPTIONS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'This year', days: 365 },
];

export const DateFilterModal = memo(function DateFilterModal({
  visible,
  onClose,
  onSelect,
  onClear,
  palette,
}: DateFilterModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: palette.background }]}>
        <Row align="center" justify="space-between" style={styles.modalHeader}>
          <ThemedText type="title">Filter by Date</ThemedText>
          <Clickable
            accessibilityLabel="Close"
            style={[styles.closeButton, { backgroundColor: palette.surfaceSecondary }]}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={palette.text} />
          </Clickable>
        </Row>

        <View style={styles.modalContent}>
          <ThemedText style={[styles.dateHint, { color: palette.muted }]}>
            Date range filtering coming soon...
          </ThemedText>

          {DATE_OPTIONS.map((option) => (
            <Clickable
              key={option.days}
              style={[
                styles.dateOption,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
              onPress={() => {
                const now = new Date();
                const from = new Date();
                from.setDate(now.getDate() - option.days);
                onSelect(from.toISOString(), now.toISOString());
              }}
            >
              <ThemedText>{option.label}</ThemedText>
              <Ionicons name="chevron-forward" size={18} color={palette.muted} />
            </Clickable>
          ))}

          <Clickable
            style={[styles.clearButton, { borderColor: palette.border }]}
            onPress={onClear}
          >
            <ThemedText style={{ color: palette.error }}>Clear date filter</ThemedText>
          </Clickable>
        </View>
      </View>
    </Modal>
  );
});

// ─── InvoiceEmptyState ──────────────────────────────────────────────────────

interface InvoiceEmptyStateProps {
  message: string;
  hasFilter: boolean;
  onClearFilter: () => void;
  palette: ThemeColors;
}

export const InvoiceEmptyState = memo(function InvoiceEmptyState({
  message,
  hasFilter,
  onClearFilter,
  palette,
}: InvoiceEmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={48} color={palette.muted} />
      <ThemedText style={[styles.emptyText, { color: palette.muted }]}>{message}</ThemedText>
      {hasFilter && (
        <Clickable
          style={[styles.clearFilterButton, { borderColor: palette.border }]}
          onPress={onClearFilter}
        >
          <ThemedText style={[styles.clearFilterText, { color: palette.tint }]}>
            Clear filters
          </ThemedText>
        </Clickable>
      )}
    </View>
  );
});

export { styles };
