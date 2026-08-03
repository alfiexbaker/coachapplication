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
import type { Club, ClubEvent, ClubMembership } from '@/constants/types';
import { isClubStaffRole } from '@/contracts/club-governance';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { clubAuthorityService } from '@/services/club-authority-service';
import { eventService } from '@/services/event-service';
import { err, ok, serviceError } from '@/types/result';

const logger = createLogger('EventsListScreen');

interface EventsScreenData {
  events: ClubEvent[];
  clubId?: string;
  clubName?: string;
  canManageEvents: boolean;
}

function isMembershipForCurrentUser(membership: ClubMembership, userId: string | undefined): boolean {
  if (!userId) return false;
  const normalizedUserId = userId.replace(/^usr_/, '');
  return membership.userId === userId || membership.userId === normalizedUserId;
}

function resolveEventListClub(
  clubs: Club[],
  memberships: ClubMembership[],
  userId: string | undefined,
): { club: Club | null; canManageEvents: boolean } {
  const staffClubIds = new Set<string>();
  for (const membership of memberships) {
    if (
      membership.status === 'active' &&
      isMembershipForCurrentUser(membership, userId) &&
      isClubStaffRole(membership.role)
    ) {
      staffClubIds.add(membership.clubId);
    }
  }
  const club = clubs.find((candidate) => staffClubIds.has(candidate.id)) ?? clubs[0] ?? null;
  return { club, canManageEvents: Boolean(club && staffClubIds.has(club.id)) };
}

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
  const [filter, setFilter] = useState<EventFilter>('upcoming');

  const loadEvents = async () => {
    try {
      const clubsResult = await clubAuthorityService.listClubs();
      if (!clubsResult.success) {
        return err(clubsResult.error);
      }

      const { club, canManageEvents } = resolveEventListClub(
        clubsResult.data.clubs,
        clubsResult.data.memberships,
        currentUser?.id,
      );
      if (!club) {
        return ok({ events: [], canManageEvents: false });
      }

      const events = await eventService.getAllClubEvents(club.id);
      return ok({ events, clubId: club.id, clubName: club.name, canManageEvents });
    } catch (loadError) {
      logger.error('Failed to load events:', loadError);
      return err(
        serviceError('UNKNOWN', 'Failed to load events. Pull down to refresh.', loadError),
      );
    }
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<EventsScreenData>({
    load: loadEvents,
    deps: [currentUser?.id],
    dataKey: `events-list:${currentUser?.id ?? 'anonymous'}`,
    isEmpty: (value) => value.events.length === 0,
    refetchOnFocus: true,
  });

  const events = data?.events ?? [];
  const activeClubId = data?.clubId;
  const activeClubName = data?.clubName;
  const canCreateEvent = data?.canManageEvents === true && Boolean(activeClubId);
  const filteredEvents = events.filter((event) => {
    if (!canCreateEvent && event.status === 'DRAFT') {
      return false;
    }
    const today = toDateStr(new Date());
    const isPast = event.date < today;

    if (filter === 'upcoming') return !isPast && event.status === 'PUBLISHED';
    if (filter === 'past') return isPast || event.status === 'COMPLETED';
    return true;
  });

  const onCreate = () => {
    if (!activeClubId) {
      return;
    }
    router.push(Routes.eventCreate({ clubId: activeClubId, clubName: activeClubName }));
  };
  const openEvent = (eventId: string) => router.push(Routes.event(eventId));
  const renderEventItem = ({ item }: { item: ClubEvent }) =>
    renderEventListItem({ item, onPress: openEvent });
  const header = (
    <EventsHeader
      colors={palette}
      canCreateEvent={canCreateEvent}
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
    return renderShell(
      <ErrorState message={error?.message || 'Failed to load events.'} onRetry={retry} />,
    );
  }

  if (status === 'empty') {
    return renderShell(
      <EmptyState
        icon="calendar-outline"
        title={activeClubId ? 'No events yet' : 'No club selected'}
        message={activeClubId ? 'No events created yet.' : 'Join or create a club to view events.'}
        actionLabel={canCreateEvent ? 'Create Event' : undefined}
        onPressAction={canCreateEvent ? onCreate : undefined}
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
          canCreateEvent={canCreateEvent}
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
