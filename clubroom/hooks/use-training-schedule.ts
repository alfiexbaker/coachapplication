import { useState, useEffect, useCallback, useMemo } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { groupSessionService } from '@/services/group-session-service';
import { getClubMembershipForUser, getClubById, getClubSquads } from '@/constants/mock-data';
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
      const membership = getClubMembershipForUser(currentUser.id);
      if (membership) {
        const club = getClubById(membership.clubId);
        setClubName(club?.name || 'Club');
        setSquads(getClubSquads(membership.clubId));
        const sessions = await groupSessionService.getClubTrainingSessions(membership.clubId);
        setTrainingSessions(sessions);
      }
    } catch (error) {
      logger.error('Failed to load training sessions', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

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
