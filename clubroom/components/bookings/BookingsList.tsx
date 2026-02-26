import { useCallback, useMemo } from 'react';
import { FlatList, View, StyleSheet, RefreshControl } from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { UnifiedBookingCard } from '@/components/bookings/UnifiedBookingCard';
import { SeriesBookingGroup } from '@/components/bookings/series-booking-group';
import { SessionOfferingCard } from '@/components/sessions/session-offering-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { BookingSummary, SessionOffering } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';
import { getBookingSummaryCoachName } from '@/utils/booking-display';

export type TimeFilter = 'upcoming' | 'past';

export interface BookingsListProps {
  items: (SessionOffering | BookingSummary)[];
  timeFilter: TimeFilter;
  onTimeFilterChange: (filter: TimeFilter) => void;
  userRole: 'USER' | 'PARENT' | 'COACH' | string | undefined;
  onOfferingPress: (offering: SessionOffering) => void;
  onFindCoachPress: () => void;
  onCreateSessionPress: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

/** Union type for display items: either a regular item or a series group */
type DisplayItem =
  | { type: 'offering'; data: SessionOffering }
  | { type: 'booking'; data: BookingSummary }
  | { type: 'series'; seriesId: string; bookings: BookingSummary[]; coachName: string };

export function BookingsList({
  items,
  timeFilter,
  onTimeFilterChange,
  userRole,
  onOfferingPress,
  onFindCoachPress,
  onCreateSessionPress,
  refreshing = false,
  onRefresh,
}: BookingsListProps) {
  const { colors: palette } = useTheme();

  const isCoach = userRole === 'COACH';

  /** Group bookings by seriesId, leaving ungrouped items as-is */
  const displayItems = useMemo((): DisplayItem[] => {
    const result: DisplayItem[] = [];
    const seriesMap = new Map<string, BookingSummary[]>();
    const seenSeriesIds = new Set<string>();

    for (const item of items) {
      if ('registrations' in item) {
        result.push({ type: 'offering', data: item });
        continue;
      }

      const booking = item as BookingSummary;
      if (booking.seriesId) {
        if (!seriesMap.has(booking.seriesId)) {
          seriesMap.set(booking.seriesId, []);
        }
        seriesMap.get(booking.seriesId)!.push(booking);
      } else {
        result.push({ type: 'booking', data: booking });
      }
    }

    // Add series groups
    for (const [seriesId, bookings] of seriesMap) {
      if (!seenSeriesIds.has(seriesId)) {
        seenSeriesIds.add(seriesId);
        result.push({
          type: 'series',
          seriesId,
          bookings,
          coachName: bookings[0] ? getBookingSummaryCoachName(bookings[0]) : 'Coach',
        });
      }
    }

    return result;
  }, [items]);

  const hasItems = displayItems.length > 0;

  const renderItem = useCallback(
    ({ item }: { item: DisplayItem }) => {
      if (item.type === 'offering') {
        return (
          <SessionOfferingCard
            offering={item.data}
            showCoach={!isCoach}
            showCapacity
            onPress={() => onOfferingPress(item.data)}
          />
        );
      }

      if (item.type === 'series') {
        return (
          <SeriesBookingGroup
            seriesId={item.seriesId}
            bookings={item.bookings}
            coachName={item.coachName}
          />
        );
      }

      // Regular booking
      return (
        <View style={styles.cardWrapper}>
          <UnifiedBookingCard
            booking={item.data}
            variant="standard"
            showActions={timeFilter === 'past'}
          />
        </View>
      );
    },
    [isCoach, onOfferingPress, timeFilter],
  );

  const keyExtractor = useCallback((item: DisplayItem) => {
    if (item.type === 'series') return `series-${item.seriesId}`;
    return item.data.id;
  }, []);

  return (
    <View style={styles.container}>
      {/* Time Filter - Simple pills */}
      <Row style={styles.filterRow}>
        <Clickable
          onPress={() => onTimeFilterChange('upcoming')}
          style={[
            styles.filterPill,
            { borderColor: timeFilter === 'upcoming' ? palette.tint : palette.border },
            timeFilter === 'upcoming'
              ? { backgroundColor: withAlpha(palette.tint, 0.1) }
              : undefined,
          ]}
        >
          <ThemedText
            style={[
              styles.filterText,
              { color: timeFilter === 'upcoming' ? palette.tint : palette.muted },
            ]}
          >
            Upcoming
          </ThemedText>
        </Clickable>
        <Clickable
          onPress={() => onTimeFilterChange('past')}
          style={[
            styles.filterPill,
            { borderColor: timeFilter === 'past' ? palette.tint : palette.border },
            timeFilter === 'past' ? { backgroundColor: withAlpha(palette.tint, 0.1) } : undefined,
          ]}
        >
          <ThemedText
            style={[
              styles.filterText,
              { color: timeFilter === 'past' ? palette.tint : palette.muted },
            ]}
          >
            Past
          </ThemedText>
        </Clickable>
      </Row>

      {hasItems ? (
        <FlatList
        accessibilityRole="list"
          data={displayItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={ListSeparator}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={palette.tint}
              />
            ) : undefined
          }
        />
      ) : (
        <View style={styles.emptyState}>
          <EmptyState
            icon="calendar-outline"
            title={`No ${timeFilter} sessions`}
            message={
              isCoach
                ? timeFilter === 'upcoming'
                  ? 'Create your first session offering'
                  : 'No past sessions yet'
                : timeFilter === 'upcoming'
                  ? 'Book your first coaching session'
                  : 'No past sessions yet'
            }
            actionLabel={
              timeFilter === 'upcoming' ? (isCoach ? 'Create Session' : 'Find a Coach') : undefined
            }
            onPressAction={
              timeFilter === 'upcoming'
                ? isCoach
                  ? onCreateSessionPress
                  : onFindCoachPress
                : undefined
            }
          />
        </View>
      )}
    </View>
  );
}

function ListSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterRow: {
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  filterText: { ...Typography.bodySmallSemiBold },
  list: {
    padding: Spacing.sm,
    paddingTop: 0,
  },
  cardWrapper: {
    marginBottom: 0,
  },
  separator: {
    height: Spacing.xs,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
});
