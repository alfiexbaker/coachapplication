import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, FlatList, RefreshControl } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { EmptyState } from '@/components/ui/empty-state';
import { RecurringCard } from './RecurringCard';
import { Spacing } from '@/constants/theme';
import { RecurringBooking, RecurringBookingStatus } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import {
  RecurringFilterChip,
  RecurringSummaryCard,
  FILTER_DATA,
  type FilterOption,
  type FilterItem,
} from './recurring-list-sections';

interface RecurringListProps {
  bookings: RecurringBooking[];
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onPause?: (id: string, reason?: string) => Promise<void>;
  onResume?: (id: string) => Promise<void>;
  onCancel?: (id: string, reason?: string) => Promise<void>;
  onCardPress?: (recurring: RecurringBooking) => void;
  onCreatePress?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
  showFilters?: boolean;
}

export function RecurringList({
  bookings,
  loading = false,
  refreshing = false,
  onRefresh,
  onPause,
  onResume,
  onCancel,
  onCardPress,
  onCreatePress,
  emptyTitle = 'No Recurring Bookings',
  emptyMessage = 'You don\'t have any recurring bookings yet. Subscribe to a weekly or monthly session slot to get started.',
  showFilters = true,
}: RecurringListProps) {
  const { colors: palette } = useTheme();
  const [activeFilter, setActiveFilter] = useState<FilterOption>('ALL');

  const filterCounts = useMemo(() => ({
    ALL: bookings.length,
    ACTIVE: bookings.filter((b) => b.status === 'ACTIVE').length,
    PAUSED: bookings.filter((b) => b.status === 'PAUSED').length,
    CANCELLED: bookings.filter((b) => b.status === 'CANCELLED').length,
    EXPIRED: bookings.filter((b) => b.status === 'EXPIRED').length,
  }), [bookings]);

  const filteredBookings = useMemo(() => {
    if (activeFilter === 'ALL') return bookings;
    return bookings.filter((b) => b.status === activeFilter);
  }, [bookings, activeFilter]);

  const sortedBookings = useMemo(() => {
    return [...filteredBookings].sort((a, b) => {
      const statusPriority: Record<RecurringBookingStatus, number> = {
        ACTIVE: 0, PAUSED: 1, EXPIRED: 2, CANCELLED: 3,
      };
      const statusDiff = statusPriority[a.status] - statusPriority[b.status];
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filteredBookings]);

  const renderItem = useCallback(
    ({ item }: { item: RecurringBooking }) => (
      <RecurringCard
        recurring={item}
        onPause={onPause}
        onResume={onResume}
        onCancel={onCancel}
        onPress={onCardPress}
        loading={loading}
      />
    ),
    [onPause, onResume, onCancel, onCardPress, loading]
  );

  const renderEmpty = useCallback(() => {
    if (loading) return null;

    if (bookings.length > 0 && filteredBookings.length === 0) {
      return (
        <EmptyState
          icon="filter"
          title="No Matching Bookings"
          message={`No ${activeFilter.toLowerCase()} recurring bookings found.`}
          actionLabel="Show All"
          onPressAction={() => setActiveFilter('ALL')}
        />
      );
    }

    return (
      <EmptyState
        icon="repeat"
        title={emptyTitle}
        message={emptyMessage}
        actionLabel={onCreatePress ? 'Create Subscription' : undefined}
        onPressAction={onCreatePress}
      />
    );
  }, [loading, bookings.length, filteredBookings.length, activeFilter, emptyTitle, emptyMessage, onCreatePress]);

  const renderFilterChip = useCallback(
    ({ item }: { item: FilterItem }) => (
      <RecurringFilterChip
        label={item.label}
        isActive={activeFilter === item.key}
        onPress={() => setActiveFilter(item.key)}
        count={filterCounts[item.key]}
        palette={palette}
      />
    ),
    [activeFilter, filterCounts, palette]
  );

  const filterKeyExtractor = useCallback((item: FilterItem) => item.key, []);
  const bookingKeyExtractor = useCallback((item: RecurringBooking) => item.id, []);

  return (
    <ThemedView style={styles.container}>
      {bookings.length > 0 && (
        <RecurringSummaryCard
          bookings={bookings}
          activeCount={filterCounts.ACTIVE}
          palette={palette}
        />
      )}

      {showFilters && bookings.length > 0 && (
        <View style={styles.filtersContainer}>
          <FlatList
            horizontal
            data={FILTER_DATA}
            renderItem={renderFilterChip}
            keyExtractor={filterKeyExtractor}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
          />
        </View>
      )}

      <FlatList
        data={sortedBookings}
        renderItem={renderItem}
        keyExtractor={bookingKeyExtractor}
        contentContainerStyle={[
          styles.listContent,
          sortedBookings.length === 0 ? styles.emptyContent : undefined,
        ]}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={palette.tint}
              colors={[palette.tint]}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filtersContainer: { paddingVertical: Spacing.sm },
  filtersContent: { paddingHorizontal: Spacing.md, gap: Spacing.xs },
  listContent: { padding: Spacing.md },
  emptyContent: { flex: 1, justifyContent: 'center' },
});
