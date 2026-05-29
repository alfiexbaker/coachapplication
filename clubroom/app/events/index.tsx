import { useState } from 'react';
import { AccessibleListCell } from '@/components/ui/list-accessibility';
import { StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Routes } from '@/navigation/routes';

import { EventCard } from '@/components/event/event-card';
import {
  EventFilter,
  EventsFilterTabs,
  EventsHeader,
  EventsListEmptyState,
} from '@/components/event/events-list-sections';
import { Spacing } from '@/constants/theme';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
import type { ClubEvent } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { eventService } from '@/services/event-service';
import { err, ok, serviceError } from '@/types/result';

const logger = createLogger('EventsListScreen');

function renderEventListItem({
  item,
  onPress,
}: {
  item: ClubEvent;
  onPress: (eventId: string) => void;
}) {
  return <EventCard event={item} onPress={() => onPress(item.id)} />;
}

export default function EventsListScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();
  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';
  const [filter, setFilter] = useState<EventFilter>('upcoming');

  const clubId = 'club_lions';

  const loadEvents = async () => {
    try {
      const data = await eventService.getAllClubEvents(clubId);
      return ok(data);
    } catch (loadError) {
      logger.error('Failed to load events:', loadError);
      return err(
        serviceError('UNKNOWN', 'Failed to load events. Pull down to refresh.', loadError),
      );
    }
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<ClubEvent[]>({
    load: loadEvents,
    deps: [clubId],
    isEmpty: (value) => value.length === 0,
    refetchOnFocus: true,
  });

  const events = data ?? [];
  const filteredEvents = events.filter((event) => {
    const today = toDateStr(new Date());
    const isPast = event.date < today;

    if (filter === 'upcoming') return !isPast && event.status === 'PUBLISHED';
    if (filter === 'past') return isPast || event.status === 'COMPLETED';
    if (isCoach) return true;
    return event.status === 'PUBLISHED';
  });

  const onCreate = () => router.push(Routes.EVENTS_CREATE);
  const openEvent = (eventId: string) => router.push(Routes.event(eventId));
  const renderEventItem = ({ item }: { item: ClubEvent }) =>
    renderEventListItem({ item, onPress: openEvent });
  const header = (
    <EventsHeader
      colors={palette}
      isCoach={isCoach}
      onBack={() => router.back()}
      onCreate={onCreate}
    />
  );
  const tabs = <EventsFilterTabs colors={palette} filter={filter} onChange={setFilter} />;
  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      {header}
      {tabs}
      {content}
    </SafeAreaView>
  );

  if (status === 'loading') {
    return renderShell(<LoadingState variant="card" />);
  }

  if (status === 'error') {
    return renderShell(<ErrorState message={error?.message || 'Failed to load events.'} onRetry={retry} />);
  }

  if (status === 'empty') {
    return renderShell(
      <EmptyState
        icon="calendar-outline"
        title="No events yet"
        message="No events created yet."
        actionLabel={isCoach ? 'Create Event' : undefined}
        onPressAction={isCoach ? onCreate : undefined}
      />,
    );
  }

  return renderShell(
    <FlatList
      CellRendererComponent={AccessibleListCell}
      accessibilityRole="list"
      data={filteredEvents}
      keyExtractor={(item) => item.id}
      renderItem={renderEventItem}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <EventsListEmptyState
          colors={palette}
          filter={filter}
          isCoach={isCoach}
          onCreate={onCreate}
        />
      }
    />,
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
});
