import { api } from '@/constants/config';
import type { ClubActivity, ClubEvent, GroupSession, Match } from '@/constants/types';
import { apiFetch } from '@/services/api-client';
import { buildApiAuthHeaders, deriveApiActingRole, resolveSignedInApiUser } from '@/services/api-auth-context';
import { eventService } from '@/services/event-service';
import { matchService } from '@/services/match-service';
import { squadService } from '@/services/squad-service';
import { loadSessions } from '@/services/group-session/session-crud-service';
import { createLogger } from '@/utils/logger';
import { buildClubActivities } from '@/utils/club-activity-projections';
import { err, notFound, ok, serviceError, type Result, type ServiceError } from '@/types/result';

const logger = createLogger('ClubScheduleService');
const USE_MOCK = api.useMock;

interface ApiClubScheduleResponse {
  clubId: string;
  activities: ClubActivity[];
  total: number;
  seedVersion?: string | null;
  requestId: string;
}

function isVisibleClubEvent(event: ClubEvent): boolean {
  return event.status !== 'DRAFT';
}

function isVisibleClubSession(session: GroupSession): boolean {
  return session.status !== 'DRAFT' && session.schedule.length > 0;
}

function isRelevantSquadEvent(event: ClubEvent, squadId: string): boolean {
  if (event.targetAudience === 'SQUAD') {
    return Boolean(event.squadIds?.includes(squadId));
  }
  return true;
}

function isRelevantSquadSession(session: GroupSession, squadId: string): boolean {
  if (session.squadId) {
    return session.squadId === squadId;
  }
  return Boolean(session.clubId);
}

function isRelevantSquadMatch(match: Match, squadId: string): boolean {
  return match.squadId === squadId;
}

async function loadMockClubScheduleData(
  clubId: string,
): Promise<{ events: ClubEvent[]; sessions: GroupSession[]; matches: Match[] }> {
  const [eventsResult, sessionsResult, matchesResult] = await Promise.allSettled([
    eventService.getAllClubEvents(clubId),
    loadSessions(),
    matchService.getClubMatches(clubId),
  ]);

  const events =
    eventsResult.status === 'fulfilled'
      ? eventsResult.value.filter((event) => event.clubId === clubId && isVisibleClubEvent(event))
      : [];
  const sessions =
    sessionsResult.status === 'fulfilled'
      ? sessionsResult.value.filter(
          (session) => session.clubId === clubId && isVisibleClubSession(session),
        )
      : [];
  const matches = matchesResult.status === 'fulfilled' ? matchesResult.value : [];

  if (eventsResult.status === 'rejected') {
    logger.warn('Failed to load club events for schedule', { clubId, error: eventsResult.reason });
  }
  if (sessionsResult.status === 'rejected') {
    logger.warn('Failed to load club sessions for schedule', { clubId, error: sessionsResult.reason });
  }
  if (matchesResult.status === 'rejected') {
    logger.warn('Failed to load club matches for schedule', { clubId, error: matchesResult.reason });
  }

  return { events, sessions, matches };
}

async function resolveScheduleHeaders(): Promise<Result<Record<string, string>, ServiceError>> {
  const currentUserResult = await resolveSignedInApiUser('Sign in to view club schedules.');
  if (!currentUserResult.success) {
    return currentUserResult;
  }

  return ok(buildApiAuthHeaders({ actingRole: deriveApiActingRole(currentUserResult.data, 'member') }));
}

class ClubScheduleService {
  async getClubSchedule(clubId: string): Promise<Result<ClubActivity[], ServiceError>> {
    if (!USE_MOCK) {
      const headersResult = await resolveScheduleHeaders();
      if (!headersResult.success) {
        return headersResult;
      }

      const result = await apiFetch<ApiClubScheduleResponse>(`/v1/clubs/${clubId}/schedule`, {
        method: 'GET',
        headers: headersResult.data,
      });
      if (!result.success) {
        logger.error('Failed to load club schedule via API', { clubId, error: result.error });
        return err(result.error);
      }
      return ok(result.data.activities);
    }

    try {
      const data = await loadMockClubScheduleData(clubId);
      return ok(
        buildClubActivities(
          {
            events: data.events,
            sessions: data.sessions,
            matches: data.matches,
            now: new Date(),
          },
          { includePastSessions: true },
        ),
      );
    } catch (error) {
      logger.error('Failed to load club schedule', { clubId, error });
      return err(serviceError('UNKNOWN', 'Failed to load club schedule.', error));
    }
  }

  async getSquadSchedule(squadId: string): Promise<Result<ClubActivity[], ServiceError>> {
    try {
      const squad = await squadService.getSquad(squadId);
      if (!squad?.clubId) {
        return err(notFound('Squad', squadId));
      }

      if (!USE_MOCK) {
        const scheduleResult = await this.getClubSchedule(squad.clubId);
        if (!scheduleResult.success) {
          return scheduleResult;
        }

        return ok(
          scheduleResult.data.filter((activity) => {
            if (activity.squadId) {
              return activity.squadId === squadId;
            }
            return activity.squadIds.length === 0 || activity.squadIds.includes(squadId);
          }),
        );
      }

      const data = await loadMockClubScheduleData(squad.clubId);
      return ok(
        buildClubActivities(
          {
            events: data.events.filter((event) => isRelevantSquadEvent(event, squadId)),
            sessions: data.sessions.filter((session) => isRelevantSquadSession(session, squadId)),
            matches: data.matches.filter((match) => isRelevantSquadMatch(match, squadId)),
            now: new Date(),
          },
          { includePastSessions: true },
        ),
      );
    } catch (error) {
      logger.error('Failed to load squad schedule', { squadId, error });
      return err(serviceError('UNKNOWN', 'Failed to load team schedule.', error));
    }
  }
}

export const clubScheduleService = new ClubScheduleService();
