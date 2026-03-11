import { useCallback, useEffect, useMemo, useState } from 'react';

import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import {
  orgHeadCoachService,
  type HeadCoachCompletionItem,
  type HeadCoachOversightData,
  type HeadCoachStandard,
  type HeadCoachTask,
  type HeadCoachWatchlistItem,
} from '@/services/org-head-coach-service';
import { socialFeedService } from '@/services/social-feed-service';
import type { ClubMembership, ClubRole } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { isClubOversightRole } from '@/contracts/club-governance';

const logger = createLogger('useHeadCoachOversight');

interface OversightClubOption {
  id: string;
  name: string;
  role: ClubRole;
}

function isEligibleMembership(membership: ClubMembership): boolean {
  return membership.status === 'active' && isClubOversightRole(membership.role);
}

export function useHeadCoachOversight() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clubs, setClubs] = useState<OversightClubOption[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [data, setData] = useState<HeadCoachOversightData | null>(null);
  const [mutatingKey, setMutatingKey] = useState<string | null>(null);

  const loadOversight = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!currentUser?.id) {
        setClubs([]);
        setSelectedClubId(null);
        setData(null);
        setErrorMessage(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const memberships = await socialFeedService.getUserMembershipsHydrated(currentUser.id);
        const eligibleMemberships = memberships.filter(isEligibleMembership);

        const nextClubs = (
          await Promise.all(
            eligibleMemberships.map(async (membership) => {
              const club = await socialFeedService.getClub(membership.clubId);
              if (!club) return null;
              return {
                id: club.id,
                name: club.name,
                role: membership.role,
              } satisfies OversightClubOption;
            }),
          )
        ).filter((club): club is OversightClubOption => Boolean(club));

        const nextSelectedClubId =
          selectedClubId && nextClubs.some((club) => club.id === selectedClubId)
            ? selectedClubId
            : nextClubs[0]?.id ?? null;

        setClubs(nextClubs);
        setSelectedClubId(nextSelectedClubId);

        if (!nextSelectedClubId) {
          setData(null);
          setErrorMessage(null);
          return;
        }

        const result = await orgHeadCoachService.getOversightData(
          nextSelectedClubId,
          currentUser.id,
        );
        if (!result.success) {
          setData(null);
          setErrorMessage(result.error.message);
          return;
        }

        setData(result.data);
        setErrorMessage(null);
      } catch (error) {
        logger.error('Failed to load head coach oversight hook', error);
        setData(null);
        setErrorMessage('Failed to load head coach oversight');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentUser?.id, selectedClubId],
  );

  useEffect(() => {
    void loadOversight();
  }, [loadOversight]);

  useEffect(() => {
    const unsubscribes = [
      onTyped(ServiceEvents.BOOKING_UPDATED, () => {
        void loadOversight('refresh');
      }),
      onTyped(ServiceEvents.SESSION_UPDATED, () => {
        void loadOversight('refresh');
      }),
      onTyped(ServiceEvents.SESSION_FEEDBACK_SAVED, () => {
        void loadOversight('refresh');
      }),
      onTyped(ServiceEvents.RESULTS_PROGRAM_TASK_COMPLETED, () => {
        void loadOversight('refresh');
      }),
      onTyped(ServiceEvents.RESULTS_PROGRAM_TASK_RESCHEDULED, () => {
        void loadOversight('refresh');
      }),
      onTyped(ServiceEvents.ORG_HEAD_COACH_TASK_UPDATED, (payload) => {
        if (payload.clubId === selectedClubId) {
          void loadOversight('refresh');
        }
      }),
      onTyped(ServiceEvents.ORG_HEAD_COACH_STANDARD_UPDATED, (payload) => {
        if (payload.clubId === selectedClubId) {
          void loadOversight('refresh');
        }
      }),
      onTyped(ServiceEvents.CLUB_MEMBER_JOINED, (payload) => {
        if (payload.clubId === selectedClubId) {
          void loadOversight('refresh');
        }
      }),
      onTyped(ServiceEvents.CLUB_MEMBER_LEFT, (payload) => {
        if (payload.clubId === selectedClubId) {
          void loadOversight('refresh');
        }
      }),
      onTyped(ServiceEvents.SQUAD_MEMBER_ADDED, (payload) => {
        if (payload.clubId === selectedClubId) {
          void loadOversight('refresh');
        }
      }),
      onTyped(ServiceEvents.SQUAD_MEMBER_REMOVED, (payload) => {
        if (payload.clubId === selectedClubId) {
          void loadOversight('refresh');
        }
      }),
    ];

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [loadOversight, selectedClubId]);

  const runMutation = useCallback(
    async (
      key: string,
      action: () => Promise<boolean>,
      failureMessage: string,
    ) => {
      setMutatingKey(key);
      try {
        const success = await action();
        if (!success) {
          showToast(failureMessage, 'error');
        }
      } finally {
        setMutatingKey(null);
      }
    },
    [showToast],
  );

  const issueSessionNoteExpectation = useCallback(
    async (item: HeadCoachCompletionItem) => {
      if (!currentUser?.id || !selectedClubId) return;
      await runMutation(
        `completion:${item.bookingId}`,
        async () => {
          const result = await orgHeadCoachService.createTask({
            clubId: selectedClubId,
            actorUserId: currentUser.id,
            coachId: item.coachId,
            type: 'session_note_expectation',
            bookingId: item.bookingId,
            title: `Submit session notes for ${item.athleteName}`,
            details: `Head coach expectation raised from oversight console for ${item.service}.`,
            dueAt: item.dueAt,
          });
          if (!result.success) {
            showToast(result.error.message, 'error');
            return false;
          }
          showToast(`Session-note task issued to ${item.coachName}`, 'success');
          await loadOversight('refresh');
          return true;
        },
        'Failed to issue session-note task',
      );
    },
    [currentUser?.id, loadOversight, runMutation, selectedClubId, showToast],
  );

  const issueRequiredFollowUp = useCallback(
    async (item: HeadCoachWatchlistItem) => {
      if (!currentUser?.id || !selectedClubId) return;
      await runMutation(
        `watch:${item.coachId}:${item.athleteId}`,
        async () => {
          const result = await orgHeadCoachService.createTask({
            clubId: selectedClubId,
            actorUserId: currentUser.id,
            coachId: item.coachId,
            type: 'required_follow_up',
            athleteId: item.athleteId,
            athleteName: item.athleteName,
            title: `Follow up with ${item.athleteName}`,
            details: `Head coach follow-up required. ${item.recommendedAction}`,
          });
          if (!result.success) {
            showToast(result.error.message, 'error');
            return false;
          }
          showToast(`Follow-up task issued to ${item.coachName}`, 'success');
          await loadOversight('refresh');
          return true;
        },
        'Failed to issue follow-up task',
      );
    },
    [currentUser?.id, loadOversight, runMutation, selectedClubId, showToast],
  );

  const toggleTaskStatus = useCallback(
    async (task: HeadCoachTask) => {
      if (!currentUser?.id || !selectedClubId) return;
      const nextStatus = task.status === 'open' ? 'done' : 'open';
      await runMutation(
        `task:${task.id}`,
        async () => {
          const result = await orgHeadCoachService.setTaskStatus({
            clubId: selectedClubId,
            actorUserId: currentUser.id,
            taskId: task.id,
            status: nextStatus,
          });
          if (!result.success) {
            showToast(result.error.message, 'error');
            return false;
          }
          showToast(
            nextStatus === 'done' ? 'Task marked complete' : 'Task reopened',
            'success',
          );
          await loadOversight('refresh');
          return true;
        },
        'Failed to update task',
      );
    },
    [currentUser?.id, loadOversight, runMutation, selectedClubId, showToast],
  );

  const toggleStandard = useCallback(
    async (standard: HeadCoachStandard) => {
      if (!currentUser?.id || !selectedClubId) return;
      await runMutation(
        `standard:${standard.id}`,
        async () => {
          const result = await orgHeadCoachService.toggleStandard({
            clubId: selectedClubId,
            actorUserId: currentUser.id,
            standardId: standard.id,
          });
          if (!result.success) {
            showToast(result.error.message, 'error');
            return false;
          }
          showToast(
            result.data.active ? 'Standard activated' : 'Standard paused',
            'success',
          );
          await loadOversight('refresh');
          return true;
        },
        'Failed to update standard',
      );
    },
    [currentUser?.id, loadOversight, runMutation, selectedClubId, showToast],
  );

  const createStandard = useCallback(
    async (title: string, description?: string) => {
      if (!currentUser?.id || !selectedClubId) return false;

      let success = false;
      await runMutation(
        'standard:create',
        async () => {
          const result = await orgHeadCoachService.createStandard({
            clubId: selectedClubId,
            actorUserId: currentUser.id,
            title,
            description,
          });
          if (!result.success) {
            showToast(result.error.message, 'error');
            return false;
          }
          showToast('Checklist item added', 'success');
          await loadOversight('refresh');
          success = true;
          return true;
        },
        'Failed to create checklist item',
      );
      return success;
    },
    [currentUser?.id, loadOversight, runMutation, selectedClubId, showToast],
  );

  const selectedClubRole = useMemo(
    () => data?.viewerMembership.role ?? clubs.find((club) => club.id === selectedClubId)?.role ?? null,
    [clubs, data?.viewerMembership.role, selectedClubId],
  );

  return {
    loading,
    refreshing,
    errorMessage,
    clubs,
    selectedClubId,
    setSelectedClubId,
    selectedClubRole,
    data,
    mutatingKey,
    handleRefresh: () => {
      void loadOversight('refresh');
    },
    issueSessionNoteExpectation,
    issueRequiredFollowUp,
    toggleTaskStatus,
    toggleStandard,
    createStandard,
  };
}
