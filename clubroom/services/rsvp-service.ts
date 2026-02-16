/**
 * RSVP Service
 *
 * Manages session RSVPs for group training sessions, events, and squad sessions.
 * Parents respond going/not_going/maybe; coaches see aggregated attendance.
 *
 * USER STORY:
 * "As a parent, I want to quickly confirm my child's attendance so the
 * coach knows who is coming."
 *
 * "As a coach, I want to see RSVP counts and send reminders to parents
 * who haven't responded yet."
 *
 * API Integration Notes:
 * - POST /api/session-rsvps - Create RSVPs for a session
 * - PATCH /api/session-rsvps/:id - Respond to RSVP
 * - GET /api/session-rsvps?sessionId=X - Get RSVPs for session
 * - GET /api/session-rsvps?userId=X - Get RSVPs for user
 * - POST /api/session-rsvps/:sessionId/reminder - Send reminder
 */

import { apiClient } from './api-client';
import type { SessionRsvp } from '@/constants/types';
import { notificationTriggers } from './notification-trigger';
import { createLogger } from '@/utils/logger';
import { type Result, type ServiceError, ok, err, notFound } from '@/types/result';
import { userService } from './user-service';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { emitTyped, ServiceEvents } from './event-bus';

const logger = createLogger('RsvpService');

// ---------------------------------------------------------------------------
// Mock RSVP seed data — gives coaches something to see on first launch
// ---------------------------------------------------------------------------

const MOCK_RSVPS: SessionRsvp[] = [
  // ── Half-Term Football Camp (gs_1) — 12 registered, varied responses ──
  { id: 'rsvp_gs1_01', sessionId: 'gs_1', userId: 'user_parent_01', childId: 'user1', status: 'going', respondedAt: '2026-01-07T08:00:00Z', createdAt: '2026-01-06T09:00:00Z' },
  { id: 'rsvp_gs1_02', sessionId: 'gs_1', userId: 'user_parent_01', childId: 'user2', status: 'going', respondedAt: '2026-01-07T08:05:00Z', createdAt: '2026-01-06T09:30:00Z' },
  { id: 'rsvp_gs1_03', sessionId: 'gs_1', userId: 'user_parent_01', childId: 'user3', status: 'maybe', respondedAt: '2026-01-08T09:00:00Z', createdAt: '2026-01-07T10:00:00Z' },
  { id: 'rsvp_gs1_04', sessionId: 'gs_1', userId: 'user_parent_01', childId: 'user4a', status: 'going', respondedAt: '2026-01-08T10:00:00Z', createdAt: '2026-01-07T14:00:00Z' },
  { id: 'rsvp_gs1_05', sessionId: 'gs_1', userId: 'user_parent_01', childId: 'user5', status: 'not_going', respondedAt: '2026-01-09T12:00:00Z', createdAt: '2026-01-08T11:00:00Z' },
  { id: 'rsvp_gs1_06', sessionId: 'gs_1', userId: 'user_parent_01', childId: 'user6', status: 'pending', createdAt: '2026-01-09T10:00:00Z' },
  { id: 'rsvp_gs1_07', sessionId: 'gs_1', userId: 'user_parent_01', childId: 'user7', status: 'going', respondedAt: '2026-01-10T14:00:00Z', createdAt: '2026-01-09T11:00:00Z' },
  { id: 'rsvp_gs1_08', sessionId: 'gs_1', userId: 'user_parent_01', childId: 'user8', status: 'pending', createdAt: '2026-01-10T10:00:00Z' },
  // parent1 (user4) RSVPs for Tom + Emma on gs_1
  { id: 'rsvp_gs1_p1_tom', sessionId: 'gs_1', userId: 'user4', childId: 'user1', status: 'going', respondedAt: '2026-01-07T07:00:00Z', createdAt: '2026-01-06T08:00:00Z' },
  { id: 'rsvp_gs1_p1_emma', sessionId: 'gs_1', userId: 'user4', childId: 'user2', status: 'pending', createdAt: '2026-01-06T08:10:00Z' },

  // ── Striker Masterclass (gs_2) — 8 registered, mostly responded ──
  { id: 'rsvp_gs2_01', sessionId: 'gs_2', userId: 'user_parent_01', childId: 'user1', status: 'going', respondedAt: '2026-01-10T08:00:00Z', createdAt: '2026-01-09T10:00:00Z' },
  { id: 'rsvp_gs2_02', sessionId: 'gs_2', userId: 'user_parent_01', childId: 'user3', status: 'going', respondedAt: '2026-01-10T09:00:00Z', createdAt: '2026-01-09T11:00:00Z' },
  { id: 'rsvp_gs2_03', sessionId: 'gs_2', userId: 'user_parent_01', childId: 'user6', status: 'maybe', respondedAt: '2026-01-11T08:00:00Z', createdAt: '2026-01-10T09:00:00Z' },
  { id: 'rsvp_gs2_04', sessionId: 'gs_2', userId: 'user_parent_01', childId: 'user9', status: 'going', respondedAt: '2026-01-11T10:00:00Z', createdAt: '2026-01-10T14:00:00Z' },
  { id: 'rsvp_gs2_05', sessionId: 'gs_2', userId: 'user_parent_01', childId: 'user10', status: 'not_going', respondedAt: '2026-01-12T08:00:00Z', createdAt: '2026-01-11T09:00:00Z' },
  { id: 'rsvp_gs2_06', sessionId: 'gs_2', userId: 'user_parent_01', childId: 'user11', status: 'pending', createdAt: '2026-01-11T10:00:00Z' },
  // parent1 (user4) RSVP for Tom on gs_2
  { id: 'rsvp_gs2_p1_tom', sessionId: 'gs_2', userId: 'user4', childId: 'user1', status: 'maybe', respondedAt: '2026-01-10T07:00:00Z', createdAt: '2026-01-09T09:00:00Z' },

  // ── Goalkeeper Training (gs_3) — 4 registered, all responded ──
  { id: 'rsvp_gs3_01', sessionId: 'gs_3', userId: 'user_parent_01', childId: 'user2', status: 'going', respondedAt: '2026-01-12T08:00:00Z', createdAt: '2026-01-11T15:00:00Z' },
  { id: 'rsvp_gs3_02', sessionId: 'gs_3', userId: 'user_parent_01', childId: 'user5', status: 'going', respondedAt: '2026-01-12T09:00:00Z', createdAt: '2026-01-11T16:00:00Z' },
  // parent1 (user4) RSVP for Emma on gs_3
  { id: 'rsvp_gs3_p1_emma', sessionId: 'gs_3', userId: 'user4', childId: 'user2', status: 'going', respondedAt: '2026-01-12T07:00:00Z', createdAt: '2026-01-11T14:00:00Z' },

  // ── Free Trial (gs_4) — mixed responses ──
  { id: 'rsvp_gs4_01', sessionId: 'gs_4', userId: 'user_parent_01', childId: 'user4a', status: 'going', respondedAt: '2026-01-13T10:00:00Z', createdAt: '2026-01-12T10:00:00Z' },
  { id: 'rsvp_gs4_02', sessionId: 'gs_4', userId: 'user_parent_01', childId: 'user6', status: 'pending', createdAt: '2026-01-12T11:00:00Z' },
  // parent1 (user4) RSVP for Tom on gs_4
  { id: 'rsvp_gs4_p1_tom', sessionId: 'gs_4', userId: 'user4', childId: 'user1', status: 'pending', createdAt: '2026-01-12T09:00:00Z' },

  // ── U11 Training (gs_training_1) — 6 registered, good response rate ──
  { id: 'rsvp_gst1_01', sessionId: 'gs_training_1', userId: 'user_parent_01', childId: 'user1', status: 'going', respondedAt: '2026-01-13T08:00:00Z', createdAt: '2026-01-01T09:00:00Z' },
  { id: 'rsvp_gst1_02', sessionId: 'gs_training_1', userId: 'user_parent_01', childId: 'user2', status: 'going', respondedAt: '2026-01-13T09:00:00Z', createdAt: '2026-01-01T09:00:00Z' },
  { id: 'rsvp_gst1_03', sessionId: 'gs_training_1', userId: 'user_parent_01', childId: 'user3', status: 'maybe', respondedAt: '2026-01-14T08:00:00Z', createdAt: '2026-01-02T10:00:00Z' },
  { id: 'rsvp_gst1_04', sessionId: 'gs_training_1', userId: 'user_parent_01', childId: 'user4a', status: 'going', respondedAt: '2026-01-14T09:00:00Z', createdAt: '2026-01-02T10:30:00Z' },
  { id: 'rsvp_gst1_05', sessionId: 'gs_training_1', userId: 'user_parent_01', childId: 'user5', status: 'not_going', respondedAt: '2026-01-14T10:00:00Z', createdAt: '2026-01-03T11:00:00Z' },
  { id: 'rsvp_gst1_06', sessionId: 'gs_training_1', userId: 'user_parent_01', childId: 'user6', status: 'going', respondedAt: '2026-01-14T11:00:00Z', createdAt: '2026-01-03T12:00:00Z' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadRsvps(): Promise<SessionRsvp[]> {
  const stored = await apiClient.get<SessionRsvp[]>(STORAGE_KEYS.SESSION_RSVPS, []);
  if (stored.length > 0) return stored;
  // First launch: seed mock data
  await apiClient.set(STORAGE_KEYS.SESSION_RSVPS, MOCK_RSVPS);
  return [...MOCK_RSVPS];
}

async function saveRsvps(rsvps: SessionRsvp[]): Promise<void> {
  await apiClient.set(STORAGE_KEYS.SESSION_RSVPS, rsvps);
}

async function resolveRsvpDisplayName(rsvp: SessionRsvp): Promise<string> {
  const preferredUserId = rsvp.childId || rsvp.userId;
  const userResult = await userService.getUserById(preferredUserId);
  if (!userResult.success) return 'A parent';

  const displayName = userResult.data.name?.trim();
  return displayName || 'A parent';
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const rsvpService = {
  /**
   * Create pending RSVPs for each member invited to a session.
   * Called by the coach or system when a group session is scheduled.
   */
  async createForSession(
    sessionId: string,
    members: { userId: string; childId?: string; childName?: string }[],
  ): Promise<SessionRsvp[]> {
    const rsvps = await loadRsvps();
    const now = new Date().toISOString();
    const newRsvps: SessionRsvp[] = [];

    for (const member of members) {
      // Skip if RSVP already exists for this user + session
      const exists = rsvps.some((r) => r.sessionId === sessionId && r.userId === member.userId);
      if (exists) continue;

      const rsvp: SessionRsvp = {
        id: apiClient.generateId('rsvp'),
        sessionId,
        userId: member.userId,
        childId: member.childId,
        status: 'pending',
        createdAt: now,
      };

      newRsvps.push(rsvp);
      rsvps.push(rsvp);
    }

    if (newRsvps.length > 0) {
      await saveRsvps(rsvps);
      logger.info('RSVPs created', {
        sessionId,
        count: newRsvps.length,
      });
    }

    return newRsvps;
  },

  /**
   * Respond to an RSVP (parent action).
   * Updates the RSVP status and triggers a notification to the coach.
   */
  async respond(
    rsvpId: string,
    status: 'going' | 'not_going' | 'maybe',
  ): Promise<Result<SessionRsvp, ServiceError>> {
    const rsvps = await loadRsvps();
    const index = rsvps.findIndex((r) => r.id === rsvpId);

    if (index === -1) {
      return err(notFound('RSVP', rsvpId));
    }

    const previousStatus = rsvps[index].status;
    rsvps[index] = {
      ...rsvps[index],
      status,
      respondedAt: new Date().toISOString(),
    };

    await saveRsvps(rsvps);

    const rsvp = rsvps[index];
    const displayName = await resolveRsvpDisplayName(rsvp);
    const statusLabel =
      status === 'going' ? 'going' : status === 'not_going' ? 'not going' : 'maybe';

    // Notify coach of response
    await notificationTriggers.eventRsvp(displayName, rsvp.sessionId, statusLabel);

    logger.info('RSVP responded', {
      rsvpId,
      sessionId: rsvp.sessionId,
      previousStatus,
      newStatus: status,
    });

    emitTyped(ServiceEvents.RSVP_RESPONDED, {
      rsvpId,
      sessionId: rsvp.sessionId,
      userId: rsvp.userId,
      childId: rsvp.childId,
      previousStatus,
      newStatus: status,
    });

    return ok(rsvps[index]);
  },

  /**
   * Get all RSVPs for a specific session.
   * Used by coach to see attendance overview.
   */
  async getForSession(sessionId: string): Promise<SessionRsvp[]> {
    const rsvps = await loadRsvps();
    return rsvps.filter((r) => r.sessionId === sessionId);
  },

  /**
   * Get all RSVPs for a specific user.
   * Used to show pending RSVP requests to a parent.
   */
  async getForUser(userId: string): Promise<SessionRsvp[]> {
    const rsvps = await loadRsvps();
    return rsvps.filter((r) => r.userId === userId);
  },

  /**
   * Get only pending RSVPs for a user (needs response).
   */
  async getPendingForUser(userId: string): Promise<SessionRsvp[]> {
    const rsvps = await loadRsvps();
    return rsvps.filter((r) => r.userId === userId && r.status === 'pending');
  },

  /**
   * Send reminder notification to all non-responders for a session.
   * Coach action.
   */
  async sendReminder(sessionId: string): Promise<void> {
    const rsvps = await loadRsvps();
    const pending = rsvps.filter((r) => r.sessionId === sessionId && r.status === 'pending');

    if (pending.length === 0) {
      logger.info('No pending RSVPs to remind', { sessionId });
      return;
    }

    // Send a reminder notification to each non-responder
    for (const rsvp of pending) {
      await notificationTriggers.groupSessionCreated(
        'RSVP Reminder',
        'Please confirm your attendance',
        rsvp.userId,
      );
    }

    logger.info('RSVP reminders sent', {
      sessionId,
      count: pending.length,
    });
  },

  /**
   * Get aggregated RSVP counts for a session.
   * Used by coach dashboard and RSVP summary component.
   */
  async getSessionCounts(
    sessionId: string,
  ): Promise<{ going: number; notGoing: number; maybe: number; pending: number }> {
    const rsvps = await loadRsvps();
    const sessionRsvps = rsvps.filter((r) => r.sessionId === sessionId);

    return {
      going: sessionRsvps.filter((r) => r.status === 'going').length,
      notGoing: sessionRsvps.filter((r) => r.status === 'not_going').length,
      maybe: sessionRsvps.filter((r) => r.status === 'maybe').length,
      pending: sessionRsvps.filter((r) => r.status === 'pending').length,
    };
  },

  /**
   * Get aggregated RSVP counts for multiple sessions in one call.
   * Avoids N+1 queries when displaying session lists with attendance bars.
   */
  async getBatchCounts(
    sessionIds: string[],
  ): Promise<Map<string, { going: number; notGoing: number; maybe: number; pending: number }>> {
    const rsvps = await loadRsvps();
    const result = new Map<string, { going: number; notGoing: number; maybe: number; pending: number }>();

    // Initialize all requested sessions
    for (const sid of sessionIds) {
      result.set(sid, { going: 0, notGoing: 0, maybe: 0, pending: 0 });
    }

    // Single pass through all RSVPs
    const sessionSet = new Set(sessionIds);
    for (const r of rsvps) {
      if (!sessionSet.has(r.sessionId)) continue;
      const counts = result.get(r.sessionId)!;
      if (r.status === 'going') counts.going++;
      else if (r.status === 'not_going') counts.notGoing++;
      else if (r.status === 'maybe') counts.maybe++;
      else counts.pending++;
    }

    return result;
  },

  /**
   * Delete all RSVPs for a session (e.g. when session is cancelled).
   */
  async deleteForSession(sessionId: string): Promise<void> {
    const rsvps = await loadRsvps();
    const filtered = rsvps.filter((r) => r.sessionId !== sessionId);
    await saveRsvps(filtered);
    logger.info('RSVPs deleted for session', { sessionId });
  },

  /**
   * Get a single RSVP by ID.
   */
  async getById(rsvpId: string): Promise<SessionRsvp | null> {
    const rsvps = await loadRsvps();
    return rsvps.find((r) => r.id === rsvpId) ?? null;
  },
};
