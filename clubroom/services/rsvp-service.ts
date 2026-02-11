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

const logger = createLogger('RsvpService');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadRsvps(): Promise<SessionRsvp[]> {
  return apiClient.get<SessionRsvp[]>(STORAGE_KEYS.SESSION_RSVPS, []);
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
      const exists = rsvps.some(
        (r) => r.sessionId === sessionId && r.userId === member.userId,
      );
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
    const statusLabel = status === 'going' ? 'going' : status === 'not_going' ? 'not going' : 'maybe';

    // Notify coach of response
    await notificationTriggers.eventRsvp(
      displayName,
      rsvp.sessionId,
      statusLabel,
    );

    logger.info('RSVP responded', {
      rsvpId,
      sessionId: rsvp.sessionId,
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
    const pending = rsvps.filter(
      (r) => r.sessionId === sessionId && r.status === 'pending',
    );

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
