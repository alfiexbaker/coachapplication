import { useEffect, useState, startTransition } from 'react';

import { api } from '@/constants/config';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { clubAuthorityService } from '@/services/club-authority-service';
import { clubScheduleService } from '@/services/club-schedule-service';
import { squadService } from '@/services/squad-service';
import { socialFeedService } from '@/services/social-feed-service';
import type { Club, ClubActivity, ClubMembership, ClubSquad } from '@/constants/types';
import { ok, type ServiceError } from '@/types/result';
import {
  type ClubScheduleFilter,
  filterClubScheduleActivities,
  groupClubScheduleActivitiesByDay,
} from '@/utils/club-schedule-display';

export const CLUB_SCHEDULE_FILTERS: { key: ClubScheduleFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'albums-outline' },
  { key: 'upcoming', label: 'Upcoming', icon: 'time-outline' },
  { key: 'completed', label: 'Completed', icon: 'checkmark-done-outline' },
  { key: 'events', label: 'Events', icon: 'calendar-outline' },
  { key: 'training', label: 'Training', icon: 'football-outline' },
  { key: 'matches', label: 'Matches', icon: 'trophy-outline' },
];

const USE_MOCK = api.useMock;

interface ScheduleLoadData {
  activities: ClubActivity[];
  club: Club | null;
  membership: ClubMembership | null;
  squad: ClubSquad | null;
}

interface UseClubScheduleOptions {
  clubId?: string;
  squadId?: string;
}

async function loadClubContext(
  clubId: string | undefined,
  userId: string | undefined,
): Promise<{ club: Club | null; membership: ClubMembership | null }> {
  if (!clubId) {
    return { club: null, membership: null };
  }

  if (USE_MOCK) {
    return {
      club: (await socialFeedService.getClub(clubId)) ?? null,
      membership: userId ? socialFeedService.getMembership(userId, clubId) ?? null : null,
    };
  }

  const result = await clubAuthorityService.listClubs();
  if (!result.success) {
    return { club: null, membership: null };
  }

  return {
    club: result.data.clubs.find((club) => club.id === clubId) ?? null,
    membership: result.data.memberships.find((candidate) => candidate.clubId === clubId) ?? null,
  };
}

export function useClubSchedule({ clubId, squadId }: UseClubScheduleOptions) {
  const { currentUser } = useAuth();
  const [filter, setFilter] = useState<ClubScheduleFilter>('all');

  const loadSchedule = async () => {
    if (!clubId && !squadId) {
      return ok({ activities: [], club: null, membership: null, squad: null });
    }

    const [scheduleResult, squad] = await Promise.all([
      squadId ? clubScheduleService.getSquadSchedule(squadId) : clubScheduleService.getClubSchedule(clubId!),
      squadId ? squadService.getSquad(squadId) : Promise.resolve(null),
    ]);

    if (!scheduleResult.success) {
      return scheduleResult;
    }

    const clubContext = await loadClubContext(clubId ?? squad?.clubId, currentUser?.id);

    return ok({
      activities: scheduleResult.data,
      club: clubContext.club,
      membership: clubContext.membership,
      squad,
    });
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<ScheduleLoadData>({
    load: loadSchedule,
    deps: [clubId, squadId, currentUser?.id],
    dataKey: `club-schedule:${currentUser?.id ?? 'anonymous'}:${clubId ?? 'missing'}:${squadId ?? 'none'}`,
    refetchOnFocus: true,
  });

  useEffect(() => {
    startTransition(() => {
      setFilter('all');
    });
  }, [clubId, squadId]);

  const activities = data?.activities ?? [];
  const now = new Date();
  const filteredActivities = filterClubScheduleActivities(activities, filter, now);
  const groupedActivities = groupClubScheduleActivitiesByDay(filteredActivities);
  const counts = CLUB_SCHEDULE_FILTERS.reduce<Record<ClubScheduleFilter, number>>((acc, current) => {
    acc[current.key] = filterClubScheduleActivities(activities, current.key, now).length;
    return acc;
  }, {
    all: 0,
    upcoming: 0,
    completed: 0,
    events: 0,
    training: 0,
    matches: 0,
  });

  return {
    status,
    error: status === 'error' ? ((error as ServiceError | null) ?? null) : null,
    refreshing,
    filter,
    setFilter,
    counts,
    activities,
    filteredActivities,
    groupedActivities,
    club: data?.club ?? null,
    membership: data?.membership ?? null,
    squad: data?.squad ?? null,
    retry,
    onRefresh,
  };
}
