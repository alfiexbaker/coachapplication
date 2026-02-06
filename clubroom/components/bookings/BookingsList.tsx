import { useCallback } from 'react';
import { FlatList, View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { UnifiedBookingCard } from '@/components/bookings/UnifiedBookingCard';
import { SessionOfferingCard } from '@/components/sessions/session-offering-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Colors, Spacing, Radii , Typography, withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BookingSummary, SessionOffering } from '@/constants/types';

export type TimeFilter = 'upcoming' | 'past';

export interface BookingsListProps {
  items: (SessionOffering | BookingSummary)[];
  timeFilter: TimeFilter;
  onTimeFilterChange: (filter: TimeFilter) => void;
  userRole: 'USER' | 'PARENT' | 'COACH' | string | undefined;
  onOfferingPress: (offering: SessionOffering) => void;
  onFindCoachPress: () => void;
  onCreateSessionPress: () => void;
}

export function BookingsList({
  items,
  timeFilter,
  onTimeFilterChange,
  userRole,
  onOfferingPress,
  onFindCoachPress,
  onCreateSessionPress,
}: BookingsListProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const isCoach = userRole === 'COACH';
  const hasItems = items.length > 0;

  const renderItem = useCallback(
    ({ item }: { item: SessionOffering | BookingSummary }) => {
      // SessionOffering (coach's offerings)
      if ('registrations' in item) {
        return (
          <SessionOfferingCard
            offering={item}
            showCoach={!isCoach}
            showCapacity={isCoach}
            onPress={() => onOfferingPress(item)}
          />
        );
      }
      // Regular booking - use unified card
      return (
        <View style={styles.cardWrapper}>
          <UnifiedBookingCard
            booking={item}
            variant="standard"
            showActions={timeFilter === 'past'}
          />
        </View>
      );
    },
    [isCoach, onOfferingPress, timeFilter]
  );

  const keyExtractor = useCallback((item: SessionOffering | BookingSummary) => item.id, []);

  return (
    <View style={styles.container}>
      {/* Time Filter - Simple pills */}
      <View style={styles.filterRow}>
        <Pressable
          onPress={() => onTimeFilterChange('upcoming')}
          style={[
            styles.filterPill,
            { borderColor: timeFilter === 'upcoming' ? palette.tint : palette.border },
            timeFilter === 'upcoming' ? { backgroundColor: withAlpha(palette.tint, 0.1) } : undefined,
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
        </Pressable>
        <Pressable
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
        </Pressable>
      </View>

      {hasItems ? (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={ListSeparator}
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
            actionLabel={timeFilter === 'upcoming' ? (isCoach ? 'Create Session' : 'Find a Coach') : undefined}
            onPressAction={timeFilter === 'upcoming' ? (isCoach ? onCreateSessionPress : onFindCoachPress) : undefined}
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
    flexDirection: 'row',
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
