import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, FlatList, RefreshControl, Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState } from '@/components/ui/empty-state';
import { RecurringCard } from './RecurringCard';
import { Spacing, Typography, Radii } from '@/constants/theme';
import { RecurringBooking, RecurringBookingStatus } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

/**
 * Filter options for recurring bookings list
 */
type FilterOption = 'ALL' | RecurringBookingStatus;

/**
 * Props for the RecurringList component
 */
interface RecurringListProps {
  /** List of recurring bookings to display */
  bookings: RecurringBooking[];
  /** Whether the list is loading */
  loading?: boolean;
  /** Whether the list is refreshing */
  refreshing?: boolean;
  /** Called when the user pulls to refresh */
  onRefresh?: () => void;
  /** Called when the user wants to pause a subscription */
  onPause?: (id: string, reason?: string) => Promise<void>;
  /** Called when the user wants to resume a subscription */
  onResume?: (id: string) => Promise<void>;
  /** Called when the user wants to cancel a subscription */
  onCancel?: (id: string, reason?: string) => Promise<void>;
  /** Called when a card is pressed */
  onCardPress?: (recurring: RecurringBooking) => void;
  /** Called when the user wants to create a new subscription */
  onCreatePress?: () => void;
  /** Title for the empty state */
  emptyTitle?: string;
  /** Message for the empty state */
  emptyMessage?: string;
  /** Whether to show filter tabs */
  showFilters?: boolean;
}

/**
 * Filter chip component
 */
function FilterChip({
  label,
  isActive,
  onPress,
  count,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  count?: number;
}) {
  const { colors: palette } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterChip,
        {
          backgroundColor: isActive ? palette.tint : palette.surface,
          borderColor: isActive ? palette.tint : palette.border,
        },
      ]}
    >
      <ThemedText
        style={[
          styles.filterChipText,
          { color: isActive ? palette.onPrimary : palette.foreground },
        ]}
      >
        {label}
      </ThemedText>
      {count !== undefined && count > 0 && (
        <View
          style={[
            styles.filterChipBadge,
            { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : palette.border },
          ]}
        >
          <ThemedText
            style={[
              styles.filterChipBadgeText,
              { color: isActive ? palette.onPrimary : palette.muted },
            ]}
          >
            {count}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

/**
 * RecurringList displays a filterable list of recurring booking subscriptions
 * with empty states and pull-to-refresh functionality.
 */
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

  // Calculate counts for each filter
  const filterCounts = useMemo(() => {
    return {
      ALL: bookings.length,
      ACTIVE: bookings.filter((b) => b.status === 'ACTIVE').length,
      PAUSED: bookings.filter((b) => b.status === 'PAUSED').length,
      CANCELLED: bookings.filter((b) => b.status === 'CANCELLED').length,
      EXPIRED: bookings.filter((b) => b.status === 'EXPIRED').length,
    };
  }, [bookings]);

  // Filter bookings based on active filter
  const filteredBookings = useMemo(() => {
    if (activeFilter === 'ALL') {
      return bookings;
    }
    return bookings.filter((b) => b.status === activeFilter);
  }, [bookings, activeFilter]);

  // Sort bookings: active first, then by creation date
  const sortedBookings = useMemo(() => {
    return [...filteredBookings].sort((a, b) => {
      // Sort by status priority (ACTIVE > PAUSED > others)
      const statusPriority: Record<RecurringBookingStatus, number> = {
        ACTIVE: 0,
        PAUSED: 1,
        EXPIRED: 2,
        CANCELLED: 3,
      };
      const statusDiff = statusPriority[a.status] - statusPriority[b.status];
      if (statusDiff !== 0) return statusDiff;

      // Then by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filteredBookings]);

  const renderItem = ({ item }: { item: RecurringBooking }) => (
    <RecurringCard
      recurring={item}
      onPause={onPause}
      onResume={onResume}
      onCancel={onCancel}
      onPress={onCardPress}
      loading={loading}
    />
  );

  const renderEmpty = () => {
    if (loading) {
      return null;
    }

    // If we have bookings but none match the filter
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
  };

  const FILTER_DATA: { key: FilterOption; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'ACTIVE', label: 'Active' },
    { key: 'PAUSED', label: 'Paused' },
    { key: 'CANCELLED', label: 'Cancelled' },
    { key: 'EXPIRED', label: 'Expired' },
  ];

  const renderFilterChip = useCallback(
    ({ item }: { item: { key: FilterOption; label: string } }) => (
      <FilterChip
        label={item.label}
        isActive={activeFilter === item.key}
        onPress={() => setActiveFilter(item.key)}
        count={filterCounts[item.key]}
      />
    ),
    [activeFilter, filterCounts]
  );

  const filterKeyExtractor = useCallback((item: { key: FilterOption; label: string }) => item.key, []);

  const renderHeader = () => {
    if (!showFilters || bookings.length === 0) {
      return null;
    }

    return (
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
    );
  };

  const renderSummary = () => {
    if (bookings.length === 0) {
      return null;
    }

    const activeCount = filterCounts.ACTIVE;
    const totalMonthlyValue = bookings
      .filter((b) => b.status === 'ACTIVE' && b.pricePerSession)
      .reduce((sum, b) => {
        const sessionsPerMonth =
          b.frequency === 'WEEKLY' ? 4 : b.frequency === 'BIWEEKLY' ? 2 : 1;
        return sum + (b.pricePerSession || 0) * sessionsPerMonth;
      }, 0);

    return (
      <View style={[styles.summaryContainer, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={styles.summaryItem}>
          <ThemedText style={[styles.summaryValue, { color: palette.success }]}>
            {activeCount}
          </ThemedText>
          <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
            Active
          </ThemedText>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />
        <View style={styles.summaryItem}>
          <ThemedText style={[styles.summaryValue, { color: palette.foreground }]}>
            ${totalMonthlyValue.toFixed(0)}
          </ThemedText>
          <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
            Est. Monthly
          </ThemedText>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />
        <View style={styles.summaryItem}>
          <ThemedText style={[styles.summaryValue, { color: palette.foreground }]}>
            {bookings.reduce((sum, b) => sum + b.sessionsCompleted, 0)}
          </ThemedText>
          <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
            Total Sessions
          </ThemedText>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {renderSummary()}
      {renderHeader()}
      <FlatList
        data={sortedBookings}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
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
  container: {
    flex: 1,
  },
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    ...Typography.title,
    fontWeight: '700',
  },
  summaryLabel: {
    ...Typography.caption,
  },
  summaryDivider: {
    width: 1,
    height: 32,
  },
  filtersContainer: {
    paddingVertical: Spacing.sm,
  },
  filtersContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
    marginRight: Spacing.xs,
  },
  filterChipText: {
    ...Typography.smallSemiBold,
  },
  filterChipBadge: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
    minWidth: 20,
    alignItems: 'center',
  },
  filterChipBadgeText: {
    ...Typography.micro,
    fontWeight: '700',
  },
  listContent: {
    padding: Spacing.md,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
  },
});
