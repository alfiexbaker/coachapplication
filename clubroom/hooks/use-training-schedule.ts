import { useState, useEffect, useCallback, useMemo } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { groupSessionService } from '@/services/group-session-service';
import { squadService } from '@/services/squad-service';
import { socialFeedService } from '@/services/social-feed-service';
import { hasChildren } from '@/utils/user-helpers';
import { createLogger } from '@/utils/logger';
import type { GroupSession, ClubSquad } from '@/constants/types';

const logger = createLogger('TrainingScheduleScreen');

export type ViewMode = 'list' | 'calendar';

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function useTrainingSchedule() {
  const { currentUser } = useAuth();

  const [trainingSessions, setTrainingSessions] = useState<GroupSession[]>([]);
  const [squads, setSquads] = useState<ClubSquad[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);
  const [clubName, setClubName] = useState('');

  const userHasChildren = hasChildren(currentUser);
  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';

  const loadData = useCallback(async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const userClubs = socialFeedService.getUserClubs(currentUser.id);
      const activeClub = userClubs[0];

      if (!activeClub) {
        setClubName('Club');
        setSquads([]);
        setTrainingSessions([]);
        return;
      }

      setClubName(activeClub.name);
      const [clubSquads, sessions] = await Promise.all([
        isCoach
          ? squadService.getCoachSquads(currentUser.id, activeClub.id)
          : squadService.getSquads(activeClub.id),
        groupSessionService.getClubTrainingSessions(activeClub.id),
      ]);

      setSquads(clubSquads);
      setTrainingSessions(sessions);
    } catch (error) {
      logger.error('Failed to load training sessions', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, isCoach]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredSessions = useMemo(
    () => selectedSquadId ? trainingSessions.filter((s) => s.squadId === selectedSquadId) : trainingSessions,
    [selectedSquadId, trainingSessions]
  );

  return {
    loading, viewMode, setViewMode,
    selectedSquadId, setSelectedSquadId,
    clubName, squads, filteredSessions,
    userHasChildren, isCoach,
  };
}
