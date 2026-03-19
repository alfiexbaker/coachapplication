/**
 * Session Scheduling Service
 *
 * Handles training and club-activity session queries by club, squad, and child.
 * Supports recurring pattern utilities and next-date lookups.
 *
 * API Integration Notes:
 * - GET /api/clubs/:id/training-sessions - Club training sessions
 * - GET /api/squads/:id/training-sessions - Squad training sessions
 * - GET /api/athletes/:id/training-sessions - Child training sessions
 */

import { api } from '@/constants/config';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
import type { GroupSession, GroupSessionSchedule, RecurringPattern } from '@/constants/types';
import { loadSessions } from './session-crud-service';
import { loadRegistrations } from './session-registration-service';

const USE_MOCK = api.useMock;
const _logger = createLogger('SessionSchedulingService');

// Day of week labels
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ACTIVE_CLUB_SESSION_STATUSES: GroupSession['status'][] = ['PUBLISHED', 'FULL'];

function getUpcomingScheduleEntry(session: GroupSession): GroupSessionSchedule | null {
  const today = toDateStr(new Date());
  return session.schedule.find((entry) => entry.date >= today) || null;
}

function sortSessionsByUpcomingDate(sessions: GroupSession[]): GroupSession[] {
  return sessions.sort((left, right) => {
    const leftDate = getUpcomingScheduleEntry(left)?.date || '';
    const rightDate = getUpcomingScheduleEntry(right)?.date || '';
    return leftDate.localeCompare(rightDate);
  });
}

// ============================================================================
// SCHEDULING SERVICE
// ============================================================================

export const sessionSchedulingService = {
  /**
   * Get club training sessions
   */
  async getClubTrainingSessions(clubId: string): Promise<GroupSession[]> {
    if (USE_MOCK) {
      const sessionsCache = await loadSessions();
      return sortSessionsByUpcomingDate(
        sessionsCache.filter(
          (session) =>
            session.clubId === clubId &&
            session.sessionType === 'TRAINING' &&
            ACTIVE_CLUB_SESSION_STATUSES.includes(session.status) &&
            Boolean(getUpcomingScheduleEntry(session)),
        ),
      );
    }

    const response = await fetch(`/api/clubs/${clubId}/training-sessions`);
    return response.json();
  },

  /**
   * Get all upcoming club-linked group sessions that behave like training activities.
   *
   * This intentionally includes camps, clinics, trials, and open sessions because
   * the club-facing activity model treats them as variants of one training domain.
   */
  async getClubActivitySessions(clubId: string): Promise<GroupSession[]> {
    const sessionsCache = await loadSessions();
    return sortSessionsByUpcomingDate(
      sessionsCache.filter(
        (session) =>
          session.clubId === clubId &&
          ACTIVE_CLUB_SESSION_STATUSES.includes(session.status) &&
          Boolean(getUpcomingScheduleEntry(session)),
      ),
    );
  },

  /**
   * Get training sessions for a squad
   */
  async getSquadTrainingSessions(squadId: string): Promise<GroupSession[]> {
    if (USE_MOCK) {
      const sessionsCache = await loadSessions();
      return sortSessionsByUpcomingDate(
        sessionsCache.filter(
          (session) =>
            session.squadId === squadId &&
            session.sessionType === 'TRAINING' &&
            ACTIVE_CLUB_SESSION_STATUSES.includes(session.status) &&
            Boolean(getUpcomingScheduleEntry(session)),
        ),
      );
    }

    const response = await fetch(`/api/squads/${squadId}/training-sessions`);
    return response.json();
  },

  /**
   * Get all upcoming training sessions (for parent's child)
   */
  async getChildTrainingSessions(childId: string): Promise<GroupSession[]> {
    if (USE_MOCK) {
      const registrationsCache = await loadRegistrations();
      const sessionsCache = await loadSessions();

      const registeredSessionIds = registrationsCache
        .filter((r) => r.athleteId === childId && r.status !== 'CANCELLED')
        .map((r) => r.sessionId);

      return sortSessionsByUpcomingDate(
        sessionsCache.filter(
          (session) =>
            registeredSessionIds.includes(session.id) &&
            session.sessionType === 'TRAINING' &&
            ACTIVE_CLUB_SESSION_STATUSES.includes(session.status) &&
            Boolean(getUpcomingScheduleEntry(session)),
        ),
      );
    }

    const response = await fetch(`/api/athletes/${childId}/training-sessions`);
    return response.json();
  },

  /**
   * Format day of week for display
   */
  formatDayOfWeek(day: number): string {
    return DAY_LABELS[day] || `Day ${day}`;
  },

  /**
   * Format recurring pattern for display
   */
  formatRecurringPattern(pattern: RecurringPattern): string {
    const day = DAY_LABELS[pattern.dayOfWeek];
    return `${day}s ${pattern.startTime} - ${pattern.endTime}`;
  },

  /**
   * Get next upcoming date for a training session
   */
  getNextTrainingDate(session: GroupSession): GroupSessionSchedule | null {
    return getUpcomingScheduleEntry(session);
  },
};
