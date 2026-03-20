import { useCallback, useEffect, useMemo, useState } from 'react';

import { useScreen } from '@/hooks/use-screen';
import { clubScheduleService } from '@/services/club-schedule-service';
import { squadService } from '@/services/squad-service';
import { socialFeedService } from '@/services/social-feed-service';
import type { Club, ClubActivity, ClubSquad } from '@/constants/types';
import { ok, type ServiceError } from '@/types/result';
import {
  type ClubScheduleDayGroup,
  type ClubScheduleFilter,
  filterClubScheduleActivities,
  groupClubScheduleActivitiesByDay,
} from '@/utils/club-schedule-display';

export const CLUB_SCHEDULE_FILTERS: Array<{ key: ClubScheduleFilter; label: string; icon: string }> = [
  { key: 'all', label: 'All', icon: 'albums-outline' },
  { key: 'upcoming', label: 'Upcoming', icon: 'time-outline' },
  { key: 'completed', label: 'Completed', icon: 'checkmark-done-outline' },
  { key: 'events', label: 'Events', icon: 'calendar-outline' },
  { key: 'training', label: 'Training', icon: 'football-outline' },
  { key: 'matches', label: 'Matches', icon: 'trophy-outline' },
];

interface ScheduleLoadData {
  activities: ClubActivity[];
  club: Club | null;
  squad: ClubSquad | null;
}

interface UseClubScheduleOptions {
  clubId?: string;
  squadId?: string;
}

export function useClubSchedule({ clubId, squadId }: UseClubScheduleOptions) {
  const [filter, setFilter] = useState<ClubScheduleFilter>('all');

  const loadSchedule = useCallback(async () => {
    if (!clubId && !squadId) {
      return ok({ activities: [], club: null, squad: null });
    }

    const [scheduleResult, club, squad] = await Promise.all([
      squadId ? clubScheduleService.getSquadSchedule(squadId) : clubScheduleService.getClubSchedule(clubId!),
      clubId ? socialFeedService.getClub(clubId) : Promise.resolve(undefined),
      squadId ? squadService.getSquad(squadId) : Promise.resolve(null),
    ]);

    if (!scheduleResult.success) {
      return scheduleResult;
    }

    return ok({
      activities: scheduleResult.data,
      club: club ?? null,
      squad,
    });
  }, [clubId, squadId]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<ScheduleLoadData>({
    load: loadSchedule,
    deps: [clubId, squadId],
    refetchOnFocus: true,
  });

  useEffect(() => {
    setFilter('all');
  }, [clubId, squadId]);

  const activities = data?.activities ?? [];
  const now = useMemo(() => new Date(), [data?.activities]);
  const filteredActivities = useMemo(
    () => filterClubScheduleActivities(activities, filter, now),
    [activities, filter, now],
  );
  const groupedActivities = useMemo<ClubScheduleDayGroup[]>(
    () => groupClubScheduleActivitiesByDay(filteredActivities),
    [filteredActivities],
  );
  const counts = useMemo(
    () =>
      CLUB_SCHEDULE_FILTERS.reduce<Record<ClubScheduleFilter, number>>((acc, current) => {
        acc[current.key] = filterClubScheduleActivities(activities, current.key, now).length;
        return acc;
      }, {
        all: 0,
        upcoming: 0,
        completed: 0,
        events: 0,
        training: 0,
        matches: 0,
      }),
    [activities, now],
  );

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
    squad: data?.squad ?? null,
    retry,
    onRefresh,
  };
}
