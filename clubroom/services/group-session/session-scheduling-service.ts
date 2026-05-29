/**
 * Session Scheduling Service
 *
 * Handles training and club-activity session queries by club, squad, and child.
 * Supports recurring pattern utilities and next-date lookups.
 *
 * API Integration Notes:
 * - GET /v1/group-sessions?clubId=X - Club training sessions
 * - GET /v1/group-sessions?squadId=X - Squad training sessions
 * - GET /v1/group-sessions?athleteId=X - Child training sessions
 */

import { api } from "@/constants/config";
import { createLogger } from "@/utils/logger";
import { toDateStr } from "@/utils/format";
import type {
  GroupSession,
  GroupSessionSchedule,
  RecurringPattern,
} from "@/constants/types";
import { loadSessions } from "./session-crud-service";
import { loadRegistrations } from "./session-registration-service";
import { groupSessionAuthorityService } from "./group-session-authority-service";
const USE_MOCK = api.useMock;
const _logger = createLogger("SessionSchedulingService");

// Day of week labels
const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const ACTIVE_CLUB_SESSION_STATUSES: GroupSession["status"][] = [
  "PUBLISHED",
  "FULL",
];
function isTrainingSession(session: GroupSession): boolean {
  return (
    session.sessionType === "TRAINING" ||
    session.sessionType === "TEAM_TRAINING"
  );
}
function getUpcomingScheduleEntry(
  session: GroupSession,
): GroupSessionSchedule | null {
  const today = toDateStr(new Date());
  return session.schedule.find((entry) => entry.date >= today) || null;
}
function sortSessionsByUpcomingDate(sessions: GroupSession[]): GroupSession[] {
  return sessions.sort((left, right) => {
    const leftDate = getUpcomingScheduleEntry(left)?.date || "";
    const rightDate = getUpcomingScheduleEntry(right)?.date || "";
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
            session.sessionType === "TRAINING" &&
            ACTIVE_CLUB_SESSION_STATUSES.includes(session.status) &&
            Boolean(getUpcomingScheduleEntry(session)),
        ),
      );
    }
    const result = await groupSessionAuthorityService.listSessions({
      clubId,
    });
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return sortSessionsByUpcomingDate(
      result.data.filter(
        (session) =>
          isTrainingSession(session) &&
          ACTIVE_CLUB_SESSION_STATUSES.includes(session.status) &&
          Boolean(getUpcomingScheduleEntry(session)),
      ),
    );
  },
  /**
   * Get all upcoming club-linked group sessions that behave like training activities.
   *
   * This intentionally includes camps, clinics, trials, and open sessions because
   * the club-facing activity model treats them as variants of one training domain.
   */
  async getClubActivitySessions(clubId: string): Promise<GroupSession[]> {
    if (USE_MOCK) {
      const sessionsCache = await loadSessions();
      return sortSessionsByUpcomingDate(
        sessionsCache.filter(
          (session) =>
            session.clubId === clubId &&
            ACTIVE_CLUB_SESSION_STATUSES.includes(session.status) &&
            Boolean(getUpcomingScheduleEntry(session)),
        ),
      );
    }
    const result = await groupSessionAuthorityService.listSessions({
      clubId,
    });
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return sortSessionsByUpcomingDate(
      result.data.filter(
        (session) =>
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
            session.sessionType === "TRAINING" &&
            ACTIVE_CLUB_SESSION_STATUSES.includes(session.status) &&
            Boolean(getUpcomingScheduleEntry(session)),
        ),
      );
    }
    const result = await groupSessionAuthorityService.listSessions({
      squadId,
    });
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return sortSessionsByUpcomingDate(
      result.data.filter(
        (session) =>
          isTrainingSession(session) &&
          ACTIVE_CLUB_SESSION_STATUSES.includes(session.status) &&
          Boolean(getUpcomingScheduleEntry(session)),
      ),
    );
  },
  /**
   * Get all upcoming training sessions (for parent's child)
   */
  async getChildTrainingSessions(childId: string): Promise<GroupSession[]> {
    if (USE_MOCK) {
      const registrationsCache = await loadRegistrations();
      const sessionsCache = await loadSessions();
      const registeredSessionIds = registrationsCache.flatMap((r) =>
        r.athleteId === childId && r.status !== "CANCELLED"
          ? [r.sessionId]
          : [],
      );
      return sortSessionsByUpcomingDate(
        sessionsCache.filter(
          (session) =>
            registeredSessionIds.includes(session.id) &&
            session.sessionType === "TRAINING" &&
            ACTIVE_CLUB_SESSION_STATUSES.includes(session.status) &&
            Boolean(getUpcomingScheduleEntry(session)),
        ),
      );
    }
    const result = await groupSessionAuthorityService.listSessions({
      athleteId: childId,
    });
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return sortSessionsByUpcomingDate(
      result.data.filter(
        (session) =>
          isTrainingSession(session) &&
          ACTIVE_CLUB_SESSION_STATUSES.includes(session.status) &&
          Boolean(getUpcomingScheduleEntry(session)),
      ),
    );
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
