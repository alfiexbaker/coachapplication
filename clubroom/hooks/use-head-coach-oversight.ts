import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { ServiceEvents } from '@/services/event-bus';
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
import { err, ok, serviceError, type Result, type ServiceError } from '@/types/result';

import { runAsyncFinally } from '@/utils/async-control';

const logger = createLogger('useHeadCoachOversight');

interface OversightClubOption {
  id: string;
  name: string;
  role: ClubRole;
}

interface HeadCoachOversightScreenData {
  clubs: OversightClubOption[];
  resolvedSelectedClubId: string | null;
  data: HeadCoachOversightData | null;
}

const EMPTY_OVERSIGHT_SCREEN_DATA: HeadCoachOversightScreenData = {
  clubs: [],
  resolvedSelectedClubId: null,
  data: null,
};

function isEligibleMembership(membership: ClubMembership): boolean {
  return membership.status === 'active' && isClubOversightRole(membership.role);
}

export function useHeadCoachOversight() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { clubId: routeClubId } = useLocalSearchParams<{ clubId?: string }>();
  const requestedClubId = typeof routeClubId === 'string' ? routeClubId : null;

  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [mutatingKey, setMutatingKey] = useState<string | null>(null);

  const loadOversight = async (): Promise<Result<HeadCoachOversightScreenData, ServiceError>> => {
    if (!currentUser?.id) {
      return ok(EMPTY_OVERSIGHT_SCREEN_DATA);
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
          : requestedClubId && nextClubs.some((club) => club.id === requestedClubId)
            ? requestedClubId
            : (nextClubs[0]?.id ?? null);

      if (!nextSelectedClubId) {
        return ok({
          clubs: nextClubs,
          resolvedSelectedClubId: null,
          data: null,
        });
      }

      const result = await orgHeadCoachService.getOversightData(nextSelectedClubId, currentUser.id);
      if (!result.success) {
        return err(result.error);
      }

      return ok({
        clubs: nextClubs,
        resolvedSelectedClubId: nextSelectedClubId,
        data: result.data,
      });
    } catch (error) {
      logger.error('Failed to load head coach oversight hook', error);
      return err(serviceError('UNKNOWN', 'Failed to load head coach oversight', error));
    }
  };

  const {
    data: screenData,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<HeadCoachOversightScreenData>({
    load: loadOversight,
    deps: [currentUser?.id, requestedClubId, selectedClubId],
    events: [
      ServiceEvents.BOOKING_UPDATED,
      ServiceEvents.SESSION_UPDATED,
      ServiceEvents.SESSION_FEEDBACK_SAVED,
      ServiceEvents.RESULTS_PROGRAM_TASK_COMPLETED,
      ServiceEvents.RESULTS_PROGRAM_TASK_RESCHEDULED,
      ServiceEvents.ORG_HEAD_COACH_TASK_UPDATED,
      ServiceEvents.ORG_HEAD_COACH_STANDARD_UPDATED,
      ServiceEvents.CLUB_MEMBER_JOINED,
      ServiceEvents.CLUB_MEMBER_LEFT,
      ServiceEvents.SQUAD_MEMBER_ADDED,
      ServiceEvents.SQUAD_MEMBER_REMOVED,
    ],
    isEmpty: () => false,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: `head-coach-oversight:${currentUser?.id ?? 'guest'}:${selectedClubId ?? requestedClubId ?? 'default'}`,
  });

  const oversightData = screenData ?? EMPTY_OVERSIGHT_SCREEN_DATA;
  const clubs = oversightData.clubs;
  const activeSelectedClubId = selectedClubId ?? oversightData.resolvedSelectedClubId;
  const data = oversightData.data;

  const runMutation = async (
    key: string,
    action: () => Promise<boolean>,
    failureMessage: string,
  ) => {
    setMutatingKey(key);

    await runAsyncFinally(
      async () => {
        const success = await action();
        if (!success) {
          showToast(failureMessage, 'error');
        }
      },
      () => {
        setMutatingKey(null);
      },
    );
  };

  const issueSessionNoteExpectation = async (item: HeadCoachCompletionItem) => {
    if (!currentUser?.id || !activeSelectedClubId) return;
    await runMutation(
      `completion:${item.bookingId}`,
      async () => {
        const result = await orgHeadCoachService.createTask({
          clubId: activeSelectedClubId,
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
        onRefresh();
        return true;
      },
      'Failed to issue session-note task',
    );
  };

  const issueRequiredFollowUp = async (item: HeadCoachWatchlistItem) => {
    if (!currentUser?.id || !activeSelectedClubId) return;
    await runMutation(
      `watch:${item.coachId}:${item.athleteId}`,
      async () => {
        const result = await orgHeadCoachService.createTask({
          clubId: activeSelectedClubId,
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
        onRefresh();
        return true;
      },
      'Failed to issue follow-up task',
    );
  };

  const toggleTaskStatus = async (task: HeadCoachTask) => {
    if (!currentUser?.id || !activeSelectedClubId) return;
    const nextStatus = task.status === 'open' ? 'done' : 'open';
    await runMutation(
      `task:${task.id}`,
      async () => {
        const result = await orgHeadCoachService.setTaskStatus({
          clubId: activeSelectedClubId,
          actorUserId: currentUser.id,
          taskId: task.id,
          status: nextStatus,
        });
        if (!result.success) {
          showToast(result.error.message, 'error');
          return false;
        }
        showToast(nextStatus === 'done' ? 'Task marked complete' : 'Task reopened', 'success');
        onRefresh();
        return true;
      },
      'Failed to update task',
    );
  };

  const toggleStandard = async (standard: HeadCoachStandard) => {
    if (!currentUser?.id || !activeSelectedClubId) return;
    await runMutation(
      `standard:${standard.id}`,
      async () => {
        const result = await orgHeadCoachService.toggleStandard({
          clubId: activeSelectedClubId,
          actorUserId: currentUser.id,
          standardId: standard.id,
        });
        if (!result.success) {
          showToast(result.error.message, 'error');
          return false;
        }
        showToast(result.data.active ? 'Standard activated' : 'Standard paused', 'success');
        onRefresh();
        return true;
      },
      'Failed to update standard',
    );
  };

  const createStandard = async (title: string, description?: string) => {
    if (!currentUser?.id || !activeSelectedClubId) return false;

    let success = false;
    await runMutation(
      'standard:create',
      async () => {
        const result = await orgHeadCoachService.createStandard({
          clubId: activeSelectedClubId,
          actorUserId: currentUser.id,
          title,
          description,
        });
        if (!result.success) {
          showToast(result.error.message, 'error');
          return false;
        }
        showToast('Checklist item added', 'success');
        onRefresh();
        success = true;
        return true;
      },
      'Failed to create checklist item',
    );
    return success;
  };

  const selectedClubRole =
    data?.viewerMembership.role ??
    clubs.find((club) => club.id === activeSelectedClubId)?.role ??
    null;

  return {
    loading: status === 'loading',
    status,
    refreshing,
    error: status === 'error' ? error : null,
    retry,
    clubs,
    selectedClubId: activeSelectedClubId,
    setSelectedClubId,
    selectedClubRole,
    data,
    mutatingKey,
    handleRefresh: onRefresh,
    issueSessionNoteExpectation,
    issueRequiredFollowUp,
    toggleTaskStatus,
    toggleStandard,
    createStandard,
  };
}
