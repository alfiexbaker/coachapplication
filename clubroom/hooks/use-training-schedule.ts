import { useState, useEffect, startTransition } from 'react';

import { api } from '@/constants/config';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { clubAuthorityService } from '@/services/club-authority-service';
import { groupSessionService } from '@/services/group-session-service';
import { squadService } from '@/services/squad-service';
import { socialFeedService } from '@/services/social-feed-service';
import { createLogger } from '@/utils/logger';
import type { GroupSession, ClubSquad } from '@/constants/types';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('TrainingScheduleScreen');

export type ViewMode = 'list' | 'calendar';

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function useTrainingSchedule() {
  const { currentUser } = useAuth();

  const [trainingSessions, setTrainingSessions] = useState<GroupSession[]>([]);
  const [squads, setSquads] = useState<ClubSquad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);
  const [clubName, setClubName] = useState('');

  const { isParent: userHasChildren } = useChildContext();
  const currentUserId = currentUser?.id;
  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';

  useEffect(() => {
    const loadData = async () => {
      if (!currentUserId) {
        setClubName('');
        setSquads([]);
        setTrainingSessions([]);
        setSelectedSquadId(null);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      return await runAsyncTryCatchFinally(
        async () => {
          const activeClub = api.useMock
            ? socialFeedService.getUserClubs(currentUserId)[0]
            : await (async () => {
                const result = await clubAuthorityService.listClubs();
                if (!result.success) {
                  throw new Error(result.error.message);
                }
                return result.data.clubs[0];
              })();

          if (!activeClub) {
            setClubName('Club');
            setSquads([]);
            setTrainingSessions([]);
            return;
          }

          setClubName(activeClub.name);
          const [clubSquads, sessions] = await Promise.all([
            isCoach
              ? squadService.getCoachSquads(currentUserId, activeClub.id)
              : squadService.getSquads(activeClub.id),
            groupSessionService.getClubTrainingSessions(activeClub.id),
          ]);

          setSquads(clubSquads);
          setTrainingSessions(sessions);
        },
        async (error) => {
          logger.error('Failed to load training sessions', error);
          setClubName('');
          setSquads([]);
          setTrainingSessions([]);
          setSelectedSquadId(null);
          setError(error instanceof Error ? error.message : 'Failed to load training schedule.');
        },
        () => {
          setLoading(false);
        },
      );
    };

    startTransition(() => {
      void loadData();
    });
  }, [currentUserId, isCoach, reloadKey]);

  const filteredSessions = selectedSquadId
    ? trainingSessions.filter((s) => s.squadId === selectedSquadId)
    : trainingSessions;

  return {
    loading,
    error,
    retry: () => setReloadKey((key) => key + 1),
    viewMode,
    setViewMode,
    selectedSquadId,
    setSelectedSquadId,
    clubName,
    squads,
    filteredSessions,
    userHasChildren,
    isCoach,
  };
}
