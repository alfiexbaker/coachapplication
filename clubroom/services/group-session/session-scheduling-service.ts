/**
 * Session Scheduling Service
 *
 * Handles training session queries by club, squad, and child.
 * Supports recurring pattern utilities and next-date lookups.
 *
 * API Integration Notes:
 * - GET /api/clubs/:id/training-sessions - Club training sessions
 * - GET /api/squads/:id/training-sessions - Squad training sessions
 * - GET /api/athletes/:id/training-sessions - Child training sessions
 */

import { api } from '@/constants/config';
import { createLogger } from '@/utils/logger';
import type {
  GroupSession,
  GroupSessionSchedule,
  RecurringPattern,
} from '@/constants/types';
import { loadSessions } from './session-crud-service';
import { loadRegistrations } from './session-registration-service';

const USE_MOCK = api.useMock;
const _logger = createLogger('SessionSchedulingService');

// Day of week labels
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
      return sessionsCache
        .filter(
          (s) =>
            s.clubId === clubId &&
            s.sessionType === 'TRAINING' &&
            s.status === 'PUBLISHED'
        )
        .sort((a, b) => {
          const aDate = a.schedule[0]?.date || '';
          const bDate = b.schedule[0]?.date || '';
          return aDate.localeCompare(bDate);
        });
    }

    const response = await fetch(`/api/clubs/${clubId}/training-sessions`);
    return response.json();
  },

  /**
   * Get training sessions for a squad
   */
  async getSquadTrainingSessions(squadId: string): Promise<GroupSession[]> {
    if (USE_MOCK) {
      const sessionsCache = await loadSessions();
      return sessionsCache
        .filter(
          (s) =>
            s.squadId === squadId &&
            s.sessionType === 'TRAINING' &&
            s.status === 'PUBLISHED'
        )
        .sort((a, b) => {
          const aDate = a.schedule[0]?.date || '';
          const bDate = b.schedule[0]?.date || '';
          return aDate.localeCompare(bDate);
        });
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

      return sessionsCache
        .filter(
          (s) =>
            registeredSessionIds.includes(s.id) &&
            s.sessionType === 'TRAINING' &&
            s.status === 'PUBLISHED'
        )
        .sort((a, b) => {
          const aDate = a.schedule[0]?.date || '';
          const bDate = b.schedule[0]?.date || '';
          return aDate.localeCompare(bDate);
        });
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
    const today = new Date().toISOString().split('T')[0];
    return session.schedule.find((s) => s.date >= today) || null;
  },
};
