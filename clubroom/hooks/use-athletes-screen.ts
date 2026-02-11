import { useMemo, useState } from 'react';

import { useScreen } from '@/hooks/use-screen';
import { useAuth } from '@/hooks/use-auth';
import { rosterService } from '@/services/roster-service';
import { bookingService } from '@/services/booking-service';
import { ServiceEvents } from '@/services/event-bus';
import { ok, err, storageError, type Result, type ServiceError } from '@/types/result';
import type { RosterEntry } from '@/constants/types';
import type { Booking } from '@/constants/app-types';
import { getRosterAthleteName, getRosterParentName } from '@/utils/roster-display';
import type { FilterType } from '@/components/athlete/athletes-screen-header-sections';

interface AthletesData {
  roster: RosterEntry[];
  upcomingSessions: Record<string, Booking>;
}

const DAYS_BEFORE_NEEDS_ATTENTION = 14;

const isNeedsAttention = (athlete: RosterEntry) => {
  if (athlete.status !== 'ACTIVE') return false;
  if (!athlete.lastSessionDate) return true;

  const daysSinceSession = Math.floor(
    (Date.now() - new Date(athlete.lastSessionDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSinceSession > DAYS_BEFORE_NEEDS_ATTENTION;
};

export function useAthletesScreen() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id || 'coach_1';

  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const screen = useScreen<AthletesData>({
    load: async (): Promise<Result<AthletesData, ServiceError>> => {
      try {
        const [rosterData, bookingsData] = await Promise.all([
          rosterService.getRoster(coachId),
          bookingService.getUpcomingBookings(coachId),
        ]);

        const sessionsMap: Record<string, Booking> = {};
        bookingsData.forEach((booking: Booking) => {
          if (booking.athleteId && !sessionsMap[booking.athleteId]) {
            sessionsMap[booking.athleteId] = booking;
          }
        });

        return ok({ roster: rosterData, upcomingSessions: sessionsMap });
      } catch {
        return err(storageError('Failed to load athletes'));
      }
    },
    deps: [coachId],
    events: [
      ServiceEvents.BOOKING_CREATED,
      ServiceEvents.BOOKING_CANCELLED,
      ServiceEvents.CONCERN_RAISED,
    ],
    isEmpty: (d) => d.roster.length === 0,
  });

  const roster = screen.data?.roster || [];
  const upcomingSessions = screen.data?.upcomingSessions || {};

  const needsAttentionCount = useMemo(
    () => roster.filter((athlete) => isNeedsAttention(athlete)).length,
    [roster]
  );

  const filteredAthletes = useMemo(() => {
    let filtered = roster;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (athlete) =>
          getRosterAthleteName(athlete).toLowerCase().includes(query) ||
          getRosterParentName(athlete).toLowerCase().includes(query)
      );
    }

    if (filter === 'active') {
      filtered = filtered.filter((athlete) => athlete.status === 'ACTIVE');
    } else if (filter === 'needs_attention') {
      filtered = filtered.filter((athlete) => isNeedsAttention(athlete));
    }

    return [...filtered].sort((a, b) => {
      const aHasUpcoming = !!upcomingSessions[a.athleteId];
      const bHasUpcoming = !!upcomingSessions[b.athleteId];
      if (aHasUpcoming && !bHasUpcoming) return -1;
      if (!aHasUpcoming && bHasUpcoming) return 1;
      if (!a.lastSessionDate) return 1;
      if (!b.lastSessionDate) return -1;
      return new Date(b.lastSessionDate).getTime() - new Date(a.lastSessionDate).getTime();
    });
  }, [roster, searchQuery, filter, upcomingSessions]);

  return {
    coachId,
    searchQuery,
    setSearchQuery,
    filter,
    setFilter,
    roster,
    upcomingSessions,
    needsAttentionCount,
    filteredAthletes,
    ...screen,
  };
}
