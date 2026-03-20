import type { ClubActivity, ClubEvent, GroupSession, Match } from '@/constants/types';
import { eventService } from '@/services/event-service';
import { matchService } from '@/services/match-service';
import { squadService } from '@/services/squad-service';
import { loadSessions } from '@/services/group-session/session-crud-service';
import { createLogger } from '@/utils/logger';
import { buildClubActivities } from '@/utils/club-activity-projections';
import { err, notFound, ok, serviceError, type Result, type ServiceError } from '@/types/result';

const logger = createLogger('ClubScheduleService');

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

async function loadClubScheduleData(
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

class ClubScheduleService {
  async getClubSchedule(clubId: string): Promise<Result<ClubActivity[], ServiceError>> {
    try {
      const data = await loadClubScheduleData(clubId);
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

      const data = await loadClubScheduleData(squad.clubId);
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
