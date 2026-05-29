import { useState } from 'react';

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
    refetchOnFocus: true,
    loadingStrategy: 'warm-first',
    dataKey: coachId,
  });

  const roster = screen.data?.roster || [];
  const upcomingSessions = screen.data?.upcomingSessions || {};

  const filteredAthletes = (() => {
    let filtered = roster;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (athlete) =>
          getRosterAthleteName(athlete).toLowerCase().includes(query) ||
          getRosterParentName(athlete).toLowerCase().includes(query),
      );
    }

    if (filter === 'active') {
      filtered = filtered.filter((athlete) => athlete.status === 'ACTIVE');
    }

    return Array.from(filtered).toSorted((a, b) => {
      const aHasUpcoming = !!upcomingSessions[a.athleteId];
      const bHasUpcoming = !!upcomingSessions[b.athleteId];
      if (aHasUpcoming && !bHasUpcoming) return -1;
      if (!aHasUpcoming && bHasUpcoming) return 1;
      if (!a.lastSessionDate) return 1;
      if (!b.lastSessionDate) return -1;
      return new Date(b.lastSessionDate).getTime() - new Date(a.lastSessionDate).getTime();
    });
  })();

  return {
    coachId,
    searchQuery,
    setSearchQuery,
    filter,
    setFilter,
    roster,
    upcomingSessions,
    filteredAthletes,
    ...screen,
  };
}
