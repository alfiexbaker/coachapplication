import { FlatList, View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { UnifiedBookingCard } from '@/components/bookings/UnifiedBookingCard';
import { SessionOfferingCard } from '@/components/sessions/session-offering-card';
import { Colors, Spacing, Radii } from '@/constants/theme';
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

  return (
    <View style={styles.container}>
      {/* Time Filter - Simple pills */}
      <View style={styles.filterRow}>
        <Pressable
          onPress={() => onTimeFilterChange('upcoming')}
          style={[
            styles.filterPill,
            { borderColor: timeFilter === 'upcoming' ? palette.tint : palette.border },
            timeFilter === 'upcoming' ? { backgroundColor: `${palette.tint}10` } : undefined,
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
            timeFilter === 'past' ? { backgroundColor: `${palette.tint}10` } : undefined,
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
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
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
          }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: `${palette.muted}10` }]}>
            <Ionicons name="calendar-outline" size={40} color={palette.muted} />
          </View>
          <ThemedText style={styles.emptyTitle}>
            No {timeFilter} sessions
          </ThemedText>
          <ThemedText style={[styles.emptyMessage, { color: palette.muted }]}>
            {isCoach
              ? timeFilter === 'upcoming'
                ? 'Create your first session offering'
                : 'No past sessions yet'
              : timeFilter === 'upcoming'
                ? 'Book your first coaching session'
                : 'No past sessions yet'}
          </ThemedText>
          {timeFilter === 'upcoming' && (
            <Pressable
              onPress={isCoach ? onCreateSessionPress : onFindCoachPress}
              style={[styles.ctaButton, { backgroundColor: palette.tint }]}
            >
              <ThemedText style={styles.ctaText}>
                {isCoach ? 'Create Session' : 'Find a Coach'}
              </ThemedText>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
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
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
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
    gap: Spacing.sm,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.sm,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
