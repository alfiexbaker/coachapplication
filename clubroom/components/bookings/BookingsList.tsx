import { FlatList, View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { CompactBookingCard } from '@/components/bookings/compact-booking-card';
import { SessionOfferingCard } from '@/components/sessions/session-offering-card';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BookingSummary, SessionOffering } from '@/constants/types';
import { scale, scaleFont } from '@/utils/scale';

// Web-compatible clickable wrapper using Pressable
type ClickableProps = {
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
};

function Clickable({ onPress, style, children }: ClickableProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [style, pressed && { opacity: 0.7 }]}>
      {children}
    </Pressable>
  );
}

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

  const hasItems = items.length > 0;

  return (
    <>
      {/* Time Filter Toggle */}
      <View style={styles.timeFilterContainer}>
        <Clickable
          onPress={() => onTimeFilterChange('upcoming')}
          style={[
            styles.filterButton,
            timeFilter === 'upcoming' && { ...styles.filterButtonActive, backgroundColor: palette.tint },
          ]}>
          <ThemedText
            style={[
              styles.filterButtonText,
              timeFilter === 'upcoming' && { color: scheme === 'light' ? '#FFFFFF' : '#000000', fontWeight: '700' },
            ]}>
            Upcoming
          </ThemedText>
        </Clickable>
        <Clickable
          onPress={() => onTimeFilterChange('past')}
          style={[
            styles.filterButton,
            timeFilter === 'past' && { ...styles.filterButtonActive, backgroundColor: palette.tint },
          ]}>
          <ThemedText
            style={[
              styles.filterButtonText,
              timeFilter === 'past' && { color: scheme === 'light' ? '#FFFFFF' : '#000000', fontWeight: '700' },
            ]}>
            Past
          </ThemedText>
        </Clickable>
      </View>

      {hasItems ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            // Check if item is SessionOffering
            if ('registrations' in item) {
              return (
                <SessionOfferingCard
                  offering={item}
                  showCoach={userRole !== 'COACH'}
                  showCapacity={userRole === 'COACH'}
                  onPress={() => onOfferingPress(item)}
                />
              );
            }
            // Old booking
            return <CompactBookingCard booking={item} />;
          }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: palette.border }]}>
            <Ionicons name="calendar-outline" size={48} color={palette.muted} />
          </View>
          <ThemedText type="subtitle" style={styles.emptyTitle}>
            No {timeFilter} sessions
          </ThemedText>
          <ThemedText style={styles.emptyDescription}>
            {userRole === 'COACH'
              ? timeFilter === 'upcoming'
                ? 'Create your first session offering'
                : 'No past sessions yet'
              : timeFilter === 'upcoming'
                ? 'Book your first coaching session'
                : 'No past sessions yet'}
          </ThemedText>
          {(userRole === 'USER' || userRole === 'PARENT') && timeFilter === 'upcoming' && (
            <Clickable
              onPress={onFindCoachPress}
              style={[styles.ctaButton, { backgroundColor: palette.tint }]}>
              <ThemedText style={styles.ctaText} lightColor="#FFFFFF" darkColor="#000000">
                Find a Coach
              </ThemedText>
            </Clickable>
          )}
          {userRole === 'COACH' && timeFilter === 'upcoming' && (
            <Clickable
              onPress={onCreateSessionPress}
              style={[styles.ctaButton, { backgroundColor: palette.tint }]}>
              <ThemedText style={styles.ctaText} lightColor="#FFFFFF" darkColor="#000000">
                Create Session Offering
              </ThemedText>
            </Clickable>
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  timeFilterContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  filterButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  filterButtonText: {
    fontSize: scaleFont(15),
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: scale(16),
  },
  emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    textAlign: 'center',
    fontSize: scaleFont(20),
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: scaleFont(26),
  },
  emptyDescription: {
    textAlign: 'center',
    opacity: 0.5,
    fontSize: scaleFont(15),
    lineHeight: scaleFont(22),
  },
  ctaButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaText: {
    fontSize: scaleFont(17),
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
