import { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { EventCard } from '@/components/event/event-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { createLogger } from '@/utils/logger';
import type { ClubEvent } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { eventService } from '@/services/event-service';
import { scaleFont } from '@/utils/scale';

const logger = createLogger('EventsListScreen');

type EventFilter = 'upcoming' | 'past' | 'all';

export default function EventsListScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const isCoach = currentUser?.role === 'COACH';

  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<EventFilter>('upcoming');

  const clubId = 'club_1'; // In real app, get from context or route params

  const loadEvents = useCallback(async () => {
    try {
      const data = await eventService.getAllClubEvents(clubId);
      setEvents(data);
    } catch (error) {
      logger.error('Failed to load events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clubId]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  const filteredEvents = events.filter((event) => {
    const today = new Date().toISOString().split('T')[0];
    const isPast = event.date < today;

    if (filter === 'upcoming') {
      return !isPast && event.status === 'PUBLISHED';
    }
    if (filter === 'past') {
      return isPast || event.status === 'COMPLETED';
    }
    // 'all' - show everything including drafts for coaches
    if (isCoach) {
      return true;
    }
    return event.status === 'PUBLISHED';
  });

  const renderEvent = ({ item }: { item: ClubEvent }) => (
    <EventCard
      event={item}
      onPress={() => router.push({ pathname: '/events/[id]', params: { id: item.id } })}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: `${palette.tint}15` }]}>
        <Ionicons name="calendar-outline" size={48} color={palette.tint} />
      </View>
      <ThemedText type="subtitle" style={styles.emptyTitle}>
        No Events Yet
      </ThemedText>
      <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
        {filter === 'upcoming'
          ? 'No upcoming events scheduled. Check back soon!'
          : filter === 'past'
            ? 'No past events to show.'
            : 'No events have been created yet.'}
      </ThemedText>
      {isCoach && (
        <Button
          onPress={() => router.push('/events/create')}
          style={styles.emptyButton}
        >
          Create Event
        </Button>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>
            Club Events
          </ThemedText>
        </View>
        {isCoach && (
          <Clickable
            onPress={() => router.push('/events/create')}
            style={[styles.addButton, { backgroundColor: palette.tint }]}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </Clickable>
        )}
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(['upcoming', 'past', 'all'] as EventFilter[]).map((f) => (
          <Clickable
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filterTab,
              {
                backgroundColor: filter === f ? palette.tint : 'transparent',
                borderColor: filter === f ? palette.tint : palette.border,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.filterTabText,
                { color: filter === f ? '#FFFFFF' : palette.text },
              ]}
            >
              {f === 'upcoming' ? 'Upcoming' : f === 'past' ? 'Past' : 'All'}
            </ThemedText>
          </Clickable>
        ))}
      </View>

      {/* Events list */}
      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        renderItem={renderEvent}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={!loading ? renderEmptyState : null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerTitle: {
    fontSize: scaleFont(24),
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: scaleFont(15),
    lineHeight: scaleFont(22),
  },
  emptyButton: {
    marginTop: Spacing.sm,
  },
});
